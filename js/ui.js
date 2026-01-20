export const UI = {
    // --- TIỆN ÍCH CHUNG ---
    playSound: (type) => {
        // Tạo âm thanh bíp đơn giản bằng Web Audio API (không cần file mp3)
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(); osc.stop(ctx.currentTime + 0.5);
        } else if (type === 'remind') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.1); // Bíp...
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        }
    },

    initModals: () => {
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-payload');
                document.getElementById(id)?.classList.add('hidden');
            });
        });
        document.getElementById('close-chat')?.addEventListener('click', () => {
            document.getElementById('chat-layer')?.classList.add('hidden');
        });
    },

    toggleModal: (id, show) => {
        const el = document.getElementById(id);
        if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },

    showMsg: (t, type = 'info') => {
        const b = document.getElementById('msg-box'); 
        if(!b) {
            const box = document.createElement('div');
            box.id = 'msg-box';
            box.style.cssText = "position:fixed; top:20px; right:20px; padding:15px 25px; border-radius:10px; color:white; font-weight:bold; z-index:9999; display:none; box-shadow: 0 4px 12px rgba(0,0,0,0.3);";
            document.body.appendChild(box);
            UI.showMsg(t, type); return;
        }
        b.innerHTML = type === 'success' ? `<i class="fas fa-check-circle"></i> ${t}` : (type === 'error' ? `<i class="fas fa-exclamation-triangle"></i> ${t}` : t);
        b.style.display = 'block'; 
        b.style.background = type === 'success' ? '#16a34a' : (type === 'error' ? '#dc2626' : '#2563eb');
        setTimeout(() => b.style.display = 'none', 3000); 
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`view-${tabName}`);
        if(target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
            const icon = btn.querySelector('i');
            if(btn.dataset.tab === tabName) icon.classList.add('text-blue-400');
            else icon.classList.remove('text-blue-400');
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        const taskSel = document.getElementById('task-assignee');
        if(sel) sel.innerHTML = '<option value="">-- Chọn danh tính --</option>' + employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        if(taskSel) taskSel.innerHTML = employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
    },

    // --- TAB HOME ---
    renderHome: (houses, harvestLogs) => {
        const container = document.getElementById('view-home');
        const sortedHouses = [...houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
        const getRealYield = (houseName) => harvestLogs.filter(h => h.area === houseName).reduce((sum, h) => sum + (Number(h.total) || 0), 0);

        container.innerHTML = `
        <div class="p-2">
            <h2 class="text-lg font-black text-slate-700 mb-3 uppercase border-b-2 border-blue-500 inline-block">Trạng Thái Nhà Nấm</h2>
            <div class="grid grid-cols-2 gap-3">
            ${sortedHouses.map(h => {
                const realYield = getRealYield(h.name);
                return `
                <div class="card p-3 relative overflow-hidden group border-l-4 ${h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300'}">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="font-black text-xl text-blue-900">${h.name}</h3>
                            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">${h.currentBatch ? 'Lô: '+h.currentBatch : '(Trống)'}</div>
                        </div>
                        <span class="text-[9px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'} px-1 py-0.5 rounded font-bold">
                            ${h.status === 'ACTIVE' ? 'ĐANG SX' : 'CHỜ'}
                        </span>
                    </div>
                    <div class="text-center bg-slate-50 p-1 rounded">
                        <div class="text-[9px] uppercase text-slate-400">Đã Hái</div>
                        <div class="font-black text-blue-600">${realYield.toFixed(1)} <span class="text-[9px]">kg</span></div>
                    </div>
                </div>`;
            }).join('')}
            </div>
        </div>`;
    },

    // --- TAB SX ---
    renderSX: (houses) => {
        const container = document.getElementById('view-sx');
        const sortedHouses = [...houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card border-2 border-blue-500 shadow-lg">
                <div class="bg-blue-600 text-white p-3 font-bold uppercase flex justify-between items-center"><span><i class="fas fa-industry mr-2"></i>Vào Lô Mới (Nhập Phôi)</span></div>
                <div class="p-4 space-y-3">
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">CHỌN NHÀ</label><select id="sx-house-select" class="input-box font-bold text-blue-800">${sortedHouses.map(h => `<option value="${h._id}">${h.name}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-bold text-slate-500 mb-1">MÃ GIỐNG</label><input id="sx-strain" type="text" class="input-box uppercase font-bold" placeholder="VD: 049"></div><div><label class="block text-xs font-bold text-slate-500 mb-1">NGÀY CẤY</label><input id="sx-date" type="date" class="input-box font-bold"></div></div>
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">SỐ LƯỢNG PHÔI</label><input id="sx-spawn-qty" type="number" class="input-box font-bold" placeholder="VD: 1200"></div>
                    <div id="sx-preview-batch" class="text-center text-sm font-bold text-orange-600 my-2"></div>
                    <button class="btn-primary w-full py-3 bg-blue-600 btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ</button>
                </div>
            </div>
        </div>`;
        setTimeout(() => {
            const s = document.getElementById('sx-strain'), d = document.getElementById('sx-date'), p = document.getElementById('sx-preview-batch');
            const up = () => { if(s?.value && d?.value) { const dt = new Date(d.value); p.innerText = `Mã: ${s.value.toUpperCase()}-${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getFullYear()).slice(-2)}`; }};
            s?.addEventListener('input', up); d?.addEventListener('change', up);
        }, 500);
    },

    // --- TAB THU HOẠCH (CẬP NHẬT: TÁCH RIÊNG NHÓM A,B VÀ NHÓM DABF) ---
    renderTH: (houses, harvestLogs, shippingLogs) => {
        const container = document.getElementById('view-th');
        const sortedHouses = [...houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
        
        // Nhóm Thành Phẩm
        const goodTypes = [
            {c:'b2',l:'B2 (Đẹp)'}, {c:'a1',l:'A1 (Nhất)'}, {c:'a2',l:'A2 (Nhì)'}, {c:'b1',l:'B1 (Nở)'}, {c:'ht',l:'Hầu Thủ'}
        ];
        // Nhóm Phế phẩm / Chân (DABF)
        const wasteTypes = [
            {c:'a1f',l:'A1F (Phế)'}, {c:'a2f',l:'A2F (Phế)'}, {c:'b2f',l:'B2F (Phế)'}, {c:'d1',l:'D1 (Chân)'}
        ];
        
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="flex gap-2 bg-slate-200 p-1 rounded-lg mb-2">
                <button class="flex-1 py-2 rounded-md font-bold text-sm bg-white shadow text-green-700" onclick="document.getElementById('zone-th').classList.remove('hidden');document.getElementById('zone-ship').classList.add('hidden');">THU HOẠCH</button>
                <button class="flex-1 py-2 rounded-md font-bold text-sm text-slate-500" onclick="document.getElementById('zone-th').classList.add('hidden');document.getElementById('zone-ship').classList.remove('hidden');">XUẤT KHO</button>
            </div>
            
            <div id="zone-th">
                <div class="card border-2 border-green-500 shadow-xl mb-4">
                    <div class="bg-green-600 text-white p-3 font-bold uppercase rounded-t-lg flex justify-between">
                        <span>Phiếu Nhập Nấm</span>
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="p-3 space-y-3">
                        <div>
                            <select id="th-area" class="input-box text-lg font-black text-green-700 bg-green-50 border-green-300">
                                <option value="">-- Chọn Nhà --</option>
                                ${sortedHouses.map(h => `<option value="${h.name}" data-batch="${h.currentBatch||''}" data-spawn="${h.currentSpawn||0}">${h.name}</option>`).join('')}
                            </select>
                            <div id="th-batch-info" class="text-xs text-orange-600 italic mt-1 h-4"></div>
                        </div>

                        <div class="bg-green-50 p-2 rounded border border-green-100">
                            <h4 class="text-xs font-bold text-green-700 uppercase mb-2 border-b border-green-200 pb-1">1. Hàng Thành Phẩm</h4>
                            <div class="space-y-2">
                                ${goodTypes.map(m => `
                                    <div class="flex items-center gap-2">
                                        <label class="w-1/3 text-xs font-bold text-slate-600 text-right">${m.l}</label>
                                        <input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-1 font-bold text-slate-800 text-lg" placeholder="-">
                                    </div>`).join('')}
                            </div>
                        </div>

                        <div class="bg-orange-50 p-2 rounded border border-orange-100">
                            <h4 class="text-xs font-bold text-orange-700 uppercase mb-2 border-b border-orange-200 pb-1">2. Hàng Chân / Vụn (DABF)</h4>
                            <div class="space-y-2">
                                ${wasteTypes.map(m => `
                                    <div class="flex items-center gap-2">
                                        <label class="w-1/3 text-xs font-bold text-slate-600 text-right">${m.l}</label>
                                        <input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-1 font-bold text-slate-800 text-lg" placeholder="-">
                                    </div>`).join('')}
                            </div>
                        </div>

                        <div class="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200"><span class="font-bold text-slate-500">TỔNG CỘNG:</span><div><span id="th-display-total" class="text-3xl font-black text-green-600">0.0</span> <span class="text-xs">kg</span></div></div>
                        <textarea id="th-note" class="input-box text-sm" placeholder="Ghi chú sự cố..."></textarea>
                        <button class="btn-primary bg-green-600 btn-action w-full uppercase font-black py-4 shadow-lg" data-action="submitTH"><i class="fas fa-save mr-2"></i> LƯU VÀO KHO</button>
                    </div>
                </div>
                
                <div class="space-y-2 pb-20">
                    <h4 class="text-xs font-bold text-slate-400 uppercase ml-2">Vừa nhập kho</h4>
                    ${harvestLogs.slice(0,5).map(l => {
                        const d = l.details || {};
                        // Tính DABF = A1F + A2F + B2F + D1
                        const sumDABF = (d.a1f||0) + (d.a2f||0) + (d.b2f||0) + (d.d1||0);
                        const sumAB = l.total - sumDABF;

                        return `
                        <div class="bg-white p-2 rounded border-l-4 border-green-400 shadow-sm flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm text-slate-700">${l.area} <span class="text-[10px] text-slate-400">(${new Date(l.time).toLocaleTimeString()})</span></div>
                                <div class="text-[10px] flex gap-2 mt-1">
                                    <span class="bg-blue-100 text-blue-700 px-1 rounded font-bold">AB: ${sumAB.toFixed(1)}</span>
                                    <span class="bg-orange-100 text-orange-700 px-1 rounded font-bold">DABF: ${sumDABF.toFixed(1)}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-black text-green-700 text-lg">+${l.total.toFixed(1)}</div>
                                <div class="text-[9px] text-slate-400 italic">${l.user}</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <div id="zone-ship" class="hidden">
                 <div class="card p-4 bg-orange-50 border-2 border-orange-200 mb-4 shadow-lg">
                    <h4 class="font-bold text-orange-800 mb-3 uppercase flex items-center"><i class="fas fa-truck mr-2"></i>Tạo Phiếu Xuất</h4>
                    <input id="ship-cust" class="input-box mb-3 font-bold" placeholder="Khách hàng">
                    <div class="flex gap-2 mb-3"><select id="ship-type" class="input-box font-bold"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Phôi</option></select><input id="ship-qty" type="number" class="input-box font-black text-orange-600 text-center" placeholder="Kg"></div>
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

    // --- TAB KHO (GIỮ NGUYÊN) ---
    renderStock: (inv, supplies, distributionLogs) => { 
        const container = document.getElementById('view-stock');
        const recentDist = distributionLogs ? distributionLogs.slice(0, 5) : [];
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card border-2 border-orange-500 shadow-lg">
                 <div class="bg-orange-600 text-white p-2 font-bold uppercase rounded-t flex justify-between"><span><i class="fas fa-box-open mr-2"></i>Kho Nấm</span></div>
                 <div class="p-3">
                    <div class="bg-slate-100 p-2 rounded mb-3 border border-slate-200"><div class="flex justify-between text-sm"><span>Tồn Máy Tính (Gợi ý):</span> <span class="font-bold">50.0 kg</span></div></div>
                    <div class="flex items-center gap-2 mb-3"><label class="text-sm font-bold text-slate-700">THỰC TẾ:</label><input id="stock-actual-mushroom" type="number" class="input-box flex-1 font-black text-orange-700 text-lg" placeholder="Kg"></div>
                    <div id="stock-variance-alert" class="hidden p-2 bg-red-100 text-red-700 text-xs font-bold rounded mb-2 border border-red-200">⚠️ LỆCH: <span id="val-variance"></span> kg. Yêu cầu nhập lý do!</div>
                    <textarea id="stock-note-mushroom" class="input-box text-sm hidden" placeholder="Nhập lý do chênh lệch..."></textarea>
                    <button class="btn-primary bg-orange-600 w-full mt-2 btn-action" data-action="submitStockCheck">CHỐT KHO NẤM</button>
                 </div>
            </div>
            <div class="card border border-slate-300 shadow">
                <div class="bg-slate-800 text-white p-2 font-bold uppercase rounded-t flex justify-between items-center"><span><i class="fas fa-warehouse mr-2"></i>Kho Vật Tư (Kho A)</span><button class="text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded shadow btn-action" data-action="toggleModal" data-payload="modal-distribute"><i class="fas fa-dolly"></i> CẤP PHÁT</button></div>
                <div class="p-3">
                    <div class="space-y-2 max-h-60 overflow-y-auto">${supplies.length === 0 ? '<p class="text-xs text-center text-slate-400">Kho trống</p>' : supplies.map(s => `<div class="flex justify-between items-center border-b border-slate-100 pb-1"><span class="text-sm font-bold text-slate-700">${s.name}</span><span class="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Tồn A: <b class="text-blue-700 text-sm">${s.stock}</b> ${s.unit}</span></div>`).join('')}</div>
                    <div class="mt-4 pt-2 border-t border-slate-200"><h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Vừa cấp phát đi các nhà</h4>${recentDist.map(d => `<div class="text-xs flex justify-between items-center mb-1 text-slate-600"><span><i class="fas fa-arrow-right text-slate-400"></i> ${d.toHouse}: ${d.itemName}</span><span class="font-bold">-${d.qty}</span></div>`).join('')}</div>
                </div>
            </div>
            <div id="modal-distribute" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl"><h3 class="font-bold text-lg text-slate-700 mb-4 uppercase text-center border-b pb-2">Cấp Phát Vật Tư</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Vật tư (Từ Kho A)</label><select id="dist-item" class="input-box font-bold">${supplies.map(s => `<option value="${s._id}" data-name="${s.name}" data-stock="${s.stock}">${s.name} (Tồn: ${s.stock} ${s.unit})</option>`).join('')}</select></div><div><label class="text-xs font-bold text-slate-500">Đến Nhà / Khu vực</label><select id="dist-to" class="input-box"><option value="B1">Nhà B1</option><option value="B2">Nhà B2</option><option value="A1">Nhà A1</option><option value="A2">Nhà A2</option><option value="XuongSX">Xưởng Sản Xuất</option><option value="VanPhong">Văn Phòng</option></select></div><div><label class="text-xs font-bold text-slate-500">Số lượng cấp</label><input id="dist-qty" type="number" class="input-box font-bold text-lg text-blue-600"></div><div class="flex gap-2 pt-2"><button class="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-distribute">Đóng</button><button class="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow btn-action" data-action="submitDistribute">Xác Nhận</button></div></div></div></div>
        </div>`;
        setTimeout(() => {
            const inp = document.getElementById('stock-actual-mushroom'), al = document.getElementById('stock-variance-alert'), no = document.getElementById('stock-note-mushroom');
            if(inp) inp.addEventListener('input', () => { const diff = Number(inp.value) - 50.0; if(Math.abs(diff)>0.5){ al.classList.remove('hidden'); no.classList.remove('hidden'); document.getElementById('val-variance').innerText = diff.toFixed(1); } else { al.classList.add('hidden'); no.classList.add('hidden'); } });
        }, 500);
    },

    // --- TAB TEAM ---
    renderTeam: (user) => {
        const container = document.getElementById('view-team');
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
            <div id="modal-leave" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl"><h3 class="font-bold text-lg text-slate-700 mb-4 uppercase text-center border-b pb-2">Đơn Xin Nghỉ Phép</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Ngày nghỉ</label><input id="leave-date" type="date" class="input-box"></div><div><label class="text-xs font-bold text-slate-500">Lý do</label><select id="leave-reason" class="input-box"><option>Ốm / Sức khỏe</option><option>Việc gia đình</option><option>Khác</option></select></div><div class="flex gap-2 pt-2"><button class="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-leave">Hủy</button><button class="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg shadow btn-action" data-action="submitLeave">Gửi Đơn</button></div></div></div></div>
            <div id="modal-buy-req" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl"><h3 class="font-bold text-lg text-slate-700 mb-4 uppercase text-center border-b pb-2">Đề Xuất Mua Vật Tư</h3><div class="space-y-3"><div><label class="text-xs font-bold text-slate-500">Tên vật tư</label><input id="buy-name" class="input-box" placeholder="VD: Cồn 90 độ, Găng tay..."></div><div class="flex gap-2"><div class="w-1/3"><label class="text-xs font-bold text-slate-500">ĐVT</label><input id="buy-unit" class="input-box" placeholder="Lít/Cái"></div><div class="flex-1"><label class="text-xs font-bold text-slate-500">Số lượng</label><input id="buy-qty" type="number" class="input-box"></div></div><div><label class="text-xs font-bold text-slate-500">Ghi chú</label><textarea id="buy-note" class="input-box text-sm"></textarea></div><div class="flex gap-2 pt-2"><button class="flex-1 py-3 bg-slate-100 font-bold rounded-lg text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-buy-req">Hủy</button><button class="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg shadow btn-action" data-action="submitBuyRequest">Gửi Đề Xuất</button></div></div></div></div>
        </div>`;
    },

    // --- TAB VIỆC (CẬP NHẬT: 3 TRẠNG THÁI + NÚT NHẮC NHỞ) ---
    renderTasksAndShip: (tasks, currentUser) => {
        const container = document.getElementById('view-tasks');
        const canAssign = currentUser.role === 'Quản lý' || currentUser.role === 'Tổ trưởng' || currentUser.role === 'Admin';
        
        // Phân loại việc
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => (t.assignee !== currentUser.name && t.status !== 'done') || t.status === 'done');

        container.innerHTML = `
        <div class="p-2 space-y-4">
             ${canAssign ? `
             <div class="card p-3 border-2 border-blue-400 bg-blue-50 mb-4 shadow">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-bold text-blue-800 uppercase text-sm"><i class="fas fa-plus-circle"></i> Giao Việc Mới</h4>
                    <button class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold btn-action" data-action="remindAttendance"><i class="fas fa-bullhorn"></i> Nhắc nhở</button>
                </div>
                <input id="task-title" class="input-box mb-2 font-bold" placeholder="Tên công việc">
                <div class="flex gap-2 mb-2"><select id="task-assignee" class="input-box flex-1"><option>Đang tải...</option></select><input id="task-deadline" type="date" class="input-box w-1/3"></div>
                <textarea id="task-desc" class="input-box text-sm mb-2" placeholder="Mô tả..."></textarea>
                <button class="btn-primary w-full bg-blue-600 btn-action shadow-md" data-action="addTask">GIAO VIỆC</button>
             </div>` : ''}

             <h3 class="font-bold text-slate-700 uppercase border-b border-slate-300 pb-1">Việc Của Tôi (${myTasks.length})</h3>
             <div class="space-y-3">
                 ${myTasks.length === 0 ? '<p class="text-xs text-slate-400 italic">Không có việc được giao.</p>' : ''}
                 ${myTasks.map(t => {
                    // Logic hiển thị nút bấm theo trạng thái
                    let actionBtn = '';
                    if (t.status === 'pending') {
                        actionBtn = `<button class="w-full mt-3 bg-yellow-100 text-yellow-700 py-2 rounded font-bold text-sm btn-action hover:bg-yellow-200" data-action="receiveTask" data-payload="${t._id}"><i class="fas fa-hand-paper"></i> BẤM ĐỂ NHẬN VIỆC</button>`;
                    } else if (t.status === 'received') {
                         actionBtn = `<button class="w-full mt-3 bg-blue-100 text-blue-700 py-2 rounded font-bold text-sm btn-action hover:bg-blue-200" data-action="submitTask" data-payload="${t._id}"><i class="fas fa-check"></i> BÁO CÁO HOÀN THÀNH</button>`;
                    }

                    return `
                    <div class="card p-4 border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-md bg-white">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-slate-800 text-lg">${t.title}</h4>
                            <span class="text-[10px] ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600'} px-2 py-1 rounded font-bold">
                                ${t.status==='received' ? 'ĐANG LÀM' : 'CHƯA NHẬN'}
                            </span>
                        </div>
                        <p class="text-sm text-slate-600 mt-1">${t.desc || ''}</p>
                        <div class="text-xs text-slate-400 mt-2"><i class="fas fa-user-tag"></i> Giao bởi: ${t.createdBy || 'QL'}</div>
                        ${actionBtn}
                    </div>`
                 }).join('')}
             </div>

             <h3 class="font-bold text-slate-500 uppercase border-b border-slate-300 pb-1 mt-6 text-sm">Trạng thái chung</h3>
             <div class="space-y-2 opacity-75">${otherTasks.slice(0, 5).map(t => `<div class="card p-3 border-l-4 ${t.status==='done'?'border-green-500 bg-slate-50':'border-slate-300'}"><div class="flex justify-between"><h4 class="font-bold text-slate-700 text-sm">${t.title} <span class="text-xs font-normal text-slate-500">(${t.assignee})</span></h4>${t.status==='done'?'<span class=\"text-green-600 font-bold text-xs\">XONG</span>': (t.status==='received' ? '<span class=\"text-blue-500 text-xs\">Đang làm</span>' : '<span class=\"text-red-400 text-xs\">Chưa nhận</span>')}</div></div>`).join('')}</div>
        </div>`;
    }
};
