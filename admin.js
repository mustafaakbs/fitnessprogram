import { db } from './firebase-config.js';
import { ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
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
        document.getElementById('currentAdmin').textContent = user.name;
    }

    updateDateTime() {
        const now = new Date();
        const dateTimeStr = now.toISOString().slice(0, 19).replace('T', ' ');
        document.getElementById('currentDateTime').textContent = dateTimeStr;
    }

    async loadUsers() {
        try {
            const snapshot = await get(ref(db, 'users'));
            const users = snapshot.val();
            const tbody = document.getElementById('usersTableBody');
            
            if (!tbody) return;

            tbody.innerHTML = '';
            
            Object.values(users).forEach(user => {
                const tr = document.createElement('tr');
                tr.dataset.id = user.id;
                
                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td><input type="text" class="table-input" name="name" value="${user.name || ''}"></td>
                    <td><input type="text" class="table-input" name="username" value="${user.username || ''}"></td>
                    <td><input type="text" class="table-input" name="password" value="${user.password || ''}"></td>
                    <td>
                        <select class="table-input" name="role">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Kullanıcı</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="window.adminPanel.editUserProgram(${user.id})" class="action-btn edit-btn">Program</button>
                    </td>
                    <td>
                        <button onclick="window.adminPanel.saveUser(${user.id})" class="action-btn save-btn">Kaydet</button>
                        <button onclick="window.adminPanel.deleteUser(${user.id})" class="action-btn delete-btn">Sil</button>
                    </td>
                `;
                
                tbody.appendChild(tr);
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
            alert('Kullanıcı kaydedildi');
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

    async editUserProgram(userId) {
        const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
        const day = prompt(`Hangi gün için düzenleme yapacaksınız?\n${days.join(', ')}`);
        
        if (!days.includes(day)) {
            alert('Geçersiz gün seçimi');
            return;
        }

        try {
            const programRef = ref(db, `userPrograms/${userId}/${day}`);
            const title = prompt('Program başlığı:', 'Antrenman');
            const exerciseName = prompt('Egzersiz adı:');
            const setCount = parseInt(prompt('Set sayısı:'));
            const videoUrl = prompt('Video URL:');

            const sets = [];
            for(let i = 1; i <= setCount; i++) {
                const reps = parseInt(prompt(`${i}. set için tekrar sayısı:`));
                sets.push({ number: i, reps });
            }

            const exercise = {
                name: exerciseName,
                sets,
                videoUrl
            };

            await set(programRef, {
                title,
                exercises: [exercise]
            });

            alert('Program güncellendi');
        } catch (error) {
            console.error('Error updating program:', error);
            alert('Program güncellenirken hata oluştu');
        }
    }

    addNewUser() {
        const tbody = document.getElementById('usersTableBody');
        const newId = Date.now();
        
        const tr = document.createElement('tr');
        tr.dataset.id = newId;
        
        tr.innerHTML = `
            <td>${newId}</td>
            <td><input type="text" class="table-input" name="name"></td>
            <td><input type="text" class="table-input" name="username"></td>
            <td><input type="text" class="table-input" name="password"></td>
            <td>
                <select class="table-input" name="role">
                    <option value="user">Kullanıcı</option>
                    <option value="admin">Admin</option>
                </select>
            </td>
            <td>
                <button onclick="window.adminPanel.editUserProgram(${newId})" class="action-btn edit-btn">Program</button>
            </td>
            <td>
                <button onclick="window.adminPanel.saveUser(${newId})" class="action-btn save-btn">Kaydet</button>
                <button onclick="window.adminPanel.deleteUser(${newId})" class="action-btn delete-btn">Sil</button>
            </td>
        `;
        
        tbody.insertBefore(tr, tbody.firstChild);
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

window.adminPanel = new AdminPanel();
