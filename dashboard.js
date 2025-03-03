import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        // Temel ayarlar
        this.currentUser = null;
        this.editMode = false;
        this.currentDay = 'pazartesi';
        this.currentVideo = null;
        
        // Kullanıcı kontrolü
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        // Kullanıcı bilgilerini ayarla
        this.currentUser = JSON.parse(userJson);

        // Arayüzü başlat
        this.initializeInterface();
        
        // Tarih ve kullanıcı bilgisini güncelle
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
        document.getElementById('currentDateTime').textContent = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`;
        document.getElementById('currentUser').textContent = 
            `Current User's Login: ${this.currentUser.username}`;
    }

    // ... (gönderdiğiniz tüm diğer metodlar aynen kalacak, sadece veritabanı işlemleri Firebase'e uyarlanacak)

    async getProgramByDay(day) {
        try {
            const snapshot = await get(ref(db, `programs/${day}`));
            return snapshot.val();
        } catch (error) {
            console.error('Error getting program:', error);
            return null;
        }
    }

    async updateProgram(day, exerciseName, updatedExercise) {
        try {
            const snapshot = await get(ref(db, `programs/${day}`));
            const program = snapshot.val();
            const exerciseIndex = program.exercises.findIndex(e => e.name === exerciseName);
            
            if (exerciseIndex !== -1) {
                program.exercises[exerciseIndex] = updatedExercise;
                await update(ref(db), {
                    [`programs/${day}`]: program
                });
                return true;
            }
        } catch (error) {
            console.error('Error updating program:', error);
        }
        return false;
    }

    async deleteExercise(day, exerciseName) {
        try {
            const snapshot = await get(ref(db, `programs/${day}`));
            const program = snapshot.val();
            const exerciseIndex = program.exercises.findIndex(e => e.name === exerciseName);
            
            if (exerciseIndex !== -1) {
                program.exercises.splice(exerciseIndex, 1);
                await update(ref(db), {
                    [`programs/${day}`]: program
                });
                return true;
            }
        } catch (error) {
            console.error('Error deleting exercise:', error);
        }
        return false;
    }
}

// Dashboard'ı başlat
window.onload = () => {
    window.dashboard = new Dashboard();
};

// Escape tuşu ile videoyu kapatma
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.dashboard.currentVideo) {
        window.dashboard.closeVideo();
    }
});
