import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, deleteDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM XÓA LÔ (NHẬT KÝ NHẬP) - TỰ ĐỘNG TRỪ KHO A ---
window.SX_DelLog = async (id, qty, houseId) => {
    // 1. Hỏi: Có muốn trừ kho A không?
    if (confirm(`⚠️ CẢNH BÁO:\nBạn muốn xóa lô nhập ${qty} phôi này?\n(Kho A sẽ tự động bị TRỪ ${qty} bịch)`)) {
        try {
            const batch = db.batch();
            
            // Xóa log nhập
            batch.delete(doc(db, `${ROOT_PATH}/supplies`, id));
            
            // Trừ lại số lượng ở Kho A
            if (houseId) {
                batch.update(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(-Number(qty)) });
            }

            await batch.commit();
            Utils.toast(`✅ Đã xóa và trừ ${qty} bịch ở Kho A`);
        } catch (e) {
            alert("Lỗi: " + e.message);
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

        // Tìm Kho A (Nơi chứa phôi)
        const houseA = houses.find(h => ['nhà a', 'kho a', 'kho phôi'].includes((h.name||'').trim().toLowerCase()));
        
        // Lọc lịch sử nhập của Kho A
        const logsA = supplies.filter(s => s.to === (houseA ? houseA.id : ''));
        logsA.sort((a,b) => b.time - a.time); // Mới nhất lên đầu

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${houseA ? `
            <div class="glass p-5 border-l-8 border-purple-500 bg-purple-50/40">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-black text-purple-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-cubes text-lg"></i> KHO PHÔI (NHÀ A)</h3>
                    <div class="text-right">
                        <span class="text-[9px] text-purple-400 block font-bold">Tồn kho hiện tại</span>
                        <span class="text-2xl font-black text-purple-700">${(houseA.batchQty || 0).toLocaleString()}</span>
                    </div>
                </div>

                ${isAdmin ? `
                <div class="bg-white p-3 rounded-xl shadow-sm border border-purple-100 mb-3">
                    <div class="flex gap-2 mb-2">
                        <input type="date" id="imp-date" class="w-1/3 p-2 rounded-lg border text-xs font-bold bg-slate-50">
                        <input type="text" id="imp-source" placeholder="Nguồn nhập (VD: Lò ông Bảy)" class="flex-1 p-2 rounded-lg border text-xs font-bold bg-slate-50">
                    </div>
                    <div class="flex gap-2">
                        <input type="number" id="imp-qty" placeholder="Số lượng bịch" class="flex-1 p-2 rounded-lg border text-xs font-bold text-center bg-slate-50">
                        <button id="btn-imp" class="bg-purple-600 text-white px-4 rounded-lg font-bold text-xs shadow-md active:scale-95 transition">NHẬP KHO</button>
                    </div>
                </div>` : ''}

                <div>
                    <h4 class="font-bold text-slate-400 text-[10px] uppercase mb-1">Lịch sử nhập phôi (Gần nhất)</h4>
                    <div class="max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-purple-100 shadow-inner">
                        ${logsA.length ? logsA.map(l => `
                            <div class="flex justify-between items-center text-[10px] border-b border-dashed border-slate-100 pb-1 mb-1 last:border-0">
                                <div>
                                    <div class="font-bold text-slate-600">${new Date(l.time).toLocaleDateString('vi-VN')}</div>
                                    <div class="text-slate-400 italic">${l.source || 'Nguồn ngoài'}</div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-black text-purple-600 text-xs">+${Number(l.qty).toLocaleString()}</span>
                                    ${isAdmin ? `<button onclick="window.SX_DelLog('${l._id}', ${l.qty}, '${houseA.id}')" class="text-red-300 hover:text-red-500 font-bold text-lg leading-none" title="Xóa & Trừ kho">×</button>` : ''}
                                </div>
                            </div>
                        `).join('') : '<div class="text-center text-slate-300 italic text-[10px]">Chưa có dữ liệu nhập</div>'}
                    </div>
                </div>
            </div>` : '<div class="p-4 text-center text-red-500 bg-red-50 rounded">Chưa tạo "Nhà A" trong hệ thống!</div>'}

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">TIẾN ĐỘ CÁC NHÀ</h3>
                <div class="grid grid-cols-1 gap-3">
                    ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                        const isActive = h.status === 'ACTIVE';
                        return `
                        <div class="glass p-3 border-l-4 ${isActive?'border-green-500':'border-slate-300'} bg-white shadow-sm flex justify-between items-center">
                            <div>
                                <div class="font-bold text-slate-700">${h.name}</div>
                                <div class="text-[10px] text-slate-400">${isActive ? `Lô: ${h.currentBatch} - ${h.batchQty} bịch` : 'Đang trống'}</div>
                            </div>
                            <span class="text-[10px] font-bold px-2 py-1 rounded ${isActive?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${isActive?'ĐANG CHẠY':'TRỐNG'}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

        // EVENTS
        setTimeout(() => {
            const dateIn = document.getElementById('imp-date'); 
            if(dateIn) dateIn.valueAsDate = new Date();

            const btnImp = document.getElementById('btn-imp');
            if(btnImp && houseA) {
                // Xóa sự kiện cũ
                const newBtn = btnImp.cloneNode(true);
                btnImp.parentNode.replaceChild(newBtn, btnImp);
                
                newBtn.onclick = async () => {
                    const qty = Number(document.getElementById('imp-qty').value);
                    const source = document.getElementById('imp-source').value;
                    const dateVal = document.getElementById('imp-date').value;

                    if(qty > 0 && dateVal) {
                        const batch = db.batch();
                        // 1. Tạo log nhập
                        batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), {
                            type: 'IMPORT',
                            to: houseA.id,
                            qty: qty,
                            source: source,
                            user: user.name,
                            time: new Date(dateVal).getTime()
                        });
                        // 2. Cộng tồn kho A
                        batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(qty) });
                        
                        await batch.commit();
                        Utils.toast(`✅ Đã nhập ${qty} bịch vào Kho A`);
                        document.getElementById('imp-qty').value = '';
                    } else {
                        Utils.toast("Thiếu số lượng hoặc ngày!", "err");
                    }
                };
            }
        }, 200);
    }
};
