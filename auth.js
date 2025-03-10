import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

document.getElementById('loginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Giriş başarılı
            const user = userCredential.user;
            const userRef = ref(db, 'users/' + user.uid);

            get(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    console.log('Giriş başarılı:', userData);

                    // Kullanıcı bilgilerini sessionStorage'a kaydet
                    sessionStorage.setItem('currentUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        name: userData.name,
                        role: userData.role
                    }));

                    // Giriş başarılı olduğunda yönlendirme
                    window.location.href = 'dashboard.html';
                } else {
                    console.error('Kullanıcı verileri bulunamadı.');
                }
            }).catch((error) => {
                console.error('Veritabanı hatası:', error);
            });
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Giriş hatası:', errorCode, errorMessage);

            // Hata mesajını kullanıcıya göster
            document.getElementById('error-message').innerText = 'Giriş başarısız: ' + errorMessage;
        });
});
