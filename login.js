import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Users verisini al
        const snapshot = await get(ref(db, 'users'));
        const users = snapshot.val();

        // Kullanıcıyı bul
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            // Giriş başarılı
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Giriş yapılırken bir hata oluştu!');
    }
});
