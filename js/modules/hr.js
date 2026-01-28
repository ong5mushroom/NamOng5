import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG CHAT THÔNG MINH ---
window.HR_Chat = async (user, msg, isSystem = false) => {
    try {
        await addDoc(collection(db, `${ROOT_PATH}/chat`), {
            user: user,          // Tên người gửi
            message: msg,        // Nội dung
            time: Date.now(),    // Thời gian
            type: isSystem ? 'NOTIFY' : 'CHAT' // Loại tin: Tin thường hoặc Thông báo
        });
    } catch(e) { console.error("Lỗi chat:", e); }
};

// --- HÀM DUYỆT ĐƠN (Chuyển về đây) ---
window.HR_Approve = {
    ok: async (id, title, reqUser, adminName) => {
        if(confirm("Duyệt đơn này?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
            Utils.toast("✅ Đã duyệt!");
            // Bắn thông báo vào chat
            window.HR_Chat("HỆ THỐNG", `✅ ${adminName} đã DUYỆT đơn: "${title}" của ${reqUser}`, true);
        }
    },
    no: async (id, title, reqUser, adminName) => {
        if(confirm("Từ chối đơn này?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'REJECT' });
            Utils.toast("❌ Đã từ chối!");
            window.HR_Chat("HỆ THỐNG", `❌ ${adminName} đã TỪ CHỐI đơn: "${title}" của ${reqUser}`, true);
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
       /* GIỮ NGUYÊN CODE RENDER TASKS Ở CÂU TRẢ LỜI TRƯỚC (PHẦN GIAO VIỆC) */
       // Để ngắn gọn, tôi chỉ viết lại phần gọi hàm từ window.HR_Chat ở đây
       // Bạn hãy chắc chắn là khi Giao Việc xong cũng gọi window.HR_Chat(...)
       
       // ... (Code phần Task giữ nguyên từ bản trước) ...
       
       // Dưới đây là phần code render giả lập để file này chạy được độc lập
       const c = document.getElementById('view-tasks');
       if(!c || c.classList.contains('hidden')) return;
       HR.renderTasks_Logic(data, user, c);
    },

    renderTasks_Logic: (data, user, c) => {
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        
        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `<div class="glass p-3 bg-blue-50/50 border border-blue-200 shadow-sm"><h3 class="font-bold text-blue-700 text-xs mb-2 uppercase">Giao việc nhóm</h3><input id="t-t" placeholder="Nội dung công việc" class="w-full p-2 border rounded text-xs mb-2 font-bold"><div class="bg-white p-2 border h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-2 rounded">${employees.map(e=>`<label class="flex items-center gap-2 text-xs"><input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}</div><button id="btn-tsk" class="w-full bg-blue-600 text-white rounded py-2 text-xs font-bold shadow-md">GIAO VIỆC NGAY</button></div>` : ''}
            <div><h2 class="font-black text-slate-700 text-sm border-l-4 border-orange-500 pl-2 mb-2 uppercase">NHẬT KÝ CÔNG VIỆC</h2><div id="lst" class="space-y-2"></div></div>
        </div>`;
        
        const render = () => {
            const list = tasks.filter(t => !t.type || t.type === 'TASK').sort((a,b)=>b.time-a.time);
            document.getElementById('lst').innerHTML = list.length ? list.map(t => {
                const isDone = t.status==='DONE';
                return `<div class="bg-white p-3 rounded border-l-4 ${isDone?'border-green-500 opacity-60':(t.status==='DOING'?'border-blue-500':'border-orange-400')} shadow-sm"><div class="text-xs font-bold text-slate-700 ${isDone?'line-through':''}">${t.title}</div><div class="text-[10px] text-slate-400 mt-1 flex justify-between"><span>Cho: <b>${employees.find(e=>e._id===t.to)?.name||'...'}</b></span><span>${new Date(t.time).toLocaleDateString('vi-VN')}</span></div></div>`
            }).join('') : '<div class="text-center text-slate-300 italic text-xs py-4">Chưa có công việc</div>';
        };
        setTimeout(()=>{
            render();
            const btn = document.getElementById('btn-tsk');
            if(btn) btn.onclick = async () => {
                const title = document.getElementById('t-t').value;
                const chk = document.querySelectorAll('.ec:checked');
                if(title && chk.length){
                    const b = db.batch(); const names=[];
                    chk.forEach(c => { 
                        b.set(doc(collection(db, `${ROOT_PATH}/tasks`)), {title, to: c.value, by: user.name, status:'PENDING', time:Date.now(), type:'TASK'}); 
                        names.push(c.getAttribute('data-name'));
                    });
                    await b.commit();
                    // THÔNG BÁO VÀO CHAT
                    window.HR_Chat(user.name, `📢 Đã giao việc: "${title}" cho ${names.join(', ')}`, true);
                    Utils.toast("Đã giao!"); render(); document.getElementById('t-t').value='';
                } else { Utils.toast("Thiếu thông tin!", "err"); }
            }
        }, 200);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];

        // LỌC ĐƠN CẦN DUYỆT (Đưa vào đây theo yêu cầu)
        const pendingReqs = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            
            ${isAdmin && pendingReqs.length > 0 ? `
            <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl animate-pop shadow-sm">
                <h3 class="font-black text-red-600 text-xs uppercase mb-2 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pendingReqs.length})</h3>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${pendingReqs.map(t => `
                        <div class="bg-white p-2 rounded border border-red-100 shadow-sm flex justify-between items-center">
                            <div>
                                <div class="text-[10px] font-bold text-slate-700">${t.by} <span class="text-slate-400 font-normal">(${t.type==='LEAVE'?'Xin nghỉ':(t.type==='BUY'?'Mua hàng':'Chấm công')})</span></div>
                                <div class="text-xs font-bold text-red-500 truncate max-w-[150px]">${t.title}</div>
                                <div class="text-[9px] text-slate-400">${new Date(t.time).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div class="flex gap-1">
                                <button onclick="window.HR_Approve.ok('${t.id}', '${t.title}', '${t.by}', '${user.name}')" class="bg-green-100 text-green-700 px-3 py-1 rounded text-[10px] font-bold hover:bg-green-200">OK</button>
                                <button onclick="window.HR_Approve.no('${t.id}', '${t.title}', '${t.by}', '${user.name}')" class="bg-slate-100 text-slate-500 px-3 py-1 rounded text-[10px] font-bold hover:bg-slate-200">Hủy</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="glass p-4 bg-purple-50/50 border border-purple-100 shadow-sm rounded-xl">
                <h3 class="font-bold text-purple-700 text-xs uppercase mb-3 text-center">Tiện ích cá nhân</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button id="btn-checkin" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-fingerprint text-2xl text-blue-500 mb-2"></i><span class="text-[10px] font-bold text-slate-600">Chấm công</span></button>
                    <button id="btn-leave" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-user-clock text-2xl text-orange-500 mb-2"></i><span class="text-[10px] font-bold text-slate-600">Xin nghỉ</span></button>
                    <button id="btn-buy" class="p-3 bg-white rounded-xl border border-purple-200 shadow-sm flex flex-col items-center active:scale-95 transition hover:shadow-md"><i class="fas fa-shopping-cart text-2xl text-green-500 mb-2"></i><span class="text-[10px] font-bold text-slate-600">Mua hàng</span></button>
                </div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">DANH SÁCH NHÂN SỰ</h2>
                <div class="space-y-2">
                    ${employees.map(e => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">${e.name.charAt(0)}</div><div><div class="font-bold text-slate-700 text-sm">${e.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'NV'}</div></div></div>
                        <div class="font-black text-xl text-green-600">${e.score || 0}</div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;

        // EVENTS CHO TIỆN ÍCH (Gửi yêu cầu + Bắn chat)
        setTimeout(() => {
            const createReq = async (title, type) => {
                await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title, to: "ADMIN", by: user.name, type, status: 'PENDING', time: Date.now() });
                Utils.toast("Đã gửi yêu cầu!");
                window.HR_Chat(user.name, `📝 Đã gửi yêu cầu: "${title}"`, true);
            };

            const b1=document.getElementById('btn-checkin'); if(b1) b1.onclick = () => { if(confirm("Chấm công?")) createReq("Đã chấm công", "CHECKIN"); };
            const b2=document.getElementById('btn-leave'); if(b2) b2.onclick = () => { const r = prompt("Lý do:"); if(r) createReq(`Xin nghỉ: ${r}`, "LEAVE"); };
            const b3=document.getElementById('btn-buy'); if(b3) b3.onclick = () => { const n = prompt("Tên món:"); if(n) createReq(`Mua: ${n}`, "BUY"); };
        }, 100);
    }
};
