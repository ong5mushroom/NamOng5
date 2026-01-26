// ĐƯỜNG DẪN: js/app.js
import { Home } from './modules/home.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js';
import { auth, db, collection, onSnapshot, signInAnonymously, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';

const App = {
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,
    data: {
        houses: [], users: [], tasks: [], employees: [], chat: [],
        spawn_inventory: [], products: [], harvest: [], shipping: []
    },

    init: async () => {
        console.log("App Starting...");
        try {
            await signInAnonymously(auth);
            console.log("Firebase Connected");
        } catch (e) {
            console.error("FB Error:", e);
        }

        App.listenData();
        App.checkLoginState();
        App.bindEvents();
    },

    listenData: () => {
        // 1. Luôn tải danh sách nhân viên để Login
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), (snap) => {
            App.data.employees = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.data.users = App.data.employees; 
            App.renderLoginList();
        });

        // 2. Nếu đã đăng nhập thì tải dữ liệu chính
        if (App.user) {
            const cols = ['houses', 'tasks', 'chat', 'spawn_inventory', 'products', 'harvest_logs', 'shipping'];
            cols.forEach(key => {
                const dataKey = key === 'harvest_logs' ? 'harvest' : key;
                onSnapshot(collection(db, `${ROOT_PATH}/${key}`), (snap) => {
                    let docs = snap.docs.map(d => ({...d.data(), id: d.id}));
                    // Sort chat
                    if(dataKey === 'chat') docs.sort((a,b) => a.time - b.time);
                    App.data[dataKey] = docs;
                    
                    // Vẽ lại giao diện khi có dữ liệu mới
                    App.renderActiveTab();
                });
            });
        }
    },

    renderLoginList: () => {
        const select = document.getElementById('login-user');
        if (select && App.data.users.length > 0) {
            select.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + 
                App.data.users.map(u => `<option value="${u._id}">${u.name} (${u.role || 'NV'})</option>`).join('');
        }
    },

    checkLoginState: () => {
        if (App.user) {
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('head-user').innerText = App.user.name;
            document.getElementById('head-role').innerText = App.user.role;
            
            // --- FIX LỖI MẤT NÚT BÁNH XE ---
            // Kiểm tra không phân biệt hoa thường và đảm bảo user.role tồn tại
            const role = (App.user.role || '').toLowerCase();
            const btnSettings = document.getElementById('btn-settings');
            
            if(['admin', 'quản lý', 'giám đốc'].includes(role)) {
                btnSettings.classList.remove('hidden');
            } else {
                btnSettings.classList.add('hidden');
            }

            // Mở tab mặc định
            App.switchTab('home');
        } else {
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    },

    login: () => {
        const userId = document.getElementById('login-user').value;
        const pin = document.getElementById('login-pin').value;
        if (!userId || !pin) return Utils.toast("Nhập thiếu thông tin!", "err");

        const foundUser = App.data.users.find(u => u._id === userId);
        if (foundUser && String(foundUser.pin) === String(pin)) {
            App.user = foundUser;
            localStorage.setItem('n5_modular_user', JSON.stringify(foundUser));
            location.reload();
        } else {
            Utils.toast("Sai Mã PIN!", "err");
        }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'text-blue-600'));
        
        const viewId = `view-${tabName}`;
        const btn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
        
        if(document.getElementById(viewId)) {
            document.getElementById(viewId).classList.remove('hidden');
            if(btn) btn.classList.add('active', 'text-blue-600');
            App.currentTab = tabName;
            App.renderActiveTab();
        }
    },

    renderActiveTab: () => {
        if(!App.user) return;
        switch(App.currentTab) {
            case 'home': Home.render(App.data, ['Admin','Quản lý'].includes(App.user.role)); break;
            case 'tasks': HR.renderTasks(App.data, App.user); break;
            case 'team': HR.renderTeam(App.data, App.user); break;
            case 'sx': SX.render(App.data); break;
            case 'thdg': THDG.render(App.data, App.user); break;
        }
        // Chat luôn được render ngầm để cập nhật tin mới
        Chat.render(App.data, App.user);
    },

    bindEvents: () => {
        document.getElementById('login-btn').onclick = App.login;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.onclick = () => App.switchTab(btn.dataset.tab));
        document.getElementById('btn-chat').onclick = () => document.getElementById('chat-layer').classList.remove('hidden');
        document.querySelector('[data-action="closeChat"]').onclick = () => document.getElementById('chat-layer').classList.add('hidden');
        document.getElementById('btn-settings').onclick = Admin.openSettings;
    }
};

document.addEventListener('DOMContentLoaded', App.init);
