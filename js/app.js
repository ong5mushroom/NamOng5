import { db, getDocs, collection, query, where, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';

// --- BIẾN TOÀN CỤC ---
let currentUser = null;
let currentTab = 'home';

// --- DOM ELEMENTS ---
const els = {
    loginOverlay: document.getElementById('login-overlay'),
    userSelect: document.getElementById('login-user'),
    pinInput: document.getElementById('login-pin'),
    loginBtn: document.getElementById('login-btn'),
    mainApp: document.getElementById('main-app'),
    headerUser: document.getElementById('head-user'),
    headerRole: document.getElementById('head-role'),
    btnSettings: document.getElementById('btn-settings'),
    navBtns: document.querySelectorAll('.nav-btn'),
    views: {
        home: document.getElementById('view-home'),
        tasks: document.getElementById('view-tasks'),
        sx: document.getElementById('view-sx'),
        th: document.getElementById('view-th'),
        team: document.getElementById('view-team')
    }
};

// --- KHỞI TẠO ---
const App = {
    init: async () => {
        await App.loadUsers();
        App.bindEvents();
    },

    loadUsers: async () => {
        try {
            const snap = await getDocs(collection(db, `${ROOT_PATH}/employees`));
            els.userSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + 
                snap.docs.map(d => `<option value="${d.id}" data-pin="${d.data().pin}" data-role="${d.data().role}">${d.data().name}</option>`).join('');
        } catch (e) {
            console.error(e);
            alert("Lỗi tải danh sách nhân viên. Kiểm tra mạng!");
        }
    },

    bindEvents: () => {
        // Đăng nhập
        els.loginBtn.onclick = App.login;
        
        // Chuyển Tab
        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => {
                    b.classList.remove('active', 'text-blue-600');
                    b.classList.add('text-slate-400');
                });
                btn.classList.add('active', 'text-blue-600');
                btn.classList.remove('text-slate-400');
                currentTab = btn.getAttribute('data-tab');
                App.render();
            };
        });

        // Nút Cài Đặt (Xử lý sự kiện click)
        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                Utils.modal("CÀI ĐẶT", `
                    <div class="space-y-3">
                        <button id="st-logout" class="w-full p-3 bg-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2"><i class="fas fa-sign-out-alt"></i> Đăng Xuất</button>
                        <div class="text-center text-xs text-slate-400 pt-2">Phiên bản 2.0 (Role: ${currentUser.role})</div>
                    </div>
                `, []);
                
                // Gắn sự kiện cho nút Đăng xuất trong Modal
                setTimeout(() => {
                    document.getElementById('st-logout').onclick = () => window.location.reload();
                }, 100);
            };
        }
    },

    login: () => {
        const sel = els.userSelect;
        const uid = sel.value;
        const name = sel.options[sel.selectedIndex].text;
        const correctPin = sel.options[sel.selectedIndex].getAttribute('data-pin');
        const role = sel.options[sel.selectedIndex].getAttribute('data-role') || 'Nhân viên';
        const enteredPin = els.pinInput.value;

        if (!uid) return Utils.toast("Chưa chọn nhân viên!", "err");
        if (enteredPin !== correctPin) return Utils.toast("Sai mã PIN!", "err");

        // Đăng nhập thành công
        currentUser = { _id: uid, name, role };
        els.loginOverlay.classList.add('hidden');
        els.headerUser.innerText = name;
        els.headerRole.innerText = role;

        // HIỂN THỊ NÚT CÀI ĐẶT NẾU LÀ ADMIN
        const isManager = ['admin', 'quản lý', 'giám đốc'].some(r => role.toLowerCase().includes(r));
        if (isManager) {
            els.btnSettings.classList.remove('hidden');
        } else {
            els.btnSettings.classList.add('hidden');
        }

        App.render();
    },

    // RENDER DỮ LIỆU
    render: async () => {
        if (!currentUser) return;

        // Ẩn tất cả views
        Object.values(els.views).forEach(el => el.classList.add('hidden'));

        // Load dữ liệu chung (có thể tối ưu cache sau)
        const [hSnap, sSnap, tSnap, eSnap, pSnap, cSnap] = await Promise.all([
            getDocs(collection(db, `${ROOT_PATH}/houses`)),
            getDocs(collection(db, `${ROOT_PATH}/supplies`)),
            getDocs(collection(db, `${ROOT_PATH}/tasks`)),
            getDocs(collection(db, `${ROOT_PATH}/employees`)),
            getDocs(collection(db, `${ROOT_PATH}/products`)),
            getDocs(collection(db, `${ROOT_PATH}/chat`))
        ]);

        const data = {
            houses: hSnap.docs.map(d => ({id: d.id, ...d.data()})),
            supplies: sSnap.docs.map(d => ({_id: d.id, ...d.data()})),
            tasks: tSnap.docs.map(d => ({id: d.id, ...d.data()})),
            employees: eSnap.docs.map(d => ({_id: d.id, ...d.data()})),
            products: pSnap.docs.map(d => ({_id: d.id, ...d.data()})),
            chat: cSnap.docs.map(d => ({id: d.id, ...d.data()}))
        };

        // Render View hiện tại
        switch (currentTab) {
            case 'home':
                els.views.home.classList.remove('hidden');
                els.views.home.innerHTML = `
                    <div class="p-4 space-y-4">
                        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl text-white shadow-lg">
                            <h2 class="text-lg font-bold">Xin chào, ${currentUser.name}! 👋</h2>
                            <p class="text-blue-100 text-xs mt-1">Chúc bạn một ngày làm việc hiệu quả.</p>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                                <span class="text-3xl">🍄</span>
                                <span class="font-bold text-slate-600 text-xs">Sản Xuất</span>
                                <b class="text-xl text-blue-600">${data.houses.filter(h=>h.status==='ACTIVE').length} Nhà</b>
                            </div>
                            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                                <span class="text-3xl">👥</span>
                                <span class="font-bold text-slate-600 text-xs">Nhân Sự</span>
                                <b class="text-xl text-green-600">${data.employees.length} NV</b>
                            </div>
                        </div>
                    </div>`;
                break;
            case 'tasks':
                els.views.tasks.classList.remove('hidden');
                HR.renderTasks(data, currentUser);
                break;
            case 'sx':
                els.views.sx.classList.remove('hidden');
                SX.render(data, currentUser);
                break;
            case 'th':
                els.views.th.classList.remove('hidden');
                THDG.render(data, currentUser);
                break;
            case 'team':
                els.views.team.classList.remove('hidden');
                HR.renderTeam(data, currentUser);
                break;
        }
    }
};

// Chạy App
window.onload = App.init;
