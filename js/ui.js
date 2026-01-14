// MODULE GIAO DIỆN (VIEW) - V163 FINAL FIX
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

    // 1. HOME (Đã bổ sung Phôi, Lô, Sản lượng)
    renderHome: (houses, harvest, production, employees) => {
        const container = document.getElementById('view-home');
        if(!container) return;
        
        const today = new Date().toISOString().split('T')[0];
        const online = employees.filter(e => e.lastLogin === today).length;
        const todayYield = harvest.filter(h => new Date(h.time).toDateString() === new Date().toDateString())
                                  .reduce((a,b) => a + (Number(b.total)||0), 0);

        // Bảng vàng
        const leaders = [...employees].sort((a,b) => (Number(b.score)||0) - (Number(a.score)||0)).slice(0, 5)
            .map((e,i) => `<div class="flex justify-between p-2 bg-slate-50 rounded border mb-1"><span class="font-bold text-xs"><span class="mr-2 text-blue-600">#${i+1}</span>${e.name}</span><span class="font-black text-blue-600 text-xs">${e.score||0}đ</span></div>`).join('');

        // Nhà nấm (Có tính toán số liệu)
        const houseList = houses.map(h => {
            // Lấy thông tin sản xuất mới nhất (Lô, Phôi)
            const prodLogs = production.filter(p => p.house === h.name && p.action === 'NHẬP').sort((a,b) => b.time - a.time);
            const curProd = prodLogs[0] || { qty: 0, batch: '--' };
            
            // Tính tổng thu hoạch của nhà này
            const totalHarv = harvest.filter(hv => hv.area === h.name).reduce((sum, item) => sum + (Number(item.total)||0), 0);

            return `
            <div class="card border-l-4 border-amber-800 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-black text-sm uppercase text-slate-800">${h.name}</span>
                    <button class="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded shadow-inner uppercase font-black border btn-action" data-action="exportCSVByHouse" data-payload="${h.name}">Nhật Ký</button>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 rounded border">
                    <div class="font-bold text-slate-500">PHÔI ĐANG NUÔI: <br><span class="text-blue-600 text-xs">${curProd.qty} túi</span></div>
                    <div class="font-bold text-slate-500">LÔ CẤY: <br><span class="text-indigo-600 text-xs">${curProd.batch}</span></div>
                    <div class="font-bold text-slate-500 col-span-2 border-t pt-1 mt-1">TỔNG THU HOẠCH: <span class="text-green-600 text-sm font-black">${totalHarv.toFixed(1)} Kg</span></div>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="card border-l-4 border-blue-500 text-center py-2"><p class="label">Trực tuyến</p><p class="text-2xl font-black text-blue-600">${online}</p></div>
                <div class="card border-l-4 border-green-500 text-center py-2"><p class="label">Hái hôm nay</p><p class="text-2xl font-black text-green-600">${todayYield.toFixed(2)}</p></div>
            </div>
            <div class="card border border-yellow-100 shadow-sm mb-4">
                <div class="flex justify-between items-center mb-2"><h3 class="text-xs font-black text-yellow-600 uppercase">🏆 Bảng Vàng</h3><button class="text-[9px] text-blue-600 bg-blue-50 px-2 py-1 rounded border btn-action" data-action="exportTH">Báo Cáo Tổng</button></div>
                <div>${leaders || '<p class="text-center text-[10px] italic">Đang tải...</p>'}</div>
            </div>
            <p class="label px-2">Hiện trạng Nhà trồng</p>
            <div class="space-y-2">${houseList}</div>
        `;
    },

    // 2. CHAT (Mới bổ sung giao diện)
    renderChat: (messages, currentUserId) => {
        const layer = document.getElementById('chat-layer');
        if(!layer) return;
        
        // Vẽ khung chat nếu chưa có
        if(!document.getElementById('chat-box-inner')) {
            layer.innerHTML = `
                <div class="h-[70px] bg-white border-b flex items-end px-4 pb-3 shadow-sm">
                     <button class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mr-3 active:bg-slate-200 shadow-sm btn-action" data-action="closeChat"><i class="fas fa-arrow-left text-slate-600"></i></button>
                     <h2 class="font-black text-slate-800 text-lg uppercase italic">Thảo luận</h2>
                </div>
                <div id="chat-box-inner" class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] chat-bg"></div>
                <div class="p-3 bg-white border-t flex gap-2 pb-8">
                    <input id="chat-input-field" class="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none border font-medium" placeholder="Nhập tin nhắn...">
                    <button class="w-10 h-10 bg-blue-600 rounded-full text-white shadow-lg btn-action" data-action="sendChat"><i class="fas fa-paper-plane"></i></button>
                </div>
            `;
        }

        // Render tin nhắn
        const box = document.getElementById('chat-box-inner');
        box.innerHTML = messages.map(m => {
            const isMe = String(m.senderId) === String(currentUserId);
            if(m.senderId === 'SYSTEM') return `<div class="text-center"><span class="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold border border-red-100">📢 ${m.text}</span></div>`;
            return `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    <div class="text-[9px] text-slate-400 mb-1 px-1 uppercase font-bold">${isMe ? 'Tôi' : m.senderName}</div>
                    <div class="chat-bubble ${isMe ? 'chat-me' : 'chat-other'}">${m.text}</div>
                </div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    },

    // 3. RENDER TASKS (Giữ nguyên)
    renderTasks: (tasks, employees, houses, user) => {
        const container = document.getElementById('view-tasks');
        if(!container) return;
        const isAdmin = ['Giám đốc', 'Quản lý'].includes(user.role);
        let myTasks = tasks.filter(t => {
            if(!isAdmin && String(t.assignee) !== String(user.id)) return false; 
            if(t.status === 'completed') return false;
            return true;
        });
        const taskGroup = {};
        myTasks.forEach(t => {
            const emp = employees.find(e => String(e.id) === String(t.assignee));
            const name = emp ? emp.name : 'Unknown';
            if(!taskGroup[name]) taskGroup[name] = [];
            taskGroup[name].push(t);
        });
        const listHtml = Object.keys(taskGroup).map(name => `
            <div class="card !p-0 overflow-hidden border-2 border-slate-100 mb-2">
                <div class="bg-slate-100 p-2 border-b font-bold text-xs uppercase text-slate-700">${name}</div>
                <div class="p-2 space-y-2">
                    ${taskGroup[name].map(t => `
                        <div class="flex justify-between items-center border-b border-dashed pb-2 last:border-0">
                            <div class="flex-1"><p class="text-[11px] font-bold">${t.title}</p><p class="text-[9px] text-indigo-500 italic">Nhà: ${t.houseId} | ${new Date(t.time).toLocaleDateString()}</p></div>
                            <div class="flex gap-1">
                                ${isAdmin ? `<button class="w-6 h-6 bg-red-50 text-red-500 rounded btn-action" data-action="delTask" data-payload="${t._id}"><i class="fas fa-trash text-[10px]"></i></button>` : ''}
                                ${(String(t.assignee)===String(user.id)) ? `<button class="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold btn-action" data-action="completeTask" data-payload="${t._id}">XONG</button>` : '<span class="text-[9px] text-slate-400">Đợi</span>'}
                            </div>
                        </div>`).join('')}
                </div>
            </div>`).join('');
        const adminForm = isAdmin ? `
            <div class="card border-2 border-blue-50 shadow-md mb-4">
                <div class="flex justify-between items-center mb-3"><span class="text-xs font-black text-blue-600 uppercase">Giao việc mới</span></div>
                <div class="space-y-3">
                    <input id="task-title" placeholder="Nội dung công việc..." class="input-box bg-white text-sm shadow-inner font-bold italic">
                    <div><p class="label">Nhà nấm (Tick nhiều)</p><div id="house-multi-select" class="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded border max-h-32 overflow-y-auto">${houses.map(h => `<label class="flex items-center gap-1 text-[9px] font-bold"><input type="checkbox" name="h-chk" value="${h.name}"> ${h.name}</label>`).join('')}</div></div>
                    <div><p class="label">Nhân sự (Tick nhiều)</p><div id="assign-ind-zone" class="max-h-32 overflow-y-auto border p-2 rounded bg-slate-50 grid grid-cols-2 gap-1">${employees.map(e => `<label class="flex items-center gap-1 text-[9px] font-bold"><input type="checkbox" name="u-chk" value="${e.id}"> ${e.name}</label>`).join('')}</div></div>
                    <button class="btn-primary bg-slate-800 mt-2 shadow-lg uppercase btn-action" data-action="createTask">Ban lệnh ngay</button>
                </div>
            </div>` : '';
        container.innerHTML = adminForm + (listHtml || '<p class="text-center text-slate-400 italic text-xs mt-4">Không có công việc nào</p>');
    },

    // 4. RENDER SX (Giữ nguyên)
    renderSX: (houses, prodLogs) => {
        const container = document.getElementById('view-sx');
        if(!container) return;
        const logHtml = prodLogs.sort((a,b)=>b.time-a.time).slice(0,10).map(l => `
            <div class="text-[10px] p-2 bg-white mb-1 border rounded-xl flex justify-between shadow-sm border-l-4 ${l.action==='NHẬP'?'border-l-blue-500':'border-l-amber-700'}">
                <div><span class="font-black ${l.action==='NHẬP'?'text-blue-600':'text-amber-800'}">${l.action} ${l.qty} TÚI - ${l.house}</span><br><span class="text-[9px] text-slate-400">${l.type} | Lô: ${l.batch}</span></div>
                <span class="text-[9px] text-slate-400 italic">${l.date}</span>
            </div>`).join('');
        container.innerHTML = `
            <div class="card border-2 border-indigo-50 shadow-md">
                <div class="space-y-3">
                    <div><p class="label">Nhà Nấm</p><select id="sx-house-id" class="input-box bg-white">${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-1 gap-2">
                        <div><p class="label">Loại Phôi</p><input id="sx-type" list="phoi-list" class="input-box bg-white" placeholder="VD: 049..."><datalist id="phoi-list"><option value="049 Đạt"><option value="049 TD"></datalist></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><p class="label">Số lượng</p><input type="number" id="sx-qty" class="input-box bg-white text-center" placeholder="0"></div>
                            <div><p class="label">Lô cấy</p><input id="sx-batch" class="input-box bg-white text-center" placeholder="..."></div>
                        </div>
                        <div><p class="label">Ngày làm</p><input type="date" id="sx-date" class="input-box bg-white text-center"></div>
                    </div>
                    <div class="flex gap-2">
                        <button class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase btn-action" data-action="submitSX" data-payload="NHẬP">Nhập kho</button>
                        <button class="flex-1 bg-amber-700 text-white py-3 rounded-xl font-bold text-xs uppercase btn-action" data-action="submitSX" data-payload="XUẤT">Xuất kho</button>
                    </div>
                </div>
            </div>
            <p class="label px-2 mt-4">Lịch sử gần đây</p>
            <div class="space-y-1 pb-20">${logHtml}</div>
        `;
    },

    // 5. RENDER TH (Giữ nguyên)
    renderTH: (houses, harvestLogs) => {
        const container = document.getElementById('view-th');
        if(!container) return;
        const logs = harvestLogs.sort((a,b)=>b.time-a.time).slice(0,10);
        const tableHtml = logs.map(l => {
            const total = Number(l.total)||0;
            return `<tr><td class="text-[9px]">${new Date(l.time).toLocaleDateString().slice(0,5)}</td><td class="font-bold text-blue-600">${l.area}</td><td class="font-black text-green-600">${total.toFixed(1)}</td><td class="text-[9px] uppercase">${l.user.split(' ').pop()}</td></tr>`;
        }).join('');
        container.innerHTML = `
             <div class="card border-2 border-green-50 shadow-md">
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
             <p class="label px-2 mt-4">Nhật ký hái mới nhất</p>
             <table class="log-table shadow-sm"><thead><tr><th>Ngày</th><th>Nhà</th><th>Kg</th><th>NV</th></tr></thead><tbody>${tableHtml}</tbody></table>
        `;
    },

    // 6. RENDER TEAM (Giữ nguyên)
    renderTeam: (employees, user) => {
        const container = document.getElementById('view-team');
        if(!container) return;
        const isAdmin = ['Giám đốc', 'Quản lý'].includes(user.role);
        const html = employees.map(e => `
            <div class="card flex justify-between items-center !p-3 border-l-4 ${e.lastLogin===new Date().toISOString().split('T')[0]?'border-l-green-500':'border-l-slate-300'}">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 border border-white shadow uppercase">${(e.name||'U').charAt(0)}</div>
                    <div><p class="text-xs font-black uppercase text-slate-700">${e.name} ${isAdmin?`<span class="text-[9px] text-red-500">(${e.score||0}đ)</span>`:''}</p><p class="text-[8px] text-slate-400 font-bold uppercase">${e.team||'--'}</p></div>
                </div>
                ${isAdmin ? `<div class="flex gap-1">
                    <button class="w-6 h-6 bg-green-100 text-green-600 rounded flex items-center justify-center font-bold text-[10px] btn-action" data-action="modScore" data-payload="${e._id}|5">+</button>
                    <button class="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold text-[10px] btn-action" data-action="modScore" data-payload="${e._id}|-5">-</button>
                    <button class="w-6 h-6 bg-slate-200 text-slate-500 rounded flex items-center justify-center btn-action" data-action="delEmp" data-payload="${e._id}"><i class="fas fa-trash text-[10px]"></i></button>
                </div>` : ''}
            </div>`).join('');
        container.innerHTML = `
            <div class="card p-4 text-center shadow-sm mb-4 border-2 border-blue-100"><p class="label mb-3 text-blue-600">Điểm danh</p><div class="grid grid-cols-2 gap-3"><button class="btn-primary bg-yellow-500 btn-action" data-action="checkIn" data-payload="Sáng">☀️ Sáng</button><button class="btn-primary bg-indigo-500 btn-action" data-action="checkIn" data-payload="Chiều">🌙 Chiều</button></div></div>
            <div class="card bg-slate-50 border-slate-200 shadow-sm mb-4"><p class="label mb-3">Hành chính</p><div class="grid grid-cols-2 gap-3"><button class="btn-primary bg-white text-slate-600 border btn-action" data-action="openModal" data-payload="leave">Xin nghỉ</button><button class="btn-primary bg-white text-slate-600 border btn-action" data-action="openModal" data-payload="buy">Mua hàng</button></div><div class="mt-4 pt-4 border-t"><button class="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-black text-[11px] uppercase shadow-inner btn-action" data-action="exportAttendance">Xuất Chấm Công</button></div></div>
            <p class="label px-2">Danh sách nhân sự</p><div class="space-y-2 pb-24">${html}</div>
        `;
    },

    // 7. MODALS
    initModals: () => {
        const container = document.getElementById('modal-container');
        if(!container) return;
        container.innerHTML = `
            <div id="settings-modal" class="modal-wrap hidden"><div class="modal-box shadow-2xl border-2 border-slate-50 font-black"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="settings-modal"><i class="fas fa-times"></i></div><h3 class="font-black text-xl mb-6 text-center text-blue-600 uppercase">Quản Trị</h3><div class="space-y-4"><div id="admin-tools" class="hidden space-y-3"><button id="btn-reset-score" class="btn-primary bg-orange-600 btn-action hidden" data-action="resetLeaderboard">Reset Thi Đua</button><button id="btn-approve" class="btn-primary bg-indigo-600 btn-action hidden" data-action="openModal" data-payload="approve">Duyệt Đơn</button><button class="btn-primary bg-slate-600 btn-action" data-action="openModal" data-payload="sop">Quy Trình (SOP)</button><div class="border-t pt-4"><button class="btn-primary bg-slate-700 btn-action" data-action="openModal" data-payload="addStaff">Thêm Nhân Sự</button></div></div><button class="btn-primary bg-red-500 mt-6 btn-action" data-action="logout">Đăng Xuất</button></div></div></div>
            <div id="modal-addStaff" class="modal-wrap hidden"><div class="modal-box p-6"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-addStaff"><i class="fas fa-times"></i></div><h3 class="font-bold mb-4 text-center uppercase text-blue-600">Thêm Nhân Sự</h3><div class="space-y-4"><input id="new-emp-name" placeholder="Họ tên" class="input-box"><div class="grid grid-cols-2 gap-2"><input id="new-emp-id" placeholder="ID" class="input-box" inputmode="numeric"><input id="new-emp-pin" placeholder="PIN" class="input-box" inputmode="numeric" maxlength="6"></div><select id="new-emp-role" class="input-box"><option value="Nhân viên">Nhân viên</option><option value="Tổ trưởng">Tổ trưởng</option><option value="Quản lý">Quản lý</option><option value="Kế toán">Kế toán</option></select><select id="new-emp-team" class="input-box"><option value="Tổ Thu Hoạch">Tổ Thu Hoạch</option><option value="Tổ Sản Xuất">Tổ Sản Xuất</option></select><button class="btn-primary btn-action" data-action="addEmployee">Lưu</button></div></div></div>
            <div id="modal-leave" class="modal-wrap hidden"><div class="modal-box p-6"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-leave"><i class="fas fa-times"></i></div><h3 class="font-bold text-blue-600 text-center uppercase mb-4">Xin Nghỉ Phép</h3><input id="leave-date" type="date" class="input-box mb-2"><select id="leave-reason" class="input-box mb-2"><option>Ốm/Sức khỏe</option><option>Việc riêng</option></select><button class="btn-primary btn-action" data-action="submitHR" data-payload="LEAVE">Gửi Đơn</button></div></div>
            <div id="modal-buy" class="modal-wrap hidden"><div class="modal-box p-6"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-buy"><i class="fas fa-times"></i></div><h3 class="font-bold text-green-600 text-center uppercase mb-4">Mua Vật Tư</h3><input id="pur-item" placeholder="Tên hàng..." class="input-box mb-2"><button class="btn-primary bg-green-600 btn-action" data-action="submitHR" data-payload="PURCHASE">Gửi Đề Xuất</button></div></div>
            <div id="modal-approve" class="modal-wrap hidden"><div class="modal-box p-4"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-approve"><i class="fas fa-times"></i></div><h3 class="font-bold text-center uppercase mb-4">Duyệt Đơn</h3><div id="approval-list" class="space-y-2"></div></div></div>
            <div id="modal-sop" class="modal-wrap hidden"><div class="modal-box p-4"><div class="modal-close-btn btn-action" data-action="closeModal" data-payload="modal-sop"><i class="fas fa-times"></i></div><h3 class="font-bold text-center uppercase mb-4">Quy Trình (SOP)</h3><textarea class="w-full h-64 border p-2 text-xs bg-slate-50" placeholder="Nội dung quy trình..."></textarea></div></div>
        `;
    }
};
