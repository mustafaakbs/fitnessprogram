class CsvLoader {
    static async loadCsvFile(filename) {
        try {
            const response = await fetch(filename);
            const csvText = await response.text();
            return this.parseCsv(csvText);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }

    static parseCsv(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                // Sayısal değerleri otomatik dönüştür
                const value = values[index];
                obj[header] = /^\d+$/.test(value) ? parseInt(value) : value;
                return obj;
            }, {});
        });
    }

    static async initializeDatabase() {
        const users = await this.loadCsvFile('users.csv');
        const programs = await this.loadCsvFile('programs.csv');
        
        if (users && programs) {
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('programs', JSON.stringify(programs));
            return true;
        }
        return false;
    }

    static groupProgramsByDay(programs) {
        return programs.reduce((grouped, program) => {
            if (!grouped[program.day]) {
                grouped[program.day] = {
                    title: program.title,
                    exercises: []
                };
            }
            
            grouped[program.day].exercises.push({
                name: program.exercise,
                sets: [
                    { number: 1, reps: program.set1_reps },
                    { number: 2, reps: program.set2_reps },
                    { number: 3, reps: program.set3_reps },
                    { number: 4, reps: program.set4_reps }
                ],
                weight: program.weight,
                videoUrl: program.videoUrl
            });
            
            return grouped;
        }, {});
    }
} 