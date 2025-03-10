// Firebase yapılandırması
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';

const firebaseConfig = {
  apiKey: "AIzaSyADqRGwGotZiCA4C5rmAf7HwvADpZQRAu0",
  authDomain: "sporprogram-188a6.firebaseapp.com",
  projectId: "sporprogram-188a6",
  storageBucket: "sporprogram-188a6.firebasestorage.app",
  messagingSenderId: "1058756473523",
  appId: "1:1058756473523:web:25c117d3681077a2bbf6c6",
  measurementId: "G-TQ7CVH2GDZ",
  databaseURL: "https://sporprogram-188a6-default-rtdb.europe-west1.firebasedatabase.app"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth, analytics };
