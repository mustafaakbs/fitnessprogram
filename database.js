import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Database {
    constructor() {
        this.initializeDatabase();
    }

    async initializeDatabase() {
        // Veritabanı bağlantısını kontrol et
        try {
            const snapshot = await get(ref(db, 'initialized'));
            if (!snapshot.exists()) {
                await set(ref(db, 'initialized'), true);
            }
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    async getUsers() {
        try {
            const snapshot = await get(ref(db, 'users'));
            return snapshot.val() || [];
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    async getProgramByDay(day) {
        try {
            const snapshot = await get(ref(db, `programs/${day}`));
            return snapshot.val();
        } catch (error) {
            console.error(`Error getting program for ${day}:`, error);
            return null;
        }
    }

    async updateProgram(day, program) {
        try {
            await update(ref(db, `programs/${day}`), program);
            return true;
        } catch (error) {
            console.error('Error updating program:', error);
            return false;
        }
    }
}

export default Database;
