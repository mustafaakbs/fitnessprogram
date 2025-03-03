import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const snapshot = await get(ref(db, 'users'));
        const users = snapshot.val();

        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        } else {
            alert('Kullanıcı adı veya şifre hatalı!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Giriş yapılırken bir hata oluştu!');
    }
});
