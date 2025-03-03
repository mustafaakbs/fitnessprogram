import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDay = 'pazartesi';
        
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
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const turkishDate = now.toLocaleDateString('tr-TR', options);
        document.getElementById('currentDateTime').textContent = `Tarih: ${turkishDate}`;
        document.getElementById('currentUser').textContent = `Kullanıcı: ${this.currentUser.name}`;
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
    }

    async loadUserPrograms() {
        try {
            const userId = this.currentUser.id;
            const snapshot = await get(ref(db, `userPrograms/${userId}`));
            let programs = snapshot.val();
            
            if (!programs) {
                programs = this.createDefaultPrograms();
                // Yeni kullanıcı için varsayılan programları oluştur
                await update(ref(db), { [`userPrograms/${userId}`]: programs });
            }

            this.renderProgram(programs[this.currentDay]);
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    createDefaultPrograms() {
        const defaultPrograms = {
            pazartesi: { 
                title: "Göğüs + Ön Kol", 
                exercises: [
                    {
                        name: "Bench Press",
                        weight: 20,
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg"
                    }
                ]
            },
            sali: { 
                title: "Karın + Cardio",
                exercises: []
            },
            carsamba: { 
                title: "Sırt + Arka Kol",
                exercises: []
            },
            persembe: { 
                title: "Karın + Cardio",
                exercises: []
            },
            cuma: { 
                title: "Bacak + Omuz",
                exercises: []
            },
            cumartesi: { 
                title: "Karın + Cardio",
                exercises: []
            },
            pazar: { 
                title: "Dinlenme",
                exercises: []
            }
        };

        return defaultPrograms;
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

    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
}

window.onload = () => {
    window.dashboard = new Dashboard();
};
