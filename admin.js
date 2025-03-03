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
        document.getElementById('currentAdmin').textContent = `Current User's Login: ${user.username}`;
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
                            <div id="program-${userId}" class="program-content"></div>
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

    async loadDayProgram(userId, day) {
        this.currentDay = day;
        try {
            const snapshot = await get(ref(db, `userPrograms/${userId}/${day}`));
            const program = snapshot.val() || { title: '', exercises: [] };
            const container = document.getElementById(`program-${userId}`);
            
            let html = `
                <div class="program-title-container">
                    <select class="program-title-select" onchange="adminPanel.updateProgramTitle('${userId}', this.value)">
                        <option value="">Program Seçin</option>
                        <option value="Karın + Cardio" ${program.title === 'Karın + Cardio' ? 'selected' : ''}>Karın + Cardio</option>
                        <option value="Göğüs + Triceps" ${program.title === 'Göğüs + Triceps' ? 'selected' : ''}>Göğüs + Triceps</option>
                        <option value="Sırt + Biceps" ${program.title === 'Sırt + Biceps' ? 'selected' : ''}>Sırt + Biceps</option>
                        <option value="Bacak" ${program.title === 'Bacak' ? 'selected' : ''}>Bacak</option>
                        <option value="Omuz" ${program.title === 'Omuz' ? 'selected' : ''}>Omuz</option>
                    </select>
                </div>
                <div class="exercises-container">
            `;

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

            html += `
                </div>
                <div class="program-actions">
                    <button class="action-btn add-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                    <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading program:', error);
        }
    }

    async updateProgramTitle(userId, title) {
        try {
            const programRef = ref(db, `userPrograms/${userId}/${this.currentDay}`);
            const snapshot = await get(programRef);
            const currentProgram = snapshot.val() || { exercises: [] };
            
            currentProgram.title = title;
            await set(programRef, currentProgram);
            alert('Program başlığı güncellendi');
        } catch (error) {
            console.error('Error updating program title:', error);
            alert('Program başlığı güncellenirken hata oluştu');
        }
    }

    // Diğer fonksiyonlar aynı kalacak...
}

// Global erişim için
window.adminPanel = new AdminPanel();
