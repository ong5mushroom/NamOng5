import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM XỬ LÝ KHO (WINDOW) ---
window.SX_Action = {
    // Xóa Log Nhập -> Trừ Kho
    delLog: async (id, qty, houseId) => {
        if (confirm(`⚠️ Xóa lô ${qty} bịch này? (Kho A sẽ bị trừ đi)`)) {
            try {
                const batch = db.batch();
                batch.delete(doc(db, `${ROOT_PATH}/supplies`, id));
                if (houseId) batch.update(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(-Number(qty)) });
                await batch.commit();
                Utils.toast("✅ Đã xóa!");
            } catch (e) { alert(e.message); }
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

        // Tìm Kho A (Kho Phôi)
        const houseA = houses.find(h => ['nhà a', 'kho a', 'kho phôi'].includes((h.name||'').trim().toLowerCase()));
        
        // Lấy danh sách Mã Giống có trong kho A (Từ lịch sử nhập)
        const importLogs = supplies.filter(s => houseA && s.to === houseA.id && s.type === 'IMPORT');
        // Tạo danh sách mã duy nhất để chọn khi xuất
        const uniqueCodes = [...new Set(importLogs.map(l => l.code).filter(Boolean))];

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            
            ${houseA ? `
            <div class="glass p-5 border-l-8 border-purple-500 bg-purple-50/40">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-black text-purple-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-cubes text-lg"></i> KHO PHÔI (NHÀ A)</h3>
                        <div class="text-[9px] text-purple-400 font-bold mt-1">Tổng tồn kho</div>
                    </div>
                    <span class="text-3xl font-black text-purple-700">${(houseA.batchQty || 0).toLocaleString()}</span>
                </div>

                ${isAdmin ? `
                <div class="bg-white p-3 rounded-xl shadow-sm border border-purple-100 mb-4">
                    <div class="text-[10px] font-bold text-purple-700 mb-2 uppercase border-b pb-1">1. Nhập Phôi Mới</div>
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" id="imp-name" placeholder="Tên giống (VD: 049/ht)" class="p-2 rounded border text-xs font-bold">
                        <input type="date" id="imp-date" class="p-2 rounded border text-xs font-bold">
                    </div>
                    <div class="flex gap-2">
                        <input type="number" id="imp-qty" placeholder="Số lượng" class="flex-1 p-2 rounded border text-xs font-bold text-center">
                        <button id="btn-imp" class="bg-purple-600 text-white px-3 rounded font-bold text-xs shadow hover:bg-purple-700">NHẬP (+)</button>
                    </div>
                    <div class="text-[9px] text-slate-400 mt-1 italic">*Mã giống sẽ tự tạo: Tên-Ngày</div>
                </div>

                <div class="bg-white p-3 rounded-xl shadow-sm border border-green-100 mb-4">
                    <div class="text-[10px] font-bold text-green-700 mb-2 uppercase border-b pb-1">2. Xuất Phôi Cho Nhà Trồng</div>
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        <select id="exp-house" class="p-2 rounded border text-xs font-bold">
                            <option value="">-- Chọn Nhà Nhận --</option>
                            ${houses.filter(h => h.id !== houseA.id).map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                        </select>
                        <select id="exp-code" class="p-2 rounded border text-xs font-bold">
                            <option value="">-- Chọn Mã Giống --</option>
                            ${uniqueCodes.map(code => `<option value="${code}">${code}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <input type="date" id="exp-date" class="w-1/3 p-2 rounded border text-xs font-bold">
                        <input type="number" id="exp-qty" placeholder="Số lượng xuất" class="flex-1 p-2 rounded border text-xs font-bold text-center">
                        <button id="btn-exp" class="bg-green-600 text-white px-3 rounded font-bold text-xs shadow hover:bg-green-700">XUẤT (-)</button>
                    </div>
                </div>` : ''}

                <div class="mt-2">
                    <h4 class="font-bold text-slate-500 text-[10px] uppercase mb-1">Lịch sử nhập kho (Mã giống)</h4>
                    <div class="max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded border shadow-inner">
                        ${importLogs.length ? importLogs.reverse().map(l => `
                            <div class="flex justify-between items-center text-[10px] border-b border-dashed pb-1 mb-1 last:border-0">
                                <div><span class="font-bold text-slate-700 block">${l.code}</span><span class="text-slate-400">${new Date(l.time).toLocaleDateString('vi-VN')}</span></div>
                                <div class="flex items-center gap-2"><span class="font-black text-purple-600">+${Number(l.qty).toLocaleString()}</span>${isAdmin?`<button onclick="window.SX_Action.delLog('${l._id}',${l.qty},'${houseA.id}')" class="text-red-400 font-bold text-lg hover:text-red-600">×</button>`:''}</div>
                            </div>
                        `).join('') : '<div class="text-center text-slate-300 italic text-[10px]">Chưa có dữ liệu</div>'}
                    </div>
                </div>
            </div>` : '<div class="text-red-500 text-center p-4">Chưa có Nhà A</div>'}

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">TIẾN ĐỘ CÁC NHÀ</h3>
                <div class="grid grid-cols-1 gap-3">
                    ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                        const isActive = h.status === 'ACTIVE';
                        return `
                        <div class="glass p-3 border-l-4 ${isActive?'border-green-500':'border-slate-300'} bg-white shadow-sm flex justify-between items-center">
                            <div><div class="font-bold text-slate-700">${h.name}</div><div class="text-[10px] text-slate-400 mt-0.5">Lô: <b class="text-slate-600">${isActive ? h.currentBatch : '---'}</b> - ${h.batchQty} bịch</div></div>
                            <span class="text-[10px] font-bold px-2 py-1 rounded ${isActive?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${isActive?'ĐANG CHẠY':'TRỐNG'}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            if(!houseA) return;
            const dImp = document.getElementById('imp-date'); if(dImp) dImp.valueAsDate = new Date();
            const dExp = document.getElementById('exp-date'); if(dExp) dExp.valueAsDate = new Date();

            // XỬ LÝ NHẬP KHO
            const btnImp = document.getElementById('btn-imp');
            if(btnImp) {
                btnImp.onclick = async () => {
                    const name = document.getElementById('imp-name').value;
                    const dateVal = document.getElementById('imp-date').value;
                    const qty = Number(document.getElementById('imp-qty').value);
                    
                    if(!name || !dateVal || qty <= 0) return Utils.toast("Thiếu thông tin nhập!", "err");

                    // Tạo mã giống: Ten-NgayThangNam (VD: 049-28012026)
                    const d = new Date(dateVal);
                    const day = String(d.getDate()).padStart(2,'0');
                    const month = String(d.getMonth()+1).padStart(2,'0');
                    const year = d.getFullYear();
                    const code = `${name}-${day}${month}${year}`;

                    const batch = db.batch();
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), {
                        type: 'IMPORT',
                        to: houseA.id,
                        code: code, // Lưu mã giống
                        qty: qty,
                        user: user.name,
                        time: d.getTime()
                    });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(qty) });
                    
                    await batch.commit();
                    Utils.toast(`✅ Đã nhập: ${code}`);
                    document.getElementById('imp-qty').value = '';
                };
            }

            // XỬ LÝ XUẤT KHO (CẤP PHÔI)
            const btnExp = document.getElementById('btn-exp');
            if(btnExp) {
                btnExp.onclick = async () => {
                    const toHouseId = document.getElementById('exp-house').value;
                    const code = document.getElementById('exp-code').value;
                    const qty = Number(document.getElementById('exp-qty').value);
                    const dateVal = document.getElementById('exp-date').value;

                    if(!toHouseId || !code || qty <= 0) return Utils.toast("Thiếu thông tin xuất!", "err");
                    if(qty > (houseA.batchQty || 0)) return Utils.toast("Không đủ tồn kho A!", "err");

                    const batch = db.batch();
                    
                    // 1. Tạo log xuất
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), {
                        type: 'EXPORT', from: houseA.id, to: toHouseId, code: code, qty: qty, user: user.name, time: new Date(dateVal).getTime()
                    });
                    
                    // 2. Trừ Kho A
                    batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(-qty) });
                    
                    // 3. Cộng Nhà Nhận & Kích hoạt ACTIVE
                    // Lưu ý: Nếu nhà đang chạy, chỉ cộng thêm. Nếu trống, set active.
                    batch.update(doc(db, `${ROOT_PATH}/houses`, toHouseId), { 
                        status: 'ACTIVE',
                        batchQty: increment(qty),
                        currentBatch: code // Cập nhật tên lô theo mã giống vừa nhận
                    });

                    await batch.commit();
                    Utils.toast(`✅ Đã xuất ${qty} bịch sang Nhà!`);
                    document.getElementById('exp-qty').value = '';
                };
            }
        }, 200);
    }
};
