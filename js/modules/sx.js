import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        
        // ADMIN CHECK
        const isAdmin = user && ['Admin', 'Quản lý', 'Giám đốc'].some(r => (user.role||'').includes(r));

        // Tìm Nhà A & Tính tồn
        const houseA = houses.find(h => h.name === 'Nhà A');
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
        
        // Sắp xếp
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));
        const activeHouses = houses.filter(h => h.name !== 'Nhà A');

        c.innerHTML = `
            <div class="space-y-5 pb-24">
                
                <div class="glass p-4 border-l-8 border-green-500 bg-green-50/50">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-green-700 uppercase text-xs flex items-center gap-2">
                            <i class="fas fa-warehouse text-lg"></i> KHO PHÔI NHÀ A
                        </h3>
                        <div class="text-2xl font-black text-slate-700">${tonKhoA.toLocaleString()} <span class="text-[10px] text-slate-400">bịch</span></div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-2 mb-2">
                        <input id="in-code" placeholder="Tên Giống" class="p-2 rounded border border-green-200 text-xs font-bold">
                        <input id="in-date" type="date" class="p-2 rounded border border-green-200 text-xs">
                        <input id="in-qty" type="number" placeholder="Số lượng" class="p-2 rounded border border-green-200 text-xs font-bold text-center">
                    </div>
                    ${houseA ? `<button id="btn-in-a" class="w-full py-2 bg-green-600 text-white rounded font-bold text-xs shadow-md mb-3 active:scale-95 transition">NHẬP KHO A</button>` : '<div class="text-red-500 text-xs font-bold">⚠️ Chưa tạo Nhà A</div>'}

                    <div class="bg-white p-2 rounded border border-green-100 max-h-32 overflow-y-auto">
                        <table class="w-full text-xs">
                            <thead class="text-slate-400 font-bold border-b"><tr><th class="text-left">Ngày</th><th class="text-left">Giống</th><th class="text-right">SL</th>${isAdmin?'<th></th>':''}</tr></thead>
                            <tbody class="opacity-80">
                                ${sortedInv.map(i => `
                                    <tr class="border-b last:border-0 border-slate-50">
                                        <td class="py-1">${i.date}</td>
                                        <td class="font-bold">${i.code}</td>
                                        <td class="text-right font-black text-green-700">${i.qty}</td>
                                        ${isAdmin ? `<td class="text-right"><button class="text-red-400" onclick="SX.delInv('${i.id}', ${i.qty})"><i class="fas fa-times"></i></button></td>` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="glass p-4 border-l-8 border-orange-500 bg-orange-50/50">
                    <h3 class="font-black text-orange-700 uppercase text-xs mb-3 flex items-center gap-2">
                        <i class="fas fa-truck-loading text-lg"></i> XUẤT PHÔI -> CÁC NHÀ
                    </h3>
                    
                    <div class="space-y-2">
                        <div class="flex gap-2">
                            <select id="out-house" class="w-2/3 p-2 rounded border border-orange-200 text-xs font-bold">
                                <option value="">-- Chọn Nhà Nhận --</option>
                                ${activeHouses.map(h => `<option value="${h.id}" ${h.status==='ACTIVE'?'disabled':''}>${h.name} ${h.status==='ACTIVE'?'(Đang chạy)':'(Trống)'}</option>`).join('')}
                            </select>
                            <input id="out-qty" type="number" placeholder="Số lượng" class="w-1/3 p-2 rounded border border-orange-200 text-xs font-bold text-center">
                        </div>
                        <button id="btn-out-a" class="w-full py-2 bg-orange-600 text-white rounded font-bold text-xs shadow-md active:scale-95 transition">XUẤT KHO & LÊN LỆNH</button>
                    </div>
                    
                    <div class="mt-3 pt-2 border-t border-orange-200 text-[10px] text-slate-500 italic">
                        * Lệnh xuất sẽ tự động trừ kho A và cập nhật trạng thái "Đang Chạy" cho nhà nhận ở thẻ Home.
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
                        <h4 class="text-xs font-bold text-slate-400 uppercase">Quản lý Nhà</h4>
                        <button id="btn-add-h" class="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold">Thêm Nhà</button>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        ${houses.map(h => `
                            <div class="bg-white p-2 rounded border flex justify-between items-center">
                                <span class="text-[10px] font-bold ${h.name==='Nhà A'?'text-purple-600':''}">${h.name}</span>
                                <button class="text-red-300 hover:text-red-500" onclick="SX.delHouse('${h.id}', '${h.name}')"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

            </div>`;

        // GẮN SỰ KIỆN & HÀM TOÀN CỤC
        setTimeout(() => {
            // 1. NHẬP KHO A (XANH)
            const btnIn = document.getElementById('btn-in-a');
            if(btnIn) btnIn.onclick = async () => {
                const c = document.getElementById('in-code').value;
                const d = document.getElementById('in-date').value;
                const q = Number(document.getElementById('in-qty').value);
                if(!c || !d || !q) return Utils.toast("Thiếu thông tin!", "err");
                
                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { code: c, date: d, qty: q, inputDate: new Date().toISOString() });
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA + q });
                Utils.toast(`Đã nhập ${q} bịch`);
            };

            // 2. XUẤT KHO (CAM)
            const btnOut = document.getElementById('btn-out-a');
            if(btnOut) btnOut.onclick = async () => {
                const hid = document.getElementById('out-house').value;
                const q = Number(document.getElementById('out-qty').value);
                if(!hid || !q) return Utils.toast("Thiếu thông tin!", "err");
                if(q > tonKhoA) return Utils.toast("Kho A không đủ!", "err");

                // Trừ A
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - q });
                // Cộng Nhà Con & Set Active
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { 
                    status: 'ACTIVE', 
                    currentBatch: 'Từ Kho A', 
                    batchQty: q, 
                    startDate: new Date().toISOString().split('T')[0] 
                });
                Utils.toast("Đã xuất lệnh & Trừ kho!");
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

            // HÀM GLOBAL CHO NÚT XÓA (Gắn vào window để gọi từ HTML)
            window.SX = {
                delInv: async (id, qty) => {
                    if(confirm("Xóa dòng nhập này?")) {
                        await deleteDoc(doc(db, `${ROOT_PATH}/spawn_inventory`, id));
                        // Trừ ngược lại kho A nếu cần (tuỳ logic, ở đây xóa log thôi)
                        // Nếu muốn trừ kho A: updateDoc(doc(db...houses, houseA.id), {batchQty: tonKhoA - qty})
                        Utils.toast("Đã xóa log");
                    }
                },
                delMat: (id) => { if(confirm("Xóa vật tư?")) deleteDoc(doc(db, `${ROOT_PATH}/supplies`, id)); },
                delHouse: (id, name) => { if(confirm(`Xóa nhà ${name}?`)) deleteDoc(doc(db, `${ROOT_PATH}/houses`, id)); }
            };

        }, 100);
    }
};
