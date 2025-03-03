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
        const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
        const container = document.querySelector('.days-container');
        
        if (!container) return;
        
        container.innerHTML = '';
        
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
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        const editModeBtn = document.getElementById('editModeBtn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                this.showPasswordModal();
            });
        }

        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('click', () => {
                this.checkAdminPassword();
            });
        }

        const cancelPassword = document.getElementById('cancelPassword');
        if (cancelPassword) {
            cancelPassword.addEventListener('click', () => {
                document.getElementById('passwordModal').style.display = 'none';
            });
        }
    }

    async loadPrograms() {
        try {
            const snapshot = await get(ref(db, 'programs'));
            let programs = snapshot.val();
            
            if (!programs) {
                programs = this.createDefaultPrograms();
                await update(ref(db), { programs });
            }

            this.renderProgram(programs[this.currentDay]);
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    createDefaultPrograms() {
        return {
            pazartesi: { title: "Göğüs + Ön Kol", exercises: [] },
            sali: { title: "Karın + Cardio", exercises: [] },
            carsamba: { title: "Sırt + Arka Kol", exercises: [] },
            persembe: { title: "Karın + Cardio", exercises: [] },
            cuma: { title: "Bacak + Omuz", exercises: [] },
            cumartesi: { title: "Karın + Cardio", exercises: [] },
            pazar: { title: "Dinlenme", exercises: [] }
        };
    }

    changeDay(day) {
        this.currentDay = day;
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
            <h2>${program.title}</h2>
            <div class="exercises-container">
        `;

        if (program.exercises && program.exercises.length > 0) {
            program.exercises.forEach(exercise => {
                html += this.renderExercise(exercise);
            });
        } else {
            html += '<p>Bu gün için egzersiz bulunmamaktadır.</p>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    renderExercise(exercise) {
        return `
            <div class="exercise-card">
                <h3>${exercise.name}</h3>
                <p>Ağırlık: ${exercise.weight} kg</p>
                <div class="sets">
                    ${exercise.sets.map(set => 
                        `<p>${set.number}. Set: ${set.reps} Tekrar</p>`
                    ).join('')}
                </div>
                <div class="video-container">
                    <iframe
                        src="https://www.youtube.com/embed/${this.getYoutubeVideoId(exercise.videoUrl)}?rel=0"
                        frameborder="0"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;
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
                this.loadPrograms();
            } else {
                alert('Yanlış şifre!');
            }
        } catch (error) {
            console.error('Error checking admin password:', error);
            alert('Bir hata oluştu!');
        }
    }

    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
}

// Dashboard'ı başlat
window.onload = () => {
    window.dashboard = new Dashboard();
};
