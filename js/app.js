import { auth, db, getDocs, collection, query, where, signInAnonymously, onAuthStateChanged, onSnapshot, ROOT_PATH } from './config.js';
import { SX } from './modules/sx.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { NuoiSoi } from './modules/nuoisoi.js';
import { Utils } from './utils.js';

let currentUser = null;
let currentTab = 'tasks';
let appData = {}; 

const els = {}; 

const toCSV = (data) => `"${String(data || '').replace(/"/g, '""')}"`;

const exportReport = async (reportType) => {
    try {
        Utils.toast("⏳ Đang xử lý dữ liệu...", "info");
        let csv = "data:text/csv;charset=utf-8,\uFEFF"; 
        const now = new Date();
        const timeFileName = `${now.getDate()}_${now.getMonth()+1}_${now.getFullYear()}`;
        let fileName = "";

        if (reportType === 'PHOI') {
            fileName = `BaoCao_KhoPhoi_${timeFileName}.csv`;
            csv += "Ngày;Giờ;Loại;Mã Lô;Số Lượng;Từ/Đến (Nhà);Người Thực Hiện\n";
            const snap = await getDocs(collection(db, `${ROOT_PATH}/supplies`));
            snap.docs.map(d => d.data()).sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time || Date.now());
                csv += [toCSV(date.toLocaleDateString('vi-VN')),toCSV(date.toLocaleTimeString('vi-VN')),toCSV(d.type === 'IMPORT' ? 'NHẬP' : 'XUẤT'),toCSV(d.code || ''),toCSV(d.qty || 0),toCSV(d.type === 'IMPORT' ? 'Kho Tổng' : (d.to || 'Hủy')),toCSV(d.user || 'Unknown')].join(';') + "\n";
            });
        } else if (reportType === 'NAM_TUOI') {
            fileName = `BaoCao_NamTuoi_${timeFileName}.csv`;
            csv += "Ngày;Giờ;Loại;Chi Tiết;Tổng;Nguồn/Khách;Người Thực Hiện\n";
            const [hSnap, sSnap] = await Promise.all([getDocs(collection(db, `${ROOT_PATH}/harvest_logs`)), getDocs(collection(db, `${ROOT_PATH}/shipping`))]);
            let combined = [];
            hSnap.forEach(d => combined.push({...d.data(), _type: 'NHAP'})); sSnap.forEach(d => combined.push({...d.data(), _type: 'XUAT'}));
            combined.sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time || Date.now());
                let details = d._type === 'NHAP' ? Object.entries(d.details||{}).map(([k,v])=>`${k}: ${v}kg`).join(', ') : (d.items||[]).map(i=>`${i.name} (${i.qty})`).join(', ');
                const totalText = d._type === 'NHAP' ? `${d.total || 0} kg` : `${Number(d.total || 0).toLocaleString('vi-VN')} đ`;
                csv += [toCSV(date.toLocaleDateString('vi-VN')),toCSV(date.toLocaleTimeString('vi-VN')),toCSV(d._type === 'NHAP' ? 'THU HOẠCH' : 'BÁN HÀNG'),toCSV(details),toCSV(totalText),toCSV(d._type === 'NHAP' ? (d.area || '') : (d.customer || '')),toCSV(d.user || 'Unknown')].join(';') + "\n";
            });
        } else if (reportType === 'CHAM_CONG') {
            fileName = `Bang_ChamCong_${timeFileName}.csv`;
            csv += "Ngày;Giờ;Nhân Viên;Loại;Ghi Chú\n";
            const snap = await getDocs(query(collection(db, `${ROOT_PATH}/tasks`), where("type", "in", ["CHECKIN", "LEAVE"])));
            snap.docs.map(d => d.data()).sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time || Date.now());
                csv += [toCSV(date.toLocaleDateString('vi-VN')), toCSV(date.toLocaleTimeString('vi-VN')), toCSV(d.by || ''), toCSV(d.type==='LEAVE'?'Xin nghỉ':'Chấm công'), toCSV(d.title || '')].join(';') + "\n";
            });
        } else if (reportType === 'CONG_VIEC') {
            fileName = `NhatKy_CongViec_${timeFileName}.csv`;
            csv += "Ngày;Giờ;Người Làm;Khu Vực;Nội Dung;Trạng Thái;Ghi Chú;Điểm\n";
            const snap = await getDocs(collection(db, `${ROOT_PATH}/tasks`));
            snap.docs.map(d => d.data()).filter(d => !['CHECKIN', 'LEAVE', 'BUY'].includes(d.type)).sort((a,b) => b.time - a.time).forEach(d => {
                const date = new Date(d.time || Date.now());
                csv += [toCSV(date.toLocaleDateString('vi-VN')), toCSV(date.toLocaleTimeString('vi-VN')), toCSV(d.by||d.to||''), toCSV(d.area||''), toCSV(d.title||''), toCSV(d.status||''), toCSV(d.note||''), toCSV(d.status==='DONE'?'Cộng':'')].join(';') + "\n";
            });
        } else if (reportType === 'NUOI_SOI') {
            // --- TÍNH NĂNG MỚI: BÁO CÁO TỒN KHO KHU NUÔI SỢI ---
            fileName = `BaoCao_TonKho_NuoiSoi_${timeFileName}.csv`;
            csv += "Giàn;Mã Lô;Số Lượng Đang Tồn\n";
            const snap = await getDocs(collection(db, `${ROOT_PATH}/nuoisoi_A`));
            let dataList = snap.docs.map(d => ({id: d.id, ...d.data()}));
            dataList.sort((a,b) => a.id.localeCompare(b.id, 'en', {numeric: true}));
            
            dataList.forEach(d => {
                let bMap = d.batches || {};
                if(d.batch && d.qty) bMap[d.batch] = (bMap[d.batch]||0) + Number(d.qty); // Kéo dữ liệu cũ
                Object.entries(bMap).forEach(([code, q]) => {
                    if(q > 0) csv += [toCSV(d.id), toCSV(code), toCSV(q)].join(';') + "\n";
                });
            });
        }

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        Utils.toast("✅ Đã tải xuống thành công!", "success");
    } catch(e) { alert("Lỗi tải báo cáo: " + e.message); }
};

