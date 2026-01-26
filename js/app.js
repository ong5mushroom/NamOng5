// ĐƯỜNG DẪN FILE: js/app.js

// 1. Import Modules: Dùng ./modules/... vì thư mục modules nằm ngay cạnh file này
import { Home } from './modules/home.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js';

// 2. Import Config/Utils: Dùng ./... vì nó nằm cùng thư mục js
import { auth, db, collection, onSnapshot, signInAnonymously, onAuthStateChanged, ROOT_PATH } from './config.js';
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
            console.error(e);
            Utils.toast("Lỗi kết nối Server!", "err");
        }

        App.listenData();
        App.checkLoginState();
        App.bindEvents();
    },

    listenData: () => {
        // Tải User để login
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), (snap) => {
            App.data.employees = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.data.users = App.data.employees; 
            App.renderLoginList();
        });

        // Chỉ tải dữ liệu nặng khi đã đăng nhập
        if (App.user) {
            const cols = ['houses', 'tasks', 'chat', 'spawn_inventory', 'products', 'harvest_logs', 'shipping'];
            cols.forEach(key => {
                // Map harvest_logs về key harvest trong data
                const dataKey = key === 'harvest_logs' ? 'harvest' : key;
                onSnapshot(collection(db, `${ROOT_PATH}/${key}`), (snap) => {
                    let docs = snap.docs.map(d => ({...d.data(), id: d.id}));
                    if(dataKey === 'chat') docs.sort((a,b) => a.time - b.time);
                    App.data[dataKey] = docs;
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
            if(['Admin','Quản lý'].includes(App.user.role)) document.getElementById('btn-settings').classList.remove('hidden');
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
