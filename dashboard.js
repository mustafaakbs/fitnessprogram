import { db } from './firebase-config.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.initializeDashboard();
        this.setupEventListeners();
    }

    async initializeDashboard() {
        try {
            // Programları yükle
            const snapshot = await get(ref(db, 'programs'));
            const programs = snapshot.val();
            this.renderPrograms(programs);
            
            // Kullanıcı bilgilerini kontrol et
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            if (!currentUser) {
                window.location.href = 'index.html';
                return;
            }
            
            // Admin kontrolü
            if (currentUser.role === 'admin') {
                document.body.classList.add('admin-view');
            }
        } catch (error) {
            console.error('Dashboard initialization error:', error);
        }
    }

    async updateExercise(day, exerciseIndex, updatedExercise) {
        try {
            const updates = {};
            updates[`programs/${day}/exercises/${exerciseIndex}`] = updatedExercise;
            await update(ref(db), updates);
            this.initializeDashboard(); // Yeniden yükle
        } catch (error) {
            console.error('Exercise update error:', error);
        }
    }

    setupEventListeners() {
        // Event listener'ları ekle
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Diğer event listener'lar...
    }

    renderPrograms(programs) {
        // Program render logic...
        // Bu kısmı mevcut kodunuza göre düzenleyin
    }
}

// Dashboard'ı başlat
new Dashboard();
