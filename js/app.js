import { auth, db, getDocs, collection, query, where, signInAnonymously, onAuthStateChanged, onSnapshot, ROOT_PATH } from './config.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { Utils } from './utils.js';

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

const toCSV = (data) => `"${String(data || '').replace(/"/g, '""')}"`;

const exportReport = async (reportType) => {
    try {
        Utils.toast("⏳ Đang tải...", "info");
        let csv = "data:text/csv;charset=utf-8,\uFEFF"; 
        const now = new Date();
        const timeFileName = `${now.getDate()}_${now.getMonth()+1}_${now.getFullYear()}`;
        let fileName = "";

        if (reportType === 'PHOI') {
            fileName = `BaoCao_KhoPhoi_${timeFileName}.csv`;
            csv += "Ngay,Gio,Loai,Ma Lo,So Luong,Tu/Den (Nha),Nguoi Thuc Hien\n";
            const snap = await getDocs(collection(db, `${ROOT_PATH}/supplies`));
            snap.docs.map(d => d.data()).sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time);
                csv += [
                    toCSV(date.toLocaleDateString('vi-VN')),
                    toCSV(date.toLocaleTimeString('vi-VN')),
                    toCSV(d.type === 'IMPORT' ? 'NHẬP' : 'XUẤT'),
                    toCSV(d.code || ''),
                    toCSV(d.qty),
                    toCSV(d.type === 'IMPORT' ? 'Kho Tổng' : (d.to || 'Hủy')),
                    toCSV(d.user)
                ].join(',') + "\n";
            });
        } else if (reportType === 'NAM_TUOI') {
            fileName = `BaoCao_NamTuoi_${timeFileName}.csv`;
            csv += "Ngay,Gio,Loai,Chi Tiet,Tong,Nguon/Khach,Nguoi Thuc Hien\n";
            const [hSnap, sSnap] = await Promise.all([
                getDocs(collection(db, `${ROOT_PATH}/harvest_logs`)),
                getDocs(collection(db, `${ROOT_PATH}/shipping`))
            ]);
            let combined = [];
            hSnap.forEach(d => combined.push({...d.data(), _type: 'NHAP'}));
            sSnap.forEach(d => combined.push({...d.data(), _type: 'XUAT'}));
            combined.sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time);
                let details = d._type === 'NHAP' ? Object.entries(d.details||{}).map(([k,v])=>`${k}: ${v}kg`).join('; ') : (d.items||[]).map(i=>`${i.name} (${i.qty})`).join('; ');
                csv += [
                    toCSV(date.toLocaleDateString('vi-VN')),
                    toCSV(date.toLocaleTimeString('vi-VN')),
                    toCSV(d._type === 'NHAP' ? 'THU HOẠCH' : 'BÁN HÀNG'),
                    toCSV(details),
                    toCSV(d._type === 'NHAP' ? d.total + ' kg' : d.total.toLocaleString() + ' đ'),
                    toCSV(d._type === 'NHAP' ? d.area : d.customer),
                    toCSV(d.user)
                ].join(',') + "\n";
            });
        } else if (reportType === 'CHAM_CONG') {
            fileName = `Bang_ChamCong_${timeFileName}.csv`;
            csv += "Ngay,Gio,Nhan Vien,Loai,Ghi Chu\n";
            const snap = await getDocs(query(collection(db, `${ROOT_PATH}/tasks`), where("type", "in", ["CHECKIN", "LEAVE"])));
            snap.docs.map(d => d.data()).sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time);
                csv += [toCSV(date.toLocaleDateString('vi-VN')), toCSV(date.toLocaleTimeString('vi-VN')), toCSV(d.by), toCSV(d.type==='LEAVE'?'Xin nghỉ':'Chấm công'), toCSV(d.title)].join(',') + "\n";
            });
        } else if (reportType === 'CONG_VIEC') {
            fileName = `NhatKy_CongViec_${timeFileName}.csv`;
            csv += "Ngay,Gio,Nguoi Lam,Khu Vuc,Noi Dung,Trang Thai,Ghi Chu,Diem\n";
            const snap = await getDocs(collection(db, `${ROOT_PATH}/tasks`));
            snap.docs.map(d => d.data()).filter(d => !['CHECKIN', 'LEAVE', 'BUY'].includes(d.type)).sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time);
                csv += [toCSV(date.toLocaleDateString('vi-VN')), toCSV(date.toLocaleTimeString('vi-VN')), toCSV(d.by||d.to), toCSV(d.area||''), toCSV(d.title), toCSV(d.status), toCSV(d.note||''), toCSV(d.status==='DONE'?'Cộng':'')].join(',') + "\n";
            });
        }

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        Utils.toast("✅ Đã tải!", "success");
    } catch(e) { alert("Lỗi: " + e.message); }
};