const App = {
    init: () => {
        const mainContainer = document.getElementById('view-tasks')?.parentElement;
        if(mainContainer && !document.getElementById('view-nuoisoi')) {
            mainContainer.insertAdjacentHTML('beforeend', '<div id="view-nuoisoi" class="hidden"></div>');
        }
        
        const navBar = document.querySelector('nav .flex');
        if(navBar && !document.querySelector('[data-tab="nuoisoi"]')) {
            const nsBtnHTML = `<button class="nav-btn flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-600 transition" data-tab="nuoisoi" style="display: none;"><i class="fas fa-boxes text-lg mb-0.5"></i><span class="text-[9px] font-bold">Nuôi Sợi</span></button>`;
            const teamBtn = document.querySelector('[data-tab="team"]');
            if(teamBtn) teamBtn.insertAdjacentHTML('beforebegin', nsBtnHTML);
            else navBar.insertAdjacentHTML('beforeend', nsBtnHTML);
        }

        els.loginOverlay = document.getElementById('login-overlay');
        els.userSelect = document.getElementById('login-user');
        els.pinInput = document.getElementById('login-pin');
        els.loginBtn = document.getElementById('login-btn');
        els.headerUser = document.getElementById('head-user');
        els.headerRole = document.getElementById('head-role');
        els.btnSettings = document.getElementById('btn-settings');
        els.navBtns = document.querySelectorAll('.nav-btn');
        els.views = {
            tasks: document.getElementById('view-tasks'),
            sx: document.getElementById('view-sx'),
            th: document.getElementById('view-th'),
            nuoisoi: document.getElementById('view-nuoisoi'),
            team: document.getElementById('view-team')
        };

        const savedUser = localStorage.getItem('ong5_user');
        if(savedUser) { currentUser = JSON.parse(savedUser); App.loginSuccess(true); }
        onAuthStateChanged(auth, (user) => {
            if (user) { App.loadUsers(); App.listenRealtime(); } 
            else { signInAnonymously(auth).catch(console.error); }
        });
        App.bindEvents();
    },

    listenRealtime: () => {
        const tables = ['employees', 'tasks', 'chat', 'houses', 'supplies', 'products', 'harvest_logs', 'shipping', 'nuoisoi_A'];
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
        
        // KIỂM TRA QUYỀN VÀ HIỂN THỊ CHỨC NĂNG BÍ MẬT (Thêm "Tổ trưởng")
        const isManager = ['admin', 'giám đốc', 'quản lý', 'tổ trưởng'].some(r => (currentUser.role || '').toLowerCase().includes(r));
        if(isManager && els.btnSettings) els.btnSettings.classList.remove('hidden');
        
        const nsBtn = document.querySelector('[data-tab="nuoisoi"]');
        if(nsBtn) {
            nsBtn.style.display = isManager ? 'flex' : 'none';
        }

        if(!isAuto) App.render();
    },

    render: () => {
        if(!currentUser) return;
        const v = els.views[currentTab];
        if(v && !v.classList.contains('hidden')) {
            if(currentTab === 'tasks') HR.renderTasks(appData, currentUser);
            if(currentTab === 'sx') SX.render(appData, currentUser);
            if(currentTab === 'nuoisoi') NuoiSoi.render(appData, currentUser);
            if(currentTab === 'th') THDG.render(appData, currentUser);
            if(currentTab === 'team') HR.renderTeam(appData, currentUser);
        }
    },

    bindEvents: () => {
        els.loginBtn.onclick = App.login;
        if(els.btnSettings) {
            els.btnSettings.onclick = () => {
                const isBoss = ['admin','quản lý','giám đốc','tổ trưởng','kế toán'].some(r => (currentUser?.role||'').toLowerCase().includes(r));
                let html = `<div class="space-y-3">`;
                if(isBoss) {
                    html += `<div class="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">BÁO CÁO (EXCEL)</div>
                    <div class="grid grid-cols-1 gap-2">
                        <button id="rp-1" class="p-3 bg-purple-50 text-purple-700 rounded-lg font-bold text-xs border border-purple-200 flex items-center gap-2"><i class="fas fa-box"></i> 1. Kho Phôi Chung</button>
                        <button id="rp-5" class="p-3 bg-cyan-50 text-cyan-700 rounded-lg font-bold text-xs border border-cyan-200 flex items-center gap-2"><i class="fas fa-boxes"></i> 2. Kho Khu Nuôi Sợi</button>
                        <button id="rp-2" class="p-3 bg-green-50 text-green-700 rounded-lg font-bold text-xs border border-green-200 flex items-center gap-2"><i class="fas fa-leaf"></i> 3. Nấm Tươi & Bán</button>
                        <button id="rp-3" class="p-3 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs border border-blue-200 flex items-center gap-2"><i class="fas fa-calendar-check"></i> 4. Chấm Công</button>
                        <button id="rp-4" class="p-3 bg-orange-50 text-orange-700 rounded-lg font-bold text-xs border border-orange-200 flex items-center gap-2"><i class="fas fa-clipboard-list"></i> 5. Công Việc Chung</button>
                    </div><hr class="border-dashed my-2">`;
                }
                html += `<button id="btn-logout" class="w-full p-3 bg-red-50 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-2">ĐĂNG XUẤT</button></div>`;
                Utils.modal("CÀI ĐẶT", html, []);
                setTimeout(() => {
                    if(isBoss) {
                        document.getElementById('rp-1').onclick = () => exportReport('PHOI');
                        document.getElementById('rp-5').onclick = () => exportReport('NUOI_SOI');
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
                if(tab==='nuoisoi') icon.classList.replace('text-slate-400','text-cyan-600');
                if(tab==='th') icon.classList.replace('text-slate-400','text-orange-500');
                if(tab==='team') icon.classList.replace('text-slate-400','text-purple-600');
                
                Object.values(els.views).forEach(e => e.classList.add('hidden'));
                if(els.views[tab]) els.views[tab].classList.remove('hidden');
                currentTab = tab;
                App.render();
            }
        });
    }
};
document.addEventListener('DOMContentLoaded', App.init);
