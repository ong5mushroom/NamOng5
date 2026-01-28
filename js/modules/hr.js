import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.HR_Action = {
    chat: async (user, msg, isSystem = false) => {
        try { await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' }); } catch(e) {}
    },
    score: async (id, name, val, adminName) => {
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm?`);
        if(reason) {
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
            Utils.toast("Đã cập nhật điểm!");
            window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val>0?'THƯỞNG':'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
        }
    },
    remind: async (name, title, type) => {
        Utils.toast(`Đã nhắc ${name}!`);
        window.HR_Action.chat("NHẮC NHỞ", type === 'ACCEPT' ? `🔔 Nhắc @${name} nhận việc: "${title}"` : `⏰ Nhắc @${name} báo cáo: "${title}"`, true);
    },
    approve: async (id, title, user, admin, isOk) => {
        if(confirm(isOk ? "Duyệt đơn này?" : "Từ chối đơn này?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
            Utils.toast("Đã xử lý!");
            window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user} (bởi ${admin})`, true);
        }
    },
    task: {
        del: async (id) => { if(confirm("Xóa?")) await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
        accept: async (id, t, u) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN: "${decodeURIComponent(t)}"`, true); },
        finish: async (id, t, u) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }); window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} đã XONG: "${decodeURIComponent(t)}"`, true); }
    }
};

