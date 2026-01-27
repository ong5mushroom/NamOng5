import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        
        // Lọc việc: Admin thấy hết, NV chỉ thấy việc của mình
        const myTasks = isAdmin ? tasks : tasks.filter(t => t.to === user._id);
        myTasks.sort((a,b) => b.time - a.time);

        // Hàm xóa/xong toàn cục
        window.HR_Action = {
            done: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }),
            del: (id) => { if(confirm("Xóa?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); }
        };

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <h2 class="font-black text-slate-700 text-lg uppercase pl-1 border-l-4 border-blue-500">VIỆC CẦN LÀM</h2>
            
            ${isAdmin ? `
            <div class="glass p-4 bg-white shadow-sm">
                <h3 class="font-bold text-slate-500 text-xs uppercase mb-2">Giao việc</h3>
                <input id="t-title" placeholder="Nội dung..." class="w-full p-2 rounded border mb-2 text-sm">
                <div class="flex gap-2">
                    <select id="t-to" class="w-1/2 p-2 rounded border text-sm">${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}</select>
                    <button id="btn-add-task" class="flex-1 bg-blue-600 text-white rounded font-bold text-xs">GỬI</button>
                </div>
            </div>` : ''}

            <div class="space-y-2">
                ${myTasks.length ? myTasks.map(t => {
                    const isDone = t.status === 'DONE';
                    return `
                    <div class="bg-white p-3 rounded border-l-4 ${isDone ? 'border-green-500 opacity-60' : 'border-orange-500'} shadow-sm">
                        <div class="flex justify-between items-start">
                            <span class="font-bold text-sm ${isDone ? 'line-through' : ''}">${t.title}</span>
                            ${isAdmin ? `<button onclick="window.HR_Action.del('${t.id}')" class="text-slate-300 hover:text-red-500 px-2"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                        <div class="flex justify-between mt-1 text-[10px] text-slate-400">
                            <span>Cho: ${employees.find(e=>e._id===t.to)?.name || '...'}</span>
                            <span>${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                        </div>
                        ${!isDone && (t.to === user._id || isAdmin) ? `<button onclick="window.HR_Action.done('${t.id}')" class="mt-2 w-full py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded">✔ XONG</button>` : ''}
                    </div>`;
                }).join('') : '<div class="text-center text-slate-400 italic">Không có việc</div>'}
            </div>
        </div>`;

        setTimeout(() => {
            const btn = document.getElementById('btn-add-task');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                const to = document.getElementById('t-to').value;
                if(title && to) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title, to, by: user.name, status: 'PENDING', time: Date.now() });
                    Utils.toast("Đã giao!"); document.getElementById('t-title').value = '';
                }
            };
        }, 100);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;
        
        const employees = Array.isArray(data.employees) ? data.employees : [];
        
        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <h2 class="font-black text-slate-700 text-lg uppercase pl-1 border-l-4 border-purple-500">NHÂN SỰ TEAM</h2>
            <div class="space-y-2">
                ${employees.map(e => `
                <div class="bg-white p-3 rounded shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <div class="font-bold text-slate-700">${e.name}</div>
                        <div class="text-xs text-slate-400">${e.role || 'Nhân viên'}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-black text-purple-600">${e.score || 0} đ</div>
                        <div class="text-[9px] text-slate-400 uppercase">Điểm thi đua</div>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }
};
