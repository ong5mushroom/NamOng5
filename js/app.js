import { db, getDocs, collection, query, where, ROOT_PATH } from './config.js?v=force_xiaomi';
import { Utils } from './utils.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';

// --- CẤU HÌNH ---
let currentUser = null;
let currentTab = 'tasks'; // MẶC ĐỊNH VÀO THẺ VIỆC (BỎ HOME)

const els = {
    loginOverlay: document.getElementById('login-overlay'),
    userSelect: document.getElementById('login-user'),
    pinInput: document.getElementById('login-pin'),
    loginBtn: document.getElementById('login-btn'),
    headerUser: document.getElementById('head-user'),
    headerRole: document.getElementById('head-role'),
    btnSettings: document.getElementById('btn-settings'),
    navBtns: document.querySelectorAll('.nav-btn'),
    views: {
        tasks: document.getElementById('view-tasks'),
        sx: document.getElementById('view-sx'),
        th: document.getElementById('view-th'),
        team: document.getElementById('view-team')
    }
};

// --- LOGIC XUẤT BÁO CÁO (CSV) ---
const exportReport = async (type) => {
    try {
        const now = new Date();
        const timeStr = type === 'NGAY' ? `${now.getDate()}_${now.getMonth()+1}` : `${now.getMonth()+1}_${now.getFullYear()}`;
        let csv = "data:text/csv;charset=utf-8,\uFEFF"; // BOM cho Excel đọc tiếng Việt
        csv += "Loai,Noi Dung,Nguoi Lam,Thoi Gian,Trang Thai/Ket Qua\n";

        // Lấy dữ liệu
        const [tSnap, hSnap] = await Promise.all([
            getDocs(collection(db, `${ROOT_PATH}/tasks`)),
            getDocs(collection(db, `${ROOT_PATH}/harvest_logs`))
        ]);

        // 1. Lọc Task
        tSnap.forEach(d => {
            const val = d.data();
            const t = new Date(val.time);
            const match = type === 'NGAY' 
                ? (t.getDate() === now.getDate() && t.getMonth() === now.getMonth())
                : (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear());
            
            if(match) csv += `CONG VIEC,"${val.title}",${val.by},${t.toLocaleString('vi-VN')},${val.status}\n`;
        });

        // 2. Lọc Thu Hoạch
        hSnap.forEach(d => {
            const val = d.data();
            const t = new Date(val.time);
            const match = type === 'NGAY' 
                ? (t.getDate() === now.getDate() && t.getMonth() === now.getMonth())
                : (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear());

            if(match) csv += `THU HOACH,"${val.area} (${val.total}kg)",${val.user},${t.toLocaleString('vi-VN')},"${Object.keys(val.details).join(', ')}"\n`;
        });

        // Tải xuống
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `BaoCao_${type}_${timeStr}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
    } catch(e) { alert("Lỗi xuất file: " + e.message); }
};

const App = {
    init: async () => {
        await App.loadUsers();
        
        // Xử lý Login
        els.loginBtn.onclick = () => {
            const uid = els.userSelect.value;
            const pin = els.pinInput.value;
            const opt = els.userSelect.options[els.userSelect.selectedIndex];
            
            if(!uid || pin !== opt.getAttribute('data-pin')) return Utils.toast("Sai thông tin!", "err");
            
            currentUser = { _id: uid, name: opt.text, role: opt.getAttribute('data-role') };
            els.loginOverlay.classList.add('hidden');
            els.headerUser.innerText = currentUser.name;
            els.headerRole.innerText = currentUser.role;
            
            // Hiện nút cài đặt nếu là Quản lý
            if(['admin','quản lý','giám đốc','kế toán'].some(r => currentUser.role.toLowerCase().includes(r))) {
                els.btnSettings.classList.remove('hidden');
            }
            
            App.render();
        };

        // Xử lý Nút Cài Đặt (Bánh xe)
        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                const isBoss = ['admin','quản lý','giám đốc','kế toán'].some(r => currentUser.role.toLowerCase().includes(r));
                
                let html = `<div class="space-y-3">`;
                if(isBoss) {
                    html += `
                    <div class="text-[10px] font-bold text-slate-400 uppercase">BÁO CÁO</div>
                    <div class="grid grid-cols-2 gap-2">
                        <button id="btn-rp-day" class="p-3 bg-green-50 text-green-700 rounded-lg font-bold text-xs border border-green-200">📅 Báo cáo NGÀY</button>
                        <button id="btn-rp-month" class="p-3 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs border border-blue-200">🗓️ Báo cáo THÁNG</button>
                    </div>
                    <hr class="border-dashed">`;
                }
                html += `<button id="btn-logout" class="w-full p-3 bg-red-50 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><i class="fas fa-sign-out-alt"></i> ĐĂNG XUẤT</button></div>`;

                Utils.modal("CÀI ĐẶT", html, []);

                // Gắn sự kiện cho nút trong Modal
                setTimeout(() => {
                    const bDay = document.getElementById('btn-rp-day');
                    const bMonth = document.getElementById('btn-rp-month');
                    const bOut = document.getElementById('btn-logout');
                    
                    if(bDay) bDay.onclick = () => exportReport('NGAY');
                    if(bMonth) bMonth.onclick = () => exportReport('THANG');
                    if(bOut) bOut.onclick = () => window.location.reload();
                }, 100);
            };
        }

        // Chuyển Tab
        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => { b.classList.remove('text-blue-600','active'); b.classList.add('text-slate-400'); });
                btn.classList.add('text-blue-600','active'); btn.classList.remove('text-slate-400');
                currentTab = btn.getAttribute('data-tab');
                App.render();
            }
        });
        
        // Active tab Việc đầu tiên
        const tBtn = document.querySelector('.nav-btn[data-tab="tasks"]');
        if(tBtn) tBtn.click();
    },

    loadUsers: async () => {
        try {
            const s = await getDocs(collection(db, `${ROOT_PATH}/employees`));
            els.userSelect.innerHTML = '<option value="">-- Chọn NV --</option>' + s.docs.map(d=>`<option value="${d.id}" data-pin="${d.data().pin}" data-role="${d.data().role}">${d.data().name}</option>`).join('');
        } catch(e) {}
    },

    render: async () => {
        if(!currentUser) return;
        Object.values(els.views).forEach(e => { if(e) e.classList.add('hidden') }); // Ẩn hết
        
        // Load Data
        const [h, s, t, e, p, c] = await Promise.all([
            getDocs(collection(db, `${ROOT_PATH}/houses`)),
            getDocs(collection(db, `${ROOT_PATH}/supplies`)),
            getDocs(collection(db, `${ROOT_PATH}/tasks`)),
            getDocs(collection(db, `${ROOT_PATH}/employees`)),
            getDocs(collection(db, `${ROOT_PATH}/products`)),
            getDocs(collection(db, `${ROOT_PATH}/chat`))
        ]);
        
        const d = {
            houses: h.docs.map(x=>({id:x.id,...x.data()})),
            supplies: s.docs.map(x=>({_id:x.id,...x.data()})),
            tasks: t.docs.map(x=>({id:x.id,...x.data()})),
            employees: e.docs.map(x=>({_id:x.id,...x.data()})),
            products: p.docs.map(x=>({_id:x.id,...x.data()})),
            chat: c.docs.map(x=>({id:x.id,...x.data()}))
        };

        const v = els.views[currentTab];
        if(v) {
            v.classList.remove('hidden');
            if(currentTab === 'tasks') HR.renderTasks(d, currentUser);
            if(currentTab === 'sx') SX.render(d, currentUser);
            if(currentTab === 'th') THDG.render(d, currentUser);
            if(currentTab === 'team') HR.renderTeam(d, currentUser);
        }
    }
};

window.onload = App.init;
