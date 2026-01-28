import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG XỬ LÝ (GLOBAL) ---
window.HR_Action = {
    // 1. Chat & Log
    chat: async (user, msg, isSystem = false) => {
        try { await addDoc(collection(db, `${ROOT_PATH}/chat`), { user, message: msg, time: Date.now(), type: isSystem ? 'NOTIFY' : 'CHAT' }); } catch(e) {}
    },

    // 2. Chấm điểm
    score: async (id, name, val, adminName) => {
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm cho ${name}?`);
        if(reason) {
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
            Utils.toast("Đã cập nhật điểm!");
            window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val>0?'THƯỞNG':'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
        }
    },

    // 3. Nhắc nhở
    remind: async (name, title, type) => {
        Utils.toast(`Đã nhắc ${name}!`);
        window.HR_Action.chat("NHẮC NHỞ", type === 'ACCEPT' ? `🔔 Nhắc @${name} nhận việc: "${decodeURIComponent(title)}"` : `⏰ Nhắc @${name} báo cáo: "${decodeURIComponent(title)}"`, true);
    },

    // 4. DUYỆT ĐƠN (Đã sửa lỗi click)
    approve: async (id, titleEncoded, user, admin, isOk) => {
        const title = decodeURIComponent(titleEncoded);
        if(confirm(isOk ? `Duyệt đơn "${title}"?` : `Từ chối đơn "${title}"?`)) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
                Utils.toast("Đã xử lý!");
                window.HR_Action.chat("HỆ THỐNG", `${isOk ? "✅ ĐÃ DUYỆT" : "❌ TỪ CHỐI"} đơn: "${title}" của ${user} (bởi ${admin})`, true);
            } catch(e) { alert("Lỗi: " + e.message); }
        }
    },

    // 5. Thao tác Task
    task: {
        del: async (id) => { if(confirm("Xóa việc này?")) await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
        accept: async (id, t, u) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' }); window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN: "${decodeURIComponent(t)}"`, true); },
        finish: async (id, t, u) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' }); window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} đã XONG: "${decodeURIComponent(t)}"`, true); }
    }
};

