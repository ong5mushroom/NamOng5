import { collection, db, ROOT_PATH } from '../config.js';

export const Home = {
    render: (data) => {
        const c = document.getElementById('view-home');
        if (!c || c.classList.contains('hidden')) return;
        
        // Data Safe
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const harvest = Array.isArray(data.harvest) ? data.harvest : [];
        
        // 1. Tính số nhà đang chạy
        const active = houses.filter(h => h.status === 'ACTIVE').length;
        
        // 2. Tính tổng thu hoạch (kg)
        const totalYield = harvest.reduce((acc, h) => acc + (Number(h.total)||0), 0);
        
        // 3. Tính Tổng Phôi Tồn Kho (Lấy từ Nhà A)
        // Tìm nhà có tên là "Nhà A", "Kho A", "Kho Phôi"...
        const houseA = houses.find(h => {
            const n = (h.name || "").trim().toLowerCase();
            return n === 'nhà a' || n === 'nha a' || n === 'kho a' || n === 'kho phôi';
        });
        // Lấy số lượng batchQty (được cập nhật từ lệnh sản xuất bên thẻ SX)
        const spawnStock = houseA ? (Number(houseA.batchQty) || 0) : 0;

        c.innerHTML = `
        <div class="space-y-6 pb-24">
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
                    <div>
                        <span class="text-[10px] text-purple-500 font-bold uppercase block mb-1">TỔNG PHÔI TỒN KHO (NHÀ A)</span>
                        <div class="text-3xl font-black text-purple-700">${spawnStock.toLocaleString()} <span class="text-xs text-purple-400 font-normal">bịch</span></div>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                        <i class="fas fa-warehouse text-xl"></i>
                    </div>
                </div>
            </div>

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">TRẠNG THÁI CHI TIẾT</h3>
                <div class="grid grid-cols-2 gap-3">
                    ${houses.map(h => {
                        const isActive = h.status === 'ACTIVE';
                        const isKho = h.id === (houseA?.id);
                        
                        // Hiển thị thông tin: Nếu là Kho A thì hiện tồn kho, nếu là Nhà thì hiện Mã Lô
                        const info = isKho 
                            ? `Tồn: <b>${(h.batchQty||0).toLocaleString()}</b>` 
                            : (isActive ? h.currentBatch : 'Đang trống');
                            
                        const color = isKho ? 'border-purple-500' : (isActive ? 'border-green-500' : 'border-slate-300');

                        return `
                        <div class="glass p-3 border-l-4 ${color} bg-white shadow-sm">
                            <div class="flex justify-between items-start mb-1">
                                <span class="font-bold text-slate-700 text-sm truncate pr-1" title="${h.name}">${h.name}</span>
                                ${!isKho ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${isActive?'RUN':'OFF'}</span>` : ''}
                            </div>
                            <div class="text-[10px] text-slate-500 truncate">${info}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }
};
