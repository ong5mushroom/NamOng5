import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch, getDocs, query, where } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG XỬ LÝ ---
window.HR_Action = {
    // 1. Chat (Giữ nguyên)
    chat: async (user, msg, isSystem = false) => {
        try { await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' }); } catch(e) {}
    },
    // 2. Chấm điểm thủ công
    score: async (id, name, val, adminName) => {
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm?`);
        if(reason) {
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
            Utils.toast("Đã cập nhật!");
            window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val>0?'THƯỞNG':'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
        }
    },
    remind: async (name, title, type) => {
        Utils.toast(`Đã nhắc ${name}!`);
        window.HR_Action.chat("NHẮC NHỞ", type === 'ACCEPT' ? `🔔 Nhắc @${name} nhận việc: "${decodeURIComponent(title)}"` : `⏰ Nhắc @${name} báo cáo: "${decodeURIComponent(title)}"`, true);
    },
    approve: async (id, titleEncoded, user, admin, isOk) => {
        const title = decodeURIComponent(titleEncoded);
        if(confirm(isOk ? `Duyệt đơn "${title}"?` : `Từ chối?`)) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
            Utils.toast("Đã xử lý!");
            window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user} (bởi ${admin})`, true);
        }
    },
    // --- 3. THAO TÁC VIỆC (QUAN TRỌNG) ---
    task: {
        // Xóa việc: Xóa xong thì xóa luôn cái DOM trên màn hình cho nhanh
        del: async (id) => { 
            if(confirm("Xóa việc này?")) {
                await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id));
                const el = document.getElementById(`task-${id}`); // Tìm element
                if(el) el.remove(); // Xóa ngay lập tức
                Utils.toast("Đã xóa!");
            } 
        },
        accept: async (id, t, u) => { 
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); 
            window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN: "${decodeURIComponent(t)}"`, true); 
        },
        // Báo cáo xong: TÍNH ĐIỂM TỰ ĐỘNG (10 / Tổng việc hôm nay)
        finish: async (id, t, u, uid) => { 
            try {
                // 1. Lấy tất cả task của user này trong hôm nay
                const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
                const q = query(collection(db, `${ROOT_PATH}/tasks`), where("to", "==", uid), where("time", ">=", startOfDay.getTime()));
                const snap = await getDocs(q);
                
                // 2. Đếm số lượng task loại 'TASK'
                const totalTasks = snap.docs.filter(d => d.data().type === 'TASK').length || 1;
                
                // 3. Tính điểm (10 / Tổng) - Làm tròn 1 số lẻ
                const points = Math.round((10 / totalTasks) * 10) / 10;

                // 4. Update
                const batch = writeBatch(db);
                batch.update(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
                batch.update(doc(db, `${ROOT_PATH}/employees`, uid), { score: increment(points) });
                await batch.commit();

                window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} đã XONG: "${decodeURIComponent(t)}" (+${points}đ)`, true);
                Utils.toast(`Đã xong! Cộng ${points} điểm.`);
            } catch(e) { alert("Lỗi: " + e.message); }
        }
    }
};

