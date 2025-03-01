import { db } from './firebase-config.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

async function initializeDatabase() {
    try {
        // Kullanıcıları ekle
        await set(ref(db, 'users'), [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                name: 'Admin',
                role: 'admin'
            }
        ]);

        // Programları ekle
        await set(ref(db, 'programs'), {
            pazartesi: {
                title: "Göğüs + Ön Kol",
                exercises: [
                    {
                        name: "Bench Press",
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        weight: 60,
                        videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg"
                    }
                ]
            }
        });

        console.log('Veritabanı başarıyla oluşturuldu!');
    } catch (error) {
        console.error('Veritabanı oluşturulurken hata:', error);
    }
}

// Veritabanını başlat
initializeDatabase();
