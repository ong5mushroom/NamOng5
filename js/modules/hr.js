import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM TOÀN CỤC ---
window.HR_Global = {
    // Task Actions
    delTask: (id) => { if(confirm("Xóa việc này?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
    accept: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }), 
    finish: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }),  
    
    // Team Actions (Xin nghỉ/Mua/Chấm công)
    checkIn: async (userName) => {
        if(confirm("Chấm công hôm nay?")) {
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: "Đã chấm công", to: "ADMIN", by: userName, type: "CHECKIN", status: 'DONE', time: Date.now() });
            Utils.toast("✅ Đã chấm công!");
        }
    },
    reqLeave: async (userName) => {
        const r = prompt("Lý do xin nghỉ:");
        if(r) {
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: `Xin nghỉ: ${r}`, to: "ADMIN", by: userName, type: "LEAVE", status: 'PENDING', time: Date.now() });
            Utils.toast("📩 Đã gửi đơn!");
        }
    },
    reqBuy: async (userName) => {
        const n = prompt("Tên vật tư cần mua:");
        if(n) {
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: `Đề xuất mua: ${n}`, to: "ADMIN", by: userName, type: "BUY", status: 'PENDING', time: Date.now() });
            Utils.toast("📩 Đã gửi đề xuất!");
        }
    },
    adjustScore: async (id, val) => {
        if(prompt("Lý do điều chỉnh điểm?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
            Utils.toast("Đã cập nhật điểm!");
        }
    }
};

