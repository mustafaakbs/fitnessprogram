import { db } from './firebase-config.js';
import { ref, get, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // DOM elementlerini seç
        this.programContainer = document.getElementById('programContainer');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.addExerciseBtn = document.getElementById('addExerciseBtn');
        this.addExerciseModal = document.getElementById('addExerciseModal');
        this.newExerciseForm = document.getElementById('newExerciseForm');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Event listener'ları ekle
        this.setupEventListeners();
        
        // Dashboard'ı başlat
        this.initializeDashboard();
        
        // Kullanıcı bilgilerini güncelle
        this.updateUserInfo();
    }

    updateUserInfo() {
        // Kullanıcı adını güncelle
        document.getElementById('userLoginDisplay').textContent = this.currentUser.username;
        document.getElementById('userName').textContent = this.currentUser.name;
        
        // Admin rolünü kontrol et ve badge'i güncelle
        const roleBadge = document.getElementById('userRole');
        roleBadge.textContent = this.currentUser.role.toUpperCase();
        roleBadge.className = `role-badge ${this.currentUser.role}`;

        // Tarihi güncelle
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
        document.getElementById('dateTimeDisplay').textContent = formattedDate;
    }

    setupEventListeners() {
        // Çıkış butonu
        this.logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Yeni egzersiz ekleme modalı
        this.addExerciseBtn.addEventListener('click', () => {
            this.addExerciseModal.style.display = 'block';
        });

        // Modal kapatma
        document.querySelector('.close').addEventListener('click', () => {
            this.addExerciseModal.style.display = 'none';
        });

        // Set ekleme butonu
        document.getElementById('addSetBtn').addEventListener('click', () => {
            const setsContainer = document.getElementById('setsContainer');
            const newSet = document.createElement('div');
            newSet.className = 'set-row';
            newSet.innerHTML = `
                <input type="number" class="set-input" placeholder="Tekrar" min="1" required>
                <button type="button" class="remove-set"><i class="fas fa-minus"></i></button>
            `;
            setsContainer.appendChild(newSet);
        });

        // Yeni egzersiz formu
        this.newExerciseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleNewExercise(e);
        });

        // Set silme butonları için event delegation
        document.getElementById('setsContainer').addEventListener('click', (e) => {
            if (e.target.closest('.remove-set')) {
                const setRow = e.target.closest('.set-row');
                if (document.querySelectorAll('.set-row').length > 1) {
                    setRow.remove();
                }
            }
        });

        // Yazdırma butonu
        document.getElementById('printProgramBtn').addEventListener('click', () => {
            window.print();
        });
    }

    async initializeDashboard() {
        try {
            this.showLoading();
            const snapshot = await get(ref(db, 'programs'));
            const programs = snapshot.val();
            this.renderPrograms(programs);
            this.hideLoading();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.hideLoading();
            this.showNotification('Programlar yüklenirken bir hata oluştu', 'error');
        }
    }

    showLoading() {
        this.loadingSpinner.style.display = 'flex';
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none';
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.getElementById('notificationContainer').appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    async handleNewExercise(e) {
        const formData = new FormData(e.target);
        const day = formData.get('exerciseDay');
        const name = formData.get('exerciseName');
        const weight = parseInt(formData.get('exerciseWeight'));
        const videoUrl = formData.get('exerciseVideo');
        const sets = Array.from(document.querySelectorAll('.set-input')).map((input, idx) => ({
            number: idx + 1,
            reps: parseInt(input.value)
        }));

        try {
            // Mevcut egzersizleri al
            const snapshot = await get(ref(db, `programs/${day}/exercises`));
            const currentExercises = snapshot.val() || [];
            
            // Yeni egzersizi ekle
            const newExercise = { name, sets, weight, videoUrl };
            currentExercises.push(newExercise);
            
            // Firebase'i güncelle
            await update(ref(db), {
                [`programs/${day}/exercises`]: currentExercises
            });

            this.showNotification('Egzersiz başarıyla eklendi');
            this.addExerciseModal.style.display = 'none';
            this.newExerciseForm.reset();
            this.initializeDashboard();
        } catch (error) {
            console.error('Error adding exercise:', error);
            this.showNotification('Egzersiz eklenirken bir hata oluştu', 'error');
        }
    }

    async deleteExercise(day, index) {
        try {
            const snapshot = await get(ref(db, `programs/${day}/exercises`));
            const exercises = snapshot.val();
            exercises.splice(index, 1);
            await update(ref(db, `programs/${day}`), { exercises });
            this.showNotification('Egzersiz başarıyla silindi');
            this.initializeDashboard();
        } catch (error) {
            console.error('Error deleting exercise:', error);
            this.showNotification('Egzersiz silinirken bir hata oluştu', 'error');
        }
    }

    renderPrograms(programs) {
        if (!this.programContainer) return;
        
        this.programContainer.innerHTML = '';
        
        for (const [day, program] of Object.entries(programs)) {
            const dayCard = document.createElement('div');
            dayCard.className = 'program-card';
            dayCard.id = day;
            
            dayCard.innerHTML = `
                <h2>${program.title}</h2>
                <div class="exercises">
                    ${program.exercises.map((exercise, index) => `
                        <div class="exercise-item">
                            <div class="exercise-header">
                                <h3>${exercise.name}</h3>
                                <div class="exercise-actions">
                                    <button class="edit-exercise" data-day="${day}" data-index="${index}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-exercise" data-day="${day}" data-index="${index}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="exercise-details">
                                <div class="sets-info">
                                    <h4>Setler:</h4>
                                    <ul>
                                        ${exercise.sets.map(set => `
                                            <li>Set ${set.number}: ${set.reps} tekrar</li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div class="weight-info">
                                    <h4>Ağırlık:</h4>
                                    <span>${exercise.weight} kg</span>
                                </div>
                                <div class="video-link">
                                    <a href="${exercise.videoUrl}" target="_blank">
                                        <i class="fab fa-youtube"></i> Video
                                    </a>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            this.programContainer.appendChild(dayCard);
        }

        // Silme butonları için event listener'lar
        this.programContainer.querySelectorAll('.delete-exercise').forEach(button => {
            button.addEventListener('click', (e) => {
                const day = e.currentTarget.dataset.day;
                const index = parseInt(e.currentTarget.dataset.index);
                if (confirm('Bu egzersizi silmek istediğinize emin misiniz?')) {
                    this.deleteExercise(day, index);
                }
            });
        });
    }
}

// Dashboard'ı başlat
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
