export const UI = {
    // ... UTILS ...
    playSound: (type) => { try { const a=new AudioContext(); const o=a.createOscillator(); const g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=type==='success'?600:300; g.gain.value=0.1; o.start(); o.stop(a.currentTime+0.2); } catch(e){} },
    initModals: () => {
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('fixed') && e.target.classList.contains('z-[120]')) {
                e.target.classList.add('hidden');
            }
        });
    },
    toggleModal: (id) => document.getElementById(id)?.classList.remove('hidden'),
    showMsg: (t) => { const b = document.getElementById('msg-box'); if(b) { b.innerText = t; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 3000); } },
    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabName) { btn.classList.add('text-blue-600', '-translate-y-1'); btn.classList.remove('text-slate-400'); }
            else { btn.classList.remove('text-blue-600', '-translate-y-1'); btn.classList.add('text-slate-400'); }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },
    renderEmployeeOptions: (employees) => {
        const h = '<option value="">-- Chọn --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        const s1 = document.getElementById('login-user'); if(s1) s1.innerHTML = h;
    },

    // 1. HOME
    renderHome: (houses, harvestLogs, employees) => {
        const container = document.getElementById('view-home');
        const sorted = [...houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', {numeric: true}));
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);
        const top3 = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);
        const getStyle = (n) => {
            if(n.startsWith('A')) return 'border-purple-500 bg-purple-50';
            if(n.startsWith('B')) return 'border-blue-500 bg-blue-50';
            if(n.startsWith('C')) return 'border-green-500 bg-green-50';
            return 'border-slate-300 bg-white';
        };

        container.innerHTML = `
        <div class="space-y-5">
            <div class="glass p-5 !bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg">
                <h3 class="font-bold text-xs uppercase tracking-widest mb-4 opacity-80 text-center">Bảng Phong Thần</h3>
                <div class="flex justify-center items-end gap-4">
                    ${top3[1] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold mb-1">2</div><span class="text-[10px] font-bold">${top3[1].name}</span><span class="text-[10px] opacity-80">${top3[1].score}đ</span></div>` : ''}
                    ${top3[0] ? `<div class="flex flex-col items-center -mt-4"><div class="w-14 h-14 rounded-full bg-yellow-400 text-slate-900 shadow-lg flex items-center justify-center text-xl font-black mb-1">1</div><span class="text-xs font-black">${top3[0].name}</span><span class="text-xs font-bold text-yellow-300">${top3[0].score}đ</span></div>` : ''}
                    ${top3[2] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold mb-1">3</div><span class="text-[10px] font-bold">${top3[2].name}</span><span class="text-[10px] opacity-80">${top3[2].score}đ</span></div>` : ''}
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                ${sorted.map(h => `
                <div class="glass p-3 border-l-4 ${getStyle(h.name)} relative">
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-black text-lg text-slate-700">${h.name}</span>
                        <span class="text-[9px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-600 text-white':'bg-slate-200 text-slate-500'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">${h.currentBatch||'-'}</div>
                    <div class="text-right"><span class="text-xl font-black text-slate-700">${getYield(h.name).toFixed(1)}</span> <span class="text-[10px] text-slate-400">kg</span></div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    // 2. VIỆC (NÂNG CẤP: GIAO NHIỀU NGƯỜI)
    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => t.status === 'done' || t.assignee !== currentUser.name);

        // Tạo danh sách checkbox nhân viên
        const empCheckboxes = employees.map(e => `
            <label class="flex items-center space-x-2 bg-slate-50 p-2 rounded cursor-pointer">
                <input type="checkbox" class="task-emp-check w-4 h-4 !p-0" value="${e.name}">
                <span class="text-xs font-bold text-slate-700">${e.name}</span>
            </label>
        `).join('');

        container.innerHTML = `
        <div class="space-y-6">
             ${canAssign ? `
             <div class="glass p-5 border-l-4 border-blue-500">
                <h4 class="font-black text-slate-700 uppercase text-xs mb-3">Giao Nhiệm Vụ (Nhiều người)</h4>
                <div class="space-y-3">
                    <input id="task-title" placeholder="Tên công việc">
                    <div class="grid grid-cols-2 gap-3">
                        <select id="task-house"><option value="">-- Nhà/Khu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select>
                        <input id="task-deadline" type="date">
                    </div>
                    <div class="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 grid grid-cols-2 gap-2">
                        ${empCheckboxes}
                    </div>
                    <textarea id="task-desc" placeholder="Mô tả..."></textarea>
                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold btn-action" data-action="addTask">PHÁT LỆNH</button>
                </div>
             </div>` : ''}
             <div>
                 <h3 class="font-bold text-slate-400 text-xs uppercase pl-2">Cần Làm Ngay</h3>
                 ${myTasks.length ? myTasks.map(t => `<div class="glass p-4 border-l-4 ${t.status==='received'?'border-blue-500':'border-orange-500'} mb-2"><div class="flex justify-between items-start mb-2"><h4 class="font-bold text-slate-800">${t.title}</h4><span class="text-[9px] font-black px-2 py-1 rounded ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-orange-100 text-orange-600'}">${t.status==='received'?'ĐANG LÀM':'MỚI'}</span></div><div class="text-xs text-slate-500 mb-3">${t.house||'Chung'} • ${t.desc||'-'}</div>${t.status === 'pending' ? `<button class="w-full bg-orange-50 text-orange-600 py-2 rounded-lg text-xs font-bold btn-action" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>` : `<button class="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold btn-action shadow-md" data-action="submitTask" data-payload="${t._id}">BÁO CÁO XONG</button>`}</div>`).join('') : '<div class="text-center p-4 italic text-slate-400 text-sm">Không có việc!</div>'}
             </div>
             <div class="space-y-2 opacity-75"><h3 class="font-bold text-slate-400 text-xs mt-6">Nhật ký</h3>${otherTasks.slice(0, 5).map(t => `<div class="glass p-3 flex justify-between items-center"><div><div class="font-bold text-slate-600 text-xs">${t.title}</div><div class="text-[10px] text-slate-400">${t.assignee}</div></div><span class="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded">XONG</span></div>`).join('')}</div>
        </div>`;
    },

    // 3. SX (THÊM GHI CHÚ)
    renderSX: (houses) => { 
        const container = document.getElementById('view-sx');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        container.innerHTML = `
        <div class="p-4"><div class="glass p-5 border-l-4 border-blue-500 space-y-4">
            <h3 class="font-black text-slate-700 uppercase">Nhập Phôi (Kho A)</h3>
            <select id="sx-house-select" class="font-bold">${sorted.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select>
            <div class="grid grid-cols-2 gap-3"><input id="sx-strain" placeholder="Mã giống"><input id="sx-date" type="date"></div>
            <input id="sx-spawn-qty" type="number" placeholder="Số lượng bịch" class="text-lg font-bold text-blue-600">
            <textarea id="sx-note" placeholder="Ghi chú (Tên nhà cung cấp...)" class="h-20"></textarea>
            <button class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ MỚI</button>
        </div></div>`;
    },

    // 4. THDG (GIỮ NGUYÊN DANH SÁCH ĐỘNG)
    renderTH: (houses, harvestLogs, shippingLogs, products) => {
        const container = document.getElementById('view-th');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        const g1 = products.filter(p => p.group == '1');
        const g2 = products.filter(p => p.group == '2');
        const g3 = products.filter(p => p.group == '3');

        container.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button class="flex-1 py-2 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm btn-action" data-action="toggleTH" data-payload="in">NHẬP KHO</button>
                <button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50 btn-action" data-action="toggleTH" data-payload="out">XUẤT BÁN</button>
            </div>
            <div id="zone-th" class="glass p-5 border-l-4 border-green-500">
                <div class="flex justify-between items-center mb-4"><span class="font-black text-slate-700 uppercase">Nhập Kho</span><button class="text-xs bg-slate-100 px-3 py-1 rounded text-blue-600 font-bold btn-action" data-action="openModal" data-payload="modal-add-prod">+ Mã SP</button></div>
                <div class="space-y-4">
                    <select id="th-area" class="font-bold text-green-700"><option value="">-- Chọn Nguồn --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                    ${g1.length ? `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">1. Nấm Tươi</h4><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm" placeholder="-"></div>`).join('')}</div></div>` : ''}
                    ${g2.length ? `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">2. Phụ Phẩm</h4><div class="grid grid-cols-3 gap-3">${g2.map(p=>`<div><label class="text-[9px] font-bold text-slate-400 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm" placeholder="-"></div>`).join('')}</div></div>` : ''}
                    ${g3.length ? `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">3. Thành Phẩm</h4><div class="grid grid-cols-3 gap-3">${g3.map(p=>`<div><label class="text-[9px] font-bold text-slate-400 block truncate text-center mb-1">${p.name}</label><input type="number" id="th-${p.code}" class="text-center font-bold text-sm" placeholder="-"></div>`).join('')}</div></div>` : ''}
                    <button class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitTH">LƯU KHO</button>
                </div>
            </div>
            <div id="zone-ship" class="hidden glass p-5 border-l-4 border-orange-500">
                <h4 class="font-black text-slate-700 uppercase mb-4">Xuất Bán</h4>
                <div class="space-y-3"><input id="ship-cust" placeholder="Khách hàng"><div class="grid grid-cols-2 gap-3"><select id="ship-type"><option>Nấm Tươi</option><option>Thành Phẩm</option></select><input id="ship-qty" type="number" placeholder="Số lượng"></div><textarea id="ship-note" placeholder="Ghi chú..."></textarea><button class="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitShip">XUẤT & IN</button></div>
            </div>
        </div>`;
    },

    // 5. TEAM (ĐẢM BẢO HIỂN THỊ NÚT +/-)
    renderTeam: (user, reqs, employees) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
        let empList = '';
        if (isManager && employees) {
            empList = `<div class="mt-6"><h3 class="font-black text-slate-700 text-sm uppercase mb-3 pl-2 border-l-4 border-red-500">Quản Lý</h3><div class="card overflow-hidden">${employees.map(e => `<div class="flex justify-between items-center p-4 border-b border-slate-50 last:border-0"><div><div class="font-bold text-sm">${e.name}</div><div class="text-[10px] text-amber-600 font-bold">${e.score}đ</div></div><div class="flex gap-2"><button class="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold btn-action" data-action="punishEmp" data-payload="${e._id}|5">-5</button><button class="bg-green-50 text-green-600 px-3 py-1 rounded text-xs font-bold btn-action" data-action="punishEmp" data-payload="${e._id}|-5">+5</button></div></div>`).join('')}</div></div>`;
        }
        container.innerHTML = `<div class="p-4 space-y-4"><div class="glass p-6 !bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-xl flex items-center gap-5"><div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">${user.name.charAt(0)}</div><div><h2 class="text-xl font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role}</p></div></div><div class="grid grid-cols-2 gap-3 mb-6"><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="submitAttendance"><i class="fas fa-fingerprint text-2xl text-green-600"></i><span class="text-xs font-bold">ĐIỂM DANH</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="openModal" data-payload="modal-leave"><i class="fas fa-umbrella-beach text-2xl text-orange-600"></i><span class="text-xs font-bold">XIN NGHỈ</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="openModal" data-payload="modal-buy-req"><i class="fas fa-shopping-cart text-2xl text-purple-600"></i><span class="text-xs font-bold">MUA HÀNG</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="logout"><i class="fas fa-power-off text-2xl text-slate-500"></i><span class="text-xs font-bold">THOÁT</span></button></div>${empList}</div>`;
    },

    renderChat: (msgs, uid) => { /* Giữ nguyên */ const b = document.getElementById('chat-msgs'); b.innerHTML = msgs.map(m => `<div class="flex flex-col ${String(m.senderId)===String(uid)?'items-end':'items-start'} animate-fade"><span class="text-[9px] text-slate-400 px-2 uppercase font-bold">${m.senderName}</span><div class="${String(m.senderId)===String(uid)?'bg-blue-600 text-white':'bg-white text-slate-700'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] mb-2">${m.text}</div></div>`).join(''); b.scrollTop = b.scrollHeight; document.getElementById('chat-layer').classList.remove('hidden'); },
    renderSettingsModal: () => { /* Giữ nguyên */ const m = document.getElementById('modal-settings'); m.classList.remove('hidden'); m.innerHTML = `<div class="card w-full max-w-md p-5 h-[80vh] flex flex-col"><div class="flex justify-between border-b pb-3 mb-3"><h3 class="font-black text-xl text-slate-700 uppercase">Quản Trị</h3><button class="text-2xl text-slate-400 modal-close-btn" data-payload="modal-settings">&times;</button></div><div class="flex-1 overflow-y-auto space-y-6"><div><h4 class="font-bold text-green-600 text-xs uppercase mb-2">Tiện Ích</h4><div class="grid grid-cols-2 gap-2"><button class="py-2 bg-blue-100 text-blue-700 font-bold rounded btn-action" data-action="installApp">Cài App</button><button class="py-2 bg-orange-100 text-orange-700 font-bold rounded btn-action" data-action="enableNotif">Bật Thông Báo</button></div></div><div><h4 class="font-bold text-green-600 text-xs uppercase mb-2">Báo cáo</h4><div class="grid grid-cols-1 gap-2"><button class="py-2 bg-green-100 text-green-700 font-bold rounded btn-action" data-action="adminExport" data-payload="harvest">📥 Báo cáo Thu Hoạch</button><button class="py-2 bg-blue-100 text-blue-700 font-bold rounded btn-action" data-action="adminExport" data-payload="tasks">📥 Báo cáo Công Việc</button></div></div></div></div>`; },
    renderAddProductModal: () => { const m = document.getElementById('modal-add-prod'); m.classList.remove('hidden'); m.innerHTML = `<div class="glass w-full max-w-sm p-6 space-y-4 shadow-2xl border-t-4 border-blue-600"><h3 class="font-black text-center text-blue-700 text-lg uppercase">Thêm Mã Hàng</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Tên hiển thị</label><input id="new-prod-name" placeholder="VD: Nấm Mỡ"></div><div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" placeholder="VD: nam_mo"></div><div><label class="text-xs font-bold text-slate-500">Nhóm</label><select id="new-prod-group"><option value="1">1. Tươi</option><option value="2">2. Phụ Phẩm</option><option value="3">3. Thành Phẩm</option></select></div></div><div class="flex gap-3 pt-2"><button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="closeModal" data-target="modal-add-prod">Hủy</button><button class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold btn-action shadow-lg" data-action="submitAddProd">Lưu Mã</button></div></div>`; }
};
