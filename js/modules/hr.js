import { addDoc, updateDoc, doc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if(c.classList.contains('hidden')) return;
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(user.role);
        
        c.innerHTML = `
        <div class="space-y-6">
             ${canAssign ? `<div class="glass p-5 border-l-4 border-blue-500"><h4 class="font-black text-slate-700 uppercase text-xs mb-3">Giao Việc</h4><div class="space-y-3"><input id="task-title" placeholder="Tên công việc"><div class="grid grid-cols-2 gap-3"><select id="task-house" class="w-full p-2 border rounded"><option value="">-- Nhà/Khu --</option>${data.houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select><input id="task-deadline" type="date"></div><div class="max-h-32 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2">${data.employees.map(e=>`<label class="flex items-center space-x-2 bg-slate-50 p-2 rounded"><input type="checkbox" class="task-emp-check" value="${e.name}"><span class="text-xs font-bold">${e.name}</span></label>`).join('')}</div><button id="btn-add-task" class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">PHÁT LỆNH</button></div></div>` : ''}
             <div><h3 class="font-bold text-slate-400 text-xs uppercase pl-2">Việc Của Bạn</h3>${data.tasks.filter(t=>t.assignee===user.name && t.status!=='done').map(t => `<div class="glass p-4 border-l-4 border-orange-500 mb-2"><div class="flex justify-between items-start mb-2"><h4 class="font-bold text-slate-800">${t.title}</h4></div><button class="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold btn-finish-task" data-id="${t._id}">BÁO CÁO XONG</button></div>`).join('')}</div>
        </div>`;

        // Events
        if(canAssign) document.getElementById('btn-add-task').onclick = async () => {
            const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; 
            const checks = document.querySelectorAll('.task-emp-check:checked');
            if(!t || checks.length===0) return Utils.toast("Thiếu tin!");
            checks.forEach(async (cb) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:cb.value, status:'pending', createdBy:user.name, time:Date.now() }); });
            Utils.toast("Đã giao việc");
        };
        
        document.querySelectorAll('.btn-finish-task').forEach(b => b.onclick = async () => {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, b.dataset.id), {status:'done', completedBy:user.name, completedAt:Date.now()});
            Utils.toast("Đã xong!");
        });
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if(c.classList.contains('hidden')) return;
        c.innerHTML = `<div class="p-4 space-y-4"><div class="glass p-6 !bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-xl flex items-center gap-5"><div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">${user.name.charAt(0)}</div><div><h2 class="text-xl font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role}</p></div></div><div class="grid grid-cols-2 gap-3 mb-6"><button id="btn-checkin" class="card p-4 flex flex-col items-center gap-2 bg-white rounded-xl shadow"><i class="fas fa-fingerprint text-2xl text-green-600"></i><span class="text-xs font-bold">ĐIỂM DANH</span></button><button id="btn-logout" class="card p-4 flex flex-col items-center gap-2 bg-white rounded-xl shadow"><i class="fas fa-power-off text-2xl text-slate-500"></i><span class="text-xs font-bold">THOÁT</span></button></div></div>`;
        
        document.getElementById('btn-checkin').onclick = async () => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:user.name, type:'CHECK_IN', time:Date.now() }); Utils.toast("Đã điểm danh"); } };
        document.getElementById('btn-logout').onclick = () => { if(confirm("Thoát?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } };
    }
};
