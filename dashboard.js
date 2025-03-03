import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDay = 'pazartesi';
        
        // Kullanıcı kontrolü
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = JSON.parse(userJson);
        this.initializeInterface();
    }

    initializeInterface() {
        this.createDayButtons();
        this.setupEventListeners();
        this.loadUserPrograms();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        const turkishDate = now.toLocaleDateString('tr-TR', options);
        document.getElementById('currentDateTime').textContent = turkishDate;
        
        // Kullanıcı adını göster
        const userName = document.getElementById('currentUser');
        if (userName) {
            userName.textContent = this.currentUser.name || this.currentUser.username;
        }
    }

    createDayButtons() {
        const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
        const container = document.querySelector('.days-container');
        
        if (!container) return;
        
        container.innerHTML = days.map(day => `
            <button class="day-btn ${day === this.currentDay ? 'active' : ''}" 
                    data-day="${day}">
                ${day.charAt(0).toUpperCase() + day.slice(1)}
            </button>
        `).join('');

        // Gün butonlarına event listener ekle
        container.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', () => this.changeDay(btn.dataset.day));
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
    }

    async loadUserPrograms() {
        try {
            const userId = this.currentUser.id;
            const snapshot = await get(ref(db, `userPrograms/${userId}`));
            let programs = snapshot.val();
            
            if (!programs) {
                console.log('Bu kullanıcı için program bulunamadı');
                return;
            }

            const currentProgram = programs[this.currentDay];
            if (currentProgram) {
                this.renderProgram(currentProgram);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    changeDay(day) {
        this.currentDay = day;
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.day === day);
        });
        this.loadUserPrograms();
    }

    renderProgram(program) {
        const container = document.getElementById('programCards');
        if (!container || !program) return;

        let html = `
            <h2 class="program-title">${program.title}</h2>
            <div class="exercises-container">
        `;

        if (program.exercises && program.exercises.length > 0) {
            program.exercises.forEach(exercise => {
                html += this.renderExercise(exercise);
            });
        } else {
            html += '<p class="no-exercise">Bu gün için egzersiz bulunmamaktadır.</p>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    renderExercise(exercise) {
        return `
            <div class="exercise-card">
                <h3>${exercise.name}</h3>
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

    getYoutubeVideoId(url) {
        if (!url) return '';
        
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        
        return (match && match[2].length === 11) ? match[2] : '';
    }

    // Hata mesajlarını göstermek için yardımcı fonksiyon
    showError(message) {
        const container = document.getElementById('programCards');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// Dashboard'ı başlat
window.onload = () => {
    window.dashboard = new Dashboard();
};

// Sayfadan çıkış yapılırken session'ı temizle
window.addEventListener('beforeunload', () => {
    // Eğer sayfa yenileniyorsa session'ı korumak için kontrol eklenebilir
    if (!window.location.href.includes('index.html')) {
        sessionStorage.removeItem('currentUser');
    }
});

export default Dashboard;
