import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.SX_Action = {
    // Xóa Log
    delLog: async (id, qty, houseId) => {
        if(confirm(`⚠️ Xóa lô ${qty} bịch? (Kho sẽ được trả lại)`)) {
            try {
                const batch = writeBatch(db);
                batch.delete(doc(db, `${ROOT_PATH}/supplies`, id));
                if(houseId) batch.update(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(-Number(qty)) });
                await batch.commit(); 
                Utils.toast("✅ Đã xóa!");
            } catch(e) { alert(e.message); }
        }
    },

    // 1. RESET TOÀN BỘ (Sửa lỗi vẫn còn mã lô)
    reset0: async (hid) => { 
        if(confirm("⚠️ CẢNH BÁO: Bạn muốn xóa trắng nhà này?\n(Số lượng = 0, Xóa mã lô, Tắt đèn)")) { 
            await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { 
                batchQty: 0,
                currentBatch: '', // Xóa sạch mã lô
                status: 'EMPTY'   // Chuyển về trạng thái Trống
            }); 
            Utils.toast("✅ Đã Reset sạch sẽ!"); 
        } 
    },

    // 2. SỬA SỐ LƯỢNG (Tự động tắt nếu về 0)
    adjust: async (hid, currentQty) => { 
        const v = prompt("Nhập số lượng (+/-):");
        if(v) { 
            const n = Number(v);
            const newQty = (currentQty || 0) + n;
            
            const updateData = { batchQty: increment(n) };
            
            // Nếu hết phôi -> Tự động OFF và xóa mã
            if (newQty <= 0) {
                updateData.status = 'EMPTY';
                updateData.currentBatch = '';
                updateData.batchQty = 0;
            } else {
                updateData.status = 'ACTIVE'; // Có phôi thì bật lên
            }

            await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), updateData); 
            Utils.toast("✅ Đã cập nhật!"); 
        } 
    },

    addHouse: async () => {
        const name = prompt("Tên nhà mới (VD: Nhà 5):");
        if(name) {
            await addDoc(collection(db, `${ROOT_PATH}/houses`), { name, status:'EMPTY', batchQty:0, currentBatch:'', startDate:Date.now() });
            Utils.toast("Đã thêm!");
        }
    }
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx'); if(!c || c.classList.contains('hidden')) return;
        
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const houses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        
        // Tìm Kho A
        const houseA = houses.find(h => ['nhà a','kho a', 'kho phôi'].includes((h.name||'').toLowerCase()));
        const logsA = supplies.filter(s => houseA && s.to === houseA.id).sort((a,b)=>b.time-a.time);
        const uniqueCodes = [...new Set(logsA.filter(l => l.type === 'IMPORT').map(l => l.code).filter(Boolean))];

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${houseA ? `
            <div class="bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-purple-800 text-sm uppercase"><i class="fas fa-warehouse"></i> ${houseA.name}</h3>
                    <div class="text-2xl font-black text-purple-700">${(houseA.batchQty||0).toLocaleString()}</div>
                </div>
                ${isAdmin ? `
                <div class="flex gap-2 justify-end mb-3">
                    <button onclick="window.SX_Action.reset0('${houseA.id}')" class="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">RESET</button>
                    <button onclick="window.SX_Action.adjust('${houseA.id}', ${houseA.batchQty||0})" class="text-[10px] bg-purple-100 text-purple-600 px-2 py-1 rounded font-bold">SỬA KHO</button>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <div class="bg-white p-2 rounded border border-purple-100">
                        <div class="text-[10px] font-bold text-purple-500 mb-1">NHẬP KHO</div>
                        <input id="i-name" placeholder="Tên giống (049)" class="w-full p-1 border rounded text-xs mb-1">
                        <input type="number" id="i-qty" placeholder="SL" class="w-full p-1 border rounded text-xs mb-1">
                        <input type="date" id="i-date" class="w-full p-1 border rounded text-xs mb-1">
                        <button id="btn-imp" class="w-full bg-purple-600 text-white text-xs font-bold py-1 rounded">+</button>
                    </div>
                    <div class="bg-white p-2 rounded border border-green-100">
                        <div class="text-[10px] font-bold text-green-500 mb-1">XUẤT KHO</div>
                        <select id="e-house" class="w-full p-1 border rounded text-xs mb-1"><option value="">-- Nhà --</option>${houses.filter(h=>h.id!==houseA.id).map(h=>`<option value="${h.id}">${h.name}</option>`).join('')}</select>
                        <select id="e-code" class="w-full p-1 border rounded text-xs mb-1"><option value="">-- Mã --</option>${uniqueCodes.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
                        <input type="number" id="e-qty" placeholder="SL" class="w-full p-1 border rounded text-xs mb-1">
                        <input type="date" id="e-date" class="w-full p-1 border rounded text-xs mb-1">
                        <button id="btn-exp" class="w-full bg-green-600 text-white text-xs font-bold py-1 rounded">-</button>
                    </div>
                </div>` : ''}
                <div class="max-h-32 overflow-y-auto bg-white p-2 rounded border border-purple-100 space-y-1">
                    ${logsA.map(l => `<div class="flex justify-between text-[10px] border-b border-dashed pb-1"><span>${l.code||'--'} (${new Date(l.time).toLocaleDateString('vi-VN')})</span><span class="font-bold ${l.qty>0?'text-purple-600':'text-red-500'}">${l.qty>0?'+':''}${l.qty} ${isAdmin&&l.type==='IMPORT'?`<button onclick="window.SX_Action.delLog('${l._id}',${l.qty},'${houseA.id}')" class="text-red-500 ml-1">x</button>`:''}</span></div>`).join('')}
                </div>
            </div>` : '<div class="text-center p-4 text-slate-400">Chưa có Nhà A</div>'}

            <div class="grid grid-cols-2 gap-3">
                ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                    const isActive = h.status === 'ACTIVE';
                    return `
                    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div class="absolute left-0 top-0 bottom-0 w-1 ${isActive ? 'bg-green-500' : 'bg-slate-300'}"></div>
                        <div class="pl-2">
                            <div class="font-bold text-slate-700 text-sm flex justify-between">
                                ${h.name}
                                ${isAdmin ? `<button onclick="window.SX_Action.adjust('${h.id}', ${h.batchQty||0})" class="text-[10px] text-blue-500"><i class="fas fa-pen"></i></button>` : ''}
                            </div>
                            <div class="text-[10px] text-slate-400 mt-1">Lô: <b>${h.currentBatch || '--'}</b></div>
                            <div class="text-right mt-2">
                                <span class="font-black text-lg ${isActive ? 'text-blue-600' : 'text-slate-300'}">${(h.batchQty||0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
                ${isAdmin ? `<button onclick="window.SX_Action.addHouse()" class="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-center text-blue-500 font-bold text-xs">+ THÊM NHÀ</button>` : ''}
            </div>
        </div>`;

        // Gắn sự kiện (Delay nhẹ để DOM render xong)
        setTimeout(() => {
            if(!houseA) return;
            const di=document.getElementById('i-date'); if(di) di.valueAsDate=new Date();
            const de=document.getElementById('e-date'); if(de) de.valueAsDate=new Date();

            const bImp = document.getElementById('btn-imp');
            if(bImp) bImp.onclick = async () => {
                const n=document.getElementById('i-name').value, q=Number(document.getElementById('i-qty').value), d=document.getElementById('i-date').value;
                if(n && q>0 && d) {
                    const code = `${n}-${new Date(d).getDate()}${new Date(d).getMonth()+1}${new Date(d).getFullYear()}`;
                    const batch = writeBatch(db);
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'IMPORT', to:houseA.id, code, qty:q, user:user.name, time:new Date(d).getTime() });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(q) });
                    await batch.commit(); Utils.toast(`Đã nhập ${code}`); document.getElementById('i-qty').value='';
                } else Utils.toast("Thiếu thông tin!", "err");
            };

            const bExp = document.getElementById('btn-exp');
            if(bExp) bExp.onclick = async () => {
                const hid=document.getElementById('e-house').value, c=document.getElementById('e-code').value, q=Number(document.getElementById('e-qty').value), d=document.getElementById('e-date').value;
                if(hid && c && q>0) {
                    if(q > houseA.batchQty) return Utils.toast("Không đủ kho!", "err");
                    const batch = writeBatch(db);
                    batch.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'EXPORT', from:houseA.id, to:hid, code:c, qty:q, user:user.name, time:new Date(d).getTime() });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(-q) });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, hid), { status:'ACTIVE', batchQty: increment(q), currentBatch:c });
                    await batch.commit(); Utils.toast("Đã xuất!"); document.getElementById('e-qty').value='';
                } else Utils.toast("Thiếu thông tin!", "err");
            };
        }, 300);
    }
};
