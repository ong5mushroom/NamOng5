import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, addDoc, updateDoc, 
    doc, deleteDoc, getDoc, increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const fbConfig = { 
    apiKey: "AIzaSyBQDQfYuhf0AWOtmcdufVGeXlzwnSJ33Vw", 
    authDomain: "ong5mushroom-vietnam.firebaseapp.com", 
    projectId: "ong5mushroom-vietnam", 
    storageBucket: "ong5mushroom-vietnam.firebasestorage.app", 
    messagingSenderId: "931399604992", 
    appId: "1:931399604992:web:134c9bfbddbfef97cd31e5" 
};

const appInstance = initializeApp(fbConfig);
export const auth = getAuth(appInstance);
export const db = getFirestore(appInstance);
export const ROOT_PATH = "artifacts/namong5_production/public/data";

// Xuất khẩu các hàm cần thiết cho các modules khác
export { signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc, increment };
