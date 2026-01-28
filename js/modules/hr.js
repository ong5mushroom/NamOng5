import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM TOÀN CỤC ---
window.HR_Action = {
    chat: async (user, msg) => { try { await addDoc(collection(db, `${ROOT_PATH}/chat`), {user, message:msg, time:Date.now()}); } catch(e){} },
    
    del: (id) => { if(confirm("Xóa việc này?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
    
    accept: async (id, title, u) => { 
        await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); 
        window.HR_Action.chat(u, `💪 Đã nhận việc: ${decodeURIComponent(title)}`); 
    },
    
    finish: async (id, title, u) => { 
        await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }); 
        window.HR_Action.chat(u, `✅ Đã xong việc: ${decodeURIComponent(title)}`); 
    },
    
    // Tiện ích cá nhân
    checkIn: async (u) => { 
        if(confirm("Xác nhận chấm công?")) { 
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), {title:"Đã chấm công", to:"ADMIN", by:u, type:"CHECKIN", status:"DONE", time:Date.now()}); 
            Utils.toast("✅ Đã chấm công!"); 
            window.HR_Action.chat(u, "📍 Đã chấm công."); 
        } 
    },
    reqLeave: async (u) => { 
        const r = prompt("Lý do nghỉ:"); 
        if(r) { 
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), {title:`Xin nghỉ: ${r}`, to:"ADMIN", by:u, type:"LEAVE", status:"PENDING", time:Date.now()}); 
            Utils.toast("📩 Đã gửi đơn!"); 
            window.HR_Action.chat(u, `📝 Xin nghỉ: ${r}`); 
        } 
    },
    reqBuy: async (u) => { 
        const n = prompt("Tên đồ cần mua:"); 
        if(n) { 
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), {title:`Đề xuất mua: ${n}`, to:"ADMIN", by:u, type:"BUY", status:"PENDING", time:Date.now()}); 
            Utils.toast("📩 Đã gửi đề xuất!"); 
            window.HR_Action.chat(u, `🛒 Đề xuất mua: ${n}`); 
        } 
    },
    
    adjustScore: async (id, name, val, admin) => { 
        const r = prompt("Lý do điều chỉnh điểm?"); 
        if(r) { 
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) }); 
            const type = val > 0 ? "Thưởng" : "Phạt";
            Utils.toast("Đã lưu!"); 
            window.HR_Action.chat(admin, `⚖️ ${type} ${Math.abs(val)} điểm cho ${name}. Lý do: ${r}`);
        } 
    }
};

