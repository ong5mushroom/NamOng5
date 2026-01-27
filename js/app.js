import { Home } from './modules/home.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js';
import { auth, db, collection, onSnapshot, signInAnonymously, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';

const App = {
    data: { houses: [], users: [], tasks: [], employees: [], chat: [], spawn_inventory: [], products: [], harvest: [], shipping: [], supplies: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,
    currentTab: 'home',

    init: async () => {
        console.log("App V5 Fixed Starting...");
        try { await signInAnonymously(auth); } catch (e) { console.error("Auth Err:", e); }
        App.listenData();
        App.checkLoginState();
        App.bindEvents();
    },

    listenData: () => {
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), (snap) => {
            App.data.employees = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.data.users = App.data.employees; 
            App.renderLoginList();
        });

        if (App.user) {
            const cols = ['houses', 'tasks', 'chat', 'spawn_inventory', 'products', 'harvest_logs', 'shipping', 'supplies'];
            cols.forEach(key => {
                const dataKey = key === 'harvest_logs' ? 'harvest' : key;
                onSnapshot(collection(db, `${ROOT_PATH}/${key}`), (snap) => {
                    let docs = snap.docs.map(d => ({...d.data(), id: d.id}));
                    if(dataKey === 'chat') docs.sort((a,b) => a.time - b.time);
                    App.data[dataKey] = docs;
                    
                    if(App.currentTab) App.renderActiveTab();
                    
                    if(!document.getElementById('chat-layer').classList.contains('hidden')) {
                        Chat.render(App.data, App.user);
                    }
                });
            });
        }
    },

    renderLoginList: () => {
        const el = document.getElementById('login-user');
        if (el && App.data.users.length) el.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + App.data.users.map(u => `<option value="${u._id}">${u.name}</option>`).join('');
    },

    checkLoginState: () => {
        if (App.user) {
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('head-user').innerText = App.user.name;
            document.getElementById('head-role').innerText = App.user.role;
            if(['admin', 'quản lý', 'giám đốc'].some(r => (App.user.role||'').toLowerCase().includes(r))) {
                document.getElementById('btn-settings').classList.remove('hidden');
            }
            App.switchTab('home');
        } else {
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    },

    login: () => {
        const id = document.getElementById('login-user').value;
        const pin = document.getElementById('login-pin').value;
        const u = App.data.users.find(u => u._id === id);
        if (u && String(u.pin) === String(pin)) {
            App.user = u; localStorage.setItem('n5_modular_user', JSON.stringify(u)); location.reload();
        } else Utils.toast("Sai mã PIN!", "err");
    },

    switchTab: (tab) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'text-blue-600'));
        
        // Tab HTML ID là 'view-th' nên biến 'tab' sẽ là 'th'
        const view = document.getElementById(`view-${tab}`);
        if(view) {
            view.classList.remove('hidden');
            const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
            if(btn) btn.classList.add('active', 'text-blue-600');
            App.currentTab = tab;
            App.renderActiveTab();
        }
    },

    renderActiveTab: () => {
        if(!App.user) return;
        try {
            const d = App.data;
            // --- SỬA LỖI TẠI ĐÂY: Đổi 'thdg' thành 'th' ---
            if(App.currentTab === 'home') Home.render(d, true);
            if(App.currentTab === 'tasks') HR.renderTasks(d, App.user);
            if(App.currentTab === 'team') HR.renderTeam(d, App.user);
            if(App.currentTab === 'sx') SX.render(d, App.user);
            
            // QUAN TRỌNG: Dùng đúng tên 'th' khớp với data-tab="th" trong HTML
            if(App.currentTab === 'th') THDG.render(d, App.user); 
            
        } catch (e) { console.error("Render Tab Err:", e); }
    },

    bindEvents: () => {
        document.getElementById('login-btn').onclick = App.login;
        document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => App.switchTab(b.dataset.tab));
        
        document.getElementById('btn-chat').onclick = () => {
            document.getElementById('chat-layer').classList.remove('hidden');
            Chat.render(App.data, App.user);
        };
        
        document.querySelector('[data-action="closeChat"]').onclick = () => document.getElementById('chat-layer').classList.add('hidden');
        document.getElementById('btn-settings').onclick = Admin.openSettings;
    }
};
document.addEventListener('DOMContentLoaded', App.init);
