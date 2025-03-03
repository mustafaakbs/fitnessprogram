import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.initializeUI();
        this.loadPrograms();
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    initializeUI() {
        // Kullanıcı kontrolü
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // Kullanıcı bilgisini göster
        document.getElementById('currentUser').textContent = `Current User's Login: ${currentUser.username}`;
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${
            now.toISOString().slice(0, 19).replace('T', ' ')
        }`;
        document.getElementById('currentDateTime').textContent = formattedDate;
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

        // Form submit olayları için event delegation
        document.addEventListener('submit', async (e) => {
            if (e.target.classList.contains('exercise-form')) {
                e.preventDefault();
                await this.handleExerciseSubmit(e.target);
            }
        });
    }

    switchDay(day) {
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
                const dayContainer = document.getElementById(day).querySelector('.exercises');
                dayContainer.innerHTML = '';

                program.exercises.forEach((exercise, index) => {
                    const exerciseElement = this.createExerciseElement(exercise, day, index);
                    dayContainer.appendChild(exerciseElement);
                });
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    createExerciseElement(exercise, day, index) {
        const template = document.getElementById('exerciseFormTemplate');
        const form = template.content.cloneNode(true).querySelector('form');
        
        form.setAttribute('data-day', day);
        form.setAttribute('data-index', index);

        // Form alanlarını doldur
        form.querySelector('.exercise-name').value = exercise.name;
        
        const setInputs = form.querySelectorAll('.set-input');
        exercise.sets.forEach((set, i) => {
            if (setInputs[i]) {
                setInputs[i].value = set.reps;
            }
        });

        form.querySelector('.weight-input').value = exercise.weight;
        form.querySelector('.video-url').value = exercise.videoUrl;

        // Video önizleme
        const videoPreview = form.querySelector('.video-preview');
        if (exercise.videoUrl.includes('youtube.com') || exercise.videoUrl.includes('youtu.be')) {
            const videoId = this.getYouTubeVideoId(exercise.videoUrl);
            videoPreview.innerHTML = `
                <iframe width="280" height="157" 
                    src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
        }

        return form;
    }

    getYouTubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async handleExerciseSubmit(form) {
        try {
            const day = form.dataset.day;
            const index = parseInt(form.dataset.index);

            const updatedExercise = {
                name: form.querySelector('.exercise-name').value,
                sets: Array.from(form.querySelectorAll('.set-input')).map((input, i) => ({
                    number: i + 1,
                    reps: parseInt(input.value)
                })),
                weight: parseInt(form.querySelector('.weight-input').value),
                videoUrl: form.querySelector('.video-url').value
            };

            // Mevcut programı al
            const snapshot = await get(ref(db, `programs/${day}`));
            const program = snapshot.val();
            
            // Egzersizi güncelle
            program.exercises[index] = updatedExercise;

            // Firebase'i güncelle
            await update(ref(db), {
                [`programs/${day}`]: program
            });

            alert('Egzersiz başarıyla güncellendi!');
            this.loadPrograms(); // Sayfayı yenile
        } catch (error) {
            console.error('Error updating exercise:', error);
            alert('Egzersiz güncellenirken bir hata oluştu!');
        }
    }
}

// Dashboard'ı başlat
new Dashboard();
