export const UI = {
    // --- 1. UTILS ---
    initModals: () => {
        const c = document.getElementById('modal-container');
        if(c) c.addEventListener('click', e => { if(e.target === c) c.classList.add('hidden'); });
    },
    showMsg: (t) => { const b = document.getElementById('msg-box'); if(b) { b.innerText = t; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 3000); } },
    toggleModal: (html) => {
        const m = document.getElementById('modal-container');
        if(html) { m.innerHTML = html; m.classList.remove('hidden'); } else { m.classList.add('hidden'); }
    },
    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabName) { btn.classList.add('text-blue-600', '-translate-y-1'); btn.classList.remove('text-slate-400'); }
            else { btn.classList.remove('text-blue-600', '-translate-y-1'); btn.classList.add('text-slate-400'); }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },
    renderEmployeeOptions: (employees) => {
        const h = '<option value="">-- Chọn danh tính --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        const s1 = document.getElementById('login-user'); if(s1) s1.innerHTML = h;
    },

    // --- 2. TEMPLATES ---
    Templates: {
        ModalBase: (t, c, btn, btnTxt) => `<div class="glass !bg-white w-full max-w-sm p-6 space-y-4 shadow-2xl animate-pop" onclick="event.stopPropagation()"><div class="flex justify-between items-center border-b pb-2"><h3 class="font-black text-slate-800 text-lg uppercase">${t}</h3><button class="text-2xl text-slate-400 btn-action" data-action="closeModal">&times;</button></div><div class="space-y-3">${c}</div><div class="flex gap-3 pt-2"><button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="closeModal">Hủy</button>${btn?`<button class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold btn-action shadow-lg" data-action="${btn}">${btnTxt}</button>`:''}</div></div>`,
        Chat: (msgs, uid) => {
            const b = document.getElementById('chat-msgs');
            if(b) {
                b.innerHTML = msgs.map(m => `<div class="flex flex-col ${String(m.senderId)===String(uid)?'items-end':'items-start'} animate-fade"><span class="text-[9px] text-slate-400 px-2 uppercase font-bold">${m.senderName}</span><div class="${String(m.senderId)===String(uid)?'bg-blue-600 text-white':'bg-white text-slate-700'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] mb-2 break-words">${m.text}</div></div>`).join('');
                b.scrollTop = b.scrollHeight;
            }
        }
    },

    // --- 3. VIEWS (GIAO DIỆN CHÍNH) ---
    Views: {
        Home: (data, isAdmin) => {
            const sorted = [...data.houses].sort((a, b) => a.name.localeCompare(b.name, 'vi', {numeric: true}));
            const getYield = (n) => data.harvest.filter(h => h.area === n).reduce((s, h) => s + (Number(h.total) || 0), 0);
            return `
            <div class="space-y-5">
                <div class="glass p-5 !bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg relative">
                    <h3 class="font-bold text-xs uppercase tracking-widest mb-2 opacity-80 text-center">Tổng quan trại</h3>
                    <div class="text-center"><span class="text-4xl font-black">${sorted.filter(h=>h.status==='ACTIVE').length}</span> <span class="text-sm opacity-80 block">Nhà đang hoạt động</span></div>
                </div>
                ${isAdmin ? `<button class="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold text-xs hover:bg-white transition btn-action" data-action="openAddHouse">+ THÊM NHÀ MỚI</button>` : ''}
                <div class="grid grid-cols-2 gap-3">
                    ${sorted.map(h => `<div class="glass p-3 border-l-4 ${h.status==='ACTIVE'?'border-green-500':'border-slate-300'} relative"><div class="flex justify-between items-start mb-2"><span class="font-black text-lg text-slate-700">${h.name}</span><span class="text-[9px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-500'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span></div><div class="text-[10px] text-slate-400 uppercase font-bold mb-1">${h.currentBatch||'-'}</div><div class="text-right"><span class="text-xl font-black text-slate-700">${getYield(h.name).toFixed(1)}</span> <span class="text-[10px] text-slate-400">kg</span></div></div>`).join('')}
                </div>
            </div>`;
        },
        Production: (data) => {
            const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
            const mats = data.materials || [];
            return `
            <div class="space-y-6">
                <div class="glass p-5 border-l-4 border-blue-500 space-y-4">
                    <h3 class="font-black text-slate-700 uppercase">Nhập Phôi (Kho A)</h3>
                    <select id="sx-house-select" class="font-bold">${sorted.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}</select>
                    <div class="grid grid-cols-2 gap-3"><input id="sx-strain" placeholder="Mã giống"><input id="sx-date" type="date" title="Ngày cấy"></div>
                    <input id="sx-spawn-qty" type="number" placeholder="Số lượng bịch" class="text-lg font-bold text-blue-600">
                    <textarea id="sx-note" placeholder="Ghi chú (NCC...)" class="h-20"></textarea>
                    <button class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg btn-action" data-action="setupHouseBatch">KÍCH HOẠT LÔ MỚI</button>
                </div>
                
                <div class="glass p-5 border-l-4 border-purple-500">
                    <div class="flex justify-between items-center mb-3"><h3 class="font-black text-slate-700 uppercase">Kho Vật Tư</h3><button class="text-xs bg-slate-100 px-2 py-1 rounded font-bold btn-action" data-action="openAddMat">+ Nhập</button></div>
                    <div class="grid grid-cols-2 gap-2">
                        ${mats.length ? mats.map(m => `<div class="bg-slate-50 p-2 rounded border flex justify-between items-center"><span class="text-xs font-bold text-slate-600 truncate">${m.name}</span><div class="text-purple-600 font-black text-sm">${m.qty} <span class="text-[9px] text-slate-400">${m.unit}</span></div></div>`).join('') : '<span class="text-xs italic text-slate-400">Kho trống</span>'}
                    </div>
                </div>
            </div>`;
        },
        Warehouse: (data) => {
            const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
            const g1 = data.products.filter(p => p.group == '1');
            const g2 = data.products.filter(p => p.group == '2');
            const g3 = data.products.filter(p => p.group == '3');
            const recentLogs = data.shipping.filter(s => (Date.now() - s.time) < 172800000).sort((a,b)=>b.time-a.time); // 48h

            return `
            <div class="space-y-4">
                <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button class="flex-1 py-2 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm btn-action" data-action="toggleTH" data-payload="in">NHẬP KHO</button>
                    <button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50 btn-action" data-action="toggleTH" data-payload="out">XUẤT BÁN</button>
                </div>
                <div id="zone-th" class="glass p-5 border-l-4 border-green-500">
                    <div class="flex justify-between items-center mb-4"><span class="font-black text-slate-700 uppercase">Nhập Kho</span><button class="text-xs bg-slate-100 px-3 py-1 rounded text-blue-600 font-bold btn-action" data-action="openAddProd">+ Mã SP</button></div>
                    <div class="space-y-4">
                        <select id="th-area" class="font-bold text-green-700"><option value="">-- Chọn Nguồn --</option>${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                        ${g1.length ? `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">1. Nấm Tươi</h4><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm focus:border-green-500" placeholder="-"></div>`).join('')}</div></div>` : ''}
                        ${g2.length ? `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">2. Phụ Phẩm</h4><div class="grid grid-cols-3 gap-3">${g2.map(p=>`<div><label class="text-[9px] font-bold text-slate-400 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm focus:border-orange-500" placeholder="-"></div>`).join('')}</div></div>` : ''}
                        ${g3.length ? `<div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">3. Thành Phẩm</h4><div class="grid grid-cols-3 gap-3">${g3.map(p=>`<div><label class="text-[9px] font-bold text-slate-400 block truncate text-center mb-1">${p.name}</label><input type="number" id="th-${p.code}" class="text-center font-bold text-sm focus:border-purple-500" placeholder="-"></div>`).join('')}</div></div>` : ''}
                        <button class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitTH">LƯU KHO</button>
                    </div>
                </div>
                <div id="zone-ship" class="hidden glass p-5 border-l-4 border-orange-500">
                    <h4 class="font-black text-slate-700 uppercase mb-4">Xuất Bán</h4>
                    <div class="space-y-3"><input id="ship-cust" placeholder="Khách hàng"><div class="grid grid-cols-2 gap-3"><select id="ship-type"><option value="">-- Mã Hàng --</option>${[...g1,...g3].map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</select><input id="ship-qty" type="number" placeholder="Số lượng"></div><textarea id="ship-note" placeholder="Ghi chú..."></textarea><button class="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg btn-action" data-action="submitShip">XUẤT & IN</button></div>
                    <div class="mt-4 pt-4 border-t"><p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Nhật ký xuất (48h qua)</p><div class="space-y-2 max-h-40 overflow-y-auto">${recentLogs.map(l=>`<div class="flex justify-between text-xs p-2 bg-orange-50 rounded"><span class="font-bold">${l.customer}</span><span>${l.qty}kg ${l.type}</span></div>`).join('')}</div></div>
                </div>
            </div>`;
        },
        HR: (data, user) => {
            const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(user.role);
            const empCheckboxes = data.employees.map(e => `<label class="flex items-center space-x-2 bg-slate-50 p-2 rounded cursor-pointer"><input type="checkbox" class="task-emp-check w-4 h-4" value="${e.name}"><span class="text-xs font-bold text-slate-700">${e.name}</span></label>`).join('');
            const recentTasks = data.tasks.filter(t => (Date.now() - t.time) < 259200000).sort((a,b)=>b.time-a.time); // 3 ngày
            return `
            <div class="space-y-6">
                 ${canAssign ? `<div class="glass p-5 border-l-4 border-blue-500"><div class="flex justify-between mb-3"><h4 class="font-black text-slate-700 uppercase text-xs">Giao Việc</h4><button class="text-[10px] font-bold text-blue-600 underline btn-action" onclick="document.getElementById('task-history').classList.toggle('hidden')">Lịch sử 3 ngày</button></div><div id="task-form" class="space-y-3"><input id="task-title" placeholder="Tên công việc"><div class="grid grid-cols-2 gap-3"><select id="task-house"><option value="">-- Nhà/Khu --</option>${data.houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select><input id="task-deadline" type="date"></div><div class="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 grid grid-cols-2 gap-2">${empCheckboxes}</div><button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold btn-action" data-action="addTask">PHÁT LỆNH</button></div><div id="task-history" class="hidden mt-3 space-y-2 border-t pt-2 max-h-40 overflow-y-auto">${recentTasks.map(t=>`<div class="text-xs flex justify-between p-2 bg-slate-50 rounded"><span class="font-bold">${t.title}</span><span class="${t.status==='done'?'text-green-500':'text-orange-500'}">${t.status==='done'?'Xong':'Chờ'}</span></div>`).join('')}</div></div>` : ''}
                 <div><h3 class="font-bold text-slate-400 text-xs uppercase pl-2">Cần Làm Ngay</h3>${data.tasks.filter(t=>t.assignee===user.name && t.status!=='done').map(t => `<div class="glass p-4 border-l-4 border-orange-500 mb-2"><div class="flex justify-between items-start mb-2"><h4 class="font-bold text-slate-800">${t.title}</h4></div><div class="text-xs text-slate-500 mb-3">${t.house||'Chung'}</div><button class="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold btn-action shadow-md" data-action="submitTask" data-payload="${t._id}">BÁO CÁO XONG</button></div>`).join('')}</div>
            </div>`;
        },
        Team: (user, data) => {
            const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
            return `<div class="p-4 space-y-4"><div class="glass p-6 !bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-xl flex items-center gap-5"><div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">${user.name.charAt(0)}</div><div><h2 class="text-xl font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role}</p></div></div><div class="grid grid-cols-2 gap-3 mb-6"><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="submitAttendance"><i class="fas fa-fingerprint text-2xl text-green-600"></i><span class="text-xs font-bold">ĐIỂM DANH</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="openLeaveModal"><i class="fas fa-umbrella-beach text-2xl text-orange-600"></i><span class="text-xs font-bold">XIN NGHỈ</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="openBuyModal"><i class="fas fa-shopping-cart text-2xl text-purple-600"></i><span class="text-xs font-bold">MUA HÀNG</span></button><button class="card p-4 flex flex-col items-center gap-2 btn-action" data-action="logout"><i class="fas fa-power-off text-2xl text-slate-500"></i><span class="text-xs font-bold">THOÁT</span></button></div>${isManager ? `<div class="glass p-0 overflow-hidden"><div class="bg-slate-50 p-4 border-b border-slate-100"><h3 class="font-black text-slate-400 text-xs uppercase tracking-widest">Nhân sự & Kỷ luật</h3></div>${data.employees.map(e => `<div class="flex justify-between items-center p-4 border-b border-slate-50 last:border-0"><div><div class="font-bold text-sm text-slate-700">${e.name}</div><div class="text-[10px] font-bold text-amber-500">${e.score} điểm</div></div><div class="flex gap-2"><button class="w-8 h-8 rounded-lg bg-red-50 text-red-500 font-bold text-xs btn-action" data-action="punishEmp" data-payload="${e._id}|5">-5</button></div></div>`).join('')}</div>` : ''}</div>`;
        }
    }
};
