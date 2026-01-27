import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM TOÀN CỤC (CÓ LOG CHAT) ---
window.HR_Action = {
    chat: async (user, msg) => { try { await addDoc(collection(db, `${ROOT_PATH}/chat`), {user, message:msg, time:Date.now()}); } catch(e){} },
    
    del: (id) => { if(confirm("Xóa?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
    accept: (id, title, u) => { updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); window.HR_Action.chat(u, `💪 Đã nhận việc: ${title}`); },
    finish: (id, title, u) => { updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }); window.HR_Action.chat(u, `✅ Đã xong việc: ${title}`); },
    
    checkIn: async (u) => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/tasks`), {title:"Đã chấm công", to:"ADMIN", by:u, type:"CHECKIN", status:"DONE", time:Date.now()}); Utils.toast("Ok!"); window.HR_Action.chat(u, "📍 Đã chấm công."); } },
    reqLeave: async (u) => { const r=prompt("Lý do:"); if(r){ await addDoc(collection(db, `${ROOT_PATH}/tasks`), {title:`Xin nghỉ: ${r}`, to:"ADMIN", by:u, type:"LEAVE", status:"PENDING", time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(u, `📝 Xin nghỉ: ${r}`); } },
    reqBuy: async (u) => { const n=prompt("Tên đồ:"); if(n){ await addDoc(collection(db, `${ROOT_PATH}/tasks`), {title:`Đề xuất mua: ${n}`, to:"ADMIN", by:u, type:"BUY", status:"PENDING", time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(u, `🛒 Đề xuất mua: ${n}`); } },
    
    adjustScore: async (id, name, val) => { const r=prompt("Lý do?"); if(r){ await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), {score:increment(val)}); Utils.toast("Đã lưu!"); } }
};

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50 border border-blue-200 shadow-sm">
                <h3 class="font-bold text-blue-700 text-xs uppercase mb-2">Giao việc nhóm</h3>
                <input id="t-title" placeholder="Nội dung..." class="w-full p-2 border rounded mb-2 text-sm bg-white">
                <div class="bg-white p-2 rounded border border-blue-200 h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-2">
                    <label class="col-span-2 font-bold text-xs border-b pb-1"><input type="checkbox" id="check-all"> Chọn tất cả</label>
                    ${employees.map(e => `<label class="flex items-center gap-2 text-xs"><input type="checkbox" class="emp-check" value="${e._id}"> ${e.name}</label>`).join('')}
                </div>
                <button id="btn-add-task" class="w-full bg-blue-600 text-white rounded py-2 font-bold text-xs shadow">GIAO VIỆC NGAY</button>
            </div>` : ''}

            <div>
                <div class="flex justify-between items-center mb-2"><h2 class="font-black text-slate-700 text-sm uppercase border-l-4 border-orange-500 pl-2">NHẬT KÝ</h2><select id="filter-emp" class="text-xs border rounded p-1"><option value="ALL">-- Tất cả --</option>${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}</select></div>
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
                const isDoing = t.status === 'DOING';
                const assign = employees.find(e=>e._id===t.to)?.name || '...';
                return `
                <div class="bg-white p-3 rounded border-l-4 ${isDone?'border-green-500 opacity-60':(isDoing?'border-blue-500 bg-blue-50':'border-orange-400')} shadow-sm relative">
                    <div class="flex justify-between">
                        <div><span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.title}</span><span class="text-[10px] text-slate-400">Người làm: <b>${assign}</b> - ${new Date(t.time).toLocaleDateString('vi-VN')}</span></div>
                        ${isAdmin ? `<button onclick="window.HR_Action.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    ${!isDone && t.to === user._id ? `<div class="mt-2 pt-2 border-t border-dashed">${!isDoing ? `<button onclick="window.HR_Action.accept('${t.id}','${encodeURIComponent(t.title)}','${user.name}')" class="w-full py-1 bg-blue-100 text-blue-700 font-bold text-[10px] rounded">NHẬN VIỆC</button>` : `<button onclick="window.HR_Action.finish('${t.id}','${encodeURIComponent(t.title)}','${user.name}')" class="w-full py-1 bg-green-100 text-green-700 font-bold text-[10px] rounded">BÁO CÁO XONG</button>`}</div>` : ''}
                    ${isDone ? `<div class="absolute bottom-2 right-2 text-[10px] font-bold text-green-600">✔ XONG</div>` : ''}
                </div>`;
            }).join('') : '<div class="text-center text-slate-400 italic">Trống</div>';
        };

        setTimeout(() => {
            renderList();
            document.getElementById('filter-emp').onchange = renderList;
            const ca = document.getElementById('check-all'); if(ca) ca.onchange = (e) => document.querySelectorAll('.emp-check').forEach(cb => cb.checked = e.target.checked);
            
            const btn = document.getElementById('btn-add-task');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                const checked = document.querySelectorAll('.emp-check:checked');
                if(!title || !checked.length) return Utils.toast("Thiếu nội dung/người!", "err");
                const batch = db.batch();
                let count = 0;
                checked.forEach(cb => { batch.set(doc(collection(db, `${ROOT_PATH}/tasks`)), { title, to: cb.value, by: user.name, status: 'PENDING', time: Date.now(), type: 'TASK' }); count++; });
                await batch.commit();
                Utils.toast(`Đã giao cho ${count} người!`);
                window.HR_Action.chat(user.name, `📢 Đã giao việc: "${title}" cho ${count} người.`);
                document.getElementById('t-title').value = '';
                document.querySelectorAll('.emp-check').forEach(cb => cb.checked = false);
            };
        }, 100);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            <div class="glass p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
                <h3 class="font-bold text-purple-700 text-xs uppercase mb-3 text-center">Tiện ích cá nhân</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="window.HR_Action.checkIn('${user.name}')" class="p-3 bg-white rounded border flex flex-col items-center shadow-sm active:scale-95"><i class="fas fa-fingerprint text-xl text-blue-500 mb-1"></i><span class="text-[10px] font-bold">Điểm danh</span></button>
                    <button onclick="window.HR_Action.reqLeave('${user.name}')" class="p-3 bg-white rounded border flex flex-col items-center shadow-sm active:scale-95"><i class="fas fa-user-clock text-xl text-orange-500 mb-1"></i><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                    <button onclick="window.HR_Action.reqBuy('${user.name}')" class="p-3 bg-white rounded border flex flex-col items-center shadow-sm active:scale-95"><i class="fas fa-shopping-cart text-xl text-green-500 mb-1"></i><span class="text-[10px] font-bold">Mua hàng</span></button>
                </div>
            </div>
            <div>
                <h2 class="font-black text-slate-700 text-sm uppercase border-l-4 border-slate-500 pl-2 mb-3">DANH SÁCH TEAM</h2>
                <div class="space-y-2">
                    ${employees.map(e => `
                    <div class="bg-white p-3 rounded shadow-sm border border-slate-100 flex justify-between items-center">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">${e.name.charAt(0)}</div><div><div class="font-bold text-slate-700 text-sm">${e.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase">${e.role||'NV'}</div></div></div>
                        <div class="flex items-center gap-2"><div class="text-right"><div class="font-black text-xl ${Number(e.score)>=0?'text-green-600':'text-red-500'}">${e.score||0}</div><div class="text-[8px] text-slate-400 uppercase font-bold">Điểm</div></div>
                        ${isAdmin ? `<div class="flex flex-col gap-1"><button onclick="window.HR_Action.adjustScore('${e._id}','${e.name}',10)" class="w-6 h-6 bg-green-100 text-green-700 rounded font-bold">+</button><button onclick="window.HR_Action.adjustScore('${e._id}','${e.name}',-10)" class="w-6 h-6 bg-red-100 text-red-700 rounded font-bold">-</button></div>` : ''}</div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    }
};
