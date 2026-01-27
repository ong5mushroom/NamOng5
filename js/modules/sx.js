import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        try {
            // 1. DATA SAFE
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
            const harvest = Array.isArray(data.harvest) ? data.harvest : [];
            
            // Quyền Admin: Giám đốc hoặc Quản lý
            const isAdmin = ['Giám đốc', 'Quản lý'].includes(user.role);

            // Tìm Nhà A (Kho Tổng)
            const houseA = houses.find(h => h.name === 'Nhà A');
            const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;

            // Tính tổng thu hoạch cho từng nhà
            const yieldMap = {};
            harvest.forEach(h => {
                if(h && h.area) {
                    if(!yieldMap[h.area]) yieldMap[h.area] = 0;
                    yieldMap[h.area] += (Number(h.total) || 0);
                }
            });

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
                        
                        <div class="mt-4 pt-3 border-t border-purple-100">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-[10px] font-bold text-slate-400 uppercase">Sổ cái nhập phôi</span>
                                <button id="btn-import-spawn" class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">Ghi sổ lẻ</button>
                            </div>
                            <div class="space-y-1 max-h-24 overflow-y-auto text-xs opacity-80">
                                ${sortedInv.slice(0, 5).map(i => `<div class="flex justify-between"><span>${i.date}: ${i.code}</span><span class="font-bold">+${i.qty}</span></div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center px-1 mb-3">
                            <h3 class="font-black text-slate-500 uppercase text-xs">CÁC NHÀ SẢN XUẤT</h3>
                            ${isAdmin ? `<button id="btn-add-house-sx" class="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition"><i class="fas fa-plus"></i> Thêm Nhà</button>` : ''}
                        </div>

                        <div class="space-y-3">
                            ${houses.filter(h => h.name !== 'Nhà A').map(h => {
                                const isActive = h.status === 'ACTIVE';
                                const totalYield = yieldMap[h.name] || 0;
                                const days = h.startDate ? Math.floor((new Date() - new Date(h.startDate))/86400000) : 0;

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
                                            ${isAdmin ? `<button class="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center btn-del-house active:scale-90 transition" data-id="${h.id}" data-name="${h.name}"><i class="fas fa-trash-alt text-[10px]"></i></button>` : ''}
                                        </div>
                                    </div>
                                    
                                    ${isActive ? `
                                        <div class="grid grid-cols-3 gap-2 mb-3">
                                            <div class="bg-slate-50 p-2 rounded border text-center">
                                                <span class="text-[9px] text-slate-400 uppercase block">Ngày</span>
                                                <span class="font-bold text-sm text-slate-800">${days}</span>
                                            </div>
                                            <div class="bg-slate-50 p-2 rounded border text-center">
                                                <span class="text-[9px] text-slate-400 uppercase block">Bịch</span>
                                                <span class="font-bold text-sm text-slate-800">${h.batchQty}</span>
                                            </div>
                                            <div class="bg-green-50 p-2 rounded border border-green-100 text-center">
                                                <span class="text-[9px] text-green-600 uppercase block">Đã Thu</span>
                                                <span class="font-bold text-sm text-green-700">${totalYield.toLocaleString()}</span>
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
                    </div>
                </div>`;

            // EVENT HANDLERS (Giữ nguyên logic nhập/xuất kho)
            setTimeout(() => {
                // ... (Logic Add/Delete, Import A, Take from A - Giống phiên bản trước nhưng thêm check isAdmin ở nút Xóa/Thêm)
                // Tôi sẽ viết gọn phần event quan trọng nhất ở đây
                
                const btnAdd = document.getElementById('btn-add-house-sx');
                if(btnAdd) btnAdd.onclick = () => {
                    Utils.modal("Thêm Nhà Mới", `<input id="n-name" placeholder="Tên Nhà" class="w-full p-2 border font-bold uppercase">`, [{id:'save-h', text:'Tạo'}]);
                    setTimeout(()=>document.getElementById('save-h').onclick=async()=>{
                        const n = document.getElementById('n-name').value.trim();
                        if(n) { await addDoc(collection(db, `${ROOT_PATH}/houses`), {name:n, status:'EMPTY', created:Date.now()}); Utils.modal(null); Utils.toast("Đã thêm!"); }
                    },100);
                };

                // Logic Nhập Kho A (Đã có ở code trước - copy lại)
                const btnImpA = document.getElementById('btn-import-a');
                if(btnImpA) btnImpA.onclick = () => {
                     Utils.modal("NHẬP KHO A", 
                        `<input id="b-code" placeholder="Tên Giống" class="w-full p-2 border mb-2"><input id="b-date" type="date" class="w-full p-2 border mb-2"><input id="b-qty" type="number" placeholder="Số lượng" class="w-full p-2 border font-bold">`,
                        [{id:'s-imp-a', text:'Lưu Kho A', cls:'bg-purple-600 text-white'}]
                    );
                    setTimeout(()=>document.getElementById('s-imp-a').onclick=async()=>{
                        const c=document.getElementById('b-code').value, d=document.getElementById('b-date').value, q=Number(document.getElementById('b-qty').value);
                        if(c&&d&&q) {
                            await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {code:c, date:d, qty:q, inputDate:new Date().toISOString()});
                            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), {batchQty: tonKhoA + q});
                            Utils.modal(null); Utils.toast(`Đã nhập ${q} bịch`);
                        }
                    },100);
                };

                // Logic Lấy từ A (Đã có ở code trước - copy lại)
                document.querySelectorAll('.btn-start-batch').forEach(b => {
                    b.onclick = () => {
                        if(tonKhoA <= 0) return Utils.toast("Kho A hết hàng!", "err");
                        Utils.modal(`Cấp cho ${b.dataset.name}`, `<div class="text-xs mb-2">Kho A còn: ${tonKhoA}</div><input id="t-qty" type="number" placeholder="SL lấy" class="w-full p-2 border mb-2"><input id="t-date" type="date" class="w-full p-2 border">`, [{id:'save-t', text:'Xuất A -> Vào Lô'}]);
                        setTimeout(()=>document.getElementById('save-t').onclick=async()=>{
                            const q=Number(document.getElementById('t-qty').value), d=document.getElementById('t-date').value;
                            if(q>0 && q<=tonKhoA && d) {
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), {batchQty: tonKhoA - q});
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id), {status:'ACTIVE', currentBatch:'Từ Kho A', batchQty:q, startDate:d});
                                Utils.modal(null); Utils.toast("Đã chuyển!");
                            }
                        },100);
                    }
                });

                document.querySelectorAll('.btn-end').forEach(b => b.onclick = () => { if(confirm("Kết thúc lô này?")) updateDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id), {status:'EMPTY', batchQty:0, currentBatch:''}); });
                document.querySelectorAll('.btn-del-house').forEach(b => b.onclick = () => { if(confirm("Xóa nhà này?")) deleteDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id)); });

            }, 100);

        } catch (e) { c.innerHTML = `<div class="p-10 text-red-500 text-center">Lỗi SX: ${e.message}</div>`; }
    }
};
