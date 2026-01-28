import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG XỬ LÝ (CHAT, ĐIỂM, DUYỆT) ---
window.HR_Action = {
    // 1. Gửi tin nhắn / Thông báo
    chat: async (user, msg, isSystem = false) => {
        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), {
                user: user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT'
            });
        } catch(e) { console.error(e); }
    },

    // 2. Cộng/Trừ điểm (MỚI)
    score: async (id, name, val, adminName) => {
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} điểm ${name}?`);
        if(reason) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
                Utils.toast("Đã cập nhật điểm!");
                window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val>0?'THƯỞNG':'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
            } catch(e) { alert(e.message); }
        }
    },

    // 3. Nhắc nhở nhân viên (MỚI)
    remind: async (empName, taskTitle, type) => {
        const msg = type === 'ACCEPT' 
            ? `🔔 @${empName}, vui lòng NHẬN VIỆC: "${taskTitle}" ngay nhé!` 
            : `⏰ @${empName}, báo cáo tiến độ việc: "${taskTitle}" nhé!`;
        
        await window.HR_Action.chat("NHẮC NHỞ", msg, true);
        Utils.toast("Đã gửi nhắc nhở!");
    },

    // 4. Duyệt đơn
    approve: async (id, title, reqUser, adminName, isOk) => {
        if(confirm(isOk ? "Duyệt đơn này?" : "Từ chối đơn này?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
            const statusText = isOk ? "✅ Đã DUYỆT" : "❌ Đã TỪ CHỐI";
            Utils.toast(isOk ? "Đã duyệt!" : "Đã từ chối!");
            window.HR_Action.chat("HỆ THỐNG", `${statusText} đơn: "${title}" của ${reqUser} (bởi ${adminName})`, true);
        }
    },

    // 5. Thao tác việc (Nhận/Xong/Xóa)
    task: {
        del: async (id) => { if(confirm("Xóa việc này?")) await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
        accept: async (id, title, u) => { 
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' });
            window.HR_Action.chat("HỆ THỐNG", `💪 ${u} đã NHẬN việc: "${decodeURIComponent(title)}"`, true);
        },
        finish: async (id, title, u) => { 
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
            window.HR_Action.chat("HỆ THỐNG", `🏁 ${u} đã BÁO CÁO XONG: "${decodeURIComponent(title)}"`, true);
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
       const c = document.getElementById('view-tasks'); if(!c) return;
       HR.renderTasks_Logic(data, user, c);
    },
    
    renderTasks_Logic: (data, user, c) => {
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const houses = Array.isArray(data.houses) ? data.houses : [];
        
        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50/50 border border-blue-200 shadow-sm rounded-xl">
                <h3 class="font-black text-blue-700 text-xs uppercase mb-3"><i class="fas fa-bullhorn"></i> GIAO VIỆC</h3>
                <div class="space-y-2 mb-3">
                    <input id="t-t" placeholder="Nội dung công việc..." class="w-full p-2 rounded border border-blue-300 text-xs font-bold bg-white">
                    <div class="flex gap-2">
                        <select id="t-area" class="w-1/2 p-2 rounded border border-blue-300 text-xs font-bold bg-white"><option value="">-- Khu vực --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="Khác">Khác</option></select>
                        <input type="date" id="t-date" class="w-1/2 p-2 rounded border border-blue-300 text-xs font-bold bg-white">
                    </div>
                </div>
                <div class="bg-white p-2 rounded border border-blue-200 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 text-blue-600 flex items-center gap-2"><input type="checkbox" id="check-all"> Chọn tất cả</label>
                    ${employees.map(e=>`<label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}
                </div>
                <button id="btn-tsk" class="w-full bg-blue-600 text-white rounded-lg py-3 text-xs font-bold shadow-md active:scale-95 transition">GIAO VIỆC NGAY</button>
            </div>` : ''}

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="font-black text-slate-700 text-sm border-l-4 border-orange-500 pl-2 uppercase">NHẬT KÝ</h2>
                    <select id="filter-emp" class="text-xs border rounded p-1 font-bold bg-white"><option value="ALL">-- Tất cả --</option>${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}</select>
                </div>
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
                const isDone = t.status==='DONE';
                const empName = employees.find(e=>e._id===t.to)?.name || '...';
                const areaInfo = t.area ? `[${t.area}] ` : '';
                const safeTitle = encodeURIComponent(t.title);
                
                return `
                <div class="bg-white p-3 rounded-lg border-l-4 ${isDone?'border-green-500 opacity-60':(t.status==='DOING'?'border-blue-500 bg-blue-50':'border-orange-400')} shadow-sm relative">
                    <div class="flex justify-between items-start">
                        <div class="pr-6">
                            <span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${areaInfo}${t.title}</span>
                            <span class="text-[9px] text-slate-400">Người làm: <b>${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div class="flex flex-col gap-1 absolute top-2 right-2">
                            ${isAdmin ? `<button onclick="window.HR_Action.task.del('${t.id}')" class="text-slate-300 hover:text-red-500 text-right"><i class="fas fa-times"></i></button>` : ''}
                            
                            ${isAdmin && !isDone ? `
                                <button onclick="window.HR_Action.remind('${empName}', '${safeTitle}', '${t.status==='PENDING'?'ACCEPT':'REPORT'}')" 
                                        class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${t.status==='PENDING'?'text-orange-600 border-orange-200 bg-orange-50':'text-blue-600 border-blue-200 bg-blue-50'}">
                                    ${t.status==='PENDING' ? '🔔 Nhắc nhận' : '⏰ Nhắc báo cáo'}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${!isDone && t.to === user._id ? `
                        <div class="mt-2 pt-2 border-t border-dashed border-slate-200">
                            ${t.status!=='DOING' 
                                ? `<button onclick="window.HR_Action.task.accept('${t.id}','${safeTitle}','${user.name}')" class="w-full py-1.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded hover:bg-blue-200 animate-pulse">NHẬN VIỆC NGAY</button>` 
                                : `<button onclick="window.HR_Action.task.finish('${t.id}','${safeTitle}','${user.name}')" class="w-full py-1.5 bg-green-100 text-green-700 font-bold text-[10px] rounded hover:bg-green-200">BÁO CÁO XONG</button>`}
                        </div>` : ''}
                </div>`;
            }).join('') : '<div class="text-center text-slate-300 italic text-xs py-4">Chưa có công việc</div>';
        };

        setTimeout(()=>{
            renderList();
            const dIn = document.getElementById('t-date'); if(dIn) dIn.valueAsDate = new Date();
            const fSel = document.getElementById('filter-emp'); if(fSel) fSel.onchange = renderList;
            const chkAll = document.getElementById('check-all'); if(chkAll) chkAll.onchange = (e) => document.querySelectorAll('.ec').forEach(cb => cb.checked = e.target.checked);

            const btn = document.getElementById('btn-tsk');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-t').value;
                const area = document.getElementById('t-area').value;
                const chk = document.querySelectorAll('.ec:checked');
                if(title && chk.length){
                    const batch = writeBatch(db); const names=[];
                    chk.forEach(c => { 
                        const ref = doc(collection(db, `${ROOT_PATH}/tasks`));
                        batch.set(ref, {title, area, to: c.value, by: user.name, status:'PENDING', time:Date.now(), type:'TASK'}); 
                        names.push(c.getAttribute('data-name'));
                    });
                    await batch.commit();
                    window.HR_Action.chat(user.name, `📢 Đã giao việc: "${title}" ${area?`tại ${area}`:''} cho ${names.join(', ')}`, true);
                    Utils.toast("Đã giao!"); renderList(); document.getElementById('t-t').value='';
                } else { Utils.toast("Thiếu thông tin!", "err"); }
            }
        }, 200);
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
            <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl animate-pop shadow-sm">
                <h3 class="font-black text-red-600 text-xs uppercase mb-2 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pending.length})</h3>
                <div class="space-y-2 max-h-48 overflow-y-auto">${pending.map(t=>`
                    <div class="bg-white p-2 rounded shadow-sm flex justify-between items-center">
                        <div><div class="text-[10px] font-bold text-slate-700">${t.by} <span class="font-normal">(${t.type})</span></div><div class="text-xs font-bold text-red-500">${t.title}</div></div>
                        <div class="flex gap-1">
                            <button onclick="window.HR_Action.approve('${t.id}','${t.title}','${t.by}','${user.name}', true)" class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">OK</button>
                            <button onclick="window.HR_Action.approve('${t.id}','${t.title}','${t.by}','${user.name}', false)" class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">Hủy</button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : ''}

            <div class="glass p-4 bg-purple-50/50 border border-purple-100 shadow-sm rounded-xl">
                <h3 class="font-bold text-purple-700 text-xs uppercase mb-3 text-center">Tiện ích</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button id="btn-checkin" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-fingerprint text-2xl text-blue-500 mb-2"></i><span class="text-[10px] font-bold mt-1 text-slate-600">Chấm công</span></button>
                    <button id="btn-leave" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-user-clock text-2xl text-orange-500 mb-2"></i><span class="text-[10px] font-bold mt-1 text-slate-600">Xin nghỉ</span></button>
                    <button id="btn-buy" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-shopping-cart text-2xl text-green-500 mb-2"></i><span class="text-[10px] font-bold mt-1 text-slate-600">Mua hàng</span></button>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-80 flex flex-col">
                <div class="bg-slate-100 p-2 border-b font-bold text-xs text-slate-600 uppercase">💬 THẢO LUẬN</div>
                <div class="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 flex flex-col-reverse">
                    ${chats.map(msg => `
                        <div class="flex flex-col ${msg.type==='NOTIFY'?'items-center':'items-start'}">
                            ${msg.type==='NOTIFY' 
                                ? `<span class="text-[9px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-center mb-1 border border-gray-300">${msg.message}</span>`
                                : `<div class="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm max-w-[90%]">
                                    <div class="text-xs text-slate-800">
                                        <span class="font-bold text-blue-700 mr-1">${msg.user}:</span>${msg.message}
                                    </div>
                                    <div class="text-[8px] text-slate-300 text-right mt-0.5">${new Date(msg.time).toLocaleTimeString('vi-VN').slice(0,5)}</div>
                                   </div>`
                            }
                        </div>`).join('')}
                </div>
                <div class="p-2 border-t bg-white flex gap-2">
                    <input id="chat-msg" class="flex-1 p-2 border rounded-full text-xs outline-none bg-slate-50 focus:bg-white focus:border-blue-400 transition" placeholder="Nhập tin nhắn...">
                    <button id="chat-send" class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i class="fas fa-paper-plane text-xs"></i></button>
                </div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">DANH SÁCH NHÂN SỰ</h2>
                <div class="space-y-2">
                    ${employees.map(e => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">${e.name.charAt(0)}</div>
                            <div>
                                <div class="font-bold text-slate-700 text-sm">${e.name}</div>
                                <div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'NV'}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="font-black text-xl text-green-600">${e.score || 0}</div>
                            
                            ${isAdmin ? `
                            <div class="flex flex-col gap-1">
                                <button onclick="window.HR_Action.score('${e._id}', '${e.name}', 10, '${user.name}')" class="w-6 h-6 bg-green-100 text-green-700 rounded flex items-center justify-center font-bold hover:bg-green-200 shadow-sm">+</button>
                                <button onclick="window.HR_Action.score('${e._id}', '${e.name}', -10, '${user.name}')" class="w-6 h-6 bg-red-100 text-red-700 rounded flex items-center justify-center font-bold hover:bg-red-200 shadow-sm">-</button>
                            </div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Gửi yêu cầu: ${t}`, true); };
            const b1=document.getElementById('btn-checkin'); if(b1) b1.onclick = () => { if(confirm("Xác nhận chấm công?")) sendReq("Đã chấm công", "CHECKIN"); };
            
            // XIN NGHỈ (Form Modal)
            const b2=document.getElementById('btn-leave'); if(b2) b2.onclick=()=>{Utils.modal("Xin Nghỉ",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Lý do</label><input id="l-r" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Từ ngày</label><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Số ngày</label><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1"></div></div></div>`,[{id:'s-ok',text:'Gửi'}]);setTimeout(()=>{document.getElementById('l-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const r=document.getElementById('l-r').value,d=document.getElementById('l-d').value,n=document.getElementById('l-n').value;if(r&&d&&n){sendReq(`Nghỉ ${n} ngày (từ ${new Date(d).toLocaleDateString('vi-VN')}): ${r}`,"LEAVE");Utils.modal(null);}else alert("Thiếu tin!")}},100)};
            
            // MUA HÀNG (Form Modal)
            const b3=document.getElementById('btn-buy'); if(b3) b3.onclick=()=>{Utils.modal("Mua Hàng",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Tên món</label><input id="b-n" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">SL</label><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Cần ngày</label><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div></div>`,[{id:'s-ok',text:'Gửi'}]);setTimeout(()=>{document.getElementById('b-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const n=document.getElementById('b-n').value,q=document.getElementById('b-q').value,d=document.getElementById('b-d').value;if(n&&q&&d){sendReq(`Mua ${q} ${n} (cần ${new Date(d).toLocaleDateString('vi-VN')})`,"BUY");Utils.modal(null);}else alert("Thiếu tin!")}},100)};

            // Chat
            const sendChat = async () => { const m = document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            document.getElementById('chat-send').onclick = sendChat;
            document.getElementById('chat-msg').onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
