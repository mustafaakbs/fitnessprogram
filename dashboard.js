import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        // Temel ayarlar
        this.currentUser = null;
        this.editMode = false;
        this.currentDay = 'pazartesi';
        this.currentVideo = null;
        
        // Kullanıcı kontrolü
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        // Kullanıcı bilgilerini ayarla
        this.currentUser = JSON.parse(userJson);

        // Arayüzü başlat
        this.initializeInterface();
    }

    async initializeInterface() {
        // Kullanıcı adını göster
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name || 'Kullanıcı';
        }

        // Düzenleme modu butonu
        const editModeBtn = document.getElementById('editModeBtn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                this.showPasswordModal();
            });
        }

        // Çıkış butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        // Günleri oluştur
        await this.createDayButtons();
        
        // İlk programı göster
        await this.renderPrograms();

        // Şifre modalı için event listeners
        document.getElementById('confirmPassword')?.addEventListener('click', () => {
            this.checkAdminPassword();
        });

        document.getElementById('cancelPassword')?.addEventListener('click', () => {
            document.getElementById('passwordModal').style.display = 'none';
        });

        // Form submit olayını dinle
        document.getElementById('exerciseForm')?.addEventListener('submit', (e) => {
            this.saveExercise(e);
        });

        // Tarih ve kullanıcı bilgisini güncelle
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
        document.getElementById('currentDateTime').textContent = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`;
        document.getElementById('currentUser').textContent = 
            `Current User's Login: ${this.currentUser.username}`;
    }

    async createDayButtons() {
        const days = ['pazartesi', 'carsamba', 'cuma'];
        const container = document.querySelector('.days-container');
        
        if (!container) return;
        
        container.innerHTML = ''; // Container'ı temizle
        
        days.forEach(day => {
            const btn = document.createElement('button');
            btn.className = `day-btn ${day === this.currentDay ? 'active' : ''}`;
            btn.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            btn.onclick = () => this.changeDay(day);
            container.appendChild(btn);
        });
    }

    async changeDay(day) {
        this.currentDay = day;
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === day);
        });
        await this.renderPrograms();
    }

    async renderPrograms() {
        try {
            const snapshot = await get(ref(db, `programs/${this.currentDay}`));
            const program = snapshot.val();

            if (!program) {
                console.error('Program not found for day:', this.currentDay);
                return;
            }

            const container = document.getElementById('programCards');
            if (!container) return;

            let html = `
                <div class="program-title">
                    <h2>${program.title}</h2>
                    ${this.editMode ? `
                        <button onclick="dashboard.addNewExercise()" class="add-btn">
                            <i class="fas fa-plus"></i> Yeni Egzersiz
                        </button>
                    ` : ''}
                </div>
                <div class="exercises-container">
            `;

            if (program.exercises && Array.isArray(program.exercises)) {
                program.exercises.forEach(exercise => {
                    html += this.renderExercise(exercise);
                });
            }

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error rendering programs:', error);
            document.getElementById('programCards').innerHTML = `
                <div class="error-message">
                    Programlar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.
                </div>
            `;
        }
    }

    renderExercise(exercise) {
        return `
            <div class="exercise-card">
                <h3>${exercise.name}</h3>
                <div class="exercise-info">
                    <div class="weight-selector">
                        <input type="number" 
                               value="${exercise.weight}" 
                               onchange="dashboard.updateWeight('${exercise.name}', this.value)"
                               min="0" 
                               step="1"
                               ${!this.editMode ? 'readonly' : ''}>
                        <span>KG</span>
                    </div>
                </div>
                <div class="sets-container">
                    ${exercise.sets.map(set => `
                        <div class="set-box">
                            <span>${set.number}. Set: ${set.reps} Tekrar</span>
                        </div>
                    `).join('')}
                </div>
                <div class="video-section">
                    <div class="video-container">
                        <iframe
                            src="https://www.youtube.com/embed/${this.getYoutubeVideoId(exercise.videoUrl)}?rel=0"
                            frameborder="0"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                </div>
                ${this.editMode ? `
                    <div class="exercise-controls">
                        <button onclick="dashboard.editExercise('${exercise.name}')" class="edit-btn">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button onclick="dashboard.deleteExercise('${exercise.name}')" class="delete-btn">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ... (diğer metodlar aynen kalacak)
}

// Dashboard'ı başlat
window.onload = () => {
    window.dashboard = new Dashboard();
};

// Escape tuşu ile videoyu kapatma
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.dashboard?.currentVideo) {
        window.dashboard.closeVideo();
    }
});
