import { collection, db, ROOT_PATH, updateDoc, doc, addDoc } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM DUYỆT ĐƠN (CÓ CHAT LOG) ---
window.Home_Action = {
    // Hàm phụ trợ chat
    logChat: async (msg) => {
        try { await addDoc(collection(db, `${ROOT_PATH}/chat`), { user: "HỆ THỐNG", message: msg, time: Date.now() }); } catch(e){}
    },

    approve: async (id, type, requester, adminName) => {
        const typeName = type === 'LEAVE' ? 'Xin nghỉ' : (type === 'BUY' ? 'Mua hàng' : 'Yêu cầu');
        if(confirm(`Duyệt đơn ${typeName} của ${requester}?`)) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
            Utils.toast("✅ Đã duyệt!");
            window.Home_Action.logChat(`✅ ${adminName} đã DUYỆT đơn ${typeName} của ${requester}`);
        }
    },
    
    reject: async (id, type, requester, adminName) => {
        const typeName = type === 'LEAVE' ? 'Xin nghỉ' : (type === 'BUY' ? 'Mua hàng' : 'Yêu cầu');
        if(confirm(`Từ chối đơn này?`)) {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'REJECT' });
            Utils.toast("❌ Đã từ chối!");
            window.Home_Action.logChat(`❌ ${adminName} đã TỪ CHỐI đơn ${typeName} của ${requester}`);
        }
    }
};

