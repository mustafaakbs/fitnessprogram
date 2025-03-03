import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDay = 'pazartesi';
        this.checkUserAccess();
        this.initializeInterface();
        this.loadUserProgram(this.currentDay);
    }

    checkUserAccess() {
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = JSON.parse(userJson);
        document.getElementById('currentUser').textContent = `Current User's Login: ${this.currentUser.username}`;
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${now.toISOString().slice(0, 19).replace('T', ' ')}`;
        document.getElementById('currentDateTime').textContent = formattedDate;
    }

    async loadUserProgram(day) {
        try {
            if (!this.currentUser) return;

            const programRef = ref(db, `userPrograms/${this.currentUser.id}/${day}`);
            const snapshot = await get(programRef);
            const program = snapshot.val();

            // Program başlığını göster
            const titleElement = document.querySelector('.program-title');
            if (titleElement) {
                titleElement.textContent = program?.title || 'Program';
            }

            // Program içeriğini temizle
            const exercisesContainer = document.getElementById('exercisesContainer');
            if (!exercisesContainer) return;
            exercisesContainer.innerHTML = '';

            if (!program || !program.exercises || program.exercises.length === 0) {
                exercisesContainer.innerHTML = '<p class="no-program">Bu gün için program bulunamadı.</p>';
                return;
            }

            // Egzersizleri listele
            program.exercises.forEach((exercise, index) => {
                const exerciseDiv = document.createElement('div');
                exerciseDiv.className = 'exercise-card';
                
                let setsHtml = '';
                if (exercise.sets) {
                    exercise.sets.forEach(set => {
                        setsHtml += `
                            <div class="set-item">
                                <span>Set ${set.number}:</span>
                                <span>${set.reps} tekrar</span>
                            </div>
                        `;
                    });
                }

                exerciseDiv.innerHTML = `
                    <h3 class="exercise-name">${exercise.name || 'İsimsiz Egzersiz'}</h3>
                    <div class="sets-container">
                        ${setsHtml}
                    </div>
                    ${exercise.videoUrl ? `
                        <div class="video-container">
                            <a href="${exercise.videoUrl}" target="_blank" class="video-link">
                                Egzersiz Videosu <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    ` : ''}
                `;

                exercisesContainer.appendChild(exerciseDiv);
            });

        } catch (error) {
            console.error('Error loading program:', error);
            document.getElementById('exercisesContainer').innerHTML = 
                '<p class="error-message">Program yüklenirken bir hata oluştu.</p>';
        }
    }

    initializeInterface() {
        // Günleri seçme işlemleri
        const dayButtons = document.querySelectorAll('.day-button');
        dayButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Aktif gün butonunu güncelle
                dayButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Seçilen günün programını yükle
                const selectedDay = e.target.dataset.day;
                this.currentDay = selectedDay;
                this.loadUserProgram(selectedDay);
            });
        });

        // Çıkış butonu
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Tarih ve saat güncelleme
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }
}

// Global erişim için
window.dashboard = new Dashboard();
