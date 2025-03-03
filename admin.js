import { db } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.checkAdminAccess();
        this.initializeInterface();
        this.loadUsers(); // Constructor'da loadUsers'ı çağır
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
        document.getElementById('currentAdmin').textContent = `Admin: ${user.name}`;
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        const turkishDate = now.toLocaleDateString('tr-TR', options);
        document.getElementById('currentDateTime').textContent = turkishDate;
    }

    async loadUsers() {
        try {
            // Firebase'den kullanıcıları al
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val();

            if (!users) {
                console.log('Kullanıcı bulunamadı');
                return;
            }

            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = ''; // Tabloyu temizle

            // Her kullanıcı için bir satır oluştur
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

                // Program detayları için gizli satır
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
                            <button class="action-btn add-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                            <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
                tbody.appendChild(programRow);
            });

            console.log('Kullanıcılar yüklendi:', users);
        } catch (error) {
            console.error('Kullanıcılar yüklenirken hata oluştu:', error);
        }
    }

    async saveUser(userId) {
        const row = document.querySelector(`tr[data-id="${userId}"]`);
        if (!row) return;

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
            this.loadUsers(); // Tabloyu yenile
        } catch (error) {
            console.error('Kullanıcı kaydedilirken hata:', error);
            alert('Kullanıcı kaydedilirken hata oluştu');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

        try {
            await remove(ref(db, `users/${userId}`));
            await remove(ref(db, `userPrograms/${userId}`));
            this.loadUsers(); // Tabloyu yenile
            alert('Kullanıcı başarıyla silindi');
        } catch (error) {
            console.error('Kullanıcı silinirken hata:', error);
            alert('Kullanıcı silinirken hata oluştu');
        }
    }

    async toggleProgram(userId) {
        const programRow = document.querySelector(`tr[data-id="${userId}"]`).nextElementSibling;
        if (programRow.style.display === 'none') {
            programRow.style.display = 'table-row';
            await this.loadDayProgram(userId, 'pazartesi');
        } else {
            programRow.style.display = 'none';
        }
    }

    async loadDayProgram(userId, day) {
        try {
            const snapshot = await get(ref(db, `userPrograms/${userId}/${day}`));
            const program = snapshot.val() || { exercises: [] };
            const container = document.getElementById(`program-${userId}`);
            
            let html = '';
            if (program.exercises) {
                program.exercises.forEach((exercise, index) => {
                    html += `
                        <div class="exercise-card">
                            <input type="text" class="table-input" value="${exercise.name || ''}" placeholder="Egzersiz Adı">
                            <div class="sets-container">
                                ${exercise.sets.map((set, setIndex) => `
                                    <div class="set-item">
                                        <span>Set ${setIndex + 1}:</span>
                                        <input type="number" class="table-input" value="${set.reps}" min="1">
                                    </div>
                                `).join('')}
                            </div>
                            <input type="text" class="table-input" value="${exercise.videoUrl || ''}" placeholder="Video URL">
                            <button class="action-btn delete-btn" onclick="adminPanel.deleteExercise('${userId}', ${index})">Sil</button>
                        </div>
                    `;
                });
            }
            container.innerHTML = html;
        } catch (error) {
            console.error('Program yüklenirken hata:', error);
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
