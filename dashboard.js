import { db } from './firebase-config.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDay = 'pazartesi';
        this.editMode = false;
        
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

    initializeInterface() {
        // Günleri oluştur
        this.createDayButtons();
        
        // Event listener'ları ekle
        this.setupEventListeners();
        
        // İlk programı göster
        this.loadPrograms();

        // Tarih ve kullanıcı bilgisini güncelle
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);

        // Düzenleme modu butonu
        const editModeBtn = document.getElementById('editModeBtn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                this.showPasswordModal();
            });
        }

        // Şifre modalı için event listeners
        document.getElementById('confirmPassword')?.addEventListener('click', () => {
            this.checkAdminPassword();
        });

        document.getElementById('cancelPassword')?.addEventListener('click', () => {
            document.getElementById('passwordModal').style.display = 'none';
        });
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
        document.getElementById('currentDateTime').textContent = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`;
        document.getElementById('currentUser').textContent = 
            `Current User's Login: ${this.currentUser.username}`;
    }

    createDayButtons() {
        const days = ['pazartesi', 'carsamba', 'cuma'];
        const container = document.querySelector('.days-container');
        
        if (!container) return;
        
        container.innerHTML = ''; // Container'ı temizle
        
        days.forEach(day => {
            const btn = document.createElement('button');
            btn.className = `day-btn ${day === this.currentDay ? 'active' : ''}`;
            btn.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            btn.dataset.day = day;
            btn.onclick = () => this.changeDay(day);
            container.appendChild(btn);
        });
    }

    setupEventListeners() {
        // Çıkış butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }

    showPasswordModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'block';
            const adminPassword = document.getElementById('adminPassword');
            if (adminPassword) {
                adminPassword.value = '';
                adminPassword.focus();
            }
        }
    }

    async checkAdminPassword() {
        const password = document.getElementById('adminPassword').value;
        try {
            const snapshot = await get(ref(db, 'users'));
            const users = snapshot.val();
            const adminUser = users.find(u => u.role === 'admin');
            
            if (password === adminUser.password) {
                this.editMode = !this.editMode;
                document.getElementById('passwordModal').style.display = 'none';
                document.getElementById('editModeBtn').classList.toggle('active', this.editMode);
                this.loadPrograms(); // Programları yeniden yükle
            } else {
                alert('Yanlış şifre!');
            }
        } catch (error) {
            console.error('Error checking admin password:', error);
            alert('Bir hata oluştu!');
        }
    }

    async loadPrograms() {
        try {
            const snapshot = await get(ref(db, 'programs'));
            const programs = snapshot.val();
            
            if (!programs) {
                console.error('No programs found');
                return;
            }

            // Günlük programı göster
            this.renderProgram(programs[this.currentDay]);

        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    changeDay(day) {
        this.currentDay = day;
        // Aktif gün butonunu güncelle
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.day === day);
        });
        this.loadPrograms();
    }

    renderProgram(program) {
        if (!program) return;

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
    }

    renderExercise(exercise) {
        return `
            <div class="exercise-card">
                <h3>${exercise.name}</h3>
                <div class="exercise-info">
                    <div class="weight-selector">
                        <input type="number" 
                               value="${exercise.weight}" 
                               ${!this.editMode ? 'readonly' : ''}
                               onchange="dashboard.updateWeight('${exercise.name}', this.value)"
                               min="0" 
                               step="1">
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

    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async updateWeight(exerciseName, newWeight) {
        if (!this.editMode) return;

        try {
            const snapshot = await get(ref(db, `programs/${this.currentDay}`));
            const program = snapshot.val();
            const exercise = program.exercises.find(e => e.name === exerciseName);
            
            if (exercise) {
                exercise.weight = parseInt(newWeight) || 0;
                await update(ref(db), {
                    [`programs/${this.currentDay}`]: program
                });
            }
        } catch (error) {
            console.error('Error updating weight:', error);
        }
    }
}

// Dashboard'ı başlat
window.onload = () => {
    window.dashboard = new Dashboard();
};
