import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch, getDocs, query, where } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG XỬ LÝ (Global Action) ---
window.HR_Action = {
    // 1. Chat
    chat: async (user, msg, isSystem = false) => {
        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' });
        } catch (e) { console.error(e); }
    },

    // 2. Chấm điểm thủ công
    score: async (id, nameEnc, val, adminEnc) => {
        const name = decodeURIComponent(nameEnc);
        const adminName = decodeURIComponent(adminEnc);
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm cho ${name}?`);
        if (reason) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
                Utils.toast("Đã cập nhật!");
                window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val > 0 ? 'THƯỞNG' : 'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
            } catch (e) { alert(e.message); }
        }
    },

    // 3. NHẮC NHỞ & PHẠT ĐIỂM (Nhận -1, Báo cáo -5)
    remind: async (empId, nameEnc, titleEnc, type) => {
        const name = decodeURIComponent(nameEnc);
        const title = decodeURIComponent(titleEnc);
        const penalty = type === 'ACCEPT' ? -1 : -5;
        const msgType = type === 'ACCEPT' ? 'nhận việc' : 'báo cáo';
        
        try {
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, empId), { score: increment(penalty) });
            Utils.toast(`Đã nhắc và trừ ${Math.abs(penalty)} điểm!`);
            window.HR_Action.chat("NHẮC NHỞ", `⚠️ Nhắc @${name} ${msgType}: "${title}" (Phạt ${penalty}đ)`, true);
        } catch(e) { alert(e.message); }
    },

    // 4. DUYỆT ĐƠN
    approve: async (id, titleEnc, userEnc, adminEnc, isOk) => {
        const title = decodeURIComponent(titleEnc);
        const user = decodeURIComponent(userEnc);
        const admin = decodeURIComponent(adminEnc);
        
        if (confirm(isOk ? `Duyệt đơn "${title}"?` : `Từ chối?`)) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
                Utils.toast("Đã xử lý!");
                window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user} (bởi ${admin})`, true);
            } catch(e) { alert(e.message); }
        }
    },

    // 5. TASK
    task: {
        del: async (id) => {
            if (confirm("Xóa việc này?")) {
                try {
                    await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id));
                    const el = document.getElementById(`task-${id}`);
                    if (el) el.remove();
                    Utils.toast("Đã xóa!");
                } catch (e) { alert(e.message); }
            }
        },
        accept: async (id, tEnc, u) => {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' });
            window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN: "${decodeURIComponent(tEnc)}"`, true);
        },
        finish: async (id, tEnc, u, uid) => {
            try {
                // Yêu cầu Index trên Firebase
                const start = new Date(); start.setHours(0,0,0,0);
                const q = query(collection(db, `${ROOT_PATH}/tasks`), where("to", "==", uid), where("time", ">=", start.getTime()));
                const snap = await getDocs(q);
                
                const count = snap.docs.filter(d => d.data().type === 'TASK').length || 1;
                const points = Math.round((10 / count) * 10) / 10;

                const batch = writeBatch(db);
                batch.update(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
                batch.update(doc(db, `${ROOT_PATH}/employees`, uid), { score: increment(points) });
                await batch.commit();

                window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} đã XONG: "${decodeURIComponent(tEnc)}" (+${points}đ)`, true);
                Utils.toast(`Xong! Cộng ${points}đ.`);
            } catch(e) { alert("Lỗi Index: " + e.message); }
        }
    }
};

