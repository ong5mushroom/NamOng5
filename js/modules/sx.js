import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH, increment } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        const isAdmin = user && ['Admin', 'Quản lý', 'Giám đốc'].some(r => (user.role||'').includes(r));

        const houseA = houses.find(h => {
            const n = (h.name || "").trim().toLowerCase();
            return n === 'nhà a' || n === 'nha a' || n === 'kho a' || n === 'kho phôi';
        });
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
        const activeHouses = houses.filter(h => h.id !== (houseA ? houseA.id : ''));
        const sortedInv = [...inventory].sort((a,b) => new Date(b.inputDate||0) - new Date(a.inputDate||0));

        const genCode = (s, d) => {
            if (!s || !d) return "";
            const [y, m, day] = d.split('-'); 
            return `${s.toUpperCase()}-${day}${m}${y.slice(-2)}`;
        };

        c.innerHTML = `
            <div class="space-y-5 pb-24">
                
                <div class="glass p-4 border-l-8 border-green-500 bg-green-50/50">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-green-700 uppercase text-xs flex items-center gap-2"><i class="fas fa-warehouse text-lg"></i> KHO PHÔI A</h3>
                        <div class="text-right"><div class="text-2xl font-black text-slate-700">${tonKhoA.toLocaleString()}</div><div class="text-[9px] text-slate-400 font-bold uppercase">Tổng Bịch</div></div>
                    </div>
                    <div class="bg-white p-3 rounded-xl border border-green-200 mb-3 shadow-sm">
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div><label class="text-[9px] font-bold text-slate-400 uppercase">Giống</label><input id="in-strain" placeholder="049" class="w-full p-2 rounded border border-green-200 text-sm font-bold uppercase" oninput="SX.preview()"></div>
                            <div><label class="text-[9px] font-bold text-slate-400 uppercase">Ngày</label><input id="in-date" type="date" class="w-full p-2 rounded border border-green-200 text-sm" onchange="SX.preview()"></div>
                        </div>
                        <div class="flex gap-2 items-end mb-2">
                            <div class="flex-1"><label class="text-[9px] font-bold text-slate-400 uppercase">Mã Lô</label><div id="preview-code" class="w-full p-2 rounded bg-slate-100 text-green-700 font-black text-sm border border-slate-200">...</div></div>
                            <div class="w-1/3"><label class="text-[9px] font-bold text-slate-400 uppercase">SL Nhập</label><input id="in-qty" type="number" placeholder="0" class="w-full p-2 rounded border border-green-200 text-sm font-bold text-center text-green-700"></div>
                        </div>
                        ${houseA ? `<button id="btn-in-a" class="w-full py-2 bg-green-600 text-white rounded font-bold text-xs shadow-md active:scale-95 transition">NHẬP KHO</button>` : '<div class="text-red-500 text-xs font-bold bg-red-50 p-2 text-center">⚠ Cần tạo Nhà A</div>'}
                    </div>
                    <div class="space-y-1 max-h-32 overflow-y-auto pr-1">
                        ${sortedInv.map(i => `<div class="flex justify-between items-center text-xs bg-white p-2 rounded border border-green-100"><div><span class="font-black text-green-800 block">${i.batchCode||i.code}</span><span class="text-[9px] text-slate-400">${i.inputDate ? new Date(i.inputDate).toLocaleDateString('vi-VN') : '-'}</span></div><div class="flex items-center gap-2"><span class="font-bold text-slate-600">+${i.qty}</span>${isAdmin?`<button class="text-red-300 hover:text-red-500" onclick="SX.delInv('${i.id}')"><i class="fas fa-times"></i></button>`:''}</div></div>`).join('')}
                    </div>
                </div>

                <div class="glass p-4 border-l-8 border-orange-500 bg-orange-50/50">
                    <h3 class="font-black text-orange-700 uppercase text-xs mb-3 flex items-center gap-2"><i class="fas fa-truck-loading text-lg"></i> XUẤT PHÔI -> CÁC NHÀ</h3>
                    <div class="bg-white p-3 rounded-xl border border-orange-200 shadow-sm">
                        <div class="mb-2">
                            <label class="text-[9px] font-bold text-slate-400 uppercase">Chọn Lô Phôi</label>
                            <select id="out-batch" class="w-full p-2 rounded border border-orange-200 text-sm font-bold text-slate-700 outline-none"><option value="">-- Chọn Mã Lô --</option>${sortedInv.map(i => `<option value="${i.batchCode||i.code}">${i.batchCode||i.code} (Nhập: ${i.qty})</option>`).join('')}</select>
                        </div>
                        <div class="flex gap-2 mb-3">
                            <div class="flex-1"><label class="text-[9px] font-bold text-slate-400 uppercase">Đến Nhà</label><select id="out-house" class="w-full p-2 rounded border border-orange-200 text-sm font-bold"><option value="">-- Chọn Nhà --</option>${activeHouses.map(h => `<option value="${h.id}" data-cur="${h.currentBatch||''}">${h.name} (${h.status==='ACTIVE'?'Đang chạy':'Trống'})</option>`).join('')}</select></div>
                            <div class="w-1/3"><label class="text-[9px] font-bold text-slate-400 uppercase">SL Xuất</label><input id="out-qty" type="number" max="${tonKhoA}" class="w-full p-2 rounded border border-orange-200 text-sm font-bold text-center text-orange-700"></div>
                        </div>
                        <button id="btn-out-a" class="w-full py-2 bg-orange-600 text-white rounded font-bold text-xs shadow-md active:scale-95 transition">XUẤT & CỘNG DỒN</button>
                    </div>
                    <div class="text-[10px] text-red-500 italic mt-2 text-center" id="stock-warning"></div>
                </div>

                <div class="glass p-4 border-l-8 border-yellow-400 bg-yellow-50/50">
                    <h3 class="font-black text-yellow-700 uppercase text-xs mb-3 flex items-center gap-2"><i class="fas fa-tools text-lg"></i> KHO VẬT TƯ</h3>
                    <div class="flex gap-2 mb-3">
                        <input id="mat-n" placeholder="Tên VT" class="flex-1 p-2 rounded border border-yellow-200 text-xs"><input id="mat-q" type="number" placeholder="SL" class="w-16 p-2 rounded border border-yellow-200 text-xs text-center"><button id="btn-add-mat" class="bg-yellow-500 text-white px-3 rounded font-bold text-xs shadow-sm">+</button>
                    </div>
                    <div class="bg-white p-2 rounded border border-yellow-100 max-h-32 overflow-y-auto">${supplies.map(s => `<div class="flex justify-between text-xs border-b last:border-0 border-slate-50 pb-1 pt-1"><span class="font-bold text-slate-700">${s.name}</span><div class="flex items-center gap-2"><span class="font-black text-yellow-600">${s.qty}</span>${isAdmin?`<button class="text-red-400" onclick="SX.delM('${s.id}')">x</button>`:''}</div></div>`).join('')}</div>
                </div>

                ${isAdmin ? `
                <div class="border-t pt-4">
                    <div class="flex justify-between items-center mb-2"><h4 class="text-xs font-bold text-slate-400 uppercase">Quản lý & Dọn Vụ</h4><button id="btn-add-h" class="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold">Thêm Nhà</button></div>
                    <div class="grid grid-cols-1 gap-2">
                        ${houses.map(h => `
                            <div class="bg-white p-2 rounded border flex justify-between items-center shadow-sm">
                                <div>
                                    <span class="text-[10px] font-bold ${h.id === (houseA?.id) ?'text-purple-600':''}">${h.name}</span>
                                    <span class="text-[9px] ml-1 ${h.status==='ACTIVE'?'text-green-500':'text-slate-300'}">${h.status==='ACTIVE'?'(Đang chạy)':'(Trống)'}</span>
                                </div>
                                <div class="flex gap-2">
                                    ${h.status === 'ACTIVE' && h.id !== (houseA?.id) ? `<button class="text-[9px] bg-orange-100 text-orange-600 px-2 py-1 rounded font-bold border border-orange-200" onclick="SX.endBatch('${h.id}', '${h.name}')">KẾT THÚC VỤ</button>` : ''}
                                    <button class="text-red-300 hover:text-red-500 px-2" onclick="SX.delHouse('${h.id}', '${h.name}')"><i class="fas fa-trash-alt"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

            </div>`;

        // GLOBAL HELPER
        window.SX = {
            ...window.SX,
            preview: () => { const s=document.getElementById('in-strain').value, d=document.getElementById('in-date').value; document.getElementById('preview-code').innerText = (s&&d)?genCode(s,d):"..."; },
            delInv: (id) => { if(confirm("Xóa log?")) deleteDoc(doc(db, `${ROOT_PATH}/spawn_inventory`, id)); },
            delM: (id) => { if(confirm("Xóa VT?")) deleteDoc(doc(db, `${ROOT_PATH}/supplies`, id)); },
            delHouse: (id, name) => { if(confirm(`Xóa nhà ${name}?`)) deleteDoc(doc(db, `${ROOT_PATH}/houses`, id)); },
            
            // --- HÀM KẾT THÚC VỤ (QUAN TRỌNG) ---
            endBatch: (id, name) => {
                if(confirm(`Bạn có chắc chắn muốn KẾT THÚC VỤ tại ${name}?\n\n- Trạng thái nhà sẽ về TRỐNG.\n- Số liệu 'Đã thu' bên Home sẽ tự động RESET về 0.`)) {
                    updateDoc(doc(db, `${ROOT_PATH}/houses`, id), {
                        status: 'EMPTY',
                        currentBatch: '',
                        batchQty: 0,
                        startDate: '' // Xóa ngày -> Home tự hiểu là reset
                    });
                    Utils.toast("Đã dọn vụ thành công!");
                }
            }
        };

        // GẮN SỰ KIỆN (Giữ nguyên logic cũ)
        setTimeout(() => {
            const qtyInput = document.getElementById('out-qty');
            if(qtyInput) qtyInput.addEventListener('input', () => { if (Number(qtyInput.value) > tonKhoA) { qtyInput.value = tonKhoA; document.getElementById('stock-warning').innerText = `⚠️ Max: ${tonKhoA}`; } else document.getElementById('stock-warning').innerText = ""; });

            const btnIn = document.getElementById('btn-in-a');
            if(btnIn) btnIn.onclick = async () => {
                const s=document.getElementById('in-strain').value, d=document.getElementById('in-date').value, q=Number(document.getElementById('in-qty').value);
                if(!s||!d||!q) return Utils.toast("Thiếu tin!", "err");
                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { batchCode: genCode(s,d), strain:s, date:d, qty:q, inputDate: new Date().toISOString() });
                if(houseA) await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(q) });
                Utils.toast("Đã nhập!"); document.getElementById('in-qty').value='';
            };

            const btnOut = document.getElementById('btn-out-a');
            if(btnOut) btnOut.onclick = async () => {
                const bc = document.getElementById('out-batch').value;
                const hEl = document.getElementById('out-house');
                const hid = hEl.value;
                const qty = Number(document.getElementById('out-qty').value);
                if(!bc||!hid||!qty) return Utils.toast("Thiếu tin!", "err");
                if(qty > tonKhoA) return Utils.toast("Quá kho!", "err");

                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(-qty) });
                const curBatch = hEl.options[hEl.selectedIndex].getAttribute('data-cur') || "";
                const newBatch = curBatch.includes(bc) ? curBatch : (curBatch ? `${curBatch}, ${bc}` : bc);

                await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), {
                    status: 'ACTIVE',
                    batchQty: increment(qty),
                    currentBatch: newBatch,
                    // QUAN TRỌNG: Cập nhật startDate để Home biết mốc tính sản lượng mới
                    startDate: new Date().toISOString().split('T')[0]
                });
                Utils.toast(`Đã xuất ${qty} bịch!`);
            };

            document.getElementById('btn-add-mat').onclick = () => { const n=document.getElementById('mat-n').value, q=Number(document.getElementById('mat-q').value); if(n&&q) addDoc(collection(db, `${ROOT_PATH}/supplies`), {name:n, qty:q}); };
            const btnH = document.getElementById('btn-add-h'); if(btnH) btnH.onclick = () => { const n=prompt("Tên Nhà:"); if(n) addDoc(collection(db, `${ROOT_PATH}/houses`), {name:n, status:'EMPTY', batchQty:0, currentBatch:''}); };

        }, 100);
    }
};
