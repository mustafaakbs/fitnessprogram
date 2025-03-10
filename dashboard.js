import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Çıkış hatası:', error);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('currentUser').innerText = `Hoşgeldiniz, ${currentUser.name}`;

    const now = new Date();
    document.getElementById('currentDateTime').innerText = `Tarih: ${now.toLocaleDateString()} Saat: ${now.toLocaleTimeString()}`;

    // Gün seçimi ve program yükleme
    const dayButtons = document.querySelectorAll('.day-button');
    dayButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            dayButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const selectedDay = e.target.dataset.day;
            this.currentDay = selectedDay;
            this.loadUserProgram(selectedDay);
        });
    });

    // Varsayılan olarak Pazartesi gününün programını yükleyelim
    this.loadUserProgram('pazartesi');
});

async function loadUserProgram(day) {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser) return;

        // Önce users dizisinde kullanıcının indeksini bulalım
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        const users = usersSnapshot.val();

        let userIndex = null;
        for (let i = 0; i < users.length; i++) {
            if (users[i] && users[i].username === currentUser.username) {
                userIndex = i;
                break;
            }
        }

        if (userIndex === null) {
            console.error('Kullanıcı indeksi bulunamadı');
            return;
        }

        const programRef = ref(db, `userPrograms/${userIndex}/${day}`);
        const snapshot = await get(programRef);
        const program = snapshot.val();

        const titleElement = document.querySelector('.program-title');
        if (titleElement && program && program.title) {
            titleElement.textContent = program.title;
        } else if (titleElement) {
            titleElement.textContent = 'Program';
        }

        const exercisesContainer = document.getElementById('exercisesContainer');
        if (!exercisesContainer) return;
        exercisesContainer.innerHTML = '';

        if (!program || !program.exercises || program.exercises.length === 0) {
            exercisesContainer.innerHTML = '<p class="no-program">Bu gün için program bulunamadı.</p>';
            return;
        }

        program.exercises.forEach((exercise, index) => {
            const exerciseDiv = document.createElement('div');
            exerciseDiv.className = 'exercise-card';
            
            let setsHtml = '';
            if (exercise.sets) {
                exercise.sets.forEach(set => {
                    setsHtml += `
                        <div class="set-item">
                            <span class="set-number">Set ${set.number}</span>
                            <span class="set-reps">${set.reps} tekrar</span>
                            ${exercise.weight ? `<span class="set-weight">${exercise.weight} kg</span>` : ''}
                        </div>
                    `;
                });
            }

            let videoPreview = '';
            if (exercise.videoUrl) {
                if (exercise.videoUrl.includes('youtube.com') || exercise.videoUrl.includes('youtu.be')) {
                    const videoId = getYoutubeVideoId(exercise.videoUrl);
                    if (videoId) {
                        videoPreview = `
                            <div class="video-preview-container">
                                <div class="video-preview">
                                    <iframe 
                                        src="https://www.youtube.com/embed/${videoId}" 
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen
                                    ></iframe>
                                </div>
                            </div>
                        `;
                    }
                }
            }

            exerciseDiv.innerHTML = `
                <div class="exercise-header">
                    <h3 class="exercise-name">${exercise.name || 'İsimsiz Egzersiz'}</h3>
                </div>
                <div class="exercise-content">
                    <div class="sets-container">
                        ${setsHtml}
                    </div>
                    ${videoPreview}
                </div>
            `;

            exercisesContainer.appendChild(exerciseDiv);
        });

    } catch (error) {
        console.error('Error loading program:', error);
        document.getElementById('exercisesContainer').innerHTML = 
            '<p class="error-message">Program yüklenirken bir hata oluştu.</p>';
    }
}

function getYoutubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
