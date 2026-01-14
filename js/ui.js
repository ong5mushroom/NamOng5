// MODULE GIAO DIỆN (VIEW) - V165 KHO TỔNG & LOG BÁN HÀNG
export const UI = {
    showMsg: (t) => {
        const b = document.getElementById('msg-box'); 
        if(b) { b.innerText = t; b.style.display = 'block'; setTimeout(() => b.style.display = 'none', 3000); }
    },
    
    toggleModal: (id, show) => {
        const el = document.getElementById(id);
        if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        if(sel) {
            sel.innerHTML = '<option value="">-- Chọn danh tính --</option>' + 
                employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
            sel.disabled = false;
            document.getElementById('login-pin').disabled = false;
            document.getElementById('login-btn').disabled = false;
            document.getElementById('login-btn').classList.remove('opacity-50', 'cursor-not-allowed');
            document.getElementById('login-status').style.display = 'none';
        }
    },

    // --- 1. HOME ---
    renderHome: (houses, harvest, production, employees) => {
        const container = document.getElementById('view-home');
        if(!container) return;
        
        const today = new Date().toISOString().split('T')[0];
        const online = employees.filter(e => e.lastLogin === today).length;
        const todayYield = harvest.filter(h => new Date(h.time).toDateString() === new Date().toDateString())
                                  .reduce((a,b) => a + (Number(b.total)||0), 0);
        // Tính tổng tồn kho (Tổng nhập - Tổng xuất/hủy)
        const getStock = (houseName) => {
            const logs = production.filter(p => p.house === houseName);
            const nhap = logs.filter(p => p.action === 'NHẬP').reduce((a,b)=>a+Number(b.qty),0);
            const xuat = logs.filter(p => p.action === 'XUẤT' || p.action === 'HỦY').reduce((a,b)=>a+Number(b.qty),0);
            return nhap - xuat;
        };

        const leaders = [...employees].sort((a,b) => (Number(b.score)||0) - (Number(a.score)||0)).slice(0, 5)
            .map((e,i) => `<div class="flex justify-between p-2 bg-slate-50 rounded border mb-1"><span class="font-bold text-xs"><span class="mr-2 text-blue-600">#${i+1}</span>${e.name}</span><span class="font-black text-blue-600 text-xs">${e.score||0}đ</span></div>`).join('');

        const houseList = houses.map(h => {
            const stock = getStock(h.name);
            const totalHarv = harvest.filter(hv => hv.area === h.name).reduce((sum, item) => sum + (Number(item.total)||0), 0);
            // Nhà A có màu đặc biệt để nhận diện Kho Tổng
            const isKhoA = h.name.includes('A') || h.name === 'Nhà A';
            
            return `
            <div class="card border-l-4 ${isKhoA ? 'border-l-purple-600' : 'border-l-amber-800'} shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-black text-sm uppercase text-slate-800">${h.name} ${isKhoA?'(KHO TỔNG)':''}</span>
                    <button class="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded shadow-inner uppercase font-black border btn-action" data-action="exportCSVByHouse" data-payload="${h.name}">Nhật Ký</button>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 rounded border">
                    <div class="font-bold text-slate-500">PHÔI TỒN: <span class="${stock<0?'text-red-500':'text-blue-600'} text-xs">${stock} túi</span></div>
                    <div class="font-bold text-slate-500 text-right">TỔNG THU: <span class="text-green-600 text-sm font-black">${totalHarv.toFixed(1)} Kg</span></div>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="card border-l-4 border-blue-500 text-center py-2"><p class="label">Trực tuyến</p><p class="text-2xl font-black text-blue-600">${online}</p></div>
                <div class="card border-l-4 border-green-500 text-center py-2"><p class="label">Hái hôm nay</p><p class="text-2xl font-black text-green-600">${todayYield.toFixed(2)}</p></div>
            </div>
            <div class="card border border-yellow-100 shadow-sm mb-4">
                <div class="flex justify-between items-center mb-2"><h3 class="text-xs font-black text-yellow-600 uppercase">🏆 Bảng Vàng</h3></div>
                <div>${leaders || '<p class="text-center text-[10px] italic">Đang tải...</p>'}</div>
            </div>
            <p class="label px-2">Kho & Nhà trồng</p>
            <div class="space-y-2">${houseList}</div>
        `;
    },

    // --- 2. SẢN XUẤT (SX) - LOGIC KHO TỔNG ---
    renderSX: (houses, prodLogs) => {
        const container = document.getElementById('view-sx');
        if(!container) return;

        // Nhật ký sản xuất
        const logHtml = prodLogs.sort((a,b)=>b.time-a.time).slice(0,10).map(l => `
            <div class="text-[10px] p-2 bg-white mb-1 border rounded-xl flex justify-between shadow-sm border-l-4 ${l.action==='NHẬP'?'border-l-blue-500':(l.action==='HỦY'?'border-l-red-500':'border-l-amber-700')}">
                <div><span class="font-black ${l.action==='NHẬP'?'text-blue-600':'text-slate-600'}">${l.action} ${l.qty} TÚI - ${l.house}</span><br><span class="text-[9px] text-slate-400">${l.type} | ${l.batch}</span></div>
                <span class="text-[9px] text-slate-400 italic">${new Date(l.date).toLocaleDateString().slice(0,5)}</span>
            </div>`).join('');

        // Tự động chọn Nhà A nếu chưa chọn
        const defaultHouse = houses.find(h => h.name === 'Nhà A')?.name || houses[0]?.name;

        container.innerHTML = `
            <div class="card border-2 border-indigo-50 shadow-md">
                <div class="space-y-3">
                    <div>
                        <p class="label">Chọn Nhà (Kho)</p>
                        <select id="sx-house-id" class="input-box bg-white font-bold text-indigo-700" onchange="document.dispatchEvent(new CustomEvent('house-change'))">
                            ${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-2">
                        <div><p class="label">Loại Phôi</p><input id="sx-type" list="phoi-list" class="input-box bg-white" placeholder="VD: 049..."><datalist id="phoi-list"><option value="049 Đạt"><option value="049 TD"></datalist></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><p class="label">Số lượng</p><input type="number" id="sx-qty" class="input-box bg-white text-center" placeholder="0"></div>
                            <div><p class="label">Lô/Ghi chú</p><input id="sx-batch" class="input-box bg-white text-center" placeholder="..."></div>
                        </div>
                        <div><p class="label">Ngày thực hiện</p><input type="date" id="sx-date" class="input-box bg-white text-center" value="${new Date().toISOString().split('T')[0]}"></div>
                    </div>

                    <div id="sx-actions-zone" class="flex gap-2">
                        </div>
                </div>
            </div>
            <p class="label px-2 mt-4">Lịch sử Kho</p>
            <div class="space-y-1 pb-20">${logHtml}</div>
        `;

        // Logic thay đổi nút bấm ngay lập tức
        const updateButtons = () => {
            const h = document.getElementById('sx-house-id').value;
            const zone = document.getElementById('sx-actions-zone');
            if(!zone) return;

            if(h === 'Nhà A' || h.includes('A')) {
                // KHO TỔNG: Chỉ có Nhập mới và Xuất chuyển
                zone.innerHTML = `
                    <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase btn-action shadow-lg" data-action="submitSX" data-payload="NHAP_MOI">
                        <i class="fas fa-truck-moving mr-2"></i>Nhập Mới (Mua về)
                    </button>
                `;
            } else {
                // KHO LẺ: Nhận từ A và Hủy
                zone.innerHTML = `
                    <button class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs uppercase btn-action shadow" data-action="submitSX" data-payload="LAY_TU_A">
                        <i class="fas fa-download mr-1"></i>Lấy từ Nhà A
                    </button>
                    <button class="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-xs uppercase btn-action shadow" data-action="submitSX" data-payload="HUY">
                        <i class="fas fa-trash mr-1"></i>Hủy / Dọn
                    </button>
                `;
            }
        };

        // Kích hoạt lần đầu và lắng nghe sự kiện đổi nhà
        document.addEventListener('house-change', updateButtons);
        // Chờ 1 chút để DOM render xong rồi chạy
        setTimeout(updateButtons, 100);
    },

    // --- 3. THU HOẠCH & XUẤT HÀNG (THDG) - Tách log ---
    renderTH: (houses, harvestLogs, shipLogs) => {
        const container = document.getElementById('view-th');
        if(!container) return;

        // Log Hái (Màu xanh)
        const haiLogs = harvestLogs.sort((a,b)=>b.time-a.time).slice(0,10).map(l => `
            <div class="card !p-2 flex justify-between items-center border-l-4 border-l-green-500 mb-1">
                <div><span class="font-bold text-xs text-green-700">HÁI: ${l.area}</span><br><span class="text-[9px] text-slate-400 italic">${new Date(l.time).toLocaleDateString()} - ${l.user.split(' ').pop()}</span></div>
                <span class="text-lg font-black text-green-600">+${Number(l.total).toFixed(1)}kg</span>
            </div>`).join('');

        // Log Xuất Bán (Màu Cam) - RIÊNG BIỆT
        const banLogs = shipLogs.sort((a,b)=>b.time-a.time).slice(0,10).map(l => `
            <div class="card !p-2 flex justify-between items-center border-l-4 border-l-orange-500 mb-1">
                <div><span class="font-bold text-xs text-orange-700">KHÁCH: ${l.customer}</span><br><span class="text-[9px] text-slate-400 italic">${l.type} | ${new Date(l.time).toLocaleDateString()}</span></div>
                <div class="text-right"><span class="block text-lg font-black text-orange-600">-${Number(l.qty).toFixed(1)}kg</span><span class="text-[9px] font-bold text-slate-400">${Number(l.price).toLocaleString()}đ</span></div>
            </div>`).join('');

        container.innerHTML = `
             <div class="flex gap-2 mb-3">
                 <button id="tab-hai" class="flex-1 py-2 rounded-xl font-black text-xs bg-green-600 text-white shadow transition-all" onclick="
                    document.getElementById('form-hai').classList.remove('hidden');
                    document.getElementById('form-xuat').classList.add('hidden');
                    document.getElementById('log-hai-zone').classList.remove('hidden');
                    document.getElementById('log-xuat-zone').classList.add('hidden');
                    this.classList.add('ring-2','ring-green-300'); document.getElementById('tab-xuat').classList.remove('ring-2','ring-orange-300');
                 ">NHẬP HÁI</button>
                 
                 <button id="tab-xuat" class="flex-1 py-2 rounded-xl font-black text-xs bg-orange-500 text-white shadow transition-all" onclick="
                    document.getElementById('form-hai').classList.add('hidden');
                    document.getElementById('form-xuat').classList.remove('hidden');
                    document.getElementById('log-hai-zone').classList.add('hidden');
                    document.getElementById('log-xuat-zone').classList.remove('hidden');
                    this.classList.add('ring-2','ring-orange-300'); document.getElementById('tab-hai').classList.remove('ring-2','ring-green-300');
                 ">XUẤT BÁN</button>
             </div>

             <div id="form-hai" class="card border-2 border-green-50 shadow-md">
                 <div class="space-y-3">
                     <div><p class="label text-green-600">CHỌN NHÀ HÁI</p><select id="th-area" class="input-box bg-white text-green-700 font-black">${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select></div>
                     <div class="bg-slate-50 p-2 rounded-xl border">
                         <div class="grid grid-cols-5 gap-2 mb-2">
                            ${['b2','a1','a2','b1','chan'].map(k=>`<div><label class="block text-center text-[9px] uppercase text-slate-400 mb-1">${k}</label><input type="number" id="th-${k}" class="input-box !p-1 text-center text-xs" placeholder="0"></div>`).join('')}
                        </div>
                         <div class="grid grid-cols-5 gap-2">
                            ${['d1','a1f','a2f','b2f','ht'].map(k=>`<div><label class="block text-center text-[9px] uppercase text-slate-400 mb-1">${k}</label><input type="number" id="th-${k}" class="input-box !p-1 text-center text-xs" placeholder="0"></div>`).join('')}
                        </div>
                     </div>
                     <button class="btn-primary bg-green-600 shadow-lg uppercase btn-action" data-action="submitTH">Lưu Phiếu Hái</button>
                 </div>
             </div>

             <div id="form-xuat" class="card border-2 border-orange-50 shadow-md hidden">
                 <div class="space-y-3">
                    <div><p class="label text-orange-600">KHÁCH HÀNG / NƠI NHẬN</p><input id="ship-cust" class="input-box font-bold" placeholder="VD: Chị Lan, Chợ đầu mối..."></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><p class="label">Số lượng (Kg)</p><input type="number" id="ship-qty" class="input-box text-center font-black text-orange-600" placeholder="0.0"></div>
                        <div><p class="label">Giá bán (đ/kg)</p><input type="number" id="ship-price" class="input-box text-center" placeholder="0"></div>
                    </div>
                    <div><p class="label">Loại hàng</p><select id="ship-type" class="input-box"><option value="Nấm Tươi">Nấm Tươi</option><option value="Nấm Khô">Nấm Khô</option><option value="Chân Nấm">Chân Nấm</option></select></div>
                    <button class="btn-primary bg-orange-600 shadow-lg uppercase btn-action" data-action="submitShip">Lưu Xuất Kho</button>
                 </div>
             </div>

             <div id="log-hai-zone">
                <p class="label px-2 mt-4 text-green-600">Nhật ký Hái gần đây</p>
                <div class="pb-20 space-y-1">${haiLogs}</div>
             </div>
             
             <div id="log-xuat-zone" class="hidden">
                <p class="label px-2 mt-4 text-orange-600">Nhật ký Bán hàng gần đây</p>
                <div class="pb-20 space-y-1">${banLogs.length ? banLogs : '<p class="text-center text-xs text-slate-400 italic mt-4">Chưa có đơn hàng nào</p>'}</div>
             </div>
        `;
    },

    // --- CÁC PHẦN KHÁC GIỮ NGUYÊN (ADMIN, CHAT...) ---
    renderApproveList: (requests) => {
        const container = document.getElementById('approval-list'); if(!container) return;
        const pending = requests.filter(r => r.status === 'pending');
        if(pending.length === 0) { container.innerHTML = '<p class="text-center text-xs text-slate-400 italic">Không có đơn nào cần duyệt</p>'; return; }
        container.innerHTML = pending.map(r => `<div class="p-3 bg-slate-50 border rounded-lg mb-2"><div class="flex justify-between items-start mb-2"><span class="font-bold text-xs uppercase text-blue-600">${r.requester}</span><span class="text-[9px] bg-white border px-1 rounded">${new Date(r.time).toLocaleDateString()}</span></div><p class="text-xs font-bold text-slate-700 mb-2">${r.type === 'LEAVE' ? 'Xin nghỉ:' : 'Mua:'} ${r.content}</p><div class="flex gap-2"><button class="flex-1 py-1 bg-green-500 text-white rounded text-[10px] font-bold btn-action" data-action="decideRequest" data-payload="${r._id}|approved">ĐỒNG Ý</button><button class="flex-1 py-1 bg-red-500 text-white rounded text-[10px] font-bold btn-action" data-action="decideRequest" data-payload="${r._id}|rejected">TỪ CHỐI</button></div></div>`).join('');
    },
    renderChat: (messages, currentUserId) => {
        const layer = document.getElementById('chat-layer'); if(!layer) return;
        if(!document.getElementById('chat-box-inner')) { layer.innerHTML = `<div class="h-[70px] bg-white border-b flex items-end px-4 pb-3 shadow-sm"><button class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mr-3 active:bg-slate-200 shadow-sm btn-action" data-action="closeChat"><i class="fas fa-arrow-left text-slate-600"></i></button><h2 class="font-black text-slate-800 text-lg uppercase italic">Thảo luận</h2></div><div id="chat-box-inner" class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] chat-bg"></div><div class="p-3 bg-white border-t flex gap-2 pb-8"><input id="chat-input-field" class="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none border font-medium" placeholder="Nhập tin nhắn..."><button class="w-10 h-10 bg-blue-600 rounded-full text-white shadow-lg btn-action" data-action="sendChat"><i class="fas fa-paper-plane"></i></button></div>`; }
        const box = document.getElementById('chat-box-inner');
        box.innerHTML = messages.map(m => { const isMe = String(m.senderId) === String(currentUserId); return `<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}"><div class="text-[9px] text-slate-400 mb-1 px-1 uppercase font-bold">${isMe ? 'Tôi' : m.senderName}</div><div class="chat-bubble ${isMe ? 'chat-me' : 'chat-other'}">${m.text}</div></div>`; }).join('');
        box.scrollTop = box.scrollHeight;
    },
    renderTasks: (tasks, employees, houses, user) => {
        const container = document.getElementById('view-tasks'); if(!container) return;
        const isAdmin = ['Giám đốc', 'Quản lý'].includes(user.role);
        let myTasks = tasks.filter(t => (isAdmin || String(t.assignee) === String(user.id)) && t.status !== 'completed');
        const taskGroup = {}; myTasks.forEach(t => { const n = employees.find(e => String(e.id)===String(t.assignee))?.name || 'Unknown'; if(!taskGroup[n]) taskGroup[n]=[]; taskGroup[n].push(t); });
        const listHtml = Object.keys(taskGroup).map(n => `<div class="card !p-0 overflow-hidden border-2 border-slate-100 mb-2"><div class="bg-slate-100 p-2 border-b font-bold text-xs uppercase text-slate-700">${n}</div><div class="p-2 space-y-2">${taskGroup[n].map(t=>`<div class="flex justify-between items-center border-b border-dashed pb-2 last:border-0"><div class="flex-1"><p class="text-[11px] font-bold">${t.title}</p><p class="text-[9px] text-indigo-500 italic">Nhà: ${t.houseId}</p></div><div class="flex gap-1">${isAdmin?`<button class="w-6 h-6 bg-red-50 text-red-500 rounded btn-action" data-action="delTask" data-payload="${t._id}"><i class="fas fa-trash text-[10px]"></i></button>`:''}${(String(t.assignee)===String(user.id))?`<button class="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold btn-action" data-action="completeTask" data-payload="${t._id}">XONG</button>`:''}</div></div>`).join('')}</div></div>`).join('');
        container.innerHTML = (isAdmin ? `<div class="card border-2 border-blue-50 shadow-md mb-4"><div class="flex justify-between items-center mb-3"><span class="text-xs font-black text-blue-600 uppercase">Giao việc mới</span></div><div class="space-y-3"><input id="task-title" placeholder="Nội dung..." class="input-box bg-white text-sm font-bold italic"><div><p class="label">Nhà nấm</p><div class="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded border max-h-32 overflow-y-auto">${houses.map(h=>`<label class="flex items-center gap-1 text-[9px] font-bold"><input type="checkbox" name="h-chk" value="${h.name}"> ${h.name}</label>`).join('')}</div></div><div><p class="label">Nhân sự</p><div class="max-h-32 overflow-y-auto border p-2 rounded bg-slate-50 grid grid-cols-2 gap-1">${employees.map(e=>`<label class="flex items-center gap-1 text-[9px] font-bold"><input type="checkbox" name="u-chk" value="${e.id}"> ${e.name}</label>`).join('')}</div></div><button class="btn-primary bg-slate-800 mt-2 shadow-lg uppercase btn-action" data-action="createTask">Ban lệnh ngay</button></div></div>` : '') + listHtml;
    },
    renderTeam: (employees, user) => {
        const container = document.getElementById('view-team'); if(!container) return;
        const isAdmin = ['Giám đốc', 'Quản lý'].includes(user.role);
        const html = employees.map(e => `<div class="card flex justify-between items-center !p-3 border-l-4 ${e.lastLogin===new Date().toISOString().split('T')[0]?'border-l-green-500':'border-l-slate-300'}"><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 border border-white shadow uppercase">${(e.name||'U').charAt(0)}</div><div><p class="text-xs font-black uppercase text-slate-700">${e.name} ${isAdmin?`<span class="text-[9px] text-red-500">(${e.score||0}đ)</span>`:''}</p><p class="text-[8px] text-slate-400 font-bold uppercase">${e.team||'--'}</p></div></div>${isAdmin?`<div class="flex gap-1"><button class="w-6 h-6 bg-green-100 text-green-600 rounded flex items-center justify-center font-bold text-[10px] btn-action" data-action="modScore" data-payload="${e._id}|5">+</button><button class="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold text-[10px] btn-action" data-action="modScore" data-payload="${e._id}|-5">-</button><button class="w-6 h-6 bg-slate-200 text-slate-500 rounded flex items-center justify-center btn-action" data-action="delEmp" data-payload="${e._id}"><i class="fas fa-trash text-[10px]"></i></button></div>`:''}</div>`).join('');
        container.innerHTML = `<div class="card p-4 text-center shadow-sm mb-4 border-2 border-blue-100"><p class="label mb-3 text-blue-600">Điểm danh</p><div class="grid grid-cols-2 gap-3"><button class="btn-primary bg-yellow-500 btn-action" data-action="checkIn" data-payload="Sáng">☀️ Sáng</button><button class="btn-primary bg-indigo-500 btn-action" data-action="checkIn" data-payload="Chiều">🌙 Chiều</button></div></div><div class="card bg-slate-50 border-slate-200 shadow-sm mb-4"><p class="label mb-3">Hành chính</p><div class="grid grid-cols-2 gap-3"><button class="btn-primary bg-white text-slate-600 border btn-action" data-action="openModal" data-payload="leave">Xin nghỉ</button><button class="btn-primary bg-white text-slate-600 border btn-action" data-action="openModal" data-payload="buy">Mua hàng</button></div><div class="mt-4 pt-4 border-t"><button class="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-black text-[11px] uppercase shadow-inner btn-action" data-action="exportAttendance">Xuất Chấm Công</button></div></div><p class="label px-2">Danh sách nhân sự</p><div class="space-y-2 pb-24">${html}</div>`;
    },
    initModals: () => {
        const container = document.getElementById('modal-container'); if(!container) return;
        container.innerHTML = `<div id="settings-modal" class="modal-wrap hidden"><div class="modal-box shadow-2xl border-2 border-slate-50 font-black"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="settings-modal"><i class="fas fa-times"></i></div><h3 class="font-black text-xl mb-6 text-center text-blue-600 uppercase">Quản Trị</h3><div class="space-y-4"><div id="admin-tools" class="hidden space-y-3"><button id="btn-approve" class="btn-primary bg-orange-600 btn-action" data-action="openModal" data-payload="approve">🔔 Duyệt Đơn Phép/Mua</button><div class="grid grid-cols-2 gap-2"><button class="btn-primary bg-blue-50 text-blue-700 border btn-action" data-action="exportReport" data-payload="ALL">Báo cáo Tổng</button><button class="btn-primary bg-blue-50 text-blue-700 border btn-action" data-action="exportReport" data-payload="TEAM">Báo cáo Tổ</button></div><button class="btn-primary bg-red-100 text-red-600 border btn-action" data-action="resetLeaderboard">⚠️ Reset Điểm Thi Đua</button><div class="border-t pt-4"><button class="btn-primary bg-slate-700 btn-action" data-action="openModal" data-payload="addStaff">Thêm Nhân Sự</button></div></div><button class="btn-primary bg-red-500 mt-6 btn-action" data-action="logout">Đăng Xuất</button></div></div></div><div id="modal-approve" class="modal-wrap hidden"><div class="modal-box p-4"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-approve"><i class="fas fa-times"></i></div><h3 class="font-bold text-center uppercase mb-4">Duyệt Đơn Chờ</h3><div id="approval-list" class="space-y-2"></div></div></div><div id="modal-addStaff" class="modal-wrap hidden"><div class="modal-box p-6"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-addStaff"><i class="fas fa-times"></i></div><h3 class="font-bold mb-4 text-center uppercase text-blue-600">Thêm Nhân Sự</h3><div class="space-y-4"><input id="new-emp-name" placeholder="Họ tên" class="input-box"><div class="grid grid-cols-2 gap-2"><input id="new-emp-id" placeholder="ID" class="input-box" inputmode="numeric"><input id="new-emp-pin" placeholder="PIN" class="input-box" inputmode="numeric" maxlength="6"></div><select id="new-emp-role" class="input-box"><option value="Nhân viên">Nhân viên</option><option value="Tổ trưởng">Tổ trưởng</option><option value="Quản lý">Quản lý</option></select><select id="new-emp-team" class="input-box"><option value="Tổ Thu Hoạch">Tổ Thu Hoạch</option><option value="Tổ Sản Xuất">Tổ Sản Xuất</option></select><button class="btn-primary btn-action" data-action="addEmployee">Lưu</button></div></div></div><div id="modal-leave" class="modal-wrap hidden"><div class="modal-box p-6"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-leave"><i class="fas fa-times"></i></div><h3 class="font-bold text-blue-600 text-center uppercase mb-4">Xin Nghỉ Phép</h3><input id="leave-date" type="date" class="input-box mb-2"><select id="leave-reason" class="input-box mb-2"><option>Ốm/Sức khỏe</option><option>Việc riêng</option></select><button class="btn-primary btn-action" data-action="submitHR" data-payload="LEAVE">Gửi Đơn</button></div></div><div id="modal-buy" class="modal-wrap hidden"><div class="modal-box p-6"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-buy"><i class="fas fa-times"></i></div><h3 class="font-bold text-green-600 text-center uppercase mb-4">Mua Vật Tư</h3><input id="pur-item" placeholder="Tên hàng..." class="input-box mb-2"><button class="btn-primary bg-green-600 btn-action" data-action="submitHR" data-payload="PURCHASE">Gửi Đề Xuất</button></div></div>`;
    }
};