export const Home = {
    render: (data, user) => {
        const c = document.getElementById('view-home');
        if (!c || c.classList.contains('hidden')) return;
        
        // --- 1. KIỂM TRA QUYỀN ADMIN (CHẶT CHẼ HƠN) ---
        const userRole = (user && user.role) ? user.role.toLowerCase().trim() : "";
        // Chấp nhận các từ khóa: admin, quản lý, quan ly, giám đốc, giam doc
        const isAdmin = ['admin', 'quản lý', 'quan ly', 'giám đốc', 'giam doc'].some(r => userRole.includes(r));

        const houses = Array.isArray(data.houses) ? data.houses : [];
        const harvest = Array.isArray(data.harvest) ? data.harvest : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];

        // --- 2. LỌC ĐƠN CẦN DUYỆT ---
        let pendingHTML = '';
        
        if (isAdmin) {
            // Lọc các task có trạng thái PENDING và type là LEAVE hoặc BUY
            // Hoặc task cũ chưa có type nhưng title chứa "Xin nghỉ" hoặc "mua"
            const pendingReqs = tasks.filter(t => {
                const isPending = t.status === 'PENDING';
                const isTypeReq = ['LEAVE', 'BUY'].includes(t.type);
                // Fallback cho data cũ: check title nếu ko có type
                const isTitleReq = !t.type && (t.title.toLowerCase().includes('xin nghỉ') || t.title.toLowerCase().includes('mua'));
                
                return isPending && (isTypeReq || isTitleReq);
            });

            if (pendingReqs.length > 0) {
                pendingHTML = `
                <div class="mb-4 animate-pop">
                    <div class="bg-red-50 border-l-4 border-red-500 p-3 shadow-sm rounded-r-lg">
                        <h3 class="font-black text-red-600 text-xs uppercase mb-2 flex items-center gap-2">
                            <i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT GẤP (${pendingReqs.length})
                        </h3>
                        <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
                            ${pendingReqs.map(t => {
                                // Xác định loại nếu thiếu type
                                const safeType = t.type || (t.title.toLowerCase().includes('mua') ? 'BUY' : 'LEAVE');
                                
                                return `
                                <div class="bg-white p-2 rounded border border-red-100 shadow-sm flex justify-between items-center">
                                    <div>
                                        <div class="text-[10px] font-bold text-slate-700"><i class="fas fa-user-circle"></i> ${t.by || 'Ẩn danh'}</div>
                                        <div class="text-xs font-bold text-red-500">${t.title}</div>
                                        <div class="text-[9px] text-slate-400">${new Date(t.time).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    <div class="flex gap-1">
                                        <button onclick="window.Home_Action.approve('${t.id}', '${safeType}', '${t.by}', '${user.name}')" class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold shadow-sm hover:bg-green-200 transition">Duyệt</button>
                                        <button onclick="window.Home_Action.reject('${t.id}', '${safeType}', '${t.by}', '${user.name}')" class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold shadow-sm hover:bg-slate-200 transition">Hủy</button>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>`;
            }
        }
        
        // --- 3. DỮ LIỆU TỔNG QUAN (GIỮ NGUYÊN) ---
        const active = houses.filter(h => h.status === 'ACTIVE').length;
        const totalYield = harvest.reduce((acc, h) => acc + (Number(h.total)||0), 0);
        const houseA = houses.find(h => ['nhà a','kho a','kho phôi'].includes((h.name||'').trim().toLowerCase()));
        const spawnStock = houseA ? (Number(houseA.batchQty) || 0) : 0;

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            
            ${pendingHTML}

            <div class="grid grid-cols-2 gap-3">
                <div class="glass p-4 bg-white shadow-sm border-b-4 border-green-500">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tổng nấm thu</span>
                    <div class="text-2xl font-black text-slate-700 truncate">${totalYield.toLocaleString()} <span class="text-xs text-slate-400 font-normal">kg</span></div>
                </div>
                <div class="glass p-4 bg-white shadow-sm border-b-4 border-blue-500">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block mb-1">Đang chạy</span>
                    <div class="text-2xl font-black text-blue-600">${active} <span class="text-xs text-slate-400 font-normal">nhà</span></div>
                </div>
                <div class="col-span-2 glass p-4 bg-purple-50 shadow-sm border-l-4 border-purple-500 flex justify-between items-center">
                    <div><span class="text-[10px] text-purple-500 font-bold uppercase block mb-1">TỔNG KHO PHÔI (NHÀ A)</span><div class="text-3xl font-black text-purple-700">${spawnStock.toLocaleString()} <span class="text-xs text-purple-400 font-normal">bịch</span></div></div>
                    <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm"><i class="fas fa-warehouse text-xl"></i></div>
                </div>
            </div>

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">CHI TIẾT NHÀ</h3>
                <div class="grid grid-cols-2 gap-3">
                    ${houses.map(h => {
                        const isActive = h.status === 'ACTIVE';
                        const isKho = h.id === (houseA?.id);
                        let houseYield = 0;
                        if (isActive && h.startDate) {
                            const startTimestamp = new Date(h.startDate).setHours(0,0,0,0);
                            houseYield = harvest.filter(l => l.area === h.name && l.time >= startTimestamp).reduce((sum, l) => sum + (Number(l.total) || 0), 0);
                        }
                        return `
                        <div class="glass p-3 border-l-4 ${isKho?'border-purple-500':(isActive?'border-green-500':'border-slate-300')} bg-white shadow-sm">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-bold text-slate-700 text-sm truncate pr-1">${h.name}</span>
                                ${!isKho ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${isActive?'RUN':'OFF'}</span>` : ''}
                            </div>
                            ${isKho ? `<div class="text-xs text-purple-600 font-bold mt-1 text-center bg-purple-50 rounded py-1">KHO TỔNG</div>` : (isActive ? `
                                <div class="mt-2 border-t border-slate-100 pt-1 space-y-1">
                                    <div class="flex justify-between items-center text-[10px]"><span class="text-slate-400">Lô:</span><span class="font-bold text-slate-600 truncate max-w-[60px]">${h.currentBatch}</span></div>
                                    <div class="flex justify-between items-center text-[10px]"><span class="text-slate-400">Phôi:</span><span class="font-bold text-blue-600">${(h.batchQty||0).toLocaleString()}</span></div>
                                    <div class="flex justify-between items-center text-[10px] bg-green-50 px-1 py-0.5 rounded"><span class="text-green-600 font-bold">Thu:</span><span class="font-black text-green-700">${houseYield.toLocaleString()} kg</span></div>
                                </div>` : `<div class="text-[10px] text-slate-400 italic mt-2 text-center">-- Trống --</div>`)}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }
};
