// --- FILE: js/ui.js (ĐÃ FIX LỖI IMPORT) ---

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
                        <thead class="bg-slate-100 text-slate-500 font-bold uppercase"><tr><th class="p-2">Nhà</th><th class="p-2">Lô</th><th class="p-2 text
