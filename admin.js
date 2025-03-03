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
        document.getElementById('currentUser').textContent = `${user.username}`;
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
        };
        const formattedDate = now.toLocaleString('tr-TR', options);
        document.getElementById('currentDateTime').textContent = formattedDate;
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
                    <input type="text" class="program-title-input" 
                           value="${program.title || ''}" 
                           placeholder="Program Başlığı (örn: Karın + Cardio)">
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

    // (Diğer mevcut fonksiyonlar aynı kalacak)

    async saveProgram(userId) {
        try {
            const container = document.getElementById(`program-${userId}`);
            const programTitle = container.querySelector('.program-title-input').value;
            const exercises = [];
            
            container.querySelectorAll('.exercise-card').forEach(card => {
                const sets = [];
                card.querySelectorAll('.set-item').forEach((setItem, index) => {
                    sets.push({
                        number: index + 1,
                        reps: parseInt(setItem.querySelector('.set-input').value) || 0
                    });
                });

                exercises.push({
                    name: card.querySelector('.exercise-name').value,
                    sets: sets,
                    videoUrl: card.querySelector('.video-url').value
                });
            });

            await set(ref(db, `userPrograms/${userId}/${this.currentDay}`), {
                title: programTitle,
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
