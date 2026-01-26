// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if(!c || c.classList.contains('hidden')) return;

        // Data Safe
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        const houses = Array.isArray(data.houses) ? data.houses : [];
        
        // Sắp xếp
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase text-xs">DANH MỤC PHÔI GIỐNG</h3>
                        <button id="btn-import-spawn" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-xs shadow-sm">+ Nhập Mới</button>
                    </div>
                    <div class="max-h-40 overflow-y-auto space-y-2 pr-1">
                        ${sortedInv.length > 0 ? sortedInv.map(i => `
                            <div class="bg-white p-2 border rounded-lg flex justify-between text-xs items-center">
                                <div><span class="font-bold text-slate-700 block">${i.code}</span><span class="text-[9px] text-slate-400">${i.date}</span></div>
                                <span class="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">${i.qty}</span>
                            </div>`).join('') : '<p class="text-center text-xs text-slate-400 italic">Chưa có phôi</p>'}
                    </div>
                </div>

                <div>
                    <h3 class="font-black text-slate-500 uppercase text-xs mb-3 px-1">QUẢN LÝ NHÀ & KHO</h3>
                    <div class="space-y-3">
                        ${houses.map(h => {
                            // --- LOGIC NHẬN DIỆN NHÀ A LÀ KHO ---
                            const isKho = h.name.includes("Kho") || h.name === "Nhà A"; 
                            const icon = isKho ? '<i class="fas fa-warehouse text-purple-600 mr-2"></i>' : '';
                            const statusLabel = isKho ? 'KHO PHÔI' : (h.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'NHÀ TRỐNG');
                            const statusColor = isKho ? 'bg-purple-100 text-purple-700' : (h.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500');

                            let daysRun = 0;
                            if(h.status === 'ACTIVE' && h.startDate) {
                                daysRun = Math.floor((new Date() - new Date(h.startDate)) / (86400000));
                            }

                            return `
                            <div class="glass p-4 border-l-4 ${h.status === 'ACTIVE' ? 'border-green-500' : (isKho ? 'border-purple-500' : 'border-slate-300')} relative animate-pop">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700 flex items-center">${icon} ${h.name}</span>
                                    <span class="text-[9px] font-bold px-2 py-1 rounded ${statusColor}">${statusLabel}</span>
                                </div>
                                
                                ${h.status === 'ACTIVE' ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Mã Lô</span>
                                            <span class="font-bold text-sm text-slate-800">${h.currentBatch}</span>
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Số Lượng</span>
                                            <span class="font-bold text-sm text-slate-800">${h.batchQty || 0}</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end-batch" data-id="${h.id}" data-name="${h.name}">KẾT THÚC</button>
                                        <div class="flex items-center justify-center flex-1 text-[10px] font-bold text-slate-400">Ngày thứ ${daysRun}</div>
                                    </div>
                                ` : `
                                    <button class="w-full py-3 ${isKho ? 'bg-purple-600 shadow-purple-200' : 'bg-blue-600 shadow-blue-200'} text-white rounded-xl font-bold shadow-lg btn-new-batch" data-id="${h.id}" data-name="${h.name}" data-iskho="${isKho}">
                                        <i class="fas fa-plus-circle"></i> ${isKho ? 'NHẬP KHO' : 'VÀO LÔ MỚI'}
                                    </button>
                                `}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;

        // --- GẮN SỰ KIỆN ---
        setTimeout(() => {
            // Nút Nhập Kho Phôi Tổng (Ở trên cùng)
            const btnImp = document.getElementById('btn-import-spawn');
            if(btnImp) {
                const newBtn = btnImp.cloneNode(true);
                btnImp.parentNode.replaceChild(newBtn, btnImp);
                newBtn.onclick = () => {
                    Utils.modal("Nhập Phôi Mới", 
                        `<input id="imp-code" placeholder="Mã phôi (VD: P_1205)" class="w-full p-2 border mb-2 uppercase font-bold">
                         <input id="imp-qty" type="number" placeholder="Số lượng" class="w-full p-2 border font-bold text-indigo-600">`,
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
                                Utils.modal(null); Utils.toast("✅ Đã nhập danh mục phôi!");
                            }
                        };
                    }, 100);
                };
            }

            // Nút Vào Lô / Nhập Kho Nhà A
            document.querySelectorAll('.btn-new-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    const isKho = newBtn.dataset.iskho === 'true';
                    const title = isKho ? `Nhập Phôi Vào: ${newBtn.dataset.name}` : `Vào Lô Mới: ${newBtn.dataset.name}`;
                    
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

            // Nút Kết Thúc
            document.querySelectorAll('.btn-end-batch').forEach(btn => {
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
