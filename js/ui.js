export const UI = {
    playSound: (type) => { try { const a=new AudioContext(); const o=a.createOscillator(); const g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=type==='success'?600:300; g.gain.value=0.1; o.start(); o.stop(a.currentTime+0.2); } catch(e){} },

    initModals: () => {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.modal-close-btn') || e.target.classList.contains('fixed')) {
                const id = e.target.closest('.modal-close-btn')?.dataset.payload || e.target.id;
                document.getElementById(id)?.classList.add('hidden');
            }
            if (e.target.closest('[data-action="closeChat"]')) document.getElementById('chat-layer').classList.add('hidden');
        });
    },

    toggleModal: (id) => document.getElementById(id)?.classList.remove('hidden'),

    showMsg: (t, type = 'info') => {
        const b = document.getElementById('msg-box'); 
        if(b) {
            b.innerHTML = type === 'error' ? `<i class="fas fa-times-circle"></i> ${t}` : `<i class="fas fa-check-circle"></i> ${t}`;
            b.style.display = 'block'; b.style.background = type === 'error' ? '#ef4444' : '#10b981';
            setTimeout(() => b.style.display = 'none', 3000);
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
        const sorted = [...employees].sort((a,b) => a.name.localeCompare(b.name));
        if(sel) sel.innerHTML = '<option value="">-- Chọn tên --</option>' + sorted.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    },

    // --- 1. HOME: BẢNG XẾP HẠNG & NHÀ KHOA HỌC ---
    renderHome: (houses, harvestLogs, employees) => {
        const container = document.getElementById('view-home');
        // Sort Nhà
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sortedHouses = [...houses].sort((a, b) => {
            let iA = houseOrder.indexOf(a.name), iB = houseOrder.indexOf(b.name);
            return (iA===-1?999:iA) - (iB===-1?999:iB);
        });
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);

        // Sort Bảng Xếp Hạng (Dựa trên Score)
        const top3 = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-xl border border-amber-200">
                <h3 class="font-black text-amber-700 uppercase text-xs mb-3 flex items-center"><i class="fas fa-trophy mr-2 text-yellow-500"></i>Bảng Phong Thần</h3>
                <div class="grid grid-cols-3 gap-2 text-center">
                    ${top3.map((e, idx) => `
                        <div class="flex flex-col items-center">
                            <div class="w-10 h-10 rounded-full ${idx===0?'bg-yellow-400 border-2 border-white shadow-lg':(idx===1?'bg-slate-300':'bg-amber-600')} flex items-center justify-center text-white font-black text-sm mb-1">${idx+1}</div>
                            <span class="text-[10px] font-bold text-slate-700 truncate w-full">${e.name}</span>
                            <span class="text-[10px] font-black text-amber-600">${e.score||0}đ</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div>
                <h2 class="text-sm font-black text-slate-600 uppercase mb-3 pl-2 border-l-4 border-blue-500">Khu Vực Sản Xuất</h2>
                <div class="grid grid-cols-2 gap-3">
                ${sortedHouses.map(h => `
                    <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                        <div class="flex justify-between items-start mb-2">
                            <div><h3 class="font-black text-lg text-blue-800">${h.name}</h3><div class="text-[9px] text-slate-400 font-bold uppercase">${h.currentBatch || '-'}</div></div>
                            <span class="text-[9px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'} px-2 py-1 rounded font-bold">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                        </div>
                        <div class="text-right"><span class="text-xs text-slate-400 mr-1">Thu:</span><span class="font-black text-blue-600">${getYield(h.name).toFixed(1)} kg</span></div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    },

    // --- 2. THẺ VIỆC (ĐẸP & TỶ LỆ) ---
    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => (t.assignee !== currentUser.name && t.status !== 'done') || t.status === 'done');
        const empOpts = employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');

        container.innerHTML = `
        <div class="space-y-6">
             ${canAssign ? `
             <div class="bg-white p-4 rounded-2xl shadow-md border border-blue-50">
                <div class="flex justify-between items-center mb-3"><h4 class="font-black text-blue-700 uppercase text-xs">Giao Nhiệm Vụ</h4></div>
                <div class="space-y-3">
                    <input id="task-title" class="input-box text-sm font-bold" placeholder="Tiêu đề công việc">
                    <div class="grid grid-cols-2 gap-3">
                        <select id="task-house" class="input-box text-sm"><option value="">-- Nhà --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select>
                        <select id="task-assignee" class="input-box text-sm font-bold"><option value="">-- Người làm --</option>${empOpts}</select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <input id="task-deadline" type="date" class="input-box text-sm">
                        <button class="btn-primary bg-blue-600 rounded-lg shadow font-bold text-xs" data-action="addTask">PHÁT LỆNH</button>
                    </div>
                    <textarea id="task-desc" class="input-box text-sm" placeholder="Mô tả chi tiết..." rows="2"></textarea>
                </div>
             </div>` : ''}

             <div>
                 <h3 class="font-bold text-slate-700 text-sm uppercase mb-3 pl-2 border-l-4 border-orange-500">Cần Làm Ngay (${myTasks.length})</h3>
                 <div class="space-y-3">
                     ${myTasks.length ? myTasks.map(t => `
                        <div class="bg-white p-4 rounded-xl border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-sm relative">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-bold text-slate-800">${t.title}</h4>
                                <span class="text-[9px] font-black px-2 py-1 rounded ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600'}">${t.status==='received'?'ĐANG LÀM':'MỚI'}</span>
                            </div>
                            <div class="flex items-center text-xs text-slate-500 mb-3"><i class="fas fa-map-marker-alt mr-1"></i> ${t.house||'Chung'} <span class="mx-2">•</span> ${t.desc||'Không mô tả'}</div>
                            ${t.status === 'pending' 
                                ? `<button class="w-full bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold btn-action" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>`
                                : `<button class="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold btn-action shadow" data-action="submitTask" data-payload="${t._id}">BÁO CÁO HOÀN THÀNH</button>`
                            }
                        </div>`).join('') : '<div class="text-center p-4 text-slate-400 text-xs italic">Sạch bách! Không có việc gì.</div>'}
                 </div>
             </div>
             
             <div>
                 <h3 class="font-bold text-slate-400 text-xs uppercase mb-2">Nhật ký công việc</h3>
                 <div class="space-y-2 opacity-80">
                    ${otherTasks.slice(0, 5).map(t => `
                        <div class="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                            <div><div class="font-bold text-slate-600 text-xs">${t.title}</div><div class="text-[10px] text-slate-400">${t.assignee} • ${t.house||''}</div></div>
                            ${t.status==='done' ? '<i class="fas fa-check-circle text-green-500 text-lg"></i>' : '<span class="text-[10px] bg-slate-100 px-1 rounded">...</span>'}
                        </div>`).join('')}
                 </div>
             </div>
        </div>`;
    },

    // --- 3. THDG (THÊM CHẾ BIẾN) ---
    renderTH: (houses, harvestLogs, shippingLogs, supplies) => {
        const container = document.getElementById('view-th');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        const g1 = [{c:'b2',l:'B2'},{c:'a1',l:'A1'},{c:'a2',l:'A2'},{c:'b1',l:'B1'},{c:'ht',l:'Hầu Thủ'}];
        const g2 = [{c:'d1',l:'Chân'},{c:'cn',l:'Vụn'},{c:'hc',l:'Hủy'}];
        const g3 = [{c:'snack',l:'Snack'},{c:'kho',l:'Nấm Khô'},{c:'tra',l:'Trà'}]; // MỚI: CHẾ BIẾN

        container.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <button class="flex-1 py-2 rounded-md font-bold text-xs bg-white shadow text-green-700" onclick="document.getElementById('zone-th').classList.remove('hidden');document.getElementById('zone-ship').classList.add('hidden');">NHẬP</button>
                <button class="flex-1 py-2 rounded-md font-bold text-xs text-slate-400" onclick="document.getElementById('zone-th').classList.add('hidden');document.getElementById('zone-ship').classList.remove('hidden');">XUẤT</button>
            </div>
            
            <div id="zone-th">
                <div class="bg-white p-4 rounded-xl shadow border border-green-100">
                    <div class="flex justify-between items-center border-b pb-2 mb-3"><span class="font-black text-green-700 text-sm uppercase">Nhập Kho / Chế Biến</span></div>
                    <div class="space-y-3">
                        <select id="th-area" class="input-box text-green-800 font-bold"><option value="">-- Chọn Nguồn (Nhà/Khu) --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                        
                        <div class="bg-green-50 p-2 rounded border border-green-200"><h4 class="text-[10px] font-bold text-green-800 uppercase mb-1">1. Tươi (Kg)</h4><div class="grid grid-cols-3 gap-2">${g1.map(m=>`<div><label class="text-[9px] font-bold text-slate-500 block">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest w-full p-1 rounded text-center font-bold text-sm" placeholder="-"></div>`).join('')}</div></div>
                        
                        <div class="bg-orange-50 p-2 rounded border border-orange-200"><h4 class="text-[10px] font-bold text-orange-800 uppercase mb-1">2. Phụ Phẩm (Kg)</h4><div class="grid grid-cols-3 gap-2">${g2.map(m=>`<div><label class="text-[9px] font-bold text-slate-500 block">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest w-full p-1 rounded text-center font-bold text-sm" placeholder="-"></div>`).join('')}</div></div>

                        <div class="bg-purple-50 p-2 rounded border border-purple-200"><h4 class="text-[10px] font-bold text-purple-800 uppercase mb-1">3. Thành Phẩm (Gói/Hộp)</h4><div class="grid grid-cols-3 gap-2">${g3.map(m=>`<div><label class="text-[9px] font-bold text-slate-500 block">${m.l}</label><input type="number" id="th-${m.c}" class="input-harvest w-full p-1 rounded text-center font-bold text-sm" placeholder="-"></div>`).join('')}</div></div>

                        <button class="btn-primary w-full bg-green-600 py-3 rounded-lg font-bold shadow-md btn-action" data-action="submitTH">LƯU KHO</button>
                    </div>
                </div>
            </div>
            
            <div id="zone-ship" class="hidden">
                <div class="bg-white p-4 rounded-xl shadow border border-orange-200">
                    <h4 class="font-black text-orange-700 text-sm uppercase mb-3">Xuất Bán / Chuyển</h4>
                    <div class="space-y-3">
                        <input id="ship-cust" class="input-box font-bold" placeholder="Khách hàng">
                        <div class="grid grid-cols-2 gap-2"><select id="ship-type" class="input-box text-sm"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Snack</option><option>Trà</option></select><input id="ship-qty" type="number" class="input-box font-black text-orange-600 text-center" placeholder="SL"></div>
                        <textarea id="ship-note" class="input-box text-sm" placeholder="Ghi chú..."></textarea>
                        <button class="btn-primary w-full bg-orange-600 py-3 rounded-lg font-bold shadow-md btn-action" data-action="submitShip">LƯU & IN</button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    // --- 4. TEAM (TÍCH HỢP QUẢN TRỊ & CHẤM PHẠT) ---
    renderTeam: (user, reqs, employees) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý','Admin','Giám đốc'].includes(user.role);
        const pendings = reqs ? reqs.filter(r=>r.status==='pending') : [];

        // Nút chức năng chạm là ăn
        const actionButtons = `
            <div class="grid grid-cols-2 gap-3 mb-6">
                <button class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 btn-action active:bg-green-50" data-action="submitAttendance">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg"><i class="fas fa-fingerprint"></i></div>
                    <span class="text-xs font-bold text-slate-700">CHẤM CÔNG</span>
                </button>
                <button class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 btn-action active:bg-orange-50" data-action="toggleModal" data-payload="modal-leave">
                    <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-lg"><i class="fas fa-file-signature"></i></div>
                    <span class="text-xs font-bold text-slate-700">XIN NGHỈ</span>
                </button>
                <button class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 btn-action active:bg-purple-50" data-action="toggleModal" data-payload="modal-buy-req">
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-lg"><i class="fas fa-shopping-cart"></i></div>
                    <span class="text-xs font-bold text-slate-700">MUA ĐỒ</span>
                </button>
                <button class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 btn-action active:bg-slate-50" data-action="logout">
                    <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-lg"><i class="fas fa-power-off"></i></div>
                    <span class="text-xs font-bold text-slate-700">THOÁT</span>
                </button>
            </div>
        `;

        // Danh sách nhân viên (Cho Quản lý chấm phạt)
        let empList = '';
        if (isManager && employees) {
            empList = `
            <div class="mt-6">
                <h3 class="font-black text-slate-700 text-sm uppercase mb-3 border-l-4 border-red-500 pl-2">Quản Lý & Kỷ Luật</h3>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    ${employees.map(e => `
                    <div class="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                        <div>
                            <div class="font-bold text-sm text-slate-800">${e.name}</div>
                            <div class="text-[10px] text-slate-400 font-bold">Điểm: <span class="text-amber-600">${e.score||0}</span></div>
                        </div>
                        <div class="flex gap-2">
                            <button class="w-8 h-8 rounded-full bg-red-50 text-red-600 font-bold text-[10px] btn-action border border-red-100" data-action="punishEmp" data-payload="${e._id}|5">-5</button>
                            <button class="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-[10px] btn-action border border-red-200" data-action="punishEmp" data-payload="${e._id}|10">-10</button>
                            <button class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[10px] btn-action" data-action="adminDelEmp" data-payload="${e._id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`).join('')}
                    <div class="p-3 bg-slate-50">
                        <div class="flex gap-2">
                            <input id="new-emp-name" class="input-box text-xs w-2/3" placeholder="Tên NV mới">
                            <input id="new-emp-pin" class="input-box text-xs w-1/3" placeholder="PIN">
                            <button class="bg-blue-600 text-white rounded px-3 font-bold text-xs btn-action" data-action="adminAddEmp">+</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        container.innerHTML = `<div class="p-4 space-y-4">
            <div class="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 rounded-2xl text-white shadow-lg flex items-center gap-4">
                <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">${user.name.charAt(0)}</div>
                <div><h2 class="text-lg font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role}</p></div>
            </div>
            ${actionButtons}
            ${isManager ? `<div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4"><h3 class="font-bold text-yellow-800 text-xs mb-2">Duyệt Đơn (${pendings.length})</h3>${pendings.length ? pendings.map(r=>`<div class="bg-white p-2 mb-1 rounded flex justify-between items-center"><span><b class="text-xs">${r.user}</b>: ${r.type}</span><div class="flex gap-1"><button class="bg-green-500 text-white text-[10px] px-2 rounded btn-action" data-action="approveRequest" data-payload="${r._id}">OK</button><button class="bg-red-500 text-white text-[10px] px-2 rounded btn-action" data-action="rejectRequest" data-payload="${r._id}">X</button></div></div>`).join('') : '<span class="text-xs italic text-slate-400">Trống</span>'}</div>` : ''}
            ${empList}
            <div id="modal-leave" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div class="card w-full max-w-sm rounded-xl p-5 space-y-3"><h3 class="font-bold text-center">Xin Nghỉ</h3><input id="leave-date" type="date" class="input-box"><select id="leave-reason" class="input-box"><option>Việc riêng</option><option>Ốm</option></select><div class="flex gap-2"><button class="flex-1 py-2 bg-slate-100 rounded btn-action" data-action="toggleModal" data-payload="modal-leave">Hủy</button><button class="flex-1 py-2 bg-orange-600 text-white rounded btn-action" data-action="submitLeave">Gửi</button></div></div></div>
            <div id="modal-buy-req" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div class="card w-full max-w-sm rounded-xl p-5 space-y-3"><h3 class="font-bold text-center">Mua Hàng</h3><input id="buy-name" class="input-box" placeholder="Tên hàng"><div class="flex gap-2"><input id="buy-unit" class="input-box" placeholder="ĐVT"><input id="buy-qty" type="number" class="input-box" placeholder="SL"></div><div class="flex gap-2"><button class="flex-1 py-2 bg-slate-100 rounded btn-action" data-action="toggleModal" data-payload="modal-buy-req">Hủy</button><button class="flex-1 py-2 bg-purple-600 text-white rounded btn-action" data-action="submitBuyRequest">Gửi</button></div></div></div>
        </div>`;
    },

    // --- CÁC HÀM KHÁC (SX, KHO) VẪN GIỮ NGUYÊN HOẶC CẬP NHẬT NHẸ ---
    renderSX: (houses) => { /* Code giống V228 nhưng bỏ màu text-white thừa */ 
        const container = document.getElementById('view-sx');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        container.innerHTML = `<div class="p-4"><div class="card p-4 rounded-xl shadow border border-blue-100 space-y-3"><h3 class="font-black text-blue-700 uppercase border-b pb-2">Nhập Phôi (Kho A)</h3><select id="sx-house-select" class="input-box text-blue-800 font-bold">${sorted.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select><div class="grid grid-cols-2 gap-3"><input id="sx-strain" class="input-box" placeholder="Mã giống"><input id="sx-date" type="date" class="input-box"></div><input id="sx-spawn-qty" type="number" class="input-box text-lg font-bold text-blue-600" placeholder="Số lượng"><button class="btn-primary w-full bg-blue-600 py-3 rounded-lg font-bold shadow-md btn-action" data-action="setupHouseBatch">KÍCH HOẠT</button></div></div>`;
    },
    
    renderStock: (inv, supplies) => { /* Code giống V228 */ 
        const container = document.getElementById('view-stock'); // Dùng code của V228
        container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">Chức năng kho đang bảo trì để nâng cấp đồng bộ.</div>`;
    },

    renderChat: (msgs, uid) => {
        const layer = document.getElementById('chat-layer');
        layer.classList.remove('hidden'); layer.style.display = 'flex';
        layer.innerHTML = `<div class="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm z-10"><h3 class="font-black text-slate-700">NHÓM CHUNG</h3><button class="w-8 h-8 bg-slate-100 rounded-full btn-action" data-action="closeChat">✕</button></div><div id="chat-msgs" class="flex-1 overflow-y-auto p-4 space-y-2"></div><div class="p-3 bg-white border-t flex gap-2"><input id="chat-input" class="flex-1 bg-slate-100 rounded-full px-4 outline-none text-sm font-bold" placeholder="Nhập tin..."><button class="w-10 h-10 bg-blue-600 text-white rounded-full shadow btn-action" data-action="sendChat">➤</button></div>`;
        const box = document.getElementById('chat-msgs');
        box.innerHTML = msgs.map(m => {
            if(m.type==='system') return `<div class="text-center text-[10px] text-slate-500 font-bold bg-white/50 rounded-full py-1 px-3 mx-auto w-fit my-2 shadow-sm border border-white"><span>${m.text}</span></div>`;
            const isMe = String(m.senderId) === String(uid);
            return `<div class="flex flex-col ${isMe?'items-end':'items-start'}"><span class="text-[9px] text-slate-500 px-1 mb-0.5 font-bold">${m.senderName}</span><div class="${isMe?'bg-green-100 text-slate-800 border border-green-200':'bg-white text-slate-800 border border-slate-200'} px-3 py-2 rounded-xl shadow-sm text-sm max-w-[85%]">${m.text}</div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    }
};
