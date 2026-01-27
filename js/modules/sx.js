import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // 1. DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        // Lấy danh sách phôi nhập, sắp xếp mới nhất lên đầu
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory.sort((a,b) => new Date(b.inputDate||0) - new Date(a.inputDate||0)) : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        
        // ADMIN CHECK
        const isAdmin = user && ['Admin', 'Quản lý', 'Giám đốc'].some(r => (user.role||'').includes(r));

        // Tìm Nhà A (Kho Tổng)
        const houseA = houses.find(h => h.name === 'Nhà A');
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
        
        // Lọc các nhà SX (Trừ nhà A)
        const activeHouses = houses.filter(h => h.name !== 'Nhà A');

        // HÀM TẠO MÃ TỰ ĐỘNG (Helper)
        const generateBatchCode = (strain, dateStr) => {
            if (!strain || !dateStr) return "";
            // dateStr dạng YYYY-MM-DD
            const [y, m, d] = dateStr.split('-'); 
            // Lấy 2 số cuối năm
            const yy = y.slice(-2);
            // Kết quả: GIONG-DDMMYY (VD: 049-170925)
            return `${strain.trim().toUpperCase()}-${d}${m}${yy}`;
        };

        c.innerHTML = `
            <div class="space-y-5 pb-24">
                
                <div class="glass p-4 border-l-8 border-green-500 bg-green-50/50">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-green-700 uppercase text-xs flex items-center gap-2">
                            <i class="fas fa-warehouse text-lg"></i> KHO PHÔI NHÀ A
                        </h3>
                        <div class="text-right">
                            <div class="text-2xl font-black text-slate-700">${tonKhoA.toLocaleString()}</div>
                            <div class="text-[9px] text-slate-400 font-bold uppercase">Tổng Bịch</div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-3 rounded-xl border border-green-200 mb-3 shadow-sm">
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label class="text-[9px] font-bold text-slate-400 uppercase">Tên Giống (VD: 049)</label>
                                <input id="in-strain" placeholder="049" class="w-full p-2 rounded border border-green-200 text-sm font-bold uppercase" oninput="SX.previewCode()">
                            </div>
                            <div>
                                <label class="text-[9px] font-bold text-slate-400 uppercase">Ngày Cấy</label>
                                <input id="in-date" type="date" class="w-full p-2 rounded border border-green-200 text-sm" onchange="SX.previewCode()">
                            </div>
                        </div>
                        <div class="flex gap-2 items-end mb-2">
                            <div class="flex-1">
                                <label class="text-[9px] font-bold text-slate-400 uppercase">Mã Lô (Tự động)</label>
                                <div id="preview-code" class="w-full p-2 rounded bg-slate-100 text-green-700 font-black text-sm border border-slate-200 tracking-wider">...</div>
                            </div>
                            <div class="w-1/3">
                                <label class="text-[9px] font-bold text-slate-400 uppercase">Số Lượng</label>
                                <input id="in-qty" type="number" placeholder="0" class="w-full p-2 rounded border border-green-200 text-sm font-bold text-center text-green-700">
                            </div>
                        </div>
                        ${houseA ? `<button id="btn-in-a" class="w-full py-2 bg-green-600 text-white rounded font-bold text-xs shadow-md active:scale-95 transition">NHẬP KHO</button>` : '<div class="text-red-500 text-xs font-bold text-center">⚠ Cần tạo "Nhà A" trước</div>'}
                    </div>

                    <div class="space-y-1 max-h-40 overflow-y-auto pr-1">
                        ${inventory.map(i => `
                            <div class="flex justify-between items-center text-xs bg-white p-2 rounded border border-green-100">
                                <div>
                                    <span class="font-black text-green-800 block">${i.batchCode || i.code}</span>
                                    <span class="text-[9px] text-slate-400">Nhập: ${new Date(i.inputDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-slate-600">+${i.qty}</span>
                                    ${isAdmin ? `<button class="text-red-300 hover:text-red-500" onclick="SX.delInv('${i.id}', ${i.qty})"><i class="fas fa-times"></i></button>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="glass p-4 border-l-8 border-orange-500 bg-orange-50/50">
                    <h3 class="font-black text-orange-700 uppercase text-xs mb-3 flex items-center gap-2">
                        <i class="fas fa-truck-loading text-lg"></i> XUẤT PHÔI -> CÁC NHÀ
                    </h3>
                    
                    <div class="bg-white p-3 rounded-xl border border-orange-200 shadow-sm">
                        <div class="mb-2">
                            <label class="text-[9px] font-bold text-slate-400 uppercase">Chọn Lô Phôi Xuất</label>
                            <select id="out-batch-select" class="w-full p-2 rounded border border-orange-200 text-sm font-bold text-slate-700 outline-none">
                                <option value="">-- Chọn Mã Lô --</option>
                                ${inventory.map(i => `<option value="${i.batchCode || i.code}">${i.batchCode || i.code} (SL Nhập: ${i.qty})</option>`).join('')}
                            </select>
                        </div>

                        <div class="flex gap-2 mb-3">
                            <div class="flex-1">
                                <label class="text-[9px] font-bold text-slate-400 uppercase">Đến Nhà</label>
                                <select id="out-house" class="w-full p-2 rounded border border-orange-200 text-sm font-bold">
                                    <option value="">-- Chọn Nhà --</option>
                                    ${activeHouses.map(h => `<option value="${h.id}" ${h.status==='ACTIVE'?'disabled':''}>${h.name} ${h.status==='ACTIVE'?'(Đang chạy)':'(Trống)'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="w-1/3">
                                <label class="text-[9px] font-bold text-slate-400 uppercase">Số Lượng</label>
                                <input id="out-qty" type="number" placeholder="0" class="w-full p-2 rounded border border-orange-200 text-sm font-bold text-center text-orange-700">
                            </div>
                        </div>
                        <button id="btn-out-a" class="w-full py-2 bg-orange-600 text-white rounded font-bold text-xs shadow-md active:scale-95 transition">XUẤT & LÊN LỆNH SX</button>
                    </div>
                    
                    <div class="mt-2 text-[10px] text-slate-500 italic px-1">
                        * Lệnh này sẽ trừ tổng kho A và gán mã lô đã chọn cho nhà sản xuất để theo dõi.
                    </div>
                </div>

                <div class="glass p-4 border-l-8 border-yellow-400 bg-yellow-50/50">
                    <h3 class="font-black text-yellow-700 uppercase text-xs mb-3 flex items-center gap-2">
                        <i class="fas fa-tools text-lg"></i> KHO VẬT TƯ
                    </h3>
                    
                    <div class="flex gap-2 mb-3">
                        <input id="mat-name" placeholder="Tên (Cồn, Bông...)" class="w-full p-2 rounded border border-yellow-200 text-xs">
                        <input id="mat-qty" type="number" placeholder="SL" class="w-20 p-2 rounded border border-yellow-200 text-xs text-center">
                        <button id="btn-add-mat" class="bg-yellow-500 text-white px-3 rounded font-bold text-xs shadow-sm">+</button>
                    </div>

                    <div class="bg-white p-2 rounded border border-yellow-100 max-h-32 overflow-y-auto">
                         <table class="w-full text-xs">
                            <thead class="text-slate-400 font-bold border-b"><tr><th class="text-left">Tên VT</th><th class="text-right">Tồn</th>${isAdmin?'<th></th>':''}</tr></thead>
                            <tbody class="opacity-80">
                                ${supplies.map(s => `
                                    <tr class="border-b last:border-0 border-slate-50">
                                        <td class="py-1 font-bold text-slate-700">${s.name}</td>
                                        <td class="text-right font-black text-yellow-600">${s.qty}</td>
                                        ${isAdmin ? `<td class="text-right"><button class="text-red-400" onclick="SX.delMat('${s.id}')"><i class="fas fa-times"></i></button></td>` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                ${isAdmin ? `
                <div class="border-t pt-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="text-xs font-bold text-slate-400 uppercase">Admin: Quản lý Nhà</h4>
                        <button id="btn-add-h" class="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold hover:bg-slate-300">Thêm Nhà</button>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        ${houses.map(h => `
                            <div class="bg-white p-2 rounded border flex justify-between items-center shadow-sm">
                                <span class="text-[10px] font-bold ${h.name==='Nhà A'?'text-purple-600':''}">${h.name}</span>
                                <button class="text-red-300 hover:text-red-600" onclick="SX.delHouse('${h.id}', '${h.name}')"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

            </div>`;

        // GẮN HÀM TOÀN CỤC (Preview Mã)
        window.SX = {
            ...window.SX, // Giữ các hàm cũ nếu có
            previewCode: () => {
                const s = document.getElementById('in-strain').value;
                const d = document.getElementById('in-date').value;
                const p = document.getElementById('preview-code');
                if (p) p.innerText = (s && d) ? generateBatchCode(s, d) : "...";
            },
            delInv: async (id, qty) => {
                if(confirm("Xóa dòng nhập này? (Sẽ không hoàn lại số lượng tổng)")) {
                    // Logic: Xóa log, Admin tự cân đối lại số tổng nếu cần thiết
                    await deleteDoc(doc(db, `${ROOT_PATH}/spawn_inventory`, id));
                    Utils.toast("Đã xóa log nhập");
                }
            },
            delMat: (id) => { if(confirm("Xóa vật tư?")) deleteDoc(doc(db, `${ROOT_PATH}/supplies`, id)); },
            delHouse: (id, name) => { if(confirm(`Xóa nhà ${name}? Dữ liệu đang chạy sẽ mất!`)) deleteDoc(doc(db, `${ROOT_PATH}/houses`, id)); }
        };

        // GẮN SỰ KIỆN
        setTimeout(() => {
            // 1. NHẬP KHO A (XANH) - LƯU MÃ TỰ ĐỘNG
            const btnIn = document.getElementById('btn-in-a');
            if(btnIn) btnIn.onclick = async () => {
                const strain = document.getElementById('in-strain').value;
                const date = document.getElementById('in-date').value;
                const qty = Number(document.getElementById('in-qty').value);
                
                if(!strain || !date || !qty) return Utils.toast("Thiếu thông tin!", "err");
                
                const batchCode = generateBatchCode(strain, date);

                // Lưu vào log inventory (chi tiết)
                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { 
                    batchCode: batchCode, // Mã mới: 049-170925
                    strain: strain,
                    date: date, // Ngày cấy
                    inputDate: new Date().toISOString(), // Ngày nhập kho
                    qty: qty 
                });

                // Cộng tổng kho A
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { 
                    batchQty: tonKhoA + qty 
                });
                
                Utils.toast(`Đã nhập: ${batchCode} (${qty} bịch)`);
            };

            // 2. XUẤT KHO (CAM) - CHUYỂN MÃ SANG NHÀ CON
            const btnOut = document.getElementById('btn-out-a');
            if(btnOut) btnOut.onclick = async () => {
                const batchCode = document.getElementById('out-batch-select').value;
                const hid = document.getElementById('out-house').value;
                const qty = Number(document.getElementById('out-qty').value);
                
                if(!batchCode) return Utils.toast("Chưa chọn Mã Lô!", "err");
                if(!hid || !qty) return Utils.toast("Thiếu Nhà hoặc Số lượng!", "err");
                if(qty > tonKhoA) return Utils.toast("Kho A không đủ tổng số lượng!", "err");

                // Trừ Kho A (Tổng)
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - qty });
                
                // Cập nhật Nhà Con: Trạng thái Active + Mã Lô Phôi + Ngày vào (hôm nay)
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { 
                    status: 'ACTIVE', 
                    currentBatch: batchCode, // GẮN MÃ: 049-170925 vào nhà
                    batchQty: qty, 
                    startDate: new Date().toISOString().split('T')[0] 
                });
                
                Utils.toast(`Đã xuất lô ${batchCode} sang nhà SX!`);
            };

            // 3. VẬT TƯ (VÀNG)
            const btnMat = document.getElementById('btn-add-mat');
            if(btnMat) btnMat.onclick = async () => {
                const n = document.getElementById('mat-name').value;
                const q = Number(document.getElementById('mat-qty').value);
                if(n && q) {
                    await addDoc(collection(db, `${ROOT_PATH}/supplies`), { name: n, qty: q });
                    Utils.toast("Đã thêm vật tư");
                }
            };

            // 4. ADMIN THÊM NHÀ
            const btnAddH = document.getElementById('btn-add-h');
            if(btnAddH) btnAddH.onclick = () => {
                const n = prompt("Tên nhà mới:");
                if(n) addDoc(collection(db, `${ROOT_PATH}/houses`), { name: n, status: 'EMPTY', batchQty: 0, currentBatch: '' });
            };

        }, 100);
    }
};
