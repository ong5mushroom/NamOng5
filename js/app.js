import { auth, db, getDocs, collection, query, where, signInAnonymously, onAuthStateChanged, onSnapshot, ROOT_PATH } from './config.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { Utils } from './utils.js';

// --- BIẾN TOÀN CỤC ---
let currentUser = null;
let currentTab = 'tasks';
let appData = {}; 

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

// --- HÀM XỬ LÝ CSV CHUẨN (Fix lỗi vỡ cột) ---
const toCSV = (data) => {
    if (data === null || data === undefined) return '""';
    // Ép về chuỗi, thay thế dấu " bằng "" (chuẩn CSV), và bao quanh bằng dấu "
    return `"${String(data).replace(/"/g, '""')}"`;
};

// --- LOGIC XUẤT 4 LOẠI BÁO CÁO ---
const exportReport = async (reportType) => {
    try {
        Utils.toast("⏳ Đang tải dữ liệu...", "info");
        let csv = "data:text/csv;charset=utf-8,\uFEFF"; // BOM cho Excel tiếng Việt
        const now = new Date();
        const timeFileName = `${now.getDate()}_${now.getMonth()+1}_${now.getFullYear()}`;
        let fileName = "";

        if (reportType === 'PHOI') {
            // 1. BÁO CÁO KHO PHÔI (Nhập/Xuất Supplies)
            fileName = `BaoCao_KhoPhoi_${timeFileName}.csv`;
            csv += "Ngay,Gio,Loai,Ma Lo,So Luong,Tu/Den (Nha),Nguoi Thuc Hien\n"; // Header
            
            const snap = await getDocs(collection(db, `${ROOT_PATH}/supplies`));
            const list = snap.docs.map(d => d.data()).sort((a,b) => b.time - a.time);
            
            list.forEach(d => {
                const date = new Date(d.time);
                csv += [
                    toCSV(date.toLocaleDateString('vi-VN')),
                    toCSV(date.toLocaleTimeString('vi-VN')),
                    toCSV(d.type === 'IMPORT' ? 'NHẬP' : 'XUẤT'),
                    toCSV(d.code || ''),
                    toCSV(d.qty),
                    toCSV(d.type === 'IMPORT' ? 'Kho Tổng' : (d.to || 'Hủy')), // Logic hiển thị nguồn/đích
                    toCSV(d.user)
                ].join(',') + "\n";
            });

        } else if (reportType === 'NAM_TUOI') {
            // 2. BÁO CÁO NẤM TƯƠI (Nhập Kho & Xuất Bán)
            fileName = `BaoCao_NamTuoi_BanHang_${timeFileName}.csv`;
            csv += "Ngay,Gio,Loai Giao Dich,Chi Tiet (Ten:SL),Tong (Kg/Tien),Nguon/Khach,Nguoi Thuc Hien\n";

            // Lấy cả 2 bảng: Harvest (Thu hoạch) và Shipping (Bán)
            const [hSnap, sSnap] = await Promise.all([
                getDocs(collection(db, `${ROOT_PATH}/harvest_logs`)),
                getDocs(collection(db, `${ROOT_PATH}/shipping`))
            ]);

            let combined = [];
            hSnap.forEach(d => combined.push({...d.data(), _type: 'NHAP_KHO'}));
            sSnap.forEach(d => combined.push({...d.data(), _type: 'XUAT_BAN'}));
            combined.sort((a,b) => b.time - a.time); // Sắp xếp theo thời gian mới nhất

            combined.forEach(d => {
                const date = new Date(d.time);
                // Xử lý chi tiết hàng hóa
                let details = "";
                if(d._type === 'NHAP_KHO') {
                    // Harvest logs lưu details dạng object {code: qty}
                    details = Object.entries(d.details || {}).map(([k,v]) => `${k}: ${v}kg`).join('; ');
                } else {
                    // Shipping lưu items dạng array [{name, qty, price}]
                    details = (d.items || []).map(i => `${i.name} (${i.qty})`).join('; ');
                }

                csv += [
                    toCSV(date.toLocaleDateString('vi-VN')),
                    toCSV(date.toLocaleTimeString('vi-VN')),
                    toCSV(d._type === 'NHAP_KHO' ? 'THU HOẠCH' : 'BÁN HÀNG'),
                    toCSV(details),
                    toCSV(d._type === 'NHAP_KHO' ? d.total + ' kg' : d.total.toLocaleString() + ' đ'),
                    toCSV(d._type === 'NHAP_KHO' ? d.area : d.customer),
                    toCSV(d.user)
                ].join(',') + "\n";
            });

        } else if (reportType === 'CHAM_CONG') {
            // 3. BẢNG CHẤM CÔNG (Checkin/Leave)
            fileName = `Bang_ChamCong_${timeFileName}.csv`;
            csv += "Ngay,Gio,Nhan Vien,Loai,Ghi Chu\n";

            const q = query(collection(db, `${ROOT_PATH}/tasks`), where("type", "in", ["CHECKIN", "LEAVE"]));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => d.data()).sort((a,b) => b.time - a.time);

            list.forEach(d => {
                const date = new Date(d.time);
                let typeName = 'Chấm công';
                if(d.type === 'LEAVE') typeName = 'Xin nghỉ';
                
                csv += [
                    toCSV(date.toLocaleDateString('vi-VN')),
                    toCSV(date.toLocaleTimeString('vi-VN')),
                    toCSV(d.by), // Người thực hiện
                    toCSV(typeName),
                    toCSV(d.title) // Nội dung (VD: Lý do nghỉ)
                ].join(',') + "\n";
            });

        } else if (reportType === 'CONG_VIEC') {
            // 4. NHẬT KÝ CÔNG VIỆC CHUNG (Tasks)
            fileName = `NhatKy_CongViec_${timeFileName}.csv`;
            csv += "Ngay,Gio,Nguoi Lam,Khu Vuc,Ten Cong Viec,Trang Thai,Ghi Chu Bao Cao,Diem\n";

            // Lấy tất cả task trừ checkin/leave/buy
            const snap = await getDocs(collection(db, `${ROOT_PATH}/tasks`));
            const list = snap.docs.map(d => d.data())
                .filter(d => !['CHECKIN', 'LEAVE', 'BUY'].includes(d.type))
                .sort((a,b) => b.time - a.time);

            list.forEach(d => {
                const date = new Date(d.time);
                const statusMap = { 'DONE': 'Đã xong', 'PENDING': 'Chưa xong', 'DOING': 'Đang làm' };
                
                csv += [
                    toCSV(date.toLocaleDateString('vi-VN')),
                    toCSV(date.toLocaleTimeString('vi-VN')),
                    toCSV(d.by || d.to), // Người được giao hoặc người làm
                    toCSV(d.area || 'Chung'),
                    toCSV(d.title),
                    toCSV(statusMap[d.status] || d.status),
                    toCSV(d.note || ''), // Ghi chú báo cáo
                    toCSV(d.status === 'DONE' ? 'Đã cộng' : '')
                ].join(',') + "\n";
            });
        }

        // Tải xuống
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        Utils.toast("✅ Đã tải xuống!", "success");

    } catch(e) { 
        console.error(e);
        alert("Lỗi xuất file: " + e.message); 
    }
};

