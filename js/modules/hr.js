import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        
        // Lọc việc
        const myTasks = isAdmin ? tasks : tasks.filter(t => t.to === user._id);
        myTasks.sort((a,b) => b.time - a.time);

        // Hàm xử lý toàn cục
        window.HR_Action = {
            done: (id) => updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }),
            del: (id) => { if(confirm("Xóa?")) deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
            // Các hàm tiện ích
            checkIn: async () => {
                if(confirm("Xác nhận chấm công hôm nay?")) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: "Đã chấm công", to: "ADMIN", by: user.name, type: "CHECKIN", time: Date.now(), status: 'PENDING' });
                    Utils.toast("Đã chấm công!");
                }
            },
            requestLeave: async () => {
                const r = prompt("Nhập lý do nghỉ:");
                if(r) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: `Xin nghỉ: ${r}`, to: "ADMIN", by: user.name, type: "LEAVE", time: Date.now(), status: 'PENDING' });
                    Utils.toast("Đã gửi đơn xin nghỉ!");
                }
            },
            buyItem: async () => {
                const n = prompt("Nhập tên món đồ/vật tư cần mua:");
                if(n) {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: `Đề xuất mua: ${n}`, to: "ADMIN", by: user.name, type: "BUY", time: Date.now(), status: 'PENDING' });
                    Utils.toast("Đã gửi yêu cầu mua!");
                }
            }
        };

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            <div class="grid grid-cols-3 gap-2">
                <button onclick="window.HR_Action.checkIn()" class="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-200 active:scale-95 transition">
                    <i class="fas fa-fingerprint text-2xl text-blue-500 mb-1"></i>
                    <span class="text-[10px] font-bold text-slate-600">Điểm danh</span>
                </button>
                <button onclick="window.HR_Action.requestLeave()" class="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-200 active:scale-95 transition">
                    <i class="fas fa-user-clock text-2xl text-orange-500 mb-1"></i>
                    <span class="text-[10px] font-bold text-slate-600">Xin nghỉ</span>
                </button>
                <button onclick="window.HR_Action.buyItem()" class="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-200 active:scale-95 transition">
                    <i class="fas fa-shopping-cart text-2xl text-green-500 mb-1"></i>
                    <span class="text-[10px] font-bold text-slate-600">Mua hàng</span>
                </button>
            </div>

            ${isAdmin ? `
            <div class="glass p-4 bg-blue-50/50 shadow-sm border border-blue-100">
                <h3 class="font-bold text-blue-700 text-xs uppercase mb-2 flex items-center gap-2"><i class="fas fa-tasks"></i> Giao việc (Nhiều người)</h3>
                
                <input id="t-title" placeholder="Nội dung công việc..." class="w-full p-2.5 rounded-lg border border-blue-200 text-sm font-bold shadow-sm mb-2 bg-white">
                
                <div class="max-h-32 overflow-y-auto bg-white border border-blue-200 rounded-lg p-2 mb-2 grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700 pb-1 border-b col-span-2">
                        <input type="checkbox" id="check-all"> Chọn tất cả
                    </label>
                    ${employees.map(e => `
                        <label class="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" class="emp-check" value="${e._id}"> ${e.name}
                        </label>
                    `).join('')}
                </div>

                <button id="btn-add-task" class="w-full bg-blue-600 text-white rounded-lg py-2 font-bold text-xs shadow-md active:scale-95 transition">GIAO VIỆC NGAY</button>
            </div>` : ''}

            <div>
                <h2 class="font-black text-slate-700 text-sm uppercase pl-1 border-l-4 border-orange-500 mb-3">DANH SÁCH VIỆC & YÊU CẦU</h2>
                <div class="space-y-2">
                    ${myTasks.length ? myTasks.map(t => {
                        const isDone = t.status === 'DONE';
                        const isReq = ['CHECKIN', 'LEAVE', 'BUY'].includes(t.type); // Là yêu cầu hay việc
                        const borderColor = isDone ? 'border-green-500' : (isReq ? 'border-purple-500' : 'border-orange-500');
                        
                        return `
                        <div class="bg-white p-3 rounded-xl border-l-4 ${borderColor} shadow-sm relative ${isDone ? 'opacity-60' : ''}">
                            <div class="flex justify-between items-start">
                                <div>
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${isReq ? 'bg-purple-500' : 'bg-blue-500'} mb-1 inline-block">${isReq ? 'YÊU CẦU' : 'NHIỆM VỤ'}</span>
                                    <h4 class="font-bold text-slate-700 text-sm ${isDone ? 'line-through' : ''}">${t.title}</h4>
                                </div>
                                ${isAdmin ? `<button onclick="window.HR_Action.del('${t.id}')" class="text-slate-300 hover:text-red-500 px-2"><i class="fas fa-trash-alt"></i></button>` : ''}
                            </div>
                            
                            <div class="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                                <span>${isReq ? `Từ: <b>${t.by}</b>` : `Cho: <b>${employees.find(e=>e._id===t.to)?.name || '...'}</b>`}</span>
                                <span>${new Date(t.time).toLocaleDateString('vi-VN')}</span>
                            </div>

                            ${!isDone && (isAdmin || (!isReq && t.to === user._id)) ? `
                                <button onclick="window.HR_Action.done('${t.id}')" class="mt-2 w-full py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded hover:bg-green-200 transition">
                                    ${isAdmin && isReq ? '✔ DUYỆT ĐƠN / XÁC NHẬN' : '✔ HOÀN THÀNH'}
                                </button>
                            ` : ''}
                            
                            ${isDone ? `<div class="mt-1 text-[10px] font-bold text-green-600 text-right">Đã xử lý</div>` : ''}
                        </div>`;
                    }).join('') : `<div class="text-center text-slate-400 italic mt-10">Không có dữ liệu</div>`}
                </div>
            </div>
        </div>`;

        // Logic Giao Việc Nhiều Người
        setTimeout(() => {
            // Chọn tất cả
            const checkAll = document.getElementById('check-all');
            if(checkAll) checkAll.onchange = (e) => {
                document.querySelectorAll('.emp-check').forEach(cb => cb.checked = e.target.checked);
            };

            const btn = document.getElementById('btn-add-task');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-title').value;
                // Lấy danh sách ID đã chọn
                const selected = Array.from(document.querySelectorAll('.emp-check:checked')).map(cb => cb.value);

                if(!title) return Utils.toast("Chưa nhập nội dung!", "err");
                if(selected.length === 0) return Utils.toast("Chưa chọn nhân viên!", "err");

                // Tạo lệnh batch để giao 1 lúc cho nhanh
                const batch = db.batch();
                selected.forEach(uid => {
                    const ref = doc(collection(db, `${ROOT_PATH}/tasks`)); // Tạo ID mới
                    batch.set(ref, { 
                        title, to: uid, by: user.name, status: 'PENDING', time: Date.now(), type: 'TASK' 
                    });
                });
                
                await batch.commit();
                Utils.toast(`Đã giao việc cho ${selected.length} người!`);
                document.getElementById('t-title').value = '';
                document.querySelectorAll('.emp-check').forEach(cb => cb.checked = false);
            };
        }, 100);
    },
    
    // (Giữ nguyên renderTeam nếu cần)
    renderTeam: (data) => { /* Code cũ */ }
};
