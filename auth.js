import { db } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Auth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        }
    }

    async login(username, password) {
        try {
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val();

            // Kullanıcıları array'den object'e çevir
            const userArray = Array.isArray(users) ? users : Object.values(users);
            
            // Kullanıcı kontrolü
            const user = userArray.find(u => 
                u && u.username === username && u.password === password
            );

            if (user) {
                // Session'a kaydet
                const userData = {
                    username: user.username,
                    name: user.name,
                    role: user.role
                };
                
                // Aktif kullanıcıya ekle
                await set(ref(db, `activeUsers/${user.username}`), {
                    ...userData,
                    lastLogin: new Date().toISOString()
                });

                // Session'a kaydet
                sessionStorage.setItem('currentUser', JSON.stringify(userData));
                this.currentUser = userData;

                return {
                    success: true,
                    isAdmin: user.role === 'admin'
                };
            }
            
            throw new Error('Kullanıcı adı veya şifre hatalı!');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        if (this.currentUser) {
            try {
                // Aktif kullanıcıdan çıkar
                await set(ref(db, `activeUsers/${this.currentUser.username}`), null);
                
                // Session'ı temizle
                sessionStorage.removeItem('currentUser');
                this.currentUser = null;
                
                return true;
            } catch (error) {
                console.error('Logout error:', error);
                throw error;
            }
        }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Auth instance'ını oluştur
const auth = new Auth();

// Login form handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const result = await auth.login(username, password);
        if (result.success) {
            window.location.href = result.isAdmin ? 'admin.html' : 'dashboard.html';
        }
    } catch (error) {
        alert(error.message);
    }
});

// Logout button handler
document.getElementById('logoutButton')?.addEventListener('click', async () => {
    try {
        await auth.logout();
        window.location.href = 'index.html';
    } catch (error) {
        alert('Çıkış yapılırken bir hata oluştu: ' + error.message);
    }
});

export default auth;
