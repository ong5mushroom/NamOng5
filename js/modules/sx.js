// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if(c.classList.contains('hidden')) return;

        const inventory = data.spawn_inventory || [];
        const houses = data.houses || [];
        
        // Sắp xếp kho phôi
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase text-xs">KHO PHÔI GIỐNG</h3>
                        <button id="btn-import-spawn" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-xs shadow-sm">+ Nhập Phôi</button>
                    </div>
                    <div class="max-h-40 overflow-y-auto space-y-2 pr-1">
                        ${sortedInv.length > 0 ? sortedInv.map(i => `
                            <div class="bg-white p-2 border rounded-lg flex justify-between text-xs items-center">
                                <div>
                                    <span class="font-bold text-slate-700 block">${i.code}</span>
                                    <span class="text-[9px] text-slate-400">${i.date}</span>
                                </div>
                                <span class="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">${i.qty}</span>
                            </div>
                        `).join('') : '<p class="text-center text-xs text-slate-400 italic">Kho đang trống</p>'}
                    </div>
                </div>

                <div>
                    <h3 class="font-black text-slate-500 uppercase text-xs mb-3 px-1">TIẾN ĐỘ SẢN XUẤT CÁC NHÀ</h3>
                    <div class="space-y-3">
                        ${houses.map(h => {
                            // Tính số ngày đã chạy
                            let daysRun = 0;
                            if(h.status === 'ACTIVE' && h.startDate) {
                                const start = new Date(h.startDate);
                                const now = new Date();
                                const diff = now - start;
                                daysRun = Math.floor(diff / (1000 * 60 * 60 * 24));
                            }

                            return `
                            <div class="glass p-4 border-l-4 ${h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300'} relative animate-pop">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700">${h.name}</span>
                                    ${h.status === 'ACTIVE' 
                                        ? `<span class="text-[9px] font-bold px-2 py-1 rounded bg-green-100 text-green-700">ĐANG CHẠY: NGÀY ${daysRun}</span>`
                                        : `<span class="text-[9px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-500">NHÀ TRỐNG</span>`
                                    }
                                </div>
                                
                                ${h.status === 'ACTIVE' ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Mã Lô</span>
                                            <span class="font-bold text-sm text-slate-800">${h.currentBatch}</span>
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Số Lượng</span>
                                            <span class="font-bold text-sm text-slate-800">${h.batchQty || 0} bịch</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end-batch" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>
                                        <button class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold btn-view-log" data-id="${h.id}"><i class="fas fa-history"></i> NHẬT KÝ</button>
                                    </div>
                                ` : `
                                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 btn-new-batch" data-id="${h.id}" data-name="${h.name}">
                                        <i class="fas fa-plus-circle"></i> VÀO LÔ MỚI
                                    </button>
                                `}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        // --- GẮN SỰ KIỆN ---
        setTimeout(() => {
            // 1. Nhập Kho Phôi (Modal)
            const btnImp = document.getElementById('btn-import-spawn');
            if(btnImp) btnImp.onclick = () => {
                Utils.modal("Nhập Kho Phôi", 
                    `<input id="imp-code" placeholder="Mã lô phôi (VD: P_1205)" class="w-full p-2 border mb-2 uppercase font-bold">
                     <input id="imp-qty" type="number" placeholder="Số lượng nhập" class="w-full p-2 border font-bold text-indigo-600">`,
                    [{id:'save-imp', text:'Xác nhận Nhập', cls:'bg-indigo-600 text-white'}]
                );
                setTimeout(() => {
                    document.getElementById('save-imp').onclick = async () => {
                        const code = document.getElementById('imp-code').value;
                        const qty = Number(document.getElementById('imp-qty').value);
                        if(code && qty) {
                            Utils.toast("Đang lưu...");
                            await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {
                                code, qty, date: new Date().toISOString().split('T')[0], status: 'AVAILABLE'
                            });
                            Utils.modal(null); Utils.toast("✅ Đã nhập kho phôi!");
                        }
                    };
                }, 100);
            };

            // 2. Vào Lô Mới (Modal)
            document.querySelectorAll('.btn-new-batch').forEach(btn => {
                btn.onclick = () => {
                    Utils.modal(`Vào Lô: ${btn.dataset.name}`, 
                        `<input id="batch-code" placeholder="Mã Lô (VD: L1_1024)" class="w-full p-2 border mb-2 uppercase font-bold">
                         <div class="flex gap-2">
                             <input id="batch-qty" type="number" placeholder="Số lượng bịch" class="w-full p-2 border mb-2">
                             <input id="batch-date" type="date" class="w-full p-2 border mb-2" value="${new Date().toISOString().split('T')[0]}">
                         </div>
                         <textarea id="batch-note" placeholder="Ghi chú khởi tạo..." class="w-full p-2 border h-20"></textarea>`,
                        [{id:'confirm-new-batch', text:'Khởi Tạo Lô', cls:'bg-green-600 text-white'}]
                    );
                    
                    setTimeout(() => {
                        document.getElementById('confirm-new-batch').onclick = async () => {
                            const code = document.getElementById('batch-code').value;
                            const qty = document.getElementById('batch-qty').value;
                            const date = document.getElementById('batch-date').value;
                            
                            if(code && qty) {
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, btn.dataset.id), {
                                    status: 'ACTIVE',
                                    currentBatch: code,
                                    batchQty: Number(qty),
                                    startDate: date
                                });
                                Utils.modal(null); Utils.toast(`🎉 Đã khởi tạo lô ${code}`);
                            } else {
                                Utils.toast("Thiếu thông tin!", "err");
                            }
                        };
                    }, 100);
                }
            });

            // 3. Kết Thúc Lô (Confirm)
            document.querySelectorAll('.btn-end-batch').forEach(btn => {
                btn.onclick = () => {
                    if(confirm(`Bạn có chắc chắn muốn kết thúc lô tại ${btn.dataset.name}?`)) {
                        // Logic kết thúc lô: Cập nhật status về EMPTY
                        updateDoc(doc(db, `${ROOT_PATH}/houses`, btn.dataset.id), {
                            status: 'EMPTY',
                            currentBatch: '',
                            batchQty: 0,
                            startDate: ''
                        }).then(() => Utils.toast("Đã kết thúc lô. Nhà trống."));
                    }
                }
            });

        }, 0);
    }
};
