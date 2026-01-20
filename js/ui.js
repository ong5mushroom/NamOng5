export const UI = {
    // --- KHỞI TẠO & TIỆN ÍCH ---
    initModals: () => {
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-payload');
                document.getElementById(id).classList.add('hidden');
            });
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
        if(sel) {
            sel.innerHTML = '<option value="">-- Chọn danh tính --</option>' + 
                employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        }
    },

    // --- TAB HOME ---
    renderHome: (houses, harvestLogs) => {
        const container = document.getElementById('view-home');
        const getRealYield = (houseName) => harvestLogs.filter(h => h.area === houseName).reduce((sum, h) => sum + (Number(h.total) || 0), 0);

        container.innerHTML = `
        <div class="p-2">
            <h2 class="text-lg font-black text-slate-700 mb-3 uppercase border-b-2 border-blue-500 inline-block">Trạng Thái Nhà Nấm</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${houses.map(h => {
                const realYield = getRealYield(h.name);
                return `
                <div class="card p-4 relative overflow-hidden group border-l-4 ${h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300'}">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="font-black text-xl text-blue-900">${h.name}</h3>
                            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lô: ${h.currentBatch || '---'}</div>
                        </div>
                        <span class="text-[10px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'} px-2 py-1 rounded font-bold">
                            ${h.status === 'ACTIVE' ? 'ĐANG SX' : 'CHỜ'}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3 bg-slate-50 p-2 rounded">
                        <div class="text-center border-r border-slate-200">
                            <div class="text-[10px] uppercase text-slate-400">Phôi</div>
                            <div class="font-bold text-slate-800">${h.currentSpawn ? h.currentSpawn.toLocaleString() : 0}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-[10px] uppercase text-slate-400">Đã Hái</div>
                            <div class="font-black text-blue-600">${realYield.toFixed(1)} <span class="text-[9px]">kg</span></div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
            </div>
        </div>`;
    },

    // --- TAB SX ---
    renderSX: (houses) => {
        const container = document.getElementById('view-sx');
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card border-2 border-blue-500 shadow-lg">
                <div class="bg-blue-600 text-white p-3 font-bold uppercase flex justify-between items-center">
                    <span><i class="fas fa-industry mr-2"></i>Vào Lô Mới</span>
                </div>
                <div class="p-4 space-y-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">CHỌN NHÀ</label>
                        <select id="sx-house-select" class="input-box font-bold text-blue-800">
                            ${houses.map(h => `<option value="${h._id}">${h.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">MÃ GIỐNG</label><input id="sx-strain" type="text" class="input-box uppercase font-bold" placeholder="VD: 049"></div>
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">NGÀY CẤY</label><input id="sx-date" type="date" class="input-box font-bold"></div>
                    </div>
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">SỐ PHÔI</label><input id="sx-spawn-qty" type="number" class="input-box font-bold" placeholder="VD: 1200"></div>
                    <div id="sx-preview-batch" class="text-center text-sm font-bold text-orange-600 my-2"></div>
                    <button class="btn-primary w-full py-3 bg-blue-600 btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ</button>
                </div>
            </div>
            <div>
                <h3 class="font-bold text-slate-500 text-sm uppercase mb-2 ml-1">Nhà Đang Sản Xuất</h3>
                <div class="bg-white rounded-xl shadow p-2">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-100 text-slate-500 font-bold uppercase"><tr><th class="p-2">Nhà</th><th class="p-2">Lô</th><th class="p-2 text-right">Phôi</th></tr></thead>
                        <tbody class="divide-y divide-slate-100">
                            ${houses.filter(h => h.status === 'ACTIVE').map(h => `
                                <tr><td class="p-2 font-bold text-blue-700">${h.name}</td><td class="p-2">${h.currentBatch}</td><td class="p-2 text-right font-bold">${h.currentSpawn}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
        setTimeout(() => {
            const s = document.getElementById('sx-strain'), d = document.getElementById('sx-date'), p = document.getElementById('sx-preview-batch');
            const up = () => { if(s.value && d.value) { const dt = new Date(d.value); p.innerText = `Mã: ${s.value.toUpperCase()}-${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getFullYear()).slice(-2)}`; }};
            s?.addEventListener('input', up); d?.addEventListener('change', up);
        }, 500);
    },

    // --- TAB THU ---
    renderTH: (houses, harvestLogs) => {
        const container = document.getElementById('view-th');
        const types = [ {c:'b2',l:'B2 (Đẹp)'}, {c:'a1',l:'A1'}, {c:'a2',l:'A2'}, {c:'b1',l:'B1'}, {c:'d1',l:'D1'}, {c:'abf',l:'AB-F'}, {c:'b2f',l:'B2-F'}, {c:'ht',l:'Hầu Thủ'} ];
        container.innerHTML = `
        <div class="p-2">
            <div class="card border-2 border-green-500 shadow-xl mb-6">
                <div class="bg-green-600 text-white p-3 font-bold uppercase rounded-t-lg">Phiếu Nhập THDG</div>
                <div class="p-3 space-y-4">
                    <div>
                        <select id="th-area" class="input-box text-lg font-black text-green-700 bg-green-50 border-green-300">
                            <option value="">-- Chọn Nhà --</option>
                            ${houses.map(h => `<option value="${h.name}" data-batch="${h.currentBatch||''}" data-spawn="${h.currentSpawn||0}">${h.name}</option>`).join('')}
                        </select>
                        <div id="th-batch-info" class="text-xs text-orange-600 italic mt-1 h-4"></div>
                    </div>
                    <div class="space-y-2">
                        ${types.map(m => `<div class="flex items-center gap-2"><label class="w-1/3 text-xs font-bold text-slate-600 uppercase text-right">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest flex-1 input-box !p-2 font-bold text-slate-800 text-lg focus:bg-green-50" placeholder="0"><span class=\"text-xs text-slate-400\">kg</span></div>`).join('')}
                    </div>
                    <div class="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
                        <span class="font-bold text-slate-500">TỔNG:</span><div><span id="th-display-total" class="text-3xl font-black text-green-600">0.0</span> <span class="text-xs">kg</span></div>
                    </div>
                    <textarea id="th-note" class="input-box text-sm" placeholder="Ghi chú..."></textarea>
                    <button class="btn-primary bg-green-600 btn-action w-full uppercase font-black" data-action="submitTH">LƯU PHIẾU</button>
                </div>
            </div>
            <div class="space-y-2 pb-20">
                <h4 class="text-xs font-bold text-slate-400 uppercase ml-2">Lịch sử hôm nay</h4>
                ${harvestLogs.slice(0,5).map(l => `<div class="bg-white p-2 rounded flex justify-between items-center border-l-4 border-green-400 shadow-sm"><div><div class="font-bold text-sm text-slate-700">${l.area}</div><div class="text-[10px] text-slate-400">${new Date(l.time).toLocaleTimeString()} - ${l.user}</div></div><div class="font-black text-green-700">+${l.total}</div></div>`).join('')}
            </div>
        </div>`;
        setTimeout(() => {
            const sel = document.getElementById('th-area'), info = document.getElementById('th-batch-info'), inps = document.querySelectorAll('.input-harvest'), tot = document.getElementById('th-display-total');
            sel.addEventListener('change', (e) => { inps.forEach(i=>i.value=''); tot.innerText='0.0'; const o = e.target.options[e.target.selectedIndex]; info.innerText = o.value ? `Đang hái Lô: ${o.getAttribute('data-batch')} (${o.getAttribute('data-spawn')} phôi)` : ''; });
            inps.forEach(i => i.addEventListener('input', () => { let s=0; inps.forEach(k => s+=Number(k.value)||0); tot.innerText = s.toFixed(1); }));
        }, 200);
    },

    // --- TAB KHO ---
    renderStock: (inv, supplies) => {
        const container = document.getElementById('view-stock');
        container.innerHTML = `
        <div class="p-2 space-y-4">
            <div class="card border-2 border-orange-500 shadow-lg">
                 <div class="bg-orange-600 text-white p-2 font-bold uppercase rounded-t">Kho Nấm Thành Phẩm</div>
                 <div class="p-3">
                    <div class="bg-slate-100 p-2 rounded mb-3 border border-slate-200"><div class="flex justify-between text-sm"><span>Tồn Máy Tính (Gợi ý):</span> <span class="font-bold">50.0 kg</span></div></div>
                    <div class="flex items-center gap-2 mb-3"><label class="text-sm font-bold text-slate-700">ĐẾM THỰC TẾ:</label><input id="stock-actual-mushroom" type="number" class="input-box flex-1 font-black text-orange-700 text-lg" placeholder="Kg"></div>
                    <div id="stock-variance-alert" class="hidden p-2 bg-red-100 text-red-700 text-xs font-bold rounded mb-2 border border-red-200">⚠️ LỆCH: <span id="val-variance"></span> kg. Yêu cầu nhập lý do!</div>
                    <textarea id="stock-note-mushroom" class="input-box text-sm hidden" placeholder="Nhập lý do chênh lệch..."></textarea>
                    <button class="btn-primary bg-orange-600 w-full mt-2 btn-action" data-action="submitStockCheck">CHỐT KHO</button>
                 </div>
            </div>
            <div class="card border border-slate-300 shadow">
                <div class="bg-slate-700 text-white p-2 font-bold uppercase rounded-t">Kho Vật Tư</div>
                <div class="p-3">
                    <div class="flex gap-2 mb-4"><button class="flex-1 bg-blue-100 text-blue-700 py-2 rounded font-bold text-xs btn-action" data-action="openSupplyImport"><i class="fas fa-plus-circle"></i> NHẬP MUA</button><button class="flex-1 bg-purple-100 text-purple-700 py-2 rounded font-bold text-xs btn-action" data-action="openSupplyCheck"><i class="fas fa-clipboard-check"></i> KIỂM KÊ</button></div>
                    <div class="space-y-2">${supplies.map(s => `<div class="flex justify-between items-center border-b border-slate-100 pb-1"><span class="text-sm font-bold text-slate-700">${s.name}</span><span class="text-xs bg-slate-100 px-2 py-1 rounded">Tồn: <b>${s.stock}</b> ${s.unit}</span></div>`).join('')}</div>
                </div>
            </div>
        </div>`;
        setTimeout(() => {
            const inp = document.getElementById('stock-actual-mushroom'), al = document.getElementById('stock-variance-alert'), no = document.getElementById('stock-note-mushroom');
            inp?.addEventListener('input', () => { const diff = Number(inp.value) - 50.0; if(Math.abs(diff)>0.5){ al.classList.remove('hidden'); no.classList.remove('hidden'); document.getElementById('val-variance').innerText = diff.toFixed(1); } else { al.classList.add('hidden'); no.classList.add('hidden'); } });
        }, 500);
    },

    // --- TAB VIỆC ---
    renderTasksAndShip: (tasks, shipping) => {
        const container = document.getElementById('view-tasks');
        container.innerHTML = `
        <div class="p-2 space-y-4">
             <div class="flex gap-2 bg-slate-200 p-1 rounded-lg">
                 <button class="flex-1 py-2 rounded-md font-bold text-sm bg-white shadow text-blue-700" onclick="document.getElementById('zone-tasks').classList.remove('hidden');document.getElementById('zone-ship').classList.add('hidden');">CÔNG VIỆC</button>
                 <button class="flex-1 py-2 rounded-md font-bold text-sm text-slate-500 hover:bg-white hover:shadow" onclick="document.getElementById('zone-tasks').classList.add('hidden');document.getElementById('zone-ship').classList.remove('hidden');">XUẤT BÁN</button>
             </div>
             <div id="zone-tasks" class="space-y-3">${tasks.map(t => `<div class="card p-3 border-l-4 ${t.status==='done'?'border-green-500 opacity-60':'border-blue-500'}"><div class=\"flex justify-between\"><h4 class=\"font-bold text-slate-700\">${t.title}</h4>${t.status==='done'?'<span class=\"text-green-600 font-bold text-xs\">XONG</span>':`<button class=\"text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold btn-action\" data-action=\"submitTask\" data-payload=\"${t._id}\">BÁO CÁO</button>`}</div></div>`).join('')}</div>
             <div id="zone-ship" class="hidden space-y-3">
                <div class="card p-3 bg-orange-50 border border-orange-200">
                    <h4 class="font-bold text-orange-800 mb-2 uppercase text-sm">Tạo đơn xuất hàng</h4>
                    <input id="ship-cust" class="input-box mb-2" placeholder="Tên khách hàng">
                    <div class="flex gap-2 mb-2"><select id="ship-type" class="input-box"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Phôi</option></select><input id="ship-qty" type="number" class="input-box" placeholder="Kg"></div>
                    <button class="btn-primary w-full bg-orange-600 btn-action" data-action="submitShip">Lưu & In</button>
                </div>
                <div>${shipping.slice(0,10).map(s => `<div class="card p-3 flex justify-between items-center mb-2"><div><div class="font-bold text-blue-700 text-sm">${s.customer}</div><div class="text-xs text-slate-500">${s.type} - ${s.qty}kg</div></div><button class="bg-slate-100 text-slate-600 px-3 py-2 rounded-full text-xs font-bold shadow-sm btn-action" data-action="printInvoice" data-payload="${s._id}"><i class="fas fa-print"></i> IN</button></div>`).join('')}</div>
             </div>
        </div>`;
    }
};
