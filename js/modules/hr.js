import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        // CHECK ADMIN
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];

        // Lọc việc: Admin thấy hết, NV chỉ thấy việc của mình
        const myTasks = isAdmin ? tasks : tasks.filter(t => t.to === user._id);
        
        // Sắp xếp: Việc mới nhất lên đầu
        myTasks.sort((a,b) => b.time - a.time);

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <h2 class="font-black text-blue-800 text-lg uppercase pl-1 border-l-4 border-blue-500">VIỆC CẦN LÀM</h2>
            
            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50/50 shadow-sm border border-blue-100">
                <h3 class="font-bold text-blue-700 text-xs uppercase mb-2">Giao việc mới</h3>
                <div class="space-y-2">
                    <input id="t-title" placeholder="Nội dung công việc..." class="w-full p-3 rounded-xl border border-blue-200 text-sm font-bold shadow-sm">
                    <div class="flex gap-2">
                        <select id="t-to" class="w-1/2 p-2 rounded-lg border border-blue-200 text-sm">
                            ${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
                        </select>
                        <button id="btn-add-task" class="flex-1 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-md active:scale-95 transition">GIAO VIỆC NGAY</button>
                    </div>
                </div>
            </div>` : ''}

            <div class="space-y-3">
                ${myTasks.length ? myTasks.map(t => {
                    const isDone = t.status === 'DONE';
                    return `
                    <div class="bg-white p-3 rounded-xl border-l-4 ${isDone ? 'border-green-500 opacity-60' : 'border-orange-500'} shadow-sm relative">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-slate-700 text-sm ${isDone ? 'line-through' : ''}">${t.title}</h4>
                            ${isAdmin ? `<button onclick="HR.delTask('${t.id}')" class="text-slate-300 hover:text-red-500 px-2"><i class="fas fa-trash-alt"></i></button>` : ''}
                        </div>
                        <div class="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                            <span>To: <b>${employees.find(e=>e._id===t.to)?.name || '...'}</b></span>
                            <span>${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                        </div>
                        ${!isDone && (t.to === user._id || isAdmin) ? `
                            <button onclick="HR.doneTask('${t.id}')" class="mt-2 w-full py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded hover:bg-green-200 transition">✔ HOÀN THÀNH</button>
                        ` : ''}
                        ${isDone ? `<div class="mt-1 text-[10px] font-bold text-green-600 text-right">Đã xong</div>` : ''}
                    </div>`;
                }).join('') : `<div class="text-center text-slate-400 italic mt-10">Không có công việc nào</div>`}
            </div>
        </div>`;

        // Logic Global
        window.HR = {
            doneTask: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }),
            delTask: (id) => { if(confirm("Xóa việc này?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); }
        };

        setTimeout(() => {
            const btn = document.getElementById('btn-add-task');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                const to = document.getElementById('t-to').value;
                if(title && to) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title, to, by: user.name, status: 'PENDING', time: Date.now() });
                    Utils.toast("Đã giao việc!");
                    document.getElementById('t-title').value = '';
                }
            };
        }, 100);
    },

    renderTeam: (data) => {
        // (Giữ nguyên phần render Team nếu bạn đã có, hoặc để trống nếu chưa cần)
        const c = document.getElementById('view-team');
        if (!c) return;
        c.innerHTML = '<div class="p-10 text-center text-slate-400">Tính năng đang cập nhật...</div>';
    }
};
