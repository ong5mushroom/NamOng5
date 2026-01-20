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
                    <button class="btn-primary w-full bg-orange-600 btn-action shadow-lg" data-
