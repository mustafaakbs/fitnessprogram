// Ağırlık güncelleme fonksiyonu
async updateWeight(exerciseName, newWeight) {
    if (!this.editMode) return;

    try {
        const snapshot = await get(ref(db, `programs/${this.currentDay}`));
        const program = snapshot.val();
        
        if (program && program.exercises) {
            const exerciseIndex = program.exercises.findIndex(e => e.name === exerciseName);
            if (exerciseIndex !== -1) {
                program.exercises[exerciseIndex].weight = parseInt(newWeight) || 0;
                
                await update(ref(db), {
                    [`programs/${this.currentDay}`]: program
                });
                
                // Başarılı güncelleme mesajı
                alert('Ağırlık güncellendi!');
            }
        }
    } catch (error) {
        console.error('Error updating weight:', error);
        alert('Ağırlık güncellenirken bir hata oluştu!');
    }
}

// Set güncelleme fonksiyonu
async updateSet(exerciseName, setNumber, newReps) {
    if (!this.editMode) return;

    try {
        const snapshot = await get(ref(db, `programs/${this.currentDay}`));
        const program = snapshot.val();
        
        if (program && program.exercises) {
            const exerciseIndex = program.exercises.findIndex(e => e.name === exerciseName);
            if (exerciseIndex !== -1) {
                const setIndex = program.exercises[exerciseIndex].sets.findIndex(s => s.number === setNumber);
                if (setIndex !== -1) {
                    program.exercises[exerciseIndex].sets[setIndex].reps = parseInt(newReps) || 0;
                    
                    await update(ref(db), {
                        [`programs/${this.currentDay}`]: program
                    });
                    
                    // Başarılı güncelleme mesajı
                    alert('Set güncellendi!');
                }
            }
        }
    } catch (error) {
        console.error('Error updating set:', error);
        alert('Set güncellenirken bir hata oluştu!');
    }
}

// Egzersiz render fonksiyonunu güncelle
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
                           step="1"
                           ${!this.editMode ? 'readonly' : ''}>
                    <span>KG</span>
                </div>
            </div>
            <div class="sets-container">
                ${exercise.sets.map(set => `
                    <div class="set-box">
                        <span>${set.number}. Set:</span>
                        <input type="number" 
                               value="${set.reps}" 
                               onchange="dashboard.updateSet('${exercise.name}', ${set.number}, this.value)"
                               min="0"
                               ${!this.editMode ? 'readonly' : ''}>
                        <span>Tekrar</span>
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
