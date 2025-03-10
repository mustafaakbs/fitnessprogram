import { db, auth } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

async function loadUsers() {
    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) {
            console.log('Kullanıcı bulunamadı');
            return;
        }

        // Kullanıcıları listele
        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        Object.values(users).forEach(user => {
            if (!user) return; // null kontrolü

            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <h3>${user.name}</h3>
                <p>Kullanıcı adı: ${user.username}</p>
                <p>Rol: ${user.role}</p>
            `;
            userList.appendChild(userDiv);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Kullanıcılar yüklenirken hata oluştu: ' + error.message);
    }
}

// Sayfa yüklendiğinde kullanıcıları yükle
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser?.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    loadUsers();
});
