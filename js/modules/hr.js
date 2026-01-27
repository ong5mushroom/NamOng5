import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        
        // Lọc việc: Admin thấy hết, NV chỉ thấy việc liên quan
        const myTasks = isAdmin ? tasks : tasks.filter(t => t.to === user._id || t.by === user.name);
        myTasks.sort((a,b) => b.time - a.time);

        // HÀM TOÀN CỤC (TRÁNH LỖI)
        window.HR_Task = {
            del: (id) => { if(confirm("Xóa?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
            accept: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }), 
            finish: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }),  
            approve: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }),
            
            // Tiện ích
            checkIn: async () => {
                if(confirm("Chấm công bây giờ?")) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: "Đã chấm công", to: "ADMIN", by: user.name, type: "CHECKIN", status: 'DONE', time: Date.now() });
                    Utils.toast("Đã chấm công!");
                }
            },
            reqLeave: async () => {
                const r = prompt("Lý do xin nghỉ:");
                if(r) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: `Xin nghỉ: ${r}`, to: "ADMIN", by: user.name, type: "LEAVE", status: 'PENDING', time: Date.now() });
                    Utils.toast("Đã gửi đơn!");
                }
            },
            reqBuy: async () => {
                const n = prompt("Tên món đồ:");
                if(n) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: `Đề xuất mua: ${n}`, to: "ADMIN", by: user.name, type: "BUY", status: 'PENDING', time: Date.now() });
                    Utils.toast("Đã gửi đề xuất!");
                }
            }
        };

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            <div class="grid grid-cols-3 gap-2">
                <button onclick="window.HR_Task.checkIn()" class="p-2 bg-white rounded border flex flex-col items-center shadow-sm"><i class="fas fa-fingerprint text-xl text-blue-500"></i><span class="text-[10px] font-bold">Điểm danh</span></button>
                <button onclick="window.HR_Task.reqLeave()" class="p-2 bg-white rounded border flex flex-col items-center shadow-sm"><i class="fas fa-user-clock text-xl text-orange-500"></i><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                <button onclick="window.HR_Task.reqBuy()" class="p-2 bg-white rounded border flex flex-col items-center shadow-sm"><i class="fas fa-shopping-cart text-xl text-green-500"></i><span class="text-[10px] font-bold">Mua hàng</span></button>
            </div>

            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50/50 shadow-sm border border-blue-100">
                <h3 class="font-bold text-blue-700 text-xs uppercase mb-2">Giao việc</h3>
                <div class="flex gap-2 mb-2"><input id="t-title" placeholder="Nội dung..." class="w-full p-2 text-sm border rounded"></div>
                <div class="flex gap-2"><select id="t-to" class="w-1/2 p-2 text-sm border rounded">${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}</select><button id="btn-add-task" class="flex-1 bg-blue-600 text-white rounded font-bold text-xs shadow-md">GIAO</button></div>
            </div>` : ''}

            <div>
                <h2 class="font-black text-slate-600 text-sm uppercase pl-1 border-l-4 border-orange-500 mb-3">DANH SÁCH</h2>
                <div class="space-y-2">
                    ${myTasks.length ? myTasks.map(t => {
                        const isDone = t.status === 'DONE';
                        const isDoing = t.status === 'DOING';
                        const isTask = !t.type || t.type === 'TASK'; 
                        const assignName = employees.find(e=>e._id===t.to)?.name || 'Admin';
                        
                        let statusColor = isDoing ? 'border-blue-500 bg-blue-50' : (isDone ? 'border-green-500 opacity-60' : 'border-orange-400');

                        return `
                        <div class="bg-white p-3 rounded-lg border-l-4 ${statusColor} shadow-sm relative">
                            <div class="flex justify-between items-start">
                                <div><span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${isTask?'bg-blue-500':'bg-purple-500'} mb-1 inline-block">${isTask?'VIỆC':'ĐƠN'}</span><span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.title}</span></div>
                                ${isAdmin ? `<button onclick="window.HR_Task.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>` : ''}
                            </div>
                            <div class="flex justify-between items-center mt-2 text-[10px] text-slate-500"><span>${isTask?`Cho: <b>${assignName}</b>`:`Từ: <b>${t.by}</b>`}</span><span>${new Date(t.time).toLocaleDateString('vi-VN')}</span></div>
                            <div class="mt-2">
                                ${isDone ? `<span class="text-[10px] font-bold text-green-600">✔ Xong</span>` : 
                                    (isTask && t.to === user._id ? 
                                        (!isDoing ? `<button onclick="window.HR_Task.accept('${t.id}')" class="w-full py-1 bg-blue-100 text-blue-700 font-bold text-[10px] rounded">NHẬN VIỆC</button>` : `<button onclick="window.HR_Task.finish('${t.id}')" class="w-full py-1 bg-green-100 text-green-700 font-bold text-[10px] rounded">BÁO CÁO XONG</button>`) : 
                                        (!isTask && isAdmin ? `<button onclick="window.HR_Task.approve('${t.id}')" class="w-full py-1 bg-purple-100 text-purple-700 font-bold text-[10px] rounded">DUYỆT ĐƠN</button>` : '')
                                    )
                                }
                            </div>
                        </div>`;
                    }).join('') : '<div class="text-center text-slate-400 italic">Trống</div>'}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const btn = document.getElementById('btn-add-task');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                const to = document.getElementById('t-to').value;
                if(title && to) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title, to, by: user.name, status: 'PENDING', time: Date.now(), type: 'TASK' });
                    Utils.toast("Đã giao!"); document.getElementById('t-title').value = '';
                }
            };
        }, 100);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];

        // HÀM ĐIỂM SỐ
        window.HR_Score = { adjust: async (id, val) => { if(prompt("Lý do thay đổi điểm?")) { await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) }); Utils.toast("Đã cập nhật điểm!"); } } };

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <h2 class="font-black text-slate-700 text-lg uppercase pl-1 border-l-4 border-purple-500">NHÂN SỰ</h2>
            <div class="space-y-2">
                ${employees.map(e => `
                <div class="bg-white p-3 rounded shadow-sm border border-slate-100 flex justify-between items-center">
                    <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">${e.name.charAt(0)}</div><div><div class="font-bold text-slate-700">${e.name}</div><div class="text-xs text-slate-400">${e.role || 'NV'}</div></div></div>
                    <div class="flex items-center gap-3">
                        <div class="text-right"><div class="font-black text-2xl ${Number(e.score)>=0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div><div class="text-[8px] text-slate-400 uppercase font-bold">Điểm</div></div>
                        ${isAdmin ? `<div class="flex flex-col gap-1"><button onclick="window.HR_Score.adjust('${e._id}', 10)" class="w-6 h-6 bg-green-100 text-green-700 rounded font-bold">+</button><button onclick="window.HR_Score.adjust('${e._id}', -10)" class="w-6 h-6 bg-red-100 text-red-700 rounded font-bold">-</button></div>` : ''}
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }
};
// --- HẾT FILE ---
