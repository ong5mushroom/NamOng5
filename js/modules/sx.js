// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // 1. DATA SAFE
        const houses = Array.isArray(data.houses) ? data.houses : [];
        
        // Tìm Nhà A (Kho Tổng)
        const houseA = houses.find(h => h.name === 'Nhà A') || { batchQty: 0, id: null };
        const tonKhoA = Number(houseA.batchQty) || 0;

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="flex justify-between items-center px-1">
                    <h3 class="font-black text-slate-500 uppercase text-xs">QUẢN LÝ SẢN XUẤT</h3>
                    <button id="btn-add-house-sx" class="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition">
                        <i class="fas fa-plus"></i> Thêm Nhà
                    </button>
                </div>

                <div class="space-y-3">
                    ${houses.map(h => {
                        // LOGIC CỐT LÕI: Nhà A là Kho Tổng
                        const isKhoTong = h.name === 'Nhà A';
                        
                        // Màu sắc phân biệt
                        const borderColor = isKhoTong ? 'border-purple-500' : (h.status === 'ACTIVE' ? 'border-green-500' : 'border-slate-300');
                        const icon = isKhoTong ? '<i class="fas fa-warehouse text-purple-600 mr-2"></i>' : '<i class="fas fa-home text-slate-500 mr-2"></i>';
                        
                        // Nhãn trạng thái
                        let statusHTML = '';
                        if (isKhoTong) {
                            statusHTML = `<span class="text-[9px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">KHO TỔNG</span>`;
                        } else {
                            statusHTML = h.status === 'ACTIVE' 
                                ? `<span class="text-[9px] font-bold px-2 py-1 rounded bg-green-100 text-green-700">ĐANG CHẠY</span>`
                                : `<span class="text-[9px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-500">TRỐNG</span>`;
                        }

                        return `
                        <div class="glass p-4 border-l-4 ${borderColor} relative animate-pop">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-black text-lg text-slate-700 flex items-center">${icon} ${h.name}</span>
                                ${statusHTML}
                            </div>
                            
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
                                        <i class="fas fa-plus-circle"></i> NHẬP HÀNG MỚI
                                    </button>
                                ` : (h.status === 'ACTIVE' ? `
                                    <button class="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>
                                    <div class="flex items-center justify-center flex-1 text-[10px] font-bold text-slate-400">
                                        ${h.startDate ? Math.floor((new Date() - new Date(h.startDate))/86400000) + ' ngày' : ''}
                                    </div>
                                ` : `
                                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 btn-start-batch" data-id="${h.id}" data-name="${h.name}">
                                        <i class="fas fa-box-open"></i> LẤY TỪ KHO A
                                    </button>
                                `)}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

        // 2. GẮN SỰ KIỆN
        setTimeout(() => {
            // A. THÊM NHÀ (Khôi phục)
            const btnAddHouse = document.getElementById('btn-add-house-sx');
            if(btnAddHouse) {
                const newBtn = btnAddHouse.cloneNode(true);
                btnAddHouse.parentNode.replaceChild(newBtn, btnAddHouse);
                newBtn.onclick = () => {
                    Utils.modal("Thêm Nhà Mới", `<input id="new-house-name" placeholder="Tên Nhà (VD: Nhà B)" class="w-full p-2 border rounded font-bold uppercase">`, [{id:'confirm-add', text:'Thêm'}]);
                    setTimeout(() => document.getElementById('confirm-add').onclick = async () => {
                        const name = document.getElementById('new-house-name').value;
                        if(name) {
                            await addDoc(collection(db, `${ROOT_PATH}/houses`), { name, status: 'EMPTY', created: Date.now() });
                            Utils.modal(null); Utils.toast("Đã thêm nhà mới");
                        }
                    }, 100);
                }
            }

            // B. NHÀ A NHẬP MỚI
            document.querySelectorAll('.btn-import-a').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    Utils.modal("Nhà A: Nhập Hàng Mới", 
                        `<input id="batch-code" placeholder="Mã Lô (VD: P01)" class="w-full p-2 border mb-2 uppercase font-bold">
                         <input id="batch-qty" type="number" placeholder="Số lượng nhập thêm" class="w-full p-2 border font-bold">`,
                        [{id:'confirm-imp-a', text:'Nhập Kho', cls:'bg-purple-600 text-white'}]
                    );
                    setTimeout(() => document.getElementById('confirm-imp-a').onclick = async () => {
                        const code = document.getElementById('batch-code').value;
                        const qty = Number(document.getElementById('batch-qty').value);
                        if(code && qty) {
                            // Cộng dồn vào tồn kho hiện tại của A
                            const currentQty = Number(newBtn.dataset.qty) || 0;
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                                status: 'ACTIVE', currentBatch: code, batchQty: currentQty + qty
                            });
                            Utils.modal(null); Utils.toast(`Đã nhập thêm ${qty} vào Nhà A`);
                        }
                    }, 100);
                }
            });

            // C. CÁC NHÀ KHÁC: LẤY TỪ A
            document.querySelectorAll('.btn-start-batch').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    // Kiểm tra tồn kho A
                    if(tonKhoA <= 0) return Utils.toast("Kho A đã hết hàng!", "err");

                    Utils.modal(`Cấp Phôi Cho: ${newBtn.dataset.name}`, 
                        `<div class="bg-purple-50 p-2 rounded mb-2 text-xs text-purple-700 font-bold">Kho A đang có: ${tonKhoA}</div>
                         <input id="batch-qty" type="number" placeholder="Số lượng lấy" class="w-full p-2 border mb-2">
                         <input id="batch-date" type="date" class="w-full p-2 border" value="${new Date().toISOString().split('T')[0]}">`,
                        [{id:'confirm-take', text:'Xuất Kho A -> Vào Lô', cls:'bg-blue-600 text-white'}]
                    );

                    setTimeout(() => document.getElementById('confirm-take').onclick = async () => {
                        const qty = Number(document.getElementById('batch-qty').value);
                        const date = document.getElementById('batch-date').value;
                        
                        if(!qty || qty <= 0) return Utils.toast("Số lượng không hợp lệ", "err");
                        if(qty > tonKhoA) return Utils.toast("Kho A không đủ hàng!", "err");

                        // 1. Trừ Kho A
                        await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: tonKhoA - qty });
                        
                        // 2. Cộng vào Nhà Con
                        await updateDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id), {
                            status: 'ACTIVE', currentBatch: `Từ A (${houseA.currentBatch})`, batchQty: qty, startDate: date
                        });

                        Utils.modal(null); Utils.toast(`Đã chuyển ${qty} từ A sang ${newBtn.dataset.name}`);
                    }, 100);
                }
            });

            // D. KẾT THÚC LÔ
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
