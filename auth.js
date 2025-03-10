import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) {
            throw new Error('Kullanıcı bulunamadı!');
        }

        // Kullanıcı kontrolü
        const user = Object.values(users).find(u => 
            u.username === username && u.password === password
        );

        if (user) {
            // Kullanıcı bilgilerini sessionStorage'a kaydet
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // Admin kontrolü ve yönlendirme
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert('Kullanıcı adı veya şifre hatalı!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Giriş yapılırken bir hata oluştu: ' + error.message);
    }
});
