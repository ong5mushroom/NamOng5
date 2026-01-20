export const UI = {
    // --- TIỆN ÍCH ---
    playSound: (type) => { /* Giữ nguyên logic âm thanh */ },

    initModals: () => {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.modal-close-btn')) {
                const id = e.target.closest('.modal-close-btn').dataset.payload;
                document.getElementById(id)?.classList.add('hidden');
            }
            if (e.target.closest('[data-action="closeChat"]')) {
                document.getElementById('chat-layer')?.classList.add('hidden');
            }
        });
    },

    toggleModal: (id) => document.getElementById(id)?.classList.toggle('hidden'),

    showMsg: (t, type = 'info') => {
        const b = document.getElementById('msg-box'); 
        if(b) {
            b.innerHTML = type === 'error' ? `<i class="fas fa-exclamation-triangle"></i> ${t}` : `<i class="fas fa-check-circle"></i> ${t}`;
            b.style.display = 'block'; 
            b.style.background = type === 'error' ? '#ef4444' : '#16a34a';
            setTimeout(() => b.style.display = 'none', 3000);
        }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('text-blue-600', isActive);
            btn.classList.toggle('text-slate-400', !isActive);
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        const sorted = [...employees].sort((a,b) => a.name.localeCompare(b.name));
        // Lưu ý: Option bên trong select sẽ có màu đen do CSS đè
        if(sel) sel.innerHTML = '<option value="" class="text-slate-800">-- Chọn tên --</option>' + 
            sorted.map(e => `<option value="${e.id}" class="text-slate-800">${e.name}</option>`).join('');
    },

    // --- HOME ---
    renderHome: (houses, harvestLogs) => {
        const container = document.getElementById('view-home');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sorted = [...houses].sort((a, b) => {
            let iA = houseOrder.indexOf(a.name), iB = houseOrder.indexOf(b.name);
            return (iA===-1?999:iA) - (iB===-1?999:iB);
        });
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);

        container.innerHTML = `
        <div class="p-2 space-y-3">
            <h2 class="text-lg font-black text-slate-800 uppercase border-l-4 border-blue-600 pl-2">Trạng Thái Trại</h2>
            <div class="grid grid-cols-2 gap-3">
            ${sorted.map(h => `
                <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 relative">
                    <div class="flex justify-between items-start mb-2">
                        <div><h3 class="font-black text-xl text-blue-700">${h.name}</h3><div class="text-[10px] text-slate-500 font-bold uppercase">${h.currentBatch || '(Trống)'}</div></div>
                        <span class="text-[9px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'} px-2 py-1 rounded font-bold">${h.status === 'ACTIVE' ? 'SX' : 'CHỜ'}</span>
                    </div>
                    <div class="text-center bg-slate-50 p-2 rounded border border-slate-100">
                        <div class="text-[9px] uppercase text-slate-500">Đã Hái</div>
                        <div class="font-black text-blue-600 text-lg">${getYield(h.name).toFixed(1)} <span class="text-[10px]">kg</span></div>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    // --- SẢN XUẤT ---
    renderSX: (houses) => {
        const container = document.getElementById('view-sx');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sorted = [...houses].sort((a,b) => { let iA=houseOrder.indexOf(a.name), iB=houseOrder.indexOf(b.name); return (iA===-1?999:iA) - (iB===-1?999:iB); });
        
        container.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="bg-white p-4 rounded-xl shadow-lg border-2 border-blue-50">
                <div class="flex items-center justify-between border-b pb-2 mb-3"><span class="font-black text-blue-700 uppercase"><i class="fas fa-industry mr-2"></i>Nhập Phôi</span></div>
                <div class="space-y-3">
                    <div><label class="text-xs font-bold text-slate-500">Nhà / Kho</label><select id="sx-house-select" class="input-box font-bold text-blue-800">${sorted.map(h => `<option value="${h._id}">${h.name}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-3"><div><label class="text-xs font-bold text-slate-500">Mã giống</label><input id="sx-strain" class="input-box font-bold" placeholder="VD: 049"></div><div><label class="text-xs font-bold text-slate-500">Ngày cấy</label><input id="sx-date" type="date" class="input-box font-bold"></div></div>
                    <div><label class="text-xs font-bold text-slate-500">Số lượng</label><input id="sx-spawn-qty" type="number" class="input-box font-bold text-lg text-blue-600" placeholder="0"></div>
                    <button class="btn-primary w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ</button>
                </div>
            </div>
        </div>`;
    },

    // --- THU HOẠCH ---
    renderTH: (houses, harvestLogs) => {
        const container = document.getElementById('view-th');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sorted = [...houses].sort((a,b) => { let iA=houseOrder.indexOf(a.name), iB=houseOrder.indexOf(b.name); return (iA===-1?999:iA) - (iB===-1?999:iB); });
        
        const g1 = [{c:'b2',l:'B2'},{c:'a1',l:'A1'},{c:'a2',l:'A2'},{c:'b1',l:'B1'},{c:'ht',l:'Hầu Thủ'}];
        const g2 = [{c:'a1f',l:'A1F'},{c:'a2f',l:'A2F'},{c:'b2f',l:'B2F'},{c:'d1',l:'D1'},{c:'cn',l:'Chân'},{c:'hc',l:'Hủy chân'},{c:'hh',l:'Hủy hỏng'}];

        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <button class="flex-1 py-2 rounded-md font-bold text-xs bg-white shadow text-green-700" onclick="document.getElementById('zone-th').classList.remove('hidden');document.getElementById('zone-ship').classList.add('hidden');">THU HOẠCH</button>
                <button class="flex-1 py-2 rounded-md font-bold text-xs text-slate-400" onclick="document.getElementById('zone-th').classList.add('hidden');document.getElementById('zone-ship').classList.remove('hidden');">XUẤT KHO</button>
            </div>
            
            <div id="zone-th">
                <div class="bg-white p-4 rounded-xl shadow-lg border border-green-100 mb-4">
                    <div class="flex justify-between items-center border-b pb-2 mb-3"><span class="font-black text-green-700 uppercase">Phiếu Nhập Nấm</span></div>
                    <div class="space-y-3">
                        <select id="th-area" class="input-box text-lg font-black text-green-700 border-green-300"><option value="">-- Chọn Nhà --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select>
                        <div class="bg-green-50 p-2 rounded border border-green-200"><h4 class="text-[10px] font-bold text-green-800 uppercase mb-2">1. SP Chuẩn</h4><div class="grid grid-cols-2 gap-2">${g1.map(m=>`<div class="flex items-center gap-1"><label class="w-12 text-[10px] font-bold text-slate-600">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-1 text-center font-bold" placeholder="-"></div>`).join('')}</div></div>
                        <div class="bg-orange-50 p-2 rounded border border-orange-200"><h4 class="text-[10px] font-bold text-orange-800 uppercase mb-2">2. Hạn chế</h4><div class="grid grid-cols-2 gap-2">${g2.map(m=>`<div class="flex items-center gap-1"><label class="w-12 text-[10px] font-bold text-slate-600">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-1 text-center font-bold" placeholder="-"></div>`).join('')}</div></div>
                        <div class="flex justify-between bg-slate-100 p-3 rounded-xl border border-slate-200"><span class="font-bold text-slate-600">TỔNG:</span><span id="th-display-total" class="font-black text-2xl text-green-600">0.0 kg</span></div>
                        <textarea id="th-note" class="input-box text-sm" placeholder="Ghi chú..."></textarea>
                        <button class="btn-primary w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-md btn-action" data-action="submitTH">LƯU PHIẾU</button>
                    </div>
                </div>
            </div>

            <div id="zone-ship" class="hidden">
                <div class="bg-white p-4 rounded-xl shadow-lg border border-orange-100">
                    <h4 class="font-black text-orange-700 uppercase mb-3 flex items-center"><i class="fas fa-truck mr-2"></i>Xuất Kho</h4>
                    <div class="space-y-3">
                        <input id="ship-cust" class="input-box font-bold" placeholder="Tên khách hàng">
                        <div class="grid grid-cols-2 gap-2"><select id="ship-type" class="input-box font-bold text-sm"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Dược Liệu</option></select><input id="ship-qty" type="number" class="input-box font-black text-orange-600 text-center" placeholder="Kg"></div>
                        <textarea id="ship-note" class="input-box text-sm mb-3" placeholder="Ghi chú..."></textarea>
                        <button class="btn-primary w-full bg-orange-600 text-white py-3 rounded-lg font-bold shadow-md btn-action" data-action="submitShip">LƯU & IN</button>
                    </div>
                </div>
            </div>
        </div>`;
        setTimeout(() => {
            const inps = document.querySelectorAll('.input-harvest'), tot = document.getElementById('th-display-total');
            inps.forEach(i => i.addEventListener('input', () => { let s=0; inps.forEach(k => s+=Number(k.value)||0); tot.innerText = s.toFixed(1) + ' kg'; }));
        }, 200);
    },

    // --- KHO ---
    renderStock: (inv, supplies, distLogs) => {
        const container = document.getElementById('view-stock');
        const recent = distLogs ? distLogs.slice(0,5) : [];
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="bg-white p-3 rounded-xl shadow border-l-4 border-purple-500"><h3 class="font-bold text-purple-700 uppercase text-sm">Kho A (Phôi)</h3><p class="text-xs text-slate-500">Quản lý tại Tab SX</p></div>
            <div class="bg-white p-3 rounded-xl shadow border-l-4 border-orange-500 space-y-2"><h3 class="font-bold text-orange-700 uppercase text-sm">Kho THDG (Nấm)</h3><div class="flex gap-2"><input id="stock-act" type="number" class="input-box flex-1" placeholder="Thực tế (Kg)"><button class="bg-orange-600 text-white px-3 rounded font-bold text-xs btn-action" data-action="submitStockCheck">Chốt</button></div></div>
            <div class="bg-white p-3 rounded-xl shadow border-l-4 border-blue-500">
                <div class="flex justify-between items-center mb-2"><h3 class="font-bold text-blue-700 uppercase text-sm">Kho Vật Tư</h3><button class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold btn-action" data-action="toggleModal" data-payload="modal-distribute">CẤP PHÁT</button></div>
                <div class="max-h-40 overflow-y-auto space-y-1">${supplies.map(s=>`<div class="flex justify-between text-xs border-b pb-1"><span>${s.name}</span><b class="text-blue-600">${s.stock} ${s.unit}</b></div>`).join('')}</div>
            </div>
            <div id="modal-distribute" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl space-y-3"><h3 class="font-bold text-lg text-slate-700 mb-2 uppercase text-center">Cấp Phát</h3><select id="dist-item" class="input-box text-sm">${supplies.map(s=>`<option value="${s._id}" data-name="${s.name}" data-stock="${s.stock}">${s.name} (Tồn: ${s.stock})</option>`).join('')}</select><select id="dist-to" class="input-box text-sm"><option value="B1">Nhà B1</option><option value="B2">Nhà B2</option><option value="A1">Nhà A1</option><option value="A2">Nhà A2</option><option value="XuongSX">Xưởng SX</option></select><input id="dist-qty" type="number" class="input-box text-sm" placeholder="Số lượng"><div class="flex gap-2 pt-2"><button class="flex-1 py-2 bg-slate-100 font-bold rounded text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-distribute">Đóng</button><button class="flex-1 py-2 bg-blue-600 text-white font-bold rounded btn-action" data-action="submitDistribute">Lưu</button></div></div></div>
        </div>`;
    },

    // --- VIỆC ---
    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => (t.assignee !== currentUser.name && t.status !== 'done') || t.status === 'done');
        const empOpts = employees && employees.length ? employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('') : '<option value="">(Trống)</option>';

        container.innerHTML = `
        <div class="p-2 space-y-4">
             ${canAssign ? `
             <div class="bg-white p-4 rounded-xl shadow-lg border border-blue-100">
                <div class="flex justify-between mb-3"><h4 class="font-black text-blue-700 uppercase text-xs">Giao việc mới</h4><button class="text-[10px] bg-red-100 text-red-600 px-2 rounded font-bold btn-action" data-action="remindAttendance">NHẮC NHỞ</button></div>
                <div class="space-y-2">
                    <input id="task-title" class="input-box text-sm font-bold" placeholder="Tên công việc">
                    <div class="grid grid-cols-2 gap-2"><select id="task-house" class="input-box w-full text-sm"><option value="">-- Nhà --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select><select id="task-assignee" class="input-box w-full text-sm"><option value="">-- Nhân viên --</option>${empOpts}</select></div>
                    <div class="flex gap-2 mb-2"><input id="task-deadline" type="date" class="input-box w-full text-sm"></div>
                    <textarea id="task-desc" class="input-box text-sm mb-2" placeholder="Mô tả..."></textarea>
                    <button class="btn-primary w-full bg-blue-600 text-white py-2 rounded-lg font-bold shadow-md btn-action" data-action="addTask">GIAO VIỆC</button>
                </div>
             </div>` : ''}

             <h3 class="font-bold text-slate-700 text-sm uppercase border-b pb-1">Nhiệm vụ của tôi (${myTasks.length})</h3>
             <div class="space-y-3">${myTasks.length ? myTasks.map(t => `<div class="bg-white p-3 rounded-xl border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-sm"><div class="flex justify-between items-start"><div><div class="font-bold text-slate-800 text-sm">${t.title}</div><div class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">${t.house||'Chung'}</div></div><span class="text-[9px] font-bold ${t.status==='received'?'text-blue-600':'text-red-500'}">${t.status==='received'?'ĐANG LÀM':'MỚI'}</span></div><p class="text-xs text-slate-500 mt-1 mb-2">${t.desc||''}</p>${t.status === 'pending' ? `<button class="w-full bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold btn-action" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>` : `<button class="w-full bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold btn-action" data-action="submitTask" data-payload="${t._id}">BÁO CÁO XONG</button>`}</div>`).join('') : '<p class="text-xs text-slate-400 italic">Không có việc.</p>'}</div>
             <h3 class="font-bold text-slate-500 uppercase border-b border-slate-300 pb-1 mt-6 text-sm">Việc Khác</h3>
             <div class="space-y-2 opacity-75">${otherTasks.slice(0, 5).map(t => `<div class="bg-white p-3 rounded-xl border-l-4 ${t.status==='done'?'border-green-500 bg-slate-50':'border-slate-300'} shadow-sm"><div class="flex justify-between"><h4 class="font-bold text-slate-700 text-sm">${t.title} <span class="text-xs font-normal text-slate-500">(${t.assignee} - ${t.house||''})</span></h4>${t.status==='done'?'<span class=\"text-green-600 font-bold text-xs\">XONG</span>': (t.status==='received' ? '<span class=\"text-blue-500 text-xs\">Đang làm</span>' : '<span class=\"text-red-400 text-xs\">Chưa nhận</span>')}</div></div>`).join('')}</div>
        </div>`;
    },

    // --- TEAM ---
    renderTeam: (user, reqs) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý','Admin','Giám đốc'].includes(user.role);
        const pendings = reqs ? reqs.filter(r=>r.status==='pending') : [];

        container.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-xl flex items-center gap-4"><div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">${user.name.charAt(0)}</div><div><h2 class="text-lg font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role}</p></div></div>
            <div class="grid grid-cols-2 gap-3">
                <button class="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center gap-2 btn-action" data-action="submitAttendance"><i class="fas fa-clock text-2xl text-green-500"></i><span class="text-xs font-bold text-slate-600">Chấm công</span></button>
                <button class="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center gap-2 btn-action" data-action="toggleModal" data-payload="modal-leave"><i class="fas fa-bed text-2xl text-orange-500"></i><span class="text-xs font-bold text-slate-600">Xin nghỉ</span></button>
                <button class="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center gap-2 btn-action" data-action="toggleModal" data-payload="modal-buy-req"><i class="fas fa-shopping-cart text-2xl text-purple-500"></i><span class="text-xs font-bold text-slate-600">Mua hàng</span></button>
                <button class="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center gap-2 btn-action" data-action="logout"><i class="fas fa-sign-out-alt text-2xl text-slate-400"></i><span class="text-xs font-bold text-slate-600">Đăng xuất</span></button>
            </div>
            ${isManager ? `<div class="mt-4"><h3 class="font-bold text-slate-700 text-sm uppercase mb-2">Duyệt Đơn (${pendings.length})</h3><div class="space-y-2">${pendings.map(r=>`<div class="bg-white p-3 rounded-lg border-l-4 border-yellow-400 shadow-sm flex justify-between"><div><div class="font-bold text-xs">${r.user}</div><div class="text-[10px] text-slate-500">${r.type} - ${r.item||r.reason}</div></div><div class="flex gap-1"><button class="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded btn-action" data-action="approveRequest" data-payload="${r._id}">OK</button><button class="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded btn-action" data-action="rejectRequest" data-payload="${r._id}">NO</button></div></div>`).join('')}</div></div>` : ''}
            <div id="modal-leave" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 space-y-3"><h3 class="font-bold text-center">Xin Nghỉ</h3><input id="leave-date" type="date" class="input-box"><select id="leave-reason" class="input-box"><option>Việc riêng</option><option>Ốm</option></select><div class="flex gap-2"><button class="flex-1 py-2 bg-slate-100 rounded btn-action" data-action="toggleModal" data-payload="modal-leave">Hủy</button><button class="flex-1 py-2 bg-orange-500 text-white rounded btn-action" data-action="submitLeave">Gửi</button></div></div></div>
            <div id="modal-buy-req" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 space-y-3"><h3 class="font-bold text-center">Mua Hàng</h3><input id="buy-name" class="input-box" placeholder="Tên hàng"><div class="flex gap-2"><input id="buy-unit" class="input-box" placeholder="ĐVT"><input id="buy-qty" type="number" class="input-box" placeholder="SL"></div><div class="flex gap-2"><button class="flex-1 py-2 bg-slate-100 rounded btn-action" data-action="toggleModal" data-payload="modal-buy-req">Hủy</button><button class="flex-1 py-2 bg-purple-500 text-white rounded btn-action" data-action="submitBuyRequest">Gửi</button></div></div></div>
        </div>`;
    },

    renderSettings: (employees) => {
        let m = document.getElementById('modal-settings');
        if(!m) { m = document.createElement('div'); m.id='modal-settings'; m.className='hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'; document.body.appendChild(m); }
        m.innerHTML = `<div class="bg-white w-full max-w-md rounded-xl p-5 h-[80vh] flex flex-col"><div class="flex justify-between border-b pb-2 mb-2"><h3 class="font-bold uppercase">Quản Trị</h3><button class="text-2xl" onclick="document.getElementById('modal-settings').classList.add('hidden')">&times;</button></div><div class="flex-1 overflow-y-auto space-y-4"><div><h4 class="font-bold text-blue-600 text-xs uppercase mb-1">Nhân viên</h4><div class="bg-slate-50 p-2 rounded max-h-40 overflow-y-auto">${employees.map(e=>`<div class="flex justify-between text-xs border-b py-1"><span><b>${e.name}</b> (${e.role})</span><button class="text-red-500 font-bold btn-action" data-action="delEmp" data-payload="${e._id}">X</button></div>`).join('')}</div><div class="grid grid-cols-2 gap-1 mt-2"><input id="ne-name" class="input-box text-xs" placeholder="Tên"><input id="ne-pin" class="input-box text-xs" placeholder="PIN"><select id="ne-role" class="input-box text-xs"><option>Nhân viên</option><option>Quản lý</option></select><button class="bg-blue-600 text-white text-xs rounded btn-action" data-action="addEmp">Thêm</button></div></div><div><h4 class="font-bold text-green-600 text-xs uppercase mb-1">Báo cáo</h4><div class="space-y-1"><button class="w-full py-2 bg-green-50 text-green-700 text-xs font-bold rounded btn-action" data-action="export" data-payload="harvest">Xuất Thu Hoạch</button><button class="w-full py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded btn-action" data-action="export" data-payload="tasks">Xuất Công Việc</button></div></div></div></div>`;
    },

    renderChat: (msgs, uid) => {
        const layer = document.getElementById('chat-layer');
        // FIX: Xóa class hidden và ép kiểu flex
        layer.classList.remove('hidden');
        layer.style.display = 'flex';
        
        layer.innerHTML = `<div class="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm"><h3 class="font-black text-slate-700">NHÓM CHUNG</h3><button class="w-8 h-8 bg-slate-100 rounded-full btn-action" data-action="closeChat">✕</button></div><div id="chat-msgs" class="flex-1 bg-slate-100 overflow-y-auto p-4 space-y-2"></div><div class="p-3 bg-white border-t flex gap-2"><input id="chat-input" class="flex-1 bg-slate-100 rounded-full px-4 outline-none text-sm" placeholder="Nhập tin..."><button class="w-10 h-10 bg-blue-600 text-white rounded-full shadow btn-action" data-action="sendChat">➤</button></div>`;
        const box = document.getElementById('chat-msgs');
        box.innerHTML = msgs.map(m => {
            if(m.type==='system') return `<div class="text-center text-[10px] text-slate-400 font-bold uppercase my-2"><span>${m.text}</span></div>`;
            const isMe = String(m.senderId) === String(uid);
            return `<div class="flex flex-col ${isMe?'items-end':'items-start'}"><span class="text-[9px] text-slate-400 px-1">${m.senderName}</span><div class="${isMe?'bg-blue-600 text-white':'bg-white text-slate-800'} px-3 py-2 rounded-xl shadow-sm text-sm max-w-[80%]">${m.text}</div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    }
};
