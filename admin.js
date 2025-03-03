import { db } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.checkAdminAccess();
        this.initializeInterface();
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
        const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
        document.getElementById('currentDateTime').textContent = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`;
    }

    initializeInterface() {
        document.getElementById('addUserBtn').addEventListener('click', () => this.addNewUser());
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
        
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        this.loadUsers();
    }

    async loadUsers() {
        try {
            const snapshot = await get(ref(db, 'users'));
            const users = snapshot.val() || {};
            const tbody = document.getElementById('usersTableBody');
            
            if (!tbody) return;
            tbody.innerHTML = '';

            for (const userId in users) {
                const user = users[userId];
                const tr = document.createElement('tr');
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
                            <button class="action-btn add-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                            <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
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
        if (!tr) return;

        const programRow = tr.nextElementSibling;
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
            
            container.innerHTML = program.exercises.map((exercise, index) => `
                <div class="exercise-card" data-index="${index}">
                    <div class="exercise-header">
                        <input type="text" class="table-input" name="name" value="${exercise.name || ''}" placeholder="Egzersiz Adı" />
                        <button class="action-btn delete-btn" onclick="adminPanel.deleteExercise('${userId}', ${index})">Sil</button>
                    </div>
                    
