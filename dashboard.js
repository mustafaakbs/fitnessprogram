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

    setupEventListeners() {
        // Çıkış butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        // Gün butonları
        document.querySelectorAll('.day-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.changeDay(e.target.dataset.day);
            });
        });
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
                               readonly
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
            </div>
        `;
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
