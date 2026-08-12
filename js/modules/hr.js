import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, deleteDoc, increment, writeBatch, getDocs, query, where } from '../config.js';
import { Utils } from '../utils.js';

let currentTaskFilter = 'ALL';
const STANDARD_TASKS = ['Thu hoạch', 'Nhận phôi', 'Tiêm nước', 'Xuất bán', 'Vệ sinh phôi', 'Kiểm tra nhà'];

// KHO DANH NGÔN & ĐỘNG LỰC
const MOTIVATIONAL_QUOTES = [
    "Chăm nấm nấm mập, chăm làm ví dày. Chúc ngày mới bội thu! 🍄",
    "Làm việc bằng tâm, ắt sẽ vươn tầm! 💪",
    "Một nụ cười chào ngày mới, ngàn may mắn sẽ tới! ☀️",
    "Hôm nay là một ngày tuyệt vời để gặt hái thành công! 🌟",
    "Năng lượng tích cực sẽ hút tài lộc về tay! 💸",
    "Cố gắng thêm chút nữa, mẻ nấm đẹp đang chờ! 🍄",
    "Thành công bắt đầu từ việc bạn có mặt đúng giờ! ⏰"
];

const PENALTY_QUOTES = [
    "Trừ xíu điểm để nhớ nhau hơn. Kéo lại phong độ nha! 🏃‍♂️",
    "Nấm buồn vì bạn tới trễ đó. Lần sau chạy lẹ hơn nghen! 🍄",
    "Không sao, sai thì sửa, trễ thì mai đi sớm! Chiến thôi! 💪",
    "Lỡ ngủ quên xíu hả? Rửa mặt tỉnh táo rồi cày bù nha! 💦",
    "Điểm số rớt chút xíu, nhưng tinh thần phải giữ vững nha! 🔥"
];

