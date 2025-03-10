import { db } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

        // Kullanıcı kontrolü - array yerine object yapısına göre güncellendi
        const user = Object.values(users).find(u => 
            u.username === username && u.password === password
        );

        if (user) {
            // Aktif kullanıcıya ekle
            await set(ref(db, `activeUsers/${username}`), {
                username: username,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                role: user.role
            });

            // Session'a kaydet (hassas bilgiler hariç)
            const safeUser = {
                username: user.username,
                name: user.name,
                role: user.role
            };
            sessionStorage.setItem('currentUser', JSON.stringify(safeUser));
            
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

// Aktivite güncelleme fonksiyonu
function updateActivity() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser && currentUser.username) {
        const lastActivity = new Date().toISOString();
        set(ref(db, `activeUsers/${currentUser.username}/lastActivity`), lastActivity)
            .catch(error => console.error('Error updating activity:', error));
    }
}

// Periyodik aktivite güncellemesi
setInterval(updateActivity, 5 * 60 * 1000); // Her 5 dakikada bir
updateActivity(); // Sayfa yüklendiğinde ilk güncelleme

// Çıkış yapma fonksiyonu
window.logout = async function() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUser && currentUser.username) {
            // Aktif kullanıcılardan çıkar
            await set(ref(db, `activeUsers/${currentUser.username}`), null);
        }
        
        // Session'ı temizle
        sessionStorage.removeItem('currentUser');
        
        // Login sayfasına yönlendir
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Çıkış yapılırken bir hata oluştu: ' + error.message);
    }
};

// Çıkış butonu için event listener
document.getElementById('logoutButton')?.addEventListener('click', logout);