export const HR = {
    renderTasks: (data, user) => { const c = document.getElementById('view-tasks'); if(c && !c.classList.contains('hidden')) HR.renderTasks_Logic(data, user, c); },
    
    renderTasks_Logic: (data, user, c) => {
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = (Array.isArray(data.employees) ? data.employees : []).sort((a,b) => (b.score||0) - (a.score||0)); // Sắp xếp điểm giảm dần
        const houses = Array.isArray(data.houses) ? data.houses : [];
        
        // Lọc đơn cần duyệt
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));
        
        // TÍNH TOÁN TOP 3
        const top3 = employees.slice(0, 3);

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            
            ${isAdmin && pending.length ? `
            <div class="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm animate-pulse-slow">
                <h3 class="font-black text-red-600 text-xs uppercase mb-3 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT GẤP (${pending.length})</h3>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${pending.map(t => `
                        <div class="bg-white p-3 rounded-lg shadow-sm border border-red-100 flex justify-between items-center">
                            <div>
                                <div class="text-[10px] font-bold text-slate-500">${t.by} • ${t.type==='LEAVE'?'Xin nghỉ':(t.type==='BUY'?'Mua hàng':'Chấm công')}</div>
                                <div class="text-xs font-bold text-slate-800 line-clamp-1">${t.title}</div>
                                <div class="text-[9px] text-slate-400">${new Date(t.time).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="window.HR_Action.approve('${t.id}', '${encodeURIComponent(t.title)}', '${t.by}', '${user.name}', true)" class="bg-green-100 text-green-700 w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-green-200 shadow-sm">✓</button>
                                <button onclick="window.HR_Action.approve('${t.id}', '${encodeURIComponent(t.title)}', '${t.by}', '${user.name}', false)" class="bg-red-100 text-red-700 w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-red-200 shadow-sm">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-xl border border-yellow-200 shadow-sm text-center relative overflow-hidden">
                <div class="absolute top-0 right-0 p-2 opacity-10"><i class="fas fa-trophy text-6xl text-yellow-500"></i></div>
                <h3 class="font-black text-yellow-600 text-xs uppercase mb-4 tracking-widest">🏆 TOP 3 NHÂN VIÊN XUẤT SẮC</h3>
                <div class="flex justify-center items-end gap-2">
                    ${top3[1] ? `
                    <div class="flex flex-col items-center">
                        <div class="w-10 h-10 rounded-full border-2 border-slate-300 bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-sm mb-1">${top3[1].name.charAt(0)}</div>
                        <div class="h-16 w-14 bg-slate-200 rounded-t-lg flex flex-col justify-end pb-2 border-t-4 border-slate-400">
                            <span class="text-[10px] font-bold text-slate-600">${top3[1].score}đ</span>
                            <span class="text-[20px]">🥈</span>
                        </div>
                        <div class="text-[9px] font-bold text-slate-500 mt-1 truncate w-14">${top3[1].name}</div>
                    </div>` : ''}

                    ${top3[0] ? `
                    <div class="flex flex-col items-center z-10">
                        <div class="w-12 h-12 rounded-full border-2 border-yellow-400 bg-yellow-100 flex items-center justify-center font-bold text-yellow-600 text-sm shadow-md mb-1 relative">
                            ${top3[0].name.charAt(0)}
                            <i class="fas fa-crown absolute -top-3 text-yellow-500 text-xs animate-bounce"></i>
                        </div>
                        <div class="h-20 w-16 bg-yellow-100 rounded-t-lg flex flex-col justify-end pb-2 border-t-4 border-yellow-400 shadow-lg">
                            <span class="text-xs font-black text-yellow-700">${top3[0].score}đ</span>
                            <span class="text-[24px]">🥇</span>
                        </div>
                        <div class="text-[10px] font-bold text-yellow-700 mt-1 truncate w-16">${top3[0].name}</div>
                    </div>` : '<div class="text-xs text-slate-400 italic">Chưa có dữ liệu</div>'}

                    ${top3[2] ? `
                    <div class="flex flex-col items-center">
                        <div class="w-10 h-10 rounded-full border-2 border-orange-300 bg-orange-50 flex items-center justify-center font-bold text-orange-600 text-xs shadow-sm mb-1">${top3[2].name.charAt(0)}</div>
                        <div class="h-12 w-14 bg-orange-100 rounded-t-lg flex flex-col justify-end pb-2 border-t-4 border-orange-400">
                            <span class="text-[10px] font-bold text-orange-700">${top3[2].score}đ</span>
                            <span class="text-[20px]">🥉</span>
                        </div>
                        <div class="text-[9px] font-bold text-slate-500 mt-1 truncate w-14">${top3[2].name}</div>
                    </div>` : ''}
                </div>
            </div>

            <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl shadow-lg text-white">
                <h3 class="font-bold text-xs uppercase mb-3 opacity-80 text-center tracking-widest">Tiện ích</h3>
                <div class="grid grid-cols-3 gap-3">
                    <button id="btn-checkin" class="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/10 transition"><div class="text-2xl">📍</div><span class="text-[10px] font-bold">Chấm công</span></button>
                    <button id="btn-leave" class="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/10 transition"><div class="text-2xl">📝</div><span class="text-[10px] font-bold">Xin nghỉ</span></button>
                    <button id="btn-buy" class="flex flex-col items-center gap-2 group p-2 rounded-lg hover:bg-white/10 transition"><div class="text-2xl">🛒</div><span class="text-[10px] font-bold">Mua hàng</span></button>
                </div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">BẢNG XẾP HẠNG</h2>
                <div class="space-y-2">
                    ${employees.map((e, index) => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-200 transition relative overflow-hidden">
                        ${index < 3 ? `<div class="absolute -left-3 -top-3 w-8 h-8 ${index===0?'bg-yellow-400':(index===1?'bg-slate-300':'bg-orange-300')} rotate-45"></div>` : ''}
                        <div class="flex items-center gap-3 pl-2">
                            <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-500 border border-slate-200 text-xs">${index + 1}</div>
                            <div>
                                <div class="font-bold text-slate-700 text-sm flex items-center gap-1">
                                    ${e.name}
                                    ${e.score >= 100 ? '<i class="fas fa-fire text-orange-500 text-[10px]"></i>' : ''}
                                </div>
                                <div class="text-[9px] text-slate-400 font-bold uppercase">${e.role || 'Nhân viên'}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="font-black text-lg ${e.score >= 0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div>
                            ${isAdmin ? `
                            <div class="flex flex-col gap-1">
                                <button onclick="window.HR_Action.score('${e._id}','${e.name}',10,'${user.name}')" class="w-6 h-6 bg-green-50 text-green-600 rounded flex items-center justify-center font-bold text-xs hover:bg-green-100 shadow-sm">+</button>
                                <button onclick="window.HR_Action.score('${e._id}','${e.name}',-10,'${user.name}')" class="w-6 h-6 bg-red-50 text-red-600 rounded flex items-center justify-center font-bold text-xs hover:bg-red-100 shadow-sm">-</button>
                            </div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;

        // EVENTS (Gắn sự kiện)
        setTimeout(() => {
            const sendReq = async (t, type) => { await addDoc(collection(db,`${ROOT_PATH}/tasks`), {title:t, to:'ADMIN', by:user.name, type, status:'PENDING', time:Date.now()}); Utils.toast("Đã gửi!"); window.HR_Action.chat(user.name, `📝 Yêu cầu: ${t}`, true); };
            
            // Nút Chấm công
            const b1=document.getElementById('btn-checkin'); if(b1) b1.onclick = () => { if(confirm("Xác nhận chấm công?")) sendReq("Đã chấm công", "CHECKIN"); };
            
            // Nút Xin nghỉ
            const b2=document.getElementById('btn-leave'); 
            if(b2) b2.onclick=()=>{Utils.modal("Xin Nghỉ Phép",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500 uppercase">Lý do</label><input id="l-r" class="w-full p-2 border rounded text-xs" placeholder="VD: Việc riêng..."></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500 uppercase">Từ ngày</label><input type="date" id="l-d" class="w-full p-2 border rounded text-xs"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500 uppercase">Số ngày</label><input type="number" id="l-n" class="w-full p-2 border rounded text-xs text-center" value="1"></div></div></div>`,[{id:'s-ok',text:'Gửi Đơn'}]);setTimeout(()=>{document.getElementById('l-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const r=document.getElementById('l-r').value,d=document.getElementById('l-d').value,n=document.getElementById('l-n').value;if(r&&d&&n){sendReq(`Xin nghỉ ${n} ngày (từ ${new Date(d).toLocaleDateString('vi-VN')}). Lý do: ${r}`,"LEAVE");Utils.modal(null);}else alert("Thiếu thông tin!")}},100)};
            
            // Nút Mua hàng
            const b3=document.getElementById('btn-buy'); 
            if(b3) b3.onclick=()=>{Utils.modal("Đề Xuất Mua",`<div class="space-y-2"><div><label class="text-[10px] font-bold text-slate-500 uppercase">Tên vật tư</label><input id="b-n" class="w-full p-2 border rounded text-xs" placeholder="VD: Bóng đèn..."></div><div class="flex gap-2"><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500 uppercase">Số lượng</label><input type="number" id="b-q" class="w-full p-2 border rounded text-xs text-center" value="1"></div><div class="w-1/2"><label class="text-[10px] font-bold text-slate-500 uppercase">Ngày cần</label><input type="date" id="b-d" class="w-full p-2 border rounded text-xs"></div></div></div>`,[{id:'s-ok',text:'Gửi Đề Xuất'}]);setTimeout(()=>{document.getElementById('b-d').valueAsDate=new Date();document.getElementById('s-ok').onclick=()=>{const n=document.getElementById('b-n').value,q=document.getElementById('b-q').value,d=document.getElementById('b-d').value;if(n&&q&&d){sendReq(`Mua ${q} ${n} (Cần ngày ${new Date(d).toLocaleDateString('vi-VN')})`,"BUY");Utils.modal(null);}else alert("Thiếu thông tin!")}},100)};
        }, 100);
    }
};
