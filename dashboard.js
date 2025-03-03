import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

        // Kullanıcı bilgilerini ayarla
        this.currentUser = JSON.parse(userJson);

        // Event listener'ları ekle
        this.setupEventListeners();
        
        // Programları yükle
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
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Gün butonları
        document.querySelectorAll('.day-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchDay(e.target.dataset.day);
            });
        });
    }

    switchDay(day) {
        this.currentDay = day;
        // Aktif gün butonunu güncelle
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.day === day);
        });

        // Aktif program içeriğini güncelle
        document.querySelectorAll('.program-day').forEach(program => {
            program.classList.toggle('active', program.id === day);
        });
    }

    async loadPrograms() {
        try {
            const snapshot = await get(ref(db, 'programs'));
            const programs = snapshot.val();
            
            for (const [day, program] of Object.entries(programs)) {
                const dayContainer = document.getElementById(day)?.querySelector('.exercises');
                if (dayContainer) {
                    dayContainer.innerHTML = program.exercises.map(exercise => 
                        this.createExerciseElement(exercise)
                    ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    createExerciseElement(exercise) {
        return `
            <div class="exercise-item">
                <h3>${exercise.name}</h3>
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
                    <div class="video-container">
                        <iframe
                            width="280"
                            height="157"
                            src="https://www.youtube.com/embed/${this.getYoutubeVideoId(exercise.videoUrl)}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
