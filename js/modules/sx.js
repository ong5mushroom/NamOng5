// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // Data Safe
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        
        // Sắp xếp kho phôi nhập lẻ (nếu có)
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase text-xs">LỊCH SỬ NHẬP PHÔI</h3>
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
                            // --- LOGIC QUAN TRỌNG: NHẬN DIỆN NHÀ A LÀ KHO ---
                            // Điều kiện: Tên là "Nhà A" HOẶC tên có chứa chữ "Kho"
                            const isKho = h.name === "Nhà A" || h.name.includes("Kho");
                            
                            // Giao diện khác biệt cho Kho
                            const borderColor = isKho ? 'border-purple-500' : (h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300');
                            const icon = isKho ? '<i class="fas fa-warehouse text-purple-600 mr-2"></i>' : '';
                            const statusBadge = isKho 
                                ? `<span class="text-[9px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">KHO LƯU TRỮ</span>`
                                : (h.status === 'ACTIVE' 
                                    ? `<span class="text-[9px] font-bold px-2 py-1 rounded bg-green-100 text-green-700">ĐANG CHẠY</span>`
                                    : `<span class="text-[9px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-500">TRỐNG</span>`);

                            return `
                            <div class="glass p-4 border-l-4 ${borderColor} relative animate-pop">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700 flex items-center">${icon} ${h.name}</span>
                                    ${statusBadge}
                                </div>
                                
                                ${h.status === 'ACTIVE' ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">${isKho ? 'Lô Phôi' : 'Mã Lô'}</span>
                                            <span class="font-bold text-sm text-slate-800">${h.currentBatch}</span>
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Tồn Kho</span>
                                            <span class="font-bold text-sm text-slate-800">${h.batchQty || 0}</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end-batch" data-id="${h.id}" data-name="${h.name}" data-iskho="${isKho}">${isKho ? 'XUẤT HẾT / RESET' : 'KẾT THÚC LÔ'}</button>
                                        ${!isKho ? `<div class="flex items-center justify-center flex-1 text-[10px] font-bold text-slate-400">Ngày ${Math.floor((new Date() - new Date(h.startDate)) / 86400000)}</div>` : ''}
                                    </div>
                                ` : `
                                    <button class="w-full py-3 ${isKho ? 'bg-purple-600 shadow-purple-200' : 'bg-blue-600 shadow-blue-200'} text-white rounded-xl font-bold shadow-lg btn-new-batch" data-id="${h.id}" data-name="${h.name}" data-iskho="${isKho}">
                                        <i class="fas fa-plus-circle"></i> ${isKho ? 'NHẬP KHO MỚI' : 'VÀO LÔ SX'}
                                    </button>
                                `}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;

        // --- GẮN SỰ KIỆN ---
        setTimeout(() => {
            // Nút Ghi sổ nhập phôi lẻ
            const btnImp = document.getElementById('btn-import-spawn');
            if(btnImp) {
                // Clone để xóa event cũ
                const newBtn = btnImp.cloneNode(true);
                btnImp.parentNode.replaceChild(newBtn, btnImp);
                newBtn.onclick = () => {
                    Utils.modal("Ghi Sổ Nhập Phôi", 
                        `<input id="imp-code" placeholder="Mã phôi" class="w-full p-2 border mb-2 uppercase font-bold">
                         <input id="imp-qty" type="number" placeholder="Số lượng" class="w-full p-2 border font-bold">`,
                        [{id:'save-imp', text:'Lưu', cls:'bg-indigo-600 text-white'}]
                    );
                    setTimeout(() => {
                        document.getElementById('save-imp').onclick = async () => {
                            const code = document.getElementById('imp-code').value;
                            const qty = Number(document.getElementById('imp-qty').value);
                            if(code && qty) {
                                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {
                                    code, qty, date: new Date().toISOString().split('T')[0], status: 'AVAILABLE'
                                });
                                Utils.modal(null); Utils.toast("✅ Đã ghi sổ!");
                            }
                        };
                    }, 100);
                };
            }

            // Nút Vào Lô / Nhập Kho (Logic Nhà A)
            document.querySelectorAll('.btn-new-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    const isKho = newBtn.dataset.iskho === 'true';
                    const title = isKho ? `Nhập Phôi Vào: ${newBtn.dataset.name}` : `Vào Lô SX: ${newBtn.dataset.name}`;
                    
                    Utils.modal(title, 
                        `<input id="batch-code" placeholder="${isKho ? 'Mã Lô Nhập' : 'Mã Lô SX'}" class="w-full p-2 border mb-2 uppercase font-bold">
                         <div class="flex gap-2">
                             <input id="batch-qty" type="number" placeholder="Số lượng" class="w-full p-2 border mb-2">
                             <input id="batch-date" type="date" class="w-full p-2 border mb-2" value="${new Date().toISOString().split('T')[0]}">
                         </div>`,
                        [{id:'confirm-new-batch', text:'Xác Nhận', cls: isKho ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}]
                    );
                    
                    setTimeout(() => {
                        document.getElementById('confirm-new-batch').onclick = async () => {
                            const code = document.getElementById('batch-code').value;
                            const qty = document.getElementById('batch-qty').value;
                            const date = document.getElementById('batch-date').value;
                            if(code && qty) {
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                                    status: 'ACTIVE', currentBatch: code, batchQty: Number(qty), startDate: date
                                });
                                Utils.modal(null); Utils.toast(`🎉 Đã cập nhật ${newBtn.dataset.name}`);
                            }
                        };
                    }, 100);
                }
            });

            // Nút Kết Thúc / Reset Kho
            document.querySelectorAll('.btn-end-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    const isKho = newBtn.dataset.iskho === 'true';
                    const msg = isKho ? `Xác nhận đã xuất hết/làm trống ${newBtn.dataset.name}?` : `Kết thúc lô sản xuất tại ${newBtn.dataset.name}?`;
                    if(confirm(msg)) {
                        updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'EMPTY', currentBatch: '', batchQty: 0, startDate: ''
                        }).then(() => Utils.toast("Đã cập nhật trạng thái trống."));
                    }
                }
            });
        }, 100);
    }
};
