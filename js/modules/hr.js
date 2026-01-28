import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG CHAT & THÔNG BÁO ---
window.HR_Chat = async (user, msg, isSystem = false) => {
    try {
        await addDoc(collection(db, `${ROOT_PATH}/chat`), {
            user: user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT'
        });
    } catch(e) { console.error(e); }
};

// --- DUYỆT ĐƠN (TEAM) ---
window.HR_Approve = {
    ok: async (id, title, reqUser, adminName) => {
        if(confirm("Duyệt đơn này?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
            Utils.toast("✅ Đã duyệt!");
            window.HR_Chat("HỆ THỐNG", `✅ ${adminName} đã DUYỆT đơn: "${title}" của ${reqUser}`, true);
        }
    },
    no: async (id, title, reqUser, adminName) => {
        if(confirm("Từ chối?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'REJECT' });
            Utils.toast("❌ Đã từ chối!");
            window.HR_Chat("HỆ THỐNG", `❌ ${adminName} đã TỪ CHỐI đơn: "${title}" của ${reqUser}`, true);
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const houses = Array.isArray(data.houses) ? data.houses : [];

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50 shadow-sm border border-blue-200 rounded-xl">
                <h3 class="font-black text-blue-700 text-xs uppercase mb-3"><i class="fas fa-bullhorn"></i> GIAO VIỆC NHÓM</h3>
                
                <div class="space-y-2 mb-3">
                    <input id="t-title" placeholder="Nội dung công việc..." class="w-full p-2 rounded border border-blue-300 text-xs font-bold bg-white">
                    <div class="flex gap-2">
                        <select id="t-area" class="w-1/2 p-2 rounded border border-blue-300 text-xs bg-white font-bold">
                            <option value="">-- Khu Vực --</option>
                            ${houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
                            <option value="Khác">Khác</option>
                        </select>
                        <input type="date" id="t-date" class="w-1/2 p-2 rounded border border-blue-300 text-xs bg-white font-bold">
                    </div>
                </div>
                
                <div class="bg-white p-2 rounded border border-blue-200 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 text-blue-600 flex items-center gap-2">
                        <input type="checkbox" id="check-all"> Chọn tất cả
                    </label>
                    ${employees.map(e => `
                        <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="emp-check" value="${e._id}" data-name="${e.name}"> ${e.name}
                        </label>
                    `).join('')}
                </div>
                <button id="btn-tsk" class="w-full bg-blue-600 text-white rounded-lg py-3 font-bold text-xs shadow-md active:scale-95 transition">GIAO VIỆC NGAY</button>
            </div>` : ''}

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="font-black text-slate-700 text-sm uppercase pl-2 border-l-4 border-orange-500">NHẬT KÝ</h2>
                    <select id="filter-emp" class="text-xs border rounded p-1 font-bold bg-white"><option value="ALL">-- Tất cả --</option>${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}</select>
                </div>
                <div id="task-list" class="space-y-2"></div>
            </div>
        </div>`;

        const renderList = () => {
            const fid = document.getElementById('filter-emp').value;
            let list = tasks.filter(t => !t.type || t.type === 'TASK');
            if(fid !== 'ALL') list = list.filter(t => t.to === fid);
            if(!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);
            list.sort((a,b) => b.time - a.time);

            document.getElementById('task-list').innerHTML = list.length ? list.map(t => {
                const isDone = t.status === 'DONE';
                const assign = employees.find(e=>e._id===t.to)?.name || '...';
                const areaInfo = t.area ? `[${t.area}] ` : '';
                return `
                <div class="bg-white p-3 rounded-lg border-l-4 ${isDone?'border-green-500 opacity-60':(t.status==='DOING'?'border-blue-500 bg-blue-50':'border-orange-400')} shadow-sm relative">
                    <div class="flex justify-between">
                        <div class="pr-6">
                            <span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${areaInfo}${t.title}</span>
                            <span class="text-[9px] text-slate-400">Người làm: <b>${assign}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                        </div>
                        ${isAdmin ? `<button onclick="window.HR_Action.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    ${!isDone && t.to === user._id ? `<div class="mt-2 pt-2 border-t border-dashed">${t.status!=='DOING' ? `<button onclick="window.HR_Action.accept('${t.id}','${encodeURIComponent(t.title)}','${user.name}')" class="w-full py-1.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded">NHẬN VIỆC</button>` : `<button onclick="window.HR_Action.finish('${t.id}','${encodeURIComponent(t.title)}','${user.name}')" class="w-full py-1.5 bg-green-100 text-green-700 font-bold text-[10px] rounded">BÁO CÁO XONG</button>`}</div>` : ''}
                </div>`;
            }).join('') : '<div class="text-center text-slate-300 italic text-xs">Chưa có công việc</div>';
        };

        setTimeout(() => {
            renderList();
            const dateIn = document.getElementById('t-date'); if(dateIn) dateIn.valueAsDate = new Date();
            const fSel = document.getElementById('filter-emp'); if(fSel) fSel.onchange = renderList;
            const chkAll = document.getElementById('check-all'); if(chkAll) chkAll.onchange = (e) => document.querySelectorAll('.emp-check').forEach(cb => cb.checked = e.target.checked);

            const btn = document.getElementById('btn-tsk');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                const area = document.getElementById('t-area').value;
                const chk = document.querySelectorAll('.emp-check:checked');
                if(title && chk.length) {
                    const batch = writeBatch(db); // Dùng writeBatch chuẩn
                    const names = [];
                    chk.forEach(c => {
                        const ref = doc(collection(db, `${ROOT_PATH}/tasks`));
                        batch.set(ref, { title, area, to: c.value, by: user.name, status: 'PENDING', time: Date.now(), type: 'TASK' });
                        names.push(c.getAttribute('data-name'));
                    });
                    await batch.commit();
                    window.HR_Chat(user.name, `📢 Đã giao việc: "${title}" ${area?`tại ${area}`:''} cho ${names.join(', ')}`, true);
                    Utils.toast("Đã giao việc!"); renderList();
                    document.getElementById('t-title').value = '';
                } else { Utils.toast("Thiếu thông tin!", "err"); }
            };
        }, 300);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const chats = Array.isArray(data.chat) ? data.chat.sort((a,b)=>b.time-a.time).slice(0,30) : [];
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            ${isAdmin && pending.length ? `
            <div class="bg-red-50 border border-red-200 p-3 rounded-xl animate-pop">
                <h3 class="font-black text-red-600 text-xs uppercase mb-2">🔔 CẦN DUYỆT (${pending.length})</h3>
                <div class="space-y-2 max-h-48 overflow-y-auto">${pending.map(t=>`<div class="bg-white p-2 rounded shadow-sm flex justify-between items-center"><div><div class="text-[10px] font-bold text-slate-700">${t.by} <span class="font-normal">(${t.type})</span></div><div class="text-xs font-bold text-red-500">${t.title}</div></div><div class="flex gap-1"><button onclick="window.HR_Approve.ok('${t.id}','${t.title}','${t.by}','${user.name}')" class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">OK</button><button onclick="window.HR_Approve.no('${t.id}','${t.title}','${t.by}','${user.name}')" class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">Hủy</button></div></div>`).join('')}</div>
            </div>` : ''}

            <div class="glass p-4 bg-purple-50/50 border border-purple-100 shadow-sm rounded-xl">
                <h3 class="font-bold text-purple-700 text-xs uppercase mb-3 text-center">Tiện ích</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button id="btn-checkin" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95"><i class="fas fa-fingerprint text-2xl text-blue-500 mb-2"></i><span class="text-[10px] font-bold">Chấm công</span></button>
                    <button id="btn-leave" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95"><i class="fas fa-user-clock text-2xl text-orange-500 mb-2"></i><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                    <button id="btn-buy" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95"><i class="fas fa-shopping-cart text-2xl text-green-500 mb-2"></i><span class="text-[10px] font-bold">Mua hàng</span></button>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-80 flex flex-col">
                <div class="bg-slate-100 p-2 border-b font-bold text-xs text-slate-600 uppercase">💬 THẢO LUẬN & THÔNG BÁO</div>
                <div class="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 flex flex-col-reverse">
                    ${chats.map(msg => `
                        <div class="flex flex-col ${msg.type==='NOTIFY'?'items-center':'items-start'}">
                            ${msg.type==='NOTIFY' 
                                ? `<span class="text-[9px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-center mb-1">${msg.message}</span>`
                                : `<div class="bg-white p-2 rounded-xl rounded-tl-none border border-slate-200 shadow-sm max-w-[85%]"><div class="text-[10px] font-bold text-blue-600 mb-0.5">${msg.user} <span class="text-[8px] text-gray-400 font-normal">${new Date(msg.time).toLocaleTimeString('vi-VN').slice(0,5)}</span></div><div class="text-xs text-slate-700">${msg.message}</div></div>`
                            }
                        </div>`).join('')}
                </div>
                <div class="p-2 border-t bg-white flex gap-2">
                    <input id="chat-msg" class="flex-1 p-2 border rounded-full text-xs outline-none" placeholder="Nhập tin nhắn...">
                    <button id="chat-send" class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm"><i class="fas fa-paper-plane text-xs"></i></button>
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Chat(user.name, `📝 Gửi yêu cầu: ${t}`, true); };
            document.getElementById('btn-checkin').onclick = () => { if(confirm("Chấm công?")) sendReq("Đã chấm công", "CHECKIN"); };
            document.getElementById('btn-leave').onclick = () => { const r=prompt("Lý do:"); if(r) sendReq(`Xin nghỉ: ${r}`, "LEAVE"); };
            document.getElementById('btn-buy').onclick = () => { const n=prompt("Món đồ:"); if(n) sendReq(`Mua: ${n}`, "BUY"); };
            
            // Chat
            const sendChat = async () => { const m = document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            document.getElementById('chat-send').onclick = sendChat;
            document.getElementById('chat-msg').onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
