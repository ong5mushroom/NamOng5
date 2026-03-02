import { doc, collection, db, ROOT_PATH, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.NuoiSoi_Action = {
    edit: (id, currentQty, currentBatch) => {
        Utils.modal(`Cập nhật Giàn ${id}`, `
            <div class="space-y-3">
                <div>
                    <label class="text-xs font-bold text-slate-500">Mã Lô cấy:</label>
                    <input type="text" id="ns-batch" value="${currentBatch || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold uppercase" placeholder="VD: B23">
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500">Số lượng phôi:</label>
                    <input type="number" id="ns-qty" value="${currentQty || ''}" class="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold" placeholder="Nhập số lượng...">
                </div>
            </div>
        `, [{id: 'btn-save-ns', text: 'LƯU GIÀN'}]);

        setTimeout(() => {
            document.getElementById('btn-save-ns').onclick = async () => {
                const b = document.getElementById('ns-batch').value.toUpperCase();
                const q = document.getElementById('ns-qty').value;
                try {
                    // FIX: Dùng writeBatch (đã có sẵn trong config.js) thay cho setDoc
                    const batch = writeBatch(db);
                    batch.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, id), {
                        qty: Number(q),
                        batch: b,
                        time: Date.now()
                    }, { merge: true });
                    
                    await batch.commit();
                    
                    Utils.modal(null);
                    Utils.toast("✅ Đã cập nhật Giàn!");
                } catch(e) { alert(e.message); }
            };
        }, 100);
    }
};

export const NuoiSoi = {
    render: (data, user) => {
        const c = document.getElementById('view-nuoisoi'); 
        if(!c || c.classList.contains('hidden')) return;

        // Lấy dữ liệu các giàn
        const racks = Array.isArray(data.nuoisoi_A) ? data.nuoisoi_A : [];
        const getRack = (id) => racks.find(r => r.id === id) || {qty: '', batch: ''};

        // VẼ SƠ ĐỒ THEO BẢN VẼ BẠN CUNG CẤP (Chia 3 cột)
        let grid = `
            <div class="grid grid-cols-[1fr_30px_1fr] gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div class="bg-blue-100 text-blue-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-blue-200">Hệ quạt</div>
                <div class="row-span-17 flex items-center justify-center border-x border-slate-300 bg-slate-200/50">
                    <span class="rotate-90 text-slate-400 font-black tracking-widest text-[10px] whitespace-nowrap">LỐI ĐI</span>
                </div>
                <div class="bg-blue-100 text-blue-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-blue-200">Hệ quạt</div>
        `;

        // VẼ 15 HÀNG GIÀN (Bên Trái L1->L15, Bên Phải R1->R15)
        const totalRows = 15;
        for(let i=1; i<=totalRows; i++) {
            const lId = `L${i}`; const rId = `R${i}`;
            const lData = getRack(lId); const rData = getRack(rId);

            const renderCell = (id, rack) => {
                const hasData = rack.qty || rack.batch;
                return `
                <div onclick="window.NuoiSoi_Action.edit('${id}', '${rack.qty}', '${rack.batch}')" 
                     class="bg-white border ${hasData ? 'border-blue-300 shadow-sm' : 'border-slate-200'} p-1.5 rounded cursor-pointer active:scale-95 transition flex flex-col justify-center min-h-[45px] hover:border-blue-400">
                    <div class="flex justify-between items-center border-b border-slate-100 pb-0.5 mb-1">
                        <span class="text-[10px] font-black text-slate-700">Giàn ${id}</span>
                        ${hasData ? `<span class="text-[8px] bg-green-100 text-green-700 px-1 rounded font-bold">${rack.batch}</span>` : '<span class="text-[8px] text-slate-300">Trống</span>'}
                    </div>
                    <div class="text-[10px] text-slate-500 font-bold">SL: <span class="${hasData ? 'text-blue-600' : 'text-slate-300'}">${rack.qty || '--'}</span></div>
                </div>`;
            };

            grid += renderCell(lId, lData);
            grid += renderCell(rId, rData);
        }

        // HÀNG DƯỚI CÙNG
        grid += `
                <div class="bg-cyan-100 text-cyan-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-cyan-200">Hệ cooling</div>
                <div class="bg-cyan-100 text-cyan-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-cyan-200">Hệ cooling</div>
            </div>
        `;

        c.innerHTML = `
        <div class="space-y-4 pb-24 animate-fade-in">
            <div class="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                <div>
                    <h2 class="font-black text-blue-800 text-lg uppercase">SƠ ĐỒ NHÀ NUÔI SỢI A</h2>
                    <p class="text-[10px] text-blue-500 font-bold">Chạm vào từng giàn để cập nhật số lượng & lô cấy</p>
                </div>
            </div>
            ${grid}
        </div>`;
    }
};
