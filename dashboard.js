import { db } from './firebase-config.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDay = 'pazartesi';
        this.editMode = false;
        
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
    }

    initializeInterface() {
        // Günleri oluştur
        this.createDayButtons();
        
        // Event listener'ları ekle
        this.setupEventListeners();
        
        // İlk programı göster
        this.loadPrograms();

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

    createDayButtons() {
        const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
        const container = document.querySelector('.days-container');
        
        if (!container) return;
        
        container.innerHTML = ''; // Container'ı temizle
        
        days.forEach(day => {
            const btn = document.createElement('button');
            btn.className = `day-btn ${day === this.currentDay ? 'active' : ''}`;
            btn.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            btn.dataset.day = day;
            btn.onclick = () => this.changeDay(day);
            container.appendChild(btn);
        });
    }

    setupEventListeners() {
        // Çıkış butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        // Düzenleme modu butonu
        const editModeBtn = document.getElementById('editModeBtn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                this.showPasswordModal();
            });
        }

        // Şifre modalı için event listeners
        document.getElementById('confirmPassword')?.addEventListener('click', () => {
            this.checkAdminPassword();
        });

        document.getElementById('cancelPassword')?.addEventListener('click', () => {
            document.getElementById('passwordModal').style.display = 'none';
        });

        // Form submit olayını dinle
        document.getElementById('exerciseForm')?.addEventListener('submit', (e) => {
            this.saveExercise(e);
        });
    }

    showPasswordModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'block';
            const adminPassword = document.getElementById('adminPassword');
            if (adminPassword) {
                adminPassword.value = '';
                adminPassword.focus();
            }
        }
    }

    async checkAdminPassword() {
        const password = document.getElementById('adminPassword').value;
        try {
            const snapshot = await get(ref(db, 'users'));
            const users = snapshot.val();
            const adminUser = users.find(u => u.role === 'admin');
            
            if (password === adminUser.password) {
                this.editMode = !this.editMode;
                document.getElementById('passwordModal').style.display = 'none';
                document.getElementById('editModeBtn').classList.toggle('active', this.editMode);
                this.loadPrograms(); // Programları yeniden yükle
            } else {
                alert('Yanlış şifre!');
            }
        } catch (error) {
            console.error('Error checking admin password:', error);
            alert('Bir hata oluştu!');
        }
    }

    async saveExercise(event) {
        event.preventDefault();
        
        const form = event.target;
        const exerciseName = form.querySelector('#exerciseName').value;
        const weight = parseInt(form.querySelector('#exerciseWeight').value);
        const videoUrl = form.querySelector('#exerciseVideo').value;
        
        // Setleri topla
        const setsList = document.getElementById('setsList');
        const sets = Array.from(setsList.children).map((setRow, index) => ({
            number: index + 1,
            reps: parseInt(setRow.querySelector('.set-reps').value)
        }));

        const exercise = { name: exerciseName, sets, weight, videoUrl };

        try {
            await this.updateExercise(exercise);
            document.getElementById('exerciseModal').style.display = 'none';
            this.loadPrograms();
        } catch (error) {
            console.error('Error saving exercise:', error);
            alert('Egzersiz kaydedilirken bir hata oluştu!');
        }
    }

    async updateExercise(exercise) {
        try {
            const snapshot = await get(ref(db, `programs/${this.currentDay}`));
            const program = snapshot.val() || { title: '', exercises: [] };
            
            const existingIndex = program.exercises.findIndex(e => e.name === exercise.name);
            
            if (existingIndex !== -1) {
                program.exercises[existingIndex] = exercise;
            } else {
                program.exercises.push(exercise);
            }

            await update(ref(db), {
                [`programs/${this.currentDay}`]: program
            });

            return true;
        } catch (error) {
            console.error('Error updating exercise:', error);
            return false;
        }
    }

    async deleteExercise(exerciseName) {
        if (!confirm('Bu egzersizi silmek istediğinizden emin misiniz?')) return;

        try {
            const snapshot = await get(ref(db, `programs/${this.currentDay}`));
            const program = snapshot.val();
            
            if (program && program.exercises) {
                program.exercises = program.exercises.filter(e => e.name !== exerciseName);
                
                await update(ref(db), {
                    [`programs/${this.currentDay}`]: program
                });
                
                this.loadPrograms();
            }
        } catch (error) {
            console.error('Error deleting exercise:', error);
            alert('Egzersiz silinirken bir hata oluştu!');
        }
    }

    addNewExercise() {
        const modal = document.getElementById('exerciseModal');
        if (!modal) return;

        // Form alanlarını temizle
        document.getElementById('exerciseName').value = '';
        document.getElementById('exerciseWeight').value = '';
        document.getElementById('exerciseVideo').value = '';

        // Başlangıç setlerini oluştur
        const setsList = document.getElementById('setsList');
        if (setsList) {
            setsList.innerHTML = `
                <div class="set-row" data-set="1">
                    <input type="number" value="1" class="set-number" readonly>
                    <input type="number" placeholder="Tekrar" class="set-reps" required>
                    <button type="button" class="delete-set-btn" onclick="dashboard.removeSet(1)">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    editExercise(exerciseName) {
        if (!this.editMode) return;

        const modal = document.getElementById('exerciseModal');
        if (!modal) return;

        get(ref(db, `programs/${this.currentDay}`))
            .then(snapshot => {
                const program = snapshot.val();
                const exercise = program.exercises.find(e => e.name === exerciseName);
                
                if (exercise) {
                    document.getElementById('exerciseName').value = exercise.name;
                    document.getElementById('exerciseWeight').value = exercise.weight;
                    document.getElementById('exerciseVideo').value = exercise.videoUrl;

                    const setsList = document.getElementById('setsList');
                    if (setsList) {
                        setsList.innerHTML = exercise.sets.map((set, index) => `
                            <div class="set-row" data-set="${index + 1}">
                                <input type="number" value="${index + 1}" class="set-number" readonly>
                                <input type="number" value="${set.reps}" placeholder="Tekrar" class="set-reps" required>
                                <button type="button" class="delete-set-btn" onclick="dashboard.removeSet(${index + 1})">
                                    <i class="fas fa-minus"></i>
                                </button>
                            </div>
                        `).join('');
                    }

                    modal.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error loading exercise for edit:', error);
                alert('Egzersiz yüklenirken bir hata oluştu!');
            });
    }

    addSet() {
        const setsList = document.getElementById('setsList');
        if (!setsList) return;

        const setCount = setsList.children.length + 1;
        
        const newSetDiv = document.createElement('div');
        newSetDiv.className = 'set-row';
        newSetDiv.dataset.set = setCount;
        newSetDiv.innerHTML = `
            <input type="number" value="${setCount}" class="set-number" readonly>
            <input type="number" placeholder="Tekrar" class="set-reps" required>
            <button type="button" class="delete-set-btn" onclick="dashboard.removeSet(${setCount})">
                <i class="fas fa-minus"></i>
            </button>
        `;
        
        setsList.appendChild(newSetDiv);
    }

    removeSet(setNumber) {
        const setsList = document.getElementById('setsList');
        if (!setsList || setsList.children.length <= 1) return;

        setsList.querySelector(`[data-set="${setNumber}"]`)?.remove();
        
        // Set numaralarını güncelle
        Array.from(setsList.children).forEach((set, index) => {
            const newSetNumber = index + 1;
            set.dataset.set = newSetNumber;
            set.querySelector('.set-number').value = newSetNumber;
            set.querySelector('.delete-set-btn').setAttribute(
                'onclick',
                `dashboard.removeSet(${newSetNumber})`
            );
        });
    }

    async updateWeight(exerciseName, newWeight) {
        if (!this.editMode) return;

        try {
            const snapshot = await get(ref(db, `programs/${this.currentDay}`));
            const program = snapshot.val();
            const exercise = program.exercises.find(e => e.name === exerciseName);
            
            if (exercise) {
                exercise.weight = parseInt(newWeight) || 0;
                await update(ref(db), {
                    [`programs/${this.currentDay}`]: program
                });
                this.loadPrograms();
            }
        } catch (error) {
            console.error('Error updating weight:', error);
            alert('Ağırlık güncellenirken bir hata oluştu!');
        }
    }

    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
}

// Dashboard'ı başlat
window.onload = () => {
    window.dashboard = new Dashboard();
};
