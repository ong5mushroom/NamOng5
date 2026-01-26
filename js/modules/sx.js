import { db, doc, updateDoc, addDoc, collection, ROOT_PATH, onSnapshot } from '../config.js';
import { Utils } from '../utils.js';

// --- KHAI BÁO BIẾN LƯU TRỮ CỤC BỘ (STATE) ---
let _inventory = []; 
let _houses = [];    // Thêm biến lưu danh sách nhà
let _materials = []; // Thêm biến lưu danh sách vật tư

export const SX = {
    // Hàm init để lắng nghe dữ liệu kho phôi realtime
    init: () => {
        // Chỉ lắng nghe kho phôi (vì nó biến động nhiều nhất)
        onSnapshot(collection(db, `${ROOT_PATH}/spawn_inventory`), (snap) => {
            _inventory = snap.docs.map(d => ({...d.data(), _id: d.id}));
            // Nếu đang mở tab SX thì vẽ lại để cập nhật số liệu
            if(!document.getElementById('view-sx').classList.contains('hidden')) SX.render();
        });
    },

    render: (data) => {
        const c = document.getElementById('view-sx');
        if(c.classList.contains('hidden')) return;

        // --- BƯỚC 1: ĐỒNG BỘ DỮ LIỆU ---
        // Nếu có data mới từ App truyền vào (lần đầu load), hãy lưu vào biến cục bộ
        if(data) {
            if(data.houses) _houses = data.houses;
            if(data.materials) _materials = data.materials;
            // Nếu _inventory chưa có dữ liệu từ onSnapshot thì lấy tạm từ data
            if(_inventory.length === 0 && data.spawn_inventory) _inventory = data.spawn_inventory;
        }

        // Sắp xếp nhà theo tên (1, 2, 3...)
        const housesDisplay = [..._houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // Tính tổng tồn kho phôi
        const totalSpawn = _inventory.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

        // --- BƯỚC 2: VẼ GIAO DIỆN ---
        c.innerHTML = `
        <div class="space-y-6">
            <div class="glass p-5 border-l-4 border-indigo-500 relative">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-black text-slate-700 uppercase flex items-center gap-2"><i class="fas fa-warehouse"></i> KHO A (PHÔI)</h3>
                    <button id="btn-import-spawn" class="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold btn-action shadow-sm">+ Nhập Phôi Mới</button>
                </div>
                <div class="bg-indigo-50 p-3 rounded-xl mb-3 flex justify-between items-center">
                    <span class="text-xs font-bold text-indigo-800">Tổng tồn kho:</span>
                    <span class="text-xl font-black text-indigo-600">${totalSpawn.toLocaleString()} <span class="text-xs">bịch</span></span>
                </div>
                <div class="space-y-2 max-h-32 overflow-y-auto pr-1">
                    ${_inventory.length ? _inventory.map(i => `
                        <div class="bg-white p-2 rounded border border-indigo-100 flex justify-between text-xs">
                            <div><span class="font-bold text-slate-700">${i.code}</span> <span class="text-slate-400">(${i.date})</span></div>
                            <div class="font-bold text-indigo-600">${i.qty} bịch</div>
                        </div>
                    `).join('') : '<div class="text-center text-xs text-slate-400 italic">Kho A đang trống</div>'}
                </div>
            </div>

            <div class="glass p-5 border-l-4 border-blue-500 space-y-4">
                <h3 class="font-black text-slate-700 uppercase flex items-center gap-2"><i class="fas fa-dolly"></i> Xuất Vào Nhà Trồng</h3>
                
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">1. Nguồn Phôi (Kho A)</label>
                    <select id="sx-source" class="w-full p-3 font-bold bg-slate-50 border rounded-xl outline-none mt-1">
                        <option value="">-- Chọn lô phôi --</option>
                        ${_inventory.map(i => `<option value="${i._id}" data-qty="${i.qty}" data-code="${i.code}">Lô ${i.code} (Còn ${i.qty})</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">2. Đích Đến (Nhà)</label>
                    <select id="sx-house-dest" class="w-full p-3 font-bold bg-slate-50 border rounded-xl outline-none mt-1">
                        ${housesDisplay.map(h=>`<option value="${h._id}">${h.name} (${h.status==='ACTIVE' ? 'Đang chạy' : 'Trống'})</option>`).join('')}
                    </select>
                </div>

                <div class="flex gap-3">
                    <div class="w-1/2">
                        <label class="text-[10px] font-bold text-slate-400 uppercase">SL Vào</label>
                        <input id="sx-qty" type="number" class="w-full p-3 font-bold text-blue-600 text-lg border rounded-xl" placeholder="0">
                    </div>
                    <div class="w-1/2">
                        <label class="text-[10px] font-bold text-slate-400 uppercase">Ngày Vào</label>
                        <input id="sx-date" type="date" class="w-full p-3 border rounded-xl">
                    </div>
                </div>
                
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Ghi chú / Mã lô thực tế</label>
                    <input id="sx-real-code" class="w-full p-3 border rounded-xl" placeholder="Để trống sẽ lấy mã nguồn...">
                </div>

                <button id="btn-distribute" class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg btn-action active:scale-95">
                    XÁC NHẬN VÀO NHÀ
                </button>
            </div>
            
            <div class="glass p-5 border-l-4 border-purple-500">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-black text-slate-700 uppercase flex items-center gap-2"><i class="fas fa-boxes"></i> Vật Tư Phụ</h3>
                    <button id="btn-add-mat" class="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold btn-action">+ Nhập</button>
                </div>
                <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    ${_materials.length ? _materials.map(m => `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span class="text-xs font-bold text-slate-600 truncate">${m.name}</span>
                            <div class="text-purple-600 font-black text-sm">${m.qty} <span class="text-[9px] text-slate-400">${m.unit}</span></div>
                        </div>`).join('') : '<span class="text-xs italic text-slate-400 text-center col-span-2">Kho trống</span>'}
                </div>
            </div>
        </div>`;

        // --- BƯỚC 3: GẮN SỰ KIỆN VỚI OPTIMISTIC UI (CẬP NHẬT NGAY) ---
        setTimeout(() => {
            // 1. Nhập Phôi Mới
            document.getElementById('btn-import-spawn').onclick = () => {
                Utils.modal("Nhập Phôi Mới (Kho A)", `
                    <input id="imp-code" placeholder="Mã giống (VD: 012-L1)" class="w-full p-2 border rounded mb-2">
                    <input id="imp-qty" type="number" placeholder="Số lượng bịch" class="w-full p-2 border rounded mb-2 font-bold text-lg">
                    <input id="imp-date" type="date" class="w-full p-2 border rounded mb-2">
                    <input id="imp-ncc" placeholder="Nhà cung cấp" class="w-full p-2 border rounded">
                `, [{id:'submit-spawn-imp', text:'Lưu Kho A', cls:'bg-indigo-600 text-white'}]);

                setTimeout(() => document.getElementById('submit-spawn-imp').onclick = async () => {
                    const code = document.getElementById('imp-code').value;
                    const qty = Number(document.getElementById('imp-qty').value);
                    const date = document.getElementById('imp-date').value || new Date().toISOString().split('T')[0];
                    const ncc = document.getElementById('imp-ncc').value;

                    if(!code || !qty) return Utils.toast("Thiếu mã hoặc số lượng!", "err");

                    // --- FIX: Cập nhật giao diện ngay lập tức ---
                    const newSpawn = { code, qty, date, ncc, status: 'AVAILABLE', _id: 'temp_' + Date.now() };
                    _inventory.push(newSpawn);
                    SX.render(); // Vẽ lại ngay
                    Utils.modal(null);
                    Utils.toast(`Đã nhập ${qty} bịch ${code}`);

                    // Sau đó mới gửi lên server
                    await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {
                        code, qty, date, ncc, status: 'AVAILABLE', createdBy: 'Admin'
                    });
                }, 100);
            };

            // 2. Phân Phối
            document.getElementById('btn-distribute').onclick = async () => {
                const sourceId = document.getElementById('sx-source').value;
                const houseId = document.getElementById('sx-house-dest').value;
                const qty = Number(document.getElementById('sx-qty').value);
                const date = document.getElementById('sx-date').value || new Date().toISOString().split('T')[0];
                const realCode = document.getElementById('sx-real-code').value;

                if(!sourceId || !houseId || !qty) return Utils.toast("Vui lòng nhập đủ thông tin!", "err");

                const sourceOpt = document.getElementById('sx-source').options[document.getElementById('sx-source').selectedIndex];
                const available = Number(sourceOpt.getAttribute('data-qty'));
                const sourceCode = sourceOpt.getAttribute('data-code');

                if(qty > available) return Utils.toast(`Kho A chỉ còn ${available} bịch!`, "err");

                // --- FIX: Cập nhật biến cục bộ ngay ---
                // 1. Trừ kho
                const itemIndex = _inventory.findIndex(i => i._id === sourceId);
                if(itemIndex > -1) {
                    _inventory[itemIndex].qty -= qty;
                    if(_inventory[itemIndex].qty <= 0) _inventory[itemIndex].qty = 0; // Hoặc xóa nếu muốn
                }
                
                // 2. Cập nhật trạng thái Nhà
                const houseIndex = _houses.findIndex(h => h._id === houseId);
                if(houseIndex > -1) {
                    _houses[houseIndex].status = 'ACTIVE';
                    _houses[houseIndex].currentBatch = realCode || sourceCode;
                    _houses[houseIndex].currentSpawn = qty;
                }

                SX.render(); // Vẽ lại ngay
                Utils.toast(`✅ Đã chuyển ${qty} bịch vào nhà!`);

                // Gửi lên Server
                const remaining = available - qty;
                if(remaining === 0) {
                    await updateDoc(doc(db, `${ROOT_PATH}/spawn_inventory`, sourceId), { qty: 0, status: 'EMPTY' });
                } else {
                    await updateDoc(doc(db, `${ROOT_PATH}/spawn_inventory`, sourceId), { qty: remaining });
                }

                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseId), {
                    status: 'ACTIVE',
                    currentBatch: realCode || sourceCode,
                    currentSpawn: qty,
                    startDate: date,
                    sourceBatchId: sourceId
                });
            };

            // 3. Nhập Vật Tư (FIX QUAN TRỌNG: Cập nhật List ngay)
            document.getElementById('btn-add-mat').onclick = () => {
                Utils.modal("Nhập Vật Tư", `<input id="mat-name" placeholder="Tên (Cồn...)" class="w-full p-2 border rounded mb-2"><div class="flex gap-2"><input id="mat-qty" type="number" placeholder="SL" class="w-2/3 p-2 border rounded"><input id="mat-unit" placeholder="ĐVT" class="w-1/3 p-2 border rounded"></div>`, [{id:'submit-mat', text:'Lưu', cls:'bg-purple-600 text-white'}]);
                
                setTimeout(() => document.getElementById('submit-mat').onclick = async () => {
                    const n = document.getElementById('mat-name').value; 
                    const q = document.getElementById('mat-qty').value; 
                    const u = document.getElementById('mat-unit').value;
                    
                    if(n) { 
                        // Cập nhật ngay vào biến cục bộ và vẽ lại
                        _materials.push({name: n, qty: q, unit: u});
                        SX.render();
                        Utils.modal(null); 
                        Utils.toast("Đã nhập vật tư"); 

                        // Gửi Server
                        await addDoc(collection(db, `${ROOT_PATH}/materials`), { name:n, qty:q, unit:u }); 
                    }
                }, 100);
            };
        }, 0);
    }
};
