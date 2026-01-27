import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH, increment } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // 1. DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        // Lấy kho A (tìm theo tên chứa chữ A hoặc Kho)
        const houseA = houses.find(h => ['nhà a','kho a','kho phôi'].includes((h.name||'').trim().toLowerCase()));
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
        
        // Lọc nhà SX (Không phải A)
        const activeHouses = houses.filter(h => h.id !== (houseA?.id));
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory.sort((a,b)=>new Date(b.inputDate)-new Date(a.inputDate)) : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        const isAdmin = user && ['Admin', 'Quản lý', 'Giám đốc'].some(r => user.role.includes(r));

        // Helper tạo mã
        const genCode = (s, d) => { if(!s||!d) return ""; const [y,m,day]=d.split('-'); return `${s.toUpperCase()}-${day}${m}${y.slice(-2)}`; };

        c.innerHTML = `
            <div class="space-y-5 pb-24">
                <div class="glass p-4 border-l-8 border-green-500 bg-green-50/50">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-green-700 uppercase text-xs"><i class="fas fa-warehouse text-lg mr-1"></i> KHO PHÔI A</h3>
                        <div class="text-right"><div class="text-2xl font-black text-slate-700">${tonKhoA.toLocaleString()}</div><div class="text-[9px] font-bold uppercase text-slate-400">Tồn Bịch</div></div>
                    </div>
                    <div class="bg-white p-2 rounded border border-green-200 mb-2 shadow-sm">
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <input id="in-strain" placeholder="Tên Giống (049)" class="p-2 border rounded text-xs font-bold uppercase" oninput="SX.preview()">
                            <input id="in-date" type="date" class="p-2 border rounded text-xs" onchange="SX.preview()">
                        </div>
                        <div class="flex gap-2">
                            <div id="preview-code" class="flex-1 p-2 bg-slate-100 rounded text-xs font-black text-green-700 flex items-center">...</div>
                            <input id="in-qty" type="number" placeholder="SL" class="w-20 p-2 border rounded text-xs font-bold text-center">
                        </div>
                        <button id="btn-in-a" class="w-full mt-2 py-2 bg-green-600 text-white rounded font-bold text-xs shadow">NHẬP KHO A</button>
                    </div>
                    <div class="max-h-32 overflow-y-auto space-y-1">
                        ${inventory.map(i => `<div class="flex justify-between text-xs bg-white p-2 border rounded border-green-50"><span>${i.batchCode||i.code}</span><span class="font-bold text-green-700">+${i.qty}</span></div>`).join('')}
                    </div>
                </div>

                <div class="glass p-4 border-l-8 border-orange-500 bg-orange-50/50">
                    <h3 class="font-black text-orange-700 uppercase text-xs mb-3"><i class="fas fa-truck-loading text-lg mr-1"></i> XUẤT SANG NHÀ SX</h3>
                    <div class="bg-white p-3 rounded border border-orange-200 shadow-sm space-y-2">
                        <select id="out-batch" class="w-full p-2 border rounded text-xs font-bold text-slate-700">
                            <option value="">-- Chọn Mã Lô Từ Kho A --</option>
                            ${inventory.map(i => `<option value="${i.batchCode||i.code}">${i.batchCode||i.code} (Nhập: ${i.qty})</option>`).join('')}
                        </select>
                        <div class="flex gap-2">
                            <select id="out-house" class="flex-1 p-2 border rounded text-xs font-bold">
                                <option value="">-- Đến Nhà --</option>
                                ${activeHouses.map(h => `<option value="${h.id}" data-cur="${h.currentBatch||''}">${h.name} (${h.status==='ACTIVE'?'Đang chạy':'Trống'})</option>`).join('')}
                            </select>
                            <input id="out-qty" type="number" placeholder="SL" class="w-20 p-2 border rounded text-xs font-bold text-center">
                        </div>
                        <button id="btn-out-a" class="w-full py-2 bg-orange-600 text-white rounded font-bold text-xs shadow">XUẤT PHÔI & CỘNG DỒN</button>
                    </div>
                    <p class="text-[10px] text-slate-500 italic mt-2">* Tự động trừ Kho A và cộng dồn vào Nhà nhận.</p>
                </div>

                <div class="glass p-4 border-l-8 border-yellow-400 bg-yellow-50/50">
                    <h3 class="font-black text-yellow-700 uppercase text-xs mb-3"><i class="fas fa-tools text-lg mr-1"></i> KHO VẬT TƯ</h3>
                    <div class="flex gap-2 mb-2">
                        <input id="mat-n" placeholder="Tên VT" class="flex-1 p-2 border rounded text-xs">
                        <input id="mat-q" type="number" placeholder="SL" class="w-16 p-2 border rounded text-xs text-center">
                        <button id="btn-add-mat" class="bg-yellow-500 text-white px-3 rounded font-bold text-xs">+</button>
                    </div>
                    <div class="max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded border border-yellow-100">
                        ${supplies.map(s => `<div class="flex justify-between text-xs border-b last:border-0 pb-1"><span>${s.name}</span><span class="font-bold text-yellow-600">${s.qty}</span>${isAdmin?`<button onclick="SX.delM('${s.id}')" class="text-red-400 ml-2">x</button>`:''}</div>`).join('')}
                    </div>
                </div>

                ${isAdmin ? `<div class="pt-4 border-t"><button id="btn-add-house" class="bg-slate-200 text-xs font-bold px-3 py-2 rounded">+ Thêm Nhà</button><div class="mt-2 grid grid-cols-3 gap-2">${houses.map(h=>`<div class="bg-white p-1 text-[10px] border flex justify-between"><span>${h.name}</span><button onclick="SX.delH('${h.id}')" class="text-red-500">x</button></div>`).join('')}</div></div>` : ''}
            </div>`;

        // GLOBAL FUNCTIONS
        window.SX = {
            preview: () => {
                const s=document.getElementById('in-strain').value, d=document.getElementById('in-date').value;
                document.getElementById('preview-code').innerText = (s&&d) ? genCode(s,d) : "...";
            },
            delM: (id) => { if(confirm("Xóa vật tư?")) deleteDoc(doc(db, `${ROOT_PATH}/supplies`, id)); },
            delH: (id) => { if(confirm("Xóa nhà? Dữ liệu sẽ mất!")) deleteDoc(doc(db, `${ROOT_PATH}/houses`, id)); }
        };

        setTimeout(() => {
            // 1. NHẬP KHO A
            const btnIn = document.getElementById('btn-in-a');
            if(btnIn) btnIn.onclick = async () => {
                const s=document.getElementById('in-strain').value, d=document.getElementById('in-date').value, q=Number(document.getElementById('in-qty').value);
                if(!s||!d||!q) return Utils.toast("Thiếu tin!", "err");
                
                if(!houseA) { // Tự tạo Nhà A nếu chưa có
                    const ref = await addDoc(collection(db, `${ROOT_PATH}/houses`), { name: "Nhà A", batchQty: q, status: 'EMPTY' });
                    houseA = { id: ref.id }; 
                } else {
                    await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(q) });
                }
                
                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { batchCode: genCode(s,d), strain:s, date:d, qty:q, inputDate: new Date().toISOString() });
                Utils.toast("Đã nhập kho A!");
                document.getElementById('in-qty').value = '';
            };

            // 2. XUẤT KHO (CỘNG DỒN)
            const btnOut = document.getElementById('btn-out-a');
            if(btnOut) btnOut.onclick = async () => {
                const bc = document.getElementById('out-batch').value;
                const hEl = document.getElementById('out-house');
                const hid = hEl.value;
                const qty = Number(document.getElementById('out-qty').value);
                
                if(!bc||!hid||!qty) return Utils.toast("Thiếu tin!", "err");
                if(qty > tonKhoA) return Utils.toast("Kho A không đủ!", "err");

                // Trừ Kho A (Dùng increment để an toàn)
                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(-qty) });

                // Cộng dồn Nhà Con
                // Lấy tên lô hiện tại để nối chuỗi
                const curBatchName = hEl.options[hEl.selectedIndex].getAttribute('data-cur') || "";
                // Nếu lô mới khác lô cũ thì nối thêm, không thì giữ nguyên
                const newBatchName = curBatchName.includes(bc) ? curBatchName : (curBatchName ? curBatchName + ", " + bc : bc);

                await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), {
                    status: 'ACTIVE',
                    batchQty: increment(qty), // CỘNG DỒN SỐ LƯỢNG
                    currentBatch: newBatchName, // CỘNG DỒN TÊN LÔ
                    startDate: new Date().toISOString().split('T')[0] // Cập nhật ngày mới nhất
                });

                Utils.toast("Đã xuất & cộng dồn!");
            };

            // 3. VẬT TƯ & NHÀ
            document.getElementById('btn-add-mat').onclick = () => {
                const n=document.getElementById('mat-n').value, q=Number(document.getElementById('mat-q').value);
                if(n&&q) addDoc(collection(db, `${ROOT_PATH}/supplies`), {name:n, qty:q});
            };
            const btnAddH = document.getElementById('btn-add-house');
            if(btnAddH) btnAddH.onclick = () => {
                const n = prompt("Tên nhà:");
                if(n) addDoc(collection(db, `${ROOT_PATH}/houses`), {name:n, status:'EMPTY', batchQty:0, currentBatch:''});
            };

        }, 100);
    }
};
