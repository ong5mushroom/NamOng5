// ĐƯỜNG DẪN: js/modules/thdg.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(!c || c.classList.contains('hidden')) return;

        try {
            // --- CHỐNG LỖI: Luôn đảm bảo là mảng ---
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const harvestLogs = Array.isArray(data.harvest) ? data.harvest : [];

            // Gom nhóm báo cáo
            const reportByHouse = {};
            harvestLogs.forEach(log => {
                const area = log.area || "Khác";
                if (!reportByHouse[area]) reportByHouse[area] = 0;
                reportByHouse[area] += (Number(log.total) || 0);
            });

            // Lọc sản phẩm
            const g1 = products.filter(p => String(p.group) === '1');

            c.innerHTML = `
            <div class="space-y-4 pb-24">
                <div class="glass p-4 bg-white">
                    <h4 class="font-bold text-slate-500 text-xs uppercase mb-3">Tổng hợp thu hoạch</h4>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${Object.keys(reportByHouse).length > 0 ? Object.keys(reportByHouse).map(area => `
                            <div class="flex justify-between p-2 border-b border-slate-50 last:border-0">
                                <span class="font-bold text-sm text-slate-700">${area}</span>
                                <span class="font-black text-green-600">${reportByHouse[area].toLocaleString()} kg</span>
                            </div>`).join('') : '<p class="text-center text-xs text-slate-300">Chưa có dữ liệu</p>'}
                    </div>
                </div>

                <div class="glass p-5 border-l-4 border-green-500 shadow-md">
                    <div class="flex justify-between items-center mb-4">
                        <span class="font-black text-slate-700 uppercase"><i class="fas fa-warehouse text-green-600"></i> Nhập Kho</span>
                        ${g1.length === 0 ? '<span class="text-[9px] text-red-500 font-bold">Chưa có mã hàng!</span>' : ''}
                    </div>

                    <div class="space-y-4">
                        <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <option value="">-- Chọn Nhà --</option>
                            ${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}
                            <option value="ThuMuaNgoai">Thu Mua Ngoài</option>
                        </select>

                        ${g1.length > 0 ? `
                        <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                            <h4 class="text-[10px] font-bold text-green-700 uppercase mb-2">Nấm Tươi (Kg)</h4>
                            <div class="grid grid-cols-3 gap-3">
                                ${g1.map(p=>`<div>
                                    <label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label>
                                    <input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border text-green-700 bg-white" placeholder="0">
                                </div>`).join('')}
                            </div>
                        </div>` : ''}

                        <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg mt-2">LƯU KHO</button>
                    </div>
                </div>
            </div>`;

            // Gắn sự kiện (Delay nhẹ để đảm bảo HTML đã vẽ xong)
            setTimeout(() => {
                const btnSave = document.getElementById('btn-save-th');
                if(btnSave) {
                    // Clone node để xóa event cũ (tránh bị click đúp)
                    const newBtn = btnSave.cloneNode(true);
                    btnSave.parentNode.replaceChild(newBtn, btnSave);

                    newBtn.onclick = async () => {
                        const area = document.getElementById('th-area').value;
                        if(!area) return Utils.toast("Vui lòng chọn Nguồn thu!", "err");
                        
                        let d = {}, total = 0;
                        products.forEach(p => { 
                            const el = document.getElementById(`th-${p.code}`); 
                            if(el && Number(el.value) > 0) { 
                                d[p.code] = Number(el.value); 
                                total += Number(el.value);
                                el.value = ''; 
                            } 
                        });

                        if(total === 0) return Utils.toast("Chưa nhập số lượng!", "err");
                        
                        await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { 
                            area, details: d, total, user: user.name, time: Date.now() 
                        });
                        Utils.toast(`✅ Đã nhập: ${total} kg`);
                    };
                }
            }, 100);

        } catch (e) {
            console.error(e);
            c.innerHTML = `<div class="p-5 text-red-500">Lỗi hiển thị: ${e.message}</div>`;
        }
    }
};
