import { db } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        console.log('Giriş denemesi:', username); // Debug için log
        
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) {
            throw new Error('Kullanıcı bulunamadı!');
        }

        // Kullanıcı kontrolü - array veya object olabilir
        const userArray = Array.isArray(users) ? users : Object.values(users);
        
        const user = userArray.find(u => 
            u && u.username === username && u.password === password
        );

        console.log('Bulunan kullanıcı:', user); // Debug için log

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
            
            // Yönlendirme
            if (user.role === 'admin' || user.username === 'mustafaakbs') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert('Kullanıcı adı veya şifre hatalı!');
        }
    } catch (error) {
        console.error('Login error:', error); // Hata detayını console'a yaz
        alert('Giriş yapılırken bir hata oluştu: ' + error.message);
    }
});
