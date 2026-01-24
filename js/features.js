import { addDoc, updateDoc, doc, collection, db, ROOT_PATH } from './config.js';
import { UI } from './core.js';

export const Features = {
    Home: {
        render: (data) => {
            const container = document.getElementById('view-home');
            const sorted = [...data.houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', {numeric: true}));
            const getYield = (n) => data.harvest.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);
            container.innerHTML = `<div class="space-y-5"><div class="glass p-5 !bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg"><h3 class="font-bold text-xs uppercase tracking-widest mb-2 opacity-80 text-center">Tổng quan</h3><div class="text-center"><span class="text-4xl font-black">${sorted.filter(h=>h.status==='ACTIVE').length}</span> <span class="text-sm opacity-80 block">Nhà đang hoạt động</span></div></div><div class="grid grid-cols-2 gap-3">${sorted.map(h => `<div class="glass p-3 border-l-4 ${h.status==='ACTIVE'?'border-green-500':'border-slate-300'}"><div class="flex justify-between items-start mb-2"><span class="font-black text-lg text-slate-700">${h.name}</span><span class="text-[9px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-500'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span></div><div class="text-[10px] text-slate-400 uppercase font-bold mb-1">${h.currentBatch||'-'}</div><div class="text-right"><span class="text-xl font-black text-slate-700">${getYield(h.name).toFixed(1)}</span> <span class="text-[10px] text-slate-400">kg</span></div></div>`).join('')}</div></div>`;
        }
    },
    Production: {
        render: (data) => {
            const container = document.getElementById('view-sx');
            const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
            container.innerHTML = `<div class="p-4"><div class="glass p-5 border-l-4 border-blue-500 space-y-4"><h3 class="font-black text-slate-700 uppercase">Nhập Phôi (Kho A)</h3><select id="sx-house-select" class="font-bold">${sorted.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select><div class="grid grid-cols-2 gap-3"><input id="sx-strain" placeholder="Mã giống"><input id="sx-date" type="date"></div><input id="sx-spawn-qty" type="number" placeholder="Số lượng bịch" class="text-lg font-bold text-blue-600"><textarea id="sx-note" placeholder="Ghi chú (NCC...)" class="h-20"></textarea><button class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ MỚI</button></div></div>`;
        },
        actions: {
            setupHouseBatch: async (user) => {
                const h = document.getElementById('sx-house-select').value; const s = document.getElementById('sx-strain').value; const q = Number(document.getElementById('sx-spawn-qty').value); const n = document.getElementById('sx-note').value;
                if(!h) return alert("Thiếu tin!"); 
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: s, currentSpawn: q, status: 'ACTIVE', startDate: Date.now(), note: n }); 
                UI.showMsg(`Đã vào lô tại ${h}`);
            }
        }
    },
    Warehouse: {
        render: (data) => {
            const container = document.getElementById('view-th');
            const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
            const g1 = data.products.filter(p => p.group == '1');
            const g2 = data.products.filter(p => p.group == '2');
            const g3 = data.products.filter(p => p.group == '3');
            container.innerHTML = `<div class="space-y-4"><div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200"><button class="flex-1 py-2 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm btn-action" data-action="toggleTH" data-payload="in">NHẬP KHO</button><button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50 btn-action" data-action="toggleTH" data-payload="out">XUẤT BÁN</button></div><div id="zone-th" class="glass p-5 border-l-4 border-green-500"><div class="flex justify-between items-center mb-4"><span class="font-black text-slate-700 uppercase">Nhập Kho</span><button class="text-xs bg-slate-100 px-3 py-1 rounded text-blue-600 font-bold btn-action" data-action="openAddProd">+ Mã SP</button></div><div class="space-y-4"><select id="th-area" class="font-bold text-green-700"><option value="">-- Chọn Nguồn --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>${g1.length?`<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">1. Nấm Tươi</h4><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm focus:border-green-500" placeholder="-"></div>`).join('')}</div></div>`:''}${g2.length?`<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">2. Phụ Phẩm</h4><div class="grid grid-cols-3 gap-3">${g2.map(p=>`<div><label class="text-[9px] font-bold text-slate-400 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm focus:border-orange-500" placeholder="-"></div>`).join('')}</div></div>`:''}${g3.length?`<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">3. Thành Phẩm</h4><div class="grid grid-cols-3 gap-3">${g3.map(p=>`<div><label class="text-[9px] font-bold text-slate-400 block truncate text-center mb-1">${p.name}</label><input type="number" id="th-${p.code}" class="text-center font-bold text-sm focus:border-purple-500" placeholder="-"></div>`).join('')}</div></div>`:''}<button class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitTH">LƯU KHO</button></div></div><div id="zone-ship" class="hidden glass p-5 border-l-4 border-orange-500"><h4 class="font-black text-slate-700 uppercase mb-4">Xuất Bán</h4><div class="space-y-3"><input id="ship-cust" placeholder="Khách hàng"><div class="grid grid-cols-2 gap-3"><select id="ship-type"><option>Nấm Tươi</option><option>Thành Phẩm</option></select><input id="ship-qty" type="number" placeholder="Số lượng"></div><textarea id="ship-note" placeholder="Ghi chú..."></textarea><button class="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitShip">XUẤT & IN</button></div></div></div>`;
        },
        actions: {
            submitTH: async (user, data) => {
                const area = document.getElementById('th-area').value; if(!area) return UI.showMsg("Chọn nguồn!");
                let d = {}, total = 0;
                data.products.forEach(p => { const el = document.getElementById(`th-${p.code}`); if(el) { const v = Number(el.value)||0; if(v>0) { d[p.code]=v; total+=v; } el.value=''; } });
                if(total===0) return UI.showMsg("Chưa nhập số!");
                await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:'', user:user.name, time:Date.now() });
                UI.showMsg(`Đã lưu ${total} đơn vị`);
            },
            submitShip: async (user) => { const c = document.getElementById('ship-cust').value; const q = Number(document.getElementById('ship-qty').value); if(!c || !q) return UI.showMsg("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, qty: q, user: user.name, time: Date.now() }); UI.showMsg("Đã xuất kho"); },
            toggleTH: (mode) => { document.getElementById('zone-th').classList.toggle('hidden', mode !== 'in'); document.getElementById('zone-ship').classList.toggle('hidden', mode !== 'out'); },
            openAddProd: () => {
                const html = `<div><label class="text-xs font-bold text-slate-500">Tên</label><input id="new-prod-name" placeholder="VD: Nấm Mỡ"></div><div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" placeholder="VD: nam_mo"></div><div><label class="text-xs font-bold text-slate-500">Nhóm</label><select id="new-prod-group"><option value="1">1. Tươi</option><option value="2">2. Phụ Phẩm</option><option value="3">3. Thành Phẩm</option></select></div>`;
                UI.toggleModal(UI.Templates.ModalBase("Thêm Mã Mới", html, "submitAddProd", "Lưu Mã"));
            },
            submitAddProd: async () => { const n = document.getElementById('new-prod-name').value; const c = document.getElementById('new-prod-code').value; const g = document.getElementById('new-prod-group').value; if(!n || !c) return UI.showMsg("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g }); UI.toggleModal(null); UI.showMsg("Đã thêm mã"); }
        }
    },
    HR: {
        renderTasks: (data, user) => {
            const container = document.getElementById('view-tasks');
            const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(user.role);
            const empCheckboxes = data.employees.map(e => `<label class="flex items-center space-x-2 bg-slate-50 p-2 rounded cursor-pointer"><input type="checkbox" class="task-emp-check w-4 h-4" value="${e.name}"><span class="text-xs font-bold text-slate-700">${e.name}</span></label>`).join('');
            container.innerHTML = `<div class="space-y-6">${canAssign ? `<div class="glass p-5 border-l-4 border-blue-500"><h4 class="font-black text-slate-700 uppercase text-xs mb-3">Giao Việc</h4><div class="space-y-3"><input id="task-title" placeholder="Tên công việc"><div class="grid grid-cols-2 gap-3"><select id="task-house"><option value="">-- Nhà/Khu --</option>${data.houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select><input id="task-deadline" type="date"></div><div class="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 grid grid-cols-2 gap-2">${empCheckboxes}</div><button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold btn-action" data-action="addTask">PHÁT LỆNH</button></div></div>` : ''}<div><h3 class="font-bold text-slate-400 text-xs uppercase pl-2">Cần Làm Ngay</h3>${data.tasks.filter(t=>t.assignee===user.name && t.status!=='done').map(t => `<div class="glass p-4 border-l-4 border-orange-500 mb-2"><div class="flex justify-between items-start mb-2"><h4 class="font-bold text-slate-800">${t.title}</h4></div><div class="text-xs text-slate-500 mb-3">${t.house||'Chung'}</div><button class="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold btn-action shadow-md" data-action="submitTask" data-payload="${t._id}">BÁO CÁO XONG</button></div>`).join('')}</div></div>`;
        },
        renderTeam: (user, data) => {
            const container = document.getElementById('view-team');
            container.innerHTML = `<div class="p-4 space-y-4"><div class="glass p-6 !bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-xl flex items-center gap-5"><div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">${user.name.charAt(0)}</div><div><h2 class="text-xl font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role}</p></div></div><div class="grid grid-cols-2 gap-3 mb-6"><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="submitAttendance"><i class="fas fa-fingerprint text-2xl text-green-600"></i><span class="text-xs font-bold">ĐIỂM DANH</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="openLeaveModal"><i class="fas fa-umbrella-beach text-2xl text-orange-600"></i><span class="text-xs font-bold">XIN NGHỈ</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="openBuyModal"><i class="fas fa-shopping-cart text-2xl text-purple-600"></i><span class="text-xs font-bold">MUA HÀNG</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="logout"><i class="fas fa-power-off text-2xl text-slate-500"></i><span class="text-xs font-bold">THOÁT</span></button></div></div>`;
        },
        actions: {
            addTask: async (user) => { const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const checks = document.querySelectorAll('.task-emp-check:checked'); if(!t || checks.length===0) return UI.showMsg("Thiếu tin!"); checks.forEach(async (cb) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:cb.value, status:'pending', createdBy:user.name, time:Date.now() }); }); UI.showMsg(`Đã giao cho ${checks.length} người`); },
            submitTask: async (u, id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:u.name, completedAt:Date.now()}); UI.showMsg("Đã xong"); },
            submitAttendance: async (u) => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:u.name, type:'CHECK_IN', time:Date.now() }); UI.showMsg("Đã điểm danh"); } },
            openLeaveModal: () => UI.toggleModal(UI.Templates.ModalBase("Xin Nghỉ", `<input id="leave-date" type="date"><select id="leave-reason"><option>Việc riêng</option><option>Ốm</option></select>`, "submitLeave", "Gửi Đơn")),
            submitLeave: async (u) => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:u.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
            openBuyModal: () => UI.toggleModal(UI.Templates.ModalBase("Mua Hàng", `<input id="buy-name" placeholder="Tên hàng"><div class="flex gap-3"><input id="buy-unit" class="w-1/3" placeholder="ĐVT"><input id="buy-qty" type="number" class="w-2/3" placeholder="SL"></div>`, "submitBuyRequest", "Gửi Đề Xuất")),
            submitBuyRequest: async (u) => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:u.name, item:document.getElementById('buy-name').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); }
        }
    }
};
