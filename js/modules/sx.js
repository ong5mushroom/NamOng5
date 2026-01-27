import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // 1. DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        
        // ADMIN CHECK
        const isAdmin = user && ['Admin', 'Quản lý', 'Giám đốc'].some(r => (user.role||'').includes(r));

        // --- FIX LOGIC TÌM NHÀ A (THÔNG MINH HƠN) ---
        // Tìm bất kỳ nhà nào có tên chứa "Nhà A", "Nha A", hoặc "Kho A" (bất kể hoa thường/dấu cách)
        const houseA = houses.find(h => {
            const n = (h.name || "").trim().toLowerCase();
            return n === 'nhà a' || n === 'nha a' || n === 'kho a' || n === 'kho phôi';
        });

        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
        
        // Lọc các nhà SX (Là những nhà KHÔNG PHẢI Nhà A)
        const activeHouses = houses.filter(h => h.id !== (houseA ? houseA.id : ''));

        // Sắp xếp log nhập: Mới nhất lên đầu
        const sortedInv = [...inventory].sort((a,b) => {
            const tA = new Date(a.inputDate || 0).getTime();
            const tB = new Date(b.inputDate || 0).getTime();
            return tB - tA;
        });

        // HELPER: Tạo mã lô tự động
        const generateBatchCode = (strain, dateStr) => {
            if (!strain || !dateStr) return "---";
            const [y, m, d] = dateStr.split('-'); 
            const yy = y.slice(-2);
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
                            <div class="text-[9px] text-slate-400 font-bold uppercase">TỔNG BỊCH</div>
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
                        
                        ${houseA ? 
                            `<button id="btn-in-a" class="w-full py-2 bg-green-600 text-white rounded font-bold text-xs shadow-md active:scale-95 transition">NHẬP KHO (Đã nhận diện ${houseA.name})</button>` 
                            : 
                            `<div class="bg-red-50 text-red-500 text-xs font-bold p-2 rounded text-center border border-red-200">
                                ⚠️ Hệ thống chưa tìm thấy Nhà A.<br>
                                <button id="btn-quick-create-a" class="mt-1 bg-red-500 text-white px-3 py-1 rounded shadow-sm">Tạo nhanh "Nhà A"</button>
                            </div>`
                        }
                    </div>

                    <div class="space-y-1 max-h-40 overflow-y-auto pr-1">
                        ${sortedInv.map(i => {
                            // Fix lỗi Invalid Date
                            let dateStr = "---";
                            try { if(i.inputDate) dateStr = new Date(i.inputDate).toLocaleDateString('vi-VN'); } catch(e){}
                            
                            return `
                            <div class="flex justify-between items-center text-xs bg-white p-2 rounded border border-green-100">
                                <div>
                                    <span class="font-black text-green-800 block">${i.batchCode || i.code || 'Mất mã'}</span>
                                    <span class="text-[9px] text-slate-400">Ngày nhập: ${dateStr}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-slate-600">+${i.qty}</span>
                                    ${isAdmin ? `<button class="text-red-300 hover:text-red-500" onclick="SX.delInv('${i.id}', ${i.qty})"><i class="fas fa-times"></i></button>` : ''}
                                </div>
                            </div>`;
                        }).join('')}
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
                                <option value="">-- Chọn Mã Lô (Mới nhất) --</option>
                                ${sortedInv.map(i => `<option value="${i.batchCode || i.code}">${i.batchCode || i.code} (SL Nhập: ${i.qty})</option>`).join('')}
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
                                ${supplies.map(s => `<tr class="border-b last:border-0 border-slate-50"><td class="py-1 font-bold text-slate-700">${s.name}</td><td class="text-right font-black text-yellow-600">${s.qty}</td>${isAdmin ? `<td class="text-right"><button class="text-red-400" onclick="SX.delMat('${s.id}')"><i class="fas fa-times"></i></button></td>` : ''}</tr>`).join('')}
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
                                <span class="text-[10px] font-bold ${h.id === (houseA?.id) ?'text-purple-600':''}">${h.name}</span>
                                <button class="text-red-300 hover:text-red-600" onclick="SX.delHouse('${h.id}', '${h.name}')"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

            </div>`;

        // GẮN HÀM TOÀN CỤC
        window.SX = {
            ...window.SX,
            previewCode: () => {
                const s = document.getElementById('in-strain').value;
                const d = document.getElementById('in-date').value;
                const p = document.getElementById('preview-code');
                if (p) p.innerText = (s && d) ? generateBatchCode(s, d) : "...";
            },
            delInv: async (id, qty) => {
                if(confirm("Xóa dòng nhập này?")) {
                    await deleteDoc(doc(db, `${ROOT_PATH}/spawn_inventory`, id));
                    Utils.toast("Đã xóa log nhập");
                }
            },
            delMat: (id) => { if(confirm("Xóa vật tư?")) deleteDoc(doc(db, `${ROOT_PATH}/supplies`, id)); },
            delHouse: (id, name) => { if(confirm(`Xóa nhà ${name}?`)) deleteDoc(doc(db, `${ROOT_PATH}/houses`, id)); }
        };

        // GẮN SỰ KIỆN
        setTimeout(() => {
            // Nút Tạo Nhanh Nhà A (Nếu chưa có)
            const btnQuickA = document.getElementById('btn-quick-create-a');
            if(btnQuickA) {
                btnQuickA.onclick = async () => {
                    await addDoc(collection(db, `${ROOT_PATH}/houses`), { name: "Nhà A", status: 'EMPTY', batchQty: 0, currentBatch: '', created: Date.now() });
                    Utils.toast("Đã tạo Nhà A! Hãy thử nhập lại.");
                };
            }

            // Nhập Kho A
            const btnIn = document.getElementById('btn-in-a');
            if(btnIn) btnIn.onclick = async () => {
                const strain = document.getElementById('in-strain').value;
                const date = document.getElementById('in-date').value;
                const qty = Number(document.getElementById('in-qty').value);
                
                if(!strain || !date || !qty) return Utils.toast("Thiếu thông tin!", "err");
                
                const batchCode = generateBatchCode(strain, date);

                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { 
                    batchCode: batchCode, strain: strain, date: date,
                    inputDate: new Date().toISOString(), qty: qty 
                });

                if(houseA) {
                    await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { 
                        batchQty: tonKhoA + qty 
                    });
                }
                
                Utils.toast(`Đã nhập: ${batchCode} (${qty} bịch)`);
                document.getElementById('in-qty').value = '';
            };

            // Xuất Kho
            const btnOut = document.getElementById('btn-out-a');
            if(btnOut) btnOut.onclick = async () => {
                const batchCode = document.getElementById('out-batch-select').value;
                const hid = document.getElementById('out-house').value;
                const qty = Number(document.getElementById('out-qty').value);
                
                if(!batchCode) return Utils.toast("Chưa chọn Mã Lô!", "err");
                if(!hid || !qty) return Utils.toast("Thiếu thông tin!", "err");
                if(qty > tonKhoA) return Utils.toast("Kho A không đủ!", "err");

                // Trừ Kho A
                if(houseA) await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - qty });
                
                // Cộng Nhà Con
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { 
                    status: 'ACTIVE', currentBatch: batchCode, batchQty: qty, 
                    startDate: new Date().toISOString().split('T')[0] 
                });
                
                Utils.toast("Đã xuất kho thành công!");
            };

            // Vật Tư & Admin
            const btnMat = document.getElementById('btn-add-mat');
            if(btnMat) btnMat.onclick = async () => {
                const n = document.getElementById('mat-name').value; const q = Number(document.getElementById('mat-qty').value);
                if(n && q) { await addDoc(collection(db, `${ROOT_PATH}/supplies`), { name: n, qty: q }); Utils.toast("Đã thêm!"); }
            };

            const btnAddH = document.getElementById('btn-add-h');
            if(btnAddH) btnAddH.onclick = () => {
                const n = prompt("Tên nhà mới:");
                if(n) addDoc(collection(db, `${ROOT_PATH}/houses`), { name: n, status: 'EMPTY', batchQty: 0, currentBatch: '' });
            };

        }, 100);
    }
};
