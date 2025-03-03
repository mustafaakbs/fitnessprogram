import { db } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.stats = {
            completedWorkouts: 0,
            caloriesBurned: 0,
            activeDays: 0,
            achievementScore: 0
        };
        this.progressData = {
            labels: [],
            datasets: []
        };
        
        this.initialize();
    }

    async initialize() {
        // Kullanıcı kontrolü
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        // Kullanıcı bilgilerini ayarla
        this.currentUser = JSON.parse(userJson);
        
        // Arayüz elemanlarını başlat
        this.initializeUI();
        
        // İstatistikleri yükle
        await this.loadStats();
        
        // Günlük antrenmanı yükle
        await this.loadTodayWorkout();
        
        // Grafiği başlat
        this.initializeChart();
        
        // Event listener'ları ekle
        this.setupEventListeners();
    }

    initializeUI() {
        // Kullanıcı adını göster
        document.getElementById('userName').textContent = this.currentUser.name;
        
        // Hoş geldin mesajını güncelle
        document.getElementById('welcomeMessage').textContent = 
            `Hoş Geldin, ${this.currentUser.name}!`;
        
        // Günlük ilerleme çubuğunu güncelle
        this.updateDailyProgress();
    }

    async loadStats() {
        try {
            const statsRef = ref(db, `users/${this.currentUser.username}/stats`);
            const snapshot = await get(statsRef);
            const stats = snapshot.val() || this.stats;
            
            // İstatistikleri göster
            document.getElementById('completedWorkouts').textContent = stats.completedWorkouts;
            document.getElementById('caloriesBurned').textContent = stats.caloriesBurned;
            document.getElementById('activeDays').textContent = stats.activeDays;
            document.getElementById('achievementScore').textContent = stats.achievementScore;
        } catch (error) {
            console.error('Stats loading error:', error);
        }
    }

    async loadTodayWorkout() {
        try {
            const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long' }).toLowerCase();
            const workoutRef = ref(db, `programs/${today}`);
            const snapshot = await get(workoutRef);
            const workout = snapshot.val();

            const workoutList = document.getElementById('workoutList');
            if (workout && workout.exercises) {
                workoutList.innerHTML = workout.exercises.map(exercise => this.createExerciseCard(exercise)).join('');
            } else {
                workoutList.innerHTML = `
                    <div class="col-12">
                        <div class="card bg-surface text-light">
                            <div class="card-body text-center">
                                <h5 class="card-title">Bugün için planlanmış antrenman yok</h5>
                            </div>
                        </div>
                    </div>`;
            }
        } catch (error) {
            console.error('Today workout loading error:', error);
        }
    }

    createExerciseCard(exercise) {
        return `
            <div class="col-md-4">
                <div class="card bg-surface text-light h-100">
                    <div class="card-body">
                        <h5 class="card-title">${exercise.name}</h5>
                        <div class="exercise-details">
                            <p class="mb-2">
                                <i class="fas fa-dumbbell"></i> ${exercise.weight} kg
                            </p>
                            <div class="sets-list">
                                ${exercise.sets.map(set => `
                                    <div class="set-item">
                                        Set ${set.number}: ${set.reps} tekrar
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="card-footer text-center">
                        <a href="${exercise.videoUrl}" target="_blank" class="btn btn-primary btn-sm">
                            <i class="fab fa-youtube"></i> Video
                        </a>
                    </div>
                </div>
            </div>`;
    }

    initializeChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
                datasets: [{
                    label: 'Haftalık İlerleme',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }

    updateDailyProgress() {
        const now = new Date();
        const progress = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
        const progressBar = document.getElementById('dailyProgress');
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }

    setupEventListeners() {
        // Çıkış butonu
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        // Her dakika ilerleme çubuğunu güncelle
        setInterval(() => this.updateDailyProgress(), 60000);
    }

    // YouTube video ID çıkarma yardımcı fonksiyonu
    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
}

// Dashboard'ı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