// CỖ MÁY IN PHIẾU ĐIỆN TỬ
if (!window.showReceipt) {
    window.showReceipt = function(title, user, items, note, qrOrderCode = null) {
        const timeStr = new Date().toLocaleString('vi-VN');
        let itemsHtml = items.map(i => `<div class="flex justify-between border-b border-dashed border-slate-300 py-2"><span class="font-bold">${i.label}</span><span class="text-right">${i.value}</span></div>`).join('');
        let qrHtml = qrOrderCode ? `<div class="flex flex-col items-center mt-4 pt-4 border-t-2 border-slate-800"><div class="text-[10px] mb-2 font-bold uppercase">Quét để truy xuất nguồn gốc</div><div id="receipt-qr" class="p-2 bg-white border-2 border-slate-200 rounded-xl"></div><div class="text-[9px] mt-1 font-bold">${qrOrderCode}</div></div>` : '';

        let html = `
        <div id="print-section" class="bg-white p-6 text-slate-800 rounded-xl mx-auto w-full max-w-[120mm] shadow-2xl border border-slate-200 relative" style="font-family: 'Courier New', Courier, monospace;">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-black uppercase tracking-widest text-slate-900">NẤM ÔNG 5</h2>
                <p class="text-[10px] text-slate-500 font-bold tracking-widest">NÔNG NGHIỆP HỮU CƠ THỰC CHẤT</p>
                <div class="border-b-2 border-slate-800 w-16 mx-auto mt-3"></div>
            </div>
            <h1 class="text-lg font-black text-center uppercase mb-6 text-slate-800">${title}</h1>
            <div class="text-xs mb-4 space-y-1 text-slate-700">
                <div class="flex justify-between"><span>Thời gian:</span><span class="font-bold">${timeStr}</span></div>
                <div class="flex justify-between"><span>Người lập:</span><span class="font-bold">${user}</span></div>
            </div>
            <div class="border-t-2 border-slate-800 pt-2 mb-2 text-sm text-slate-800">
                ${itemsHtml}
            </div>
            ${note ? `<div class="text-xs mt-4 italic text-slate-600">Ghi chú: ${note}</div>` : ''}
            ${qrHtml}
            <div class="mt-8 flex justify-between text-xs text-center px-2 text-slate-800">
                <div>
                    <p class="font-bold mb-10">Người nhận</p>
                    <p class="italic text-slate-400">(Ký, họ tên)</p>
                </div>
                <div>
                    <p class="font-bold mb-10">Người lập</p>
                    <p class="font-bold text-slate-700">${user}</p>
                </div>
            </div>
        </div>
        <div class="mt-4 flex gap-2 justify-center hide-on-print relative z-50">
            <button onclick="window.print()" class="bg-blue-600 active:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><i class="fas fa-print"></i> IN / LƯU ẢNH</button>
            <button onclick="document.getElementById('receipt-overlay').remove()" class="bg-slate-200 active:bg-slate-300 text-slate-700 px-5 py-3 rounded-xl font-bold shadow-md">ĐÓNG</button>
        </div>
        <style>
            @media print {
                body * { visibility: hidden !important; }
                #receipt-overlay { background: transparent !important; }
                #print-section, #print-section * { visibility: visible !important; }
                #print-section { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; margin: 0; padding: 15px; }
                .hide-on-print { display: none !important; }
            }
        </style>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'receipt-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in';
        overlay.innerHTML = `<div class="w-full max-w-lg my-auto">${html}</div>`;
        document.body.appendChild(overlay);
    };
}

window.HR_Action = {
    addEmp: async () => {
        const name = prompt("Tên nhân viên mới:"); if (!name) return;
        const pin = prompt("Mã PIN (4 số):", "1234");
        const role = prompt("Chức vụ (admin/quản lý/tổ trưởng/nhân viên):", "nhân viên");
        try { await addDoc(collection(db, `${ROOT_PATH}/employees`), { name, pin, role: role.toLowerCase(), score: 0 }); Utils.toast("✅ Đã thêm nhân viên!"); setTimeout(() => window.location.reload(), 500); } catch(e) { alert(e.message); }
    },
    editEmp: async (id, nameEnc, currentRole) => {
        const name = decodeURIComponent(nameEnc); const newRole = prompt(`Thay đổi chức vụ cho ${name}:`, currentRole);
        if(newRole) { await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { role: newRole.toLowerCase().trim() }); Utils.toast(`✅ Đã đổi chức vụ thành ${newRole.toUpperCase()}!`); }
    },
    delEmp: async (id, name) => { if(confirm(`⚠️ XÓA VĨNH VIỄN ${name}?`)) { const el = document.getElementById(`emp-${id}`); if(el) el.remove(); try { await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id)); Utils.toast("🗑️ Đã xóa!"); } catch(e) {} } },
    resetScores: async () => {
        if(confirm("⚠️ RESET TOÀN BỘ ĐIỂM THI ĐUA VỀ 0?")) {
            const snap = await getDocs(collection(db, `${ROOT_PATH}/employees`)); const batch = writeBatch(db);
            snap.docs.forEach(d => batch.update(d.ref, { score: 0 })); await batch.commit(); Utils.toast("✅ Đã reset điểm tháng!"); window.HR_Action.chat("HỆ THỐNG", "🔄 Đã bắt đầu vòng thi đua mới!", true);
        }
    },
    chat: async (user, msg, isSystem = false) => { try { await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' }); } catch (e) {} },
    score: async (id, nameEnc, val, adminEnc) => {
        const name = decodeURIComponent(nameEnc); const reason = prompt(`Lý do thay đổi điểm cho ${name}:`);
        if(reason) { await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) }); window.HR_Action.chat("HỆ THỐNG", `⚖️ ${val>0?'Thưởng':'Phạt'} ${name} ${Math.abs(val)}đ. Lý do: ${reason}`, true); Utils.toast("Đã cập nhật điểm!"); }
    },
    remind: async (empId, nameEnc, titleEnc, type) => {
        if (!empId || empId === 'undefined') return Utils.toast("Lỗi: Không xác định được nhân sự!", "err");
        try { const name = decodeURIComponent(nameEnc); const title = decodeURIComponent(titleEnc); const penalty = type === 'ACCEPT' ? -1 : -5; await updateDoc(doc(db, `${ROOT_PATH}/employees`, empId), { score: increment(penalty) }); const scoreEl = document.getElementById(`score-${empId}`); if(scoreEl) scoreEl.innerText = (parseInt(scoreEl.innerText)||0) + penalty; Utils.toast(`Đã nhắc nhở và phạt ${Math.abs(penalty)} điểm!`); window.HR_Action.chat("NHẮC NHỞ", `⚠️ Nhắc @${name} ${type==='ACCEPT'?'nhận việc':'báo cáo'}: "${title}" (Phạt ${penalty}đ)`, true); } catch(e) { alert("Lỗi hệ thống: " + e.message); }
    },
    approve: async (id, titleEnc, userEnc, isOk) => {
        const title = decodeURIComponent(titleEnc); const user = decodeURIComponent(userEnc);
        if(confirm(isOk ? `Duyệt đơn này?` : `Từ chối?`)) { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' }); window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user}`, true); Utils.toast("Đã xử lý!"); }
    },
    task: {
        del: async (id) => { if(confirm("Xóa việc này?")) { await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); Utils.toast("Đã xóa!"); } },
        accept: async (id, tEnc, u, uid) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN VIỆC: "${decodeURIComponent(tEnc)}"`, true); Utils.toast("Đã nhận việc!"); },
        finish: (id, tEnc, u, uid) => { 
            Utils.modal("BÁO CÁO KẾT QUẢ", `
                <div class="space-y-3 text-left">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mức độ hoàn thành:</label>
                        <select id="task-result" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold text-blue-700 outline-none">
                            <option value="DONE">✅ Hoàn thành (Tính điểm thi đua)</option>
                            <option value="INCOMPLETE">⚠️ Chưa hoàn thành (Trừ -2đ)</option>
                            <option value="FAILED">❌ Chưa thực hiện (Trừ -5đ)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Ghi chú / Lý do (nếu có):</label>
                        <textarea id="task-note" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none" rows="3" placeholder="Nhập lý do nếu chưa xong..."></textarea>
                    </div>
                </div>
            `, [{ id: 'btn-confirm-finish', text: 'GỬI BÁO CÁO' }]);
            
            setTimeout(() => {
                document.getElementById('btn-confirm-finish').onclick = async () => {
                    const res = document.getElementById('task-result').value; const noteVal = document.getElementById('task-note').value;
                    if (res !== 'DONE' && !noteVal.trim()) return Utils.toast("Cần ghi rõ lý do chưa xong!", "err");
                    Utils.modal(null);
                    try {
                        const start = new Date(); start.setHours(0,0,0,0);
                        const q = query(collection(db, `${ROOT_PATH}/tasks`), where("to", "==", uid), where("time", ">=", start.getTime()));
                        const snap = await getDocs(q);
                        const count = snap.docs.filter(d => d.data().type === 'TASK').length || 1;
                        let points = Math.round(10 / count); let statusText = "HOÀN THÀNH";
                        if (res === 'INCOMPLETE') { points = -2; statusText = "CHƯA XONG"; }
                        if (res === 'FAILED') { points = -5; statusText = "BỎ VIỆC"; }

                        const batch = writeBatch(db);
                        batch.update(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE', note: noteVal, result: res });
                        batch.update(doc(db, `${ROOT_PATH}/employees`, uid), { score: increment(points) });
                        await batch.commit();
                        window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} báo cáo: "${decodeURIComponent(tEnc)}" ➔ ${statusText} (${points>0?'+'+points:points}đ)`, true); Utils.toast("Đã lưu báo cáo!");
                    } catch(e) { alert(e.message); }
                };
            }, 100);
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks'); if (!c || c.classList.contains('hidden')) return;
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc', 'tổ trưởng'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : []; const employees = Array.isArray(data.employees) ? data.employees : []; const houses = Array.isArray(data.houses) ? data.houses : [];

        let list = tasks.filter(t => !t.type || t.type === 'TASK' || t.type === 'CHECKIN');
        if(currentTaskFilter !== 'ALL') list = list.filter(t => t.to === currentTaskFilter);
        if(!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);
        list.sort((a,b) => b.time - a.time);

        const listHtml = list.length ? list.map(t => {
            const isDone = t.status === 'DONE'; const emp = employees.find(e=>e._id===t.to); const empName = emp?.name || '...'; const tEnc = encodeURIComponent(t.title); 
            const timeStr = new Date(t.time).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });
            let btns = ''; if(isAdmin) btns = `<div class="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10"><button onclick="window.HR_Action.task.del('${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-times"></i></button>${!isDone ? `<button onclick="window.HR_Action.remind('${emp?._id}','${encodeURIComponent(empName)}','${tEnc}','${t.status==='PENDING'?'ACCEPT':'REPORT'}')" class="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded shadow-sm active:scale-95 transition flex items-center gap-1"><i class="fas fa-bell"></i> Nhắc</button>` : ''}</div>`;
            let userAction = ''; if(!isDone && t.to === user._id) userAction = t.status !== 'DOING' ? `<button onclick="window.HR_Action.task.accept('${t.id}','${tEnc}','${user.name}', '${user._id}')" class="w-full mt-2 py-2 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg z-10 relative">NHẬN VIỆC</button>` : `<button onclick="window.HR_Action.task.finish('${t.id}','${tEnc}','${user.name}', '${user._id}')" class="w-full mt-2 py-2 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg z-10 relative">BÁO CÁO XONG</button>`;
            const isCheckin = t.type === 'CHECKIN';
            let boxColor = isCheckin ? 'border-purple-200 bg-purple-50/30' : (isDone ? 'opacity-60' : '');
            if (t.result === 'FAILED') boxColor = 'border-red-200 bg-red-50/50'; else if (t.result === 'INCOMPLETE') boxColor = 'border-orange-200 bg-orange-50/50';

            return `<div id="task-${t.id}" class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative ${boxColor} transition animate-fade-in">
                <div class="pr-8 relative z-0"><span class="text-xs font-bold ${isCheckin ? 'text-purple-700' : 'text-slate-700'} block ${isDone && t.result==='DONE' ?'line-through':''}">${isCheckin ? '📍 ' : ''}${t.area?`[${t.area}] `:''}${t.title}</span><span class="text-[10px] text-slate-400">Người làm: <b>${empName}</b> • ${timeStr}</span>${t.note ? `<div class="mt-1.5 text-[10px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100">📝 ${t.note}</div>` : ''}</div>
                ${btns} ${userAction}
            </div>`;
        }).join('') : '<div class="text-center text-slate-400 text-xs py-8">Chưa có công việc nào</div>';

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                <h3 class="font-black text-blue-600 text-[10px] uppercase mb-3 tracking-widest">GIAO VIỆC NHANH</h3>
                <div class="flex flex-wrap gap-1.5 mb-3">${STANDARD_TASKS.map(task => `<button onclick="document.getElementById('t-t').value = '${task}'" class="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200 active:bg-blue-500 active:text-white">${task}</button>`).join('')}</div>
                <textarea id="t-t" placeholder="Nội dung việc hoặc chọn mẫu ở trên..." class="w-full p-3 border border-slate-200 rounded-xl mb-3 text-sm outline-none focus:border-blue-400" rows="2"></textarea>
                <div class="mb-3"><div class="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">1. Chọn Khu Vực:</div><div class="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-wrap gap-2 max-h-24 overflow-y-auto"><label class="flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200"><input type="checkbox" id="check-all-houses"> Tất cả</label>${houses.map(h=>`<label class="flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200"><input type="checkbox" class="hc" value="${h.name}"> ${h.name}</label>`).join('')}</div></div>
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-1.5">
                        <div class="text-[10px] font-bold text-slate-400 uppercase">2. Chọn Tổ / Nhân Viên:</div>
                        <div class="flex gap-1"><button onclick="document.querySelectorAll('.ec').forEach(cb=>cb.checked=false); document.querySelectorAll('.ec-nhanvien').forEach(cb=>cb.checked=true)" class="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold border border-blue-100">Tổ N.Viên</button><button onclick="document.querySelectorAll('.ec').forEach(cb=>cb.checked=false); document.querySelectorAll('.ec-totruong').forEach(cb=>cb.checked=true)" class="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-bold border border-purple-100">Tổ Trưởng</button></div>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">${employees.map(e=>`<label class="flex items-center gap-1.5 text-[11px]"><input type="checkbox" class="ec ec-${e.role.replace(/\s/g,'')}" value="${e._id}" data-name="${e.name}"> ${e.name}</label>`).join('')}</div>
                </div>
                <button id="btn-tsk" class="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-100 active:scale-95 transition">GIAO VIỆC NGAY</button>
            </div>` : ''}
            
            <div class="flex justify-between items-center px-1">
                <h2 class="font-black text-xs uppercase text-slate-400 tracking-widest">NHẬT KÝ CÔNG VIỆC</h2>
                <select id="filter-emp" class="text-[10px] border border-slate-200 rounded-lg p-1 outline-none bg-white font-bold text-slate-600"><option value="ALL">Tất cả nhân sự</option>${employees.map(e=>`<option value="${e._id}" ${currentTaskFilter===e._id?'selected':''}>${e.name}</option>`).join('')}</select>
            </div>
            <div id="lst" class="space-y-2">${listHtml}</div>
        </div>`;

        setTimeout(()=>{ 
            const fSel=document.getElementById('filter-emp'); if(fSel) fSel.onchange=()=>{ currentTaskFilter=fSel.value; HR.renderTasks(data, user); };
            const chkAH=document.getElementById('check-all-houses'); if(chkAH) chkAH.onchange=(e)=>document.querySelectorAll('.hc').forEach(cb=>cb.checked=e.target.checked);
            const btn=document.getElementById('btn-tsk'); 
            if(btn) btn.onclick=async()=>{
                const taskTitle = document.getElementById('t-t').value.trim(); const hChecked = document.querySelectorAll('.hc:checked'); const areaStr = Array.from(hChecked).map(c => c.value).join(', ') || 'Chung'; const eChecked = document.querySelectorAll('.ec:checked'); 
                if(taskTitle && eChecked.length) {
                    const batch = writeBatch(db); const names = []; 
                    eChecked.forEach(c => { names.push(c.getAttribute('data-name')); const ref = doc(collection(db, `${ROOT_PATH}/tasks`)); batch.set(ref, { title: taskTitle, area: areaStr, to: c.value, by: user.name, status: 'PENDING', time: Date.now(), type: 'TASK' }); }); 
                    await batch.commit(); window.HR_Action.chat(user.name, `📢 Giao việc: "${taskTitle}" tại (${areaStr}) cho ${names.join(', ')}`, true); Utils.toast("Đã giao việc thành công!"); document.getElementById('t-t').value = '';
                } else Utils.toast("Nhập tên việc và chọn người làm!","err");
            };
        }, 100);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team'); if (!c || c.classList.contains('hidden')) return;
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : []; const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a,b) => (b.score||0) - (a.score||0)); const chats = Array.isArray(data.chat) ? data.chat.sort((a,b)=>b.time-a.time).slice(0,50) : [];
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY'].includes(t.type)); const top3 = employees.slice(0, 3); const adminEnc = encodeURIComponent(user.name);

        // Lấy câu danh ngôn ngẫu nhiên
        const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            
            <!-- BẢNG CHÀO BUỔI SÁNG -->
            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="text-3xl animate-bounce">☀️</div>
                    <div>
                        <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Chào ngày mới, ${user.name}!</div>
                        <div class="text-xs font-black text-blue-700 italic">"${randomQuote}"</div>
                    </div>
                </div>
            </div>

            ${isAdmin && pending.length ? `<div class="bg-red-50 p-3 rounded-2xl border border-red-200"><h3 class="font-bold text-red-600 text-[10px] mb-2 uppercase">CẦN DUYỆT (${pending.length})</h3><div class="space-y-2 max-h-40 overflow-y-auto">${pending.map(t=>{ 
                const time = new Date(t.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                return `<div id="task-${t.id}" class="bg-white p-2.5 rounded-xl flex justify-between items-center text-xs shadow-sm border border-red-100"><div><span class="text-[9px] bg-slate-100 text-slate-400 px-1 rounded mr-1">${time}</span><b class="text-slate-600">${t.by}</b>: ${t.title}</div><div class="flex gap-2"><button onclick="window.HR_Action.approve('${t.id}','${encodeURIComponent(t.title)}','${encodeURIComponent(t.by)}',true)" class="text-green-600 font-black px-2 py-1 bg-green-50 rounded-lg">OK</button><button onclick="window.HR_Action.approve('${t.id}','${encodeURIComponent(t.title)}','${encodeURIComponent(t.by)}',false)" class="text-red-600 font-black px-2 py-1 bg-red-50 rounded-lg">X</button></div></div>`; 
            }).join('')}</div></div>` : ''}

            <div class="bg-yellow-50 p-5 rounded-2xl border border-yellow-200 text-center shadow-sm relative overflow-hidden">
                <h3 class="font-black text-yellow-600 text-xs uppercase mb-4 tracking-widest">🏆 TOP 3 XUẤT SẮC</h3>
                <div class="flex justify-center items-end gap-3">
                    ${top3[1] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center font-bold text-slate-400 text-sm mb-1 shadow-sm">${top3[1].name.charAt(0)}</div><div class="h-14 w-14 bg-slate-200 rounded-t-xl flex flex-col justify-end pb-2 border-t-4 border-slate-300 shadow-sm"><span class="text-[10px] font-black text-slate-600">${Math.round(top3[1].score||0)}</span><span class="text-xs">🥈</span></div><div class="text-[9px] font-bold mt-1 text-slate-500 truncate w-14">${top3[1].name}</div></div>` : ''}
                    ${top3[0] ? `<div class="flex flex-col items-center z-10"><div class="w-12 h-12 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center font-black text-yellow-600 text-lg mb-1 shadow-md">${top3[0].name.charAt(0)}</div><div class="h-20 w-16 bg-gradient-to-t from-yellow-200 to-yellow-100 rounded-t-xl flex flex-col justify-end pb-2 border-t-4 border-yellow-400 shadow-lg"><span class="text-[11px] font-black text-yellow-700">${Math.round(top3[0].score||0)}</span><span class="text-lg">🥇</span></div><div class="text-[10px] font-black mt-1 text-yellow-700 truncate w-16">${top3[0].name}</div></div>` : '<div class="text-xs text-slate-400 italic">Chưa có dữ liệu</div>'}
                    ${top3[2] ? `<div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-white border-2 border-orange-200 flex items-center justify-center font-bold text-orange-300 text-sm mb-1 shadow-sm">${top3[2].name.charAt(0)}</div><div class="h-10 w-14 bg-orange-100 rounded-t-xl flex flex-col justify-end pb-1 border-t-4 border-orange-300 shadow-sm"><span class="text-[10px] font-black text-orange-600">${Math.round(top3[2].score||0)}</span><span class="text-xs">🥉</span></div><div class="text-[9px] font-bold mt-1 text-orange-500 truncate w-14">${top3[2].name}</div></div>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-4 gap-2 bg-blue-50 p-2.5 rounded-2xl border border-blue-100 shadow-sm">
                <button id="btn-checkin" class="bg-white p-2 rounded-xl flex flex-col items-center shadow-sm active:bg-blue-100 transition"><span class="text-xl">📍</span><span class="text-[9px] font-bold mt-1">Chấm công</span></button>
                <button id="btn-leave" class="bg-white p-2 rounded-xl flex flex-col items-center shadow-sm active:bg-blue-100 transition"><span class="text-xl">📝</span><span class="text-[9px] font-bold mt-1">Xin nghỉ</span></button>
                <button id="btn-buy" class="bg-white p-2 rounded-xl flex flex-col items-center shadow-sm active:bg-blue-100 transition"><span class="text-xl">🛒</span><span class="text-[9px] font-bold mt-1">Mua hàng</span></button>
                <button id="btn-notify" class="bg-white p-2 rounded-xl flex flex-col items-center shadow-sm active:bg-blue-100 transition"><span class="text-xl">🔔</span><span class="text-[9px] font-bold text-blue-600 mt-1">Bật T.Báo</span></button>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl h-80 flex flex-col shadow-sm">
                <div class="p-2 border-b font-black text-[10px] bg-slate-50 text-center text-blue-600 uppercase tracking-widest">THẢO LUẬN NHÓM</div>
                <div id="chat-list" class="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col-reverse bg-slate-50/50">
                    ${chats.map(m => {
                        const isMe = m.user === user.name; const isSys = m.type === 'NOTIFY';
                        if(isSys) return `<div class="text-center"><span class="text-[9px] bg-gray-200 px-3 py-1 rounded-full text-gray-500 font-bold uppercase">${m.message}</span></div>`;
                        const time = new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                        return `<div class="flex ${isMe?'justify-end':'justify-start'}"><div class="max-w-[85%] ${isMe?'bg-blue-600 text-white rounded-l-xl rounded-tr-xl':'bg-white border border-slate-200 text-slate-700 rounded-r-xl rounded-tl-xl'} px-3 py-2 text-xs shadow-sm"><div class="font-bold text-[9px] opacity-70 flex justify-between gap-3 mb-1"><span class="${isMe?'text-blue-200':'text-slate-400'}">${m.user}</span><span class="font-normal opacity-50">${time}</span></div>${m.message}</div></div>`;
                    }).join('')}
                </div>
                <div class="p-2 border-t flex gap-2 bg-white rounded-b-2xl"><input id="chat-msg" class="flex-1 px-3 py-2 bg-slate-100 border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400" placeholder="Nhắn tin..."><button id="chat-send" class="bg-blue-600 text-white w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition shadow-md shadow-blue-200"><i class="fas fa-paper-plane text-xs"></i></button></div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-200">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-black text-slate-400 text-[10px] uppercase tracking-widest">DANH SÁCH NHÂN SỰ (${employees.length})</h3>
                    <div class="flex gap-2">
                        ${isAdmin ? `<button onclick="window.HR_Action.resetScores()" class="text-[9px] bg-red-50 text-red-600 border border-red-200 px-2 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition">🔄 RESET ĐIỂM</button>` : ''}
                        ${isAdmin ? `<button onclick="window.HR_Action.addEmp()" class="text-[9px] bg-slate-700 text-white px-2 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition">+ THÊM NV</button>` : ''}
                    </div>
                </div>
                <div class="space-y-2.5">
                    ${employees.map(e => {
                        const nameEnc = encodeURIComponent(e.name);
                        return `<div id="emp-${e._id}" class="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                            <div class="flex gap-3 items-center">
                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs border border-slate-200">${e.name.charAt(0)}</div>
                                <div>
                                    <div class="font-bold text-xs text-slate-700 flex items-center gap-1.5">${e.name} <span class="text-[8px] font-bold text-white bg-slate-400 px-1.5 py-0.5 rounded uppercase">${e.role}</span></div>
                                    <div class="text-[10px] text-blue-500 font-black">Điểm: <span id="score-${e._id}">${Math.round(e.score||0)}</span></div>
                                </div>
                            </div>
                            <div class="flex gap-1.5 items-center">
                                ${isAdmin?`
                                <button onclick="window.HR_Action.score('${e._id}','${nameEnc}',10,'')" class="w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center font-black text-sm active:scale-90 transition">+</button>
                                <button onclick="window.HR_Action.score('${e._id}','${nameEnc}',-10,'')" class="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-black text-sm active:scale-90 transition">-</button>
                                <button onclick="window.HR_Action.editEmp('${e._id}', '${nameEnc}', '${e.role}')" class="text-slate-300 hover:text-blue-500 p-1"><i class="fas fa-pen text-[10px]"></i></button>
                                <button onclick="window.HR_Action.delEmp('${e._id}', '${nameEnc}')" class="text-slate-200 hover:text-red-500 p-1"><i class="fas fa-trash-alt text-[10px]"></i></button>
                                `:''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi yêu cầu!"); window.HR_Action.chat("HỆ THỐNG", `📝 ${user.name} yêu cầu: ${t}`, true); };
            
            const b1 = document.getElementById('btn-checkin'); 
            if(b1) b1.onclick = async () => { 
                if(confirm("Xác nhận chấm công ngay?")) { 
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                    
                    const deadlineH = 7; const deadlineM = 30;
                    const isLate = (now.getHours() > deadlineH) || (now.getHours() === deadlineH && now.getMinutes() > deadlineM);
                    const batch = writeBatch(db);
                    let msg = `📍 ${user.name} chấm công lúc ${timeStr}`;
                    
                    // --- MÁY QUÉT KỶ LUẬT ---
                    let targetDay = new Date(now);
                    targetDay.setDate(now.getDate() - 1); 
                    if (now.getDay() === 1) targetDay.setDate(now.getDate() - 2); 
                    targetDay.setHours(0,0,0,0); const startOfTarget = targetDay.getTime();
                    targetDay.setHours(23,59,59,999); const endOfTarget = targetDay.getTime();

                    const userCheckins = tasks.filter(t => t.to === user._id && t.type === 'CHECKIN');
                    const isFirstCheckin = userCheckins.length === 0;

                    const hadActivity = tasks.some(t => t.to === user._id && (t.type === 'CHECKIN' || t.type === 'LEAVE') && t.time >= startOfTarget && t.time <= endOfTarget);
                    const alreadyPunished = tasks.some(t => t.to === user._id && t.title.includes(`Nghỉ không phép (${targetDay.toLocaleDateString('vi-VN')})`));

                    let unexcusedAbsence = false;
                    if (!hadActivity && !alreadyPunished && now.getDay() !== 0 && !isFirstCheckin) {
                        unexcusedAbsence = true;
                        batch.update(doc(db, `${ROOT_PATH}/employees`, user._id), { score: increment(-5) });
                        msg += `\n❌ (Bị phát hiện nghỉ ko phép ngày ${targetDay.toLocaleDateString('vi-VN')}: -5đ)`;
                        batch.set(doc(collection(db, `${ROOT_PATH}/tasks`)), { title: `Nghỉ không phép (${targetDay.toLocaleDateString('vi-VN')})`, to: user._id, by: 'HỆ THỐNG', type: 'TASK', status: 'DONE', result: 'FAILED', note: 'Bắt lỗi tự động khi chấm công', time: now.getTime() - 1000 });
                    }

                    if(isLate) { msg += " ⏰ (TRỄ, trừ 2đ)"; batch.update(doc(db, `${ROOT_PATH}/employees`, user._id), { score: increment(-2) }); }
                    batch.set(doc(collection(db, `${ROOT_PATH}/tasks`)), { title: "Chấm công " + (isLate?"trễ":"đúng giờ"), to: user._id, by: user.name, type: 'CHECKIN', status: 'DONE', time: now.getTime() }); 
                    
                    await batch.commit(); 
                    window.HR_Action.chat("HỆ THỐNG", msg, true); 

                    // --- BẢNG THÔNG BÁO CẢNH BÁO ĐỎ KÈM ĐỘNG LỰC ---
                    let alertTitle = ""; let alertHtml = "";
                    const pQuote = PENALTY_QUOTES[Math.floor(Math.random() * PENALTY_QUOTES.length)];

                    if(unexcusedAbsence && isLate) {
                        alertTitle = "⚠️ ÔI BẠN GẶP LỖI KÉP!";
                        alertHtml = `<div class="text-center p-2"><div class="text-4xl mb-3">🏃‍♂️💨</div><div class="text-sm font-bold text-red-600 mb-4 leading-relaxed">- Vắng không phép hôm qua (-5đ)<br>- Hôm nay đi trễ (-2đ)<br>Tổng trừ: 7 điểm.</div><div class="text-xs font-bold text-slate-700 italic bg-red-50 p-3 rounded-xl border border-red-200 shadow-inner">"${pQuote}"</div></div>`;
                    } else if (unexcusedAbsence) {
                        alertTitle = "⚠️ PHÁT HIỆN NGHỈ KHÔNG PHÉP";
                        alertHtml = `<div class="text-center p-2"><div class="text-4xl mb-3">🕵️‍♂️</div><div class="text-sm font-bold text-red-600 mb-4 leading-relaxed">Hôm qua (${targetDay.toLocaleDateString('vi-VN')}) bạn vắng không phép. Hệ thống tự động trừ 5 điểm thi đua.</div><div class="text-xs font-bold text-slate-700 italic bg-red-50 p-3 rounded-xl border border-red-200 shadow-inner">"${pQuote}"</div></div>`;
                    } else if (isLate) {
                        alertTitle = "⏰ ÔI BẠN ĐẾN TRỄ!";
                        alertHtml = `<div class="text-center p-2"><div class="text-4xl mb-3">🏃‍♂️💨</div><div class="text-sm font-bold text-red-600 mb-4 leading-relaxed">Hệ thống ghi nhận bạn đi trễ và tự động trừ 2 điểm.</div><div class="text-xs font-bold text-slate-700 italic bg-red-50 p-3 rounded-xl border border-red-200 shadow-inner">"${pQuote}"</div></div>`;
                    }

                    if (alertHtml) {
                         Utils.modal(alertTitle, alertHtml, [{id:'btn-ok-penalty', text:'XÁC NHẬN & CỐ GẮNG BÙ LẠI'}]);
                         setTimeout(() => { document.getElementById('btn-ok-penalty').onclick = () => Utils.modal(null); }, 100);
                    } else {
                         Utils.toast("✅ Chấm công thành công! Chúc ngày mới vui vẻ!");
                    }
                } 
            };
            
            document.getElementById('btn-leave').onclick = () => { Utils.modal("Xin Nghỉ", `<input id="l-r" class="w-full p-3 border rounded-xl text-sm" placeholder="Lý do nghỉ..."><div class="flex gap-2 mt-2"><input type="date" id="l-d" class="w-full p-2 border rounded-xl text-sm"><input type="number" id="l-n" class="w-full p-2 border rounded-xl text-sm" value="1" placeholder="Số ngày"></div>`, [{id:'s-ok',text:'Gửi đơn'}]); setTimeout(() => { document.getElementById('l-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const r=document.getElementById('l-r').value, d=document.getElementById('l-d').value, n=document.getElementById('l-n').value; if(r&&d&&n) { sendReq(`Nghỉ ${n} ngày (${new Date(d).toLocaleDateString('vi-VN')}): ${r}`, "LEAVE"); Utils.modal(null); setTimeout(() => { if(confirm("Bạn có muốn xuất ĐƠN XIN NGHỈ PHÉP không?")) { window.showReceipt("ĐƠN XIN NGHỈ PHÉP", user.name, [{ label: "Ngày bắt đầu", value: new Date(d).toLocaleDateString('vi-VN') }, { label: "Số ngày nghỉ", value: n }, { label: "Lý do", value: r }], "Chờ quản lý duyệt"); } }, 300); } }; }, 100); };
            document.getElementById('btn-buy').onclick = () => { Utils.modal("Mua Hàng", `<input id="b-n" class="w-full p-3 border rounded-xl text-sm" placeholder="Tên món hàng..."><div class="flex gap-2 mt-2"><input type="number" id="b-q" class="w-full p-2 border rounded-xl text-sm" value="1" placeholder="SL"><input type="date" id="b-d" class="w-full p-2 border rounded-xl text-sm"></div>`, [{id:'s-ok',text:'Gửi đề xuất'}]); setTimeout(() => { document.getElementById('b-d').valueAsDate = new Date(); document.getElementById('s-ok').onclick = () => { const n=document.getElementById('b-n').value, q=document.getElementById('b-q').value, d=document.getElementById('b-d').value; if(n&&q&&d) { sendReq(`Mua ${q} ${n} (Cần ${new Date(d).toLocaleDateString('vi-VN')})`, "BUY"); Utils.modal(null); setTimeout(() => { if(confirm("Bạn có muốn xuất ĐỀ XUẤT MUA HÀNG không?")) { window.showReceipt("ĐỀ XUẤT MUA HÀNG", user.name, [{ label: "Tên vật tư/hàng hóa", value: n }, { label: "Số lượng", value: q }, { label: "Cần vào ngày", value: new Date(d).toLocaleDateString('vi-VN') }], "Chờ quản lý duyệt"); } }, 300); } }; }, 100); };
            
            const btnNotify = document.getElementById('btn-notify');
            if(btnNotify) btnNotify.onclick = () => {
                if (!("Notification" in window)) { alert("Trình duyệt không hỗ trợ thông báo!"); } 
                else if (Notification.permission === "granted") { Utils.toast("✅ Đã bật sẵn thông báo!"); try { navigator.serviceWorker.ready.then(reg => reg.showNotification("Tuyệt vời!", { body: "Bạn sẽ nhận được thông báo khi có việc mới." })).catch(() => new Notification("Tuyệt vời!", { body: "Bạn sẽ nhận được thông báo khi có việc mới." })); } catch(e) { new Notification("Tuyệt vời!", { body: "Bạn sẽ nhận được thông báo khi có việc mới." }); } } 
                else if (Notification.permission !== "denied") { Notification.requestPermission().then(permission => { if (permission === "granted") { Utils.toast("Đã cấp quyền thông báo!"); new Notification("Nấm Ông 5", { body: "Đã bật thông báo thành công!" }); } }); } 
                else { alert("Bạn đã chặn thông báo. Vui lòng mở cài đặt trình duyệt để cấp lại quyền."); }
            };

            const sendChat = async () => { const m=document.getElementById('chat-msg').value; if(m.trim()) { await window.HR_Action.chat(user.name, m); document.getElementById('chat-msg').value=''; } };
            document.getElementById('chat-send').onclick = sendChat; document.getElementById('chat-msg').onkeypress = (e) => { if(e.key==='Enter') sendChat(); };
        }, 100);
    }
};
