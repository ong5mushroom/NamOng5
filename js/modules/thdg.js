// ĐƯỜNG DẪN FILE: js/modules/thdg.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(c.classList.contains('hidden')) return;
        
        const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // Logic gom nhóm báo cáo
        const reportByHouse = {};
        (data.harvest || []).forEach(log => {
            if (!reportByHouse[log.area]) reportByHouse[log.area] = 0;
            reportByHouse[log.area] += (Number(log.total) || 0);
        });

        const g1 = data.products.filter(p => p.group == '1');
        
        c.innerHTML = `
        <div class="space-y-4">
             <div class="glass p-4 bg-white">
                <h4 class="font-bold text-slate-500 text-xs uppercase mb-3">Báo cáo chi tiết</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${Object.keys(reportByHouse).map(area => `
                        <div class="flex justify-between p-2 border-b last:border-0">
                            <span class="font-bold text-sm text-slate-700">${area}</span>
                            <span class="font-black text-green-600">${reportByHouse[area].toLocaleString()} kg</span>
                        </div>`).join('') || '<p class="text-center text-xs text-slate-300">Chưa có dữ liệu</p>'}
                </div>
            </div>

            <div class="glass p-5 border-l-4 border-green-500">
                <div class="flex justify-between items-center mb-4"><span class="font-black text-slate-700 uppercase"><i class="fas fa-warehouse text-green-600"></i> Nhập Kho</span></div>
                <div class="space-y-4">
                    <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded-xl border">
                        <option value="">-- Chọn Nhà --</option>
                        ${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}
                    </select>
                    ${g1.length ? `<div class="bg-green-50 p-3 rounded-xl"><h4 class="text-[10px] font-bold text-green-700 uppercase mb-2">Nấm Tươi</h4><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border text-green-700" placeholder="0"></div>`).join('')}</div></div>` : ''}
                    <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg mt-2">LƯU KHO</button>
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const btnSave = document.getElementById('btn-save-th');
            if(btnSave) btnSave.onclick = async () => {
                const area = document.getElementById('th-area').value;
                if(!area) return Utils.toast("Chưa chọn nguồn thu!", "err");
                
                let d = {}, total = 0;
                data.products.forEach(p => { 
                    const el = document.getElementById(`th-${p.code}`); 
                    if(el && Number(el.value) > 0) { 
                        d[p.code] = Number(el.value); 
                        total += Number(el.value);
                        el.value = '';
                    } 
                });

                if(total === 0) return Utils.toast("Chưa nhập số lượng!", "err");
                await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details: d, total, user: user.name, time: Date.now() });
                Utils.toast(`✅ Đã nhập: ${total} kg`);
            };
        }, 0);
    }
};
