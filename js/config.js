import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    initializeFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    doc, 
    deleteDoc, 
    getDoc, 
    increment, 
    writeBatch, 
    getDocs, 
    query, 
    where 
    // Đã xóa enableIndexedDbPersistence để tránh lỗi crash
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const fbConfig = { 
    apiKey: "AIzaSyBQDQfYuhf0AWOtmcdufVGeXlzwnSJ33Vw", 
    authDomain: "ong5mushroom-vietnam.firebaseapp.com", 
    projectId: "ong5mushroom-vietnam", 
    storageBucket: "ong5mushroom-vietnam.firebasestorage.app", 
    messagingSenderId: "931399604992", 
    appId: "1:931399604992:web:134c9bfbddbfef97cd31e5" 
};

// 1. Khởi tạo App
const appInstance = initializeApp(fbConfig);

// 2. KHỞI TẠO DB (Chỉ giữ cấu hình Long Polling để Xiaomi vào được mạng)
// Chúng ta KHÔNG bật enableIndexedDbPersistence nữa để tránh lỗi "Already Started"
export const db = initializeFirestore(appInstance, {
    experimentalForceLongPolling: true, 
});

export const auth = getAuth(appInstance);
export const ROOT_PATH = "artifacts/namong5_production/public/data";

// Xuất khẩu công cụ
export { 
    signInAnonymously, onAuthStateChanged, onSnapshot,
    collection, addDoc, updateDoc, doc, deleteDoc, getDoc, increment, 
    writeBatch, getDocs, query, where 
};
