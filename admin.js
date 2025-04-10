class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.currentDay = 'pazartesi';
        this.checkAdminAccess();
        this.initializeInterface();
        this.loadUsers();
    }

    // Türkçe ay isimleri için yardımcı dizi
    getTurkishMonth(monthIndex) {
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return months[monthIndex];
    }

    // Türkçe gün isimleri için yardımcı dizi
    getTurkishDay(dayIndex) {
        const days = [
            'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 
            'Perşembe', 'Cuma', 'Cumartesi'
        ];
        return days[dayIndex];
    }

    // Tarih ve saat güncelleme fonksiyonu - Türkçe format
    updateDateTime() {
        const now = new Date();
        const day = now.getDate();
        const month = this.getTurkishMonth(now.getMonth());
        const year = now.getFullYear();
        const dayName = this.getTurkishDay(now.getDay());
        
        // Saat bilgisini 2 haneli formatta alma
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const formattedDate = `Tarih: ${day} ${month} ${year} ${dayName}\nSaat: ${hours}:${minutes}:${seconds}`;
        document.getElementById('currentDateTime').innerText = formattedDate;

        // Aktif kullanıcı bilgisini güncelle
        const currentUserInfo = `Aktif Kullanıcı: ${this.currentAdmin ? this.currentAdmin.username : ''}\n`;
        document.getElementById('currentAdmin').innerText = currentUserInfo;
    }

    async exportToExcel(userId) {
        try {
            const programs = {};
            const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];
            
            // Kullanıcı adını al
            const userRef = ref(db, `users/${userId}`);
            const userSnapshot = await get(userRef);
            const userName = userSnapshot.val()?.name || userId;

            for (const day of days) {
                const programRef = ref(db, `userPrograms/${userId}/${day}`);
                const snapshot = await get(programRef);
                programs[day] = snapshot.val() || { title: '', exercises: [] };
            }

            const wb = XLSX.utils.book_new();
            
            // Her gün için worksheet oluştur
            for (const day of days) {
                const program = programs[day];
                const exercises = program.exercises || [];
                
                const wsData = [
                    ['Program Sahibi:', userName],
                    ['Program Günü:', this.getTurkishDay(days.indexOf(day))],
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
                
                // Sütun genişliklerini ayarla
                ws['!cols'] = [
                    {width: 30}, // Egzersiz adı
                    {width: 40}, // Video URL
                    {width: 50}  // Set bilgileri
                ];

                XLSX.utils.book_append_sheet(wb, ws, this.getTurkishDay(days.indexOf(day)));
            }

            // Dosya adını tarih ile birlikte oluştur
            const now = new Date();
            const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
            XLSX.writeFile(wb, `${userName}_antrenman_programi_${dateStr}.xlsx`);
            
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

                    const dayMapping = {
                        'Pazartesi': 'pazartesi',
                        'Salı': 'sali',
                        'Çarşamba': 'carsamba',
                        'Perşembe': 'persembe',
                        'Cuma': 'cuma',
                        'Cumartesi': 'cumartesi',
                        'Pazar': 'pazar'
                    };

                    for (const sheetName of workbook.SheetNames) {
                        const day = dayMapping[sheetName];
                        if (!day) continue;

                        const worksheet = workbook.Sheets[sheetName];
                        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                        const programTitle = sheetData[2][1] || ''; // Program adı 3. satırda
                        const exercises = [];

                        // 5. satırdan (index 4) itibaren egzersiz verileri başlıyor
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

                        await set(ref(db, `userPrograms/${userId}/${day}`), programData);
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
