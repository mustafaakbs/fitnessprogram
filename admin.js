import { db } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.currentDay = 'pazartesi';
        this.checkAdminAccess();
        this.initializeInterface();
        this.loadUsers();
    }

    checkAdminAccess() {
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }

        const user = JSON.parse(userJson);
        if (user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        this.currentAdmin = user;
        document.getElementById('currentAdmin').innerText = `Giriş Yapan Kullanıcı: ${user.username}`;
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = now.toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        document.getElementById('currentDateTime').innerText = `Tarih ve Saat: ${formattedDate}`;
    }

    async loadUsers() {
        try {
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val();

            const tbody = document.querySelector('.users-table tbody');
            tbody.innerHTML = '';

            for (const userId in users) {
                const user = users[userId];
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>
                        <input type="text" class="table-input" value="${user.username}" data-field="username">
                    </td>
                    <td>
                        <input type="password" class="table-input" value="${user.password}" data-field="password">
                    </td>
                    <td>
                        <input type="text" class="table-input" value="${user.name || ''}" data-field="name">
                    </td>
                    <td>
                        <select class="table-input" data-field="role">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Kullanıcı</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Yönetici</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn save-btn" onclick="adminPanel.saveUser('${userId}', this)">Kaydet</button>
                        <button class="action-btn delete-btn" onclick="adminPanel.deleteUser('${userId}')">Sil</button>
                        <button class="action-btn program-btn" onclick="adminPanel.toggleProgram('${userId}')">Program</button>
                    </td>
                `;

                const programRow = document.createElement('tr');
                programRow.className = 'program-row';
                programRow.id = `program-${userId}`;
                programRow.innerHTML = `
                    <td colspan="5">
                        <div class="program-container">
                            <div class="program-header">
                                <select class="day-select" onchange="adminPanel.dayChanged('${userId}', this.value)">
                                    <option value="pazartesi">Pazartesi</option>
                                    <option value="sali">Salı</option>
                                    <option value="carsamba">Çarşamba</option>
                                    <option value="persembe">Perşembe</option>
                                    <option value="cuma">Cuma</option>
                                    <option value="cumartesi">Cumartesi</option>
                                    <option value="pazar">Pazar</option>
                                </select>
                                <input type="text" class="program-title-input" placeholder="Program Adı" value="Cardio">
                            </div>
                            <div class="exercises-container"></div>
                            <div class="program-actions">
                                <button class="action-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                                <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
                                <button class="action-btn excel-btn" onclick="adminPanel.exportToExcel('${userId}')">Excel'e Aktar</button>
                                <input type="file" id="excel-upload-${userId}" style="display: none" accept=".xlsx" onchange="adminPanel.importFromExcel('${userId}', this)">
                                <button class="action-btn excel-btn" onclick="document.getElementById('excel-upload-${userId}').click()">Excel'den Yükle</button>
                            </div>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
                tbody.appendChild(programRow);
            }
        } catch (error) {
            console.error('Kullanıcılar yüklenirken hata:', error);
        }
    }

    async saveUser(userId, button) {
        try {
            const tr = button.closest('tr');
            const inputs = tr.querySelectorAll('.table-input');
            const userData = {};

            inputs.forEach(input => {
                userData[input.dataset.field] = input.value;
            });

            await set(ref(db, `users/${userId}`), userData);
            alert('Kullanıcı başarıyla güncellendi');
        } catch (error) {
            console.error('Kullanıcı kaydetme hatası:', error);
            alert('Kullanıcı güncellenirken bir hata oluştu');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

        try {
            await remove(ref(db, `users/${userId}`));
            await remove(ref(db, `userPrograms/${userId}`));
            await this.loadUsers();
            alert('Kullanıcı başarıyla silindi');
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            alert('Kullanıcı silinirken bir hata oluştu');
        }
    }

    async toggleProgram(userId) {
        const programRow = document.getElementById(`program-${userId}`);
        const isVisible = programRow.style.display === 'table-row';
        
        if (!isVisible) {
            document.querySelectorAll('.program-row').forEach(row => {
                row.style.display = 'none';
            });
            
            programRow.style.display = 'table-row';
            await this.loadUserProgram(userId);
        } else {
            programRow.style.display = 'none';
        }
    }

    async loadUserProgram(userId) {
        try {
            const programRef = ref(db, `userPrograms/${userId}/${this.currentDay}`);
            const snapshot = await get(programRef);
            const program = snapshot.val();

            const container = document.getElementById(`program-${userId}`);
            const titleInput = container.querySelector('.program-title-input');
            const exercisesContainer = container.querySelector('.exercises-container');
            
            exercisesContainer.innerHTML = '';

            if (program && program.title) {
                titleInput.value = program.title;
            }

            if (program && program.exercises) {
                program.exercises.forEach((exercise, index) => {
                    this.createExerciseCard(exercisesContainer, exercise, index, userId);
                });
            }
        } catch (error) {
            console.error('Program yükleme hatası:', error);
        }
    }

    createExerciseCard(container, exercise, index, userId) {
        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';
        exerciseCard.dataset.index = index;

        let setsHtml = '';
        if (exercise.sets) {
            exercise.sets.forEach((set, setIndex) => {
                const reps = set.reps === 'max' ? 'max' : set.reps;
                setsHtml += `
                    <div class="set-item">
                        <span>Set ${set.number}:</span>
                        <input type="text" class="set-input" value="${reps}"
                               onchange="this.value = this.value.toLowerCase() === 'max' ? 'max' : (parseInt(this.value) || 'max')">
                        <span>tekrar</span>
                        <button class="action-btn delete-btn" onclick="adminPanel.deleteSet('${userId}', ${index}, ${setIndex})">Set Sil</button>
                    </div>
                `;
            });
        }

        exerciseCard.innerHTML = `
            <input type="text" class="exercise-name" value="${exercise.name || ''}" placeholder="Egzersiz Adı">
            <div class="sets-container">
                ${setsHtml}
            </div>
            <input type="text" class="video-url" value="${exercise.videoUrl || ''}" placeholder="Video URL">
            <div class="exercise-actions">
                <button class="action-btn" onclick="adminPanel.addSet('${userId}', ${index})">Set Ekle (Maks: 10)</button>
                <button class="action-btn delete-btn" onclick="adminPanel.deleteExercise('${userId}', ${index})">Egzersizi Sil</button>
            </div>
        `;

        container.appendChild(exerciseCard);
    }

    dayChanged(userId, day) {
        this.currentDay = day;
        this.loadUserProgram(userId);
    }

    addSet(userId, exerciseIndex) {
        const container = document.getElementById(`program-${userId}`);
        const exerciseCards = container.querySelectorAll('.exercise-card');
        const exerciseCard = exerciseCards[exerciseIndex];
        
        if (exerciseCard) {
            const setsContainer = exerciseCard.querySelector('.sets-container');
            const currentSets = setsContainer.querySelectorAll('.set-item').length;
            
            if (currentSets >= 10) {
                alert('Maksimum set sayısına ulaşıldı (10)!');
                return;
            }

            const newSetDiv = document.createElement('div');
            newSetDiv.className = 'set-item';
            newSetDiv.innerHTML = `
                <span>Set ${currentSets + 1}:</span>
                <input type="text" class="set-input" value="max"
                       onchange="this.value = this.value.toLowerCase() === 'max' ? 'max' : (parseInt(this.value) || 'max')">
                <span>tekrar</span>
                <button class="action-btn delete-btn" onclick="adminPanel.deleteSet('${userId}', ${exerciseIndex}, ${currentSets})">Set Sil</button>
            `;
            
            setsContainer.appendChild(newSetDiv);
        }
    }

    deleteSet(userId, exerciseIndex, setIndex) {
        const container = document.getElementById(`program-${userId}`);
        const exerciseCards = container.querySelectorAll('.exercise-card');
        const exerciseCard = exerciseCards[exerciseIndex];
        
        if (exerciseCard) {
            const setsContainer = exerciseCard.querySelector('.sets-container');
            const setItems = setsContainer.querySelectorAll('.set-item');
            
            if (setItems.length > 1) {
                setItems[setIndex].remove();
                
                const remainingSets = setsContainer.querySelectorAll('.set-item');
                remainingSets.forEach((set, idx) => {
                    const setNumber = set.querySelector('span:first-child');
                    setNumber.textContent = `Set ${idx + 1}:`;
                });
            } else {
                alert('En az bir set bulunmalıdır!');
            }
        }
    }

    deleteExercise(userId, exerciseIndex) {
        if (!confirm('Bu egzersizi silmek istediğinize emin misiniz?')) return;

        const container = document.getElementById(`program-${userId}`);
        const exerciseCards = container.querySelectorAll('.exercise-card');
        const exerciseCard = exerciseCards[exerciseIndex];
        
        if (exerciseCard) {
            exerciseCard.remove();
        }
    }

    addExercise(userId) {
        const container = document.getElementById(`program-${userId}`);
        const exercisesContainer = container.querySelector('.exercises-container');
        
        const exercise = {
            name: '',
            sets: [{number: 1, reps: 'max'}],
            videoUrl: ''
        };

        this.createExerciseCard(exercisesContainer, exercise, exercisesContainer.children.length, userId);
    }

    async saveProgram(userId) {
        try {
            const container = document.getElementById(`program-${userId}`);
            const titleInput = container.querySelector('.program-title-input');
            const exerciseCards = container.querySelectorAll('.exercise-card');
            
            const exercises = Array.from(exerciseCards).map(card => {
                const sets = Array.from(card.querySelectorAll('.set-item')).map((setItem, index) => {
                    const value = setItem.querySelector('.set-input').value;
                    return {
                        number: index + 1,
                        reps: value.toLowerCase() === 'max' ? 'max' : (parseInt(value) || 'max')
                    };
                });
                
                return {
                    name: card.querySelector('.exercise-name').value,
                    sets: sets,
                    videoUrl: card.querySelector('.video-url').value
                };
            });
            
            const programData = {
                title: titleInput.value,
                exercises: exercises
            };
            
            await set(ref(db, `userPrograms/${userId}/${this.currentDay}`), programData);
            alert('Program başarıyla kaydedildi');
        } catch (error) {
            console.error('Program kaydetme hatası:', error);
            alert('Program kaydedilirken bir hata oluştu');
        }
    }

    async exportToExcel(userId) {
        try {
            const programs = {};
            const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
            
            for (const day of days) {
                const programRef = ref(db, `userPrograms/${userId}/${day}`);
                const snapshot = await get(programRef);
                programs[day] = snapshot.val() || { title: '', exercises: [] };
            }

            const wb = XLSX.utils.book_new();
            
            for (const day of days) {
                const program = programs[day];
                const exercises = program.exercises || [];
                
                const maxSets = Math.max(...exercises.map(ex => ex.sets?.length || 0), 1);
                
                const wsData = [
                    ['Program Adı:', program.title || ''],
                    [''],
                    ['Egzersiz Adı', 'Video URL']
                ];

                const headerRow = wsData[2];
                for (let i = 0; i < maxSets; i++) {
                    headerRow.push(`Set ${i + 1}`);
                }

                exercises.forEach(exercise => {
                    const row = [
                        exercise.name || '',
                        exercise.videoUrl || ''
                    ];

                    for (let i = 0; i < maxSets; i++) {
                        const set = exercise.sets[i];
                        row.push(set ? (set.reps === 'max' ? 'max' : `${set.reps} tekrar`) : '');
                    }
                    
                    wsData.push(row);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);

                ws['!cols'] = [
                    {width: 30},
                    {width: 40},
                    ...Array(maxSets).fill({width: 15})
                ];

                XLSX.utils.book_append_sheet(wb, ws, day);
            }

            const now = new Date();
            const dateStr = now.toLocaleDateString('tr-TR').replace(/\./g, '-');
            XLSX.writeFile(wb, `antrenman_programi_${dateStr}.xlsx`);
            alert('Program başarıyla Excel dosyasına aktarıldı');

        } catch (error) {
            console.error('Excel dışa aktarma hatası:', error);
            alert('Excel dosyası oluşturulurken bir hata oluştu');
        }
    }

    async importFromExcel(userId, input) {
        try {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    for (const sheetName of workbook.SheetNames) {
                        const worksheet = workbook.Sheets[sheetName];
                        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                        const programTitle = sheetData[0][1] || '';
                        const exercises = [];

                        for (let i = 3; i < sheetData.length; i++) {
                            const row = sheetData[i];
                            if (!row[0]) continue;

                            const sets = [];
                            for (let j = 2; j < row.length; j++) {
                                if (row[j]) {
                                    const repsText = row[j].toLowerCase();
                                    let reps = repsText === 'max' ? 'max' : (parseInt(repsText.match(/\d+/)) || 'max');
                                    sets.push({
                                        number: sets.length + 1,
                                        reps: reps
                                    });
                                }
                            }

                            if (sets.length === 0) {
                                sets.push({ number: 1, reps: 'max' });
                            }

                            exercises.push({
                                name: row[0],
                                videoUrl: row[1] || '',
                                sets: sets
                            });
                        }

                        const programData = {
                            title: programTitle,
                            exercises
                        };

                        await set(ref(db, `userPrograms/${userId}/${sheetName}`), programData);
                    }

                    await this.loadUserProgram(userId);
                    alert('Program başarıyla Excel dosyasından yüklendi');

                } catch (error) {
                    console.error('Excel içe aktarma işlem hatası:', error);
                    alert('Excel dosyası işlenirken bir hata oluştu');
                }
            };

            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error('Excel içe aktarma hatası:', error);
            alert('Excel dosyası yüklenirken bir hata oluştu');
        }
    }

    initializeInterface() {
        document.getElementById('addUserBtn').addEventListener('click', () => {
            const tbody = document.querySelector('.users-table tbody');
            const tr = document.createElement('tr');
            const userId = 'new-' + Date.now();
            
            tr.innerHTML = `
                <td><input type="text" class="table-input" value="" data-field="username"></td>
                <td><input type="password" class="table-input" value="" data-field="password"></td>
                <td><input type="text" class="table-input" value="" data-field="name"></td>
                <td>
                    <select class="table-input" data-field="role">
                        <option value="user">Kullanıcı</option>
                        <option value="admin">Yönetici</option>
                    </select>
                </td>
                <td>
                    <button class="action-btn save-btn" onclick="adminPanel.saveUser('${userId}', this)">Kaydet</button>
                </td>
            `;
            
            tbody.insertBefore(tr, tbody.firstChild);
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }
}

window.adminPanel = new AdminPanel();
