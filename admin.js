import { db } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.currentDay = 'pazartesi';
        this.checkAdminAccess();
        this.initializeInterface();
        this.loadUsers();
    }

    checkAdminAccess() {
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        const user = JSON.parse(userJson);
        if (user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        this.currentAdmin = user;
        document.getElementById('currentAdmin').innerText = 
            `Current User's Login: ${user.username}\n`;
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('currentDateTime').innerText = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${now.toISOString().replace('T', ' ').split('.')[0]}\n`;
    }

    async loadUsers() {
        try {
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val();

            const tbody = document.querySelector('.users-table tbody');
            tbody.innerHTML = '';

            for (const userId in users) {
                const user = users[userId];
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>
                        <input type="text" class="table-input" value="${user.username}" data-field="username">
                    </td>
                    <td>
                        <input type="password" class="table-input" value="${user.password}" data-field="password">
                    </td>
                    <td>
                        <input type="text" class="table-input" value="${user.name || ''}" data-field="name">
                    </td>
                    <td>
                        <select class="table-input" data-field="role">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn save-btn" onclick="adminPanel.saveUser('${userId}', this)">Kaydet</button>
                        <button class="action-btn delete-btn" onclick="adminPanel.deleteUser('${userId}')">Sil</button>
                        <button class="action-btn program-btn" onclick="adminPanel.toggleProgram('${userId}')">Program</button>
                    </td>
                `;

                const programRow = document.createElement('tr');
                programRow.className = 'program-row';
                programRow.id = `program-${userId}`;
                programRow.innerHTML = `
                    <td colspan="5">
                        <div class="program-container">
                            <div class="program-header">
                                <select class="day-select" onchange="adminPanel.dayChanged('${userId}', this.value)">
                                    <option value="pazartesi">Pazartesi</option>
                                    <option value="sali">Salı</option>
                                    <option value="carsamba">Çarşamba</option>
                                    <option value="persembe">Perşembe</option>
                                    <option value="cuma">Cuma</option>
                                    <option value="cumartesi">Cumartesi</option>
                                    <option value="pazar">Pazar</option>
                                </select>
                                <select class="program-title-select">
                                    <option value="Cardio">Cardio</option>
                                    <option value="Üst Vücut">Üst Vücut</option>
                                    <option value="Alt Vücut">Alt Vücut</option>
                                    <option value="Full Body">Full Body</option>
                                </select>
                            </div>
                            <div class="exercises-container"></div>
                            <div class="program-actions">
                                <button class="action-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                                <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
                            </div>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
                tbody.appendChild(programRow);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async saveUser(userId, button) {
        try {
            const tr = button.closest('tr');
            const inputs = tr.querySelectorAll('.table-input');
            const userData = {};

            inputs.forEach(input => {
                userData[input.dataset.field] = input.value;
            });

            await set(ref(db, `users/${userId}`), userData);
            alert('Kullanıcı başarıyla güncellendi');
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Kullanıcı güncellenirken bir hata oluştu');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

        try {
            await remove(ref(db, `users/${userId}`));
            await remove(ref(db, `userPrograms/${userId}`));
            await this.loadUsers();
            alert('Kullanıcı başarıyla silindi');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Kullanıcı silinirken bir hata oluştu');
        }
    }

    async toggleProgram(userId) {
        const programRow = document.getElementById(`program-${userId}`);
        const isVisible = programRow.style.display === 'table-row';
        
        if (!isVisible) {
            document.querySelectorAll('.program-row').forEach(row => {
                row.style.display = 'none';
            });
            
            programRow.style.display = 'table-row';
            await this.loadUserProgram(userId);
        } else {
            programRow.style.display = 'none';
        }
    }

    async loadUserProgram(userId) {
        try {
            const programRef = ref(db, `userPrograms/${userId}/${this.currentDay}`);
            const snapshot = await get(programRef);
            const program = snapshot.val();

            const container = document.getElementById(`program-${userId}`);
            const titleSelect = container.querySelector('.program-title-select');
            const exercisesContainer = container.querySelector('.exercises-container');
            
            exercisesContainer.innerHTML = '';

            if (program && program.title) {
                titleSelect.value = program.title;
            }

            if (program && program.exercises) {
                program.exercises.forEach((exercise, index) => {
                    this.createExerciseCard(exercisesContainer, exercise, index, userId);
                });
            }
        } catch (error) {
            console.error('Error loading program:', error);
        }
    }

    createExerciseCard(container, exercise, index, userId) {
        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';
        exerciseCard.dataset.index = index;

        let setsHtml = '';
        if (exercise.sets) {
            exercise.sets.forEach(set => {
                setsHtml += `
                    <div class="set-item">
                        <span>Set ${set.number}:</span>
                        <input type="number" class="set-input" value="${set.reps}" min="1">
                        <span>tekrar</span>
                    </div>
                `;
            });
        }

        exerciseCard.innerHTML = `
            <input type="text" class="exercise-name" value="${exercise.name || ''}" placeholder="Egzersiz Adı">
            <div class="sets-container">
                ${setsHtml}
            </div>
            <input type="text" class="video-url" value="${exercise.videoUrl || ''}" placeholder="Video URL">
            <div class="exercise-actions">
                <button class="action-btn" onclick="adminPanel.addSet('${userId}', ${index})">Set Ekle</button>
                <button class="action-btn delete-btn" onclick="adminPanel.deleteExercise('${userId}', ${index})">Egzersizi Sil</button>
            </div>
        `;

        container.appendChild(exerciseCard);
    }

    dayChanged(userId, day) {
        this.currentDay = day;
        this.loadUserProgram(userId);
    }

    addSet(userId, exerciseIndex) {
        const container = document.getElementById(`program-${userId}`);
        const exerciseCards = container.querySelectorAll('.exercise-card');
        const exerciseCard = exerciseCards[exerciseIndex];
        
        if (exerciseCard) {
            const setsContainer = exerciseCard.querySelector('.sets-container');
            const currentSets = setsContainer.querySelectorAll('.set-item').length;
            
            const newSetDiv = document.createElement('div');
            newSetDiv.className = 'set-item';
            newSetDiv.innerHTML = `
                <span>Set ${currentSets + 1}:</span>
                <input type="number" class="set-input" value="12" min="1">
                <span>tekrar</span>
            `;
            
            setsContainer.appendChild(newSetDiv);
        }
    }

    deleteExercise(userId, exerciseIndex) {
        if (!confirm('Bu egzersizi silmek istediğinize emin misiniz?')) return;

        const container = document.getElementById(`program-${userId}`);
        const exerciseCards = container.querySelectorAll('.exercise-card');
        const exerciseCard = exerciseCards[exerciseIndex];
        
        if (exerciseCard) {
            exerciseCard.remove();
        }
    }

    addExercise(userId) {
        const container = document.getElementById(`program-${userId}`);
        const exercisesContainer = container.querySelector('.exercises-container');
        
        const exercise = {
            name: '',
            sets: [{number: 1, reps: 12}],
            videoUrl: ''
        };

        this.createExerciseCard(exercisesContainer, exercise, exercisesContainer.children.length, userId);
    }

    async saveProgram(userId) {
        try {
            const container = document.getElementById(`program-${userId}`);
            const titleSelect = container.querySelector('.program-title-select');
            const exerciseCards = container.querySelectorAll('.exercise-card');
            
            const exercises = Array.from(exerciseCards).map(card => {
                const sets = Array.from(card.querySelectorAll('.set-item')).map((setItem, index) => ({
                    number: index + 1,
                    reps: parseInt(setItem.querySelector('.set-input').value) || 12
                }));
                
                return {
                    name: card.querySelector('.exercise-name').value,
                    sets: sets,
                    videoUrl: card.querySelector('.video-url').value
                };
            });
            
            const programData = {
                title: titleSelect.value,
                exercises: exercises
            };
            
            await set(ref(db, `userPrograms/${userId}/${this.currentDay}`), programData);
            alert('Program başarıyla kaydedildi');
        } catch (error) {
            console.error('Error saving program:', error);
            alert('Program kaydedilirken bir hata oluştu');
        }
    }

    initializeInterface() {
        document.getElementById('addUserBtn').addEventListener('click', () => {
            const tbody = document.querySelector('.users-table tbody');
            const tr = document.createElement('tr');
            const userId = 'new-' + Date.now();
            
            tr.innerHTML = `
                <td><input type="text" class="table-input" value="" data-field="username"></td>
                <td><input type="password" class="table-input" value="" data-field="password"></td>
                <td><input type="text" class="table-input" value="" data-field="name"></td>
                <td>
                    <select class="table-input" data-field="role">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </td>
                <td>
                    <button class="action-btn save-btn" onclick="adminPanel.saveUser('${userId}', this)">Kaydet</button>
                </td>
            `;
            
            tbody.insertBefore(tr, tbody.firstChild);
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }
}

window.adminPanel = new AdminPanel();
