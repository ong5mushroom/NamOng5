import { auth, db, signInAnonymously, collection, onSnapshot, addDoc, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { Home } from './modules/home.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js'; // Nhớ tạo file này (Lấy code từ comment trước)
import { Chat } from './modules/chat.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [], materials: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        Utils.init();
        
        // Login & Tab Logic (Giữ nguyên như V900 gốc)
        document.getElementById('login-btn')?.addEventListener('click', () => { /* Logic Login */ });
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { 
            /* Logic Tab */ 
            App.renderModule(btn.dataset.tab); 
        }));
        
        // Nút Chat
        document.getElementById('btn-chat')?.addEventListener('click', () => {
            const l = document.getElementById('chat-layer');
            l.classList.remove('hidden'); l.style.display = 'flex';
            document.getElementById('chat-badge').classList.add('hidden');
            Chat.render(App.data, App.user);
        });

        // Firebase Sync
        signInAnonymously(auth).then(() => { App.syncData(); });
    },

    syncData: () => {
        // ... (Giữ nguyên logic syncData như V900 gốc)
        // ... Thêm đoạn này vào trong callback onSnapshot của collection 'chat':
        /* if (c === 'chat' && !document.getElementById('chat-layer').classList.contains('hidden')) {
             Chat.render(App.data, App.user);
        }
        */
    },

    renderModule: (tab) => {
        if(tab === 'home') Home.render(App.data, ['Giám đốc','Quản lý'].includes(App.user?.role));
        if(tab === 'th') THDG.render(App.data, App.user);
        if(tab === 'tasks') HR.renderTasks(App.data, App.user);
        if(tab === 'team') HR.renderTeam(App.data, App.user);
        if(tab === 'sx') SX.render(App.data);
    }
};

window.onload = App.init;
