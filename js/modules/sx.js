// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // 1. DATA SAFE & TÌM KHO A
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        
        // Tìm Nhà A để lấy tồn kho
        const houseA = houses.find(h => h.name === 'Nhà A');
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;

        // Sắp xếp lịch sử nhập lẻ
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase text-xs">LỊCH SỬ GHI SỔ NHẬP</h3>
                        <button id="btn-import-spawn" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-xs shadow-sm">+ Ghi sổ</button>
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
                    <h3 class="font-black text-slate-500 uppercase text-xs mb-3 px-1">TRẠNG THÁI NHÀ / KHO</h3>
                    <div class="space-y-3">
                        ${houses.map(h => {
                            // --- LOGIC QUAN TRỌNG: NHÀ A LÀ KHO TỔNG ---
                            const isKhoTong = h.name === 'Nhà A';
                            
                            // Giao diện khác biệt
                            const borderColor = isKhoTong ? 'border-purple-500' : (h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300');
                            const icon = isKhoTong ? '<i class="fas fa-warehouse text-purple-600 mr-2"></i>' : '<i class="fas fa-home text-slate-500 mr-2"></i>';
                            const statusLabel = isKhoTong ? 'KHO TỔNG' : (h.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'TRỐNG');
                            const statusColor = isKhoTong ? 'bg-purple-100 text-purple-700' : (h.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500');

                            return `
                            <div class="glass p-4 border-l-4 ${borderColor} relative animate-pop">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700 flex items-center">${icon} ${h.name}</span>
                                    <span class="text-[9px] font-bold px-2 py-1 rounded ${statusColor}">${statusLabel}</span>
                                </div>
                                
                                ${h.status === 'ACTIVE' || isKhoTong ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">${isKhoTong ? 'Mã Lô Nhập' : 'Mã Lô SX'}</span>
                                            <span class="font-bold text-sm text-slate-800">${h.currentBatch || '-'}</span>
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">${isKhoTong ? 'Tồn Kho A' : 'Số Lượng'}</span>
                                            <span class="font-bold text-sm text-slate-800">${h.batchQty || 0}</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        ${isKhoTong ? `
                                            <button class="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 btn-import-a" data-id="${h.id}" data-qty="${h.batchQty||0}">
                                                <i class="fas fa-plus-circle"></i> NHẬP HÀNG VÀO KHO A
                                            </button>
                                        ` : `
                                            <button class="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>
                                            <div class="flex items-center justify-center flex-1 text-[10px] font-bold text-slate-400">
                                                ${h.startDate ? Math.floor((new Date() - new Date(h.startDate))/86400000) + ' ngày' : ''}
                                            </div>
                                        `}
                                    </div>
                                ` : `
                                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 btn-start-batch" data-id="${h.id}" data-name="${h.name}">
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
            // A. Ghi sổ nhập lẻ (Không ảnh hưởng kho)
            const btnImp = document.getElementById('btn-import-spawn');
            if(btnImp) {
                const newBtn = btnImp.cloneNode(true);
                btnImp.parentNode.replaceChild(newBtn, btnImp);
                newBtn.onclick = () => {
                    Utils.modal("Ghi Sổ Nhập Phôi", `<input id="imp-code" placeholder="Mã phôi" class="w-full p-2 border mb-2"><input id="imp-qty" type="number" placeholder="Số lượng" class="w-full p-2 border">`, [{id:'save-imp', text:'Lưu'}]);
                    setTimeout(() => document.getElementById('save-imp').onclick = async () => {
                        const code = document.getElementById('imp-code').value; const qty = Number(document.getElementById('imp-qty').value);
                        if(code && qty) { await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), { code, qty, date: new Date().toISOString().split('T')[0], status: 'AVAILABLE' }); Utils.modal(null); Utils.toast("Đã ghi sổ!"); }
                    }, 100);
                }
            }

            // B. NHÀ A: NHẬP HÀNG (Tăng tồn kho A)
            document.querySelectorAll('.btn-import-a').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    Utils.modal("Nhập Hàng Vào Kho A", 
                        `<input id="batch-code" placeholder="Mã Lô Mới (VD: P01)" class="w-full p-2 border mb-2 uppercase font-bold">
                         <input id="batch-qty" type="number" placeholder="Số lượng nhập thêm" class="w-full p-2 border font-bold">`,
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

            // C. CÁC NHÀ KHÁC: LẤY TỪ A (Giảm A, Tăng Nhà)
            document.querySelectorAll('.btn-start-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    // Kiểm tra tồn kho A
                    if(tonKhoA <= 0) return Utils.toast("Kho A đã hết hàng! Hãy nhập thêm.", "err");

                    Utils.modal(`Cấp Phôi Cho: ${newBtn.dataset.name}`, 
                        `<div class="bg-purple-50 p-2 rounded mb-2 text-xs text-purple-700 font-bold">Kho A đang có: ${tonKhoA}</div>
                         <input id="batch-qty" type="number" placeholder="Số lượng lấy" class="w-full p-2 border mb-2">
                         <input id="batch-date" type="date" class="w-full p-2 border" value="${new Date().toISOString().split('T')[0]}">`,
                        [{id:'confirm-take', text:'Xuất Kho A -> Vào Lô', cls:'bg-blue-600 text-white'}]
                    );

                    setTimeout(() => document.getElementById('confirm-take').onclick = async () => {
                        const qty = Number(document.getElementById('batch-qty').value);
                        const date = document.getElementById('batch-date').value;
                        
                        if(!qty || qty <= 0) return Utils.toast("Số lượng lỗi", "err");
                        if(qty > tonKhoA) return Utils.toast("Kho A không đủ hàng!", "err");

                        // 1. Trừ Kho A
                        if(houseA && houseA.id) {
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - qty });
                        }
                        
                        // 2. Cộng vào Nhà Con
                        await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'ACTIVE', currentBatch: `Từ A (${houseA ? houseA.currentBatch : '?'})`, batchQty: qty, startDate: date
                        });

                        Utils.modal(null); Utils.toast(`Đã chuyển ${qty} từ A sang ${newBtn.dataset.name}`);
                    }, 100);
                }
            });

            // D. KẾT THÚC LÔ (Cho nhà thường)
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
