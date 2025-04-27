// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlnnDh12PzBSo4iUG0QS-m-QMsKy3yHN0",
  authDomain: "esp32-led-db89b.firebaseapp.com",
  databaseURL: "https://esp32-led-db89b-default-rtdb.firebaseio.com",
  projectId: "esp32-led-db89b",
  storageBucket: "esp32-led-db89b.firebasestorage.app",
  messagingSenderId: "598672600878",
  appId: "1:598672600878:web:b2a5185560ef9facb994bf",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
