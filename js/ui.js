export const UI = {
    // --- UTILS (TỐI ƯU HÓA) ---
    playSound: (type) => { 
        try { 
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            if(type==='success') { osc.frequency.setValueAtTime(600, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime+0.15); }
            else if(type==='msg') { osc.frequency.setValueAtTime(800, ctx.currentTime); gain.gain.setValueAtTime(0.05, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime+0.1); }
            if(navigator.vibrate) navigator.vibrate(type==='success'?50:20); // Rung nhẹ
        } catch(e){} 
    },

    initModals: () => {
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('fixed') && e.target.classList.contains('z-50') && e.target.id !== 'login-overlay') {
                if(!e.target.id.includes('chat')) e.target.classList.add('hidden');
            }
        });
    },

    toggleModal: (id) => document.getElementById(id)?.classList.remove('hidden'),

    showMsg: (t) => {
        const b = document.getElementById('msg-box'); 
        if(b) { b.innerText = t; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 3000); }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabName) {
                btn.classList.add('text-blue-600', '-translate-y-1');
                btn.classList.remove('text-slate-400');
            } else {
                btn.classList.remove('text-blue-600', '-translate-y-1');
                btn.classList.add('text-slate-400');
            }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const h = '<option value="">-- Chọn --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        const s1 = document.getElementById('login-user'); if(s1) s1.innerHTML = h;
        const s2 = document.getElementById('task-assignee'); if(s2) s2.innerHTML = h;
    },

    // 1. HOME: GLASS CARDS
    renderHome: (houses, harvestLogs, employees) => {
        const container = document.getElementById('view-home');
        const sorted = [...houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', {numeric: true}));
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);
        const top3 = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        const getColor = (n) => {
            if(n.startsWith('A')) return 'bg-purple-100 text-purple-700 border-purple-200';
            if(n.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-200';
            if(n.startsWith('C')) return 'bg-green-100 text-green-700 border-green-200';
            if(n.startsWith('D')) return 'bg-orange-100 text-orange-700 border-orange-200';
            return 'bg-slate-100 text-slate-700 border-slate-200';
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
                <div class="glass p-3 relative overflow-hidden">
                    <div class="absolute right-0 top-0 p-2 opacity-10 text-4xl font-black">${h.name.charAt(0)}</div>
                    <div class="flex justify-between items-start mb-2 relative z-10">
                        <span class="font-black text-lg text-slate-700">${h.name}</span>
                        <span class="text-[10px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-500 text-white':'bg-slate-200 text-slate-500'}">${h.status==='ACTIVE'?'SX':'NGHỈ'}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">${h.currentBatch||'-'}</div>
                    <div class="text-right"><span class="text-2xl font-black text-slate-700">${getYield(h.name).toFixed(1)}</span> <span class="text-[10px] text-slate-400">kg</span></div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    // 2. SX (GLASS UI)
    renderSX: (houses) => {
        const container = document.getElementById('view-sx');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        container.innerHTML = `
        <div class="space-y-4 p-1">
            <div class="glass p-5 border-t-4 border-t-blue-500 space-y-4">
                <div class="flex justify-between items-center"><h3 class="font-black text-slate-700 uppercase">Nhập Phôi (Kho A)</h3><i class="fas fa-industry text-slate-300 text-2xl"></i></div>
                <select id="sx-house-select" class="p-3 bg-slate-50 rounded-xl font-bold">${sorted.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select>
                <div class="grid grid-cols-2 gap-3"><input id="sx-strain" placeholder="Mã giống (049...)" class="bg-slate-50"><input id="sx-date" type="date" class="bg-slate-50"></div>
                <input id="sx-spawn-qty" type="number" placeholder="Số lượng bịch" class="bg-slate-50 text-lg font-bold text-blue-600">
                <button class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg btn-action active:scale-95 transition" data-action="setupHouseBatch">KÍCH HOẠT LÔ MỚI</button>
            </div>
        </div>`;
    },

    // 3. THDG (DYNAMIC PRODUCTS - QUAN TRỌNG)
    renderTH: (houses, harvestLogs, shippingLogs, products) => {
        const container = document.getElementById('view-th');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // Phân nhóm sản phẩm
        const g1 = products.filter(p => p.group == '1'); // Tươi
        const g2 = products.filter(p => p.group == '2'); // Phụ
        const g3 = products.filter(p => p.group == '3'); // Thành phẩm

        container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-slate-200 p-1 rounded-2xl flex text-xs font-bold text-slate-500">
                <button class="flex-1 py-3 rounded-xl bg-white text-green-600 shadow-sm transition btn-action" data-action="toggleTH" data-payload="in">NHẬP KHO</button>
                <button class="flex-1 py-3 rounded-xl hover:bg-white/50 transition btn-action" data-action="toggleTH" data-payload="out">XUẤT BÁN</button>
            </div>

            <div id="zone-th" class="glass p-5 space-y-5 border-t-4 border-t-green-500">
                <div class="flex justify-between items-center">
                    <span class="font-black text-slate-700 uppercase">Ghi nhận thu hoạch</span>
                    <button class="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-blue-600 font-bold btn-action" data-action="openModal" data-payload="modal-add-prod">+ Mã SP</button>
                </div>
                
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase ml-2">Nguồn</label>
                    <select id="th-area" class="bg-green-50 text-green-800 font-bold border-0">${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                </div>

                ${g1.length ? `<div class="bg-slate-50 p-3 rounded-2xl"><p class="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">1. Nấm Tươi (Kg)</p><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold !p-2 text-sm" placeholder="-"></div>`).join('')}</div></div>` : ''}
                
                ${g2.length ? `<div class="bg-slate-50 p-3 rounded-2xl"><p class="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">2. Phụ Phẩm (Kg)</p><div class="grid grid-cols-3 gap-3">${g2.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold !p-2 text-sm" placeholder="-"></div>`).join('')}</div></div>` : ''}

                ${g3.length ? `<div class="bg-slate-50 p-3 rounded-2xl"><p class="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">3. Thành Phẩm</p><div class="grid grid-cols-2 gap-3">${g3.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" id="th-${p.code}" class="text-center font-bold !p-2 text-sm" placeholder="-"></div>`).join('')}</div></div>` : ''}

                <button class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 btn-action active:scale-95 transition" data-action="submitTH">LƯU KHO</button>
            </div>

            <div id="zone-ship" class="hidden glass p-5 space-y-4 border-t-4 border-t-orange-500">
                <h3 class="font-black text-slate-700 uppercase">Xuất Bán / Chuyển</h3>
                <input id="ship-cust" placeholder="Khách hàng / Đối tác">
                <div class="grid grid-cols-2 gap-3"><select id="ship-type"><option>Nấm Tươi</option><option>Thành Phẩm</option></select><input id="ship-qty" type="number" placeholder="Số lượng"></div>
                <textarea id="ship-note" rows="2" placeholder="Ghi chú..."></textarea>
                <button class="w-full py-4 bg-orange-500 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitShip">XUẤT & IN</button>
                
                <div class="pt-4 border-t border-slate-200 mt-2">
                    <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Kiểm kê nhanh</p>
                    <div class="flex gap-2"><input id="stock-count" type="number" placeholder="Thực tế" class="text-center"><button class="bg-blue-600 text-white px-4 rounded-xl font-bold text-xs btn-action" data-action="calcVariance">CHECK</button></div>
                    <div id="stock-variance-res" class="hidden mt-2 text-center text-xs font-bold p-2 rounded bg-slate-100"></div>
                </div>
            </div>
        </div>`;
    },

    renderTeam: (user, reqs, employees) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
        
        container.innerHTML = `
        <div class="space-y-5">
            <div class="glass p-6 !bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-xl flex items-center gap-5">
                <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black backdrop-blur-md shadow-inner">${user.name.charAt(0)}</div>
                <div><h2 class="text-2xl font-black uppercase tracking-tight">${user.name}</h2><p class="text-xs font-medium opacity-80 bg-white/10 px-3 py-1 rounded-lg inline-block mt-1">${user.role}</p></div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <button class="glass p-4 flex flex-col items-center justify-center gap-2 active:bg-white transition btn-action" data-action="submitAttendance"><div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl"><i class="fas fa-fingerprint"></i></div><span class="text-xs font-black text-slate-600">ĐIỂM DANH</span></button>
                <button class="glass p-4 flex flex-col items-center justify-center gap-2 active:bg-white transition btn-action" data-action="openModal" data-payload="modal-leave"><div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl"><i class="fas fa-umbrella-beach"></i></div><span class="text-xs font-black text-slate-600">XIN NGHỈ</span></button>
                <button class="glass p-4 flex flex-col items-center justify-center gap-2 active:bg-white transition btn-action" data-action="openModal" data-payload="modal-buy-req"><div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl"><i class="fas fa-cart-plus"></i></div><span class="text-xs font-black text-slate-600">MUA HÀNG</span></button>
                <button class="glass p-4 flex flex-col items-center justify-center gap-2 active:bg-white transition btn-action" data-action="logout"><div class="w-12 h-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-2xl"><i class="fas fa-power-off"></i></div><span class="text-xs font-black text-slate-600">THOÁT</span></button>
            </div>

            ${isManager ? `<div class="glass p-0 overflow-hidden"><div class="bg-slate-50 p-4 border-b border-slate-100"><h3 class="font-black text-slate-400 text-xs uppercase tracking-widest">Nhân sự & Kỷ luật</h3></div>${employees.map(e => `<div class="flex justify-between items-center p-4 border-b border-slate-50 last:border-0"><div><div class="font-bold text-sm text-slate-700">${e.name}</div><div class="text-[10px] font-bold text-amber-500">${e.score} điểm</div></div><div class="flex gap-2"><button class="w-8 h-8 rounded-lg bg-red-50 text-red-500 font-bold text-xs btn-action" data-action="punishEmp" data-payload="${e._id}|5">-5</button></div></div>`).join('')}</div>` : ''}
        </div>`;
    },

    // RENDER TASKS, CHAT, SETTINGS
    renderTasksAndShip: (tasks, currentUser, houses, employees) => { /* Giữ nguyên V502, thay class card->glass */ 
        const container = document.getElementById('view-tasks');
        container.innerHTML = `<div class="space-y-6"><div class="glass p-5 border-t-4 border-t-blue-500"><h3 class="font-black text-slate-700 uppercase mb-4">Giao Việc</h3><input id="task-title" placeholder="Tên việc"><div class="grid grid-cols-2 gap-3 mt-3"><select id="task-house"><option value="">-- Nhà --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select><select id="task-assignee"><option value="">-- Người làm --</option>${employees.map(e=>`<option value="${e.name}">${e.name}</option>`).join('')}</select></div><button class="w-full py-3 mt-3 bg-blue-600 text-white rounded-xl font-bold btn-action" data-action="addTask">PHÁT LỆNH</button></div>
        <div><h3 class="font-bold text-slate-400 text-xs uppercase mb-2 pl-2">Danh sách việc</h3><div class="space-y-3">${tasks.filter(t=>t.status!=='done').map(t=>`<div class="glass p-4 border-l-4 ${t.status==='received'?'border-blue-500':'border-orange-500'}"><div class="flex justify-between"><span class="font-bold text-slate-700">${t.title}</span><span class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100">${t.assignee}</span></div>${t.status==='pending'?`<button class="w-full mt-2 py-2 bg-orange-100 text-orange-600 rounded-lg text-xs font-bold btn-action" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>`:`<button class="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold btn-action" data-action="submitTask" data-payload="${t._id}">HOÀN THÀNH</button>`}</div>`).join('')}</div></div></div>`;
    },
    renderChat: (msgs, uid) => { /* Giữ nguyên V502 */ 
        const b = document.getElementById('chat-msgs');
        b.innerHTML = msgs.map(m => `<div class="flex flex-col ${String(m.senderId)===String(uid)?'items-end':'items-start'} animate-fade"><span class="text-[9px] text-slate-400 px-2 uppercase font-bold">${m.senderName}</span><div class="${String(m.senderId)===String(uid)?'bg-blue-600 text-white':'bg-white text-slate-700'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] mb-2">${m.text}</div></div>`).join('');
        b.scrollTop = b.scrollHeight; document.getElementById('chat-layer').classList.remove('hidden');
    },
    renderSettingsModal: (employees) => { /* Modal thêm sản phẩm và báo cáo */
        const m = document.getElementById('modal-settings'); m.classList.remove('hidden');
        m.innerHTML = `<div class="glass w-full max-w-md p-6 space-y-6"><div class="flex justify-between border-b pb-2"><h3 class="font-black text-xl text-slate-700">QUẢN TRỊ</h3><button class="text-2xl text-slate-400 btn-action" data-action="closeModal" data-target="modal-settings">&times;</button></div><div><h4 class="font-bold text-green-600 text-xs uppercase mb-2">Tiện ích</h4><div class="grid grid-cols-2 gap-2"><button class="py-3 bg-blue-50 text-blue-600 font-bold rounded-xl btn-action" data-action="installApp">Cài App</button><button class="py-3 bg-orange-50 text-orange-600 font-bold rounded-xl btn-action" data-action="enableNotif">Thông báo</button></div></div><div><h4 class="font-bold text-green-600 text-xs uppercase mb-2">Báo cáo</h4><button class="w-full py-3 bg-green-50 text-green-600 font-bold rounded-xl btn-action" data-action="adminExport">Xuất Excel</button></div></div>`;
        
        // Modal thêm SP render vào id modal-add-prod
        document.getElementById('modal-add-prod').innerHTML = `<div class="glass w-full max-w-sm p-6 space-y-4"><h3 class="font-black text-center text-blue-600 text-lg uppercase">Thêm Sản Phẩm</h3><input id="new-prod-name" placeholder="Tên (VD: Nấm Rơm)"><input id="new-prod-code" placeholder="Mã (VD: nam_rom)"><select id="new-prod-group"><option value="1">Nấm Tươi</option><option value="2">Phụ Phẩm</option><option value="3">Thành Phẩm</option></select><div class="flex gap-3"><button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="closeModal" data-target="modal-add-prod">Hủy</button><button class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold btn-action" data-action="submitAddProd">Lưu</button></div></div>`;
    }
};
