import { addDoc, updateDoc, doc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if(c.classList.contains('hidden')) return;
        
        const canAssign = ['Quản lý','Tổ trưởng','Admin','Giám đốc'].includes(user.role);
        
        // Filter công việc
        const myTasks = data.tasks.filter(t => t.assignee === user.name && t.status !== 'done');
        const historyTasks = data.tasks.filter(t => (Date.now() - t.time) < 259200000).sort((a,b)=>b.time-a.time); // 3 ngày

        // HTML Giao việc (Cho quản lý)
        const assignPanel = canAssign ? `
            <div class="glass p-5 border-l-4 border-blue-500 mb-6">
                <div class="flex justify-between mb-3">
                    <h4 class="font-black text-slate-700 uppercase text-xs">Giao Việc</h4>
                    <button class="text-[10px] font-bold text-blue-600 underline" onclick="document.getElementById('task-history').classList.toggle('hidden')">Lịch sử giao</button>
                </div>
                <div class="space-y-3">
                    <input id="task-title" placeholder="Tên công việc (VD: Tưới nước, Hái nấm...)" class="font-bold">
                    <div class="grid grid-cols-2 gap-3">
                        <select id="task-house" class="w-full p-2 border rounded"><option value="Chung">-- Khu vực --</option>${data.houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}</select>
                        <input id="task-deadline" type="date">
                    </div>
                    <div class="max-h-32 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2 bg-slate-50">
                        ${data.employees.map(e=>`<label class="flex items-center space-x-2"><input type="checkbox" class="task-emp-check" value="${e.name}"><span class="text-xs font-bold">${e.name}</span></label>`).join('')}
                    </div>
                    <button id="btn-add-task" class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg btn-action">PHÁT LỆNH</button>
                </div>
                <div id="task-history" class="hidden mt-3 space-y-2 border-t pt-2 max-h-40 overflow-y-auto">
                    ${historyTasks.map(t=>`<div class="text-xs flex justify-between p-2 bg-white rounded border"><span class="font-bold">${t.title} (${t.assignee})</span><span class="${t.status==='done'?'text-green-600':'text-orange-500'}">${t.status==='done'?'Xong':'Chờ'}</span></div>`).join('')}
                </div>
            </div>` : '';

        // HTML Việc của tôi
        const myTaskList = myTasks.length ? myTasks.map(t => `
            <div class="glass p-4 border-l-4 ${t.status==='received' ? 'border-blue-500' : 'border-orange-500'} mb-3 relative animate-pop">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm">${t.title}</h4>
                        <span class="text-[10px] text-slate-500"><i class="fas fa-map-marker-alt"></i> ${t.house||'Chung'}</span>
                    </div>
                    <span class="text-[9px] px-2 py-1 rounded font-bold ${t.status==='received'?'bg-blue-100 text-blue-600':'bg-orange-100 text-orange-600'}">
                        ${t.status==='received' ? 'ĐANG LÀM' : 'MỚI'}
                    </span>
                </div>
                ${t.status === 'pending' 
                    ? `<button class="w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-receive-task" data-id="${t._id}">NHẬN VIỆC</button>`
                    : `<button class="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md btn-finish-task" data-id="${t._id}">BÁO CÁO XONG</button>`
                }
            </div>`).join('') : `<div class="text-center p-8 text-slate-400 italic">Bạn đang rảnh rỗi!</div>`;

        c.innerHTML = `<div class="space-y-4">${assignPanel}<div><h3 class="font-bold text-slate-400 text-xs uppercase pl-2 mb-2">Nhiệm Vụ Của Bạn</h3>${myTaskList}</div></div>`;

        // GẮN SỰ KIỆN
        if(canAssign) document.getElementById('btn-add-task').onclick = async () => {
            const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; 
            const checks = document.querySelectorAll('.task-emp-check:checked');
            if(!t || checks.length===0) return Utils.toast("Thiếu thông tin!", "err");
            checks.forEach(async (cb) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:cb.value, status:'pending', createdBy:user.name, time:Date.now() }); });
            Utils.toast(`Đã giao cho ${checks.length} người`);
        };

        // Nút Nhận Việc
        document.querySelectorAll('.btn-receive-task').forEach(b => b.onclick = async () => {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, b.dataset.id), {status:'received', receivedAt:Date.now()});
            Utils.toast("Đã nhận việc! Hãy làm ngay.");
        });

        // Nút Báo Cáo (Mở Modal Ghi chú)
        document.querySelectorAll('.btn-finish-task').forEach(b => b.onclick = () => {
            Utils.modal("Báo Cáo Kết Quả", `
                <p class="text-xs text-slate-500 mb-1">Ghi chú kết quả (VD: Đã tưới 30 phút, Hái được 5kg...)</p>
                <textarea id="task-note" class="w-full border p-2 rounded h-20" placeholder="Nhập ghi chú..."></textarea>
            `, [{id:'btn-confirm-finish', text:'Gửi Báo Cáo'}]);
            
            setTimeout(() => {
                document.getElementById('btn-confirm-finish').onclick = async () => {
                    const note = document.getElementById('task-note').value;
                    await updateDoc(doc(db, `${ROOT_PATH}/tasks`, b.dataset.id), {status:'done', note: note, completedBy:user.name, completedAt:Date.now()});
                    Utils.modal(null);
                    Utils.toast("Đã báo cáo xong! (+Điểm)");
                }
            }, 100);
        });
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if(c.classList.contains('hidden')) return;
        
        const isManager = ['Quản lý', 'Admin', 'Giám đốc'].includes(user.role);
        
        // HTML Danh sách nhân viên (Chỉ quản lý thấy)
        const empList = isManager ? `
            <div class="glass p-0 overflow-hidden mt-4">
                <div class="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 class="font-black text-slate-400 text-xs uppercase tracking-widest">Nhân sự & Điểm</h3>
                    <span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded">Tháng này</span>
                </div>
                <div class="max-h-80 overflow-y-auto">
                    ${data.employees.map(e => `
                    <div class="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
                        <div>
                            <div class="font-bold text-sm text-slate-700">${e.name}</div>
                            <div class="text-[10px] font-bold ${e.score >= 0 ? 'text-green-500' : 'text-red-500'}">${e.score || 0} điểm</div>
                        </div>
                        <div class="flex gap-2">
                            <button class="w-8 h-8 rounded-lg bg-red-50 text-red-500 font-bold text-xs btn-punish" data-id="${e._id}" data-name="${e.name}" data-type="phat"><i class="fas fa-minus"></i></button>
                            <button class="w-8 h-8 rounded-lg bg-green-50 text-green-500 font-bold text-xs btn-punish" data-id="${e._id}" data-name="${e.name}" data-type="thuong"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : '';

        c.innerHTML = `
            <div class="p-4 space-y-4">
                <div class="glass p-6 !bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-0 shadow-xl flex items-center gap-5">
                    <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">${user.name.charAt(0)}</div>
                    <div><h2 class="text-xl font-black uppercase">${user.name}</h2><p class="text-xs opacity-80">${user.role} • Điểm: ${user.score||0}</p></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button id="btn-checkin" class="card p-4 flex flex-col items-center gap-2 bg-white rounded-xl shadow btn-action"><i class="fas fa-fingerprint text-2xl text-green-600"></i><span class="text-xs font-bold">ĐIỂM DANH</span></button>
                    <button id="btn-leave" class="card p-4 flex flex-col items-center gap-2 bg-white rounded-xl shadow btn-action"><i class="fas fa-umbrella-beach text-2xl text-orange-600"></i><span class="text-xs font-bold">XIN NGHỈ</span></button>
                    <button id="btn-buy" class="card p-4 flex flex-col items-center gap-2 bg-white rounded-xl shadow btn-action"><i class="fas fa-shopping-cart text-2xl text-purple-600"></i><span class="text-xs font-bold">MUA HÀNG</span></button>
                    <button id="btn-logout" class="card p-4 flex flex-col items-center gap-2 bg-white rounded-xl shadow btn-action"><i class="fas fa-power-off text-2xl text-slate-500"></i><span class="text-xs font-bold">THOÁT</span></button>
                </div>
                ${empList}
            </div>`;

        // EVENTS
        document.getElementById('btn-checkin').onclick = async () => { if(confirm("Chấm công bây giờ?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:user.name, type:'CHECK_IN', time:Date.now() }); Utils.toast("✅ Đã điểm danh"); } };
        document.getElementById('btn-logout').onclick = () => { if(confirm("Đăng xuất?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } };
        
        // Modal Xin Nghỉ & Mua Hàng (Giữ nguyên logic cũ, gọi Utils.modal)
        document.getElementById('btn-leave').onclick = () => {
             Utils.modal("Xin Nghỉ Phép", `<input id="leave-date" type="date"><textarea id="leave-reason" class="w-full border p-2 rounded" placeholder="Lý do..."></textarea>`, [{id:'submit-leave', text:'Gửi Đơn'}]);
             setTimeout(()=>document.getElementById('submit-leave').onclick = async()=>{ await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), {user:user.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now()}); Utils.modal(null); Utils.toast("Đã gửi đơn"); }, 100);
        };

        // Logic Phạt/Thưởng (Quan trọng)
        if(isManager) {
            document.querySelectorAll('.btn-punish').forEach(b => b.onclick = () => {
                const isPhat = b.dataset.type === 'phat';
                Utils.modal(isPhat ? "PHẠT NHÂN VIÊN" : "THƯỞNG NHÂN VIÊN", `
                    <p class="text-sm font-bold text-slate-700 mb-2">Nhân viên: ${b.dataset.name}</p>
                    <input id="punish-score" type="number" class="w-full border p-2 rounded mb-2 font-bold text-lg ${isPhat?'text-red-600':'text-green-600'}" value="${isPhat ? 5 : 5}">
                    <input id="punish-reason" class="w-full border p-2 rounded" placeholder="Nhập lý do (Bắt buộc)...">
                `, [{id:'submit-punish', text:'Xác Nhận', cls: isPhat ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}]);

                setTimeout(() => {
                    document.getElementById('submit-punish').onclick = async () => {
                        const pts = Number(document.getElementById('punish-score').value);
                        const reason = document.getElementById('punish-reason').value;
                        if(!reason) return Utils.toast("Cần nhập lý do!", "err");
                        
                        const emp = data.employees.find(e => e._id === b.dataset.id);
                        const finalScore = (emp.score || 0) + (isPhat ? -pts : pts);
                        
                        await updateDoc(doc(db, `${ROOT_PATH}/employees`, b.dataset.id), { score: finalScore });
                        // Lưu log phạt để tra cứu sau
                        await addDoc(collection(db, `${ROOT_PATH}/hr_logs`), { user: b.dataset.name, by: user.name, type: isPhat?'PUNISH':'BONUS', point: isPhat?-pts:pts, reason, time: Date.now() });
                        
                        Utils.modal(null);
                        Utils.toast(`Đã cập nhật điểm cho ${b.dataset.name}`);
                    }
                }, 100);
            });
        }
    }
};
