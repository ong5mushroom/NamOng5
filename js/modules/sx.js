// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // 1. DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        
        // Tìm Nhà A (Kho Tổng) để lấy số lượng tồn
        const houseA = houses.find(h => h.name === 'Nhà A');
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;

        // Sắp xếp lịch sử nhập lẻ
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase text-xs">SỔ NHẬP PHÔI (LỊCH SỬ)</h3>
                        <button id="btn-import-spawn" class="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition">+ Ghi sổ</button>
                    </div>
                    <div class="max-h-32 overflow-y-auto space-y-2 pr-1">
                        ${sortedInv.length > 0 ? sortedInv.map(i => `
                            <div class="bg-white p-2 border rounded-lg flex justify-between text-xs items-center">
                                <div><span class="font-bold text-slate-700 block">${i.code}</span><span class="text-[9px] text-slate-400">${i.date}</span></div>
                                <span class="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">${i.qty}</span>
                            </div>`).join('') : '<p class="text-center text-xs text-slate-400 italic">Chưa có dữ liệu</p>'}
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center px-1 mb-3">
                        <h3 class="font-black text-slate-500 uppercase text-xs">TRẠNG THÁI NHÀ / KHO</h3>
                        <button id="btn-add-house-sx" class="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition">
                            <i class="fas fa-plus"></i> Thêm Nhà
                        </button>
                    </div>

                    <div class="space-y-3">
                        ${houses.map(h => {
                            // LOGIC: Nhà A là Kho Tổng
                            const isKhoTong = h.name === 'Nhà A';
                            
                            // Giao diện
                            const borderColor = isKhoTong ? 'border-purple-500' : (h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300');
                            const icon = isKhoTong ? '<i class="fas fa-warehouse text-purple-600 mr-2"></i>' : '<i class="fas fa-home text-slate-500 mr-2"></i>';
                            const statusLabel = isKhoTong ? 'KHO TỔNG' : (h.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'TRỐNG');
                            const statusColor = isKhoTong ? 'bg-purple-100 text-purple-700' : (h.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500');

                            return `
                            <div class="glass p-4 border-l-4 ${borderColor} relative animate-pop group">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700 flex items-center gap-2">
                                        ${icon} ${h.name}
                                    </span>
                                    <div class="flex gap-2 items-center">
                                        <span class="text-[9px] font-bold px-2 py-1 rounded ${statusColor}">${statusLabel}</span>
                                        ${!isKhoTong ? `<button class="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center btn-del-house active:scale-90 transition" data-id="${h.id}" data-name="${h.name}"><i class="fas fa-trash-alt text-[10px]"></i></button>` : ''}
                                    </div>
                                </div>
                                
                                ${h.status === 'ACTIVE' || isKhoTong ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">${isKhoTong ? 'Mã Lô Nhập' : 'Mã Lô SX'}</span>
                                            <span class="font-bold text-sm text-slate-800 truncate">${h.currentBatch || '-'}</span>
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">${isKhoTong ? 'Tồn Kho A' : 'Số Lượng'}</span>
                                            <span class="font-bold text-sm text-slate-800">${h.batchQty || 0}</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        ${isKhoTong ? `
                                            <button class="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 btn-import-a active:scale-95 transition" data-id="${h.id}" data-qty="${h.batchQty||0}">
                                                <i class="fas fa-plus-circle"></i> NHẬP HÀNG VÀO KHO A
                                            </button>
                                        ` : `
                                            <button class="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end active:scale-95 transition" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>
                                            <div class="flex items-center justify-center flex-1 text-[10px] font-bold text-slate-400 border rounded-lg">
                                                ${h.startDate ? Math.floor((new Date() - new Date(h.startDate))/86400000) + ' ngày' : '0 ngày'}
                                            </div>
                                        `}
                                    </div>
                                ` : `
                                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 btn-start-batch active:scale-95 transition" data-id="${h.id}" data-name="${h.name}">
                                        <i class="fas fa-box-open"></i> LẤY TỪ KHO A VÀO LÔ
                                    </button>
                                `}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;

        // 2. GẮN SỰ KIỆN
        setTimeout(() => {
            // A. THÊM NHÀ
            const btnAddHouse = document.getElementById('btn-add-house-sx');
            if(btnAddHouse) {
                const newBtn = btnAddHouse.cloneNode(true);
                btnAddHouse.parentNode.replaceChild(newBtn, btnAddHouse);
                newBtn.onclick = () => {
                    Utils.modal("Thêm Nhà Mới", 
                        `<input id="new-house-name" placeholder="Tên Nhà (VD: Nhà 5)" class="w-full p-2 border rounded font-bold uppercase">
                         <p class="text-[10px] text-slate-400 italic mt-1">* Đặt tên "Nhà A" nếu muốn tạo Kho Tổng.</p>`, 
                        [{id:'confirm-add', text:'Tạo Ngay', cls:'bg-blue-600 text-white'}]
                    );
                    setTimeout(() => document.getElementById('confirm-add').onclick = async () => {
                        const name = document.getElementById('new-house-name').value.trim();
                        if(name) {
                            await addDoc(collection(db, `${ROOT_PATH}/houses`), { 
                                name, status: 'EMPTY', currentBatch: '', batchQty: 0, created: Date.now() 
                            });
                            Utils.modal(null); Utils.toast(`Đã thêm ${name}`);
                        } else { Utils.toast("Chưa nhập tên!", "err"); }
                    }, 100);
                }
            }

            // B. XÓA NHÀ (Mới bổ sung)
            document.querySelectorAll('.btn-del-house').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    if(confirm(`⚠ CẢNH BÁO: Bạn có chắc muốn xóa vĩnh viễn ${newBtn.dataset.name}?\nDữ liệu đang chạy của nhà này sẽ mất!`)) {
                        deleteDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id))
                            .then(() => Utils.toast(`Đã xóa ${newBtn.dataset.name}`))
                            .catch(e => Utils.toast("Lỗi khi xóa!", "err"));
                    }
                }
            });

            // C. NHẬP KHO A (Cộng dồn tồn kho)
            document.querySelectorAll('.btn-import-a').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    Utils.modal("Nhập Hàng Vào Kho A", 
                        `<input id="batch-code" placeholder="Mã Lô Mới (VD: P01)" class="w-full p-2 border mb-2 uppercase font-bold">
                         <input id="batch-qty" type="number" placeholder="Số lượng nhập thêm" class="w-full p-2 border font-bold text-lg text-purple-600">`,
                        [{id:'confirm-imp-a', text:'Nhập Kho', cls:'bg-purple-600 text-white'}]
                    );
                    setTimeout(() => document.getElementById('confirm-imp-a').onclick = async () => {
                        const code = document.getElementById('batch-code').value;
                        const qty = Number(document.getElementById('batch-qty').value);
                        if(code && qty) {
                            const currentQty = Number(newBtn.dataset.qty) || 0;
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                                status: 'ACTIVE', currentBatch: code, batchQty: currentQty + qty
                            });
                            Utils.modal(null); Utils.toast(`Đã nhập thêm ${qty} vào Kho A`);
                        }
                    }, 100);
                }
            });

            // D. XUẤT KHO A -> VÀO NHÀ CON (Trừ A, Cộng Con)
            document.querySelectorAll('.btn-start-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    // Kiểm tra tồn kho A
                    if(tonKhoA <= 0) return Utils.toast("Kho A đang hết hàng!", "err");

                    Utils.modal(`Cấp Phôi Cho: ${newBtn.dataset.name}`, 
                        `<div class="bg-purple-50 p-3 rounded mb-3 text-xs text-purple-700 font-bold border border-purple-100 flex justify-between">
                            <span>Kho A đang có:</span> <span class="text-lg">${tonKhoA}</span>
                         </div>
                         <label class="text-[10px] font-bold text-slate-400">Số lượng lấy:</label>
                         <input id="batch-qty" type="number" placeholder="0" class="w-full p-2 border mb-2 font-bold">
                         <label class="text-[10px] font-bold text-slate-400">Ngày vào:</label>
                         <input id="batch-date" type="date" class="w-full p-2 border" value="${new Date().toISOString().split('T')[0]}">`,
                        [{id:'confirm-take', text:'Xác Nhận Xuất', cls:'bg-blue-600 text-white'}]
                    );

                    setTimeout(() => document.getElementById('confirm-take').onclick = async () => {
                        const qty = Number(document.getElementById('batch-qty').value);
                        const date = document.getElementById('batch-date').value;
                        
                        if(!qty || qty <= 0) return Utils.toast("Số lượng không hợp lệ", "err");
                        if(qty > tonKhoA) return Utils.toast(`Kho A không đủ! (Còn ${tonKhoA})`, "err");

                        // 1. Trừ Kho A
                        if(houseA && houseA.id) {
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - qty });
                        }
                        
                        // 2. Cộng vào Nhà Con
                        await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'ACTIVE', 
                            currentBatch: `Từ A (${houseA ? houseA.currentBatch : '?'})`, 
                            batchQty: qty, 
                            startDate: date
                        });

                        Utils.modal(null); Utils.toast(`Đã chuyển ${qty} từ A sang ${newBtn.dataset.name}`);
                    }, 100);
                }
            });

            // E. GHI SỔ NHẬP LẺ (Nút nhỏ trên cùng)
            const btnImpLog = document.getElementById('btn-import-spawn');
            if(btnImpLog) {
                const newBtn = btnImpLog.cloneNode(true);
                btnImpLog.parentNode.replaceChild(newBtn, btnImpLog);
                newBtn.onclick = () => {
                    Utils.modal("Ghi Sổ Nhập Phôi (Chỉ lưu lịch sử)", 
                        `<input id="imp-code" placeholder="Mã lô" class="w-full p-2 border mb-2 uppercase font-bold">
                         <input id="imp-qty" type="number" placeholder="Số lượng" class="w-full p-2 border">`, 
                        [{id:'save-imp-log', text:'Lưu Sổ'}]
                    );
                    setTimeout(() => document.getElementById('save-imp-log').onclick = async () => {
                        const code = document.getElementById('imp-code').value; 
                        const qty = Number(document.getElementById('imp-qty').value);
                        if(code && qty) { 
                            await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { code, qty, date: new Date().toISOString().split('T')[0], status: 'AVAILABLE' }); 
                            Utils.modal(null); Utils.toast("Đã ghi sổ thành công!"); 
                        }
                    }, 100);
                }
            }

            // F. KẾT THÚC LÔ
            document.querySelectorAll('.btn-end').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    if(confirm(`Kết thúc lô tại ${newBtn.dataset.name}?`)) {
                        updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'EMPTY', currentBatch: '', batchQty: 0, startDate: ''
                        }).then(() => Utils.toast("Đã giải phóng nhà."));
                    }
                }
            });

        }, 100);
    }
};
