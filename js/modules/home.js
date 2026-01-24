export const Home = {
    render: (data, isAdmin) => {
        const c = document.getElementById('view-home');
        if(c.classList.contains('hidden')) return;

        // Tính toán số liệu
        const activeHouses = data.houses.filter(h => h.status === 'ACTIVE');
        const totalYield = data.harvest.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
        const topEmployees = [...data.employees].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3);

        c.innerHTML = `
        <div class="space-y-6">
            <div class="glass p-6 !bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-lg shadow-blue-500/30 relative">
                <button class="absolute top-2 right-2 text-white/50 hover:text-white btn-action" data-action="showScoreGuide"><i class="fas fa-question-circle"></i></button>
                <h3 class="font-bold text-xs uppercase tracking-widest mb-4 opacity-80 text-center">Bảng Phong Thần Tháng Này</h3>
                <div class="flex justify-center items-end gap-4">
                    ${topEmployees[1] ? `<div class="flex flex-col items-center opacity-90"><div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold mb-1 border border-white/30">2</div><span class="text-[10px] font-bold">${topEmployees[1].name}</span><span class="text-[10px]">${topEmployees[1].score}đ</span></div>` : ''}
                    ${topEmployees[0] ? `<div class="flex flex-col items-center -mt-4"><div class="w-14 h-14 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-xl font-black mb-1 shadow-lg border-2 border-white">1</div><span class="text-xs font-black">${topEmployees[0].name}</span><span class="text-xs font-bold text-yellow-300">${topEmployees[0].score}đ</span></div>` : ''}
                    ${topEmployees[2] ? `<div class="flex flex-col items-center opacity-90"><div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold mb-1 border border-white/30">3</div><span class="text-[10px] font-bold">${topEmployees[2].name}</span><span class="text-[10px]">${topEmployees[2].score}đ</span></div>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="glass p-4 bg-white">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Sản lượng tổng</span>
                    <div class="text-2xl font-black text-slate-700">${totalYield.toLocaleString()} <span class="text-xs text-slate-400">kg</span></div>
                </div>
                <div class="glass p-4 bg-white">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Nhà đang chạy</span>
                    <div class="text-2xl font-black text-green-600">${activeHouses.length} <span class="text-xs text-slate-400">nhà</span></div>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3 px-1">
                    <h3 class="font-bold text-slate-500 text-xs uppercase">Trạng thái nhà nấm</h3>
                    ${isAdmin ? `<button class="text-[10px] bg-white px-3 py-1.5 rounded-lg shadow text-blue-600 font-bold btn-action" data-action="openAddHouse"><i class="fas fa-plus mr-1"></i> Nhà mới</button>` : ''}
                </div>
                <div class="grid grid-cols-2 gap-3">
                    ${data.houses.map(h => `
                    <div class="glass p-3 border-l-4 ${h.status==='ACTIVE'?'border-green-500':'border-slate-300'} relative">
                        <div class="flex justify-between items-start mb-2">
                            <span class="font-black text-lg text-slate-700">${h.name}</span>
                            <span class="text-[9px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-500'}">${h.status==='ACTIVE'?'SX':'CHỜ'}</span>
                        </div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">${h.currentBatch || 'Trống'}</div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    }
};
