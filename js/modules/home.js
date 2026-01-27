import { collection, db, ROOT_PATH, updateDoc, doc, addDoc } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM DUYỆT ĐƠN ---
window.Home_Approve = {
    chat: async (msg) => { try { await addDoc(collection(db, `${ROOT_PATH}/chat`), {user:"HỆ THỐNG", message:msg, time:Date.now()}); } catch(e){} },
    
    ok: async (id, type, reqUser, adminName) => {
        if(confirm(`Duyệt đơn ${type} của ${reqUser}?`)) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
            Utils.toast("✅ Đã duyệt!"); 
            window.Home_Approve.chat(`✅ ${adminName} đã DUYỆT đơn ${type} của ${reqUser}`);
        }
    },
    
    no: async (id, type, reqUser, adminName) => {
        if(confirm("Từ chối đơn này?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'REJECT' });
            Utils.toast("❌ Đã từ chối!"); 
            window.Home_Approve.chat(`❌ ${adminName} đã TỪ CHỐI đơn ${type} của ${reqUser}`);
        }
    },
    
    notify: () => { if("Notification" in window) Notification.requestPermission().then(p => alert(p==="granted"?"Đã bật!":"Đã chặn!")); else alert("Máy không hỗ trợ!"); },
    install: () => { alert("Android: Bấm 3 chấm -> Thêm vào màn hình chính.\niOS: Bấm Chia sẻ -> Thêm vào MH chính."); }
};

