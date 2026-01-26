// ĐƯỜNG DẪN: js/modules/home.js
import { collection, db, ROOT_PATH } from '../config.js'; // Nhớ dùng ../ vì nằm trong modules

export const Home = {
    render: (data, isAdmin) => {
        const c = document.getElementById('view-home');
        if (!c || c.classList.contains('hidden')) return;

        // An toàn dữ liệu
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const harvest = Array.isArray(data.harvest) ? data.harvest : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];

        // Tính toán
        const activeHouses = houses.filter(h => h.status === 'ACTIVE');
        const totalYield = harvest.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
        
        // Map tổng thu hoạch theo nhà
        const yieldByHouse = {};
        harvest.forEach(log => {
            if(log && log.area) {
                if(!yieldByHouse[log.area]) yieldByHouse[log.area] = 0;
                yieldByHouse[log.area] += (Number(log.total) || 0);
            }
        });

        // Top NV
        const topEmployees = [...employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            <div class="glass p-6 !bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-lg relative">
                <h3 class="font-bold text-xs uppercase tracking-widest mb-4 opacity-80 text-center">Top Nhân Viên</h3>
                <div class="flex justify-center items-end gap-4">
                     ${topEmployees[0] ? `<div class="flex flex-col items-center"><div class="w-14 h-14 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-xl font-black mb-1 border-2 border-white shadow-lg">1</div><span class="text-xs font-black">${topEmployees[0].name}</span><span class="text-xs text-yellow-300 font-bold">${topEmployees[0].score}đ</span></div>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="glass p-4 bg-white shadow-sm">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Tổng thu</span>
                    <div class="text-2xl font-black text-slate-700">${totalYield.toLocaleString()} <span class="text-xs text-slate-400">kg</span></div>
                </div>
                <div class="glass p-4 bg-white shadow-sm">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Đang chạy</span>
                    <div class="text-2xl font-black text-green-600">${activeHouses.length} <span class="text-xs text-slate-400">nhà</span></div>
                </div>
            </div>

            <div>
                <h3 class="font-bold text-slate-500 text-xs uppercase px-1 mb-3">Danh sách nhà</h3>
                <div class="grid grid-cols-2 gap-3">
                    ${houses.length > 0 ? houses.map(h => {
                        const daThu = yieldByHouse[h.name] || 0;
                        const isActive = h.status === 'ACTIVE';
                        
                        return `
                        <div class="glass p-3 border-l-4 ${isActive ? 'border-green-500' : 'border-slate-300'} relative shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-black text-lg text-slate-700 truncate pr-1" title="${h.name}">${h.name}</span>
                                <span class="text-[9px] font-bold px-2 py-1 rounded ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}">
                                    ${isActive ? 'RUN' : 'OFF'}
                                </span>
                            </div>
                            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1 truncate">
                                ${h.currentBatch || 'Trống'}
                            </div>
                            ${isActive || daThu > 0 ? `
                                <div class="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span class="text-[9px] font-bold text-slate-400">Thu:</span>
                                    <span class="text-sm font-black text-green-600">${daThu.toLocaleString()}</span>
                                </div>
                            ` : ''}
                        </div>`;
                    }).join('') : `<div class="col-span-2 text-center text-slate-400 italic text-xs py-4">Chưa có nhà nào. Hãy vào Cài đặt để thêm.</div>`}
                </div>
            </div>
        </div>`;
    }
};
