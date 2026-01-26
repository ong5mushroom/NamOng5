import { auth, db, collection, onSnapshot, signInAnonymously, onAuthStateChanged, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { Home } from '../modules/home.js';
import { HR } from '../modules/hr.js';
import { SX } from '../modules/sx.js';
import { THDG } from '../modules/thdg.js';
import { Chat } from '../modules/chat.js';
import { Admin } from '../modules/admin.js';

const App = {
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,
    data: {
        houses: [],
        users: [],
        tasks: [],
        employees: [],
        chat: [],
        spawn_inventory: [], // Kho phôi
        products: [], // Danh mục sản phẩm
        harvest: [], // Nhật ký thu hoạch
        shipping: [] // Nhật ký xuất hàng
    },

    init: async () => {
        console.log("App Starting...");
        
        // 1. Đăng nhập ẩn danh vào Firebase
        try {
            await signInAnonymously(auth);
            console.log("Firebase Connected");
        } catch (e) {
            console.error("Firebase Connection Error:", e);
            Utils.toast("Lỗi kết nối Server!", "err");
        }

        // 2. Lắng nghe dữ liệu thời gian thực (Realtime Listeners)
        App.listenData();

        // 3. Xử lý Logic Đăng nhập / Giao diện
        App.checkLoginState();
        App.bindEvents();
    },

    listenData: () => {
        // Tải Danh sách Users (Để Login)
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), (snap) => {
            App.data.employees = snap.docs.map(d => ({...d.data(), _id: d.id}));
            // Map employees sang users để login
            App.data.users = App.data.employees; 
            App.renderLoginList();
        });

        // Chỉ tải dữ liệu nặng khi đã đăng nhập
        if (App.user) {
            const collections = [
                { key: 'houses', path: 'houses' },
                { key: 'tasks', path: 'tasks' },
                { key: 'chat', path: 'chat' },
                { key: 'spawn_inventory', path: 'spawn_inventory' },
                { key: 'products', path: 'products' },
                { key: 'harvest', path: 'harvest_logs' },
                { key: 'shipping', path: 'shipping' }
            ];

            collections.forEach(col => {
                onSnapshot(collection(db, `${ROOT_PATH}/${col.path}`), (snap) => {
                    // Sắp xếp chat theo thời gian
                    if(col.key === 'chat') {
                        App.data[col.key] = snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => a.time - b.time);
                    } else {
                        App.data[col.key] = snap.docs.map(d => ({...d.data(), id: d.id}));
                    }
                    App.renderActiveTab();
                    Utils.toast(`Đã cập nhật: ${col.key}`); // Debug nhẹ
                });
            });
        }
    },

    renderLoginList: () => {
        // FIX LỖI 1: Sửa ID đúng với index.html là 'login-user'
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
            
            // Mở tab mặc định
            App.switchTab('home');
        } else {
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    },

    login: () => {
        const userId = document.getElementById('login-user').value;
        const pin = document.getElementById('login-pin').value;

        if (!userId || !pin) return Utils.toast("Vui lòng nhập đủ thông tin!", "err");

        const foundUser = App.data.users.find(u => u._id === userId);
        
        // Kiểm tra PIN (Lưu ý: chuyển pin nhập vào thành string hoặc number tùy dữ liệu gốc)
        if (foundUser && String(foundUser.pin) === String(pin)) {
            App.user = foundUser;
            localStorage.setItem('n5_modular_user', JSON.stringify(foundUser));
            Utils.toast(`Xin chào, ${foundUser.name}!`);
            location.reload(); // Load lại trang để kích hoạt listeners
        } else {
            Utils.toast("Sai Mã PIN hoặc Tên đăng nhập!", "err");
        }
    },

    switchTab: (tabName) => {
        // Ẩn tất cả view
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'text-blue-600'));
        
        // Hiện view được chọn
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
        
        // Chat render độc lập
        Chat.render(App.data, App.user);
    },

    bindEvents: () => {
        // Nút Login
        document.getElementById('login-btn').onclick = App.login;
        
        // Chuyển Tab
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.onclick = () => App.switchTab(btn.dataset.tab);
        });

        // Chat Toggle
        document.getElementById('btn-chat').onclick = () => document.getElementById('chat-layer').classList.remove('hidden');
        document.querySelector('[data-action="closeChat"]').onclick = () => document.getElementById('chat-layer').classList.add('hidden');
        
        // Admin
        document.getElementById('btn-settings').onclick = Admin.openSettings;
    }
};

// Khởi chạy App
document.addEventListener('DOMContentLoaded', App.init);
