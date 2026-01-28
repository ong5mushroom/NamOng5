import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.SX_Action = {
    // Xóa Log -> Trừ lại kho
    delLog: async (id, qty, houseId) => {
        if(confirm(`⚠️ Xóa lô ${qty} bịch? (Kho A sẽ bị trừ đi)`)) {
            try {
                const batch = writeBatch(db); // Dùng writeBatch
                batch.delete(doc(db, `${ROOT_PATH}/supplies`, id));
                if(houseId) batch.update(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(-Number(qty)) });
                await batch.commit();
                Utils.toast("✅ Đã xóa!");
            } catch(e) { alert(e.message); }
        }
    },
    // Reset kho về 0
    reset0: async (hid) => {
        if(confirm("⚠️ Đưa số lượng về 0?")) {
            await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { batchQty: 0 });
            Utils.toast("Đã Reset!");
        }
    },
    // Sửa tay
    adjust: async (hid) => {
        const v = prompt("Nhập số (+/-):");
        if(v) {
            const n = Number(v);
            await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { batchQty: increment(n) });
            await addDoc(collection(db, `${ROOT_PATH}/supplies`), { type:'ADJUST', to:hid, qty:n, user:'Admin', time:Date.now() });
            Utils.toast("Đã sửa!");
        }
    }
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        
        const houseA = houses.find(h => ['nhà a','kho a'].includes((h.name||'').toLowerCase()));
        const logsA = supplies.filter(s => houseA && s.to === houseA.id).sort((a,b)=>b.time-a.time);
        // Lấy danh sách mã giống duy nhất từ lịch sử nhập
        const uniqueCodes = [...new Set(logsA.filter(l => l.type === 'IMPORT').map(l => l.code).filter(Boolean))];

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${houseA ? `
            <div class="glass p-5 border-l-8 border-purple-500 bg-purple-50/40">
                <div class="flex justify-between items-start mb-3">
                    <div><h3 class="font-black text-purple-800 text-xs uppercase flex gap-2"><i class="fas fa-cubes"></i> ${houseA.name}</h3><div class="text-[9px] text-purple-400 font-bold mt-1">TỒN KHO</div></div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-purple-700 block">${(houseA.batchQty||0).toLocaleString()}</span>
                        ${isAdmin ? `<div class="flex gap-1 justify-end mt-1"><button onclick="window.SX_Action.reset0('${houseA.id}')" class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-bold border border-red-200">RESET 0</button><button onclick="window.SX_Action.adjust('${houseA.id}')" class="bg-white border text-purple-600 px-2 py-0.5 rounded text-[8px] font-bold">SỬA</button></div>` : ''}
                    </div>
                </div>

                ${isAdmin ? `
                <div class="bg-white p-3 rounded-xl shadow-sm border border-purple-100 mb-3">
                    <div class="text-[10px] font-bold text-purple-700 mb-2 border-b pb-1">1. NHẬP PHÔI (Mã tự tạo)</div>
                    <div class="flex gap-2 mb-2"><input id="i-name" placeholder="Tên giống (049)" class="w-1/2 p-2 border rounded text-xs"><input type="date" id="i-date" class="w-1/2 p-2 border rounded text-xs"></div>
                    <div class="flex gap-2"><input type="number" id="i-qty" placeholder="Số lượng" class="flex-1 p-2 border rounded text-xs text-center"><button id="btn-imp" class="bg-purple-600 text-white px-3 rounded font-bold text-xs shadow">NHẬP (+)</button></div>
                </div>
                <div class="bg-white p-3 rounded-xl shadow-sm border border-green-100">
                    <div class="text-[10px] font-bold text-green-700 mb-2 border-b pb-1">2. XUẤT CHO NHÀ TRỒNG</div>
                    <div class="flex gap-2 mb-2"><select id="e-house" class="w-1/2 p-2 border rounded text-xs"><option value="">-- Nhà --</option>${houses.filter(h=>h.id!==houseA.id).map(h=>`<option value="${h.id}">${h.name}</option>`).join('')}</select><select id="e-code" class="w-1/2 p-2 border rounded text-xs"><option value="">-- Mã --</option>${uniqueCodes.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
                    <div class="flex gap-2"><input type="date" id="e-date" class="w-1/3 p-2 border rounded text-xs"><input type="number" id="e-qty" placeholder="SL Xuất" class="flex-1 p-2 border rounded text-xs text-center"><button id="btn-exp" class="bg-green-600 text-white px-3 rounded font-bold text-xs shadow">XUẤT (-)</button></div>
                </div>` : ''}

                <div class="mt-3 max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded border shadow-inner">
                    ${logsA.map(l => `<div class="flex justify-between items-center text-[10px] border-b border-dashed pb-1"><div><span class="font-bold text-slate-700 block">${l.code||'--'}</span><span class="text-slate-400">${new Date(l.time).toLocaleDateString('vi-VN')} - ${l.type}</span></div><div class="flex gap-2"><span class="font-black ${l.qty>0?'text-purple-600':'text-red-500'}">${l.qty>0?'+':''}${Number(l.qty).toLocaleString()}</span>${isAdmin && l.type==='IMPORT'?`<button onclick="window.SX_Action.delLog('${l._id}',${l.qty},'${houseA.id}')" class="text-red-400 font-bold px-1">×</button>`:''}</div></div>`).join('')}
                </div>
            </div>` : '<div class="text-center p-4 text-red-500">Chưa có Nhà A</div>'}

            <div class="grid grid-cols-1 gap-3">
                ${houses.filter(h => h.id !== (houseA?.id)).map(h => `<div class="glass p-3 border-l-4 ${h.status==='ACTIVE'?'border-green-500':'border-slate-300'} bg-white shadow-sm flex justify-between items-center"><div><div class="font-bold text-slate-700">${h.name}</div><div class="text-[10px] text-slate-400">Lô: <b>${h.currentBatch||'--'}</b></div></div><div class="text-right"><span class="text-[10px] font-bold px-2 py-1 rounded ${h.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-400'}">${h.status==='ACTIVE'?h.batchQty+' bịch':'TRỐNG'}</span>${isAdmin?`<div class="mt-1"><button onclick="window.SX_Action.adjust('${h.id}')" class="text-[9px] text-blue-500 underline">Sửa</button></div>`:''}</div></div>`).join('')}
            </div>
        </div>`;

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
                    const ref = doc(collection(db, `${ROOT_PATH}/supplies`));
                    batch.set(ref, { type:'IMPORT', to:houseA.id, code, qty:q, user:user.name, time:new Date(d).getTime() });
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
                    const ref = doc(collection(db, `${ROOT_PATH}/supplies`));
                    batch.set(ref, { type:'EXPORT', from:houseA.id, to:hid, code:c, qty:q, user:user.name, time:new Date(d).getTime() });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(-q) });
                    batch.update(doc(db, `${ROOT_PATH}/houses`, hid), { status:'ACTIVE', batchQty: increment(q), currentBatch:c });
                    await batch.commit(); Utils.toast("Đã xuất!"); document.getElementById('e-qty').value='';
                } else Utils.toast("Thiếu thông tin!", "err");
            };
        }, 300);
    }
};
