import { auth, db, getDocs, collection, query, where, signInAnonymously, onAuthStateChanged, onSnapshot, ROOT_PATH } from './config.js?v=final_fix_realtime';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { Utils } from './utils.js';

// --- BIẾN TOÀN CỤC ---
let currentUser = null;
let currentTab = 'tasks';
let appData = {}; // Bộ nhớ đệm dữ liệu (Tự động cập nhật)

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

// --- LOGIC XUẤT BÁO CÁO (Giữ nguyên của bạn) ---
const exportReport = async (type) => {
    try {
        const now = new Date();
        const timeStr = type === 'NGAY' ? `${now.getDate()}_${now.getMonth()+1}` : `${now.getMonth()+1}_${now.getFullYear()}`;
        let csv = "data:text/csv;charset=utf-8,\uFEFF"; 
        csv += "Loai,Noi Dung,Nguoi Lam,Thoi Gian,Trang Thai/Ket Qua\n";

        // Lấy dữ liệu mới nhất từ Cache
        const tasks = appData.tasks || [];
        const logs = appData.harvest_logs || [];

        tasks.forEach(val => {
            const t = new Date(val.time);
            const match = type === 'NGAY' 
                ? (t.getDate() === now.getDate() && t.getMonth() === now.getMonth())
                : (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear());
            if(match) csv += `CONG VIEC,"${val.title}",${val.by},${t.toLocaleString('vi-VN')},${val.status}\n`;
        });

        logs.forEach(val => {
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

        // 1. TỰ ĐỘNG ĐĂNG NHẬP (Fix lỗi Reload bị thoát)
        const savedUser = localStorage.getItem('ong5_user');
        if(savedUser) {
            currentUser = JSON.parse(savedUser);
            App.loginSuccess(true); // true = Đăng nhập âm thầm, không cần render lại login form
        }

        // 2. KẾT NỐI FIREBASE & LẮNG NGHE REALTIME
        onAuthStateChanged(auth, (user) => {
            if (user) {
                App.loadUsers(); // Chỉ tải list user để dự phòng
                App.listenRealtime(); // <--- QUAN TRỌNG: Kích hoạt chế độ tự động cập nhật
            } else {
                signInAnonymously(auth).catch((e) => alert("Lỗi kết nối: " + e.message));
            }
        });

        App.bindEvents();
    },

    // --- HÀM MỚI: LẮNG NGHE DỮ LIỆU TỰ ĐỘNG & RUNG CHUÔNG ---
    listenRealtime: () => {
        const collections = ['tasks', 'chat', 'houses', 'supplies', 'products', 'harvest_logs', 'employees'];
        
        collections.forEach(colName => {
            onSnapshot(collection(db, `${ROOT_PATH}/${colName}`), (snap) => {
                // 1. Rung chuông nếu có dữ liệu mới (Tasks hoặc Chat)
                snap.docChanges().forEach((change) => {
                    if (change.type === "added" && !snap.metadata.hasPendingWrites) {
                        if(colName === 'tasks' || colName === 'chat') Utils.notifySound();
                    }
                });

                // 2. Cập nhật dữ liệu vào biến toàn cục appData
                // LƯU Ý QUAN TRỌNG: Mapping ID chuẩn để khớp với thdg.js
                appData[colName] = snap.docs.map(d => {
                    const data = d.data();
                    return { ...data, id: d.id, _id: d.id }; // Gán cả id và _id để module nào dùng kiểu gì cũng được
                });

                // 3. Vẽ lại giao diện ngay lập tức
                App.render();
            });
        });
    },

    loadUsers: async () => {
        try {
            if(els.userSelect.options.length > 2) return; // Đã tải rồi thì thôi
            els.userSelect.innerHTML = '<option>Đang tải...</option>';
            const s = await getDocs(collection(db, `${ROOT_PATH}/employees`));
            
            if (s.empty) throw new Error("Empty list");

            els.userSelect.innerHTML = '<option value="">-- Chọn NV --</option>' + 
                s.docs.map(d=>`<option value="${d.id}" data-pin="${d.data().pin}" data-role="${d.data().role}">${d.data().name}</option>`).join('');
        } catch(e) {
            // --- CHẾ ĐỘ CỨU HỘ (NHẬP TAY) CHO XIAOMI ---
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
        
        // Ưu tiên check nhập tay trước
        const manualName = document.getElementById('manual-name')?.value;
        if(manualName && (pin === '1234' || pin === '9999')) {
             currentUser = { _id: 'manual', name: manualName, role: 'admin' };
             App.loginSuccess();
             return;
        }

        if(!uid) return Utils.toast("Chưa chọn nhân viên!", "err");
        const opt = els.userSelect.options[els.userSelect.selectedIndex];
        if(pin !== opt.getAttribute('data-pin')) {
            els.pinInput.value = '';
            return Utils.toast("Sai mã PIN!", "err");
        }
        
        currentUser = { _id: uid, name: opt.text, role: opt.getAttribute('data-role') };
        App.loginSuccess();
    },

    loginSuccess: (isAuto = false) => {
        // LƯU LOGIN VÀO MÁY
        localStorage.setItem('ong5_user', JSON.stringify(currentUser));

        els.loginOverlay.classList.add('hidden');
        els.headerUser.innerText = currentUser.name;
        els.headerRole.innerText = (currentUser.role || 'Nhân viên').toUpperCase();
        
        if(['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser.role||'').toLowerCase().includes(r))) {
            els.btnSettings.classList.remove('hidden');
        }

        if(!isAuto) {
            document.querySelector('.nav-btn[data-tab="tasks"]').click();
        }
    },

    // Hàm render giờ rất gọn nhẹ vì dữ liệu đã có sẵn trong appData
    render: () => {
        if(!currentUser) return;
        const v = els.views[currentTab];
        if(v && !v.classList.contains('hidden')) {
            if(currentTab === 'tasks') HR.renderTasks(appData, currentUser);
            if(currentTab === 'sx') SX.render(appData, currentUser);
            if(currentTab === 'th') THDG.render(appData, currentUser);
            if(currentTab === 'team') HR.renderTeam(appData, currentUser);
        }
    },

    bindEvents: () => {
        els.loginBtn.onclick = App.login;
        
        // Xử lý nút Settings
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
                    if(bOut) bOut.onclick = () => {
                        localStorage.removeItem('ong5_user'); // Xóa nhớ khi đăng xuất
                        window.location.reload();
                    }
                }, 100);
            };
        }

        // Xử lý chuyển Tab
        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => { 
                    b.classList.remove('active'); 
                    b.querySelector('i').className = b.querySelector('i').className.replace(/text-\w+-\d+/g, 'text-slate-400');
                });
                btn.classList.add('active');
                
                const icon = btn.querySelector('i');
                const tab = btn.getAttribute('data-tab');
                if(tab === 'tasks') icon.classList.replace('text-slate-400', 'text-blue-600');
                if(tab === 'sx') icon.classList.replace('text-slate-400', 'text-green-600');
                if(tab === 'th') icon.classList.replace('text-slate-400', 'text-orange-500');
                if(tab === 'team') icon.classList.replace('text-slate-400', 'text-purple-600');

                // Ẩn hiện view
                Object.values(els.views).forEach(e => e.classList.add('hidden'));
                els.views[tab].classList.remove('hidden');

                currentTab = tab;
                App.render();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', App.init);
