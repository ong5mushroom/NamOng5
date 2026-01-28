import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

// --- CÁC HÀM XỬ LÝ KHO (Gắn vào window) ---
window.SX_Action = {
    // 1. Xóa Lô Nhập -> Tự động TRỪ tồn kho
    delLog: async (id, qty, houseId) => {
        if (confirm(`⚠️ CẢNH BÁO:\nBạn muốn xóa lô nhập ${qty} bịch này?\n(Hệ thống sẽ tự động TRỪ ${qty} bịch khỏi Kho A)`)) {
            try {
                const batch = db.batch();
                batch.delete(doc(db, `${ROOT_PATH}/supplies`, id)); // Xóa log
                if (houseId) {
                    batch.update(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(-Number(qty)) }); // Trừ kho
                }
                await batch.commit();
                Utils.toast("✅ Đã xóa lô và cập nhật kho!");
            } catch (e) {
                alert("Lỗi: " + e.message);
            }
        }
    },

    // 2. Sửa Kho Thủ Công (Dành cho mọi trường hợp sai sót khác)
    adjustStock: async (houseId, currentQty, houseName) => {
        const val = prompt(`🛠 ĐIỀU CHỈNH KHO: ${houseName}\n\n- Nhập số dương để CỘNG (VD: 100)\n- Nhập số âm để TRỪ (VD: -50)\n\nHiện tại: ${currentQty}`);
        
        if (val) {
            const num = Number(val);
            if (isNaN(num)) return alert("Vui lòng nhập số!");
            
            if (confirm(`Xác nhận thay đổi kho ${houseName}:\n${num > 0 ? '+' : ''}${num} bịch?`)) {
                try {
                    await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(num) });
                    
                    // Lưu lại lịch sử điều chỉnh để đối chiếu sau này
                    await addDoc(collection(db, `${ROOT_PATH}/supplies`), {
                        type: 'ADJUST', // Loại log là Điều chỉnh
                        to: houseId,
                        qty: num,
                        source: 'Admin điều chỉnh tay',
                        user: 'Admin',
                        time: Date.now()
                    });
                    
                    Utils.toast("✅ Đã cập nhật số lượng!");
                } catch (e) {
                    alert("Lỗi: " + e.message);
                }
            }
        }
    }
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];

        // Tìm Kho A
        const houseA = houses.find(h => ['nhà a', 'kho a', 'kho phôi', 'kho tổng'].includes((h.name||'').trim().toLowerCase()));
        
        // Lọc lịch sử nhập (Chỉ lấy IMPORT và ADJUST của Kho A để hiển thị)
        const logsA = supplies.filter(s => houseA && s.to === houseA.id && ['IMPORT', 'ADJUST'].includes(s.type));
        logsA.sort((a,b) => b.time - a.time);

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            
            ${houseA ? `
            <div class="glass p-5 border-l-8 border-purple-500 bg-purple-50/40">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-black text-purple-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-cubes text-lg"></i> ${houseA.name} (KHO TỔNG)</h3>
                        <div class="text-[9px] text-purple-400 font-bold mt-1">Quản lý nhập phôi</div>
                    </div>
                    <div class="text-right">
                        <div class="flex items-center justify-end gap-2">
                            <span class="text-3xl font-black text-purple-700">${(houseA.batchQty || 0).toLocaleString()}</span>
                            ${isAdmin ? `<button onclick="window.SX_Action.adjustStock('${houseA.id}', ${houseA.batchQty||0}, '${houseA.name}')" class="bg-white border border-purple-200 text-purple-600 w-8 h-8 rounded-full shadow-sm hover:bg-purple-100 font-bold" title="Sửa số lượng thủ công">🛠</button>` : ''}
                        </div>
                        <span class="text-[9px] text-purple-400">bịch tồn kho</span>
                    </div>
                </div>

                ${isAdmin ? `
                <div class="bg-white p-3 rounded-xl shadow-sm border border-purple-100 mb-4">
                    <div class="flex gap-2 mb-2">
                        <input type="date" id="imp-date" class="w-1/3 p-2 rounded-lg border text-xs font-bold bg-slate-50">
                        <input type="text" id="imp-src" placeholder="Nguồn nhập (VD: Lò 7)" class="flex-1 p-2 rounded-lg border text-xs font-bold bg-slate-50">
                    </div>
                    <div class="flex gap-2">
                        <input type="number" id="imp-qty" placeholder="Số lượng nhập" class="flex-1 p-2 rounded-lg border text-xs font-bold text-center bg-slate-50">
                        <button id="btn-imp" class="bg-purple-600 text-white px-4 rounded-lg font-bold text-xs shadow-md active:scale-95 transition">NHẬP KHO (+)</button>
                    </div>
                </div>` : ''}

                <div>
                    <h4 class="font-bold text-slate-400 text-[10px] uppercase mb-1 ml-1">Lịch sử nhập & Điều chỉnh (20 dòng)</h4>
                    <div class="max-h-48 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-purple-100 shadow-inner">
                        ${logsA.length ? logsA.slice(0,20).map(l => `
                            <div class="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1 mb-1 last:border-0">
                                <div>
                                    <div class="font-bold text-slate-600">${new Date(l.time).toLocaleDateString('vi-VN')}</div>
                                    <div class="text-slate-400 italic">${l.type==='ADJUST' ? '⚠️ Điều chỉnh tay' : (l.source || 'Nguồn ngoài')}</div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-black ${l.qty > 0 ? 'text-purple-600' : 'text-red-500'} text-xs">
                                        ${l.qty > 0 ? '+' : ''}${Number(l.qty).toLocaleString()}
                                    </span>
                                    ${isAdmin && l.type === 'IMPORT' ? `<button onclick="window.SX_Action.delLog('${l._id}', ${l.qty}, '${houseA.id}')" class="text-red-300 hover:text-red-600 font-bold text-lg leading-none p-1" title="Xóa lô này">×</button>` : ''}
                                </div>
                            </div>
                        `).join('') : '<div class="text-center text-slate-300 italic text-[10px] py-2">Chưa có dữ liệu nhập</div>'}
                    </div>
                </div>
            </div>` : '<div class="p-4 text-center text-red-500 bg-red-50 rounded">Chưa tạo "Nhà A" hoặc "Kho A" trong hệ thống!</div>'}

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">TIẾN ĐỘ CÁC NHÀ KHÁC</h3>
                <div class="grid grid-cols-1 gap-3">
                    ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                        const isActive = h.status === 'ACTIVE';
                        return `
                        <div class="glass p-3 border-l-4 ${isActive?'border-green-500':'border-slate-300'} bg-white shadow-sm flex justify-between items-center">
                            <div>
                                <div class="font-bold text-slate-700">${h.name}</div>
                                <div class="text-[10px] text-slate-400 mt-0.5">Lô hiện tại: <b class="text-slate-600">${isActive ? h.currentBatch : '---'}</b></div>
                            </div>
                            <div class="text-right flex items-center gap-2">
                                <div>
                                    <span class="block font-black text-blue-600 text-lg">${(h.batchQty||0).toLocaleString()}</span>
                                    <span class="text-[8px] text-slate-400 uppercase">Bịch</span>
                                </div>
                                ${isAdmin ? `<button onclick="window.SX_Action.adjustStock('${h.id}', ${h.batchQty||0}, '${h.name}')" class="bg-slate-50 border border-slate-200 text-slate-500 w-7 h-7 rounded flex items-center justify-center hover:bg-white font-bold" title="Sửa số lượng">🛠</button>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

        // EVENTS
        setTimeout(() => {
            const di = document.getElementById('imp-date'); if(di) di.valueAsDate = new Date();
            
            const btn = document.getElementById('btn-imp');
            if(btn && houseA) {
                // Clone để tránh duplicate event
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.onclick = async () => {
                    const q = Number(document.getElementById('imp-qty').value);
                    const s = document.getElementById('imp-src').value;
                    const d = document.getElementById('imp-date').value;
                    
                    if(q > 0 && d) {
                        const batch = db.batch();
                        // 1. Tạo log nhập
                        batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), {
                            type: 'IMPORT',
                            to: houseA.id,
                            qty: q,
                            source: s,
                            user: user.name,
                            time: new Date(d).getTime()
                        });
                        // 2. Cộng kho
                        batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(q) });
                        
                        await batch.commit();
                        Utils.toast(`✅ Đã nhập +${q} bịch!`);
                        document.getElementById('imp-qty').value = '';
                    } else {
                        Utils.toast("Thiếu số lượng hoặc ngày!", "err");
                    }
                };
            }
        }, 300);
    }
};
