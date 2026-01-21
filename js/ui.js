export const UI = {
    // 1. FIX LỖI CRASH: Định nghĩa hàm này đầu tiên
    initModals: () => {
        document.body.addEventListener('click', (e) => {
            // Xử lý đóng modal khi click ra ngoài
            if (e.target.classList.contains('fixed') && e.target.classList.contains('z-50')) {
                // Không đóng login và chat
                if(e.target.id !== 'login-overlay' && e.target.id !== 'chat-layer') {
                    e.target.classList.add('hidden');
                }
            }
        });
    },

    playSound: (type) => { try { const a=new AudioContext(); const o=a.createOscillator(); const g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=type==='success'?600:300; g.gain.value=0.1; o.start(); o.stop(a.currentTime+0.2); } catch(e){} },

    toggleModal: (id) => { const el = document.getElementById(id); if(el) el.classList.remove('hidden'); },

    showMsg: (t, type = 'info') => {
        const b = document.getElementById('msg-box'); 
        if(b) {
            b.innerHTML = type === 'error' ? `<i class="fas fa-times-circle text-xl"></i> ${t}` : `<i class="fas fa-check-circle text-xl"></i> ${t}`;
            b.className = `fixed top-5 right-5 px-5 py-4 rounded-xl shadow-2xl text-white font-bold z-[100] flex items-center gap-3 animate-fade ${type==='error'?'bg-red-600':'bg-green-600'}`;
            b.classList.remove('hidden');
            setTimeout(() => b.classList.add('hidden'), 3000);
        }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('text-blue-600', btn.dataset.tab === tabName);
            btn.classList.toggle('text-slate-400', btn.dataset.tab !== tabName);
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        const taskSel = document.getElementById('task-assignee');
        const html = '<option value="">-- Chọn tên --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        if(sel) sel.innerHTML = html;
        if(taskSel) taskSel.innerHTML = html;
    },

    // RENDER CÁC TAB
    renderHome: (houses, harvestLogs, employees) => {
        const container = document.getElementById('view-home');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sorted = [...houses].sort((a, b) => { let iA = houseOrder.indexOf(a.name), iB = houseOrder.indexOf(b.name); return (iA===-1?999:iA) - (iB===-1?999:iB); });
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);
        const top3 = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        const getStyle = (n) => {
            if(n.startsWith('A')) return 'border-purple-300 bg-purple-50 text-purple-900';
            if(n.startsWith('B')) return 'border-blue-300 bg-blue-50 text-blue-900';
            if(n.startsWith('C')) return 'border-green-300 bg-green-50 text-green-900';
            return 'border-slate-300 bg-white text-slate-900';
        };

        container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-b from-white to-amber-50 p-4 rounded-2xl shadow-md border border-amber-100">
                <h3 class="font-black text-amber-700 uppercase text-xs mb-4 text-center tracking-widest">🏆 Bảng Phong Thần</h3>
                <div class="flex justify-center items-end gap-4">
                    ${top3[1] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-slate-300 border-2 border-white shadow flex items-center justify-center font-black">2</div><span class="text-[10px] font-bold mt-1">${top3[1].name}</span><span class="text-[10px] font-black text-amber-600">${top3[1].score||0}đ</span></div>` : ''}
                    ${top3[0] ? `<div class="flex flex-col items-center -mt-4"><div class="w-14 h-14 rounded-full bg-yellow-400 border-4 border-white shadow-lg flex items-center justify-center text-white text-xl font-black">1</div><span class="text-xs font-bold mt-2">${top3[0].name}</span><span class="text-xs font-black text-amber-600">${top3[0].score||0}đ</span></div>` : ''}
                    ${top3[2] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-amber-700 border-2 border-white shadow flex items-center justify-center text-white font-black">3</div><span class="text-[10px] font-bold mt-1">${top3[2].name}</span><span class="text-[10px] font-black text-amber-600">${top3[2].score||0}đ</span></div>` : ''}
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
            ${sorted.map(h => `
                <div class="card p-3 border-l-4 ${getStyle(h.name)} shadow-sm relative">
                    <div class="flex justify-between items-start mb-2">
                        <div><h3 class="font-black text-lg">${h.name}</h3><div class="text-[10px] font-bold opacity-60 uppercase">${h.currentBatch || '-'}</div></div>
                        <span class="text-[9px] px-2 py-1 rounded font-bold ${h.status==='ACTIVE'?'bg-green-600 text-white':'bg-slate-300 text-slate-500'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                    </div>
                    <div class="text-right border-t pt-1 mt-1 border-black/5"><span class="text-[10px] opacity-60 mr-1">Thu:</span><span class="font-black">${getYield(h.name).toFixed(1)} kg</span></div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => t.status === 'done' || t.assignee !== currentUser.name);

        container.innerHTML = `
        <div class="space-y-6">
             ${canAssign ? `
             <div class="card p-5 border border-blue-50">
                <div class="flex justify-between items-center mb-4"><h4 class="font-black text-blue-700 uppercase text-xs tracking-wider">Giao Nhiệm Vụ</h4></div>
                <div class="space-y-3">
                    <input id="task-title" class="input-box text-sm font-bold" placeholder="Tên công việc">
                    <div class="grid grid-cols-2 gap-3"><select id="task-house" class="input-box text-sm"><option value="">-- Nhà/Khu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select><select id="task-assignee" class="input-box text-sm font-bold"><option value="">-- Người làm --</option>${employees.map(e=>`<option value="${e.name}">${e.name}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-3"><input id="task-deadline" type="date" class="input-box text-sm"><button class="btn-primary bg-blue-600 rounded-lg shadow font-bold text-xs btn-action" data-action="addTask">PHÁT LỆNH</button></div>
                    <textarea id="task-desc" class="input-box text-sm" placeholder="Mô tả..."></textarea>
                </div>
             </div>` : ''}
             <div class="space-y-3">
                 <h3 class="font-bold text-slate-700 text-sm uppercase pl-2 border-l-4 border-orange-500">Cần Làm Ngay (${myTasks.length})</h3>
                 ${myTasks.length ? myTasks.map(t => `<div class="card p-4 border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-sm"><div class="flex justify-between items-start mb-2"><h4 class="font-bold text-slate-800">${t.title}</h4><span class="text-[9px] font-black px-2 py-1 rounded ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600'}">${t.status==='received'?'ĐANG LÀM':'MỚI'}</span></div><div class="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded">${t.house||'Chung'} • ${t.desc||'-'}</div>${t.status === 'pending' ? `<button class="w-full bg-red-50 text-red-600 py-3 rounded-lg text-xs font-black btn-action border border-red-100" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>` : `<button class="w-full bg-blue-600 text-white py-3 rounded-lg text-xs font-black btn-action shadow-md" data-action="submitTask" data-payload="${t._id}">BÁO CÁO XONG</button>`}</div>`).join('') : '<div class="text-center p-4 italic text-slate-400 text-sm">Không có việc!</div>'}
             </div>
             <div class="space-y-2 opacity-75"><h3 class="font-bold text-slate-400 text-xs mt-6">Nhật ký</h3>${otherTasks.slice(0, 5).map(t => `<div class="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center"><div><div class="font-bold text-slate-600 text-xs">${t.title}</div><div class="text-[10px] text-slate-400">${t.assignee}</div></div><span class="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded">XONG</span></div>`).join('')}</div>
        </div>`;
    },

    renderTH: (houses, harvestLogs, shippingLogs) => {
        const container = document.getElementById('view-th');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        const g1 = [{c:'b2',l:'B2'},{c:'a1',l:'A1'},{c:'a2',l:'A2'},{c:'b1',l:'B1'},{c:'d1',l:'D1'},{c:'a1f',l:'A1F'},{c:'a2f',l:'A2F'},{c:'b2f',l:'B2F'},{c:'ht',l:'Hầu Thủ'}];
        const g2 = [{c:'cn',l:'Chân nấm'},{c:'hc',l:'Hư hỏng'},{c:'hh',l:'Khác'}];
        const g3 = [{c:'snack',l:'Snack'}, {c:'kho',l:'Nấm Khô'}, {c:'tra',l:'Trà'}, {c:'chan_nam_tp',l:'Chân Nấm'}, {c:'mu_l1',l:'Mũ Hương L1'}, {c:'mu_l2',l:'Mũ Hương L2'}, {c:'hau_thu_kho',l:'Hầu Thủ Khô'}];

        container.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button class="flex-1 py-2 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm btn-action" data-action="toggleTH" data-payload="in">NHẬP</button>
                <button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50 btn-action" data-action="toggleTH" data-payload="out">XUẤT & TỒN</button>
            </div>
            <div id="zone-th">
                <div class="card p-5 border border-green-100">
                    <div class="flex justify-between items-center border-b pb-3 mb-4"><span class="font-black text-green-700 text-sm uppercase"><i class="fas fa-download mr-2"></i>Nhập Kho</span></div>
                    <div class="space-y-4">
                        <select id="th-area" class="input-box text-green-800 font-bold border-green-300"><option value="">-- Chọn Nguồn --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">1. Nấm Tươi (Kg)</h4><div class="grid grid-cols-3 gap-3">${g1.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest w-full text-center font-bold text-sm focus:border-green-500" placeholder="-"></div>`).join('')}</div></div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">2. Phụ Phẩm (Kg)</h4><div class="grid grid-cols-3 gap-3">${g2.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest w-full text-center font-bold text-sm focus:border-orange-500" placeholder="-"></div>`).join('')}</div></div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">3. Thành Phẩm (Gói/Kg)</h4><div class="grid grid-cols-3 gap-3">${g3.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" id="th-${m.c}" class="input-harvest w-full text-center font-bold text-sm focus:border-purple-500" placeholder="-"></div>`).join('')}</div></div>
                        <button class="btn-primary w-full bg-green-600 py-3 rounded-xl font-black shadow-lg btn-action" data-action="submitTH">LƯU KHO</button>
                    </div>
                </div>
            </div>
            <div id="zone-ship" class="hidden">
                <div class="card p-5 border border-orange-100">
                    <h4 class="font-black text-orange-700 text-sm uppercase mb-4 flex items-center"><i class="fas fa-truck mr-2"></i>Xuất Bán</h4>
                    <div class="space-y-3">
                        <input id="ship-cust" class="input-box font-bold" placeholder="Khách hàng">
                        <div class="grid grid-cols-2 gap-3"><select id="ship-type" class="input-box text-sm"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Snack</option><option>Trà</option></select><input id="ship-qty" type="number" class="input-box font-black text-orange-600 text-center" placeholder="Số lượng"></div>
                        <textarea id="ship-note" class="input-box text-sm" placeholder="Ghi chú..."></textarea>
                        <button class="btn-primary w-full bg-orange-600 py-3 rounded-xl font-black shadow-lg btn-action" data-action="submitShip">LƯU & IN</button>
                    </div>
                </div>
                <div class="mt-4 card p-4 border border-slate-200"><h4 class="font-bold text-slate-700 text-xs uppercase mb-3">Kiểm Kê Kho</h4><div class="flex gap-2 items-end"><div class="flex-1"><label class="text-[9px] text-slate-400 font-bold">TỒN MÁY</label><div class="bg-slate-100 p-3 rounded-lg text-slate-500 font-bold text-sm border">150.0</div></div><div class="flex-1"><label class="text-[9px] text-slate-400 font-bold">THỰC TẾ</label><input id="stock-count" type="number" class="input-box p-2.5 text-center font-bold text-blue-600"></div><button class="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs btn-action shadow h-11" data-action="calcVariance">TÍNH</button></div><div id="stock-variance-res" class="mt-3 hidden p-3 rounded-lg text-center text-sm font-bold"></div></div>
            </div>
        </div>`;
    },

    renderTeam: (user, reqs, employees) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
        const pendings = reqs ? reqs.filter(r => r.status === 'pending') : [];

        let empList = '';
        if (isManager && employees) {
            empList = `
            <div class="mt-6">
                <h3 class="font-black text-slate-700 text-sm uppercase mb-3 border-l-4 border-red-500 pl-2">Quản Lý & Kỷ Luật</h3>
                <div class="card overflow-hidden">
                    ${employees.map(e => `<div class="flex items-center justify-between p-3 border-b border-slate-100 last:border-0"><div><div class="font-bold text-sm text-slate-800">${e.name}</div><div class="text-[10px] text-slate-400 font-bold">Điểm: <span class="text-amber-600">${e.score||0}</span></div></div><div class="flex gap-2"><button class="w-8 h-8 rounded-full bg-red-50 text-red-600 font-bold text-[10px] btn-action border border-red-100" data-action="punishEmp" data-payload="${e._id}|5">-5</button><button class="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-[10px] btn-action border border-red-200" data-action="punishEmp" data-payload="${e._id}|10">-10</button></div></div>`).join('')}
                    <div class="p-3 bg-slate-50 flex gap-2"><input id="new-emp-name" class="input-box text-xs w-2/3" placeholder="Tên NV"><input id="new-emp-pin" class="input-box text-xs w-1/3" placeholder="PIN"><button class="bg-blue-600 text-white rounded px-3 font-bold text-xs btn-action" data-action="adminAddEmp">+</button></div>
                </div>
            </div>`;
        }

        container.innerHTML = `<div class="p-4 space-y-4">
            <div class="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 rounded-3xl text-white shadow-xl flex items-center gap-5">
                <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black backdrop-blur-sm shadow-inner">${user.name.charAt(0)}</div>
                <div><h2 class="text-xl font-black uppercase tracking-wide">${user.name}</h2><p class="text-xs font-medium opacity-80 bg-white/10 px-2 py-1 rounded inline-block mt-1">${user.role}</p></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-6">
                <button class="card p-4 flex flex-col items-center gap-2 btn-action active:bg-green-50 transition" data-action="submitAttendance"><div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl"><i class="fas fa-fingerprint"></i></div><span class="text-xs font-black text-slate-700">ĐIỂM DANH</span></button>
                <button class="card p-4 flex flex-col items-center gap-2 btn-action active:bg-orange-50 transition" data-action="openModal" data-payload="modal-leave"><div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xl"><i class="fas fa-file-signature"></i></div><span class="text-xs font-black text-slate-700">XIN NGHỈ</span></button>
                <button class="card p-4 flex flex-col items-center gap-2 btn-action active:bg-purple-50 transition" data-action="openModal" data-payload="modal-buy-req"><div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl"><i class="fas fa-shopping-basket"></i></div><span class="text-xs font-black text-slate-700">MUA HÀNG</span></button>
                <button class="card p-4 flex flex-col items-center gap-2 btn-action active:bg-slate-100 transition" data-action="logout"><div class="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xl"><i class="fas fa-power-off"></i></div><span class="text-xs font-black text-slate-700">THOÁT</span></button>
            </div>
            ${(isManager || user.role === 'Tổ trưởng') ? `<div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4"><h3 class="font-black text-yellow-800 text-xs mb-3 uppercase flex items-center"><i class="fas fa-bell mr-2"></i>Duyệt Đơn (${pendings.length})</h3>${pendings.length ? pendings.map(r=>`<div class="bg-white p-3 mb-2 rounded-lg flex justify-between items-center shadow-sm"><div><b class="text-xs text-slate-800">${r.user}</b><div class="text-[10px] text-slate-500">${r.type}: ${r.item||r.reason}</div></div><div class="flex gap-2"><button class="bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold btn-action shadow" data-action="approveRequest" data-payload="${r._id}">DUYỆT</button><button class="bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold btn-action shadow" data-action="rejectRequest" data-payload="${r._id}">HỦY</button></div></div>`).join('') : '<span class="text-xs italic text-slate-400 block text-center">Không có yêu cầu nào.</span>'}</div>` : ''}
            ${empList}
        </div>`;
    },

    renderChat: (msgs, uid) => {
        const layer = document.getElementById('chat-layer');
        layer.classList.remove('hidden'); layer.style.display = 'flex';
        // HTML đã có trong index.html, chỉ cần render msg
        const box = document.getElementById('chat-msgs');
        box.innerHTML = msgs.map(m => {
            if(m.type==='system') return `<div class="text-center text-[10px] text-slate-500 font-bold bg-white/80 rounded-full py-1 px-3 mx-auto w-fit my-2 shadow-sm backdrop-blur-sm border border-white"><span>${m.text}</span></div>`;
            const isMe = String(m.senderId) === String(uid);
            return `<div class="flex flex-col ${isMe?'items-end':'items-start'} animate-fade"><span class="text-[9px] text-slate-500 px-1 mb-0.5 font-bold">${m.senderName}</span><div class="${isMe?'bg-green-100 text-slate-900 border border-green-200 rounded-br-none':'bg-white text-slate-900 border border-slate-200 rounded-bl-none'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] leading-relaxed">${m.text}</div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    },
    
    renderSX: (houses) => { 
        const container = document.getElementById('view-sx');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        container.innerHTML = `<div class="p-4"><div class="card p-4 border border-blue-100 space-y-3"><h3 class="font-black text-blue-700 uppercase border-b pb-2">Nhập Phôi (Kho A)</h3><select id="sx-house-select" class="input-box text-blue-800 font-bold">${sorted.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select><div class="grid grid-cols-2 gap-3"><input id="sx-strain" class="input-box" placeholder="Mã giống"><input id="sx-date" type="date" class="input-box"></div><input id="sx-spawn-qty" type="number" class="input-box text-lg font-bold text-blue-600" placeholder="Số lượng"><button class="btn-primary w-full bg-blue-600 py-3 rounded-lg font-bold shadow-md btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ</button></div></div>`;
    },
    renderSettingsModal: () => {
        const m = document.getElementById('modal-settings'); m.classList.remove('hidden');
        m.innerHTML = `<div class="card w-full max-w-md p-5 h-[80vh] flex flex-col"><div class="flex justify-between border-b pb-3 mb-3"><h3 class="font-black text-xl text-slate-700 uppercase">Quản Trị</h3><button class="text-2xl text-slate-400 modal-close-btn" data-payload="modal-settings">&times;</button></div><div class="flex-1 overflow-y-auto space-y-6"><div><h4 class="font-bold text-green-700 uppercase text-sm mb-2">Tiện Ích</h4><div class="grid grid-cols-2 gap-2"><button class="py-2 bg-blue-100 text-blue-700 font-bold rounded btn-action" data-action="installApp"><i class="fas fa-download mr-1"></i> Cài App</button><button class="py-2 bg-orange-100 text-orange-700 font-bold rounded btn-action" data-action="enableNotif"><i class="fas fa-bell mr-1"></i> Bật Thông Báo</button></div></div><div><h4 class="font-bold text-green-700 uppercase text-sm mb-2">Xuất Báo Cáo</h4><div class="grid grid-cols-1 gap-2"><button class="py-2 bg-green-100 text-green-700 font-bold rounded btn-action" data-action="adminExport" data-payload="harvest">📥 Báo cáo Thu Hoạch</button><button class="py-2 bg-blue-100 text-blue-700 font-bold rounded btn-action" data-action="adminExport" data-payload="tasks">📥 Báo cáo Công Việc</button><button class="py-2 bg-orange-100 text-orange-700 font-bold rounded btn-action" data-action="adminExport" data-payload="attendance">📥 Báo cáo Chấm Công</button></div></div></div></div>`;
    }
};
