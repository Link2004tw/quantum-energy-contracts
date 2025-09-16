// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from 'firebase/database';
const firebaseConfig = {
  apiKey: "AIzaSyDSGgFkH-2_XKwNF_EPqZT7usCUkFxGW-g",
  authDomain: "solarfarmsystem.firebaseapp.com",
  projectId: "solarfarmsystem",
  storageBucket: "solarfarmsystem.firebasestorage.app",
  messagingSenderId: "548346266759",
  appId: "1:548346266759:web:471ba0b003c0ca182fe422"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);