export const HR = {
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
            <div class="glass p-4 bg-blue-50/50 shadow-sm border border-blue-200">
                <h3 class="font-bold text-blue-700 text-xs uppercase mb-2 flex items-center gap-2"><i class="fas fa-bullhorn"></i> Giao việc nhóm</h3>
                
                <div class="space-y-2 mb-3">
                    <input id="t-title" placeholder="Nội dung công việc..." class="w-full p-2 rounded border border-blue-300 text-xs font-bold bg-white">
                    
                    <div class="flex gap-2">
                        <select id="t-area" class="w-1/2 p-2 rounded border border-blue-300 text-xs bg-white">
                            <option value="">-- Chọn Khu Vực/Nhà --</option>
                            ${houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
                            <option value="Khác">Khu vực khác</option>
                        </select>
                        <input type="date" id="t-date" class="w-1/2 p-2 rounded border border-blue-300 text-xs bg-white">
                    </div>
                </div>
                
                <div class="bg-white p-2 rounded border border-blue-200 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 mb-1 flex items-center gap-2 text-blue-600 bg-blue-50 p-1 rounded">
                        <input type="checkbox" id="check-all"> Chọn tất cả
                    </label>
                    ${employees.map(e => `
                        <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="emp-check" value="${e._id}" data-name="${e.name}"> ${e.name}
                        </label>
                    `).join('')}
                </div>
                <button id="btn-add-task" class="w-full bg-blue-600 text-white rounded py-3 font-bold text-xs shadow-md active:scale-95 transition">GIAO VIỆC NGAY</button>
            </div>` : ''}

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="font-black text-slate-700 text-sm uppercase pl-1 border-l-4 border-orange-500">NHẬT KÝ CÔNG VIỆC</h2>
                    <select id="filter-emp" class="text-xs border border-orange-200 rounded p-1 font-bold text-slate-600 bg-white shadow-sm outline-none">
                        <option value="ALL">-- Tất cả --</option>
                        ${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div id="task-list-container" class="space-y-2"></div>
            </div>
        </div>`;

        // Logic Render & Event (Tương tự cũ nhưng thêm trường Area/Date vào hiển thị)
        const renderList = () => {
            const container = document.getElementById('task-list-container');
            if(!container) return;
            const filterId = document.getElementById('filter-emp').value;
            
            let filtered = tasks.filter(t => !t.type || t.type === 'TASK');
            if(filterId !== 'ALL') filtered = filtered.filter(t => t.to === filterId);
            if(!isAdmin) filtered = filtered.filter(t => t.to === user._id || t.by === user.name);
            
            filtered.sort((a,b) => b.time - a.time);

            container.innerHTML = filtered.length ? filtered.map(t => {
                const isDone = t.status === 'DONE';
                const isDoing = t.status === 'DOING';
                const assignName = employees.find(e=>e._id===t.to)?.name || '...';
                const safeTitle = encodeURIComponent(t.title);
                
                // Format hiển thị: [Nhà 1] Tưới nấm (20/10)
                const locationInfo = t.area ? `[${t.area}] ` : '';
                const dateInfo = t.dueDate ? ` (${new Date(t.dueDate).toLocaleDateString('vi-VN').slice(0,5)})` : '';

                return `
                <div class="bg-white p-3 rounded-lg border-l-4 ${isDoing?'border-blue-500 bg-blue-50':(isDone?'border-green-500 opacity-60':'border-orange-400')} shadow-sm relative">
                    <div class="flex justify-between items-start">
                        <div class="pr-6">
                            <span class="text-xs font-bold text-slate-700 block ${isDone?'line-through':''}">${locationInfo}${t.title}${dateInfo}</span>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[9px] bg-slate-100 px-1.5 rounded text-slate-500">Người làm: <b>${assignName}</b></span>
                                <span class="text-[9px] text-slate-300">${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        ${isAdmin ? `<button onclick="window.HR_Action.del('${t.id}')" class="text-slate-300 hover:text-red-500 absolute top-2 right-2"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    
                    ${!isDone && t.to === user._id ? `
                    <div class="mt-2 pt-2 border-t border-dashed border-slate-100">
                        ${!isDoing ? 
                            `<button onclick="window.HR_Action.accept('${t.id}', '${safeTitle}', '${user.name}')" class="w-full py-1.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded hover:bg-blue-200">NHẬN VIỆC</button>` : 
                            `<button onclick="window.HR_Action.finish('${t.id}', '${safeTitle}', '${user.name}')" class="w-full py-1.5 bg-green-100 text-green-700 font-bold text-[10px] rounded hover:bg-green-200">BÁO CÁO XONG</button>`
                        }
                    </div>` : ''}
                    ${isDone ? `<div class="absolute bottom-2 right-2 text-[10px] font-black text-green-600">✔ XONG</div>` : ''}
                </div>`;
            }).join('') : `<div class="text-center text-slate-400 italic py-4">Không có công việc nào</div>`;
        };

        setTimeout(() => {
            renderList();
            const dateIn = document.getElementById('t-date'); if(dateIn) dateIn.valueAsDate = new Date();
            const filterSel = document.getElementById('filter-emp'); if(filterSel) filterSel.onchange = renderList;
            const checkAll = document.getElementById('check-all'); if(checkAll) checkAll.onchange = (e) => document.querySelectorAll('.emp-check').forEach(cb => cb.checked = e.target.checked);

            const btn = document.getElementById('btn-add-task');
            if(btn) {
                btn.onclick = async function() {
                    const me = this;
                    const title = document.getElementById('t-title').value;
                    const area = document.getElementById('t-area').value;
                    const dateVal = document.getElementById('t-date').value;
                    const checked = document.querySelectorAll('.emp-check:checked');
                    
                    if(!title) return Utils.toast("Vui lòng nhập nội dung!", "err");
                    if(!checked.length) return Utils.toast("Chưa chọn nhân viên!", "err");

                    me.innerHTML = 'Đang gửi...'; me.disabled = true;

                    try {
                        const batch = db.batch();
                        let names = [];
                        checked.forEach(cb => {
                            const newRef = doc(collection(db, `${ROOT_PATH}/tasks`));
                            batch.set(newRef, { 
                                title, 
                                area: area || '', 
                                dueDate: dateVal || '',
                                to: cb.value, 
                                by: user.name, 
                                status: 'PENDING', 
                                time: Date.now(), 
                                type: 'TASK' 
                            });
                            names.push(cb.getAttribute('data-name'));
                        });
                        await batch.commit();
                        
                        const nameStr = names.length > 3 ? `${names.length} người` : names.join(', ');
                        window.HR_Action.chat(user.name, `📢 Đã giao việc: "${title}" ${area ? `tại ${area}` : ''} cho ${nameStr}`);
                        
                        Utils.toast(`Đã giao cho ${names.length} người!`);
                        document.getElementById('t-title').value = '';
                        document.querySelectorAll('.emp-check').forEach(cb => cb.checked = false);
                        if(checkAll) checkAll.checked = false;
                    } catch (e) {
                        alert("Lỗi: " + e.message);
                    } finally {
                        me.innerHTML = 'GIAO VIỆC NGAY'; me.disabled = false;
                    }
                };
            }
        }, 300);
    },

    renderTeam: (data, user) => { /* Giữ nguyên phần Team như bản trước */
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const sortedEmployees = [...employees].sort((a,b) => (b.score || 0) - (a.score || 0));

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            <div class="glass p-4 bg-purple-50/50 border border-purple-100 shadow-sm rounded-xl">
                <h3 class="font-bold text-purple-700 text-xs uppercase mb-3 text-center">Tiện ích cá nhân</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="window.HR_Action.checkIn('${user.name}')" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-fingerprint text-2xl text-blue-500 mb-2"></i><span class="text-[10px] font-bold text-slate-600">Điểm danh</span></button>
                    <button onclick="window.HR_Action.reqLeave('${user.name}')" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-user-clock text-2xl text-orange-500 mb-2"></i><span class="text-[10px] font-bold text-slate-600">Xin nghỉ</span></button>
                    <button onclick="window.HR_Action.reqBuy('${user.name}')" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-shopping-cart text-2xl text-green-500 mb-2"></i><span class="text-[10px] font-bold text-slate-600">Mua hàng</span></button>
                </div>
            </div>
            <div>
                <h2 class="font-black text-slate-700 text-sm uppercase pl-1 border-l-4 border-yellow-500 mb-3 flex items-center gap-2"><i class="fas fa-trophy text-yellow-500"></i> BẢNG XẾP HẠNG</h2>
                <div class="space-y-2">
                    ${sortedEmployees.map((e, idx) => {
                        const rankIcon = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx+1}.`));
                        return `
                        <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                            <div class="flex items-center gap-3"><div class="font-black text-lg w-8 text-center text-slate-500">${rankIcon}</div><div><div class="font-bold text-slate-700 text-sm">${e.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'NV'}</div></div></div>
                            <div class="flex items-center gap-3"><div class="text-right"><div class="font-black text-xl ${Number(e.score)>=0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div><div class="text-[8px] text-slate-400 uppercase font-bold">Điểm</div></div>
                            ${isAdmin ? `<div class="flex flex-col gap-1"><button onclick="window.HR_Action.adjustScore('${e._id}', '${e.name}', 10, '${user.name}')" class="w-6 h-6 bg-green-100 text-green-700 rounded-lg font-bold shadow-sm">+</button><button onclick="window.HR_Action.adjustScore('${e._id}', '${e.name}', -10, '${user.name}')" class="w-6 h-6 bg-red-100 text-red-700 rounded-lg font-bold shadow-sm">-</button></div>` : ''}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }
};
