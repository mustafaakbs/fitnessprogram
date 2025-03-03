import { db } from './firebase-config.js';
import { ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.checkAdminAccess();
        this.initializeInterface();
        this.loadUsers(); // Sayfa yüklendiğinde kullanıcıları yükle
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
                        <button onclick="window.adminPanel.editUserPassword(${user.id})" class="edit-btn">Şifre Değiştir</button>
                        <button onclick="window.adminPanel.editUserProgram(${user.id})" class="edit-btn">Program Düzenle</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async editUserPassword(userId) {
        const newPassword = prompt("Yeni şifreyi girin:");
        if (!newPassword) return;

        try {
            await update(ref(db, `users/${userId}`), {
                password: newPassword
            });
            alert('Şifre başarıyla güncellendi');
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Şifre güncellenirken hata oluştu');
        }
    }

    async editUserProgram(userId) {
        try {
            const programSnapshot = await get(ref(db, `userPrograms/${userId}`));
            const userPrograms = programSnapshot.val();
            
            const day = prompt("Hangi gün için düzenleme yapacaksınız? (pazartesi, sali, carsamba, persembe, cuma, cumartesi, pazar)");
            if (!day || !userPrograms[day]) return;

            const exercise = {
                name: prompt("Egzersiz adı:"),
                sets: []
            };

            const setCount = parseInt(prompt("Kaç set eklemek istiyorsunuz?"));
            for(let i = 1; i <= setCount; i++) {
                const reps = parseInt(prompt(`${i}. set için tekrar sayısı:`));
                exercise.sets.push({
                    number: i,
                    reps: reps
                });
            }

            exercise.videoUrl = prompt("Egzersiz video URL'si:");

            // Mevcut egzersizleri al ve yenisini ekle
            const currentExercises = userPrograms[day].exercises || [];
            currentExercises.push(exercise);

            // Güncelle
            await update(ref(db, `userPrograms/${userId}/${day}`), {
                exercises: currentExercises
            });

            alert('Program başarıyla güncellendi');
        } catch (error) {
            console.error('Error updating program:', error);
            alert('Program güncellenirken hata oluştu');
        }
    }

    initializeInterface() {
        // Çıkış butonu için event listener
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }
}

// Global erişim için
window.adminPanel = new AdminPanel();
