import { db } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.currentDay = 'pazartesi';
        this.initialize();
    }

    async initialize() {
        await this.checkAdminAccess();
        this.initializeInterface();
        await this.loadUsers(); // Kullanıcıları yükle
    }

    async checkAdminAccess() {
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
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) {
            currentUserElement.textContent = `Kullanıcı: ${user.username}`;
        }
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
        const dateElement = document.getElementById('currentDateTime');
        if (dateElement) {
            dateElement.textContent = formattedDate;
        }
    }

    initializeInterface() {
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.addNewUser());
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    async loadUsers() {
        try {
            console.log('Loading users...'); // Debug log
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            
            if (!snapshot.exists()) {
                console.log('No users found'); // Debug log
                return;
            }

            const users = snapshot.val();
            console.log('Users data:', users); // Debug log

            const tbody = document.getElementById('usersTableBody');
            if (!tbody) {
                console.error('Users table body not found');
                return;
            }

            // Tabloyu temizle
            tbody.innerHTML = '';

            // Her kullanıcı için satır oluştur
            Object.entries(users).forEach(([userId, user]) => {
                console.log('Creating row for user:', userId, user); // Debug log
                
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

    // ... (diğer metodlar aynı kalacak) ...
}

// Global erişim için
window.adminPanel = new AdminPanel();