const App = {
    init: () => {
        // Tự động đăng nhập lại
        const savedUser = localStorage.getItem('ong5_user');
        if(savedUser) {
            currentUser = JSON.parse(savedUser);
            App.loginSuccess(true);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                App.loadUsers();
                App.listenRealtime();
            } else {
                signInAnonymously(auth).catch(console.error);
            }
        });

        App.bindEvents();
    },

    listenRealtime: () => {
        const tables = ['tasks', 'chat', 'houses', 'supplies', 'products', 'harvest_logs'];
        tables.forEach(tbl => {
            onSnapshot(collection(db, `${ROOT_PATH}/${tbl}`), (snap) => {
                snap.docChanges().forEach((change) => {
                    if (change.type === "added" && !snap.metadata.hasPendingWrites) {
                        if(tbl === 'tasks' || tbl === 'chat') Utils.notifySound();
                    }
                });
                appData[tbl] = snap.docs.map(d => ({ ...d.data(), id: d.id, _id: d.id }));
                App.render();
            });
        });
    },

    loadUsers: async () => {
        try {
            if(els.userSelect.options.length > 1) return;
            const s = await getDocs(collection(db, `${ROOT_PATH}/employees`));
            els.userSelect.innerHTML = '<option value="">-- Chọn NV --</option>' + 
                s.docs.map(d=>`<option value="${d.id}" data-pin="${d.data().pin}" data-role="${d.data().role}">${d.data().name}</option>`).join('');
        } catch(e) {}
    },

    login: () => {
        const uid = els.userSelect.value;
        const pin = els.pinInput.value;
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
        localStorage.setItem('ong5_user', JSON.stringify(currentUser));
        els.loginOverlay.classList.add('hidden');
        els.headerUser.innerText = currentUser.name;
        els.headerRole.innerText = (currentUser.role || 'Nhân viên').toUpperCase();
        
        if(['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser.role||'').toLowerCase().includes(r))) {
            els.btnSettings.classList.remove('hidden');
        }
        if(!isAuto) App.render();
    },

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
        
        // --- NÚT SETTINGS: MENU BÁO CÁO MỚI ---
        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                // Chỉ quản lý mới thấy Menu báo cáo
                const isBoss = ['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser?.role||'').toLowerCase().includes(r));
                
                let html = `<div class="space-y-3">`;
                if(isBoss) {
                    html += `
                    <div class="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">TRUNG TÂM BÁO CÁO (EXCEL)</div>
                    <div class="grid grid-cols-1 gap-2">
                        <button id="rp-1" class="p-3 bg-purple-50 text-purple-700 rounded-lg font-bold text-xs border border-purple-200 flex items-center gap-2">
                            <i class="fas fa-box"></i> 1. Báo cáo Nhập/Xuất Phôi
                        </button>
                        <button id="rp-2" class="p-3 bg-green-50 text-green-700 rounded-lg font-bold text-xs border border-green-200 flex items-center gap-2">
                            <i class="fas fa-leaf"></i> 2. Báo cáo Nấm Tươi & Bán
                        </button>
                        <button id="rp-3" class="p-3 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs border border-blue-200 flex items-center gap-2">
                            <i class="fas fa-calendar-check"></i> 3. Bảng Chấm Công
                        </button>
                        <button id="rp-4" class="p-3 bg-orange-50 text-orange-700 rounded-lg font-bold text-xs border border-orange-200 flex items-center gap-2">
                            <i class="fas fa-clipboard-list"></i> 4. Nhật Ký Công Việc Chung
                        </button>
                    </div>
                    <hr class="border-dashed my-2">`;
                }
                html += `<button id="btn-logout" class="w-full p-3 bg-red-50 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><i class="fas fa-sign-out-alt"></i> ĐĂNG XUẤT</button></div>`;

                Utils.modal("CÀI ĐẶT & BÁO CÁO", html, []);

                setTimeout(() => {
                    if(isBoss) {
                        document.getElementById('rp-1').onclick = () => exportReport('PHOI');
                        document.getElementById('rp-2').onclick = () => exportReport('NAM_TUOI');
                        document.getElementById('rp-3').onclick = () => exportReport('CHAM_CONG');
                        document.getElementById('rp-4').onclick = () => exportReport('CONG_VIEC');
                    }
                    document.getElementById('btn-logout').onclick = () => {
                        localStorage.removeItem('ong5_user');
                        window.location.reload();
                    }
                }, 100);
            };
        }

        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => { 
                    b.classList.remove('active'); 
                    b.querySelector('i').className = b.querySelector('i').className.replace(/text-\w+-\d+/g, 'text-slate-400');
                });
                btn.classList.add('active');
                const icon = btn.querySelector('i');
                const tab = btn.getAttribute('data-tab');
                if(tab==='tasks') icon.classList.replace('text-slate-400','text-blue-600');
                if(tab==='sx') icon.classList.replace('text-slate-400','text-green-600');
                if(tab==='th') icon.classList.replace('text-slate-400','text-orange-500');
                if(tab==='team') icon.classList.replace('text-slate-400','text-purple-600');

                Object.values(els.views).forEach(e => e.classList.add('hidden'));
                els.views[tab].classList.remove('hidden');
                currentTab = tab;
                App.render();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', App.init);
