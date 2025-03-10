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
        // Admin ve mustafaakbs için yetki ver
        if (user.role !== 'admin' && user.username !== 'mustafaakbs') {
            window.location.href = 'dashboard.html';
            return;
        }

        this.currentAdmin = user;
        document.getElementById('currentAdmin').innerText = `Current User's Login: ${user.username}\n`;
    }

    async loadUsers() {
        try {
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val() || {};

            const tbody = document.querySelector('.users-table tbody');
            tbody.innerHTML = '';

            // Array'i object'e çevir
            const usersObject = Array.isArray(users) ? 
                users.reduce((obj, user, index) => {
                    if (user) obj[`user_${index}`] = user;
                    return obj;
                }, {}) : users;

            for (const userId in usersObject) {
                const user = usersObject[userId];
                if (!user) continue; // null kullanıcıları atla

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <input type="text" class="table-input" value="${user.username || ''}" data-field="username">
                    </td>
                    <td>
                        <input type="password" class="table-input" value="${user.password || ''}" data-field="password">
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
                programRow.style.display = 'none';
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
                                <input type="text" class="program-title-input" placeholder="Program Adı">
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
            alert('Kullanıcılar yüklenirken hata oluştu: ' + error.message);
        }
    }

    // ... (diğer metodlar aynı kalacak)

    async saveUser(userId, button) {
        try {
            const tr = button.closest('tr');
            const inputs = tr.querySelectorAll('.table-input');
            const userData = {};

            inputs.forEach(input => {
                userData[input.dataset.field] = input.value;
            });

            // Yeni kullanıcı ise
            if (userId.startsWith('new-')) {
                const usersRef = ref(db, 'users');
                const snapshot = await get(usersRef);
                const users = snapshot.val() || {};
                
                // Yeni ID oluştur
                const newUserId = `user_${Object.keys(users).length}`;
                await set(ref(db, `users/${newUserId}`), userData);
            } else {
                await set(ref(db, `users/${userId}`), userData);
            }

            alert('Kullanıcı başarıyla kaydedildi');
            await this.loadUsers(); // Tabloyu yenile
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Kullanıcı kaydedilirken hata oluştu: ' + error.message);
        }
    }
}

// Global olarak adminPanel nesnesini oluştur
window.adminPanel = new AdminPanel();