export const HR = {
    // --- RENDER GIAO VIỆC ---
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
            <div class="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <h3 class="font-black text-blue-600 text-xs uppercase mb-3 flex items-center gap-2"><i class="fas fa-paper-plane"></i> GIAO VIỆC NHANH</h3>
                <input id="t-t" placeholder="Nội dung công việc..." class="w-full p-3 rounded-lg border border-slate-200 text-sm mb-3 focus:border-blue-500 outline-none">
                <div class="flex gap-2 mb-3">
                    <select id="t-area" class="w-1/2 p-2 rounded-lg border border-slate-200 text-xs font-bold"><option value="">-- Khu vực --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="Khác">Khác</option></select>
                    <input type="date" id="t-date" class="w-1/2 p-2 rounded-lg border border-slate-200 text-xs font-bold">
                </div>
                <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 text-blue-600"><input type="checkbox" id="check-all"> Chọn tất cả</label>
                    ${employees.map(e=>`<label class="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}
                </div>
                <button id="btn-tsk" class="w-full bg-blue-600 text-white rounded-lg py-3 text-xs font-bold shadow-md shadow-blue-200 active:scale-95 transition">GỬI YÊU CẦU</button>
            </div>` : ''}
            <div><div class="flex justify-between items-center mb-2 px-1"><h2 class="font-black text-slate-700 text-sm uppercase">NHẬT KÝ</h2><select id="filter-emp" class="text-[10px] border rounded p-1 bg-white"><option value="ALL">Tất cả</option>${employees.map(e=>`<option value="${e._id}">${e.name}</option>`).join('')}</select></div><div id="lst" class="space-y-3"></div></div>
        </div>`;

        // Render List Logic
        const renderList = () => {
            const fid = document.getElementById('filter-emp').value;
            let list = tasks.filter(t => !t.type || t.type === 'TASK');
            if(fid !== 'ALL') list = list.filter(t => t.to === fid);
            if(!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);
            list.sort((a,b) => b.time - a.time);

            document.getElementById('lst').innerHTML = list.length ? list.map(t => {
                const isDone = t.status === 'DONE';
                const empName = employees.find(e=>e._id===t.to)?.name || '...';
                const titleEnc = encodeURIComponent(t.title);
                
                // --- ADMIN BUTTONS ---
                let adminBtns = '';
                if(isAdmin) {
                    adminBtns = `<div class="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <button onclick="window.HR_Action.task.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>
                        ${!isDone ? `<button onclick="window.HR_Action.remind('${empName}','${titleEnc}','${t.status==='PENDING'?'ACCEPT':'REPORT'}')" class="text-[9px] bg-yellow-50 text-yellow-600 px-2 py-1 rounded border border-yellow-200">${t.status==='PENDING'?'🔔 Nhắc':'⏰ Báo cáo'}</button>` : ''}
                    </div>`;
                }

                // --- USER BUTTONS ---
                let userAction = '';
                if(!isDone && t.to === user._id) {
                    userAction = t.status !== 'DOING' 
                        ? `<button onclick="window.HR_Action.task.accept('${t.id}','${titleEnc}','${user.name}')" class="w-full mt-2 py-2 bg-blue-100 text-blue-700 font-bold text-[10px] rounded hover:bg-blue-200">NHẬN VIỆC</button>`
                        : `<button onclick="window.HR_Action.task.finish('${t.id}','${titleEnc}','${user.name}', '${user._id}')" class="w-full mt-2 py-2 bg-green-100 text-green-700 font-bold text-[10px] rounded hover:bg-green-200">BÁO CÁO XONG</button>`;
                }

                // Thêm id="task-${t.id}" để dễ tìm và xóa
                return `<div id="task-${t.id}" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative ${isDone?'opacity-60 bg-slate-50':''}">
                    <div class="pr-8"><span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.area?`[${t.area}] `:''}${t.title}</span><span class="text-[10px] text-slate-400 mt-1 block">Người làm: <b>${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span></div>
                    ${adminBtns} ${userAction}
                </div>`;
            }).join('') : '<div class="text-center text-slate-300 italic text-xs py-10">Chưa có công việc nào</div>';
        };

        setTimeout(()=>{ renderList(); const dIn=document.getElementById('t-date'); if(dIn) dIn.valueAsDate=new Date(); const fSel=document.getElementById('filter-emp'); if(fSel) fSel.onchange=renderList; const chkAll=document.getElementById('check-all'); if(chkAll) chkAll.onchange=(e)=>document.querySelectorAll('.ec').forEach(cb=>cb.checked=e.target.checked); const btn=document.getElementById('btn-tsk'); if(btn) btn.onclick=async()=>{const t=document.getElementById('t-t').value; const a=document.getElementById('t-area').value; const chk=document.querySelectorAll('.ec:checked'); if(t&&chk.length){const batch=writeBatch(db); const names=[]; chk.forEach(c=>{const ref=doc(collection(db,`${ROOT_PATH}/tasks`)); batch.set(ref,{title:t,area:a,to:c.value,by:user.name,status:'PENDING',time:Date.now(),type:'TASK'}); names.push(c.getAttribute('data-name'))}); await batch.commit(); window.HR_Action.chat(user.name,`📢 Đã giao: "${t}" ${a?`tại ${a}`:''} cho ${names.join(', ')}`,true); Utils.toast("Đã giao!"); renderList(); document.getElementById('t-t').value='';}else Utils.toast("Thiếu tin!","err")}}}, 200);
    },

    // --- RENDER TEAM (NHÂN SỰ) ---
    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a,b) => (b.score||0) - (a.score||0));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const chats = Array.isArray(data.chat) ? data.chat.sort((a,b)=>b.time-a.time).slice(0,30) : [];
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));
        const top3 = employees.slice(0, 3);

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${isAdmin && pending.length ? `<div class="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm"><h3 class="font-black text-red-600 text-xs uppercase mb-3 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pending.length})</h3><div class="space-y-2 max-h-60 overflow-y-auto">${pending.map(t=>`<div class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center"><div><div class="text-[10px] font-bold text-slate-500">${t.by} • ${t.type}</div><div class="text-xs font-bold text-slate-800">${t.title}</div></div><div class="flex gap-2"><button onclick="window.HR_Approve.approve('${t.id}','${encodeURIComponent(t.title)}','${t.by}','${user.name}',true)" class="bg-green-100 text-green-700 w-8 h-8 rounded-full font-bold flex items-center justify-center">✓</button><button onclick="window.HR_Approve.approve('${t.id}','${encodeURIComponent(t.title)}','${t.by}','${user.name}',false)" class="bg-red-100 text-red-700 w-8 h-8 rounded-full font-bold flex items-center justify-center">✕</button></div></div>`).join('')}</div></div>` : ''}

            <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg text-white">
                <h3 class="font-bold text-xs uppercase mb-4 opacity-80 text-center">Tiện ích</h3>
                <div class="grid grid-cols-3 gap-4">
                    <button id="btn-checkin" class="flex flex-col items-center gap-2 group"><div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition">📍</div><span class="text-[10px] font-bold">Chấm công</span></button>
                    <button id="btn-leave" class="flex flex-col items-center gap-2 group"><div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition">📝</div><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                    <button id="btn-buy" class="flex flex-col items-center gap-2 group"><div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition">🛒</div><span class="text-[10px] font-bold">Mua hàng</span></button>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-80 flex flex-col">
                <div class="bg-slate-100 p-2 border-b font-bold text-xs text-slate-600 uppercase">💬 THẢO LUẬN</div>
                <div class="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 flex flex-col-reverse">
                    ${chats.map(msg => {
                        const isMe = msg.user === user.name;
                        const isSys = msg.type === 'NOTIFY';
                        if(isSys) return `<div class="flex justify-center"><span class="text-[9px] bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-center border border-gray-300 max-w-[90%]">${msg.message}</span></div>`;
                        return `<div class="flex flex-col ${isMe?'items-end':'items-start'}"><div class="max-w-[80%] ${isMe?'bg-blue-500 text-white rounded-br-none':'bg-white text-slate-700 border border-slate-200 rounded-bl-none'} px-3 py-2 rounded-xl shadow-sm text-xs relative"><div class="font-bold ${isMe?'text-blue-100':'text-blue-600'} text-[9px] mb-0.5">${msg.user}</div>${msg.message}</div><span class="text-[8px] text-slate-400 mt-1 mx-1">${new Date(msg.time).toLocaleTimeString('vi-VN').slice(0,5)}</span></div>`;
                    }).join('')}
                </div>
                <div class="p-2 border-t bg-white flex gap-2"><input id="chat-msg" class="flex-1 p-2 border rounded-full text-xs outline-none bg-slate-50" placeholder="Nhập tin..."><button id="chat-send" class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm"><i class="fas fa-paper-plane text-xs"></i></button></div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">ĐỘI NGŨ NHÂN VIÊN</h2>
                <div class="space-y-2">
                    ${employees.map((e,idx) => `<div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200 relative">${e.name.charAt(0)}${idx<3?`<i class="fas fa-crown absolute -top-1 -right-1 text-xs ${idx===0?'text-yellow-500':(idx===1?'text-slate-400':'text-orange-400')}"></i>`:''}</div><div><div class="font-bold text-slate-700 text-sm">${e.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'Nhân viên'}</div></div></div><div class="flex items-center gap-3"><div class="font-black text-lg ${e.score >= 0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div>${isAdmin ? `<div class="flex flex-col gap-1"><button onclick="window.HR_Action.score('${e._id}','${e.name}',10,'${user.name}')" class="w-6 h-6 bg-green-50 text-green-600 rounded flex items-center justify-center font-bold text-xs">+</button><button onclick="window.HR_Action.score('${e._id}','${e.name}',-10,'${user.name}')" class="w-6 h-6 bg-red-50 text-red-600 rounded flex items-center justify-center font-bold text-xs">-</button></div>` : ''}</div></div>`).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            const b1=document.getElementById('btn-checkin'); if(b1) b1.onclick = () => { if(confirm("Xác nhận chấm công?")) sendReq("Đã chấm công", "CHECKIN"); };
            const b2=document.getElementById('btn-leave'); if(b2) b2.onclick=()=>{Utils.modal("Xin Nghỉ",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Lý do</label><input id="l-r" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Từ ngày</label><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Số ngày</label><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1"></div></div></div>`,[{id:'s-ok',text:'Gửi'}]);setTimeout(()=>{document.getElementById('l-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const r=document.getElementById('l-r').value,d=document.getElementById('l-d').value,n=document.getElementById('l-n').value;if(r&&d&&n){sendReq(`Nghỉ ${n} ngày (từ ${new Date(d).toLocaleDateString('vi-VN')}): ${r}`,"LEAVE");Utils.modal(null);}else alert("Thiếu tin!")}},100)};
            const b3=document.getElementById('btn-buy'); if(b3) b3.onclick=()=>{Utils.modal("Mua Hàng",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Tên món</label><input id="b-n" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">SL</label><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Cần ngày</label><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div></div>`,[{id:'s-ok',text:'Gửi'}]);setTimeout(()=>{document.getElementById('b-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const n=document.getElementById('b-n').value,q=document.getElementById('b-q').value,d=document.getElementById('b-d').value;if(n&&q&&d){sendReq(`Mua ${q} ${n} (Cần ngày ${new Date(d).toLocaleDateString('vi-VN')})`,"BUY");Utils.modal(null);}else alert("Thiếu tin!")}},100)};
            
            const sendChat = async () => { const m = document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            document.getElementById('chat-send').onclick = sendChat;
            document.getElementById('chat-msg').onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
