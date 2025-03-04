import { db } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDay = null;
        this.init();
    }

    init() {
        // Session'dan kullanıcı bilgisini al
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = JSON.parse(userJson);
        
        // Kullanıcı rolünü kontrol et
        if (this.currentUser.role === 'admin') {
            window.location.href = 'admin.html';
            return;
        }

        // Bugünün gününü al
        const days = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
        this.currentDay = days[new Date().getDay()];

        // Event listener'ları ekle
        this.addEventListeners();
        
        // Programı yükle
        this.loadUserProgram();
        
        // Kullanıcı bilgilerini göster
        this.displayUserInfo();
    }

    displayUserInfo() {
        const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0];
        document.getElementById('currentDateTime').textContent = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${currentDateTime}\n`;
        document.getElementById('currentUser').textContent = 
            `Current User's Login: ${this.currentUser.username}\n`;
    }

    addEventListeners() {
        // Gün seçici için event listener
        const daySelect = document.getElementById('daySelect');
        if (daySelect) {
            daySelect.value = this.currentDay;
            daySelect.addEventListener('change', (e) => {
                this.currentDay = e.target.value;
                this.loadUserProgram();
            });
        }

        // Çıkış butonu için event listener
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }

    async loadUserProgram() {
        try {
            // users array'inden kullanıcının index'ini bul
            const usersRef = ref(db, 'users');
            const usersSnapshot = await get(usersRef);
            const users = usersSnapshot.val();
            
            let userIndex = null;
            for (let i = 0; i < users.length; i++) {
                if (users[i] && users[i].username === this.currentUser.username) {
                    userIndex = i;
                    break;
                }
            }

            if (userIndex === null) {
                console.error('Kullanıcı bulunamadı');
                return;
            }

            // Kullanıcının programını yükle
            const programRef = ref(db, `userPrograms/${userIndex}/${this.currentDay}`);
            const programSnapshot = await get(programRef);
            const program = programSnapshot.val();

            this.displayProgram(program);
        } catch (error) {
            console.error('Program yüklenirken hata:', error);
        }
    }

    displayProgram(program) {
        const programContainer = document.getElementById('programContainer');
        if (!programContainer) return;

        if (!program) {
            programContainer.innerHTML = '<p class="no-program">Bu gün için program bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <div class="program-header">
                <h2>${program.title || 'Program'}</h2>
            </div>
        `;

        if (program.exercises && program.exercises.length > 0) {
            html += '<div class="exercises-container">';
            program.exercises.forEach(exercise => {
                html += `
                    <div class="exercise-card">
                        <h3 class="exercise-name">${exercise.name}</h3>
                        <div class="sets-container">
                            ${exercise.sets.map(set => `
                                <div class="set-item">
                                    <span>Set ${set.number}:</span>
                                    <span>${set.reps} tekrar</span>
                                    ${exercise.weight ? `<span>${exercise.weight} kg</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        ${exercise.videoUrl ? `
                            <div class="video-container">
                                <a href="${exercise.videoUrl}" target="_blank" class="video-link">
                                    Egzersiz Videosu
                                </a>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }

        programContainer.innerHTML = html;
    }
}

// Dashboard nesnesini oluştur
const dashboard = new Dashboard();

// Sayfa yüklendiğinde otomatik güncelleme için
setInterval(() => {
    dashboard.displayUserInfo();
}, 1000);