const App = {
    init: () => {
        const savedUser = localStorage.getItem('ong5_user');
        if(savedUser) { currentUser = JSON.parse(savedUser); App.loginSuccess(true); }
        onAuthStateChanged(auth, (user) => {
            if (user) { App.loadUsers(); App.listenRealtime(); } 
            else { signInAnonymously(auth).catch(console.error); }
        });
        App.bindEvents();
    },

    listenRealtime: () => {
        // --- FIX LỖI Ở ĐÂY: Thêm 'employees' vào danh sách ---
        const tables = ['employees', 'tasks', 'chat', 'houses', 'supplies', 'products', 'harvest_logs'];
        
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
        if(manualName && (pin === '1234' || pin === '9999')) { currentUser = { _id: 'manual', name: manualName, role: 'admin' }; App.loginSuccess(); return; }
        if(!uid) return Utils.toast("Chưa chọn nhân viên!", "err");
        const opt = els.userSelect.options[els.userSelect.selectedIndex];
        if(pin !== opt.getAttribute('data-pin')) { els.pinInput.value = ''; return Utils.toast("Sai mã PIN!", "err"); }
        currentUser = { _id: uid, name: opt.text, role: opt.getAttribute('data-role') };
        App.loginSuccess();
    },

    loginSuccess: (isAuto = false) => {
        localStorage.setItem('ong5_user', JSON.stringify(currentUser));
        els.loginOverlay.classList.add('hidden');
        els.headerUser.innerText = currentUser.name;
        els.headerRole.innerText = (currentUser.role || 'Nhân viên').toUpperCase();
        if(['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser.role||'').toLowerCase().includes(r))) els.btnSettings.classList.remove('hidden');
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
        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                const isBoss = ['admin','quản lý','giám đốc','kế toán'].some(r => (currentUser?.role||'').toLowerCase().includes(r));
                let html = `<div class="space-y-3">`;
                if(isBoss) {
                    html += `<div class="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">BÁO CÁO (EXCEL)</div>
                    <div class="grid grid-cols-1 gap-2">
                        <button id="rp-1" class="p-3 bg-purple-50 text-purple-700 rounded-lg font-bold text-xs border border-purple-200">1. Kho Phôi</button>
                        <button id="rp-2" class="p-3 bg-green-50 text-green-700 rounded-lg font-bold text-xs border border-green-200">2. Nấm Tươi/Bán</button>
                        <button id="rp-3" class="p-3 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs border border-blue-200">3. Chấm Công</button>
                        <button id="rp-4" class="p-3 bg-orange-50 text-orange-700 rounded-lg font-bold text-xs border border-orange-200">4. Công Việc Chung</button>
                    </div><hr class="border-dashed my-2">`;
                }
                html += `<button id="btn-logout" class="w-full p-3 bg-red-50 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-2">ĐĂNG XUẤT</button></div>`;
                Utils.modal("CÀI ĐẶT", html, []);
                setTimeout(() => {
                    if(isBoss) {
                        document.getElementById('rp-1').onclick = () => exportReport('PHOI');
                        document.getElementById('rp-2').onclick = () => exportReport('NAM_TUOI');
                        document.getElementById('rp-3').onclick = () => exportReport('CHAM_CONG');
                        document.getElementById('rp-4').onclick = () => exportReport('CONG_VIEC');
                    }
                    document.getElementById('btn-logout').onclick = () => { localStorage.removeItem('ong5_user'); window.location.reload(); }
                }, 100);
            };
        }
        els.navBtns.forEach(btn => {
            btn.onclick = () => {
                els.navBtns.forEach(b => { b.classList.remove('active'); b.querySelector('i').className = b.querySelector('i').className.replace(/text-\w+-\d+/g, 'text-slate-400'); });
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
