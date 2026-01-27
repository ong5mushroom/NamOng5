import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // Data Safe
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
        
        // Kiểm tra quyền: Chỉ Admin/Quản lý/Giám đốc mới có quyền Xóa
        const isAdmin = user && ['Admin', 'Quản lý', 'Giám đốc'].some(role => user.role.includes(role));

        // Tìm Nhà A (Kho Tổng)
        const houseA = houses.find(h => h.name === 'Nhà A');
        const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-purple-500 relative overflow-hidden bg-white shadow-md">
                    <div class="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 class="font-black text-purple-700 uppercase text-xs mb-1">KHO PHÔI GIỐNG (NHÀ A)</h3>
                            <div class="text-3xl font-black text-slate-700">${tonKhoA.toLocaleString()} <span class="text-sm text-slate-400 font-normal">bịch</span></div>
                        </div>
                        <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><i class="fas fa-warehouse text-xl"></i></div>
                    </div>
                    ${houseA ? `
                    <button id="btn-import-a" class="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition relative z-10" data-id="${houseA.id}" data-qty="${tonKhoA}">
                        <i class="fas fa-plus-circle mr-1"></i> NHẬP PHÔI VÀO KHO A
                    </button>` : '<div class="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">Chưa tạo Nhà A</div>'}
                </div>

                <div>
                    <div class="flex justify-between items-center px-1 mb-3">
                        <h3 class="font-black text-slate-500 uppercase text-xs">CÁC NHÀ SẢN XUẤT</h3>
                        ${isAdmin ? '<button id="btn-add-house-sx" class="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition"><i class="fas fa-plus"></i> Thêm Nhà</button>' : ''}
                    </div>

                    <div class="space-y-3">
                        ${houses.filter(h => h.name !== 'Nhà A').map(h => {
                            const isActive = h.status === 'ACTIVE';
                            return `
                            <div class="glass p-4 border-l-4 ${isActive ? 'border-green-500' : 'border-slate-300'} relative animate-pop bg-white shadow-sm">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-black text-lg text-slate-700 flex items-center gap-2"><i class="fas fa-home text-slate-400"></i> ${h.name}</span>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] font-bold px-2 py-1 rounded ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${isActive ? 'ĐANG CHẠY' : 'TRỐNG'}</span>
                                        
                                        ${isAdmin ? `<button class="w-7 h-7 rounded bg-red-50 text-red-500 flex items-center justify-center btn-del-house active:scale-90 transition border border-red-100 shadow-sm" data-id="${h.id}" data-name="${h.name}"><i class="fas fa-trash-alt text-xs"></i></button>` : ''}
                                    </div>
                                </div>
                                
                                ${isActive ? `
                                    <div class="grid grid-cols-2 gap-2 mb-3">
                                        <div class="bg-slate-50 p-2 rounded border"><span class="text-[9px] text-slate-400 uppercase block">Lô SX</span><span class="font-bold text-sm text-slate-800 truncate">${h.currentBatch || '-'}</span></div>
                                        <div class="bg-slate-50 p-2 rounded border"><span class="text-[9px] text-slate-400 uppercase block">Số Lượng</span><span class="font-bold text-sm text-slate-800">${h.batchQty || 0}</span></div>
                                    </div>
                                    <button class="w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end active:scale-95 transition" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>
                                ` : `
                                    <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 btn-start-batch active:scale-95 transition" data-id="${h.id}" data-name="${h.name}"><i class="fas fa-box-open mr-1"></i> LẤY TỪ KHO A</button>
                                `}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;

        // 2. GẮN SỰ KIỆN
        setTimeout(() => {
            // ... (Giữ nguyên các sự kiện thêm nhà, nhập kho...) 
            // Tôi chỉ viết lại phần Xóa Nhà ở đây cho gọn
            const btnAdd = document.getElementById('btn-add-house-sx');
            if(btnAdd) {
                const newBtn = btnAdd.cloneNode(true);
                btnAdd.parentNode.replaceChild(newBtn, btnAdd);
                newBtn.onclick = () => {
                    Utils.modal("Thêm Nhà Mới", `<input id="n-h" class="w-full p-3 border rounded-xl mb-2 font-bold uppercase" placeholder="Tên Nhà (VD: Nhà 1)">`, [{id:'s-h', text:'Tạo Ngay'}]);
                    setTimeout(()=>document.getElementById('s-h').onclick=async()=>{
                        const val = document.getElementById('n-h').value.trim();
                        if(val) { await addDoc(collection(db, `${ROOT_PATH}/houses`), {name:val, status:'EMPTY', created:Date.now()}); Utils.modal(null); Utils.toast("Đã thêm nhà!"); }
                    },100);
                }
            }

            // Sự kiện XÓA NHÀ
            document.querySelectorAll('.btn-del-house').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = () => {
                    if(confirm(`⚠ CẢNH BÁO NGUY HIỂM:\n\nBạn có chắc chắn muốn xóa vĩnh viễn "${newBtn.dataset.name}"?\nDữ liệu đang chạy và lịch sử của nhà này sẽ bị mất!`)) {
                        deleteDoc(doc(db, `${ROOT_PATH}/houses`, newBtn.dataset.id))
                            .then(() => Utils.toast("Đã xóa nhà thành công!"))
                            .catch(e => Utils.toast("Lỗi khi xóa!", "err"));
                    }
                }
            });

            // ... (Các sự kiện khác giữ nguyên)
            
            // Re-bind import/export events (copy lại từ code sx.js trước để đảm bảo tính năng chạy)
            const btnImpA = document.getElementById('btn-import-a');
            if(btnImpA) {
                const n = btnImpA.cloneNode(true); btnImpA.parentNode.replaceChild(n, btnImpA);
                n.onclick = () => {
                    Utils.modal("NHẬP KHO A", `<label class="text-[10px] font-bold text-slate-500 uppercase">Tên Giống</label><input id="i-c" class="w-full p-2 border rounded-lg mb-2 font-bold"><label class="text-[10px] font-bold text-slate-500 uppercase">Ngày Cấy</label><input id="i-d" type="date" class="w-full p-2 border rounded-lg mb-2"><label class="text-[10px] font-bold text-slate-500 uppercase">Số Lượng</label><input id="i-q" type="number" class="w-full p-2 border rounded-lg font-bold text-purple-600 text-lg" placeholder="0">`, [{id:'s-i', text:'XÁC NHẬN NHẬP', cls:'bg-purple-600 text-white'}]);
                    setTimeout(()=>document.getElementById('s-i').onclick=async()=>{
                        const c=document.getElementById('i-c').value, d=document.getElementById('i-d').value, q=Number(document.getElementById('i-q').value);
                        if(c&&d&&q) {
                            await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {strain:c, code:c, date:d, qty:q, inputDate:new Date().toISOString()});
                            const curQty = Number(btnImpA.dataset.qty) || 0;
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), {batchQty: curQty + q});
                            Utils.modal(null); Utils.toast(`Đã nhập ${q} bịch vào Kho A`);
                        } else Utils.toast("Thiếu thông tin!", "err");
                    },100);
                }
            }
            
            document.querySelectorAll('.btn-start-batch').forEach(b => {
                b.onclick = () => {
                    if(tonKhoA <= 0) return Utils.toast("Kho A hết hàng!", "err");
                    Utils.modal(`Cấp cho ${b.dataset.name}`, `<div class="mb-2 text-xs bg-purple-50 p-2 rounded text-purple-700 font-bold border border-purple-100">Kho A còn: ${tonKhoA.toLocaleString()} bịch</div><input id="t-q" type="number" placeholder="Số lượng lấy" class="w-full p-3 border rounded-xl mb-2 font-bold"><input id="t-d" type="date" class="w-full p-3 border rounded-xl">`, [{id:'s-t', text:'XUẤT KHO A -> VÀO LÔ'}]);
                    setTimeout(()=>document.getElementById('s-t').onclick=async()=>{
                        const q=Number(document.getElementById('t-q').value), d=document.getElementById('t-d').value;
                        if(q>0 && q<=tonKhoA && d) {
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), {batchQty: tonKhoA-q});
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id), {status:'ACTIVE', currentBatch:'Từ Kho A', batchQty:q, startDate:d});
                            Utils.modal(null); Utils.toast("Đã chuyển thành công!");
                        } else Utils.toast("Số lượng không hợp lệ!", "err");
                    },100);
                }
            });
            document.querySelectorAll('.btn-end').forEach(b => b.onclick = () => { if(confirm("Kết thúc lô này?")) updateDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id), {status:'EMPTY', batchQty:0, currentBatch:''}); });

        }, 200);
    }
};
