import { db, auth } from './firebase-config.js';
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class Converter {
    constructor() {
        this.currentAdmin = null;
        this.checkAdminAccess();
        this.initializeInterface();
        this.initializeEventListeners();
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
        document.getElementById('currentAdmin').innerText = `Current User's Login: ${user.username}\n`;
    }

    updateDateTime() {
        const now = new Date();
        const formattedDate = now.toISOString().replace('T', ' ').split('.')[0];
        document.getElementById('currentDateTime').innerText = 
            `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}\n`;
    }

    initializeInterface() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);

        // Tab değiştirme
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
    }

    initializeEventListeners() {
        // JSON to Excel
        document.getElementById('formatJson').addEventListener('click', () => this.formatJSON());
        document.getElementById('clearJson').addEventListener('click', () => this.clearJSON());
        document.getElementById('validateJson').addEventListener('click', () => this.validateJSON());
        document.getElementById('loadFromFirebase').addEventListener('click', () => this.loadFromFirebase());
        document.getElementById('convertToExcel').addEventListener('click', () => this.convertToExcel());

        // Excel to JSON
        document.getElementById('excelInput').addEventListener('change', (e) => this.handleExcelUpload(e));
        document.getElementById('downloadTemplate').addEventListener('click', () => this.downloadTemplate());
        document.getElementById('convertToJson').addEventListener('click', () => this.convertToJSON());
        document.getElementById('saveToFirebase').addEventListener('click', () => this.saveToFirebase());

        // Modal
        document.querySelector('.close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('copyResult').addEventListener('click', () => this.copyResult());
        document.getElementById('downloadResult').addEventListener('click', () => this.downloadResult());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    // JSON İşlemleri
    formatJSON() {
        const jsonInput = document.getElementById('jsonInput');
        try {
            const parsed = JSON.parse(jsonInput.value);
            jsonInput.value = JSON.stringify(parsed, null, 2);
        } catch (error) {
            this.showModal('Hata', 'Geçersiz JSON formatı');
        }
    }

    clearJSON() {
        document.getElementById('jsonInput').value = '';
    }

    validateJSON() {
        const jsonInput = document.getElementById('jsonInput').value;
        try {
            JSON.parse(jsonInput);
            this.showModal('Başarılı', 'JSON formatı geçerli');
        } catch (error) {
            this.showModal('Hata', 'Geçersiz JSON formatı: ' + error.message);
        }
    }

    async loadFromFirebase() {
        try {
            const programsRef = ref(db, 'userPrograms');
            const snapshot = await get(programsRef);
            const programs = snapshot.val();
            
            if (programs) {
                document.getElementById('jsonInput').value = JSON.stringify(programs, null, 2);
                this.showModal('Başarılı', 'Veriler Firebase\'den başarıyla yüklendi');
            } else {
                this.showModal('Bilgi', 'Firebase\'de veri bulunamadı');
            }
        } catch (error) {
            this.showModal('Hata', 'Firebase\'den veri yükleme hatası: ' + error.message);
        }
    }

    convertToExcel() {
        try {
            const jsonData = JSON.parse(document.getElementById('jsonInput').value);
            const flatData = this.flattenJSON(jsonData);
            const ws = XLSX.utils.json_to_sheet(flatData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Programlar');
            XLSX.writeFile(wb, 'fitness_programlari.xlsx');
        } catch (error) {
            this.showModal('Hata', 'Excel\'e dönüştürme hatası: ' + error.message);
        }
    }

    // Excel İşlemleri
    async handleExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await this.readExcelFile(file);
            this.showExcelPreview(data);
        } catch (error) {
            this.showModal('Hata', 'Excel dosyası okuma hatası: ' + error.message);
        }
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    showExcelPreview(data) {
        const preview = document.getElementById('excelPreview');
        let html = '<table class="preview-table"><thead><tr>';
        
        // Başlıklar
        const headers = Object.keys(data[0] || {});
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Veriler
        data.slice(0, 5).forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                html += `<td>${row[header] || ''}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        if (data.length > 5) {
            html += `<div class="preview-info">... ve ${data.length - 5} satır daha</div>`;
        }
        preview.innerHTML = html;
    }

    downloadTemplate() {
        const template = [
            {
                username: 'kullanici1',
                programName: 'Pazartesi Programı',
                exercise: 'Bench Press',
                sets: '4',
                reps: '12',
                videoUrl: 'https://youtube.com/...'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
        XLSX.writeFile(wb, 'program_sablonu.xlsx');
    }

    // Yardımcı Fonksiyonlar
    flattenJSON(json) {
        const result = [];
        
        for (const userId in json) {
            for (const day in json[userId]) {
                const program = json[userId][day];
                if (program.exercises) {
                    program.exercises.forEach(exercise => {
                        exercise.sets.forEach(set => {
                            result.push({
                                userId,
                                day,
                                programName: program.title,
                                exerciseName: exercise.name,
                                setNumber: set.number,
                                reps: set.reps,
                                videoUrl: exercise.videoUrl
                            });
                        });
                    });
                }
            }
        }
        
        return result;
    }

    unflattenJSON(flatData) {
        const result = {};
        
        flatData.forEach(row => {
            if (!result[row.userId]) {
                result[row.userId] = {};
            }
            if (!result[row.userId][row.day]) {
                result[row.userId][row.day] = {
                    title: row.programName,
                    exercises: []
                };
            }

            // Egzersiz kontrolü
            let exercise = result[row.userId][row.day].exercises.find(e => e.name === row.exerciseName);
            if (!exercise) {
                exercise = {
                    name: row.exerciseName,
                    sets: [],
                    videoUrl: row.videoUrl
                };
                result[row.userId][row.day].exercises.push(exercise);
            }

            // Set kontrolü
            if (!exercise.sets.find(s => s.number === row.setNumber)) {
                exercise.sets.push({
                    number: row.setNumber,
                    reps: row.reps
                });
            }
        });

        return result;
    }

    showModal(title, content) {
        const modal = document.getElementById('resultModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').textContent = content;
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('resultModal').style.display = 'none';
    }

    copyResult() {
        const content = document.getElementById('modalBody').textContent;
        navigator.clipboard.writeText(content)
            .then(() => alert('Kopyalandı'))
            .catch(err => alert('Kopyalama hatası: ' + err));
    }

    downloadResult() {
        const content = document.getElementById('modalBody').textContent;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sonuc.txt';
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Global converter nesnesini oluştur
window.converter = new Converter();