export const HR = {
    // === TAB 1: GIAO VIỆC ===
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
                <h3 class="font-black text-blue-600 text-xs uppercase mb-3">GIAO VIỆC NHANH</h3>
                <input id="t-t" placeholder="Nội dung..." class="w-full p-2 border rounded mb-2 text-xs">
                <div class="flex gap-2 mb-2">
                    <select id="t-area" class="w-1/2 p-2 border rounded text-xs"><option value="">-- Khu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="Khác">Khác</option></select>
                    <input type="date" id="t-date" class="w-1/2 p-2 border rounded text-xs">
                </div>
                <div class="bg-slate-50 p-2 border rounded max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 text-xs font-bold"><input type="checkbox" id="check-all"> Chọn tất cả</label>
                    ${employees.map(e=>`<label class="flex items-center gap-1 text-xs"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}
                </div>
                <button id="btn-tsk" class="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold">GỬI</button>
            </div>` : ''}
            <div>
                <div class="flex justify-between items-center mb-2 px-1"><h2 class="font-black text-xs uppercase">NHẬT KÝ</h2><select id="filter-emp" class="text-[10px] border rounded p-1"><option value="ALL">Tất cả</option>${employees.map(e=>`<option value="${e._id}">${e.name}</option>`).join('')}</select></div>
                <div id="lst" class="space-y-2"></div>
            </div>
        </div>`;

        const renderList = () => {
            const fid = document.getElementById('filter-emp').value;
            let list = tasks.filter(t => !t.type || t.type === 'TASK');
            if(fid !== 'ALL') list = list.filter(t => t.to === fid);
            if(!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);
            list.sort((a,b) => b.time - a.time);

            document.getElementById('lst').innerHTML = list.length ? list.map(t => {
                const isDone = t.status === 'DONE';
                const emp = employees.find(e=>e._id===t.to);
                const empName = emp?.name || '...';
                const tEnc = encodeURIComponent(t.title);
                const nameEnc = encodeURIComponent(empName);
                
                // Nút Admin
                let adminBtns = '';
                if(isAdmin) {
                    adminBtns = `<div class="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <button onclick="window.HR_Action.task.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>
                        ${!isDone ? `<button onclick="window.HR_Action.remind('${emp._id}','${nameEnc}','${tEnc}','${t.status==='PENDING'?'ACCEPT':'REPORT'}')" class="text-[9px] border px-1 rounded">${t.status==='PENDING'?'🔔 -1đ':'⏰ -5đ'}</button>` : ''}
                    </div>`;
                }

                // Nút User
                let userAction = '';
                if(!isDone && t.to === user._id) {
                    userAction = t.status !== 'DOING' 
                        ? `<button onclick="window.HR_Action.task.accept('${t.id}','${tEnc}','${user.name}')" class="w-full mt-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">NHẬN VIỆC</button>`
                        : `<button onclick="window.HR_Action.task.finish('${t.id}','${tEnc}','${user.name}', '${user._id}')" class="w-full mt-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">BÁO CÁO XONG</button>`;
                }

                return `<div id="task-${t.id}" class="bg-white p-3 rounded border shadow-sm relative ${isDone?'opacity-50':''}">
                    <div class="pr-8"><span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.area?`[${t.area}] `:''}${t.title}</span><span class="text-[10px] text-slate-400">Người làm: <b>${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span></div>
                    ${adminBtns} ${userAction}
                </div>`;
            }).join('') : '<div class="text-center text-slate-400 text-xs py-4">Chưa có dữ liệu</div>';
        };

        setTimeout(()=>{ 
            renderList(); 
            const dIn = document.getElementById('t-date'); if(dIn) dIn.valueAsDate = new Date();
            const fSel = document.getElementById('filter-emp'); if(fSel) fSel.onchange = renderList;
            const chkAll = document.getElementById('check-all'); if(chkAll) chkAll.onchange=(e)=>document.querySelectorAll('.ec').forEach(cb=>cb.checked=e.target.checked);
            
            const btn = document.getElementById('btn-tsk');
            if(btn) btn.onclick = async () => {
                const t=document.getElementById('t-t').value; 
                const a=document.getElementById('t-area').value; 
                const chk=document.querySelectorAll('.ec:checked');
                if(t && chk.length){
                    const batch=writeBatch(db); const names=[];
                    chk.forEach(c=>{
                        const ref=doc(collection(db,`${ROOT_PATH}/tasks`)); 
                        batch.set(ref,{title:t,area:a,to:c.value,by:user.name,status:'PENDING',time:Date.now(),type:'TASK'}); 
                        names.push(c.getAttribute('data-name'));
                    });
                    await batch.commit(); 
                    window.HR_Action.chat(user.name, `📢 Đã giao: "${t}" ${a?`tại ${a}`:''} cho ${names.join(', ')}`, true);
                    Utils.toast("Đã giao!"); renderList(); document.getElementById('t-t').value='';
                } else Utils.toast("Thiếu tin!","err");
            };
        }, 100);
    },

    // === TAB 2: TEAM ===
    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a,b) => (b.score||0) - (a.score||0));
        const chats = Array.isArray(data.chat) ? data.chat.sort((a,b)=>b.time-a.time).slice(0,50) : [];
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY'].includes(t.type));
        
        // Chuẩn bị biến encode cho admin
        const adminEnc = encodeURIComponent(user.name);

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            ${isAdmin && pending.length ? `<div class="bg-red-50 p-3 rounded-lg border border-red-200"><h3 class="font-bold text-red-600 text-xs mb-2">CẦN DUYỆT (${pending.length})</h3><div class="space-y-2 max-h-40 overflow-y-auto">${pending.map(t=>{
                const tEnc=encodeURIComponent(t.title); const uEnc=encodeURIComponent(t.by);
                return `<div class="bg-white p-2 rounded flex justify-between items-center text-xs"><div><b class="text-slate-600">${t.by}</b>: ${t.title}</div><div class="flex gap-1"><button onclick="window.HR_Action.approve('${t.id}','${tEnc}','${uEnc}','${adminEnc}',true)" class="text-green-600 font-bold px-1">OK</button><button onclick="window.HR_Action.approve('${t.id}','${tEnc}','${uEnc}','${adminEnc}',false)" class="text-red-600 font-bold px-1">X</button></div></div>`;
            }).join('')}</div></div>` : ''}

            <div class="grid grid-cols-3 gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <button id="btn-checkin" class="bg-white p-2 rounded flex flex-col items-center shadow-sm"><span class="text-xl">📍</span><span class="text-[10px] font-bold">Chấm công</span></button>
                <button id="btn-leave" class="bg-white p-2 rounded flex flex-col items-center shadow-sm"><span class="text-xl">📝</span><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                <button id="btn-buy" class="bg-white p-2 rounded flex flex-col items-center shadow-sm"><span class="text-xl">🛒</span><span class="text-[10px] font-bold">Mua hàng</span></button>
            </div>

            <div class="bg-white border rounded-xl h-80 flex flex-col shadow-sm">
                <div class="p-2 border-b font-bold text-xs bg-slate-50 text-center">THẢO LUẬN</div>
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

            <div>
                <h3 class="font-bold text-slate-600 text-xs mb-2 uppercase">DANH SÁCH NHÂN VIÊN</h3>
                <div class="space-y-2">
                    ${employees.map((e,i) => {
                        const nameEnc = encodeURIComponent(e.name);
                        return `<div class="bg-white p-3 rounded border shadow-sm flex justify-between items-center"><div class="flex gap-2 items-center"><div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border relative">${e.name.charAt(0)}${i<3?`<i class="fas fa-crown absolute -top-1 -right-1 text-[10px] text-yellow-500"></i>`:''}</div><div><div class="font-bold text-xs">${e.name}</div><div class="text-[9px] text-slate-400">Điểm: <b>${e.score||0}</b></div></div></div>${isAdmin?`<div class="flex gap-1"><button onclick="window.HR_Action.score('${e._id}','${nameEnc}',10,'${adminEnc}')" class="w-6 h-6 bg-green-100 text-green-700 font-bold rounded flex items-center justify-center text-xs">+</button><button onclick="window.HR_Action.score('${e._id}','${nameEnc}',-10,'${adminEnc}')" class="w-6 h-6 bg-red-100 text-red-700 font-bold rounded flex items-center justify-center text-xs">-</button></div>`:''}</div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            
            // Checkin (Auto Done)
            const b1 = document.getElementById('btn-checkin');
            if(b1) b1.onclick = async () => {
                if(confirm("Chấm công?")) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: "Đã chấm công", to: 'ADMIN', by: user.name, type: 'CHECKIN', status: 'DONE', time: Date.now() });
                    window.HR_Action.chat("HỆ THỐNG", `📍 ${user.name} đã chấm công`, true);
                    Utils.toast("✅ Đã chấm công!");
                }
            };

            // HTML Form Popup (Viết thẳng trong JS để tránh lỗi biến global)
            const b2 = document.getElementById('btn-leave');
            if(b2) b2.onclick = () => {
                Utils.modal("Xin Nghỉ", `<div class="space-y-2"><input id="l-r" class="w-full p-2 border rounded text-xs" placeholder="Lý do..."><div class="flex gap-2"><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1" placeholder="Số ngày"></div></div>`, [{id:'s-ok',text:'Gửi'}]);
                setTimeout(() => {
                    document.getElementById('l-d').valueAsDate = new Date();
                    document.getElementById('s-ok').onclick = () => {
                        const r=document.getElementById('l-r').value, d=document.getElementById('l-d').value, n=document.getElementById('l-n').value;
                        if(r&&d&&n) { sendReq(`Nghỉ ${n} ngày (${new Date(d).toLocaleDateString('vi-VN')}): ${r}`, "LEAVE"); Utils.modal(null); }
                    };
                }, 100);
            };

            const b3 = document.getElementById('btn-buy');
            if(b3) b3.onclick = () => {
                Utils.modal("Mua Hàng", `<div class="space-y-2"><input id="b-n" class="w-full p-2 border rounded text-xs" placeholder="Tên món..."><div class="flex gap-2"><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1" placeholder="SL"><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div>`, [{id:'s-ok',text:'Gửi'}]);
                setTimeout(() => {
                    document.getElementById('b-d').valueAsDate = new Date();
                    document.getElementById('s-ok').onclick = () => {
                        const n=document.getElementById('b-n').value, q=document.getElementById('b-q').value, d=document.getElementById('b-d').value;
                        if(n&&q&&d) { sendReq(`Mua ${q} ${n} (Cần ${new Date(d).toLocaleDateString('vi-VN')})`, "BUY"); Utils.modal(null); }
                    };
                }, 100);
            };

            const sendChat = async () => { const m=document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            document.getElementById('chat-send').onclick = sendChat;
            document.getElementById('chat-msg').onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