export const Home = {
    render: (data, user) => {
        const c = document.getElementById('view-home');
        if (!c || c.classList.contains('hidden')) return;
        
        // CHECK QUYỀN ADMIN (Lỏng hơn để dễ bắt)
        const role = (user && user.role) ? user.role.toLowerCase() : "";
        const isAdmin = ['admin', 'quản lý', 'quan ly', 'giám đốc', 'giam doc'].some(r => role.includes(r));

        const houses = Array.isArray(data.houses) ? data.houses : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const harvest = Array.isArray(data.harvest) ? data.harvest : [];

        // LỌC ĐƠN CHỜ DUYỆT (Bao gồm cả Chấm công, Xin nghỉ, Mua hàng)
        let pendingHTML = '';
        if(isAdmin) {
            // Lọc các task PENDING thuộc loại: LEAVE, BUY, CHECKIN
            const pends = tasks.filter(t => 
                t.status === 'PENDING' && 
                (['LEAVE', 'BUY', 'CHECKIN'].includes(t.type) || t.title.includes('Xin nghỉ') || t.title.includes('mua'))
            );

            if(pends.length) {
                pendingHTML = `
                <div class="mb-4 animate-pop">
                    <div class="bg-red-50 border-l-4 border-red-500 p-3 shadow-sm rounded-r-lg">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="font-black text-red-600 text-xs uppercase flex items-center gap-2">
                                <i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pends.length})
                            </h3>
                        </div>
                        <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                            ${pends.map(t => {
                                // Xác định loại đơn để hiển thị
                                let typeLabel = 'Yêu cầu';
                                if(t.type === 'CHECKIN') typeLabel = 'Chấm công';
                                else if(t.type === 'LEAVE') typeLabel = 'Xin nghỉ';
                                else if(t.type === 'BUY') typeLabel = 'Mua hàng';

                                return `
                                <div class="bg-white p-2 rounded border border-red-100 shadow-sm flex justify-between items-center">
                                    <div class="flex-1 pr-2">
                                        <div class="text-[10px] font-bold text-slate-700"><i class="fas fa-user"></i> ${t.by} <span class="font-normal text-slate-400">(${typeLabel})</span></div>
                                        <div class="text-xs font-bold text-red-500 truncate">${t.title}</div>
                                        <div class="text-[9px] text-slate-400">${new Date(t.time).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    <div class="flex gap-1 shrink-0">
                                        <button onclick="window.Home_Approve.ok('${t.id}','${typeLabel}','${t.by}', '${user.name}')" class="bg-green-100 text-green-700 px-2 py-1.5 rounded text-[10px] font-bold shadow-sm hover:bg-green-200 transition">Duyệt</button>
                                        <button onclick="window.Home_Approve.no('${t.id}','${typeLabel}','${t.by}', '${user.name}')" class="bg-slate-100 text-slate-500 px-2 py-1.5 rounded text-[10px] font-bold shadow-sm hover:bg-slate-200 transition">Hủy</button>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>`;
            }
        }

        // DASHBOARD
        const active = houses.filter(h => h.status === 'ACTIVE').length;
        const totalYield = harvest.reduce((a, b) => a + (Number(b.total)||0), 0);
        const houseA = houses.find(h => ['nhà a','kho a'].includes((h.name||'').toLowerCase().trim()));
        const stockA = houseA ? (houseA.batchQty||0) : 0;

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${isAdmin ? `
            <div class="flex justify-end gap-2">
                <button onclick="window.Home_Approve.notify()" class="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm active:scale-95"><i class="fas fa-bell"></i> Thông báo</button>
                <button onclick="window.Home_Approve.install()" class="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm active:scale-95"><i class="fas fa-download"></i> Cài App</button>
            </div>` : ''}

            ${pendingHTML}

            <div class="grid grid-cols-2 gap-3">
                <div class="glass p-4 bg-white shadow-sm border-b-4 border-green-500"><span class="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tổng Thu</span><div class="text-2xl font-black text-slate-700 truncate">${totalYield.toLocaleString()} <span class="text-xs text-slate-400 font-normal">kg</span></div></div>
                <div class="glass p-4 bg-white shadow-sm border-b-4 border-blue-500"><span class="text-[10px] text-slate-400 font-bold uppercase block mb-1">Đang Chạy</span><div class="text-2xl font-black text-blue-600">${active} <span class="text-xs text-slate-400 font-normal">nhà</span></div></div>
                <div class="col-span-2 glass p-4 bg-purple-50 shadow-sm border-l-4 border-purple-500 flex justify-between items-center"><div><span class="text-[10px] text-purple-500 font-bold uppercase block mb-1">KHO TỔNG (NHÀ A)</span><div class="text-3xl font-black text-purple-700">${stockA.toLocaleString()} <span class="text-xs text-purple-400 font-normal">bịch</span></div></div><div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm"><i class="fas fa-warehouse text-xl"></i></div></div>
            </div>

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">CHI TIẾT NHÀ</h3>
                <div class="grid grid-cols-2 gap-3">
                    ${houses.map(h => {
                        const isActive = h.status === 'ACTIVE';
                        const isKho = h.id === (houseA?.id);
                        let houseYield = 0;
                        if(isActive && h.startDate) {
                            const start = new Date(h.startDate).setHours(0,0,0,0);
                            houseYield = harvest.filter(l => l.area === h.name && l.time >= start).reduce((a,b) => a+(Number(b.total)||0), 0);
                        }
                        return `
                        <div class="glass p-3 border-l-4 ${isKho?'border-purple-500':(isActive?'border-green-500':'border-slate-300')} bg-white shadow-sm">
                            <div class="flex justify-between items-center mb-1"><span class="font-bold text-slate-700 text-sm truncate pr-1">${h.name}</span>${!isKho ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${isActive?'RUN':'OFF'}</span>` : ''}</div>
                            ${isKho ? `<div class="text-xs text-purple-600 font-bold mt-1 text-center bg-purple-50 rounded py-1">KHO TỔNG</div>` : (isActive ? `<div class="mt-2 border-t border-slate-100 pt-1 space-y-1"><div class="flex justify-between items-center text-[10px]"><span class="text-slate-400">Lô:</span><span class="font-bold text-slate-600 truncate max-w-[60px]">${h.currentBatch}</span></div><div class="flex justify-between items-center text-[10px]"><span class="text-slate-400">Phôi:</span><span class="font-bold text-blue-600">${(h.batchQty||0).toLocaleString()}</span></div><div class="flex justify-between items-center text-[10px] bg-green-50 px-1 py-0.5 rounded"><span class="text-green-600 font-bold">Thu:</span><span class="font-black text-green-700">${houseYield.toLocaleString()} kg</span></div></div>` : `<div class="text-[10px] text-slate-400 italic mt-2 text-center">-- Trống --</div>`)}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }
};
