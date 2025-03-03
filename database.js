import { db } from './firebase-config.js';
import { ref, get, set, update, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Database {
    constructor() {
        this.initializeDatabase();
        this.currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    }

    async initializeDatabase() {
        try {
            const snapshot = await get(ref(db, 'initialized'));
            if (!snapshot.exists()) {
                await set(ref(db, 'initialized'), true);
            }
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    async logChange(action, details) {
        try {
            const now = new Date();
            const logEntry = {
                timestamp: now.toISOString(),
                formattedDate: now.toLocaleString('tr-TR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                user: this.currentUser?.username || 'unknown',
                action: action,
                details: details
            };

            await push(ref(db, 'changes'), logEntry);
        } catch (error) {
            console.error('Error logging change:', error);
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
            await this.logChange('program_update', {
                day: day,
                programDetails: program.title
            });
            return true;
        } catch (error) {
            console.error('Error updating program:', error);
            return false;
        }
    }

    async getRecentChanges(limit = 10) {
        try {
            const snapshot = await get(ref(db, 'changes'));
            return snapshot.val() || {};
        } catch (error) {
            console.error('Error getting changes:', error);
            return {};
        }
    }
}

export default Database;
