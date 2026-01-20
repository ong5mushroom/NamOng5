export const UI = {
    // --- TIỆN ÍCH ---
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
            }
        } catch(e){}
    },

    initModals: () => {
        // Xử lý đóng modal chung
        document.addEventListener('click', (e) => {
            if (e.target.closest('.modal-close-btn')) {
                const id = e.target.closest('.modal-close-btn').dataset.payload;
                document.getElementById(id)?.classList.add('hidden');
            }
            // Đóng chat
            if (e.target.closest('[data-action="closeChat"]')) {
                document.getElementById('chat-layer')?.classList.add('hidden');
            }
        });
    },

    toggleModal: (id, show) => {
        const el = document.getElementById(id);
        if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },

    showMsg: (t, type = 'info') => {
        const b = document.getElementById('msg-box'); 
        if(b) {
            b.innerHTML = type === 'error' ? `<i class="fas fa-exclamation-circle"></i> ${t}` : `<i class="fas fa-check-circle"></i> ${t}`;
            b.style.display = 'block'; 
            b.style.background = type === 'error' ? '#ef4444' : '#16a34a';
            setTimeout(() => b.style.display = 'none', 3000);
        }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        // Chỉ render cho Login, còn Task sẽ render trực tiếp trong hàm Task
        const sel = document.getElementById('login-user');
        if(sel) {
            sel.innerHTML = '<option value="">-- Chọn danh tính --</option>' + 
                employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        }
    },

    // --- TAB HOME ---
    renderHome: (houses, harvestLogs) => {
        const container = document.getElementById('view-home');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sortedHouses = [...houses].sort((a, b) => {
            let idxA = houseOrder.indexOf(a.name); let idxB = houseOrder.indexOf(b.name);
            if (idxA === -1) idxA = 999; if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
        const getRealYield = (houseName) => harvestLogs.filter(h => h.area === houseName).reduce((sum, h) => sum + (Number(h.total) || 0), 0);

        container.innerHTML = `
        <div class="p-2 pb-20">
            <h2 class="text-lg font-black text-slate-700 mb-3 uppercase border-b-2 border-blue-500 inline-block">Trạng Thái Trại</h2>
            <div class="grid grid-cols-2 gap-3">
            ${sortedHouses.map(h => `
                <div class="card p-3 relative overflow-hidden group border-l-4 ${h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300'}">
                    <div class="flex justify-between items-start mb-2">
                        <div><h3 class="font-black text-xl text-blue-900">${h.name}</h3><div class="text-[10px] text-slate-500 font-bold uppercase">${h.currentBatch || '(Trống)'}</div></div>
                        <span class="text-[9px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'} px-1 py-0.5 rounded font-bold">${h.status === 'ACTIVE' ? 'SX' : 'CHỜ'}</span>
                    </div>
                    <div class="text-center bg-slate-50 p-1 rounded"><div class="text-[9px] uppercase text-slate-400">Đã Hái</div><div class="font-black text-blue-600">${getRealYield(h.name).toFixed(1)} <span class="text-[9px]">kg</span></div></div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    // --- TAB SẢN XUẤT ---
    renderSX: (houses) => {
        const container = document.getElementById('view-sx');
        // Logic sort giữ nguyên như Home
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sortedHouses = [...houses].sort((a, b) => { let iA=houseOrder.indexOf(a.name); let iB=houseOrder.indexOf(b.name); if(iA===-1) iA=999; if(iB===-1) iB=999; return iA-iB; });
        
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card border-2 border-blue-500 shadow-lg">
                <div class="bg-blue-600 text-white p-3 font-bold uppercase flex justify-between items-center"><span><i class="fas fa-industry mr-2"></i>Nhập Phôi</span></div>
                <div class="p-4 space-y-3">
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">CHỌN NHÀ / KHO A</label><select id="sx-house-select" class="input-box font-bold text-blue-800">${sortedHouses.map(h => `<option value="${h._id}">${h.name}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-bold text-slate-500 mb-1">MÃ GIỐNG</label><input id="sx-strain" type="text" class="input-box uppercase font-bold" placeholder="VD: 049"></div><div><label class="block text-xs font-bold text-slate-500 mb-1">NGÀY CẤY</label><input id="sx-date" type="date" class="input-box font-bold"></div></div>
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">SỐ LƯỢNG PHÔI</label><input id="sx-spawn-qty" type="number" class="input-box font-bold" placeholder="VD: 1200"></div>
                    <button class="btn-primary w-full py-3 bg-blue-600 btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ</button>
                </div>
            </div>
        </div>`;
    },

    // --- TAB THU HOẠCH & XUẤT KHO ---
    renderTH: (houses, harvestLogs, shippingLogs) => {
        const container = document.getElementById('view-th');
        // Logic sort giữ nguyên
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sortedHouses = [...houses].sort((a, b) => { let iA=houseOrder.indexOf(a.name); let iB=houseOrder.indexOf(b.name); if(iA===-1) iA=999; if(iB===-1) iB=999; return iA-iB; });
        
        const groupStd = [ {c:'b2',l:'B2'}, {c:'a1',l:'A1'}, {c:'a2',l:'A2'}, {c:'b1',l:'B1'}, {c:'ht',l:'Hầu Thủ'} ];
        const groupLimit = [ {c:'a1f',l:'A1F'}, {c:'a2f',l:'A2F'}, {c:'b2f',l:'B2F'}, {c:'d1',l:'D1'}, {c:'cn',l:'Chân'}, {c:'hc',l:'Hủy chân'}, {c:'hh',l:'Hủy hỏng'} ];
        
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="flex gap-2 bg-slate-200 p-1 rounded-lg mb-2">
                <button class="flex-1 py-2 rounded-md font-bold text-sm bg-white shadow text-green-700" onclick="document.getElementById('zone-th').classList.remove('hidden');document.getElementById('zone-ship').classList.add('hidden');">THU HOẠCH</button>
                <button class="flex-1 py-2 rounded-md font-bold text-sm text-slate-500" onclick="document.getElementById('zone-th').classList.add('hidden');document.getElementById('zone-ship').classList.remove('hidden');">XUẤT KHO</button>
            </div>
            
            <div id="zone-th">
                <div class="card border-2 border-green-500 shadow-xl mb-4">
                    <div class="bg-green-600 text-white p-3 font-bold uppercase rounded-t-lg flex justify-between"><span>Phiếu Nhập Nấm</span><i class="fas fa-leaf"></i></div>
                    <div class="p-3 space-y-3">
                        <div><select id="th-area" class="input-box text-lg font-black text-green-700 bg-green-50 border-green-300"><option value="">-- Chọn Nhà --</option>${sortedHouses.map(h => `<option value="${h.name}" data-batch="${h.currentBatch||''}" data-spawn="${h.currentSpawn||0}">${h.name}</option>`).join('')}</select><div id="th-batch-info" class="text-xs text-orange-600 italic mt-1 h-4"></div></div>
                        <div class="bg-green-50 p-2 rounded border border-green-200"><h4 class="text-xs font-bold text-green-800 uppercase mb-2 border-b border-green-300 pb-1">1. Sản phẩm chuẩn</h4><div class="grid grid-cols-2 gap-2">${groupStd.map(m => `<div class="flex items-center gap-1"><label class="w-16 text-xs font-bold text-slate-600">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-1 font-bold text-slate-800 text-center" placeholder="-"></div>`).join('')}</div></div>
                        <div class="bg-orange-50 p-2 rounded border border-orange-200"><h4 class="text-xs font-bold text-orange-800 uppercase mb-2 border-b border-orange-300 pb-1">2. Sản phẩm hạn chế</h4><div class="grid grid-cols-2 gap-2">${groupLimit.map(m => `<div class="flex items-center gap-1"><label class="w-16 text-xs font-bold text-slate-600">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-1 font-bold text-slate-800 text-center" placeholder="-"></div>`).join('')}</div></div>
                        <div class="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200"><span class="font-bold text-slate-500">TỔNG:</span><div><span id="th-display-total" class="text-3xl font-black text-green-600">0.0</span> <span class="text-xs">kg</span></div></div>
                        <textarea id="th-note" class="input-box text-sm" placeholder="Ghi chú..."></textarea>
                        <button class="btn-primary bg-green-600 btn-action w-full uppercase font-black py-4 shadow-lg" data-action="submitTH"><i class="fas fa-save mr-2"></i> LƯU KHO</button>
                    </div>
                </div>
            </div>

            <div id="zone-ship" class="hidden">
                 <div class="card p-4 bg-orange-50 border-2 border-orange-200 mb-4 shadow-lg">
                    <h4 class="font-bold text-orange-800 mb-3 uppercase flex items-center"><i class="fas fa-truck mr-2"></i>Xuất Kho</h4>
                    <input id="ship-cust" class="input-box mb-3 font-bold" placeholder="Tên Khách hàng">
                    <div class="flex gap-2 mb-3"><select id="ship-type" class="input-box font-bold"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Nấm Dược Liệu</option></select><input id="ship-qty" type="number" class="input-box font-black text-orange-600 text-center" placeholder="Kg"></div>
                    <textarea id="ship-note" class="input-box text-sm mb-3" placeholder="Ghi chú..."></textarea>
                    <button class="btn-primary w-full bg-orange-600 btn-action shadow-lg" data-action="submitShip"><i class="fas fa-print mr-2"></i>LƯU & IN</button>
                </div>
                <div class="space-y-2"><h4 class="text-xs font-bold text-slate-400 uppercase ml-2">Đơn vừa xuất</h4>${shippingLogs.slice(0,5).map(s => `<div class="card p-3 flex justify-between items-center mb-2 border-l-4 border-orange-400"><div><div class="font-bold text-blue-700 text-sm">${s.customer}</div><div class="text-xs text-slate-500">${s.type} - ${s.qty}kg</div></div><button class="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold shadow-sm btn-action hover:bg-slate-200" data-action="printInvoice" data-payload="${s._id}"><i class="fas fa-print"></i> IN</button></div>`).join('')}</div>
            </div>
        </div>`;
        
        setTimeout(() => {
            const sel = document.getElementById('th-area'), info = document.getElementById('th-batch-info'), inps = document.querySelectorAll('.input-harvest'), tot = document.getElementById('th-display-total');
            if(sel) sel.addEventListener('change', (e) => { inps.forEach(i=>i.value=''); tot.innerText='0.0'; const o = e.target.options[e.target.selectedIndex]; info.innerText = o.value ? `Đang hái Lô: ${o.getAttribute('data-batch')} (${o.getAttribute('data-spawn')} phôi)` : ''; });
            if(inps) inps.forEach(i => i.addEventListener('input', () => { let s=0; inps.forEach(k => s+=Number(k.value)||0); tot.innerText = s.toFixed(1); }));
        }, 200);
    },

    // --- TAB KHO ---
    renderStock: (inv, supplies, distributionLogs) => { 
        const container = document.getElementById('view-stock');
        const recentDist = distributionLogs ? distributionLogs.slice(0, 5) : [];
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card border-2 border-purple-500 shadow-md">
                 <div class="bg-purple-600 text-white p-2 font-bold uppercase rounded-t flex justify-between"><span><i class="fas fa-warehouse mr-2"></i>Kho A (Phôi)</span></div>
                 <div class="p-3 text-center"><p class="text-xs text-slate-500">Quản lý nhập xuất Phôi tại Tab <b>SX</b></p></div>
            </div>
            <div class="card border-2 border-orange-500 shadow-lg">
                 <div class="bg-orange-600 text-white p-2 font-bold uppercase rounded-t flex justify-between"><span><i class="fas fa-box-open mr-2"></i>Kho THDG (Nấm Tươi/Khô)</span></div>
                 <div class="p-3"><div class="bg-slate-100 p-2 rounded mb-3 border border-slate-200"><div class="flex justify-between text-sm"><span>Tồn Máy Tính:</span> <span class="font-bold">-- kg</span></div></div><div class="flex items-center gap-2 mb-3"><label class="text-sm font-bold text-slate-700">ĐẾM THỰC TẾ:</label><input id="stock-actual-mushroom" type="number" class="input-box flex-1 font-black text-orange-700 text-lg" placeholder="Kg"></div><textarea id="stock-note-mushroom" class="input-box text-sm hidden" placeholder="Nhập lý do chênh lệch..."></textarea><button class="btn-primary bg-orange-600 w-full mt-2 btn-action" data-action="submitStockCheck">CHỐT KHO NẤM</button></div>
            </div>
            <div class="card border border-slate-300 shadow">
                <div class="bg-slate-800 text-white p-2 font-bold uppercase rounded-t flex justify-between items-center"><span><i class="fas fa-tools mr-2"></i>Kho Vật Tư (Khác)</span><button class="text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded shadow btn-action" data-action="toggleModal" data-payload="modal-distribute"><i class="fas fa-dolly"></i> CẤP PHÁT</button></div>
                <div class="p-3"><div class="space-y-2 max-h-60 overflow-y-auto">${supplies.length === 0 ? '<p class="text-xs text-center text-slate-400">Kho trống</p>' : supplies.map(s => `<div class="flex justify-between items-center border-b border-slate-100 pb-1"><span class="text-sm font-bold text-slate-700">${s.name}</span><span class="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Tồn: <b class="text-blue-700 text-sm">${s.stock}</b> ${s.unit}</span></div>`).join('')}</div><div class="mt-4 pt-2 border-t border-slate-200"><h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Vừa cấp phát</h4>${recentDist.map(d => `<div class="text-xs flex justify-between items-center mb-1 text-slate-600"><span><i class="fas fa-arrow-right text-slate-400"></i> ${d.toHouse}: ${d.itemName}</span><span class="font-bold">-${d.qty}</span></div>`).join('')}</div></div>
            </div>
            <div id="modal-distribute" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl"><h3 class="font-bold text-lg text-slate-700 mb-4 uppercase text-center border-b pb-2">Cấp Phát Vật Tư</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Vật tư</label><select id="dist-item" class="input-box font-bold">${supplies.map(s => `<option value="${s._id}" data-name="${s.name}" data-stock="${s.stock}">${s.name} (Tồn: ${s.stock} ${s.unit})</option>`).join('')}</select></div><div><label class="text-xs font-bold text-slate-500">Nơi nhận</label><select id="dist-to" class="input-box"><option value="B1">Nhà B1</option><option value="B2">Nhà B2</option><option value="A1">Nhà A1</option><option value="A2">Nhà A2</option><option value="XuongSX">Xưởng SX</option><option value="VanPhong">Văn Phòng</option></select></div><div><label class="text-xs font-bold text-slate-500">Số lượng cấp</label><input id="dist-qty" type="number" class="input-box font-bold text-lg text-blue-600"></div><div class="flex gap-2 pt-2"><button class="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-distribute">Đóng</button><button class="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow btn-action" data-action="submitDistribute">Xác Nhận</button></div></div></div></div>
        </div>`;
        setTimeout(() => {
            const inp = document.getElementById('stock-actual-mushroom'), al = document.getElementById('stock-variance-alert'), no = document.getElementById('stock-note-mushroom');
            if(inp) inp.addEventListener('input', () => { const diff = Number(inp.value) - 50.0; if(Math.abs(diff)>0.5){ al.classList.remove('hidden'); no.classList.remove('hidden'); document.getElementById('val-variance').innerText = diff.toFixed(1); } else { al.classList.add('hidden'); no.classList.add('hidden'); } });
        }, 500);
    },

    // --- TAB TEAM ---
    renderTeam: (user, reqs) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
        const pendingReqs = reqs ? reqs.filter(r => r.status === 'pending') : [];

        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card p-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
                <div class="flex items-center gap-4"><div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">${user.name.charAt(0)}</div><div><h2 class="text-xl font-bold uppercase">${user.name}</h2><div class="text-sm opacity-80">${user.role}</div></div></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <button class="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-green-50 btn-action" data-action="submitAttendance"><div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl"><i class="fas fa-clock"></i></div><span class="font-bold text-slate-700 text-sm">CHẤM CÔNG</span></button>
                <button class="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 btn-action" data-action="toggleModal" data-payload="modal-leave"><div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl"><i class="fas fa-file-contract"></i></div><span class="font-bold text-slate-700 text-sm">XIN NGHỈ</span></button>
                <button class="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 btn-action" data-action="toggleModal" data-payload="modal-buy-req"><div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl"><i class="fas fa-shopping-cart"></i></div><span class="font-bold text-slate-700 text-sm">ĐỀ XUẤT MUA</span></button>
                <button class="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 btn-action" data-action="logout"><div class="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xl"><i class="fas fa-sign-out-alt"></i></div><span class="font-bold text-slate-700 text-sm">ĐĂNG XUẤT</span></button>
            </div>
            ${isManager ? `<div class="mt-6"><h3 class="font-bold text-slate-700 uppercase border-b border-slate-300 pb-1 mb-2">Phê Duyệt (${pendingReqs.length})</h3><div class="space-y-2">${pendingReqs.length === 0 ? '<p class="text-xs text-slate-400 italic">Không có yêu cầu mới.</p>' : pendingReqs.map(r => `<div class="card p-3 bg-white border-l-4 border-yellow-400 shadow-sm"><div class="flex justify-between items-start"><div><div class="font-bold text-sm text-slate-800">${r.user}</div><div class="text-xs text-slate-500">${r.type === 'LEAVE' ? `Xin nghỉ: ${r.date} (${r.reason})` : `Mua: ${r.item} - ${r.qty}${r.unit}`}</div></div><div class="flex gap-1"><button class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold btn-action" data-action="approveRequest" data-payload="${r._id}">Duyệt</button><button class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold btn-action" data-action="rejectRequest" data-payload="${r._id}">Hủy</button></div></div></div>`).join('')}</div></div>` : ''}
            <div id="modal-leave" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl"><h3 class="font-bold text-lg text-slate-700 mb-4 uppercase text-center border-b pb-2">Đơn Xin Nghỉ Phép</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Ngày nghỉ</label><input id="leave-date" type="date" class="input-box"></div><div><label class="text-xs font-bold text-slate-500">Lý do</label><select id="leave-reason" class="input-box"><option>Ốm / Sức khỏe</option><option>Việc gia đình</option><option>Khác</option></select></div><div class="flex gap-2 pt-2"><button class="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-leave">Hủy</button><button class="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg shadow btn-action" data-action="submitLeave">Gửi Đơn</button></div></div></div></div>
            <div id="modal-buy-req" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl"><h3 class="font-bold text-lg text-slate-700 mb-4 uppercase text-center border-b pb-2">Đề Xuất Mua Vật Tư</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Tên vật tư</label><input id="buy-name" class="input-box" placeholder="VD: Cồn 90 độ, Găng tay..."></div><div class="flex gap-2"><div class="w-1/3"><label class="text-xs font-bold text-slate-500">ĐVT</label><input id="buy-unit" class="input-box" placeholder="Lít/Cái"></div><div class="flex-1"><label class="text-xs font-bold text-slate-500">Số lượng</label><input id="buy-qty" type="number" class="input-box"></div></div><div><label class="text-xs font-bold text-slate-500">Ghi chú</label><textarea id="buy-note" class="input-box text-sm"></textarea></div><div class="flex gap-2 pt-2"><button class="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-buy-req">Hủy</button><button class="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg shadow btn-action" data-action="submitBuyRequest">Gửi Đề Xuất</button></div></div></div></div>
        </div>`;
    },

    // --- CÀI ĐẶT (QUẢN TRỊ) ---
    renderSettingsModal: (employees) => {
        let modal = document.getElementById('modal-settings');
        if(!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-settings';
            modal.className = 'hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="bg-white w-full max-w-md rounded-xl p-5 shadow-2xl h-[80vh] flex flex-col">
                <div class="flex justify-between items-center border-b pb-3 mb-3">
                    <h3 class="font-black text-xl text-slate-700 uppercase">Quản Trị Hệ Thống</h3>
                    <button class="text-2xl text-slate-400" onclick="document.getElementById('modal-settings').classList.add('hidden')">&times;</button>
                </div>
                <div class="flex-1 overflow-y-auto space-y-6">
                    <div>
                        <h4 class="font-bold text-blue-700 uppercase text-sm mb-2">Danh sách nhân viên</h4>
                        <div class="bg-slate-50 rounded border p-2 max-h-40 overflow-y-auto">
                            ${employees.map(e => `<div class="flex justify-between items-center border-b border-slate-200 py-1 last:border-0"><div class="text-sm"><b>${e.name}</b> (${e.role}) - PIN: ${e.pin}</div><button class="text-red-500 text-xs font-bold btn-action" data-action="adminDelEmp" data-payload="${e._id}">XÓA</button></div>`).join('')}
                        </div>
                        <div class="mt-2 grid grid-cols-2 gap-2">
                            <input id="new-emp-name" class="input-box text-xs" placeholder="Tên NV">
                            <input id="new-emp-pin" class="input-box text-xs" placeholder="PIN (4 số)">
                            <select id="new-emp-role" class="input-box text-xs"><option>Nhân viên</option><option>Tổ trưởng</option><option>Quản lý</option></select>
                            <button class="bg-blue-600 text-white rounded text-xs font-bold btn-action" data-action="adminAddEmp">THÊM</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold text-green-700 uppercase text-sm mb-2">Xuất Báo Cáo</h4>
                        <div class="grid grid-cols-1 gap-2">
                            <button class="py-2 bg-green-100 text-green-700 font-bold rounded btn-action" data-action="adminExport" data-payload="harvest">📥 Báo cáo Thu Hoạch</button>
                            <button class="py-2 bg-blue-100 text-blue-700 font-bold rounded btn-action" data-action="adminExport" data-payload="tasks">📥 Báo cáo Công Việc</button>
                            <button class="py-2 bg-orange-100 text-orange-700 font-bold rounded btn-action" data-action="adminExport" data-payload="attendance">📥 Báo cáo Chấm Công</button>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // --- TAB VIỆC (QUAN TRỌNG: CÓ DANH SÁCH NV & NHÀ) ---
    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý', 'Tổ trưởng', 'Admin', 'Giám đốc'].includes(currentUser.role);
        
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => (t.assignee !== currentUser.name && t.status !== 'done') || t.status === 'done');

        container.innerHTML = `
        <div class="p-2 space-y-4">
             ${canAssign ? `
             <div class="card p-3 border-2 border-blue-400 bg-blue-50 mb-4 shadow">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-bold text-blue-800 uppercase text-sm"><i class="fas fa-plus-circle"></i> Giao Việc</h4>
                    <button class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold btn-action" data-action="remindAttendance"><i class="fas fa-bullhorn"></i> Nhắc nhở</button>
                </div>
                <input id="task-title" class="input-box mb-2 font-bold" placeholder="Tên công việc">
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <select id="task-house" class="input-box w-full text-sm"><option value="">-- Nhà --</option>${houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}</select>
                    <select id="task-assignee" class="input-box w-full text-sm"><option value="">-- Nhân viên --</option>${employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}</select>
                </div>
                <div class="flex gap-2 mb-2"><input id="task-deadline" type="date" class="input-box w-full"></div>
                <textarea id="task-desc" class="input-box text-sm mb-2" placeholder="Mô tả..."></textarea>
                <button class="btn-primary w-full bg-blue-600 btn-action shadow-md" data-action="addTask">GIAO VIỆC</button>
             </div>` : ''}

             <h3 class="font-bold text-slate-700 uppercase border-b border-slate-300 pb-1">Việc Của Tôi (${myTasks.length})</h3>
             <div class="space-y-3">
                 ${myTasks.length === 0 ? '<p class="text-xs text-slate-400 italic">Không có việc được giao.</p>' : ''}
                 ${myTasks.map(t => {
                    let actionBtn = t.status === 'pending' 
                        ? `<button class="w-full mt-3 bg-yellow-100 text-yellow-700 py-2 rounded font-bold text-sm btn-action hover:bg-yellow-200" data-action="receiveTask" data-payload="${t._id}"><i class="fas fa-hand-paper"></i> NHẬN VIỆC</button>`
                        : `<button class="w-full mt-3 bg-blue-100 text-blue-700 py-2 rounded font-bold text-sm btn-action hover:bg-blue-200" data-action="submitTask" data-payload="${t._id}"><i class="fas fa-check"></i> BÁO CÁO</button>`;
                    return `<div class="card p-4 border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-md bg-white"><div class="flex justify-between items-start"><div><h4 class="font-bold text-slate-800 text-lg">${t.title}</h4><div class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-1">${t.house || 'Chung'}</div></div><span class="text-[10px] ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600'} px-2 py-1 rounded font-bold">${t.status==='received' ? 'ĐANG LÀM' : 'CHƯA NHẬN'}</span></div><p class="text-sm text-slate-600 mt-1">${t.desc || ''}</p><div class="text-xs text-slate-400 mt-2"><i class="fas fa-user-tag"></i> Giao bởi: ${t.createdBy || 'QL'}</div>${actionBtn}</div>`;
                 }).join('')}
             </div>
             <h3 class="font-bold text-slate-500 uppercase border-b border-slate-300 pb-1 mt-6 text-sm">Việc Khác</h3>
             <div class="space-y-2 opacity-75">${otherTasks.slice(0, 5).map(t => `<div class="card p-3 border-l-4 ${t.status==='done'?'border-green-500 bg-slate-50':'border-slate-300'}"><div class="flex justify-between"><h4 class="font-bold text-slate-700 text-sm">${t.title} <span class="text-xs font-normal text-slate-500">(${t.assignee} - ${t.house||''})</span></h4>${t.status==='done'?'<span class=\"text-green-600 font-bold text-xs\">XONG</span>': (t.status==='received' ? '<span class=\"text-blue-500 text-xs\">Đang làm</span>' : '<span class=\"text-red-400 text-xs\">Chưa nhận</span>')}</div></div>`).join('')}</div>
        </div>`;
    },

    // --- CHAT: HIỂN THỊ ---
    renderChat: (messages, currentUserId) => {
        const layer = document.getElementById('chat-layer');
        if(!layer.querySelector('#chat-msgs')) {
             layer.innerHTML = `
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm z-0 btn-action" data-action="closeChat"></div>
                <div class="absolute bottom-0 left-0 right-0 h-[85vh] bg-[#f0f2f5] rounded-t-3xl z-10 flex flex-col shadow-2xl animate-slide-up">
                    <div class="h-14 bg-white border-b flex items-center justify-between px-4 rounded-t-3xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-lg"><i class="fas fa-comments text-blue-600"></i> NHÓM CHUNG</h3>
                        <button class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center btn-action" data-action="closeChat"><i class="fas fa-times text-slate-500"></i></button>
                    </div>
                    <div id="chat-msgs" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
                    <div class="p-3 bg-white border-t flex gap-2">
                        <input id="chat-input-field" class="flex-1 bg-slate-100 rounded-full px-4 py-3 font-medium outline-none" placeholder="Nhập tin nhắn...">
                        <button class="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg btn-action" data-action="sendChat"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>`;
        }
        
        const box = document.getElementById('chat-msgs');
        box.innerHTML = messages.map(m => {
            const isMe = String(m.senderId) === String(currentUserId);
            const isSys = m.senderId === 'SYSTEM';
            if(isSys) return `<div class="flex justify-center my-2"><div class="bg-slate-200 text-slate-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase shadow-sm">${m.text}</div></div>`;
            return `<div class="flex flex-col ${isMe?'items-end':'items-start'}"><div class="text-[9px] text-slate-400 px-2 mb-0.5">${m.senderName}</div><div class="${isMe?'bg-blue-600 text-white rounded-br-none':'bg-white text-slate-800 rounded-bl-none'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[80%] break-words">${m.text}</div></div>`;
        }).join('');
        setTimeout(() => box.scrollTop = box.scrollHeight, 100);
    }
};
