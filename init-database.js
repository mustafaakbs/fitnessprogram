import { db } from './firebase-config.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

async function initializeDatabase() {
    try {
        // Kullanıcıları ekle
        await set(ref(db, 'users'), [
            {
                id: 1,
                username: 'mustafaakbs',
                password: 'admin123',
                name: 'Mustafa Akbaş',
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
                    },
                    {
                        name: "Incline Bench Press",
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        weight: 50,
                        videoUrl: "https://www.youtube.com/watch?v=jPLdzuHckI8"
                    }
                ]
            },
            carsamba: {
                title: "Sırt + Arka Kol",
                exercises: [
                    {
                        name: "Lat Pulldown",
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        weight: 50,
                        videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc"
                    },
                    {
                        name: "Cable Row",
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        weight: 45,
                        videoUrl: "https://www.youtube.com/watch?v=GZbfZ033f74"
                    }
                ]
            },
            cuma: {
                title: "Bacak",
                exercises: [
                    {
                        name: "Squat",
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        weight: 80,
                        videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8"
                    },
                    {
                        name: "Leg Press",
                        sets: [
                            { number: 1, reps: 12 },
                            { number: 2, reps: 10 },
                            { number: 3, reps: 8 }
                        ],
                        weight: 100,
                        videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ"
                    }
                ]
            }
        });

        console.log('Veritabanı başarıyla güncellendi!');
    } catch (error) {
        console.error('Veritabanı güncellenirken hata:', error);
    }
}

// Veritabanını başlat
initializeDatabase();
