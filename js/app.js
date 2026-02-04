import { auth, db, getDocs, collection, query, where, signInAnonymously, onAuthStateChanged, ROOT_PATH } from './config.js?v=final_fix';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { Utils } from './utils.js';

// --- BIẾN TOÀN CỤC ---
let currentUser = null;
let currentTab = 'tasks';
let appData = {}; // Bộ nhớ đệm dữ liệu

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
        let csv = "data:text/csv;charset=utf-8,\uFEFF"; 
        csv += "Loai,Noi Dung,Nguoi Lam,Thoi Gian,Trang Thai/Ket Qua\n";

        const [tSnap, hSnap] = await Promise.all([
            getDocs(collection(db, `${ROOT_PATH}/tasks`)),
            getDocs(collection(db, `${ROOT_PATH}/harvest_logs`))
        ]);

        tSnap.forEach(d => {
            const val = d.data();
            const t = new Date(val.time);
            const match = type === 'NGAY' 
                ? (t.getDate() === now.getDate() && t.getMonth() === now.getMonth())
                : (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear());
            
            if(match) csv += `CONG VIEC,"${val.title}",${val.by},${t.toLocaleString('vi-VN')},${val.status}\n`;
        });

        hSnap.forEach(d => {
            const val = d.data();
            const t = new Date(val.time);
            const match = type === 'NGAY' 
                ? (t.getDate() === now.getDate() && t.getMonth() === now.getMonth())
                : (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear());

            if(match) csv += `THU HOACH,"${val.area} (${val.total}kg)",${val.user},${t.toLocaleString('vi-VN')},"${Object.keys(val.details).join(', ')}"\n`;
        });

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `BaoCao_${type}_${timeStr}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
    } catch(e) { alert("Lỗi xuất file: " + e.message); }
};

const App = {
    init: () => {
        console.log("App Starting...");
        
        // BƯỚC 1: Đăng nhập ẩn danh vào Firebase trước
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Firebase Connected:", user.uid);
                // Kết nối xong mới tải danh sách -> Tránh lỗi Xiaomi
                App.loadUsers();
            } else {
                signInAnonymously(auth).catch((e) => alert("Lỗi kết nối: " + e.message));
            }
        });

        // BƯỚC 2: Gắn sự kiện nút bấm
        els.loginBtn.onclick = App.login;

        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                const isBoss = ['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser?.role||'').toLowerCase().includes(r));
                
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

        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => { 
                    b.classList.remove('active'); 
                    b.querySelector('i').className = b.querySelector('i').className.replace(/text-\w+-\d+/g, 'text-slate-400'); // Reset màu icon
                });
                
                btn.classList.add('active');
                
                // Đổi màu icon active
                const icon = btn.querySelector('i');
                const tab = btn.getAttribute('data-tab');
                if(tab === 'tasks') icon.classList.replace('text-slate-400', 'text-blue-600');
                if(tab === 'sx') icon.classList.replace('text-slate-400', 'text-green-600');
                if(tab === 'th') icon.classList.replace('text-slate-400', 'text-orange-500');
                if(tab === 'team') icon.classList.replace('text-slate-400', 'text-purple-600');

                currentTab = tab;
                App.render();
            }
        });
    },

    loadUsers: async () => {
        try {
            els.userSelect.innerHTML = '<option>Đang tải...</option>';
            const s = await getDocs(collection(db, `${ROOT_PATH}/employees`));
            
            if (s.empty) throw new Error("Empty list");

            els.userSelect.innerHTML = '<option value="">-- Chọn NV --</option>' + 
                s.docs.map(d=>`<option value="${d.id}" data-pin="${d.data().pin}" data-role="${d.data().role}">${d.data().name}</option>`).join('');
        } catch(e) {
            console.error(e);
            // --- CHẾ ĐỘ CỨU HỘ (NHẬP TAY) ---
            els.userSelect.innerHTML = '<option value="">⚠ Lỗi tải danh sách</option>';
            if (!document.getElementById('manual-login-container')) {
                const div = document.createElement('div');
                div.id = 'manual-login-container';
                div.className = 'mt-4 pt-4 border-t border-slate-700';
                div.innerHTML = `
                    <p class="text-white text-xs mb-2 text-center">Không thấy tên? Nhập tay:</p>
                    <input id="manual-name" placeholder="Tên (VD: Admin)" class="w-full p-3 rounded-xl mb-2 font-bold text-slate-800">
                    <button id="btn-manual-login" class="w-full bg-slate-600 text-white py-2 rounded-xl font-bold text-sm">VÀO THỦ CÔNG</button>
                `;
                els.loginOverlay.querySelector('.w-full.max-w-sm').appendChild(div);
                
                document.getElementById('btn-manual-login').onclick = () => {
                    const name = document.getElementById('manual-name').value;
                    const pin = els.pinInput.value;
                    if (!name || !pin) return Utils.toast("Nhập Tên và PIN!", "err");
                    
                    // Cấp quyền tạm thời dựa trên PIN
                    let role = 'nhân viên';
                    if (pin === '1234' || pin === '9999') role = 'admin';
                    
                    currentUser = { _id: 'manual_'+Date.now(), name, role };
                    App.loginSuccess();
                };
            }
            Utils.toast("Mạng yếu: Đã bật nhập thủ công!", "err");
        }
    },

    login: () => {
        const uid = els.userSelect.value;
        const pin = els.pinInput.value;
        
        if(!uid) return Utils.toast("Chưa chọn nhân viên!", "err");
        
        const opt = els.userSelect.options[els.userSelect.selectedIndex];
        if(pin !== opt.getAttribute('data-pin')) {
            els.pinInput.value = '';
            return Utils.toast("Sai mã PIN!", "err");
        }
        
        currentUser = { _id: uid, name: opt.text, role: opt.getAttribute('data-role') };
        App.loginSuccess();
    },

    loginSuccess: () => {
        els.loginOverlay.classList.add('hidden');
        els.headerUser.innerText = currentUser.name;
        els.headerRole.innerText = (currentUser.role || 'Nhân viên').toUpperCase();
        
        if(['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser.role||'').toLowerCase().includes(r))) {
            els.btnSettings.classList.remove('hidden');
        }

        // Mặc định vào tab Việc
        document.querySelector('.nav-btn[data-tab="tasks"]').click();
    },

    render: async () => {
        if(!currentUser) return;
        
        // Ẩn tất cả view trước khi load
        Object.values(els.views).forEach(e => { if(e) e.classList.add('hidden') }); 
        
        // Hiện loader (nếu cần)
        // ...

        try {
            // Tải dữ liệu song song
            const [h, s, t, e, p, c] = await Promise.all([
                getDocs(collection(db, `${ROOT_PATH}/houses`)),
                getDocs(collection(db, `${ROOT_PATH}/supplies`)),
                getDocs(collection(db, `${ROOT_PATH}/tasks`)),
                getDocs(collection(db, `${ROOT_PATH}/employees`)),
                getDocs(collection(db, `${ROOT_PATH}/products`)),
                getDocs(collection(db, `${ROOT_PATH}/chat`))
            ]);
            
            // --- KHỚP ID CHO ĐÚNG CHUẨN (Quan trọng) ---
            appData = {
                houses: h.docs.map(x=>({id:x.id, ...x.data()})),
                supplies: s.docs.map(x=>({_id:x.id, ...x.data()})), // Supplies dùng _id
                tasks: t.docs.map(x=>({id:x.id, ...x.data()})),
                employees: e.docs.map(x=>({_id:x.id, ...x.data()})), // Employees dùng _id
                products: p.docs.map(x=>({id:x.id, ...x.data()})),   // QUAN TRỌNG: Products phải dùng id (không gạch dưới) để khớp với thdg.js
                chat: c.docs.map(x=>({id:x.id, ...x.data()}))
            };

            const v = els.views[currentTab];
            if(v) {
                v.classList.remove('hidden');
                if(currentTab === 'tasks') HR.renderTasks(appData, currentUser);
                if(currentTab === 'sx') SX.render(appData, currentUser);
                if(currentTab === 'th') THDG.render(appData, currentUser);
                if(currentTab === 'team') HR.renderTeam(appData, currentUser);
            }
        } catch(err) {
            console.error(err);
            Utils.toast("Lỗi tải dữ liệu: " + err.message, "err");
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
