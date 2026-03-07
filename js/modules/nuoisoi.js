import { doc, collection, db, ROOT_PATH, writeBatch, increment } from '../config.js';
import { Utils } from '../utils.js';

window.NuoiSoi_Action = {
    edit: (id, currentQty, currentBatch, userName) => {
        currentQty = Number(currentQty) || 0;
        const houses = window._tempHouses || [];
        const houseA = window._tempHouseA || {};

        Utils.modal(`THAO TÁC GIÀN ${id}`, `
            <div class="flex gap-1 bg-slate-100 p-1 rounded-lg mb-3">
                <button id="btn-tab-nhap" class="flex-1 py-2 text-xs font-bold bg-white text-blue-600 rounded shadow-sm transition">NHẬP / SỬA GIÀN</button>
                <button id="btn-tab-xuat" class="flex-1 py-2 text-xs font-bold text-slate-500 rounded transition">LỌC & XUẤT PHÔI</button>
            </div>

            <div id="tab-nhap" class="space-y-3 animate-fade-in">
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase">Mã Lô cấy:</label>
                    <input type="text" id="ns-batch" value="${currentBatch || ''}" class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-sm font-bold uppercase" placeholder="VD: 049">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase">Số lượng phôi thực tế trên giàn:</label>
                    <input type="number" id="ns-qty" value="${currentQty || ''}" class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-sm font-bold" placeholder="Nhập số lượng...">
                </div>
                <button id="btn-save-nhap" class="w-full py-3 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-lg mt-2 shadow-md">LƯU CẬP NHẬT GIÀN</button>
            </div>

            <div id="tab-xuat" class="hidden space-y-3 animate-fade-in">
                <div class="bg-blue-50 p-2 rounded-lg border border-blue-100 flex justify-between items-center">
                    <span class="text-xs font-bold text-blue-800">Mã Gốc: <span class="bg-white px-2 py-0.5 rounded border border-blue-200">${currentBatch || '--'}</span></span>
                    <span class="text-xs font-bold text-blue-800">Tồn: <span class="text-lg text-blue-600">${currentQty}</span> bịch</span>
                </div>

                <div class="bg-green-50 p-3 rounded-xl border border-green-200">
                    <label class="text-[10px] font-bold text-green-700 uppercase block mb-2">🍄 Xuất Phôi ĐẠT (Lên giàn):</label>
                    <div class="flex gap-2">
                        <input type="number" id="ns-x-dat" class="w-1/3 p-2 rounded-lg border border-green-300 text-sm font-bold text-center outline-none focus:border-green-500" placeholder="SL Đạt">
                        <select id="ns-x-house" class="flex-1 p-2 rounded-lg border border-green-300 text-xs font-bold outline-none focus:border-green-500">
                            <option value="">-- Chọn Nhà Trồng --</option>
                            ${houses.filter(h => h.id !== houseA.id).map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="flex gap-2">
                    <div class="bg-orange-50 p-3 rounded-xl border border-orange-200 flex-1 flex flex-col gap-2">
                        <label class="text-[10px] font-bold text-orange-700 uppercase">♻️ Tận Dụng:</label>
                        <input type="number" id="ns-x-td" class="w-full p-2 rounded-lg border border-orange-300 text-sm font-bold text-center outline-none" placeholder="SL TD">
                        <select id="ns-x-td-house" class="w-full p-2 rounded-lg border border-orange-300 text-[10px] font-bold outline-none">
                            <option value="">- Vào Nhà -</option>
                            ${houses.filter(h => h.id !== houseA.id).map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl border border-red-200 flex-1 flex flex-col gap-2">
                        <label class="text-[10px] font-bold text-red-700 uppercase">🗑️ Hư Hỏng:</label>
                        <input type="number" id="ns-x-huy" class="w-full p-2 rounded-lg border border-red-300 text-sm font-bold text-center outline-none" placeholder="SL Hủy">
                        <div class="text-[9px] text-red-400 italic text-center mt-auto">Hủy bỏ hoàn toàn</div>
                    </div>
                </div>
                <button id="btn-save-xuat" class="w-full py-3 bg-green-600 active:bg-green-700 text-white font-bold rounded-lg mt-2 shadow-md">XÁC NHẬN XUẤT & TỰ ĐỘNG TRỪ GIÀN</button>
            </div>
        `, []);

        setTimeout(() => {
            const btnTNhap = document.getElementById('btn-tab-nhap'); const btnTXuat = document.getElementById('btn-tab-xuat');
            const tabNhap = document.getElementById('tab-nhap'); const tabXuat = document.getElementById('tab-xuat');

            btnTNhap.onclick = () => { tabNhap.classList.remove('hidden'); tabXuat.classList.add('hidden'); btnTNhap.className = "flex-1 py-2 text-xs font-bold bg-white text-blue-600 rounded shadow-sm transition"; btnTXuat.className = "flex-1 py-2 text-xs font-bold text-slate-500 rounded transition"; };
            btnTXuat.onclick = () => { tabXuat.classList.remove('hidden'); tabNhap.classList.add('hidden'); btnTXuat.className = "flex-1 py-2 text-xs font-bold bg-white text-blue-600 rounded shadow-sm transition"; btnTNhap.className = "flex-1 py-2 text-xs font-bold text-slate-500 rounded transition"; };

            document.getElementById('btn-save-nhap').onclick = async () => {
                const b = document.getElementById('ns-batch').value.toUpperCase(); const q = Number(document.getElementById('ns-qty').value);
                const batch = writeBatch(db); batch.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, id), { qty: q, batch: b, time: Date.now() }, { merge: true });
                await batch.commit(); Utils.modal(null); Utils.toast("✅ Đã cập nhật Giàn!");
            };

            document.getElementById('btn-save-xuat').onclick = async () => {
                const qDat = Number(document.getElementById('ns-x-dat').value) || 0; const targetHouse = document.getElementById('ns-x-house').value;
                const qTD = Number(document.getElementById('ns-x-td').value) || 0; const targetHouseTD = document.getElementById('ns-x-td-house').value;
                const qHuy = Number(document.getElementById('ns-x-huy').value) || 0;

                const totalExport = qDat + qTD + qHuy;
                if(!currentBatch) return Utils.toast("Giàn chưa có mã lô để xuất!", "err");
                if(totalExport <= 0) return Utils.toast("Chưa nhập số lượng!", "err");
                if(totalExport > currentQty) return Utils.toast(`Vượt quá số lượng đang có trên giàn (${currentQty})!`, "err");
                if(qDat > 0 && !targetHouse) return Utils.toast("Vui lòng chọn Nhà Trồng cho phôi Đạt!", "err");
                if(qTD > 0 && !targetHouseTD) return Utils.toast("Vui lòng chọn Nhà Trồng cho phôi Tận Dụng!", "err");

                const batch = writeBatch(db);
                const houseAId = houseA?.id || 'KHO_TONG';

                // 1. Trừ giàn
                const newQty = currentQty - totalExport;
                batch.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, id), { qty: newQty, batch: newQty > 0 ? currentBatch : '', time: Date.now() }, { merge: true });

                // Lấy chuỗi ngày tháng định dạng dd/mm/yy
                const dObj = new Date();
                const dateStr = ('0' + dObj.getDate()).slice(-2) + '/' + ('0' + (dObj.getMonth()+1)).slice(-2) + '/' + dObj.getFullYear().toString().slice(-2);

                // 2. Xuất Đạt (Thêm hậu tố D-dd/mm/yy)
                if(qDat > 0) {
                    const codeDat = `${currentBatch}D-${dateStr}`;
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'EXPORT', from:houseAId, to:targetHouse, code:codeDat, qty:qDat, user:userName, time:Date.now() });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, targetHouse), { status:'ACTIVE', batchQty: increment(qDat), currentBatch:codeDat });
                }
                
                // 3. Tận dụng (Thêm hậu tố TD-dd/mm/yy)
                if(qTD > 0) {
                    const codeTD = `${currentBatch}TD-${dateStr}`;
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'EXPORT', from:houseAId, to:targetHouseTD, code:codeTD, qty:qTD, user:userName, time:Date.now() });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, targetHouseTD), { status:'ACTIVE', batchQty: increment(qTD), currentBatch:codeTD });
                }

                // 4. Hủy (Thêm hậu tố HUY-dd/mm/yy)
                if(qHuy > 0) {
                    const codeHuy = `${currentBatch}HUY-${dateStr}`;
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'DESTROY', from:houseAId, to:'HUY', code:codeHuy, qty:qHuy, user:userName, time:Date.now() });
                }

                await batch.commit(); Utils.modal(null); Utils.toast("🚀 Đã xuất và tạo mã lô tự động!");
            };
        }, 100);
    }
};

