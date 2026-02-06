import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, deleteDoc, writeBatch, increment, getDocs, query, where } from '../config.js';
import { Utils } from '../utils.js';

// --- GLOBAL ACTIONS ---
window.HR_Action = {
    // 1. NHÂN SỰ
    addEmp: async () => {
        const name = prompt("Tên nhân viên mới:"); if (!name) return;
        const pin = prompt("Mã PIN (4 số):", "1234"); if (!pin) return;
        const role = prompt("Chức vụ (admin/quản lý/nhân viên):", "nhân viên");
        try { await addDoc(collection(db, `${ROOT_PATH}/employees`), { name, pin, role: role.toLowerCase(), score: 0 }); Utils.toast("✅ Đã thêm!"); setTimeout(() => window.location.reload(), 1000); } catch(e) { alert("Lỗi: " + e.message); }
    },
    delEmp: async (id, name) => { if(confirm(`Xóa ${name}?`)) { document.getElementById(`emp-${id}`)?.remove(); try { await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id)); Utils.toast("Đã xóa!"); } catch(e) { alert("Lỗi: " + e.message); } } },
    score: async (id, nameEnc, val, adminEnc) => {
        const name = decodeURIComponent(nameEnc);
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm cho ${name}?`);
        if(reason) {
            document.getElementById(`score-${id}`).innerText = (parseInt(document.getElementById(`score-${id}`).innerText)||0) + val;
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
            window.HR_Action.chat("HỆ THỐNG", `⚖️ ${val>0?'THƯỞNG':'PHẠT'} ${name} ${Math.abs(val)}đ. Lý do: ${reason}`, true);
        }
    },

    // 2. CHAT
    chat: async (user, msg, isSystem = false) => {
        try { await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' }); } catch (e) { console.error(e); }
    },

    // 3. QUẢN LÝ TASK (Đã nâng cấp)
    delTask: async (id) => { if(confirm("Xóa việc này?")) { document.getElementById(`task-${id}`)?.remove(); await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); Utils.toast("Đã xóa!"); } },
    
    // Cập nhật trạng thái & ghi chú (MỚI)
    updateTask: async (id) => {
        const note = document.getElementById(`note-${id}`).value;
        const btn = document.getElementById(`btn-stt-${id}`);
        const currentStatus = btn.getAttribute('data-status');
        
        await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { note: note, status: currentStatus });
        Utils.toast("✅ Đã báo cáo!");
    },
    
    toggleStatus: (id) => {
        const btn = document.getElementById(`btn-stt-${id}`);
        const isDone = btn.getAttribute('data-status') === 'DONE';
        if(isDone) {
            btn.setAttribute('data-status', 'PENDING');
            btn.className = 'flex-1 py-2 rounded-lg font-bold text-xs border border-slate-300 text-slate-400 bg-white';
            btn.innerHTML = '<i class="far fa-circle"></i> CHƯA XONG';
        } else {
            btn.setAttribute('data-status', 'DONE');
            btn.className = 'flex-1 py-2 rounded-lg font-bold text-xs bg-green-500 text-white shadow-md shadow-green-200';
            btn.innerHTML = '<i class="fas fa-check-circle"></i> ĐÃ XONG';
        }
    },

    addTask: () => {
        Utils.modal("Giao Việc Mới", `
            <input id="t-title" placeholder="Nội dung công việc..." class="w-full p-3 border rounded-xl mb-3 font-bold text-sm">
            <div class="flex gap-2 mb-3">
                <input type="date" id="t-date" class="w-1/3 p-2 border rounded-xl text-center font-bold text-xs">
                <select id="t-to" class="flex-1 p-2 border rounded-xl font-bold text-xs"></select>
            </div>
            <div class="bg-slate-50 p-2 rounded max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3 border">
                 <label class="col-span-2 text-xs font-bold"><input type="checkbox" id="check-all"> Chọn tất cả</label>
                 <div id="emp-list-chk" class="contents"></div>
            </div>
        `, [{id:'t-save', text:'Giao Việc'}]);

        setTimeout(() => {
            const employees = window.employees_cache || [];
            // Render list checkbox
            const listHtml = employees.map(e => `<label class="flex items-center gap-1 text-xs"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('');
            document.getElementById('emp-list-chk').innerHTML = listHtml;
            
            // Render select (cho trường hợp chọn 1 người nhanh)
            document.getElementById('t-to').innerHTML = '<option value="">-- Chọn nhanh --</option>' + employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
            document.getElementById('t-date').valueAsDate = new Date();
            
            // Check all logic
            document.getElementById('check-all').onclick = (e) => document.querySelectorAll('.ec').forEach(cb => cb.checked = e.target.checked);

            document.getElementById('t-save').onclick = async () => {
                const title = document.getElementById('t-title').value;
                const date = document.getElementById('t-date').value;
                const quickTo = document.getElementById('t-to').value;
                
                // Lấy danh sách người được giao
                let targets = [];
                document.querySelectorAll('.ec:checked').forEach(cb => targets.push({id: cb.value, name: cb.getAttribute('data-name')}));
                
                // Nếu không tích chọn ai mà chọn ở select box thì lấy người đó
                if(targets.length === 0 && quickTo) {
                    const emp = employees.find(e => e.name === quickTo);
                    if(emp) targets.push({id: emp._id, name: emp.name});
                }

                if(title && targets.length && date) {
                    const batch = writeBatch(db);
                    const names = [];
                    targets.forEach(t => {
                        const ref = doc(collection(db, `${ROOT_PATH}/tasks`));
                        batch.set(ref, {
                            title, by: t.name, to: t.id, // 'by' ở đây nghĩa là người được giao (dùng logic cũ của bạn), 'to' là ID người đó
                            date, time: new Date(date).getTime(), 
                            status: 'PENDING', note: '', type: 'TASK'
                        });
                        names.push(t.name);
                    });
                    
                    await batch.commit();
                    window.HR_Action.chat("HỆ THỐNG", `📢 Giao việc: "${title}" cho ${names.join(', ')}`, true);
                    Utils.modal(null);
                    Utils.toast("Đã giao việc!");
                } else {
                    Utils.toast("Thiếu thông tin!", "err");
                }
            }
        }, 100);
    },

    // 4. DUYỆT ĐƠN (Xin nghỉ/Mua hàng)
    approve: async (id, titleEnc, userEnc, isOk) => {
        const title = decodeURIComponent(titleEnc); const user = decodeURIComponent(userEnc);
        if(confirm(isOk ? `Duyệt "${title}"?` : `Từ chối?`)) {
            document.getElementById(`task-${id}`)?.remove();
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
            Utils.toast("Đã xử lý!"); 
            window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user}`, true);
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks'); if(!c || c.classList.contains('hidden')) return;
        window.employees_cache = data.employees || []; // Cache lại để dùng cho modal

        const role = (user.role || '').toLowerCase();
        const isManager = ['admin', 'giám đốc', 'quản lý'].some(r => role.includes(r));
        
        let tasks = (data.tasks || []).filter(t => !t.type || t.type === 'TASK'); // Chỉ lấy Task thường
        
        // Lọc: Quản lý thấy hết, NV chỉ thấy việc của mình (theo tên hoặc ID)
        if(!isManager) {
            tasks = tasks.filter(t => t.by === user.name || t.to === user._id);
        }
        tasks.sort((a,b) => b.time - a.time);

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div>
                    <h2 class="font-black text-blue-800 text-lg">DANH SÁCH VIỆC</h2>
                    <p class="text-xs text-blue-500 font-bold">Hôm nay: ${new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                ${isManager ? `<button onclick="window.HR_Action.addTask()" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-blue-200 active:scale-95 transition">+ GIAO VIỆC</button>` : ''}
            </div>

            <div class="space-y-3">
                ${tasks.length ? tasks.map(t => {
                    const isDone = t.status === 'DONE';
                    return `
                    <div id="task-${t.id}" class="bg-white p-4 rounded-xl border ${isDone ? 'border-green-200 bg-green-50/30' : 'border-slate-100'} shadow-sm relative group">
                        ${isManager ? `<button onclick="window.HR_Action.delTask('${t.id}')" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 px-2">×</button>` : ''}
                        
                        <div class="mb-3">
                            <div class="flex justify-between items-start pr-6">
                                <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded mr-2">${t.by}</span>
                                <span class="text-[10px] text-slate-400 italic">${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div class="font-bold text-slate-700 text-sm mt-1 ${isDone ? 'line-through opacity-60' : ''}">${t.title}</div>
                        </div>

                        <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <input id="note-${t.id}" value="${t.note || ''}" placeholder="Ghi chú báo cáo..." class="w-full bg-white border border-slate-200 rounded p-2 text-xs mb-2 outline-none focus:border-blue-400 text-slate-700">
                            <div class="flex gap-2">
                                <button id="btn-stt-${t.id}" onclick="window.HR_Action.toggleStatus('${t.id}')" data-status="${t.status}" 
                                    class="flex-1 py-2 rounded-lg font-bold text-xs transition-all ${isDone ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'border border-slate-300 text-slate-400 bg-white'}">
                                    ${isDone ? '<i class="fas fa-check-circle"></i> ĐÃ XONG' : '<i class="far fa-circle"></i> CHƯA XONG'}
                                </button>
                                <button onclick="window.HR_Action.updateTask('${t.id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow active:scale-95">LƯU</button>
                            </div>
                        </div>
                    </div>`;
                }).join('') : '<div class="text-center text-slate-400 py-10 italic">Chưa có công việc nào</div>'}
            </div>
        </div>`;
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team'); if(!c || c.classList.contains('hidden')) return;
        
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a,b) => (b.score||0) - (a.score||0));
        const chats = Array.isArray(data.chat) ? data.chat.sort((a,b)=>b.time-a.time).slice(0,50) : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY'].includes(t.type));
        
        const top3 = employees.slice(0, 3);
        const adminEnc = encodeURIComponent(user.name);

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            ${isAdmin && pending.length ? `<div class="bg-red-50 p-3 rounded-lg border border-red-200"><h3 class="font-bold text-red-600 text-xs mb-2">CẦN DUYỆT (${pending.length})</h3><div class="space-y-2 max-h-40 overflow-y-auto">${pending.map(t=>{
                const tEnc=encodeURIComponent(t.title); const uEnc=encodeURIComponent(t.by);
                return `<div id="task-${t.id}" class="bg-white p-2 rounded flex justify-between items-center text-xs"><div><b class="text-slate-600">${t.by}</b>: ${t.title}</div><div class="flex gap-1"><button onclick="window.HR_Action.approve('${t.id}','${tEnc}','${uEnc}',true)" class="text-green-600 font-bold px-1">OK</button><button onclick="window.HR_Action.approve('${t.id}','${tEnc}','${uEnc}',false)" class="text-red-600 font-bold px-1">X</button></div></div>`;
            }).join('')}</div></div>` : ''}

            <div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-center shadow-sm">
                <h3 class="font-black text-yellow-600 text-xs uppercase mb-3">🏆 TOP 3 XUẤT SẮC</h3>
                <div class="flex justify-center items-end gap-2">
                    ${top3[1] ? `<div class="flex flex-col items-center"><div class="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center font-bold text-xs">${top3[1].name.charAt(0)}</div><div class="h-12 w-12 bg-slate-200 rounded-t flex flex-col justify-end pb-1 border-t-2 border-slate-400"><span class="text-[9px] font-bold">${top3[1].score||0}</span><span class="text-xs">🥈</span></div><div class="text-[8px] font-bold mt-1 truncate w-12">${top3[1].name}</div></div>` : ''}
                    ${top3[0] ? `<div class="flex flex-col items-center z-10"><div class="w-10 h-10 rounded-full bg-yellow-100 border border-yellow-400 flex items-center justify-center font-bold text-sm mb-1">${top3[0].name.charAt(0)}</div><div class="h-16 w-14 bg-yellow-100 rounded-t flex flex-col justify-end pb-1 border-t-4 border-yellow-400 shadow"><span class="text-[10px] font-bold text-yellow-700">${top3[0].score||0}</span><span class="text-sm">🥇</span></div><div class="text-[9px] font-bold text-yellow-700 mt-1 truncate w-14">${top3[0].name}</div></div>` : '<div class="text-xs text-slate-400 italic">Chưa có dữ liệu</div>'}
                    ${top3[2] ? `<div class="flex flex-col items-center"><div class="w-8 h-8 rounded-full bg-white border border-orange-300 flex items-center justify-center font-bold text-xs">${top3[2].name.charAt(0)}</div><div class="h-10 w-12 bg-orange-100 rounded-t flex flex-col justify-end pb-1 border-t-2 border-orange-400"><span class="text-[9px] font-bold">${top3[2].score||0}</span><span class="text-xs">🥉</span></div><div class="text-[8px] font-bold mt-1 truncate w-12">${top3[2].name}</div></div>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-3 gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <button id="btn-checkin" class="bg-white p-2 rounded flex flex-col items-center shadow-sm active:scale-95"><span class="text-xl">📍</span><span class="text-[10px] font-bold">Chấm công</span></button>
                <button id="btn-leave" class="bg-white p-2 rounded flex flex-col items-center shadow-sm active:scale-95"><span class="text-xl">📝</span><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                <button id="btn-buy" class="bg-white p-2 rounded flex flex-col items-center shadow-sm active:scale-95"><span class="text-xl">🛒</span><span class="text-[10px] font-bold">Mua hàng</span></button>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-slate-600 text-xs uppercase">NHÂN SỰ (${employees.length})</h3>
                    ${isAdmin ? `<button onclick="window.HR_Action.addEmp()" class="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold shadow">+ THÊM NV</button>` : ''}
                </div>
                <div class="space-y-2">
                    ${employees.map((e,i) => {
                        const nameEnc = encodeURIComponent(e.name);
                        return `<div id="emp-${e._id}" class="bg-white p-3 rounded border shadow-sm flex justify-between items-center">
                            <div class="flex gap-2 items-center">
                                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border relative">
                                    ${e.name.charAt(0)}
                                    ${i<3?`<i class="fas fa-crown absolute -top-1 -right-1 text-[10px] ${i===0?'text-yellow-500':(i===1?'text-slate-400':'text-orange-400')}"></i>`:''}
                                </div>
                                <div><div class="font-bold text-xs">${e.name}</div><div class="text-[9px] text-slate-400">Điểm: <b id="score-${e._id}">${e.score||0}</b></div></div>
                            </div>
                            <div class="flex gap-1 items-center">
                                ${isAdmin?`<button onclick="window.HR_Action.score('${e._id}','${nameEnc}',10,'${adminEnc}')" class="w-6 h-6 bg-green-100 text-green-700 font-bold rounded flex items-center justify-center text-xs">+</button>
                                <button onclick="window.HR_Action.score('${e._id}','${nameEnc}',-10,'${adminEnc}')" class="w-6 h-6 bg-red-100 text-red-700 font-bold rounded flex items-center justify-center text-xs">-</button>
                                <button onclick="window.HR_Action.delEmp('${e._id}', '${nameEnc}')" class="ml-1 text-slate-300 hover:text-red-500"><i class="fas fa-trash-alt"></i></button>`:''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <div class="bg-white border rounded-xl h-80 flex flex-col shadow-sm mt-4">
                <div class="p-2 border-b font-bold text-xs bg-slate-50 text-center">THẢO LUẬN TEAM</div>
                <div id="chat-list" class="flex-1 overflow-y-auto p-2 space-y-2 flex flex-col-reverse bg-slate-50">
                    ${chats.map(m => {
                        const isMe = m.user === user.name;
                        const isSys = m.type === 'NOTIFY';
                        if(isSys) return `<div class="text-center"><span class="text-[9px] bg-gray-200 px-2 py-1 rounded-full text-gray-500">${m.message}</span></div>`;
                        return `<div class="flex ${isMe?'justify-end':'justify-start'}"><div class="max-w-[80%] ${isMe?'bg-blue-500 text-white':'bg-white border text-slate-700'} px-2 py-1 rounded text-xs"><div class="font-bold text-[9px] opacity-70">${m.user}</div>${m.message}</div></div>`;
                    }).join('')}
                </div>
                <div class="p-2 border-t flex gap-2 bg-white"><input id="chat-msg" class="flex-1 p-1 border rounded text-xs" placeholder="Tin nhắn..."><button id="chat-send" class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center"><i class="fas fa-paper-plane text-xs"></i></button></div>
            </div>
        </div>`;

        // GẮN SỰ KIỆN NÚT BẤM (Cho Chat, Chấm công, Nghỉ phép...)
        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            const b1 = document.getElementById('btn-checkin'); if(b1) b1.onclick = async () => { if(confirm("Xác nhận chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: "Đã chấm công", to: 'ADMIN', by: user.name, type: 'CHECKIN', status: 'DONE', time: Date.now() }); window.HR_Action.chat("HỆ THỐNG", `📍 ${user.name} đã chấm công`, true); Utils.toast("✅ Đã chấm công!"); } };
            const b2 = document.getElementById('btn-leave'); if(b2) b2.onclick = () => { Utils.modal("Xin Nghỉ", `<div class="space-y-2"><input id="l-r" class="w-full p-2 border rounded text-xs" placeholder="Lý do..."><div class="flex gap-2"><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1" placeholder="Số ngày"></div></div>`, [{id:'s-ok',text:'Gửi'}]); setTimeout(() => { document.getElementById('l-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const r=document.getElementById('l-r').value, d=document.getElementById('l-d').value, n=document.getElementById('l-n').value; if(r&&d&&n) { sendReq(`Nghỉ ${n} ngày (${new Date(d).toLocaleDateString('vi-VN')}): ${r}`, "LEAVE"); Utils.modal(null); } }; }, 100); };
            const b3 = document.getElementById('btn-buy'); if(b3) b3.onclick = () => { Utils.modal("Mua Hàng", `<div class="space-y-2"><input id="b-n" class="w-full p-2 border rounded text-xs" placeholder="Tên món..."><div class="flex gap-2"><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1" placeholder="SL"><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div>`, [{id:'s-ok',text:'Gửi'}]); setTimeout(() => { document.getElementById('b-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const n=document.getElementById('b-n').value, q=document.getElementById('b-q').value, d=document.getElementById('b-d').value; if(n&&q&&d) { sendReq(`Mua ${q} ${n} (Cần ${new Date(d).toLocaleDateString('vi-VN')})`, "BUY"); Utils.modal(null); } }; }, 100); };
            const sendChat = async () => { const m=document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            const chatSendBtn = document.getElementById('chat-send'); if(chatSendBtn) chatSendBtn.onclick = sendChat;
            const chatMsgInp = document.getElementById('chat-msg'); if(chatMsgInp) chatMsgInp.onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
