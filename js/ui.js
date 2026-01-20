export const UI = {
    // --- ÂM THANH ---
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
        } catch (e) {}
    },

    // --- HIỂN THỊ CHUNG ---
    showMsg: (t, type = 'info') => {
        const b = document.getElementById('msg-box');
        if (b) {
            b.innerHTML = type === 'error' ? `<i class="fas fa-exclamation-circle"></i> ${t}` : `<i class="fas fa-check-circle"></i> ${t}`;
            b.style.display = 'block';
            b.style.background = type === 'error' ? '#ef4444' : '#16a34a';
            setTimeout(() => b.style.display = 'none', 3000);
        }
    },

    toggleModal: (id, show) => {
        const el = document.getElementById(id);
        if (el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabName) { btn.classList.add('text-blue-600'); btn.classList.remove('text-slate-400'); }
            else { btn.classList.remove('text-blue-600'); btn.classList.add('text-slate-400'); }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        // Nếu không có data, giữ nguyên thông báo đang tải
        if (!employees || employees.length === 0) return; 
        
        sel.innerHTML = '<option value="">-- Chọn tên đăng nhập --</option>' + 
            employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        
        // Mở khóa nút đăng nhập
        document.getElementById('login-btn').disabled = false;
        document.getElementById('login-btn').classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('login-pin').disabled = false;
        document.getElementById('login-user').disabled = false;
    },

    // --- RENDER CÁC TAB ---
    renderHome: (houses, harvestLogs) => {
        const container = document.getElementById('view-home');
        const houseOrder = ['A', 'A+', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'E5', 'F'];
        const sortedHouses = [...houses].sort((a, b) => {
            let iA = houseOrder.indexOf(a.name), iB = houseOrder.indexOf(b.name);
            if (iA === -1) iA = 999; if (iB === -1) iB = 999; return iA - iB;
        });
        const getYield = (n) => harvestLogs.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);

        container.innerHTML = `
        <div class="p-4 grid grid-cols-2 gap-3">
            <div class="col-span-2"><h2 class="text-xl font-black text-slate-800 uppercase border-l-4 border-blue-600 pl-3">Tổng quan trại</h2></div>
            ${sortedHouses.map(h => `
            <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-black text-blue-700 text-lg">${h.name}</h3>
                    <span class="text-[10px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                </div>
                <div class="text-[10px] text-slate-500 font-bold uppercase mb-2">Lô: ${h.currentBatch||'---'}</div>
                <div class="bg-slate-50 rounded-lg p-2 text-center">
                    <div class="text-[9px] text-slate-400 uppercase">Sản lượng</div>
                    <div class="text-lg font-black text-slate-800">${getYield(h.name).toFixed(1)} <span class="text-xs font-normal">kg</span></div>
                </div>
            </div>`).join('')}
        </div>`;
    },

    renderSX: (houses) => {
        const container = document.getElementById('view-sx');
        const sortedHouses = [...houses].sort((a,b) => a.name.localeCompare(b.name)); // Sort đơn giản cho dropdown
        container.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="bg-white p-5 rounded-3xl shadow-lg border border-blue-100">
                <h3 class="font-black text-blue-700 uppercase mb-4 flex items-center gap-2"><i class="fas fa-industry"></i> Nhập Phôi (Vào Lô)</h3>
                <div class="space-y-3">
                    <div><label class="label-text">Chọn Nhà / Kho A</label><select id="sx-house" class="input-box font-bold">${sortedHouses.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label-text">Mã Giống</label><input id="sx-strain" class="input-box uppercase" placeholder="VD: 049"></div>
                        <div><label class="label-text">Ngày Cấy</label><input id="sx-date" type="date" class="input-box"></div>
                    </div>
                    <div><label class="label-text">Số Lượng Phôi</label><input id="sx-qty" type="number" class="input-box font-black text-blue-600" placeholder="0"></div>
                    <button class="btn-primary w-full bg-blue-600 shadow-blue-200 shadow-xl mt-2 btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ MỚI</button>
                </div>
            </div>
        </div>`;
    },

    renderTH: (houses, logs) => {
        const container = document.getElementById('view-th');
        const sortedHouses = [...houses].sort((a,b) => a.name.localeCompare(b.name));
        const groupStd = [ {c:'b2',l:'B2'}, {c:'a1',l:'A1'}, {c:'a2',l:'A2'}, {c:'b1',l:'B1'}, {c:'ht',l:'Hầu Thủ'} ];
        const groupLimit = [ {c:'a1f',l:'A1F'}, {c:'a2f',l:'A2F'}, {c:'b2f',l:'B2F'}, {c:'d1',l:'D1'}, {c:'cn',l:'Chân'}, {c:'hc',l:'Hủy chân'}, {c:'hh',l:'Hủy hỏng'} ];

        container.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="bg-slate-200 p-1 rounded-xl flex font-bold text-sm">
                <button class="flex-1 py-2 bg-white rounded-lg shadow text-green-700">Thu Hoạch</button>
                <button class="flex-1 py-2 text-slate-500 btn-action" data-action="toggleShip">Xuất Kho</button>
            </div>

            <div class="bg-white p-4 rounded-3xl shadow-lg border border-green-100">
                <h3 class="font-black text-green-700 uppercase mb-3"><i class="fas fa-leaf"></i> Phiếu Nhập Nấm</h3>
                <select id="th-area" class="input-box mb-3 font-bold text-lg text-green-800 bg-green-50 border-green-200">
                    <option value="">-- Chọn Nhà --</option>
                    ${sortedHouses.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
                </select>
                
                <div class="space-y-3">
                    <div class="p-3 bg-slate-50 rounded-xl border">
                        <div class="text-xs font-bold text-slate-400 uppercase mb-2">1. Hàng Chuẩn</div>
                        <div class="grid grid-cols-2 gap-2">${groupStd.map(m => `<div class="flex items-center"><span class="w-8 text-[10px] font-bold">${m.l}</span><input type="number" id="th-${m.c}" class="input-harvest w-full p-2 border rounded font-bold text-center text-slate-700" placeholder="-"></div>`).join('')}</div>
                    </div>
                    <div class="p-3 bg-orange-50 rounded-xl border border-orange-100">
                        <div class="text-xs font-bold text-orange-400 uppercase mb-2">2. Hàng Loại/Phế</div>
                        <div class="grid grid-cols-2 gap-2">${groupLimit.map(m => `<div class="flex items-center"><span class="w-8 text-[10px] font-bold">${m.l}</span><input type="number" id="th-${m.c}" class="input-harvest w-full p-2 border rounded font-bold text-center text-slate-700" placeholder="-"></div>`).join('')}</div>
                    </div>
                </div>
                
                <div class="flex justify-between items-center mt-4 p-3 bg-slate-100 rounded-xl">
                    <span class="font-bold text-slate-500">TỔNG CỘNG</span>
                    <span id="th-total" class="text-2xl font-black text-green-600">0.0 kg</span>
                </div>
                <button class="btn-primary w-full bg-green-600 mt-3 shadow-xl shadow-green-200 btn-action" data-action="submitTH">LƯU KHO</button>
            </div>
        </div>`;
        
        // Auto sum logic
        setTimeout(() => {
            const inputs = document.querySelectorAll('.input-harvest');
            const totalEl = document.getElementById('th-total');
            inputs.forEach(inp => inp.addEventListener('input', () => {
                let sum = 0;
                inputs.forEach(i => sum += Number(i.value) || 0);
                totalEl.innerText = sum.toFixed(1) + ' kg';
            }));
        }, 500);
    },

    renderStock: (inv, supplies) => {
        const container = document.getElementById('view-stock');
        container.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="bg-white p-4 rounded-2xl shadow border border-purple-100">
                <div class="flex justify-between items-center mb-2"><h3 class="font-black text-purple-700 uppercase">Kho A (Phôi)</h3><i class="fas fa-warehouse text-purple-200 text-3xl"></i></div>
                <div class="text-xs text-slate-500">Quản lý nhập/xuất tại Tab SX</div>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow border border-orange-100">
                <div class="flex justify-between items-center mb-2"><h3 class="font-black text-orange-700 uppercase">Kho Thành Phẩm</h3><i class="fas fa-box text-orange-200 text-3xl"></i></div>
                <div class="flex gap-2">
                    <input id="stock-check-val" type="number" class="input-box flex-1" placeholder="Đếm thực tế (Kg)">
                    <button class="bg-orange-500 text-white px-4 rounded-xl font-bold btn-action" data-action="submitStockCheck">Chốt</button>
                </div>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow border border-slate-200">
                <div class="flex justify-between items-center mb-4"><h3 class="font-black text-slate-700 uppercase">Kho Vật Tư</h3><button class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold btn-action" data-action="toggleDistribute">Cấp Phát</button></div>
                <div class="space-y-2 max-h-60 overflow-y-auto">${supplies.length===0?'<p class="text-xs text-center text-slate-300">Trống</p>':supplies.map(s=>`<div class="flex justify-between border-b pb-2"><span class="font-bold text-sm">${s.name}</span><span class="text-xs bg-slate-100 px-2 rounded">${s.stock} ${s.unit}</span></div>`).join('')}</div>
            </div>
        </div>`;
    },

    // --- 6. TAB VIỆC (QUAN TRỌNG: Giao diện đúng như file Zip) ---
    renderTasksAndShip: (tasks, currentUser, houses, employees) => {
        const container = document.getElementById('view-tasks');
        const canAssign = ['Quản lý', 'Tổ trưởng', 'Admin', 'Giám đốc'].includes(currentUser.role);
        const myTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'done');
        
        // Dropdown Nhân viên & Nhà (cho form giao việc)
        const empOpts = (employees||[]).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        const houseOpts = houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('');

        container.innerHTML = `
        <div class="p-4 space-y-6">
            ${canAssign ? `
            <div class="bg-white p-5 rounded-3xl shadow-lg border-2 border-blue-50">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-black text-blue-700 uppercase"><i class="fas fa-plus-circle"></i> Giao Việc Mới</h3>
                    <button class="bg-red-50 text-red-500 px-3 py-1 rounded-full text-[10px] font-bold btn-action" data-action="remindAll">THÚC GIỤC</button>
                </div>
                <div class="space-y-3">
                    <input id="task-title" class="input-box font-bold" placeholder="Tên công việc (VD: Tưới nước)">
                    <div class="grid grid-cols-2 gap-2">
                        <select id="task-house" class="input-box text-sm"><option value="">-- Chọn Nhà --</option>${houseOpts}</select>
                        <select id="task-assignee" class="input-box text-sm font-bold"><option value="">-- Giao cho --</option>${empOpts}</select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input id="task-deadline" type="date" class="input-box text-sm">
                        <button class="btn-primary bg-blue-600 shadow-lg btn-action" data-action="addTask">BAN HÀNH</button>
                    </div>
                </div>
            </div>` : ''}

            <div>
                <h3 class="font-bold text-slate-700 uppercase mb-3 pl-2 border-l-4 border-orange-500">Danh sách việc</h3>
                <div class="space-y-3">
                    ${myTasks.length === 0 ? '<p class="text-center text-xs text-slate-400 py-4">Bạn rảnh rỗi!</p>' : ''}
                    ${myTasks.map(t => {
                        // Nút bấm thay đổi theo trạng thái 3 bước
                        let btnHtml = '';
                        if (t.status === 'pending') {
                            btnHtml = `<button class="w-full mt-3 bg-yellow-100 text-yellow-700 py-3 rounded-xl font-bold text-xs uppercase btn-action" data-action="receiveTask" data-payload="${t._id}"><i class="fas fa-hand-paper mr-1"></i> Nhận việc</button>`;
                        } else if (t.status === 'received') {
                            btnHtml = `<button class="w-full mt-3 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase btn-action shadow-lg shadow-blue-200" data-action="submitTask" data-payload="${t._id}"><i class="fas fa-check mr-1"></i> Báo cáo xong</button>`;
                        }

                        return `
                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
                            <div class="absolute top-4 right-4 text-[10px] font-bold ${t.status==='received'?'text-blue-500 bg-blue-50':'text-red-500 bg-red-50'} px-2 py-1 rounded-lg uppercase">
                                ${t.status === 'received' ? 'Đang làm' : 'Mới tinh'}
                            </div>
                            <h4 class="font-bold text-slate-800 text-lg mb-1">${t.title}</h4>
                            <div class="text-xs text-slate-500 font-semibold mb-2">
                                <i class="fas fa-map-marker-alt text-slate-300 mr-1"></i> ${t.house || 'Chung'} 
                                <span class="mx-2">•</span> 
                                <i class="fas fa-user text-slate-300 mr-1"></i> ${t.assignee}
                            </div>
                            ${t.desc ? `<p class="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mb-2">${t.desc}</p>` : ''}
                            ${btnHtml}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    },

    // --- 7. TAB TEAM & CHAT ---
    renderTeam: (user, reqs) => {
        const container = document.getElementById('view-team');
        const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
        const pend = reqs ? reqs.filter(r => r.status === 'pending') : [];

        container.innerHTML = `
        <div class="p-4 space-y-6">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl flex items-center gap-4">
                <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">${user.name.charAt(0)}</div>
                <div><h2 class="text-xl font-black uppercase">${user.name}</h2><p class="text-xs font-medium opacity-80">${user.role} • Điểm danh: Chưa</p></div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action" data-action="submitAttendance">
                    <div class="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><i class="fas fa-clock"></i></div>
                    <span class="text-xs font-bold text-slate-600">Chấm Công</span>
                </button>
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action" data-action="openLeaveModal">
                    <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><i class="fas fa-file-contract"></i></div>
                    <span class="text-xs font-bold text-slate-600">Xin Nghỉ</span>
                </button>
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action" data-action="openBuyModal">
                    <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><i class="fas fa-shopping-cart"></i></div>
                    <span class="text-xs font-bold text-slate-600">Mua Hàng</span>
                </button>
                <button class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 btn-action" data-action="logout">
                    <div class="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center"><i class="fas fa-sign-out-alt"></i></div>
                    <span class="text-xs font-bold text-slate-600">Đăng Xuất</span>
                </button>
            </div>

            ${isManager ? `
            <div>
                <h3 class="font-bold text-slate-700 uppercase mb-3 pl-2 border-l-4 border-yellow-400">Phê Duyệt (${pend.length})</h3>
                <div class="space-y-2">
                    ${pend.length === 0 ? '<p class="text-xs text-slate-400">Không có yêu cầu.</p>' : pend.map(r => `
                    <div class="bg-white p-3 rounded-xl shadow-sm border flex justify-between items-center">
                        <div>
                            <p class="text-xs font-bold text-slate-800">${r.user}</p>
                            <p class="text-[10px] text-slate-500">${r.type === 'LEAVE' ? 'Nghỉ phép' : 'Mua vật tư'}</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold btn-action" data-action="approveReq" data-payload="${r._id}">Duyệt</button>
                            <button class="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold btn-action" data-action="rejectReq" data-payload="${r._id}">Hủy</button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : ''}
        </div>`;
    },

    renderChat: (messages, currentUserId) => {
        const box = document.getElementById('chat-msgs');
        if (!box) return; // Bảo vệ
        box.innerHTML = messages.map(m => {
            const isMe = String(m.senderId) === String(currentUserId);
            if(m.type === 'system') return `<div class="flex justify-center my-2"><span class="bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">${m.text}</span></div>`;
            return `
            <div class="flex flex-col ${isMe?'items-end':'items-start'}">
                <span class="text-[9px] text-slate-400 px-2 mb-0.5">${m.senderName}</span>
                <div class="${isMe?'bg-blue-600 text-white rounded-br-none':'bg-white text-slate-800 rounded-bl-none'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[80%]">
                    ${m.text}
                </div>
            </div>`;
        }).join('');
        setTimeout(() => box.scrollTop = box.scrollHeight, 100);
    },

    // --- CÀI ĐẶT ---
    renderSettingsModal: (employees) => {
        let modal = document.getElementById('modal-settings');
        if(!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-settings';
            modal.className = 'hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
            modal.innerHTML = `
            <div class="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl h-[80vh] flex flex-col">
                <div class="flex justify-between items-center border-b pb-3 mb-3">
                    <h3 class="font-black text-lg text-slate-700 uppercase">Quản Trị</h3>
                    <button class="text-2xl text-slate-400 modal-close-btn" data-payload="modal-settings">&times;</button>
                </div>
                <div class="flex-1 overflow-y-auto space-y-6">
                    <div id="setting-emp-list"></div>
                    <div>
                        <h4 class="font-bold text-green-700 uppercase text-xs mb-2">Báo Cáo</h4>
                        <button class="w-full py-3 bg-green-50 text-green-700 font-bold rounded-xl border border-green-100 mb-2 btn-action" data-action="exportReport">📥 Xuất Excel Báo Cáo</button>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(modal);
        }
        
        // Render list NV vào trong modal
        const listDiv = modal.querySelector('#setting-emp-list');
        listDiv.innerHTML = `
            <h4 class="font-bold text-blue-700 uppercase text-xs mb-2">Nhân sự (${employees.length})</h4>
            <div class="bg-slate-50 rounded-xl border p-2 max-h-60 overflow-y-auto space-y-1">
                ${employees.map(e => `<div class="flex justify-between items-center bg-white p-2 rounded border border-slate-100"><span class="text-xs font-bold">${e.name}</span><button class="text-red-500 text-xs font-bold btn-action" data-action="delEmp" data-payload="${e._id}">XÓA</button></div>`).join('')}
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2">
                <input id="new-name" class="input-box text-xs" placeholder="Tên">
                <input id="new-pin" class="input-box text-xs" placeholder="PIN">
                <button class="bg-blue-600 text-white rounded font-bold text-xs btn-action" data-action="addEmp">THÊM</button>
            </div>`;
    }
};
