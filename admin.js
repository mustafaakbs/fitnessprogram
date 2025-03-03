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
        document.getElementById('currentAdmin').textContent = user.username;
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('currentDateTime').textContent = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${now.toISOString().slice(0, 19).replace('T', ' ')}`;
    }

    async loadUsers() {
        try {
            const snapshot = await get(ref(db, 'users'));
            const users = snapshot.val();
            const tbody = document.getElementById('usersTableBody');
            
            if (!tbody) return;
            tbody.innerHTML = '';

            Object.entries(users).forEach(([userId, user]) => {
                const tr = document.createElement('tr');
                tr.dataset.id = userId;
                
                tr.innerHTML = `
                    <td>${userId}</td>
                    <td><input type="text" class="table-input" name="name" value="${user.name || ''}" /></td>
                    <td><input type="text" class="table-input" name="username" value="${user.username || ''}" /></td>
                    <td><input type="text" class="table-input" name="password" value="${user.password || ''}" /></td>
                    <td>
                        <select class="table-input" name="role">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Kullanıcı</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn save-btn" onclick="adminPanel.saveUser('${userId}')">Kaydet</button>
                        <button class="action-btn delete-btn" onclick="adminPanel.deleteUser('${userId}')">Sil</button>
                        <button class="action-btn program-btn" onclick="adminPanel.toggleProgram('${userId}')">Program</button>
                    </td>
                `;

                const programRow = document.createElement('tr');
                programRow.className = 'program-row';
                programRow.style.display = 'none';
                programRow.innerHTML = `
                    <td colspan="6">
                        <div class="program-container">
                            <div class="program-header">
                                <select class="day-select" onchange="adminPanel.loadDayProgram('${userId}', this.value)">
                                    <option value="pazartesi">Pazartesi</option>
                                    <option value="sali">Salı</option>
                                    <option value="carsamba">Çarşamba</option>
                                    <option value="persembe">Perşembe</option>
                                    <option value="cuma">Cuma</option>
                                    <option value="cumartesi">Cumartesi</option>
                                    <option value="pazar">Pazar</option>
                                </select>
                            </div>
                            <div class="program-exercises" id="program-${userId}"></div>
                            <div class="program-actions">
                                <button class="action-btn add-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                                <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
                            </div>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
                tbody.appendChild(programRow);
            });
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async saveUser(userId) {
        const row = document.querySelector(`tr[data-id="${userId}"]`);
        const userData = {
            id: userId,
            name: row.querySelector('[name="name"]').value,
            username: row.querySelector('[name="username"]').value,
            password: row.querySelector('[name="password"]').value,
            role: row.querySelector('[name="role"]').value
        };

        try {
            await set(ref(db, `users/${userId}`), userData);
            alert('Kullanıcı başarıyla kaydedildi');
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Kullanıcı kaydedilirken hata oluştu');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

        try {
            await remove(ref(db, `users/${userId}`));
            await remove(ref(db, `userPrograms/${userId}`));
            this.loadUsers();
            alert('Kullanıcı silindi');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Kullanıcı silinirken hata oluştu');
        }
    }

    addNewUser() {
        const tbody = document.getElementById('usersTableBody');
        const newId = Date.now().toString();
        const tr = document.createElement('tr');
        tr.dataset.id = newId;
        
        tr.innerHTML = `
            <td>${newId}</td>
            <td><input type="text" class="table-input" name="name" /></td>
            <td><input type="text" class="table-input" name="username" /></td>
            <td><input type="text" class="table-input" name="password" /></td>
            <td>
                <select class="table-input" name="role">
                    <option value="user">Kullanıcı</option>
                    <option value="admin">Admin</option>
                </select>
            </td>
            <td>
                <button class="action-btn save-btn" onclick="adminPanel.saveUser('${newId}')">Kaydet</button>
                <button class="action-btn delete-btn" onclick="adminPanel.deleteUser('${newId}')">Sil</button>
            </td>
        `;
        
        tbody.insertBefore(tr, tbody.firstChild);
    }

    async toggleProgram(userId) {
        const tr = document.querySelector(`tr[data-id="${userId}"]`);
        const programRow = tr.nextElementSibling;
        
        if (programRow.style.display === 'none') {
            programRow.style.display = 'table-row';
            const daySelect = programRow.querySelector('.day-select');
            this.currentDay = daySelect.value;
            await this.loadDayProgram(userId, this.currentDay);
        } else {
            programRow.style.display = 'none';
        }
    }

    async loadDayProgram(userId, day) {
        this.currentDay = day;
        try {
            const snapshot = await get(ref(db, `userPrograms/${userId}/${day}`));
            const program = snapshot.val() || { exercises: [] };
            const container = document.getElementById(`program-${userId}`);
            
            let html = '';
            if (program.exercises && program.exercises.length > 0) {
                program.exercises.forEach((exercise, index) => {
                    html += `
                        <div class="exercise-card" data-index="${index}">
                            <input type="text" class="exercise-name" value="${exercise.name || ''}" placeholder="Egzersiz Adı">
                            <div class="sets-container">
                                ${exercise.sets ? exercise.sets.map((set, setIndex) => `
                                    <div class="set-item">
                                        <span>Set ${setIndex + 1}:</span>
                                        <input type="number" class="set-input" value="${set.reps}" min="1">
                                        <span>tekrar</span>
                                    </div>
                                `).join('') : ''}
                            </div>
                            <input type="text" class="video-url" value="${exercise.videoUrl || ''}" placeholder="Video URL">
                            <div class="exercise-actions">
                                <button class="action-btn" onclick="adminPanel.addSet('${userId}', ${index})">Set Ekle</button>
                                <button class="action-btn delete-btn" onclick="adminPanel.deleteExercise('${userId}', ${index})">Egzersizi Sil</button>
                            </div>
                        </div>
                    `;
                });
            }
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading program:', error);
        }
    }

    async addExercise(userId) {
        const container = document.getElementById(`program-${userId}`);
        const newExercise = {
            name: '',
            sets: [{number: 1, reps: 12}],
            videoUrl: ''
        };

        try {
            const programRef = ref(db, `userPrograms/${userId}/${this.currentDay}`);
            const snapshot = await get(programRef);
            const currentProgram = snapshot.val() || { exercises: [] };
            
            currentProgram.exercises.push(newExercise);
            await set(programRef, currentProgram);
            await this.loadDayProgram(userId, this.currentDay);
        } catch (error) {
            console.error('Error adding exercise:', error);
        }
    }

    async addSet(userId, exerciseIndex) {
        try {
            const programRef = ref(db, `userPrograms/${userId}/${this.currentDay}`);
            const snapshot = await get(programRef);
            const program = snapshot.val();
            
            if (program && program.exercises[exerciseIndex]) {
                const exercise = program.exercises[exerciseIndex];
                exercise.sets = exercise.sets || [];
                exercise.sets.push({
                    number: exercise.sets.length + 1,
                    reps: 12
                });
                
                await set(programRef, program);
                await this.loadDayProgram(userId, this.currentDay);
            }
        } catch (error) {
            console.error('Error adding set:', error);
        }
    }

    async deleteExercise(userId, exerciseIndex) {
        if (!confirm('Bu egzersizi silmek istediğinize emin misiniz?')) return;

        try {
            const programRef = ref(db, `userPrograms/${userId}/${this.currentDay}`);
            const snapshot = await get(programRef);
            const program = snapshot.val();
            
            if (program && program.exercises) {
                program.exercises.splice(exerciseIndex, 1);
                await set(programRef, program);
                await this.loadDayProgram(userId, this.currentDay);
            }
        } catch (error) {
            console.error('Error deleting exercise:', error);
        }
    }

    async saveProgram(userId) {
        try {
            const container = document.getElementById(`program-${userId}`);
            const exercises = [];
            
            container.querySelectorAll('.exercise-card').forEach(card => {
                const sets = [];
                card.querySelectorAll('.set-item').forEach((setItem, index) => {
                    sets.push({
                        number: index + 1,
                        reps: parseInt(setItem.querySelector('.set-input').value)
                    });
                });

                exercises.push({
                    name: card.querySelector('.exercise-name').value,
                    sets: sets,
                    videoUrl: card.querySelector('.video-url').value
                });
            });

            await set(ref(db, `userPrograms/${userId}/${this.currentDay}`), {
                exercises: exercises
            });

            alert('Program başarıyla kaydedildi');
        } catch (error) {
            console.error('Error saving program:', error);
            alert('Program kaydedilirken hata oluştu');
        }
    }

    initializeInterface() {
        document.getElementById('addUserBtn').addEventListener('click', () => this.addNewUser());
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
        
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }
}

// Global erişim için
window.adminPanel = new AdminPanel();