export const HR = {
    renderTasks: (data, user) => { const c = document.getElementById('view-tasks'); if(c && !c.classList.contains('hidden')) HR.renderTasks_Logic(data, user, c); },
    renderTasks_Logic: (data, user, c) => {
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
        
        const renderList = () => {
            const fid = document.getElementById('filter-emp').value;
            let list = tasks.filter(t => !t.type || t.type === 'TASK');
            if(fid !== 'ALL') list = list.filter(t => t.to === fid);
            if(!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);
            list.sort((a,b) => b.time - a.time);

            document.getElementById('lst').innerHTML = list.length ? list.map(t => {
                const isDone = t.status==='DONE';
                const empName = employees.find(e=>e._id===t.to)?.name || '...';
                return `<div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative ${isDone?'opacity-60':''}"><div class="flex justify-between items-start mb-2"><div class="pr-8"><span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.area?`[${t.area}] `:''}${t.title}</span><span class="text-[10px] text-slate-400">Người làm: <b>${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}</span></div>${isAdmin?`<button onclick="window.HR_Action.task.del('${t.id}')" class="absolute top-3 right-3 text-slate-300 hover:text-red-500">×</button>`:''}</div><div class="flex justify-between items-center mt-2">${isAdmin && !isDone ? `<button onclick="window.HR_Action.remind('${empName}','${encodeURIComponent(t.title)}','${t.status==='PENDING'?'ACCEPT':'REPORT'}')" class="text-[9px] bg-yellow-50 text-yellow-600 px-2 py-1 rounded border border-yellow-200">🔔 Nhắc nhở</button>` : '<span></span>'}${!isDone && t.to === user._id ? (t.status!=='DOING' ? `<button onclick="window.HR_Action.task.accept('${t.id}','${encodeURIComponent(t.title)}','${user.name}')" class="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-bold">NHẬN VIỆC</button>` : `<button onclick="window.HR_Action.task.finish('${t.id}','${encodeURIComponent(t.title)}','${user.name}')" class="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-bold">BÁO CÁO XONG</button>`) : ''}</div></div>`;
            }).join('') : '<div class="text-center text-slate-300 italic text-xs py-10">Chưa có công việc nào</div>';
        };

        setTimeout(()=>{ renderList(); const dIn=document.getElementById('t-date'); if(dIn) dIn.valueAsDate=new Date(); const fSel=document.getElementById('filter-emp'); if(fSel) fSel.onchange=renderList; const chkAll=document.getElementById('check-all'); if(chkAll) chkAll.onchange=(e)=>document.querySelectorAll('.ec').forEach(cb=>cb.checked=e.target.checked); const btn=document.getElementById('btn-tsk'); if(btn) btn.onclick=async()=>{const t=document.getElementById('t-t').value; const a=document.getElementById('t-area').value; const chk=document.querySelectorAll('.ec:checked'); if(t&&chk.length){const batch=writeBatch(db); const names=[]; chk.forEach(c=>{const ref=doc(collection(db,`${ROOT_PATH}/tasks`)); batch.set(ref,{title:t,area:a,to:c.value,by:user.name,status:'PENDING',time:Date.now(),type:'TASK'}); names.push(c.getAttribute('data-name'))}); await batch.commit(); window.HR_Action.chat(user.name,`📢 Đã giao: "${t}" ${a?`tại ${a}`:''} cho ${names.join(', ')}`,true); Utils.toast("Đã giao!"); renderList(); document.getElementById('t-t').value='';}else Utils.toast("Thiếu tin!","err")}}}, 200);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team'); if(!c || c.classList.contains('hidden')) return;
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${isAdmin && pending.length ? `<div class="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm"><h3 class="font-black text-red-600 text-xs uppercase mb-3 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pending.length})</h3><div class="space-y-2 max-h-60 overflow-y-auto">${pending.map(t=>`<div class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center"><div><div class="text-[10px] font-bold text-slate-500">${t.by} • ${t.type}</div><div class="text-xs font-bold text-slate-800">${t.title}</div></div><div class="flex gap-2"><button onclick="window.HR_Approve.ok('${t.id}','${t.title}','${t.by}','${user.name}',true)" class="bg-green-100 text-green-700 w-8 h-8 rounded-full font-bold flex items-center justify-center">✓</button><button onclick="window.HR_Approve.no('${t.id}','${t.title}','${t.by}','${user.name}',false)" class="bg-red-100 text-red-700 w-8 h-8 rounded-full font-bold flex items-center justify-center">✕</button></div></div>`).join('')}</div></div>` : ''}

            <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg text-white">
                <h3 class="font-bold text-xs uppercase mb-4 opacity-80 text-center">Tiện ích cá nhân</h3>
                <div class="grid grid-cols-3 gap-4">
                    <button id="btn-checkin" class="flex flex-col items-center gap-2 group"><div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition">📍</div><span class="text-[10px] font-bold">Chấm công</span></button>
                    <button id="btn-leave" class="flex flex-col items-center gap-2 group"><div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition">📝</div><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                    <button id="btn-buy" class="flex flex-col items-center gap-2 group"><div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition">🛒</div><span class="text-[10px] font-bold">Mua hàng</span></button>
                </div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">ĐỘI NGŨ NHÂN VIÊN</h2>
                <div class="space-y-2">
                    ${employees.map(e => `
                    <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">${e.name.charAt(0)}</div>
                            <div><div class="font-bold text-slate-700 text-sm">${e.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'Nhân viên'}</div></div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="font-black text-lg ${e.score >= 0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}đ</div>
                            ${isAdmin ? `<div class="flex flex-col gap-1"><button onclick="window.HR_Action.score('${e._id}','${e.name}',10,'${user.name}')" class="w-6 h-6 bg-green-50 text-green-600 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-green-100">+</button><button onclick="window.HR_Action.score('${e._id}','${e.name}',-10,'${user.name}')" class="w-6 h-6 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-red-100">-</button></div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            const b1=document.getElementById('btn-checkin'); if(b1) b1.onclick = () => { if(confirm("Xác nhận chấm công?")) sendReq("Đã chấm công", "CHECKIN"); };
            const b2=document.getElementById('btn-leave'); if(b2) b2.onclick=()=>{Utils.modal("Xin Nghỉ",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Lý do</label><input id="l-r" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Từ ngày</label><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Số ngày</label><input type="number" id="l-n" class="w-full p-2 border rounded text-xs" value="1"></div></div></div>`,[{id:'s-ok',text:'Gửi'}]);setTimeout(()=>{document.getElementById('l-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const r=document.getElementById('l-r').value,d=document.getElementById('l-d').value,n=document.getElementById('l-n').value;if(r&&d&&n){sendReq(`Nghỉ ${n} ngày (từ ${new Date(d).toLocaleDateString('vi-VN')}): ${r}`,"LEAVE");Utils.modal(null);}else alert("Thiếu tin!")}},100)};
            const b3=document.getElementById('btn-buy'); if(b3) b3.onclick=()=>{Utils.modal("Mua Hàng",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500">Tên món</label><input id="b-n" class="w-full p-2 border rounded text-xs"></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">SL</label><input type="number" id="b-q" class="w-full p-2 border rounded text-xs" value="1"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500">Cần ngày</label><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div></div>`,[{id:'s-ok',text:'Gửi'}]);setTimeout(()=>{document.getElementById('b-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const n=document.getElementById('b-n').value,q=document.getElementById('b-q').value,d=document.getElementById('b-d').value;if(n&&q&&d){sendReq(`Mua ${q} ${n} (cần ${new Date(d).toLocaleDateString('vi-VN')})`,"BUY");Utils.modal(null);}else alert("Thiếu tin!")}},100)};
        }, 100);
    }
};