export const NuoiSoi = {
    render: (data, user) => {
        const c = document.getElementById('view-nuoisoi'); if(!c || c.classList.contains('hidden')) return;
        const role = (user.role || '').toLowerCase(); const isManager = ['admin', 'giám đốc', 'quản lý'].some(r => role.includes(r));
        if(!isManager) { c.innerHTML = '<div class="p-10 text-center text-red-500 font-bold">Bạn không có quyền xem khu vực này.</div>'; return; }

        window._tempHouses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        window._tempHouseA = window._tempHouses.find(h => ['nhà a','kho a', 'kho phôi', 'kho tổng', 'nuôi sợi'].some(n => (h.name||'').toLowerCase().includes(n)));

        const racks = Array.isArray(data.nuoisoi_A) ? data.nuoisoi_A : [];
        const getRack = (id) => racks.find(r => r.id === id) || {qty: '', batch: ''};

        let grid = `<div class="grid grid-cols-[1fr_50px_1fr] gap-y-1.5 gap-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 relative overflow-hidden"><div class="bg-blue-100 text-blue-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-blue-200" style="grid-column: 1; grid-row: 1;">Hệ quạt</div><div class="bg-blue-100 text-blue-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-blue-200" style="grid-column: 3; grid-row: 1;">Hệ quạt</div><div class="flex items-center justify-center bg-stone-300 border-x-2 border-stone-400 shadow-inner relative" style="grid-column: 2; grid-row: 1 / span 27;"><div class="absolute inset-0 w-0.5 border-l-2 border-dashed border-white mx-auto opacity-70"></div><span class="rotate-90 text-stone-600 font-black tracking-widest text-[10px] whitespace-nowrap z-10 bg-stone-300 px-3 py-1 rounded-full border border-stone-400/50 shadow-sm">LỐI ĐI XE NỘI BỘ</span></div>`;

        const totalRows = 25;
        for(let i = totalRows; i >= 1; i--) {
            const bId = `B${i}`; const aId = `A${i}`; const bData = getRack(bId); const aData = getRack(aId); const currentRow = totalRows - i + 2; 
            const renderCell = (id, rack, col, row) => {
                const hasData = rack.qty || rack.batch;
                return `<div style="grid-column: ${col}; grid-row: ${row};" onclick="window.NuoiSoi_Action.edit('${id}', '${rack.qty}', '${rack.batch}', '${user.name}')" class="bg-white border ${hasData ? 'border-blue-400 shadow-md bg-blue-50/30' : 'border-slate-200'} p-1.5 rounded cursor-pointer active:scale-95 transition flex flex-col justify-center min-h-[45px] hover:border-blue-400"><div class="flex justify-between items-center border-b border-slate-100 pb-0.5 mb-1"><span class="text-[10px] font-black text-slate-700">Giàn ${id}</span>${hasData ? `<span class="text-[8px] bg-green-100 text-green-700 px-1 rounded font-bold">${rack.batch}</span>` : '<span class="text-[8px] text-slate-300">Trống</span>'}</div><div class="text-[10px] text-slate-500 font-bold">SL: <span class="${hasData ? 'text-blue-600' : 'text-slate-300'}">${rack.qty || '--'}</span></div></div>`;
            };
            grid += renderCell(bId, bData, 1, currentRow); grid += renderCell(aId, aData, 3, currentRow); 
        }
        grid += `<div class="bg-cyan-100 text-cyan-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-cyan-200" style="grid-column: 1; grid-row: 27;">Hệ cooling</div><div class="bg-cyan-100 text-cyan-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-cyan-200" style="grid-column: 3; grid-row: 27;">Hệ cooling</div></div>`;
        c.innerHTML = `<div class="space-y-4 pb-24 animate-fade-in"><div class="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm"><div><h2 class="font-black text-blue-800 text-lg uppercase">SƠ ĐỒ NHÀ NUÔI SỢI A</h2><p class="text-[10px] text-blue-500 font-bold">Dãy B (Trái) - Dãy A (Phải). Đếm từ quạt vào.</p></div></div>${grid}</div>`;
    }
};
