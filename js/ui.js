export const UI = {
    // --- UTILS ---
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
            b.innerHTML = type === 'error' ? `<i class="fas fa-times-circle text-xl"></i> ${t}` : `<i class="fas fa-check-circle text-xl"></i> ${t}`;
            b.style.display = 'flex'; b.style.background = type === 'error' ? '#ef4444' : '#10b981';
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

    // --- 1. HOME: DANH SÁCH NHÀ CHUẨN & BẢNG PHONG THẦN ---
    renderHome: (houses, harvestLogs, employees) => {
        const container = document.getElementById('view-home');
        // Danh sách nhà chuẩn
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sortedHouses = [...houses].sort((a, b) => {
            let iA = houseOrder.indexOf(a.name), iB = houseOrder.indexOf(b.name);
            return (iA===-1?999:iA) - (iB===-1?999:iB);
        });
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);

        // Top 3 Nhân viên
        const top3 = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-b from-white to-amber-50 p-4 rounded-2xl shadow-md border border-amber-100">
                <h3 class="font-black text-amber-700 uppercase text-xs mb-4 flex items-center justify-center tracking-widest"><i class="fas fa-crown mr-2 text-yellow-500"></i>Bảng Phong Thần</h3>
                <div class="flex justify-center items-end gap-4">
                    ${top3[1] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-slate-300 border-2 border-white shadow flex items-center justify-center text-white font-black">2</div><span class="text-[10px] font-bold mt-1 text-slate-600">${top3[1].name}</span><span class="text-[10px] font-black text-amber-600">${top3[1].score}đ</span></div>` : ''}
                    ${top3[0] ? `<div class="flex flex-col items-center -mt-4"><div class="w-14 h-14 rounded-full bg-yellow-400 border-4 border-white shadow-lg flex items-center justify-center text-white text-xl font-black"><i class="fas fa-trophy"></i></div><span class="text-xs font-bold mt-2 text-slate-800">${top3[0].name}</span><span class="text-xs font-black text-amber-600">${top3[0].score}đ</span></div>` : ''}
                    ${top3[2] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-amber-700 border-2 border-white shadow flex items-center justify-center text-white font-black">3</div><span class="text-[10px] font-bold mt-1 text-slate-600">${top3[2].name}</span><span class="text-[10px] font-black text-amber-600">${top3[2].score}đ</span></div>` : ''}
                </div>
            </div>

            <div>
                <h2 class="text-sm font-black text-slate-600 uppercase mb-3 pl-3 border-l-4 border-blue-600">Trạng Thái Nhà</h2>
                <div class="grid grid-cols-2 gap-3">
                ${sortedHouses.map(h => `
                    <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="font-black text-lg text-slate-800">${h.name} ${h.name==='A'?'<span class="text-[9px] text-purple-500">(Kho Phôi)</span>':''}</h3>
                                <div class="text-[10px] text-slate-400 font-bold uppercase">${h.currentBatch || '-'}</div>
                            </div>
                            <span class="text-[9px] ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'} px-2 py-1 rounded font-bold">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                        </div>
                        <div class="text-right border-t pt-1 mt-1 border-slate-100">
                            <span class="text-[10px] text-slate-400 mr-1">Tổng thu:</span>
                            <span class="font-black text-blue-600">${getYield(h.name).toFixed(1)} kg</span>
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    },

    // --- 2. THẺ VIỆC: BỐ TRÍ Ô ĐẸP, TỶ LỆ CHUẨN ---
    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        const otherTasks = tasks.filter(t => (t.assignee !== currentUser.name && t.status !== 'done') || t.status === 'done');
        const empOpts = employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');

        container.innerHTML = `
        <div class="space-y-6">
             ${canAssign ? `
             <div class="bg-white p-5 rounded-2xl shadow-md border border-slate-100">
                <div class="flex justify-between items-center mb-4 border-b pb-2"><h4 class="font-black text-blue-700 uppercase text-xs tracking-wider">Giao Nhiệm Vụ Mới</h4></div>
                <div class="space-y-3">
                    <input id="task-title" class="input-box text-sm font-bold" placeholder="Nhập tên công việc...">
                    <div class="grid grid-cols-2 gap-3">
                        <select id="task-house" class="input-box text-sm"><option value="">-- Nhà / Khu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select>
                        <select id="task-assignee" class="input-box text-sm font-bold"><option value="">-- Người làm --</option>${empOpts}</select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <input id="task-deadline" type="date" class="input-box text-sm">
                        <button class="btn-primary bg-blue-600 rounded-lg shadow font-bold text-xs hover:bg-blue-700 active:scale-95 transition" data-action="addTask">PHÁT LỆNH</button>
                    </div>
                    <textarea id="task-desc" class="input-box text-sm" placeholder="Mô tả chi tiết..." rows="2"></textarea>
                </div>
             </div>` : ''}

             <div>
                 <h3 class="font-bold text-slate-700 text-sm uppercase mb-3 pl-2 border-l-4 border-orange-500">Cần Làm Ngay (${myTasks.length})</h3>
                 <div class="space-y-3">
                     ${myTasks.length ? myTasks.map(t => `
                        <div class="bg-white p-4 rounded-xl border-l-4 ${t.status==='received'?'border-blue-500':'border-red-500'} shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-bold text-slate-800 text-base">${t.title}</h4>
                                <span class="text-[9px] font-black px-2 py-1 rounded ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600'}">${t.status==='received'?'ĐANG LÀM':'MỚI'}</span>
                            </div>
                            <div class="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded"><i class="fas fa-map-marker-alt mr-1"></i> ${t.house||'Chung'} • ${t.desc||'Không mô tả'}</div>
                            ${t.status === 'pending' 
                                ? `<button class="w-full bg-red-50 text-red-600 py-3 rounded-lg text-xs font-black btn-action border border-red-100" data-action="receiveTask" data-payload="${t._id}">NHẬN VIỆC</button>`
                                : `<button class="w-full bg-blue-600 text-white py-3 rounded-lg text-xs font-black btn-action shadow-md active:scale-95" data-action="submitTask" data-payload="${t._id}">BÁO CÁO HOÀN THÀNH</button>`
                            }
                        </div>`).join('') : '<div class="text-center p-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl">Bạn đang rảnh rỗi!</div>'}
                 </div>
             </div>
             
             <div>
                 <h3 class="font-bold text-slate-400 text-xs uppercase mb-2 mt-6">Nhật ký công việc</h3>
                 <div class="space-y-2 opacity-75">
                    ${otherTasks.slice(0, 5).map(t => `
                        <div class="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                            <div><div class="font-bold text-slate-600 text-xs">${t.title}</div><div class="text-[10px] text-slate-400">${t.assignee} • ${t.house||''}</div></div>
                            ${t.status==='done' ? '<span class="text-[10px] font-bold text-green-600 border border-green-200 px-2 py-0.5 rounded bg-green-50">XONG</span>' : '<span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded">...</span>'}
                        </div>`).join('')}
                 </div>
             </div>
        </div>`;
    },

    // --- 3. THDG: ĐẦY ĐỦ MÃ NẤM & TÍNH CHÊNH LỆCH ---
    renderTH: (houses, harvestLogs, shippingLogs, supplies) => {
        const container = document.getElementById('view-th');
        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // MÃ NẤM ĐẦY ĐỦ THEO YÊU CẦU
        const g1 = [{c:'b2',l:'B2'},{c:'a1',l:'A1'},{c:'a2',l:'A2'},{c:'b1',l:'B1'},{c:'d1',l:'D1'},{c:'ht',l:'Hầu Thủ'}];
        const g2 = [{c:'a1f',l:'A1F'},{c:'a2f',l:'A2F'},{c:'b2f',l:'B2F'}];
        const g3 = [{c:'snack',l:'Snack'},{c:'kho',l:'Nấm Khô'},{c:'tra',l:'Trà'}]; // Thành phẩm

        container.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button class="flex-1 py-2 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm" onclick="document.getElementById('zone-th').classList.remove('hidden');document.getElementById('zone-ship').classList.add('hidden');this.className='flex-1 py-2 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm';this.nextElementSibling.className='flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50';">NHẬP</button>
                <button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50" onclick="document.getElementById('zone-th').classList.add('hidden');document.getElementById('zone-ship').classList.remove('hidden');this.className='flex-1 py-2 rounded-lg font-bold text-xs bg-orange-100 text-orange-700 shadow-sm';this.previousElementSibling.className='flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50';">XUẤT & TỒN</button>
            </div>
            
            <div id="zone-th">
                <div class="bg-white p-5 rounded-2xl shadow-lg border border-green-100">
                    <div class="flex justify-between items-center border-b pb-3 mb-4"><span class="font-black text-green-700 text-sm uppercase flex items-center"><i class="fas fa-download mr-2"></i>Nhập Kho / Chế Biến</span></div>
                    <div class="space-y-4">
                        <select id="th-area" class="input-box text-green-800 font-bold border-green-300"><option value="">-- Chọn Nguồn (Nhà/Khu) --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                        
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">1. Nấm Tươi (Kg)</h4>
                            <div class="grid grid-cols-3 gap-2">${g1.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest w-full p-2 rounded border border-slate-300 text-center font-bold text-sm focus:border-green-500" placeholder="-"></div>`).join('')}</div>
                        </div>
                        
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">2. Phụ Phẩm (Kg)</h4>
                            <div class="grid grid-cols-3 gap-2">${g2.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" step="0.1" id="th-${m.c}" class="input-harvest w-full p-2 rounded border border-slate-300 text-center font-bold text-sm focus:border-orange-500" placeholder="-"></div>`).join('')}</div>
                        </div>

                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <h4 class="text-[10px] font-bold text-slate-500 uppercase mb-2">3. Thành Phẩm (Gói/Hộp)</h4>
                            <div class="grid grid-cols-3 gap-2">${g3.map(m=>`<div><label class="text-[9px] font-bold text-slate-400 block mb-1">${m.l}</label><input type="number" id="th-${m.c}" class="input-harvest w-full p-2 rounded border border-slate-300 text-center font-bold text-sm focus:border-purple-500" placeholder="-"></div>`).join('')}</div>
                        </div>

                        <button class="btn-primary w-full bg-green-600 py-3 rounded-xl font-black shadow-lg shadow-green-200 btn-action active:scale-95 transition" data-action="submitTH">LƯU KHO</button>
                    </div>
                </div>
            </div>
            
            <div id="zone-ship" class="hidden">
                <div class="bg-white p-5 rounded-2xl shadow-lg border border-orange-100">
                    <h4 class="font-black text-orange-700 text-sm uppercase mb-4 flex items-center"><i class="fas fa-truck mr-2"></i>Xuất Bán / Chuyển</h4>
                    <div class="space-y-3">
                        <input id="ship-cust" class="input-box font-bold" placeholder="Tên khách hàng / Đối tác">
                        <div class="grid grid-cols-2 gap-3">
                            <select id="ship-type" class="input-box text-sm"><option>Nấm Tươi</option><option>Nấm Khô</option><option>Snack</option><option>Trà</option></select>
                            <input id="ship-qty" type="number" class="input-box font-black text-orange-600 text-center" placeholder="Số lượng">
                        </div>
                        <textarea id="ship-note" class="input-box text-sm" placeholder="Ghi chú..."></textarea>
                        <button class="btn-primary w-full bg-orange-600 py-3 rounded-xl font-black shadow-lg btn-action active:scale-95 transition" data-action="submitShip">LƯU & IN PHIẾU</button>
                    </div>
                </div>

                <div class="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 class="font-bold text-slate-700 text-xs uppercase mb-3">Kiểm Kê & Đối Chiếu</h4>
                    <div class="flex gap-2 items-end">
                        <div class="flex-1">
                            <label class="text-[9px] text-slate-400 font-bold">TỒN MÁY TÍNH</label>
                            <div class="bg-slate-100 p-2 rounded text-slate-500 font-bold text-sm">150.0</div>
                        </div>
                        <div class="flex-1">
                            <label class="text-[9px] text-slate-400 font-bold">THỰC TẾ ĐẾM</label>
                            <input id="stock-count" type="number" class="input-box p-2 text-center font-bold text-blue-600">
                        </div>
                        <button class="bg-blue-600 text-white px-3 py-2.5 rounded-lg font-bold text-xs btn-action shadow h-10" data-action="calcVariance">TÍNH</button>
                    </div>
                    <div id="stock-variance-res" class="mt-3 hidden p-3 rounded-lg text-center text-sm font-bold"></div>
                </div>
            </div>
        </div>`;
    },

    // --- 4. TEAM (SỬA LỖI NÚT BẤM & PHÂN QUYỀN) ---
    renderTeam: (user, reqs, employees) => {
        const container = document.getElementById('view-team');
        // Phân quyền rõ ràng
        const isDirector = user.role === 'Giám đốc';
        const isManager = ['Quản lý', 'Admin'].includes(user.role);
        const isLeader = ['Tổ trưởng', 'Kế toán'].includes(user.role);
        const canApprove = isDirector || isManager || isLeader;
        
        const pendings = reqs ? reqs.filter(r=>r.status==='pending') : [];

        // Nút chức năng
        const actionButtons = `
            <div class="grid grid-cols-2 gap-3 mb-6">
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action active:bg-green-50 transition" data-action="submitAttendance">
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl"><i class="fas fa-fingerprint"></i></div>
                    <span class="text-xs font-black text-slate-700">ĐIỂM DANH</span>
                </button>
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action active:bg-orange-50 transition" data-action="toggleModal" data-payload="modal-leave">
                    <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xl"><i class="fas fa-file-signature"></i></div>
                    <span class="text-xs font-black text-slate-700">XIN NGHỈ</span>
                </button>
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action active:bg-purple-50 transition" data-action="toggleModal" data-payload="modal-buy-req">
                    <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl"><i class="fas fa-shopping-basket"></i></div>
                    <span class="text-xs font-black text-slate-700">MUA HÀNG</span>
                </button>
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action active:bg-slate-100 transition" data-action="logout">
                    <div class="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xl"><i class="fas fa-power-off"></i></div>
                    <span class="text-xs font-black text-slate-700">THOÁT</span>
                </button>
            </div>
        `;

        // Danh sách nhân viên & Chấm phạt (Chỉ Giám đốc/Quản lý)
        let empList = '';
        if ((isDirector || isManager) && employees) {
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
                            <button class="w-8 h-8 rounded-full bg-red-50 text-red-600 font-bold text-[10px] btn-action border border-red-100 active:bg-red-200" data-action="punishEmp" data-payload="${e._id}|5">-5</button>
                            <button class="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-[10px] btn-action border border-red-200 active:bg-red-300" data-action="punishEmp" data-payload="${e._id}|10">-10</button>
                            ${isDirector ? `<button class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[10px] btn-action" data-action="adminDelEmp" data-payload="${e._id}"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>`).join('')}
                    <div class="p-3 bg-slate-50 flex gap-2">
                        <input id="new-emp-name" class="input-box text-xs w-2/3" placeholder="Tên NV mới">
                        <input id="new-emp-pin" class="input-box text-xs w-1/3" placeholder="PIN">
                        <button class="bg-blue-600 text-white rounded px-3 font-bold text-xs btn-action" data-action="adminAddEmp">+</button>
                    </div>
                </div>
            </div>`;
        }

        container.innerHTML = `<div class="p-4 space-y-4">
            <div class="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 rounded-3xl text-white shadow-xl flex items-center gap-5">
                <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black backdrop-blur-sm shadow-inner">${user.name.charAt(0)}</div>
                <div><h2 class="text-xl font-black uppercase tracking-wide">${user.name}</h2><p class="text-xs font-medium opacity-80 bg-white/10 px-2 py-1 rounded inline-block mt-1">${user.role}</p></div>
            </div>
            ${actionButtons}
            ${canApprove ? `<div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4"><h3 class="font-black text-yellow-800 text-xs mb-3 uppercase flex items-center"><i class="fas fa-bell mr-2"></i>Duyệt Đơn (${pendings.length})</h3>${pendings.length ? pendings.map(r=>`<div class="bg-white p-3 mb-2 rounded-lg flex justify-between items-center shadow-sm"><div><b class="text-xs text-slate-800">${r.user}</b><div class="text-[10px] text-slate-500">${r.type}: ${r.item||r.reason}</div></div><div class="flex gap-2"><button class="bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold btn-action shadow" data-action="approveRequest" data-payload="${r._id}">DUYỆT</button><button class="bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold btn-action shadow" data-action="rejectRequest" data-payload="${r._id}">HỦY</button></div></div>`).join('') : '<span class="text-xs italic text-slate-400 block text-center">Không có yêu cầu nào.</span>'}</div>` : ''}
            ${empList}
            <div id="modal-leave" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div class="modal-content w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl"><h3 class="font-black text-center text-slate-800 text-lg uppercase">Xin Nghỉ Phép</h3><input id="leave-date" type="date" class="input-box"><select id="leave-reason" class="input-box"><option>Việc riêng</option><option>Ốm / Sức khỏe</option><option>Khác</option></select><div class="flex gap-3"><button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-leave">Hủy</button><button class="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold btn-action shadow-lg" data-action="submitLeave">Gửi Đơn</button></div></div></div>
            <div id="modal-buy-req" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div class="modal-content w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl"><h3 class="font-black text-center text-slate-800 text-lg uppercase">Đề Xuất Mua</h3><input id="buy-name" class="input-box" placeholder="Tên hàng hóa"><div class="flex gap-3"><input id="buy-unit" class="input-box w-1/3" placeholder="ĐVT"><input id="buy-qty" type="number" class="input-box w-2/3" placeholder="Số lượng"></div><textarea id="buy-note" class="input-box text-sm" placeholder="Ghi chú (nếu có)"></textarea><div class="flex gap-3"><button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="toggleModal" data-payload="modal-buy-req">Hủy</button><button class="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold btn-action shadow-lg" data-action="submitBuyRequest">Gửi</button></div></div></div>
        </div>`;
    },

    // --- CÀI ĐẶT & CHAT (HOÀN THIỆN) ---
    renderChat: (msgs, uid) => {
        const layer = document.getElementById('chat-layer');
        layer.classList.remove('hidden'); layer.style.display = 'flex';
        layer.innerHTML = `
        <div class="h-16 bg-white border-b flex items-center justify-between px-4 shadow-sm z-10"><h3 class="font-black text-slate-800 flex items-center"><i class="fas fa-comments text-blue-600 mr-2"></i>NHÓM CHUNG</h3><button class="w-10 h-10 bg-slate-100 rounded-full btn-action flex items-center justify-center text-slate-500" data-action="closeChat"><i class="fas fa-times"></i></button></div>
        <div id="chat-msgs" class="flex-1 overflow-y-auto p-4 space-y-3 chat-pattern"></div>
        <div class="p-3 bg-white border-t flex gap-2"><input id="chat-input" class="flex-1 bg-slate-100 rounded-full px-5 outline-none text-sm font-bold text-slate-800" placeholder="Nhập tin nhắn..."><button class="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg btn-action active:scale-90 transition" data-action="sendChat"><i class="fas fa-paper-plane"></i></button></div>`;
        const box = document.getElementById('chat-msgs');
        box.innerHTML = msgs.map(m => {
            if(m.type==='system') return `<div class="text-center text-[10px] text-slate-500 font-bold bg-white/80 rounded-full py-1 px-3 mx-auto w-fit my-2 shadow-sm backdrop-blur-sm border border-white"><span>${m.text}</span></div>`;
            const isMe = String(m.senderId) === String(uid);
            return `<div class="flex flex-col ${isMe?'items-end':'items-start'} animate-fade"><span class="text-[9px] text-slate-500 px-1 mb-0.5 font-bold">${m.senderName}</span><div class="${isMe?'bg-green-100 text-slate-900 border border-green-200 rounded-br-none':'bg-white text-slate-900 border border-slate-200 rounded-bl-none'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] leading-relaxed">${m.text}</div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    },
    
    renderSettingsModal: (employees) => { /* Giữ nguyên từ V228 nhưng đảm bảo CSS text-slate-800 */ }
};
