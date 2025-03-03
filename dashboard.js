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
        document.getElementById('currentUser').textContent = this.currentUser.username;
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('currentDateTime').textContent = now.toLocaleString('tr-TR');
    }

    async loadUserProgram(day) {
        try {
            if (!this.currentUser) return;

            const programRef = ref(db, `userPrograms/${this.currentUser.id}/${day}`);
            const snapshot = await get(programRef);
            const program = snapshot.val();

            // Program başlığını göster
            const titleElement = document.querySelector('.program-title');
            if (titleElement && program && program.title) {
                titleElement.textContent = program.title;
            } else if (titleElement) {
                titleElement.textContent = 'Program';
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
                                <span class="set-number">Set ${set.number}</span>
                                <span class="set-reps">${set.reps} tekrar</span>
                            </div>
                        `;
                    });
                }

                // Video önizleme için iframe veya resim
                let videoPreview = '';
                if (exercise.videoUrl) {
                    if (exercise.videoUrl.includes('youtube.com') || exercise.videoUrl.includes('youtu.be')) {
                        const videoId = this.getYoutubeVideoId(exercise.videoUrl);
                        if (videoId) {
                            videoPreview = `
                                <div class="video-preview">
                                    <iframe 
                                        width="100%" 
                                        height="200" 
                                        src="https://www.youtube.com/embed/${videoId}" 
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen
                                    ></iframe>
                                </div>
                            `;
                        }
                    }
                }

                exerciseDiv.innerHTML = `
                    <div class="exercise-header">
                        <h3 class="exercise-name">${exercise.name || 'İsimsiz Egzersiz'}</h3>
                    </div>
                    <div class="exercise-content">
                        <div class="sets-container">
                            ${setsHtml}
                        </div>
                        ${videoPreview}
                    </div>
                `;

                exercisesContainer.appendChild(exerciseDiv);
            });

        } catch (error) {
            console.error('Error loading program:', error);
            document.getElementById('exercisesContainer').innerHTML = 
                '<p class="error-message">Program yüklenirken bir hata oluştu.</p>';
        }
    }

    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    initializeInterface() {
        // Günleri seçme işlemleri
        const dayButtons = document.querySelectorAll('.day-button');
        dayButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                dayButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
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
