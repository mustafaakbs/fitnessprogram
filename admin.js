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
        document.getElementById('currentAdmin').innerText = `Aktif Kullanıcı: ${user.username}`;
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
    }

    createExerciseCard(container, exercise, index, userId) {
        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';
        exerciseCard.dataset.index = index;

        let setsHtml = '';
        if (exercise.sets) {
            exercise.sets.forEach((set, setIndex) => {
                setsHtml += `
                    <div class="set-item">
                        <span>Set ${set.number}:</span>
                        <input type="number" class="set-input" value="${set.reps}" min="1">
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
                <button class="action-btn" onclick="adminPanel.addSet('${userId}', ${index})">Set Ekle</button>
                <button class="action-btn delete-btn" onclick="adminPanel.deleteExercise('${userId}', ${index})">Egzersizi Sil</button>
            </div>
        `;

        const programActionsDiv = container.querySelector('.program-actions') || document.createElement('div');
        if (!container.querySelector('.program-actions')) {
            programActionsDiv.className = 'program-actions';
            programActionsDiv.innerHTML = `
                <button class="action-btn" onclick="adminPanel.addExercise('${userId}')">Yeni Egzersiz</button>
                <button class="action-btn save-btn" onclick="adminPanel.saveProgram('${userId}')">Programı Kaydet</button>
                <button class="action-btn excel-btn" onclick="adminPanel.exportToExcel('${userId}')">Excel'e Aktar</button>
                <input type="file" id="excel-upload-${userId}" style="display: none" accept=".xlsx" onchange="adminPanel.importFromExcel('${userId}', this)">
                <button class="action-btn excel-btn" onclick="document.getElementById('excel-upload-${userId}').click()">Excel'den Yükle</button>
            `;
            container.appendChild(programActionsDiv);
        }

        container.insertBefore(exerciseCard, programActionsDiv);
    }

    // ... (diğer mevcut metodlar aynen kalacak)

    // Excel ile ilgili metodlar buraya eklenecek
    async exportToExcel(userId) {
        try {
            const programs = {};
            const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
            
            const userRef = ref(db, `users/${userId}`);
            const userSnapshot = await get(userRef);
            const userName = userSnapshot.val()?.name || userId;

            for (const day of days) {
                const programRef = ref(db, `userPrograms/${userId}/${day}`);
                const snapshot = await get(programRef);
                programs[day] = snapshot.val() || { title: '', exercises: [] };
            }

            const wb = XLSX.utils.book_new();
            
            for (const day of days) {
                const program = programs[day];
                const exercises = program.exercises || [];
                
                const wsData = [
                    ['Program Sahibi:', userName],
                    ['Program Günü:', day.charAt(0).toUpperCase() + day.slice(1)],
                    ['Program Adı:', program.title || ''],
                    [''],
                    ['Egzersiz Adı', 'Video Bağlantısı', 'Set Detayları']
                ];

                exercises.forEach(exercise => {
                    const setInfo = exercise.sets
                        .map(set => `Set ${set.number}: ${set.reps} tekrar`)
                        .join(', ');
                    
                    wsData.push([
                        exercise.name || '',
                        exercise.videoUrl || '',
                        setInfo
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [{width: 30}, {width: 40}, {width: 50}];
                XLSX.utils.book_append_sheet(wb, ws, day);
            }

            XLSX.writeFile(wb, `${userName}_antrenman_programi.xlsx`);
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

                        const programTitle = sheetData[2][1] || '';
                        const exercises = [];

                        for (let i = 5; i < sheetData.length; i++) {
                            const row = sheetData[i];
                            if (!row[0]) continue;

                            const setInfoStr = row[2] || '';
                            const sets = setInfoStr.split(',').map((setStr, index) => {
                                const reps = parseInt(setStr.match(/\d+(?=\s*tekrar)/)) || 12;
                                return { number: index + 1, reps };
                            });

                            exercises.push({
                                name: row[0],
                                videoUrl: row[1] || '',
                                sets: sets.length > 0 ? sets : [{ number: 1, reps: 12 }]
                            });
                        }

                        const programData = {
                            title: programTitle,
                            exercises
                        };

                        await set(ref(db, `userPrograms/${userId}/${sheetName.toLowerCase()}`), programData);
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
}

// Global AdminPanel nesnesini oluştur
window.adminPanel = new AdminPanel();
