class Database {
    constructor() {
        console.log('Database başlatılıyor...');
        this.initializeDatabase();
    }

    initializeDatabase() {
        if (!localStorage.getItem('initialized')) {
            console.log('İlk kurulum yapılıyor...');
            
            // Varsayılan kullanıcılar
            const defaultUsers = [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin123',
                    name: 'Admin',
                    role: 'admin'
                },
                {
                    id: 2,
                    username: 'user1',
                    password: 'user123',
                    name: 'Ali Yılmaz',
                    role: 'user'
                },
                {
                    id: 3,
                    username: 'user2',
                    password: 'user123',
                    name: 'Mehmet Demir',
                    role: 'user'
                },
                {
                    id: 4,
                    username: 'user3',
                    password: 'user123',
                    name: 'Ayşe Kaya',
                    role: 'user'
                },
                {
                    id: 5,
                    username: 'user4',
                    password: 'user123',
                    name: 'Fatma Çelik',
                    role: 'user'
                },
                {
                    id: 6,
                    username: 'user5',
                    password: 'user123',
                    name: 'Ahmet Öztürk',
                    role: 'user'
                }
            ];

            localStorage.setItem('users', JSON.stringify(defaultUsers));
            localStorage.setItem('initialized', 'true');

            // Varsayılan programları ayarla
            const defaultPrograms = {
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
                        }
                    ]
                }
            };

            localStorage.setItem('programs', JSON.stringify(defaultPrograms));
        }
    }

    getUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    }

    getProgramByDay(day) {
        const programs = JSON.parse(localStorage.getItem('programs'));
        return programs ? programs[day] : null;
    }

    updateProgram(day, exerciseName, updatedExercise) {
        const programs = JSON.parse(localStorage.getItem('programs'));
        const program = programs[day];
        const exerciseIndex = program.exercises.findIndex(e => e.name === exerciseName);
        
        if (exerciseIndex !== -1) {
            program.exercises[exerciseIndex] = updatedExercise;
            localStorage.setItem('programs', JSON.stringify(programs));
        }
    }
} 