export const HR = {
    // --- TAB 1: DANH SÁCH VIỆC (GIAO VIỆC + NHẬT KÝ) ---
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];

        // UI HTML
        c.innerHTML = `
        <div class="space-y-4 pb-24">
            
            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50/50 shadow-sm border border-blue-200">
                <h3 class="font-bold text-blue-700 text-xs uppercase mb-2 flex items-center gap-2"><i class="fas fa-bullhorn"></i> Giao việc cho nhóm</h3>
                <input id="t-title" placeholder="Nội dung công việc..." class="w-full p-2.5 rounded border border-blue-300 text-sm font-bold mb-2 bg-white shadow-sm">
                
                <div class="bg-white p-2 rounded border border-blue-200 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 mb-1 flex items-center gap-2 text-blue-600 bg-blue-50 p-1 rounded">
                        <input type="checkbox" id="check-all"> Chọn tất cả
                    </label>
                    ${employees.map(e => `
                        <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="emp-check" value="${e._id}"> ${e.name}
                        </label>
                    `).join('')}
                </div>
                <button id="btn-add-task" class="w-full bg-blue-600 text-white rounded py-3 font-bold text-xs shadow-md active:scale-95 transition">GIAO VIỆC NGAY</button>
            </div>` : ''}

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="font-black text-slate-700 text-sm uppercase pl-1 border-l-4 border-orange-500">NHẬT KÝ CÔNG VIỆC</h2>
                    <select id="filter-emp" class="text-xs border border-orange-200 rounded p-1 font-bold text-slate-600 bg-white shadow-sm outline-none">
                        <option value="ALL">-- Tất cả nhân viên --</option>
                        ${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
                    </select>
                </div>

                <div id="task-list-container" class="space-y-2">
                    </div>
            </div>
        </div>`;

        // LOGIC RENDER LIST (Tách ra để filter hoạt động)
        const renderList = () => {
            const container = document.getElementById('task-list-container');
            if(!container) return;

            const filterId = document.getElementById('filter-emp').value;
            
            // Lọc dữ liệu
            let filtered = tasks.filter(t => !t.type || t.type === 'TASK'); // Chỉ lấy Task, không lấy Đơn từ
            if(filterId !== 'ALL') filtered = filtered.filter(t => t.to === filterId);
            if(!isAdmin) filtered = filtered.filter(t => t.to === user._id || t.by === user.name);
            
            filtered.sort((a,b) => b.time - a.time);

            container.innerHTML = filtered.length ? filtered.map(t => {
                const isDone = t.status === 'DONE';
                const isDoing = t.status === 'DOING';
                const assignName = employees.find(e=>e._id===t.to)?.name || '...';
                let statusColor = isDoing ? 'border-blue-500 bg-blue-50' : (isDone ? 'border-green-500 opacity-60' : 'border-orange-400');

                return `
                <div class="bg-white p-3 rounded-lg border-l-4 ${statusColor} shadow-sm relative">
                    <div class="flex justify-between items-start">
                        <div class="pr-6">
                            <span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${t.title}</span>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[9px] bg-slate-100 px-1.5 rounded text-slate-500">Người làm: <b>${assignName}</b></span>
                                <span class="text-[9px] text-slate-300">${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        ${isAdmin ? `<button onclick="window.HR_Global.delTask('${t.id}')" class="text-slate-300 hover:text-red-500 absolute top-2 right-2"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    
                    ${!isDone && t.to === user._id ? `
                    <div class="mt-2 pt-2 border-t border-dashed border-slate-100">
                        ${!isDoing ? 
                            `<button onclick="window.HR_Global.accept('${t.id}')" class="w-full py-1.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded hover:bg-blue-200">NHẬN VIỆC</button>` : 
                            `<button onclick="window.HR_Global.finish('${t.id}')" class="w-full py-1.5 bg-green-100 text-green-700 font-bold text-[10px] rounded hover:bg-green-200">BÁO CÁO XONG</button>`
                        }
                    </div>` : ''}
                    ${isDone ? `<div class="absolute bottom-2 right-2 text-[10px] font-black text-green-600">✔ XONG</div>` : ''}
                </div>`;
            }).join('') : `<div class="text-center text-slate-400 italic py-4">Không có công việc nào</div>`;
        };

        // GẮN SỰ KIỆN
        setTimeout(() => {
            renderList(); // Render lần đầu

            const filterSel = document.getElementById('filter-emp');
            if(filterSel) filterSel.onchange = renderList;

            const checkAll = document.getElementById('check-all');
            if(checkAll) checkAll.onchange = (e) => document.querySelectorAll('.emp-check').forEach(cb => cb.checked = e.target.checked);

            const btn = document.getElementById('btn-add-task');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                const checked = document.querySelectorAll('.emp-check:checked');
                if(!title) return Utils.toast("Nhập nội dung!", "err");
                if(!checked.length) return Utils.toast("Chọn nhân viên!", "err");

                const batch = db.batch();
                checked.forEach(cb => {
                    const newRef = doc(collection(db, `${ROOT_PATH}/tasks`));
                    batch.set(newRef, { title, to: cb.value, by: user.name, status: 'PENDING', time: Date.now(), type: 'TASK' });
                });
                await batch.commit();
                Utils.toast(`Đã giao cho ${checked.length} người!`);
                document.getElementById('t-title').value = '';
                document.querySelectorAll('.emp-check').forEach(cb => cb.checked = false);
                if(checkAll) checkAll.checked = false;
            };
        }, 100);
    },


    // --- TAB 2: TEAM (NHÂN SỰ + TIỆN ÍCH CÁ NHÂN) ---
    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            <div class="glass p-4 bg-purple-50/50 border border-purple-100 shadow-sm rounded-xl">
                <h3 class="font-bold text-purple-700 text-xs uppercase mb-3 text-center">Tiện ích cá nhân</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="window.HR_Global.checkIn('${user.name}')" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md">
                        <i class="fas fa-fingerprint text-2xl text-blue-500 mb-2"></i>
                        <span class="text-[10px] font-bold text-slate-600">Điểm danh</span>
                    </button>
                    <button onclick="window.HR_Global.reqLeave('${user.name}')" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md">
                        <i class="fas fa-user-clock text-2xl text-orange-500 mb-2"></i>
                        <span class="text-[10px] font-bold text-slate-600">Xin nghỉ</span>
                    </button>
                    <button onclick="window.HR_Global.reqBuy('${user.name}')" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md">
                        <i class="fas fa-shopping-cart text-2xl text-green-500 mb-2"></i>
                        <span class="text-[10px] font-bold text-slate-600">Mua hàng</span>
                    </button>
                </div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm uppercase pl-1 border-l-4 border-slate-500 mb-3">THÀNH VIÊN TEAM (${employees.length})</h2>
                <div class="space-y-2">
                    ${employees.map(e => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200 shadow-inner">
                                ${e.name.charAt(0)}
                            </div>
                            <div>
                                <div class="font-bold text-slate-700 text-sm">${e.name}</div>
                                <div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'Nhân viên'}</div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <div class="text-right">
                                <div class="font-black text-xl ${Number(e.score)>=0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div>
                                <div class="text-[8px] text-slate-400 uppercase font-bold">Điểm</div>
                            </div>
                            
                            ${isAdmin ? `
                            <div class="flex flex-col gap-1">
                                <button onclick="window.HR_Global.adjustScore('${e._id}', 10)" class="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center hover:bg-green-200 font-bold shadow-sm transition active:scale-90">+</button>
                                <button onclick="window.HR_Global.adjustScore('${e._id}', -10)" class="w-6 h-6 bg-red-100 text-red-700 rounded-lg flex items-center justify-center hover:bg-red-200 font-bold shadow-sm transition active:scale-90">-</button>
                            </div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    }
};
