import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch, getDocs, query, where } from '../config.js';
import { Utils } from '../utils.js';

// --- 1. HỆ THỐNG XỬ LÝ LOGIC (Action) ---
window.HR_Action = {
    // Chat & Log
    chat: async (user, msg, isSystem = false) => {
        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), {
                user: user,
                message: msg,
                time: Date.now(),
                type: isSystem ? 'NOTIFY' : 'CHAT'
            });
        } catch (e) { console.error(e); }
    },

    // Chấm điểm
    score: async (id, name, val, adminName) => {
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm cho ${name}?`);
        if (reason) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
                Utils.toast("Đã cập nhật điểm!");
                window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val > 0 ? 'THƯỞNG' : 'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
            } catch (e) { alert(e.message); }
        }
    },

    // Nhắc nhở
    remind: async (name, title, type) => {
        Utils.toast(`Đã nhắc ${name}!`);
        const msg = type === 'ACCEPT' 
            ? `🔔 Nhắc @${name} nhận việc: "${decodeURIComponent(title)}"` 
            : `⏰ Nhắc @${name} báo cáo: "${decodeURIComponent(title)}"`;
        window.HR_Action.chat("NHẮC NHỞ", msg, true);
    },

    // Duyệt đơn
    approve: async (id, titleEncoded, user, admin, isOk) => {
        const title = decodeURIComponent(titleEncoded);
        if (confirm(isOk ? `Duyệt đơn "${title}"?` : `Từ chối đơn "${title}"?`)) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
                Utils.toast("Đã xử lý!");
                const statusText = isOk ? "✅ ĐÃ DUYỆT" : "❌ TỪ CHỐI";
                window.HR_Action.chat("HỆ THỐNG", `${statusText} đơn: "${title}" của ${user} (bởi ${admin})`, true);
            } catch (e) { alert("Lỗi: " + e.message); }
        }
    },

    // Thao tác Task (Việc làm)
    task: {
        // Xóa việc: Xóa xong ẩn luôn dòng đó để không cần reload
        del: async (id) => {
            if (confirm("Bạn chắc chắn muốn xóa việc này?")) {
                try {
                    await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id));
                    const el = document.getElementById(`task-${id}`);
                    if (el) el.remove();
                    Utils.toast("Đã xóa!");
                } catch (e) { alert(e.message); }
            }
        },
        // Nhận việc
        accept: async (id, t, u) => {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' });
            window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN: "${decodeURIComponent(t)}"`, true);
        },
        // Báo cáo xong (Tính điểm: 10 / Tổng đầu việc trong ngày)
        finish: async (id, t, u, uid) => {
            try {
                // 1. Lấy việc trong ngày
                const start = new Date(); start.setHours(0,0,0,0);
                const q = query(collection(db, `${ROOT_PATH}/tasks`), where("to", "==", uid), where("time", ">=", start.getTime()));
                const snap = await getDocs(q);
                
                // 2. Tính điểm
                const count = snap.docs.filter(d => d.data().type === 'TASK').length || 1;
                const points = Math.round((10 / count) * 10) / 10;

                // 3. Cập nhật
                const batch = writeBatch(db);
                batch.update(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
                batch.update(doc(db, `${ROOT_PATH}/employees`, uid), { score: increment(points) });
                await batch.commit();

                window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} đã XONG: "${decodeURIComponent(t)}" (+${points}đ)`, true);
                Utils.toast(`Đã xong! Cộng ${points} điểm.`);
            } catch (e) { alert("Lỗi: " + e.message); }
        }
    }
};

// --- 2. GIAO DIỆN (Render) ---
export const HR = {
    // === TAB VIỆC ===
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const houses = Array.isArray(data.houses) ? data.houses : [];

        // HTML Khung Giao Việc
        const adminForm = isAdmin ? `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-4">
                <h3 class="font-black text-blue-600 text-xs uppercase mb-3"><i class="fas fa-paper-plane"></i> GIAO VIỆC NHANH</h3>
                <input id="t-t" placeholder="Nội dung công việc..." class="w-full p-3 rounded-lg border border-slate-200 text-sm mb-3 focus:border-blue-500 outline-none">
                <div class="flex gap-2 mb-3">
                    <select id="t-area" class="w-1/2 p-2 rounded-lg border border-slate-200 text-xs font-bold"><option value="">-- Khu vực --</option>${houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}<option value="Khác">Khác</option></select>
                    <input type="date" id="t-date" class="w-1/2 p-2 rounded-lg border border-slate-200 text-xs font-bold">
                </div>
                <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 text-blue-600"><input type="checkbox" id="check-all"> Chọn tất cả</label>
                    ${employees.map(e => `<label class="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}
                </div>
                <button id="btn-tsk" class="w-full bg-blue-600 text-white rounded-lg py-3 text-xs font-bold shadow-md shadow-blue-200 active:scale-95 transition">GỬI YÊU CẦU</button>
            </div>` : '';

        c.innerHTML = `
            <div class="space-y-4 pb-24">
                ${adminForm}
                <div>
                    <div class="flex justify-between items-center mb-2 px-1">
                        <h2 class="font-black text-slate-700 text-sm uppercase">NHẬT KÝ</h2>
                        <select id="filter-emp" class="text-[10px] border rounded p-1 bg-white"><option value="ALL">Tất cả</option>${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}</select>
                    </div>
                    <div id="lst" class="space-y-3"></div>
                </div>
            </div>`;

        // Logic Render Danh sách việc
        const renderList = () => {
            const fid = document.getElementById('filter-emp').value;
            let list = tasks.filter(t => !t.type || t.type === 'TASK');
            if (fid !== 'ALL') list = list.filter(t => t.to === fid);
            if (!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);
            list.sort((a, b) => b.time - a.time);

            document.getElementById('lst').innerHTML = list.length ? list.map(t => {
                const isDone = t.status === 'DONE';
                const empName = employees.find(e => e._id === t.to)?.name || '...';
                const titleEnc = encodeURIComponent(t.title);
                
                let btns = '';
                if (isAdmin) {
                    btns = `<div class="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <button onclick="window.HR_Action.task.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>
                        ${!isDone ? `<button onclick="window.HR_Action.remind('${empName}','${titleEnc}','${t.status === 'PENDING' ? 'ACCEPT' : 'REPORT'}')" class="text-[9px] bg-yellow-50 text-yellow-600 px-2 py-1 rounded border border-yellow-200">${t.status === 'PENDING' ? '🔔 Nhắc' : '⏰ Báo cáo'}</button>` : ''}
                    </div>`;
                }

                let userAction = '';
                if (!isDone && t.to === user._id) {
                    userAction = t.status !== 'DOING'
                        ? `<button onclick="window.HR_Action.task.accept('${t.id}','${titleEnc}','${user.name}')" class="w-full mt-2 py-2 bg-blue-100 text-blue-700 font-bold text-[10px] rounded hover:bg-blue-200">NHẬN VIỆC</button>`
                        : `<button onclick="window.HR_Action.task.finish('${t.id}','${titleEnc}','${user.name}','${user._id}')" class="w-full mt-2 py-2 bg-green-100 text-green-700 font-bold text-[10px] rounded hover:bg-green-200">BÁO CÁO XONG</button>`;
                }

                return `
                <div id="task-${t.id}" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative ${isDone ? 'opacity-60 bg-slate-50' : ''}">
                    <div class="pr-8">
                        <span class="text-xs font-bold text-slate-700 block ${isDone ? 'line-through' : ''}">${t.area ? `[${t.area}] ` : ''}${t.title}</span>
                        <span class="text-[10px] text-slate-400 mt-1 block">Người làm: <b>${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                    </div>
                    ${btns} ${userAction}
                </div>`;
            }).join('') : '<div class="text-center text-slate-300 italic text-xs py-10">Chưa có công việc</div>';
        };

        // Gắn sự kiện (Expanded để tránh lỗi cú pháp)
        setTimeout(() => {
            renderList();
            const dIn = document.getElementById('t-date');
            if (dIn) dIn.valueAsDate = new Date();
            
            const fSel = document.getElementById('filter-emp');
            if (fSel) fSel.onchange = renderList;
            
            const chkAll = document.getElementById('check-all');
            if (chkAll) {
                chkAll.onchange = (e) => {
                    document.querySelectorAll('.ec').forEach(cb => cb.checked = e.target.checked);
                };
            }

            const btnTsk = document.getElementById('btn-tsk');
            if (btnTsk) {
                btnTsk.onclick = async () => {
                    const title = document.getElementById('t-t').value;
                    const area = document.getElementById('t-area').value;
                    const chk = document.querySelectorAll('.ec:checked');
                    
                    if (title && chk.length) {
                        try {
                            const batch = writeBatch(db);
                            const names = [];
                            chk.forEach(c => {
                                const ref = doc(collection(db, `${ROOT_PATH}/tasks`));
                                batch.set(ref, {
                                    title: title,
                                    area: area,
                                    to: c.value,
                                    by: user.name,
                                    status: 'PENDING',
                                    time: Date.now(),
                                    type: 'TASK'
                                });
                                names.push(c.getAttribute('data-name'));
                            });
                            await batch.commit();
                            window.HR_Action.chat(user.name, `📢 Đã giao: "${title}" ${area ? `tại ${area}` : ''} cho ${names.join(', ')}`, true);
                            Utils.toast("Đã giao!");
                            renderList();
                            document.getElementById('t-t').value = '';
                        } catch (e) { alert(e.message); }
                    } else { Utils.toast("Thiếu thông tin!", "err"); }
                };
            }
        }, 200);
    },

    // === TAB TEAM ===
    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a, b) => (b.score || 0) - (a.score || 0));
        const chats = Array.isArray(data.chat) ? data.chat.sort((a, b) => b.time - a.time).slice(0, 30) : [];
        
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));
        const top3 = employees.slice(0, 3);

        // Tạo HTML Top 3
        let top3HTML = '';
        if (top3[1]) top3HTML += `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full border-2 border-slate-300 bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-sm mb-1">${top3[1].name.charAt(0)}</div><div class="h-16 w-14 bg-slate-200 rounded-t-lg flex flex-col justify-end pb-2 border-t-4 border-slate-400"><span class="text-[10px] font-bold text-slate-600">${top3[1].score}đ</span><span class="text-[20px]">🥈</span></div><div class="text-[9px] font-bold text-slate-500 mt-1 truncate w-14">${top3[1].name}</div></div>`;
        if (top3[0]) top3HTML += `<div class="flex flex-col items-center z-10"><div class="w-12 h-12 rounded-full border-2 border-yellow-400 bg-yellow-100 flex items-center justify-center font-bold text-yellow-600 text-sm shadow-md mb-1 relative">${top3[0].name.charAt(0)}<i class="fas fa-crown absolute -top-3 text-yellow-500 text-xs animate-bounce"></i></div><div class="h-20 w-16 bg-yellow-100 rounded-t-lg flex flex-col justify-end pb-2 border-t-4 border-yellow-400 shadow-lg"><span class="text-xs font-black text-yellow-700">${top3[0].score}đ</span><span class="text-[24px]">🥇</span></div><div class="text-[10px] font-bold text-yellow-700 mt-1 truncate w-16">${top3[0].name}</div></div>`;
        if (top3[2]) top3HTML += `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full border-2 border-orange-300 bg-orange-50 flex items-center justify-center font-bold text-orange-600 text-xs shadow-sm mb-1">${top3[2].name.charAt(0)}</div><div class="h-12 w-14 bg-orange-100 rounded-t-lg flex flex-col justify-end pb-2 border-t-4 border-orange-400"><span class="text-[10px] font-bold text-orange-700">${top3[2].score}đ</span><span class="text-[20px]">🥉</span></div><div class="text-[9px] font-bold text-slate-500 mt-1 truncate w-14">${top3[2].name}</div></div>`;

        // Tạo HTML Duyệt Đơn
        let pendingHTML = '';
        if (isAdmin && pending.length) {
            pendingHTML = `
            <div class="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm animate-pulse-slow">
                <h3 class="font-black text-red-600 text-xs uppercase mb-3 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pending.length})</h3>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${pending.map(t => `
                        <div class="bg-white p-3 rounded-lg shadow-sm border border-red-100 flex justify-between items-center">
                            <div><div class="text-[10px] font-bold text-slate-500">${t.by} • ${t.type}</div><div class="text-xs font-bold text-slate-800 line-clamp-1">${t.title}</div></div>
                            <div class="flex gap-2">
                                <button onclick="window.HR_Action.approve('${t.id}','${encodeURIComponent(t.title)}','${t.by}','${user.name}',true)" class="bg-green-100 text-green-700 w-8 h-8 rounded-full font-bold flex items-center justify-center">✓</button>
                                <button onclick="window.HR_Approve.approve('${t.id}','${encodeURIComponent(t.title)}','${t.by}','${user.name}',false)" class="bg-red-100 text-red-700 w-8 h-8 rounded-full font-bold flex items-center justify-center">✕</button>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;
        }

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${pendingHTML}

            <div class="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-xl border border-yellow-200 shadow-sm text-center relative overflow-hidden">
                <div class="absolute top-0 right-0 p-2 opacity-10"><i class="fas fa-trophy text-6xl text-yellow-500"></i></div>
                <h3 class="font-black text-yellow-600 text-xs uppercase mb-4 tracking-widest">🏆 TOP 3 XUẤT SẮC</h3>
                <div class="flex justify-center items-end gap-2">${top3HTML || '<div class="text-xs italic text-slate-400">Chưa có dữ liệu</div>'}</div>
            </div>

            <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl shadow-lg text-white">
                <h3 class="font-bold text-xs uppercase mb-3 opacity-80 text-center tracking-widest">Tiện ích</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button id="btn-checkin" class="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/10 transition"><div class="text-2xl">📍</div><span class="text-[10px] font-bold">Chấm công</span></button>
                    <button id="btn-leave" class="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/10 transition"><div class="text-2xl">📝</div><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                    <button id="btn-buy" class="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/10 transition"><div class="text-2xl">🛒</div><span class="text-[10px] font-bold">Mua hàng</span></button>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-80 flex flex-col">
                <div class="bg-slate-100 p-2 border-b font-bold text-xs text-slate-600 uppercase">💬 THẢO LUẬN TEAM</div>
                <div class="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 flex flex-col-reverse">
                    ${chats.map(msg => {
                        const isMe = msg.user === user.name;
                        const isSys = msg.type === 'NOTIFY';
                        if (isSys) return `<div class="flex justify-center"><span class="text-[9px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-center border border-gray-300 max-w-[90%]">${msg.message}</span></div>`;
                        return `<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}"><div class="max-w-[80%] ${isMe ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'} px-3 py-2 rounded-xl shadow-sm text-xs relative"><div class="font-bold ${isMe ? 'text-blue-100' : 'text-blue-600'} text-[9px] mb-0.5">${msg.user}</div>${msg.message}</div><span class="text-[8px] text-slate-400 mt-1 mx-1">${new Date(msg.time).toLocaleTimeString('vi-VN').slice(0, 5)}</span></div>`;
                    }).join('')}
                </div>
                <div class="p-2 border-t bg-white flex gap-2"><input id="chat-msg" class="flex-1 p-2 border rounded-full text-xs outline-none bg-slate-50" placeholder="Nhập tin..."><button id="chat-send" class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm"><i class="fas fa-paper-plane text-xs"></i></button></div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">DANH SÁCH NHÂN VIÊN</h2>
                <div class="space-y-2">
                    ${employees.map((e, index) => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-200 transition relative overflow-hidden">
                        ${index < 3 ? `<div class="absolute -left-3 -top-3 w-8 h-8 ${index === 0 ? 'bg-yellow-400' : (index === 1 ? 'bg-slate-300' : 'bg-orange-300')} rotate-45"></div>` : ''}
                        <div class="flex items-center gap-3 pl-2">
                            <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-500 border border-slate-200 text-xs">${index + 1}</div>
                            <div><div class="font-bold text-slate-700 text-sm flex items-center gap-1">${e.name}</div><div class="text-[9px] text-slate-400 font-bold uppercase">${e.role || 'NV'}</div></div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="font-black text-lg ${e.score >= 0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div>
                            ${isAdmin ? `<div class="flex flex-col gap-1"><button onclick="window.HR_Action.score('${e._id}','${e.name}',10,'${user.name}')" class="w-6 h-6 bg-green-50 text-green-600 rounded flex items-center justify-center font-bold text-xs shadow-sm">+</button><button onclick="window.HR_Action.score('${e._id}','${e.name}',-10,'${user.name}')" class="w-6 h-6 bg-red-50 text-red-600 rounded flex items-center justify-center font-bold text-xs shadow-sm">-</button></div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: t, to: 'ADMIN', by: user.name, type, status: 'PENDING', time: Date.now() }); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            const b1 = document.getElementById('btn-checkin'); if (b1) b1.onclick = () => { if (confirm("Xác nhận chấm công?")) sendReq("Đã chấm công", "CHECKIN"); };
            const b2 = document.getElementById('btn-leave'); if (b2) b2.onclick = () => { Utils.modal("Xin Nghỉ", `<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Lý do</label><input id="l-r" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Từ ngày</label><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Số ngày</label><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1"></div></div></div>`, [{ id: 's-ok', text: 'Gửi' }]); setTimeout(() => { document.getElementById('l-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const r = document.getElementById('l-r').value, d = document.getElementById('l-d').value, n = document.getElementById('l-n').value; if (r && d && n) { sendReq(`Nghỉ ${n} ngày (từ ${new Date(d).toLocaleDateString('vi-VN')}): ${r}`, "LEAVE"); Utils.modal(null); } else alert("Thiếu tin!"); } }, 100) };
            const b3 = document.getElementById('btn-buy'); if (b3) b3.onclick = () => { Utils.modal("Mua Hàng", `<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Tên món</label><input id="b-n" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">SL</label><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Cần ngày</label><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div></div>`, [{ id: 's-ok', text: 'Gửi' }]); setTimeout(() => { document.getElementById('b-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const n = document.getElementById('b-n').value, q = document.getElementById('b-q').value, d = document.getElementById('b-d').value; if (n && q && d) { sendReq(`Mua ${q} ${n} (cần ${new Date(d).toLocaleDateString('vi-VN')})`, "BUY"); Utils.modal(null); } else alert("Thiếu tin!"); } }, 100) };
            
            const sendChat = async () => { const m = document.getElementById('chat-msg').value; if (m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value = ''; } };
            document.getElementById('chat-send').onclick = sendChat;
            document.getElementById('chat-msg').onkeypress = (e) => { if (e.key === 'Enter') sendChat(); };
        }, 100);
    }
};
