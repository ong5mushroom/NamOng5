// ĐƯỜNG DẪN FILE: js/modules/home.js
// Dùng ../ vì phải lùi ra thư mục cha (js) để tìm config.js
import { collection, db, ROOT_PATH } from '../config.js'; 

export const Home = {
    render: (data, isAdmin) => {
        const c = document.getElementById('view-home');
        if(c.classList.contains('hidden')) return;

        const activeHouses = data.houses.filter(h => h.status === 'ACTIVE');
        const totalYield = (data.harvest || []).reduce((acc, h) => acc + (Number(h.total) || 0), 0);
        
        // Logic tính tổng theo nhà
        const yieldByHouse = {};
        (data.harvest || []).forEach(log => {
            if (!yieldByHouse[log.area]) yieldByHouse[log.area] = 0;
            yieldByHouse[log.area] += (Number(log.total) || 0);
        });

        const topEmployees = [...data.employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        c.innerHTML = `
        <div class="space-y-6">
            <div class="glass p-6 !bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-lg relative">
                <h3 class="font-bold text-xs uppercase tracking-widest mb-4 opacity-80 text-center">Top Nhân Viên</h3>
                <div class="flex justify-center items-end gap-4">
                    ${topEmployees[0] ? `<div class="flex flex-col items-center"><div class="w-14 h-14 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-xl font-black mb-1 border-2 border-white">1</div><span class="text-xs font-black">${topEmployees[0].name}</span><span class="text-xs text-yellow-300">${topEmployees[0].score}đ</span></div>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="glass p-4 bg-white"><span class="text-[10px] text-slate-400 font-bold uppercase">Tổng thu</span><div class="text-2xl font-black text-slate-700">${totalYield.toLocaleString()} <span class="text-xs">kg</span></div></div>
                <div class="glass p-4 bg-white"><span class="text-[10px] text-slate-400 font-bold uppercase">Đang chạy</span><div class="text-2xl font-black text-green-600">${activeHouses.length} <span class="text-xs">nhà</span></div></div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${data.houses.map(h => {
                    const daThu = yieldByHouse[h.name] || 0;
                    return `
                    <div class="glass p-3 border-l-4 ${h.status==='ACTIVE'?'border-green-500':'border-slate-300'}">
                        <div class="flex justify-between mb-2"><span class="font-black text-lg text-slate-700 truncate">${h.name}</span><span class="text-[9px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-200'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span></div>
                        <div class="text-[10px] text-slate-400 font-bold mb-1">${h.currentBatch || 'Trống'}</div>
                        ${h.status === 'ACTIVE' ? `<div class="mt-2 pt-2 border-t flex justify-between"><span class="text-[9px] text-slate-400 font-bold">Đã thu:</span><span class="text-sm font-black text-green-600">${daThu.toLocaleString()} kg</span></div>` : ''}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }
};
