import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch, getDocs, query, where } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG XỬ LÝ (Global Action) ---
window.HR_Action = {
    // 1. Quản lý Nhân sự
    addEmp: async () => {
        const name = prompt("Tên nhân viên mới:");
        if (!name) return;
        const pin = prompt("Mã PIN (4 số):", "1234");
        if (!pin) return;
        const role = prompt("Chức vụ (admin/quản lý/nhân viên):", "nhân viên");
        
        try {
            await addDoc(collection(db, `${ROOT_PATH}/employees`), { name, pin, role: role.toLowerCase(), score: 0 });
            Utils.toast("✅ Đã thêm (Load lại để thấy)!");
            setTimeout(() => window.location.reload(), 1000); 
        } catch(e) { alert("Lỗi: " + e.message); }
    },

    delEmp: async (id, name) => {
        if(confirm(`⚠️ XÓA VĨNH VIỄN ${name}?`)) {
            // Xóa ngay trên giao diện để cảm giác nhanh
            const el = document.getElementById(`emp-${id}`); if(el) el.remove();
            
            try {
                await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id));
                Utils.toast("🗑️ Đã xóa!");
            } catch(e) { alert("Lỗi server: " + e.message); }
        }
    },

    // 2. Chat
    chat: async (user, msg, isSystem = false) => {
        // Hiện tin nhắn ngay lập tức (giả lập)
        if(!isSystem) {
            const chatList = document.getElementById('chat-list');
            if(chatList) {
                chatList.innerHTML = `<div class="flex justify-end"><div class="max-w-[80%] bg-blue-500 text-white px-2 py-1 rounded text-xs"><div class="font-bold text-[9px] opacity-70">Tôi</div>${msg}</div></div>` + chatList.innerHTML;
            }
        }
        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' });
        } catch (e) { console.error(e); }
    },

    // 3. Chấm điểm
    score: async (id, nameEnc, val, adminEnc) => {
        const name = decodeURIComponent(nameEnc);
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm cho ${name}?`);
        if(reason) {
            // Cập nhật số điểm trên giao diện NGAY LẬP TỨC
            const scoreEl = document.getElementById(`score-${id}`);
            if(scoreEl) {
                const current = parseInt(scoreEl.innerText) || 0;
                scoreEl.innerText = current + val;
                // Hiệu ứng nháy màu
                scoreEl.style.color = val > 0 ? '#16a34a' : '#dc2626';
                setTimeout(() => scoreEl.style.color = '', 1000);
            }
            Utils.toast("Đã cập nhật điểm!");

            // Gửi lên server sau
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
            window.HR_Action.chat("HỆ THỐNG", `⚖️ Admin đã ${val>0?'THƯỞNG':'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
        }
    },

    // 4. Nhắc nhở & Phạt
    remind: async (empId, nameEnc, titleEnc, type) => {
        const name = decodeURIComponent(nameEnc); const title = decodeURIComponent(titleEnc); const penalty = type === 'ACCEPT' ? -1 : -5;
        // Trừ điểm ngay trên giao diện (nếu đang xem team)
        const scoreEl = document.getElementById(`score-${empId}`);
        if(scoreEl) scoreEl.innerText = (parseInt(scoreEl.innerText)||0) + penalty;

        try { 
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, empId), { score: increment(penalty) }); 
            Utils.toast(`Đã phạt ${Math.abs(penalty)} điểm!`); 
            window.HR_Action.chat("NHẮC NHỞ", `⚠️ Nhắc @${name} ${type==='ACCEPT'?'nhận việc':'báo cáo'}: "${title}" (Phạt ${penalty}đ)`, true); 
        } catch(e) { alert(e.message); }
    },

    // 5. Duyệt đơn
    approve: async (id, titleEnc, userEnc, isOk) => {
        const title = decodeURIComponent(titleEnc); const user = decodeURIComponent(userEnc);
        if(confirm(isOk ? `Duyệt "${title}"?` : `Từ chối?`)) {
            // Ẩn đơn ngay lập tức
            const el = document.getElementById(`task-${id}`); if(el) el.remove();
            
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
            Utils.toast("Đã xử lý!"); 
            window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user}`, true);
        }
    },

    // 6. TASK (QUAN TRỌNG: Cập nhật UI ngay lập tức)
    task: {
        del: async (id) => { 
            if(confirm("Xóa việc này?")) { 
                // XÓA NGAY TRÊN MÀN HÌNH
                const el = document.getElementById(`task-${id}`); if(el) el.remove();
                Utils.toast("Đã xóa!"); 
                await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); 
            } 
        },
        accept: async (id, tEnc, u) => { 
            // ĐỔI NÚT NGAY LẬP TỨC
            const btn = document.getElementById(`btn-act-${id}`);
            if(btn) {
                btn.innerText = "BÁO CÁO XONG";
                btn.className = "w-full mt-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded";
                btn.onclick = () => window.HR_Action.task.finish(id, tEnc, u, 'MY_ID_PLACEHOLDER'); // Logic tạm
                Utils.toast("Đã nhận việc!");
            }
            
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); 
            window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN: "${decodeURIComponent(tEnc)}"`, true); 
        },
        finish: async (id, tEnc, u, uid) => { 
            // BIẾN MẤT KHỎI MÀN HÌNH NGAY LẬP TỨC
            const el = document.getElementById(`task-${id}`); 
            if(el) {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 300); // Hiệu ứng mờ dần
            }
            Utils.toast(`Đã xong! Cộng điểm...`);
            
            try {
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
            } catch(e) { console.log("Lỗi index ngầm, nhưng UI đã update"); }
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks'); if (!c || c.classList.contains('hidden')) return;
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const houses = Array.isArray(data.houses) ? data.houses : [];

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `<div class="bg-white p-4 rounded-xl shadow-sm border border-blue-100"><h3 class="font-black text-blue-600 text-xs uppercase mb-3">GIAO VIỆC</h3><input id="t-t" placeholder="Nội dung..." class="w-full p-2 border rounded mb-2 text-xs"><div class="flex gap-2 mb-2"><select id="t-area" class="w-1/2 p-2 border rounded text-xs"><option value="">-- Khu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="Khác">Khác</option></select><input type="date" id="t-date" class="w-1/2 p-2 border rounded text-xs"></div><div class="bg-slate-50 p-2 border rounded max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3"><label class="col-span-2 text-xs font-bold"><input type="checkbox" id="check-all"> Chọn tất cả</label>${employees.map(e=>`<label class="flex items-center gap-1 text-xs"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}</div><button id="btn-tsk" class="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold">GỬI</button></div>` : ''}
            <div><div class="flex justify-between items-center mb-2 px-1"><h2 class="font-black text-xs uppercase">NHẬT KÝ</h2><select id="filter-emp" class="text-[10px] border rounded p-1"><option value="ALL">Tất cả</option>${employees.map(e=>`<option value="${e._id}">${e.name}</option>`).join('')}</select></div><div id="lst" class="space-y-2"></div></div>
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
                
                let btns = '';
                if(isAdmin) btns = `<div class="absolute top-2 right-2 flex flex-col items-end gap-1"><button onclick="window.HR_Action.task.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>${!isDone ? `<button onclick="window.HR_Action.remind('${emp?._id}','${nameEnc}','${tEnc}','${t.status==='PENDING'?'ACCEPT':'REPORT'}')" class="text-[9px] border px-1 rounded">${t.status==='PENDING'?'🔔 -1đ':'⏰ -5đ'}</button>` : ''}</div>`;
                
                let userAction = '';
                if(!isDone && t.to === user._id) userAction = t.status !== 'DOING' ? `<button id="btn-act-${t.id}" onclick="window.HR_Action.task.accept('${t.id}','${tEnc}','${user.name}')" class="w-full mt-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">NHẬN VIỆC</button>` : `<button id="btn-act-${t.id}" onclick="window.HR_Action.task.finish('${t.id}','${tEnc}','${user.name}', '${user._id}')" class="w-full mt-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">BÁO CÁO XONG</button>`;

                return `<div id="task-${t.id}" class="bg-white p-3 rounded border shadow-sm relative ${isDone?'opacity-50':''}">
                    <div class="pr-8"><span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.area?`[${t.area}] `:''}${t.title}</span><span class="text-[10px] text-slate-400">Người làm: <b>${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span></div>
                    ${btns} ${userAction}
                </div>`;
            }).join('') : '<div class="text-center text-slate-400 text-xs py-4">Chưa có dữ liệu</div>';
        };

        setTimeout(()=>{ 
            renderList(); const dIn=document.getElementById('t-date'); if(dIn) dIn.valueAsDate=new Date();
            const fSel=document.getElementById('filter-emp'); if(fSel) fSel.onchange=renderList;
            const chkAll=document.getElementById('check-all'); if(chkAll) chkAll.onchange=(e)=>document.querySelectorAll('.ec').forEach(cb=>cb.checked=e.target.checked);
            const btn=document.getElementById('btn-tsk'); if(btn) btn.onclick=async()=>{const t=document.getElementById('t-t').value; const a=document.getElementById('t-area').value; const chk=document.querySelectorAll('.ec:checked'); if(t && chk.length){const batch=writeBatch(db); const names=[]; chk.forEach(c=>{const ref=doc(collection(db,`${ROOT_PATH}/tasks`)); batch.set(ref,{title:t,area:a,to:c.value,by:user.name,status:'PENDING',time:Date.now(),type:'TASK'}); names.push(c.getAttribute('data-name'));}); await batch.commit(); window.HR_Action.chat(user.name, `📢 Đã giao: "${t}" cho ${names.join(', ')}`, true); Utils.toast("Đã giao!"); setTimeout(()=>window.location.reload(), 500); document.getElementById('t-t').value='';}else Utils.toast("Thiếu tin!","err")};
        }, 100);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;
        const oldChat = document.getElementById('view-chat'); if(oldChat) oldChat.classList.add('hidden');

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a,b) => (b.score||0) - (a.score||0));
        const chats = Array.isArray(data.chat) ? data.chat.sort((a,b)=>b.time-a.time).slice(0,50) : [];
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
                <button id="btn-checkin" class="bg-white p-2 rounded flex flex-col items-center shadow-sm"><span class="text-xl">📍</span><span class="text-[10px] font-bold">Chấm công</span></button>
                <button id="btn-leave" class="bg-white p-2 rounded flex flex-col items-center shadow-sm"><span class="text-xl">📝</span><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                <button id="btn-buy" class="bg-white p-2 rounded flex flex-col items-center shadow-sm"><span class="text-xl">🛒</span><span class="text-[10px] font-bold">Mua hàng</span></button>
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

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            const b1 = document.getElementById('btn-checkin'); if(b1) b1.onclick = async () => { if(confirm("Xác nhận chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: "Đã chấm công", to: 'ADMIN', by: user.name, type: 'CHECKIN', status: 'DONE', time: Date.now() }); window.HR_Action.chat("HỆ THỐNG", `📍 ${user.name} đã chấm công`, true); Utils.toast("✅ Đã chấm công!"); } };
            const b2 = document.getElementById('btn-leave'); if(b2) b2.onclick = () => { Utils.modal("Xin Nghỉ", `<div class="space-y-2"><input id="l-r" class="w-full p-2 border rounded text-xs" placeholder="Lý do..."><div class="flex gap-2"><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1" placeholder="Số ngày"></div></div>`, [{id:'s-ok',text:'Gửi'}]); setTimeout(() => { document.getElementById('l-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const r=document.getElementById('l-r').value, d=document.getElementById('l-d').value, n=document.getElementById('l-n').value; if(r&&d&&n) { sendReq(`Nghỉ ${n} ngày (${new Date(d).toLocaleDateString('vi-VN')}): ${r}`, "LEAVE"); Utils.modal(null); } }; }, 100); };
            const b3 = document.getElementById('btn-buy'); if(b3) b3.onclick = () => { Utils.modal("Mua Hàng", `<div class="space-y-2"><input id="b-n" class="w-full p-2 border rounded text-xs" placeholder="Tên món..."><div class="flex gap-2"><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1" placeholder="SL"><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div>`, [{id:'s-ok',text:'Gửi'}]); setTimeout(() => { document.getElementById('b-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const n=document.getElementById('b-n').value, q=document.getElementById('b-q').value, d=document.getElementById('b-d').value; if(n&&q&&d) { sendReq(`Mua ${q} ${n} (Cần ${new Date(d).toLocaleDateString('vi-VN')})`, "BUY"); Utils.modal(null); } }; }, 100); };
            const sendChat = async () => { const m=document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            document.getElementById('chat-send').onclick = sendChat;
            document.getElementById('chat-msg').onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
