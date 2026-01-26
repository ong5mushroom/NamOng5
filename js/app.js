import { db, collection, onSnapshot, query, orderBy, limit, ROOT_PATH } from './config.js'; // Nhớ import query, orderBy, limit
import { Home } from './modules/home.js';
import { SX } from './modules/sx.js'; 
import { Chat } from './modules/chat.js';

const App = {
    data: {
        houses: [],
        spawn_inventory: [],
        materials: [],
        chat: [] 
    },
    
    currentTab: 'home',
    currentUser: null, // Biến lưu user đăng nhập

    init: () => {
        // --- 1. LẮNG NGHE DỮ LIỆU ---
        
        // Chat: Lấy 50 tin mới nhất
        const qChat = query(collection(db, `${ROOT_PATH}/chat`), orderBy("time", "asc"), limit(50));
        onSnapshot(qChat, (snap) => {
            App.data.chat = snap.docs.map(d => ({...d.data(), senderId: String(d.data().senderId), id: d.id}));
            if(App.currentTab === 'chat' || !document.getElementById('chat-layer').classList.contains('hidden')) {
                Chat.render(App.data, App.currentUser);
            }
        });

        // Kho Phôi
        onSnapshot(collection(db, `${ROOT_PATH}/spawn_inventory`), (snap) => {
            App.data.spawn_inventory = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.renderCurrentTab();
        });

        // Nhà & Vật tư
        onSnapshot(collection(db, `${ROOT_PATH}/houses`), (snap) => {
            App.data.houses = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.renderCurrentTab();
        });
        onSnapshot(collection(db, `${ROOT_PATH}/materials`), (snap) => {
            App.data.materials = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.renderCurrentTab();
        });

        // --- 2. LOGIC TAB ---
        // (Giữ nguyên logic switchTab của bạn)
    },

    renderCurrentTab: () => {
        if (App.currentTab === 'home') Home.render(App.data);
        else if (App.currentTab === 'sx') SX.render(App.data);
    }
};

// Giả lập login để test (hoặc lấy từ auth thật của bạn)
App.currentUser = { id: "admin", name: "Admin" }; 
App.init();

export { App }; // Export để các module khác gọi nếu cần
