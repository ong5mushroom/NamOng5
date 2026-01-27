import { db, doc, updateDoc, addDoc, deleteDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        // --- FIX LỖI CRASH: Nếu data chưa tải xong, dừng ngay ---
        if (!data || !data.houses) {
            c.innerHTML = '<div class="text-center p-10 text-slate-400">Đang tải dữ liệu SX...</div>';
            return;
        }

        try {
            // Data Safe
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const inventory = Array.isArray(data.spawn_inventory) ? data.spawn_inventory : [];
            const isAdmin = user && ['Giám đốc', 'Quản lý'].includes(user.role);

            // Tìm Nhà A (Kho Tổng)
            const houseA = houses.find(h => h.name === 'Nhà A');
            const tonKhoA = houseA ? (Number(houseA.batchQty) || 0) : 0;
            const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

            c.innerHTML = `
            <div class="space-y-6 pb-24">
                <div class="glass p-5 border-l-4 border-purple-500">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-black text-purple-700 text-xs mb-1">KHO PHÔI GIỐNG (NHÀ A)</h3>
                            <div class="text-3xl font-black text-slate-700">${tonKhoA.toLocaleString()}</div>
                        </div>
                        <i class="fas fa-warehouse text-2xl text-purple-300"></i>
                    </div>
                    ${houseA ? `
                    <button id="btn-imp-a" class="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg" data-id="${houseA.id}" data-qty="${tonKhoA}">+ NHẬP PHÔI VÀO KHO A</button>
                    ` : '<div class="text-red-500 text-xs font-bold">Chưa tạo Nhà A</div>'}
                    
                    <div class="mt-4 pt-2 border-t border-slate-100">
                        <div class="flex justify-between mb-2"><span class="text-[10px] font-bold text-slate-400 uppercase">Lịch sử nhập</span><button id="btn-log-spawn" class="text-[9px] bg-slate-100 p-1 rounded">Sổ cái</button></div>
                        <div class="space-y-1 text-xs opacity-70">${sortedInv.slice(0,3).map(i=>`<div>${i.date}: ${i.code} (+${i.qty})</div>`).join('')}</div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-3 px-1">
                        <h3 class="font-bold text-slate-500 text-xs">CÁC NHÀ SẢN XUẤT</h3>
                        ${isAdmin ? '<button id="btn-add-house" class="bg-white border text-blue-600 px-3 py-1 rounded text-xs font-bold">+ Nhà</button>' : ''}
                    </div>
                    <div class="space-y-3">
                        ${houses.filter(h => h.name !== 'Nhà A').map(h => {
                            const active = h.status === 'ACTIVE';
                            return `
                            <div class="glass p-4 border-l-4 ${active?'border-green-500':'border-slate-300'}">
                                <div class="flex justify-between mb-2">
                                    <span class="font-black text-slate-700">${h.name}</span>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] px-2 py-1 rounded font-bold ${active?'bg-green-100 text-green-700':'bg-slate-100'}">${active?'RUN':'TRỐNG'}</span>
                                        ${isAdmin ? `<button class="text-red-400 btn-del" data-id="${h.id}"><i class="fas fa-trash"></i></button>` : ''}
                                    </div>
                                </div>
                                ${active ? 
                                    `<div class="grid grid-cols-2 gap-2 mb-3"><div class="bg-slate-50 p-2 rounded"><span class="text-[9px] text-slate-400 block">Lô</span><span class="font-bold text-sm">${h.currentBatch}</span></div><div class="bg-slate-50 p-2 rounded"><span class="text-[9px] text-slate-400 block">SL</span><span class="font-bold text-sm">${h.batchQty}</span></div></div><button class="w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold btn-end" data-id="${h.id}" data-name="${h.name}">KẾT THÚC LÔ</button>` : 
                                    `<button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg btn-start" data-id="${h.id}" data-name="${h.name}">LẤY TỪ KHO A</button>`
                                }
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;

            // EVENTS (Viết gọn để tránh lỗi cú pháp)
            setTimeout(() => {
                const btnAdd = document.getElementById('btn-add-house');
                if(btnAdd) {
                    const n = btnAdd.cloneNode(true); btnAdd.parentNode.replaceChild(n, btnAdd);
                    n.onclick = () => { Utils.modal("Thêm Nhà", `<input id="n-h" class="w-full p-2 border mb-2" placeholder="Tên Nhà">`, [{id:'s-h', text:'Lưu'}]); setTimeout(()=>document.getElementById('s-h').onclick=async()=>{const v=document.getElementById('n-h').value; if(v){await addDoc(collection(db, `${ROOT_PATH}/houses`),{name:v, status:'EMPTY', created:Date.now()}); Utils.modal(null);} },100); }
                }

                const btnImpA = document.getElementById('btn-import-a');
                if(btnImpA) {
                    const n = btnImpA.cloneNode(true); btnImpA.parentNode.replaceChild(n, btnImpA);
                    n.onclick = () => {
                        Utils.modal("Nhập Kho A", `<input id="i-c" placeholder="Tên Giống" class="w-full p-2 border mb-2"><input id="i-d" type="date" class="w-full p-2 border mb-2"><input id="i-q" type="number" placeholder="Số lượng" class="w-full p-2 border font-bold">`, [{id:'s-i', text:'Lưu', cls:'bg-purple-600 text-white'}]);
                        setTimeout(()=>document.getElementById('s-i').onclick=async()=>{
                            const c=document.getElementById('i-c').value, d=document.getElementById('i-d').value, q=Number(document.getElementById('i-q').value);
                            if(c&&d&&q){
                                await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {code:c, date:d, qty:q, inputDate:new Date().toISOString()});
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), {batchQty: tonKhoA+q});
                                Utils.modal(null); Utils.toast("Đã nhập kho A");
                            }
                        },100);
                    }
                }

                document.querySelectorAll('.btn-start').forEach(b => {
                    b.onclick = () => {
                        if(tonKhoA <= 0) return Utils.toast("Kho A hết hàng!", "err");
                        Utils.modal(`Lấy cho ${b.dataset.name}`, `<div class="mb-2 text-xs">Kho A còn: ${tonKhoA}</div><input id="t-q" type="number" placeholder="SL lấy" class="w-full p-2 border mb-2"><input id="t-d" type="date" class="w-full p-2 border">`, [{id:'s-t', text:'Xác nhận'}]);
                        setTimeout(()=>document.getElementById('s-t').onclick=async()=>{
                            const q=Number(document.getElementById('t-q').value), d=document.getElementById('t-d').value;
                            if(q>0 && q<=tonKhoA && d) {
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseA.id), {batchQty: tonKhoA-q});
                                await updateDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id), {status:'ACTIVE', currentBatch:'Từ Kho A', batchQty:q, startDate:d});
                                Utils.modal(null); Utils.toast("Đã chuyển!");
                            }
                        },100);
                    }
                });

                document.querySelectorAll('.btn-end').forEach(b => b.onclick = () => { if(confirm("Kết thúc lô?")) updateDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id), {status:'EMPTY', batchQty:0, currentBatch:''}); });
                document.querySelectorAll('.btn-del').forEach(b => b.onclick = () => { if(confirm("Xóa nhà?")) deleteDoc(doc(db, `${ROOT_PATH}/houses`, b.dataset.id)); });
                
                // Nút sổ cái (ghi lẻ)
                const btnLog = document.getElementById('btn-import-spawn');
                if(btnLog) btnLog.onclick = () => { Utils.modal("Ghi Sổ Lẻ", `<input id="l-c" placeholder="Mã" class="w-full p-2 border mb-2"><input id="l-q" type="number" placeholder="SL" class="w-full p-2 border">`, [{id:'s-l', text:'Lưu'}]); setTimeout(()=>document.getElementById('s-l').onclick=async()=>{const c=document.getElementById('l-c').value, q=Number(document.getElementById('l-q').value); if(c&&q){await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {code:c, qty:q, date:new Date().toISOString()}); Utils.modal(null);}},100); }

            }, 100);

        } catch (e) {
            c.innerHTML = `<div class="text-red-500 p-10 text-center">Lỗi hiển thị SX: ${e.message}</div>`;
        }
    }
};
