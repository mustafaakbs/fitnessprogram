import { db } from './firebase-config.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import Database from './database.js';

class Dashboard {
    constructor() {
        this.db = new Database();
        this.initializeDashboard();
        this.setupEventListeners();
        this.loadRecentChanges();
    }

    async initializeDashboard() {
        try {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            if (!currentUser) {
                window.location.href = 'index.html';
                return;
            }

            if (currentUser.role === 'admin') {
                document.body.classList.add('admin-view');
            }

            // Programları yükle
            const snapshot = await get(ref(db, 'programs'));
            const programs = snapshot.val();
            this.renderPrograms(programs);
        } catch (error) {
            console.error('Dashboard initialization error:', error);
        }
    }

    async loadRecentChanges() {
        try {
            const changes = await this.db.getRecentChanges(10);
            const changesList = document.getElementById('changesList');
            if (!changesList) return;

            changesList.innerHTML = '';
            
            const sortedChanges = Object.entries(changes)
                .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

            sortedChanges.forEach(([key, change]) => {
                const changeItem = document.createElement('div');
                changeItem.className = 'change-item';
                changeItem.innerHTML = `
                    <div class="change-header">
                        <span class="change-date">${change.formattedDate}</span>
                        <span class="change-user">${change.user}</span>
                    </div>
                    <div class="change-details">
                        <span class="change-action">${change.action}</span>
                        <span class="change-info">${JSON.stringify(change.details)}</span>
                    </div>
                `;
                changesList.appendChild(changeItem);
            });
        } catch (error) {
            console.error('Error loading changes:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Program güncelleme formu için event listener
        document.addEventListener('submit', async (e) => {
            if (e.target.classList.contains('exercise-form')) {
                e.preventDefault();
                const form = e.target;
                const day = form.getAttribute('data-day');
                const exerciseIndex = parseInt(form.getAttribute('data-index'));
                
                const updatedExercise = {
                    name: form.querySelector('.exercise-name').value,
                    sets: Array.from(form.querySelectorAll('.set-input')).map((input, idx) => ({
                        number: idx + 1,
                        reps: parseInt(input.value)
                    })),
                    weight: parseInt(form.querySelector('.weight-input').value),
                    videoUrl: form.querySelector('.video-url').value
                };

                await this.updateExercise(day, exerciseIndex, updatedExercise);
            }
        });
    }

    async updateExercise(day, exerciseIndex, updatedExercise) {
        try {
            const updates = {};
            updates[`programs/${day}/exercises/${exerciseIndex}`] = updatedExercise;
            await update(ref(db), updates);
            await this.db.logChange('exercise_update', {
                day: day,
                exerciseName: updatedExercise.name
            });
            this.loadRecentChanges();
            this.initializeDashboard();
        } catch (error) {
            console.error('Exercise update error:', error);
        }
    }

    renderPrograms(programs) {
        const container = document.getElementById('programContainer');
        if (!container) return;

        container.innerHTML = '';
        
        for (const [day, program] of Object.entries(programs)) {
            const programDiv = document.createElement('div');
            programDiv.className = 'program-card';
            programDiv.innerHTML = `
                <h2>${program.title}</h2>
                <div class="exercises">
                    ${program.exercises.map((exercise, index) => `
                        <div class="exercise-item">
                            <form class="exercise-form" data-day="${day}" data-index="${index}">
                                <input type="text" class="exercise-name" value="${exercise.name}" required>
                                <div class="sets">
                                    ${exercise.sets.map(set => `
                                        <input type="number" class="set-input" value="${set.reps}" required>
                                    `).join('')}
                                </div>
                                <input type="number" class="weight-input" value="${exercise.weight}" required>
                                <input type="url" class="video-url" value="${exercise.videoUrl}" required>
                                <button type="submit">Güncelle</button>
                                <a href="${exercise.videoUrl}" target="_blank">Video</a>
                            </form>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(programDiv);
        }
    }
}

// Dashboard'ı başlat
new Dashboard();
