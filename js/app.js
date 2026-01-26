// ĐƯỜNG DẪN: js/app.js
// 1. Import các Modules (Dùng ./ vì app.js nằm cạnh thư mục modules)
import { Home } from './modules/home.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js';

// 2. Import Config (Dùng ./ vì config.js nằm cạnh app.js)
import { auth, db, collection, onSnapshot, signInAnonymously, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';

const App = {
    // Khởi tạo data rỗng ngay từ đầu để tránh lỗi undefined
    data: {
        houses: [], users: [], tasks: [], employees: [], chat: [],
        spawn_inventory: [], products: [], harvest: [], shipping: []
    },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,
    currentTab: 'home',

    init: async () => {
        console.log("App đã khởi động..."); // Kiểm tra xem file có chạy không
        try {
            await signInAnonymously(auth);
            console.log("Đã kết nối Firebase");
        } catch (e) {
            console.error("Lỗi kết nối:", e);
        }

        App.listenData();
        App.checkLoginState();
        App.bindEvents();
    },

    listenData: () => {
        // Tải danh sách nhân viên
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), (snap) => {
            App.data.employees = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.data.users = App.data.employees; 
            App.renderLoginList();
        });

        // Tải dữ liệu chính (Chỉ khi đã login)
        if (App.user) {
            const cols = ['houses', 'tasks', 'chat', 'spawn_inventory', 'products', 'harvest_logs', 'shipping'];
            cols.forEach(key => {
                const dataKey = key === 'harvest_logs' ? 'harvest' : key;
                onSnapshot(collection(db, `${ROOT_PATH}/${key}`), (snap) => {
                    let docs = snap.docs.map(d => ({...d.data(), id: d.id}));
                    // Riêng chat cần sort theo thời gian
                    if(dataKey === 'chat') docs.sort((a,b) => a.time - b.time);
                    
                    App.data[dataKey] = docs;
                    
                    // Vẽ lại tab đang mở ngay khi có dữ liệu mới
                    App.renderActiveTab();
                });
            });
        }
    },

    renderLoginList: () => {
        const select = document.getElementById('login-user');
        if (select && App.data.users.length > 0) {
            select.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + 
                App.data.users.map(u => `<option value="${u._id}">${u.name}</option>`).join('');
        }
    },

    checkLoginState: () => {
        if (App.user) {
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('head-user').innerText = App.user.name;
            document.getElementById('head-role').innerText = App.user.role;
            
            // Hiện nút cài đặt nếu là quản lý (Không phân biệt hoa thường)
            const role = (App.user.role || '').toLowerCase();
            if(['admin', 'quản lý', 'giám đốc', 'tổ trưởng'].some(r => role.includes(r))) {
                document.getElementById('btn-settings').classList.remove('hidden');
            }

            App.switchTab('home');
        } else {
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    },

    login: () => {
        const userId = document.getElementById('login-user').value;
        const pin = document.getElementById('login-pin').value;
        const foundUser = App.data.users.find(u => u._id === userId);
        
        if (foundUser && String(foundUser.pin) === String(pin)) {
            App.user = foundUser;
            localStorage.setItem('n5_modular_user', JSON.stringify(foundUser));
            location.reload();
        } else {
            Utils.toast("Sai thông tin đăng nhập!", "err");
        }
    },

    switchTab: (tabName) => {
        // 1. Ẩn hết các view
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'text-blue-600'));
        
        // 2. Hiện view được chọn
        const viewId = `view-${tabName}`;
        const targetView = document.getElementById(viewId);
        if(targetView) {
            targetView.classList.remove('hidden');
            
            // Đổi màu nút nav
            const btn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
            if(btn) btn.classList.add('active', 'text-blue-600');
            
            App.currentTab = tabName;
            App.renderActiveTab();
        }
    },

    renderActiveTab: () => {
        if(!App.user) return;
        
        // Gọi render tương ứng, có try-catch để nếu 1 module lỗi thì app không sập
        try {
            switch(App.currentTab) {
                case 'home': Home.render(App.data, true); break;
                case 'tasks': HR.renderTasks(App.data, App.user); break;
                case 'team': HR.renderTeam(App.data, App.user); break;
                case 'sx': SX.render(App.data); break;
                case 'thdg': THDG.render(App.data, App.user); break;
            }
            Chat.render(App.data, App.user); // Chat luôn chạy ngầm
        } catch (err) {
            console.error("Lỗi Render Tab:", err);
        }
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
