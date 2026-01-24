export const Home = {
    render: (data) => {
        const c = document.getElementById('view-home');
        if(c.classList.contains('hidden')) return;
        const active = data.houses.filter(h=>h.status==='ACTIVE').length;
        c.innerHTML = `
        <div class="space-y-5">
            <div class="glass p-5 !bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg text-center">
                <h3 class="font-bold text-xs uppercase tracking-widest mb-2 opacity-80">Tổng Quan</h3>
                <span class="text-4xl font-black">${active}</span> <span class="text-sm opacity-80 block">Nhà đang chạy</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
                ${data.houses.map(h => `<div class="glass p-3 border-l-4 ${h.status==='ACTIVE'?'border-green-500':'border-slate-300'}"><div class="flex justify-between mb-2"><span class="font-black text-lg">${h.name}</span><span class="text-[9px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-200'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span></div><div class="text-[10px] uppercase font-bold">${h.currentBatch||'-'}</div></div>`).join('')}
            </div>
        </div>`;
    }
};
