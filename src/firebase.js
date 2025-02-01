import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCVycO_CqLeNw_X_1EBBKLzEUUA6hufTwk",
  authDomain: "lifelineshackathon.firebaseapp.com",
  databaseURL: "https://lifelineshackathon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lifelineshackathon",
  storageBucket: "lifelineshackathon.firebasestorage.app",
  messagingSenderId: "478456343006",
  appId: "1:478456343006:web:7cb2aa2a425ae4f96e554f",
  measurementId: "G-M06DS372ZH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
const database = getDatabase(app);

export { database };