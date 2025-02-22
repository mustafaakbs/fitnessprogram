class Dashboard {
    constructor() {
        // Temel ayarlar
        this.db = new Database();
        this.currentUser = null;
        this.editMode = false;
        this.currentDay = 'pazartesi';
        this.currentVideo = null;
        
        // Kullanıcı kontrolü
        const userJson = localStorage.getItem('currentUser');
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
        // Kullanıcı adını göster
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name || 'Kullanıcı';
        }

        // Düzenleme modu butonu
        const editModeBtn = document.getElementById('editModeBtn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                this.showPasswordModal();
            });
        }

        // Çıkış butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        // Günleri oluştur
        this.createDayButtons();
        
        // İlk programı göster
        this.renderPrograms();

        // Şifre modalı için event listeners
        document.getElementById('confirmPassword').addEventListener('click', () => {
            this.checkAdminPassword();
        });

        document.getElementById('cancelPassword').addEventListener('click', () => {
            document.getElementById('passwordModal').style.display = 'none';
        });

        // Form submit olayını dinle
        document.getElementById('exerciseForm').addEventListener('submit', (e) => {
            this.saveExercise(e);
        });
    }

    showPasswordModal() {
        document.getElementById('passwordModal').style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }

    checkAdminPassword() {
        const password = document.getElementById('adminPassword').value;
        const adminUser = this.db.getUsers().find(u => u.role === 'admin');
        
        if (password === adminUser.password) {
            this.editMode = !this.editMode;
            document.getElementById('passwordModal').style.display = 'none';
            document.getElementById('editModeBtn').classList.toggle('active', this.editMode);
            this.renderPrograms(); // Programları yeniden render et
        } else {
            alert('Yanlış şifre!');
        }
    }

    createDayButtons() {
        const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
        const container = document.querySelector('.days-container');
        
        days.forEach(day => {
            const btn = document.createElement('button');
            btn.className = `day-btn ${day === this.currentDay ? 'active' : ''}`;
            btn.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            btn.onclick = () => this.changeDay(day);
            container.appendChild(btn);
        });
    }

    changeDay(day) {
        this.currentDay = day;
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === day);
        });
        this.renderPrograms();
    }

    renderPrograms() {
        const container = document.getElementById('programCards');
        const program = this.db.getProgramByDay(this.currentDay);

        if (!program) return;

        let html = `
            <div class="program-title">
                <h2>${program.title}</h2>
                ${this.editMode ? `
                    <button onclick="dashboard.addExercise()" class="add-btn">
                        <i class="fas fa-plus"></i> Yeni Egzersiz
                    </button>
                ` : ''}
            </div>
            <div class="exercises-container">
        `;

        program.exercises.forEach(exercise => {
            html += this.renderExercise(exercise);
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderExercise(exercise) {
        return `
            <div class="exercise-card">
                <h3>${exercise.name}</h3>
                <div class="exercise-info">
                    <div class="weight-selector">
                        <input type="number" 
                               value="${exercise.weight}" 
                               onchange="dashboard.updateWeight('${exercise.name}', this.value)"
                               min="0" 
                               step="1">
                        <span>KG</span>
                    </div>
                </div>
                <div class="sets-container">
                    ${exercise.sets.map(set => `
                        <div class="set-box">
                            <span>${set.number}. Set: ${set.reps} Tekrar</span>
                        </div>
                    `).join('')}
                </div>
                <div class="video-section">
                    <div class="video-container">
                        <iframe
                            src="https://www.youtube.com/embed/${this.getYoutubeVideoId(exercise.videoUrl)}?rel=0"
                            frameborder="0"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                </div>
                ${this.editMode ? `
                    <div class="exercise-controls">
                        <button onclick="dashboard.editExercise('${exercise.name}')" class="edit-btn">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button onclick="dashboard.deleteExercise('${exercise.name}')" class="delete-btn">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createSafeId(name) {
        return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    }

    addExercise() {
        const exercise = {
            name: prompt('Egzersiz adı:'),
            sets: [
                { number: 1, reps: 12 },
                { number: 2, reps: 10 },
                { number: 3, reps: 8 }
            ],
            weight: parseInt(prompt('Ağırlık (kg):')),
            videoUrl: prompt('Video URL (opsiyonel):')
        };

        if (exercise.name && exercise.weight) {
            this.db.addExercise(this.currentDay, exercise);
            this.renderPrograms();
        }
    }

    editExercise(exerciseName) {
        const program = this.db.getProgramByDay(this.currentDay);
        const exercise = program.exercises.find(e => e.name === exerciseName);
        
        if (exercise) {
            const modal = document.getElementById('exerciseModal');
            const form = document.getElementById('exerciseForm');
            
            // Form alanlarını doldur
            document.getElementById('exerciseName').value = exercise.name;
            document.getElementById('exerciseWeight').value = exercise.weight;
            document.getElementById('exerciseVideo').value = exercise.videoUrl || '';

            // Setleri göster
            const setsContainer = document.getElementById('setsContainer');
            setsContainer.innerHTML = `
                <label>Setler</label>
                <div id="setsList">
                    ${exercise.sets.map((set, index) => `
                        <div class="set-row" data-set="${index + 1}">
                            <input type="number" value="${set.number}" placeholder="Set No" class="set-number" readonly>
                            <input type="number" value="${set.reps}" placeholder="Tekrar" class="set-reps" required>
                            <button type="button" class="delete-btn" onclick="dashboard.removeSet(${index + 1})">
                                <i class="fas fa-minus"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="addSetBtn" onclick="dashboard.addSet()">
                    <i class="fas fa-plus"></i> Yeni Set Ekle
                </button>
            `;

            // Modalı göster
            modal.style.display = 'block';

            // Kapatma butonunu ayarla
            const closeBtn = modal.querySelector('.close');
            closeBtn.onclick = () => modal.style.display = 'none';
        }
    }

    saveExercise(event) {
        event.preventDefault();
        
        const name = document.getElementById('exerciseName').value;
        const weight = parseInt(document.getElementById('exerciseWeight').value);
        const videoUrl = document.getElementById('exerciseVideo').value;
        
        // Setleri topla
        const setsList = document.getElementById('setsList');
        const sets = Array.from(setsList.children).map((setRow, index) => ({
            number: index + 1,
            reps: parseInt(setRow.querySelector('.set-reps').value)
        }));

        const exercise = {
            name,
            weight,
            videoUrl,
            sets
        };

        // Programı güncelle
        const programs = this.db.getAllPrograms();
        const dayProgram = programs[this.currentDay];
        const exerciseIndex = dayProgram.exercises.findIndex(e => e.name === name);
        
        if (exerciseIndex !== -1) {
            dayProgram.exercises[exerciseIndex] = exercise;
        } else {
            dayProgram.exercises.push(exercise);
        }

        // Değişiklikleri kaydet
        localStorage.setItem('programs', JSON.stringify(programs));
        
        // Modalı kapat ve programları yeniden render et
        document.getElementById('exerciseModal').style.display = 'none';
        this.renderPrograms();
    }

    addSet() {
        const setsList = document.getElementById('setsList');
        const setCount = setsList.children.length + 1;
        
        const newSetDiv = document.createElement('div');
        newSetDiv.className = 'set-row';
        newSetDiv.dataset.set = setCount;
        newSetDiv.innerHTML = `
            <input type="number" value="${setCount}" placeholder="Set No" class="set-number" readonly>
            <input type="number" placeholder="Tekrar" class="set-reps" required>
            <button type="button" class="delete-btn" onclick="dashboard.removeSet(${setCount})">
                <i class="fas fa-minus"></i>
            </button>
        `;
        
        setsList.appendChild(newSetDiv);
    }

    removeSet(setNumber) {
        const setsList = document.getElementById('setsList');
        if (setsList.children.length > 1) {
            setsList.querySelector(`[data-set="${setNumber}"]`).remove();
            
            // Set numaralarını güncelle
            Array.from(setsList.children).forEach((set, index) => {
                const newSetNumber = index + 1;
                set.dataset.set = newSetNumber;
                set.querySelector('.set-number').value = newSetNumber;
                set.querySelector('.delete-btn').setAttribute(
                    'onclick',
                    `dashboard.removeSet(${newSetNumber})`
                );
            });
        }
    }

    deleteExercise(exerciseName) {
        if (confirm('Bu egzersizi silmek istediğinizden emin misiniz?')) {
            this.db.deleteExercise(this.currentDay, exerciseName);
            this.renderPrograms();
        }
    }

    updateWeight(exerciseName, newWeight) {
        const program = this.db.getProgramByDay(this.currentDay);
        const exercise = program.exercises.find(e => e.name === exerciseName);
        
        if (exercise) {
            exercise.weight = parseInt(newWeight) || 0;
            this.db.updateProgram(this.currentDay, exerciseName, exercise);
        }
    }

    getYoutubeVideoId(url) {
        // YouTube URL'lerinden video ID'sini çıkar
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
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