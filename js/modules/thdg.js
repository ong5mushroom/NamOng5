import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(c.classList.contains('hidden')) return;
        
        const sortedHouses = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // --- LOGIC MỚI: TÍNH TOÁN TỔNG HỢP THEO NHÀ ---
        const reportByHouse = {};
        let grandTotal = 0;

        (data.harvest || []).forEach(log => {
            // Lọc dữ liệu trong 30 ngày gần nhất (hoặc để tất cả tùy bạn)
            if (!reportByHouse[log.area]) {
                reportByHouse[log.area] = 0;
            }
            reportByHouse[log.area] += (Number(log.total) || 0);
            grandTotal += (Number(log.total) || 0);
        });
        // ----------------------------------------------

        const g1 = data.products.filter(p => p.group == '1'); 
        const g2 = data.products.filter(p => p.group == '2'); 
        const g3 = data.products.filter(p => p.group == '3'); 

        c.innerHTML = `
        <div class="space-y-4">
            <div class="glass p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg">
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[10px] font-bold opacity-80 uppercase">Tổng sản lượng kho</p>
                        <h2 class="text-3xl font-black">${grandTotal.toLocaleString()} <span class="text-sm font-normal">kg</span></h2>
                    </div>
                    <i class="fas fa-chart-line text-4xl opacity-20"></i>
                </div>
            </div>

            <div class="glass p-4 bg-white">
                <h4 class="font-bold text-slate-500 text-xs uppercase mb-3">Chi tiết theo Nhà / Khu vực</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${Object.keys(reportByHouse).length > 0 ? Object.keys(reportByHouse).map(area => `
                        <div class="flex justify-between items-center p-2 border-b border-slate-50 last:border-0">
                            <span class="font-bold text-slate-700 text-sm">${area}</span>
                            <span class="font-black text-green-600">${reportByHouse[area].toLocaleString()} kg</span>
                        </div>
                    `).join('') : '<p class="text-center text-xs text-slate-300 italic">Chưa có dữ liệu thu hoạch</p>'}
                </div>
            </div>

            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 mt-4">
                <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm transition-all btn-tab-th" data-target="in">
                    <i class="fas fa-arrow-down"></i> NHẬP KHO
                </button>
                <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50 transition-all btn-tab-th" data-target="out">
                    <i class="fas fa-arrow-up"></i> XUẤT BÁN
                </button>
            </div>

            <div id="zone-th-in" class="glass p-5 border-l-4 border-green-500 animate-pop">
                 <div class="space-y-4">
                    <div>
                        <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <option value="">-- Chọn Nhà / Khu --</option>
                            ${sortedHouses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}
                            <option value="KhuCheBien">Khu Chế Biến</option>
                            <option value="ThuMuaNgoai">Thu Mua Ngoài</option>
                        </select>
                    </div>
                    ${g1.length ? `<div class="bg-green-50 p-3 rounded-xl border border-green-100"><h4 class="text-[10px] font-bold text-green-700 uppercase mb-2">1. Nấm Tươi</h4><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 text-green-700" placeholder="0"></div>`).join('')}</div></div>` : ''}
                    
                    <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg mt-2">LƯU KHO</button>
                 </div>
            </div>

            <div id="zone-th-out" class="hidden glass p-5 border-l-4 border-orange-500 animate-pop">
                <h4 class="font-black text-slate-700 uppercase mb-4"><i class="fas fa-shipping-fast text-orange-600"></i> Xuất Bán</h4>
                <div class="space-y-3">
                    <input id="ship-cust" placeholder="Khách hàng" class="font-bold">
                    <input id="ship-qty" type="number" placeholder="Số lượng" class="font-bold text-lg text-orange-600">
                    <button id="btn-submit-ship" class="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg">XUẤT NGAY</button>
                </div>
            </div>
        </div>`;

        // --- EVENTS ---
        setTimeout(() => {
            // Tab Switching
            document.querySelectorAll('.btn-tab-th').forEach(btn => {
                btn.onclick = () => {
                    const target = btn.dataset.target;
                    document.getElementById('zone-th-in').classList.toggle('hidden', target !== 'in');
                    document.getElementById('zone-th-out').classList.toggle('hidden', target !== 'out');
                }
            });

            // Save Import (Nhập kho)
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
                    } 
                });

                if(total === 0) return Utils.toast("Chưa nhập số lượng!", "err");
                
                // Gửi lên Server
                await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { 
                    area, details: d, total, user: user.name, time: Date.now() 
                });
                
                // Reset form
                data.products.forEach(p => { 
                    const el = document.getElementById(`th-${p.code}`);
                    if(el) el.value = ''; 
                });
                
                Utils.toast(`✅ Đã lưu: ${total} kg từ ${area}`);
            };

            // Save Export (Xuất kho) - Logic đơn giản hóa
            const btnShip = document.getElementById('btn-submit-ship');
            if(btnShip) btnShip.onclick = async () => {
                const cust = document.getElementById('ship-cust').value;
                const qty = document.getElementById('ship-qty').value;
                if(!cust || !qty) return Utils.toast("Thiếu thông tin!", "err");
                
                await addDoc(collection(db, `${ROOT_PATH}/shipping`), { 
                    customer: cust, qty: Number(qty), user: user.name, time: Date.now() 
                });
                Utils.toast("🚚 Đã xuất đơn hàng");
            };

        }, 0);
    }
};
