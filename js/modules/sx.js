import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        
        // Tìm Nhà A (Kho Tổng)
        const houseA = houses.find(h => h.name === 'Nhà A');
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;

        // Sắp xếp lịch sử nhập
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-purple-500 relative overflow-hidden">
                    <div class="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 class="font-black text-purple-700 uppercase text-xs mb-1">KHO PHÔI GIỐNG (NHÀ A)</h3>
                            <div class="text-3xl font-black text-slate-700">${tonKhoA.toLocaleString()} <span class="text-sm text-slate-400 font-normal">bịch</span></div>
                        </div>
                        <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <i class="fas fa-warehouse text-xl"></i>
                        </div>
                    </div>
                    
                    ${houseA ? `
                    <button id="btn-import-a" class="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition relative z-10" data-id="${houseA.id}" data-qty="${tonKhoA}">
                        <i class="fas fa-plus-circle mr-1"></i> NHẬP PHÔI VÀO KHO A
                    </button>` : '<div class="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">Chưa có Nhà A. Hãy thêm nhà tên "Nhà A".</div>'}
                </div>

                <div>
                    <div class="flex justify-between items-center px-1 mb-3">
                        <h3 class="font-black text-slate-500 uppercase text-xs">CÁC NHÀ SẢN XUẤT</h3>
                        <button id="btn-add-house-sx" class="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition">
                            <i class="fas fa-plus"></i> Thêm Nhà
                        </button>
                    </div>

                    <div class="space-y-3">
                        ${houses.filter(h => h.name !== 'Nhà A').map(h => {
                            const isActive = h.status === 'ACTIVE';
                            return `
                            <div class="glass p-4 border-l-4 ${isActive ? 'border-green-500' : 'border-slate-300'} relative animate-pop group">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700 flex items-center gap-2">
                                        <i class="fas fa-home text-slate-400"></i> ${h.name}
                                    </span>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] font-bold px-2 py-1 rounded ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
                                            ${isActive ? 'ĐANG CHẠY' : 'TRỐNG'}
                                        </span>
                                        <button class="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center btn-del-house active:scale-90 transition" data-id="${h.id}" data-name="${h.name}"><i class="fas fa-trash-alt text-[10px]"></i></button>
                                    </div>
                                </div>
                                
                                ${isActive ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Lô SX</span>
                                            <span class="font-bold text-sm text-slate-800 truncate">${h.currentBatch || '-'}</span>
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded border">
                                            <span class="text-[9px] text-slate-400 uppercase block">Số Lượng</span>
                                            <span class="font-bold text-sm text-slate-800">${h.batchQty || 0}</span>
                                        </div>
                                    </div>
                                    <button class="w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end active:scale-95 transition" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>
                                ` : `
                                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 btn-start-batch active:scale-95 transition" data-id="${h.id}" data-name="${h.name}">
                                        <i class="fas fa-box-open"></i> LẤY TỪ KHO A
                                    </button>
                                `}
                            </div>`;
                        }).join('')}
                    </div>
                    
                    <div class="mt-6 px-1 border-t pt-4">
                        <h3 class="font-black text-slate-400 uppercase text-[10px] mb-2">Lịch sử nhập Kho A gần đây</h3>
                        <div class="space-y-2 opacity-80 text-xs">
                            ${sortedInv.slice(0, 5).map(i => `
                                <div class="flex justify-between border-b border-slate-200 pb-1">
                                    <span>${i.date}: ${i.strain || i.code}</span>
                                    <span class="font-bold text-slate-700">+${i.qty}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`;

        // 2. GẮN SỰ KIỆN
        setTimeout(() => {
            // A. THÊM NHÀ
            const btnAdd = document.getElementById('btn-add-house-sx');
            if(btnAdd) {
                const newBtn = btnAdd.cloneNode(true);
                btnAdd.parentNode.replaceChild(newBtn, btnAdd);
                newBtn.onclick = () => {
                    Utils.modal("Thêm Nhà Mới", 
                        `<input id="new-house-name" placeholder="Tên Nhà (VD: Nhà 1)" class="w-full p-2 border rounded font-bold uppercase">
                         <p class="text-[10px] text-slate-400 italic mt-1">* Lưu ý: Chỉ tạo tên "Nhà A" một lần duy nhất làm Kho Tổng.</p>`, 
                        [{id:'confirm-add', text:'Tạo Ngay', cls:'bg-blue-600 text-white'}]
                    );
                    setTimeout(() => document.getElementById('confirm-add').onclick = async () => {
                        const name = document.getElementById('new-house-name').value.trim();
                        if(name) {
                            await addDoc(collection(db, `${ROOT_PATH}/houses`), { name, status: 'EMPTY', created: Date.now() });
                            Utils.modal(null); Utils.toast(`Đã thêm ${name}`);
                        }
                    }, 100);
                }
            }

            // B. XÓA NHÀ
            document.querySelectorAll('.btn-del-house').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    if(confirm(`Xóa vĩnh viễn ${newBtn.dataset.name}?`)) {
                        deleteDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id));
                    }
                }
            });

            // C. NHẬP KHO A
            const btnImportA = document.getElementById('btn-import-a');
            if(btnImportA) {
                const newBtn = btnImportA.cloneNode(true);
                btnImportA.parentNode.replaceChild(newBtn, btnImportA);
                newBtn.onclick = () => {
                    Utils.modal("NHẬP PHÔI VÀO KHO A", 
                        `
                        <label class="text-[10px] font-bold text-slate-500 uppercase">Tên Giống / Mã Lô</label>
                        <input id="batch-strain" placeholder="VD: Nấm Mỡ Thái - Lô 01" class="w-full p-3 border rounded-xl mb-2 font-bold text-slate-700">
                        <label class="text-[10px] font-bold text-slate-500 uppercase">Ngày Cấy Giống</label>
                        <input id="batch-date" type="date" class="w-full p-3 border rounded-xl mb-2 font-bold text-slate-700">
                        <label class="text-[10px] font-bold text-slate-500 uppercase">Số Lượng (Bịch)</label>
                        <input id="batch-qty" type="number" placeholder="0" class="w-full p-3 border rounded-xl font-bold text-lg text-purple-600">
                        `,
                        [{id:'confirm-imp-a', text:'LƯU VÀO KHO A', cls:'bg-purple-600 text-white'}]
                    );
                    
                    setTimeout(() => document.getElementById('confirm-imp-a').onclick = async () => {
                        const strain = document.getElementById('batch-strain').value;
                        const date = document.getElementById('batch-date').value;
                        const qty = Number(document.getElementById('batch-qty').value);
                        
                        if(!strain || !date || !qty) return Utils.toast("Thiếu thông tin!", "err");

                        // Lưu log
                        await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {
                            code: strain, strain: strain, date: date, qty: qty,
                            inputDate: new Date().toISOString().split('T')[0], status: 'AVAILABLE'
                        });

                        // Cộng Kho A
                        const currentQty = Number(newBtn.dataset.qty) || 0;
                        await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            batchQty: currentQty + qty, lastImport: Date.now()
                        });

                        Utils.modal(null); Utils.toast(`Đã nhập ${qty} bịch vào Kho A`);
                    }, 100);
                }
            }

            // D. XUẤT KHO A -> NHÀ CON
            document.querySelectorAll('.btn-start-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    if(tonKhoA <= 0) return Utils.toast("Kho A đang hết hàng!", "err");

                    Utils.modal(`Lấy Phôi Cho: ${newBtn.dataset.name}`, 
                        `<div class="bg-purple-50 p-2 rounded mb-2 text-xs text-purple-700 font-bold">Kho A còn: ${tonKhoA} bịch</div>
                         <input id="take-qty" type="number" placeholder="Số lượng lấy" class="w-full p-2 border mb-2 font-bold">
                         <input id="take-date" type="date" class="w-full p-2 border" value="${new Date().toISOString().split('T')[0]}">`,
                        [{id:'confirm-take', text:'Xuất Kho A -> Vào Lô', cls:'bg-blue-600 text-white'}]
                    );

                    setTimeout(() => document.getElementById('confirm-take').onclick = async () => {
                        const qty = Number(document.getElementById('take-qty').value);
                        const date = document.getElementById('take-date').value;
                        
                        if(!qty || qty <= 0) return Utils.toast("Số lượng lỗi", "err");
                        if(qty > tonKhoA) return Utils.toast(`Kho A không đủ! (Còn ${tonKhoA})`, "err");

                        // Trừ Kho A
                        if(houseA) await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - qty });
                        
                        // Cộng Nhà Con
                        await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'ACTIVE', currentBatch: `Lô từ Kho A`, batchQty: qty, startDate: date
                        });

                        Utils.modal(null); Utils.toast(`Đã chuyển ${qty} sang ${newBtn.dataset.name}`);
                    }, 100);
                }
            });

            // E. KẾT THÚC LÔ
            document.querySelectorAll('.btn-end').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    if(confirm(`Kết thúc lô tại ${newBtn.dataset.name}?`)) {
                        updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'EMPTY', currentBatch: '', batchQty: 0, startDate: ''
                        });
                    }
                }
            });

        }, 100);

        } catch (e) { c.innerHTML = `<div class="p-10 text-red-500">Lỗi SX: ${e.message}</div>`; }
    }
};
