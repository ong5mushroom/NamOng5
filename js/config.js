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
    where,
    enableIndexedDbPersistence // <--- QUAN TRỌNG: Thêm cái này để lưu cache
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

// --- CẤU HÌNH FIX LỖI XIAOMI 13T & MẠNG YẾU ---
// 1. Ép dùng Long Polling để xuyên tường lửa/DNS chặn
export const db = initializeFirestore(appInstance, {
    experimentalForceLongPolling: true, 
});

// 2. KÍCH HOẠT CHẾ ĐỘ OFFLINE (BỀN BỈ)
// Giúp app tải dữ liệu từ bộ nhớ máy ngay lập tức, không cần chờ mạng
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Nhiều tab đang mở, offline chỉ chạy trên 1 tab.');
    } else if (err.code == 'unimplemented') {
        console.log('Trình duyệt không hỗ trợ offline.');
    }
});

export const ROOT_PATH = "artifacts/namong5_production/public/data";

// Xuất khẩu công cụ
export { 
    signInAnonymously, onAuthStateChanged, onSnapshot,
    collection, addDoc, updateDoc, doc, deleteDoc, getDoc, increment, 
    writeBatch, getDocs, query, where 
};
