import { collection, db, ROOT_PATH } from '../config.js';

export const Home = {
    render: (data) => {
        const c = document.getElementById('view-home');
        if (!c || c.classList.contains('hidden')) return;
        
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const harvest = Array.isArray(data.harvest) ? data.harvest : [];
        
        const active = houses.filter(h => h.status === 'ACTIVE').length;
        // Tổng thu toàn trại (Vẫn tính tất cả để báo cáo tổng)
        const totalYieldAll = harvest.reduce((acc, h) => acc + (Number(h.total)||0), 0);
        
        const houseA = houses.find(h => {
            const n = (h.name || "").trim().toLowerCase();
            return n === 'nhà a' || n === 'nha a' || n === 'kho a' || n === 'kho phôi';
        });
        const spawnStock = houseA ? (Number(houseA.batchQty) || 0) : 0;

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            <div class="grid grid-cols-2 gap-3">
                <div class="glass p-4 bg-white shadow-sm border-b-4 border-green-500">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tổng nấm thu (All)</span>
                    <div class="text-2xl font-black text-slate-700 truncate">${totalYieldAll.toLocaleString()} <span class="text-xs text-slate-400 font-normal">kg</span></div>
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
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">TIẾN ĐỘ SẢN XUẤT</h3>
                <div class="grid grid-cols-2 gap-3">
                    ${houses.map(h => {
                        const isActive = h.status === 'ACTIVE';
                        const isKho = h.id === (houseA?.id);
                        let infoHTML = '';
                        
                        // --- LOGIC MỚI: TỰ ĐỘNG RESET ---
                        let houseYield = 0;
                        if (isActive && h.startDate) {
                            // Chỉ lấy phiếu thu có thời gian >= ngày bắt đầu lô
                            // Chuyển startDate (YYYY-MM-DD) thành timestamp đầu ngày
                            const startTimestamp = new Date(h.startDate).setHours(0,0,0,0);
                            houseYield = harvest
                                .filter(l => l.area === h.name && l.time >= startTimestamp)
                                .reduce((sum, l) => sum + (Number(l.total) || 0), 0);
                        }
                        // Nếu status != ACTIVE thì houseYield mặc định là 0 (Đã Reset)

                        if (isKho) {
                            infoHTML = `<div class="text-xs text-purple-600 font-bold mt-1 text-center bg-purple-50 rounded py-1">KHO TỔNG</div>`;
                        } else if (isActive) {
                            infoHTML = `
                                <div class="mt-2 border-t border-slate-100 pt-1 space-y-1">
                                    <div class="flex justify-between items-center text-[10px]">
                                        <span class="text-slate-400">Lô:</span>
                                        <span class="font-bold text-slate-600 truncate max-w-[60px]" title="${h.currentBatch}">${h.currentBatch}</span>
                                    </div>
                                    <div class="flex justify-between items-center text-[10px]">
                                        <span class="text-slate-400">Phôi:</span>
                                        <span class="font-bold text-blue-600">${(h.batchQty||0).toLocaleString()}</span>
                                    </div>
                                    <div class="flex justify-between items-center text-[10px] bg-green-50 px-1 py-0.5 rounded">
                                        <span class="text-green-600 font-bold">Vụ này:</span>
                                        <span class="font-black text-green-700">${houseYield.toLocaleString()} kg</span>
                                    </div>
                                </div>`;
                        } else {
                            infoHTML = `<div class="text-[10px] text-slate-400 italic mt-2 text-center">-- Trống --</div>`;
                        }

                        const borderColor = isKho ? 'border-purple-500' : (isActive ? 'border-green-500' : 'border-slate-300');

                        return `
                        <div class="glass p-3 border-l-4 ${borderColor} bg-white shadow-sm hover:shadow-md transition-all">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-bold text-slate-700 text-sm truncate pr-1" title="${h.name}">${h.name}</span>
                                ${!isKho ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${isActive?'RUN':'OFF'}</span>` : ''}
                            </div>
                            ${infoHTML}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }
};
