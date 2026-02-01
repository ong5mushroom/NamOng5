import { db, getDocs, collection, query, where, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';

// --- BIẾN TOÀN CỤC ---
let currentUser = null;
let currentTab = 'tasks'; // Mặc định vào Tab Việc luôn

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
        // home: document.getElementById('view-home'), // Đã bỏ Home
        tasks: document.getElementById('view-tasks'),
        sx: document.getElementById('view-sx'),
        th: document.getElementById('view-th'),
        team: document.getElementById('view-team')
    }
};

// --- HÀM XUẤT BÁO CÁO (CSV) ---
const exportCSV = async (type) => {
    try {
        const now = new Date();
        const fileName = `BaoCao_${type}_${now.getDate()}_${now.getMonth()+1}.csv`;
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Tiêu đề cột
        csvContent += "Loai,Noi Dung,Nguoi Thuc Hien,Thoi Gian,So Luong/Ghi Chu\n";

        // Lấy dữ liệu từ Firebase
        const [tSnap, hSnap] = await Promise.all([
            getDocs(collection(db, `${ROOT_PATH}/tasks`)),
            getDocs(collection(db, `${ROOT_PATH}/harvest_logs`))
        ]);

        // 1. Dữ liệu Công Việc
        tSnap.forEach(doc => {
            const d = doc.data();
            const date = new Date(d.time);
            // Lọc theo Ngày hoặc Tháng
            const isMatch = type === 'NGAY' 
                ? (date.getDate() === now.getDate() && date.getMonth() === now.getMonth())
                : (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear());
            
            if(isMatch) {
                csvContent += `VIEC,${d.title},${d.by},${date.toLocaleString('vi-VN')},${d.status}\n`;
            }
        });

        // 2. Dữ liệu Thu Hoạch
        hSnap.forEach(doc => {
            const d = doc.data();
            const date = new Date(d.time);
            const isMatch = type === 'NGAY' 
                ? (date.getDate() === now.getDate() && date.getMonth() === now.getMonth())
                : (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear());

            if(isMatch) {
                csvContent += `THU HOACH,${d.area} (${d.total}kg),${d.user},${date.toLocaleString('vi-VN')},Chi tiet: ${JSON.stringify(d.details)}\n`;
            }
        });

        // Tải xuống
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        
        Utils.toast(`✅ Đã tải báo cáo ${type}!`);
    } catch (e) {
        alert("Lỗi xuất file: " + e.message);
    }
};

// --- KHỞI TẠO ---
const App = {
    init: async () => {
        await App.loadUsers();
        App.bindEvents();
        
        // Auto active tab đầu tiên nếu chưa có class active
        const firstBtn = document.querySelector('.nav-btn[data-tab="tasks"]');
        if(firstBtn) firstBtn.classList.add('active', 'text-blue-600');
    },

    loadUsers: async () => {
        try {
            const snap = await getDocs(collection(db, `${ROOT_PATH}/employees`));
            els.userSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + 
                snap.docs.map(d => `<option value="${d.id}" data-pin="${d.data().pin}" data-role="${d.data().role}">${d.data().name}</option>`).join('');
        } catch (e) { console.error(e); }
    },

    bindEvents: () => {
        els.loginBtn.onclick = App.login;
        
        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => { b.classList.remove('active', 'text-blue-600'); b.classList.add('text-slate-400'); });
                btn.classList.add('active', 'text-blue-600'); btn.classList.remove('text-slate-400');
                currentTab = btn.getAttribute('data-tab');
                App.render();
            };
        });

        // NÚT CÀI ĐẶT & BÁO CÁO
        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                const role = currentUser.role || '';
                const isBoss = ['admin', 'giám đốc', 'quản lý', 'kế toán'].some(r => role.toLowerCase().includes(r));
                
                // HTML Menu
                let menuHTML = `<div class="space-y-3">`;
                
                if (isBoss) {
                    menuHTML += `
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Xuất Báo Cáo</div>
                        <div class="grid grid-cols-2 gap-2">
                            <button id="rp-day" class="p-3 bg-green-50 text-green-700 rounded-xl font-bold text-xs border border-green-200 hover:bg-green-100"><i class="fas fa-calendar-day"></i> Báo Cáo NGÀY</button>
                            <button id="rp-month" class="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs border border-blue-200 hover:bg-blue-100"><i class="fas fa-calendar-alt"></i> Báo Cáo THÁNG</button>
                        </div>
                        <div class="border-b border-dashed border-slate-200 my-2"></div>
                    `;
                }

                menuHTML += `
                    <button id="st-logout" class="w-full p-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-100 hover:bg-red-100"><i class="fas fa-sign-out-alt"></i> Đăng Xuất</button>
                    <div class="text-center text-[10px] text-slate-400 pt-2">Phiên bản 3.0</div>
                </div>`;

                Utils.modal("CÀI ĐẶT & BÁO CÁO", menuHTML, []);
                
                // Gắn sự kiện
                setTimeout(() => {
                    const btnDay = document.getElementById('rp-day');
                    const btnMonth = document.getElementById('rp-month');
                    const btnOut = document.getElementById('st-logout');

                    if(btnDay) btnDay.onclick = () => exportCSV('NGAY');
                    if(btnMonth) btnMonth.onclick = () => exportCSV('THANG');
                    if(btnOut) btnOut.onclick = () => window.location.reload();
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

        if (!uid || enteredPin !== correctPin) return Utils.toast("Sai thông tin!", "err");

        currentUser = { _id: uid, name, role };
        els.loginOverlay.classList.add('hidden');
        els.headerUser.innerText = name;
        els.headerRole.innerText = role;

        const isManager = ['admin', 'quản lý', 'giám đốc', 'kế toán'].some(r => role.toLowerCase().includes(r));
        if (isManager) els.btnSettings.classList.remove('hidden');
        else els.btnSettings.classList.add('hidden');

        App.render();
    },

    render: async () => {
        if (!currentUser) return;
        Object.values(els.views).forEach(el => { if(el) el.classList.add('hidden'); });

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

        const view = els.views[currentTab];
        if (view) {
            view.classList.remove('hidden');
            if (currentTab === 'tasks') HR.renderTasks(data, currentUser);
            else if (currentTab === 'sx') SX.render(data, currentUser);
            else if (currentTab === 'th') THDG.render(data, currentUser);
            else if (currentTab === 'team') HR.renderTeam(data, currentUser);
        }
    }
};

window.onload = App.init;
