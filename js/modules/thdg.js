// ĐƯỜNG DẪN: js/modules/thdg.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(c.classList.contains('hidden')) return;
        
        // --- FIX LỖI MÀN HÌNH TRẮNG: Thêm || [] vào sau data.houses ---
        const houses = data.houses || [];
        const products = data.products || [];
        const harvestLogs = data.harvest || [];

        const sorted = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // Logic gom nhóm báo cáo
        const reportByHouse = {};
        harvestLogs.forEach(log => {
            if (!reportByHouse[log.area]) reportByHouse[log.area] = 0;
            reportByHouse[log.area] += (Number(log.total) || 0);
        });

        // Lọc sản phẩm (Nếu chưa có sản phẩm nào thì để mảng rỗng)
        const g1 = products.filter(p => p.group == '1');
        
        c.innerHTML = `
        <div class="space-y-4 pb-24">
             <div class="glass p-4 bg-white">
                <h4 class="font-bold text-slate-500 text-xs uppercase mb-3">Tổng hợp thu hoạch</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${Object.keys(reportByHouse).length > 0 ? Object.keys(reportByHouse).map(area => `
                        <div class="flex justify-between p-2 border-b border-slate-50 last:border-0">
                            <span class="font-bold text-sm text-slate-700">${area}</span>
                            <span class="font-black text-green-600">${reportByHouse[area].toLocaleString()} kg</span>
                        </div>`).join('') : '<p class="text-center text-xs text-slate-300 italic">Chưa có dữ liệu thu hoạch</p>'}
                </div>
            </div>

            <div class="glass p-5 border-l-4 border-green-500 shadow-md">
                <div class="flex justify-between items-center mb-4">
                    <span class="font-black text-slate-700 uppercase flex items-center gap-2">
                        <i class="fas fa-warehouse text-green-600"></i> Nhập Kho
                    </span>
                    ${g1.length === 0 ? `<button onclick="alert('Vui lòng vào Cài đặt (Bánh xe) > Thêm mã hàng trước!')" class="text-[10px] text-red-500 font-bold underline">Chưa có mã hàng?</button>` : ''}
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 ml-1">Nguồn thu:</label>
                        <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-green-500 transition">
                            <option value="">-- Chọn Nhà / Khu --</option>
                            ${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}
                            <option value="ThuMuaNgoai">Thu Mua Ngoài</option>
                        </select>
                    </div>

                    ${g1.length ? `
                    <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                        <h4 class="text-[10px] font-bold text-green-700 uppercase mb-2">1. Nấm Tươi (Kg)</h4>
                        <div class="grid grid-cols-3 gap-3">
                            ${g1.map(p=>`
                                <div>
                                    <label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label>
                                    <input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 text-green-700 focus:border-green-500" placeholder="0">
                                </div>`).join('')}
                        </div>
                    </div>` : '<p class="text-xs text-center text-red-400 bg-red-50 p-2 rounded">Chưa có dữ liệu sản phẩm nhóm 1.</p>'}
                    
                    <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 active:scale-95 transition mt-2">
                        <i class="fas fa-save mr-1"></i> LƯU KHO
                    </button>
                </div>
            </div>
        </div>`;

        // Gắn sự kiện (Chỉ chạy khi HTML đã vẽ xong)
        setTimeout(() => {
            const btnSave = document.getElementById('btn-save-th');
            if(btnSave) btnSave.onclick = async () => {
                const area = document.getElementById('th-area').value;
                if(!area) return Utils.toast("Vui lòng chọn Nguồn thu!", "err");
                
                let d = {}, total = 0;
                // Duyệt qua danh sách sản phẩm để lấy số lượng
                products.forEach(p => { 
                    const el = document.getElementById(`th-${p.code}`); 
                    if(el && Number(el.value) > 0) { 
                        d[p.code] = Number(el.value); 
                        total += Number(el.value);
                        el.value = ''; // Reset sau khi lưu
                    } 
                });

                if(total === 0) return Utils.toast("Chưa nhập số lượng nào!", "err");
                
                await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { 
                    area, details: d, total, user: user.name, time: Date.now() 
                });
                Utils.toast(`✅ Đã nhập kho: ${total} kg`);
            };
        }, 100);
    }
};
