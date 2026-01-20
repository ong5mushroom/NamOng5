export const UI = {
    // 1. ÂM THANH
    playSound: (type) => { 
        try { 
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            if (type === 'success') {
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(); osc.stop(ctx.currentTime + 0.5);
            } else if (type === 'msg') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
            }
        } catch(e){} 
    },

    // 2. KHỞI TẠO MODAL (HÀM ĐANG BỊ LỖI CỦA BẠN - ĐÃ FIX)
    initModals: () => {
        document.body.addEventListener('click', (e) => {
            // Đóng modal khi bấm nút X hoặc nền đen
            if (e.target.closest('.modal-close-btn') || e.target.classList.contains('fixed')) {
                // Không đóng chat layer ở đây, chat có nút riêng
                const target = e.target.closest('.modal-close-btn');
                const id = target ? target.dataset.payload : e.target.id;
                
                // Chỉ đóng nếu đó là modal (có id bắt đầu bằng modal-)
                if (id && id.startsWith('modal-')) {
                    document.getElementById(id)?.classList.add('hidden');
                }
                
                // Nếu bấm ra ngoài vùng trắng của modal
                if (e.target.classList.contains('fixed') && !e.target.id.includes('chat') && e.target.id !== 'login-overlay') {
                    e.target.classList.add('hidden');
                }
            }
            // Đóng chat riêng
            if (e.target.closest('[data-action="closeChat"]')) {
                document.getElementById('chat-layer').classList.add('hidden');
            }
        });
    },

    // 3. CÁC HÀM TIỆN ÍCH KHÁC
    toggleModal: (id) => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('hidden');
    },

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
            const active = btn.dataset.tab === tabName;
            // Reset class cũ
            btn.className = 'nav-btn flex flex-col items-center justify-center group cursor-pointer'; 
            if (active) {
                btn.classList.add('text-blue-600');
                if(btn.querySelector('div')) btn.querySelector('div').classList.add('ring-2', 'ring-blue-300');
            } else {
                btn.classList.add('text-slate-400');
            }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        if(sel) sel.innerHTML = '<option value="">-- Chọn tên --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    },

    // --- CÁC MÀN HÌNH ---
    
    renderHome: (houses, harvestLogs, employees) => {
        const container = document.getElementById('view-home');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sorted = [...houses].sort((a, b) => {
            let iA = houseOrder.indexOf(a.name), iB = houseOrder.indexOf(b.name);
            return (iA===-1?999:iA) - (iB===-1?999:iB);
        });
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);
        const top3 = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-b from-white to-amber-50 p-4 rounded-2xl shadow-md border border-amber-100">
                <h3 class="font-black text-amber-700 uppercase text-xs mb-4 flex items-center justify-center tracking-widest"><i class="fas fa-crown mr-2 text-yellow-500"></i>Bảng Phong Thần</h3>
                <div class="flex justify-center items-end gap-4">
                    ${top3[1] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-slate-300 border-2 border-white shadow flex items-center justify-center text-white font-black">2</div><span class="text-[10px] font-bold mt-1 text-slate-600 truncate w-16 text-center">${top3[1].name}</span><span class="text-[10px] font-black text-amber-600">${top3[1].score||0}đ</span></div>` : ''}
                    ${top3[0] ? `<div class="flex flex-col items-center -mt-4"><div class="w-14 h-14 rounded-full bg-yellow-400 border-4 border-white shadow-lg flex items-center justify-center text-white text-xl font-black"><i class="fas fa-trophy"></i></div><span class="text-xs font-bold mt-2 text-slate-800 truncate w-20 text-center">${top3[0].name}</span><span class="text-xs font-black text-amber-600">${top3[0].score||0}đ</span></div>` : ''}
                    ${top3[2] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-amber-700 border-2 border-white shadow flex items-center justify-center text-white font-black">3</div><span class="text-[10px] font-bold mt-1 text-slate-600 truncate w-16 text-center">${top3[2].name}</span><span class="text-[10px] font-black text-amber-600">${top3[2].score||0}đ</span></div>` : ''}
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
            ${sorted.map(h => `
                <div class="card p-3 border border-slate-100 relative overflow-hidden">
                    <div class="flex justify-between items-start mb-2">
                        <div><h3 class="font-black text-lg text-slate-800">${h.name}</h3><div class="text-[10px] text-slate-400 font-bold uppercase">${h.currentBatch || '-'}</div></div>
                        <span class="text-[9px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'} px-2 py-1 rounded font-bold">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                    </div>
                    <div class="text-right border-t pt-1 mt-1 border-slate-50"><span class="text-[10px] text-slate-400 mr-1">Thu:</span><span class="font-black text-blue-600">${getYield(h.name).toFixed(1)} kg</span></div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => (t.assignee !== currentUser.name && t.status !== 'done') || t.status === 'done');

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
             <div class="space-y-3"><h3 class="font-bold text-slate-700 text-sm uppercase pl-2 border-l-4 border-orange-500">Việc Cần Làm</h3>${myTasks.map(t => `<div class="card p-4 border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-sm"><div class="flex justify-between items-start mb-2"><h4 class="font-bold text-slate-800">${t.title}</h4><span class="text-[9px] font-black px-2 py-1 rounded ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600'}">${t.status==='received'?'ĐANG LÀM':'MỚI'}</span></div><div class="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded">${t.house||'Chung'} • ${t.desc||'-'}</div>${t.status === 'pending' ? `<button class="w-full bg-red-50 text-red-600 py-3 rounded-lg text-xs font-black btn-action border border-red-100" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>` : `<button class="w-full bg-blue-600 text-white py-3 rounded-lg text-xs font-black btn-action shadow-md" data-action="submitTask" data-payload="${t._id}">BÁO CÁO XONG</button>`}</div>`).join('')}</div>
             <div class="space-y-2 opacity-75"><h3 class="font-bold text-slate-400 text-xs mt-6">Nhật ký chung</h3>${otherTasks.slice(0, 5).map(t => `<div class="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center"><div><div class="font-bold text-slate-600 text-xs">${t.title}</div><div class="text-[10px] text-slate-400">${t.assignee} • ${t.house||''}</div></div><span class="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded">XONG</span></div>`).join('')}</div>
        </div>`;
    },

    renderTH: (houses, harvestLogs, shippingLogs) => {
        const container = document.getElementById('view-th');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        const g1 = [{c:'b2',l:'B2'},{c:'a1',l:'A1'},{c:'a2',l:'A2'},{c:'b1',l:'B1'},{c:'d1',l:'D1'},{c:'a1f',l:'A1F'},{c:'a2f',l:'A2F'},{c:'b2f',l:'B2F'},{c:'ht',l:'Hầu Thủ'}];
        const g2 = [{c:'cn',l:'Chân nấm'},{c:'hc',l:'Hư hỏng'},{c:'hh',l:'Khác'}];
        const g3 = [{c:'snack',l:'Snack'},{c:'kho',l:'Nấm Khô'},{c:'tra',l:'Trà'}];

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
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">3. Thành Phẩm (Gói)</h4><div class="grid grid-cols-3 gap-3">${g3.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" id="th-${m.c}" class="input-harvest w-full text-center font-bold text-sm focus:border-purple-500" placeholder="-"></div>`).join('')}</div></div>
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
                <div class="mt-4 card p-4 border border-slate-200">
                    <h4 class="font-bold text-slate-700 text-xs uppercase mb-3">Kiểm Kê Kho</h4>
                    <div class="flex gap-2 items-end">
                        <div class="flex-1"><label class="text-[9px] text-slate-400 font-bold">TỒN MÁY</label><div class="bg-slate-100 p-3 rounded-lg text-slate-500 font-bold text-sm border">150.0</div></div>
                        <div class="flex-1"><label class="text-[9px] text-slate-400 font-bold">THỰC TẾ</label><input id="stock-count" type="number" class="input-box p-2.5 text-center font-bold text-blue-600"></div>
                        <button class="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs btn-action shadow h-11" data-action="calcVariance">TÍNH</button>
                    </div>
                    <div id="stock-variance-res" class="mt-3 hidden p-3 rounded-lg text-center text-sm font-bold"></div>
                </div>
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
                    ${employees.map(e => `
                    <div class="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                        <div><div class="font-bold text-sm text-slate-800">${e.name}</div><div class="text-[10px] text-slate-400 font-bold">Điểm: <span class="text-amber-600">${e.score||0}</span></div></div>
                        <div class="flex gap-2">
                            <button class="w-8 h-8 rounded-full bg-red-50 text-red-600 font-bold text-[10px] btn-action border border-red-100" data-action="punishEmp" data-payload="${e._id}|5">-5</button>
                            <button class="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-[10px] btn-action border border-red-200" data-action="punishEmp" data-payload="${e._id}|10">-10</button>
                            ${user.role==='Giám đốc' ? `<button class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[10px] btn-action" data-action="adminDelEmp" data-payload="${e._id}"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>`).join('')}
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
                <button class="card p-4 flex flex-col items-center gap-2 btn-action active:bg-orange-50 transition" data-action="toggleModal" data-payload="modal-leave"><div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xl"><i class="fas fa-file-signature"></i></div><span class="text-xs font-black text-slate-700">XIN NGHỈ</span></button>
                <button class="card p-4 flex flex-col items-center gap-2 btn-action active:bg-purple-50 transition" data-action="toggleModal" data-payload="modal-buy-req"><div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl"><i class="fas fa-shopping-basket"></i></div><span class="text-xs font-black text-slate-700">MUA HÀNG</span></button>
                <button class="card p-4 flex flex-col items-center gap-2
