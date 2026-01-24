// --- IMPORT CHUẨN ---
import { auth, db, signInAnonymously, collection, onSnapshot, addDoc, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { Home } from './modules/home.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';      // <-- Đã có file này
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js'; // <-- Đã có file này

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [], materials: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        Utils.init();
        
        // --- BUTTON EVENTS ---
        document.getElementById('login-btn')?.addEventListener('click', App.handleLogin);
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            if(['Quản lý','Admin','Giám đốc'].includes(App.user?.role)) Admin.openSettings();
        });
        document.getElementById('btn-chat')?.addEventListener('click', () => {
            const l = document.getElementById('chat-layer');
            l.classList.remove('hidden'); l.style.display='flex';
            document.getElementById('chat-badge').classList.add('hidden');
            Chat.render(App.data, App.user);
        });

        // --- TAB NAVIGATION ---
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { 
            UI_App.switchTab(btn); // Helper nội bộ
            App.renderModule(btn.dataset.tab); 
        }));

        // --- FIREBASE CONNECT ---
        signInAnonymously(auth).then(() => {
            console.log("System Online");
            App.syncData();
        });
    },

    syncData: () => {
        const collections = ['employees','houses','harvest_logs','tasks','shipping','chat','products','materials'];
        collections.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                // Mapping data
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                // Auto Seeder (Tự tạo dữ liệu mẫu nếu rỗng)
                if(c==='products' && snap.empty) App.seedProducts();
                if(c==='employees' && snap.empty) App.seedAdmin();

                // Realtime Updates
                if(c==='chat' && !document.getElementById('chat-layer').classList.contains('hidden')) Chat.render(App.data, App.user);
                if(c==='employees') {
                    // Update dropdown login
                    const sel = document.getElementById('login-user');
                    if(sel) sel.innerHTML = '<option value="">-- Chọn --</option>' + App.data.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
                }

                // Nếu đã đăng nhập thì vẽ lại màn hình hiện tại
                if(App.user) {
                    document.getElementById('login-overlay').classList.add('hidden');
                    document.getElementById('head-user').innerText = App.user.name;
                    document.getElementById('head-role').innerText = App.user.role;
                    if(['Admin','Quản lý'].includes(App.user.role)) document.getElementById('btn-settings').classList.remove('hidden');
                    
                    // Vẽ lại tab đang mở
                    const currentTab = localStorage.getItem('n5_current_tab') || 'home';
                    App.renderModule(currentTab);
                }
            });
        });
    },

    renderModule: (tab) => {
        if(tab === 'home') Home.render(App.data, ['Giám đốc','Quản lý'].includes(App.user?.role));
        if(tab === 'sx') SX.render(App.data);
        if(tab === 'th') THDG.render(App.data, App.user);
        if(tab === 'tasks') HR.renderTasks(App.data, App.user);
        if(tab === 'team') HR.renderTeam(App.data, App.user);
    },

    handleLogin: () => {
        const id = document.getElementById('login-user').value; 
        const pin = document.getElementById('login-pin').value;
        const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
        if(emp) { 
            App.user = emp;
            localStorage.setItem('n5_modular_user', JSON.stringify(emp)); 
            location.reload(); 
        } else Utils.toast("Sai thông tin đăng nhập!", "err");
    },

    // --- SEEDERS ---
    seedProducts: () => { [{name:"B2",code:"b2",group:"1"},{name:"A1",code:"a1",group:"1"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p)); },
    seedAdmin: () => { addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"}); }
};

// UI Helper nhỏ cho App.js đỡ rối
const UI_App = {
    switchTab: (btn) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${btn.dataset.tab}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b => {
            if(b === btn) { b.classList.add('text-blue-600', '-translate-y-1'); b.classList.remove('text-slate-400'); }
            else { b.classList.remove('text-blue-600', '-translate-y-1'); b.classList.add('text-slate-400'); }
        });
        localStorage.setItem('n5_current_tab', btn.dataset.tab);
    }
};

window.onload = App.init;
