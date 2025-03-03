import { db } from './firebase-config.js';
import { ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
    }

    initializeInterface() {
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        this.loadUsers();
        this.setupSidebarNavigation();
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
        document.getElementById('currentAdmin').textContent = `Admin: ${this.currentAdmin.name}`;
    }

    setupEventListeners() {
        // Çıkış butonu
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Kullanıcı ekleme butonu
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showUserModal();
        });

        // Kullanıcı arama
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Kullanıcı form submit
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // Modal kapatma
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });
    }

    setupSidebarNavigation() {
        const sidebarBtns = document.querySelectorAll('.sidebar-btn');
        sidebarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Aktif buton ve section'ı güncelle
                sidebarBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Section'ları güncelle
                document.querySelectorAll('.admin-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(`${btn.dataset.section}-section`).classList.add('active');

                // İlgili verileri yükle
                this.loadSectionData(btn.dataset.section);
            });
        });
    }

    async loadSectionData(section) {
        switch(section) {
            case 'users':
                await this.loadUsers();
                break;
            case 'programs':
                await this.loadPrograms();
                break;
            case 'exercises':
                await this.loadExercises();
                break;
        }
    }

    async loadUsers() {
        try {
            const snapshot = await get(ref(db, 'users'));
            const users = snapshot.val();

            const usersList = document.getElementById('usersList');
            if (!users || !usersList) return;

            usersList.innerHTML = Object.values(users).map(user => `
                <div class="list-item user-item">
                    <h3>${user.name}</h3>
                    <p>Kullanıcı Adı: ${user.username}</p>
                    <p>Rol: ${user.role}</p>
                    <div class="item-actions">
                        <button onclick="adminPanel.editUser(${user.id})" class="edit-btn">Düzenle</button>
                        <button onclick="adminPanel.deleteUser(${user.id})" class="delete-btn">Sil</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // Diğer metodlar (kullanıcı ekleme, düzenleme, silme vb.)
    showUserModal(userId = null)
