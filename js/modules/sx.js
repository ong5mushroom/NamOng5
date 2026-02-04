import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.SX_Action = {
    delLog: async (id, qty, houseId) => {
        if(confirm(`⚠️ Xóa lô ${qty} bịch? (Kho sẽ được hoàn tác)`)) {
            try {
                const batch = writeBatch(db);
                batch.delete(doc(db, `${ROOT_PATH}/supplies`, id));
                if(houseId) batch.update(doc(db, `${ROOT_PATH}/houses`, houseId), { batchQty: increment(-Number(qty)) });
                await batch.commit(); 
                Utils.toast("✅ Đã xóa!");
            } catch(e) { alert(e.message); }
        }
    },

    reset0: async (hid) => { 
        if(confirm("⚠️ CẢNH BÁO: Xóa trắng nhà này (Về 0 & Tắt đèn)?")) { 
            await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { 
                batchQty: 0, currentBatch: '', status: 'EMPTY' 
            }); 
            Utils.toast("✅ Đã Reset!"); 
        } 
    },

    adjust: async (hid, currentQty) => { 
        const v = prompt("Nhập số lượng điều chỉnh (+/-):");
        if(v) { 
            const n = Number(v);
            const newQty = (currentQty || 0) + n;
            const updateData = { batchQty: increment(n) };
            if (newQty <= 0) { updateData.status = 'EMPTY'; updateData.currentBatch = ''; updateData.batchQty = 0; } 
            else { updateData.status = 'ACTIVE'; }
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
    },

    exportReport: () => {
        alert("Tính năng đang phát triển: Xuất Excel báo cáo sản xuất.");
    }
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx'); if(!c || c.classList.contains('hidden')) return;
        
        // --- PHÂN QUYỀN ---
        const role = (user.role || '').toLowerCase();
        const isManager = ['admin', 'giám đốc', 'quản lý'].some(r => role.includes(r));
        const isAccountant = role.includes('kế toán');
        // ------------------

        const houses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        
        // --- ĐOẠN CODE BẠN HỎI NẰM Ở ĐÂY ---
        // Tôi đã thêm 'kho vật tư', 'kho tổng' vào danh sách nhận diện
        const houseA = houses.find(h => ['nhà a','kho a', 'kho phôi', 'kho vật tư', 'kho tổng'].includes((h.name||'').toLowerCase()));
        // ------------------------------------

        const logsA = supplies.filter(s => houseA && s.to === houseA.id).sort((a,b)=>b.time-a.time);
        const uniqueCodes = [...new Set(logsA.filter(l => l.type === 'IMPORT').map(l => l.code).filter(Boolean))];

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${houseA ? `
            <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div><h3 class="font-black text-purple-800 text-sm uppercase flex items-center gap-2"><i class="fas fa-warehouse"></i> ${houseA.name}</h3><div class="text-[10px] text-purple-400 font-bold mt-1 tracking-wider">KHO TỔNG</div></div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-purple-700 block tracking-tight">${(houseA.batchQty||0).toLocaleString()}</span>
                        ${isManager ? `<div class="flex gap-2 justify-end mt-1 opacity-80"><button onclick="window.SX_Action.reset0('${houseA.id}')" class="text-[9px] font-bold text-red-500 hover:underline">RESET 0</button><button onclick="window.SX_Action.adjust('${houseA.id}', ${houseA.batchQty||0})" class="text-[9px] font-bold text-purple-500 hover:underline">SỬA</button></div>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div class="bg-white p-3 rounded-xl border border-purple-100 shadow-sm"><div class="text-[10px] font-bold text-purple-400 mb-2 uppercase">Nhập Kho</div><div class="flex gap-2 mb-2"><input id="i-name" placeholder="Tên giống (049)" class="w-1/2 p-2 border rounded-lg text-xs"><input type="date" id="i-date" class="w-1/2 p-2 border rounded-lg text-xs"></div><div class="flex gap-2"><input type="number" id="i-qty" placeholder="SL" class="flex-1 p-2 border rounded-lg text-xs text-center"><button id="btn-imp" class="bg-purple-600 text-white px-4 rounded-lg font-bold text-xs shadow-md active:scale-95">+</button></div></div>
                    <div class="bg-white p-3 rounded-xl border border-green-100 shadow-sm"><div class="text-[10px] font-bold text-green-500 mb-2 uppercase">Xuất Kho</div><div class="flex gap-2 mb-2"><select id="e-house" class="w-1/2 p-2 border rounded-lg text-xs"><option value="">Nhà</option>${houses.filter(h=>h.id!==houseA.id).map(h=>`<option value="${h.id}">${h.name}</option>`).join('')}</select><select id="e-code" class="w-1/2 p-2 border rounded-lg text-xs"><option value="">Mã</option>${uniqueCodes.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div><div class="flex gap-2"><input type="number" id="e-qty" placeholder="SL" class="flex-1 p-2 border rounded-lg text-xs text-center"><input type="date" id="e-date" class="w-1/3 p-2 border rounded-lg text-xs"><button id="btn-exp" class="bg-green-600 text-white px-4 rounded-lg font-bold text-xs shadow-md active:scale-95">-</button></div></div>
                </div>

                <div class="max-h-40 overflow-y-auto space-y-1 bg-white/50 p-1 rounded-lg">${logsA.map(l => `<div class="flex justify-between items-center text-[10px] p-2 bg-white rounded border border-purple-50 mb-1"><div><span class="font-bold text-slate-700 block">${l.code||'--'}</span><span class="text-slate-400">${new Date(l.time).toLocaleDateString('vi-VN')}</span></div><div class="flex items-center gap-2"><span class="font-bold ${l.qty>0?'text-purple-600':'text-red-500'}">${l.qty>0?'+':''}${Number(l.qty).toLocaleString()}</span>${isManager && l.type==='IMPORT'?`<button onclick="window.SX_Action.delLog('${l._id}',${l.qty},'${houseA.id}')" class="text-red-300 hover:text-red-500">×</button>`:''}</div></div>`).join('')}</div>
            </div>` : '<div class="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">Chưa có dữ liệu Kho (Tạo nhà tên "Kho Vật Tư" hoặc "Nhà A")</div>'}

            <div>
                <div class="flex justify-between items-center mb-4 px-1">
                    <h3 class="font-bold text-slate-600 text-xs uppercase tracking-wide">CÁC NHÀ TRỒNG</h3>
                    <div class="flex gap-2">
                        ${isManager || isAccountant ? `<button onclick="window.SX_Action.exportReport()" class="bg-white text-slate-600 border px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm"><i class="fas fa-file-export"></i> Báo Cáo</button>` : ''}
                        ${isManager ? `<button onclick="window.SX_Action.addHouse()" class="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md active:scale-95 flex items-center gap-1"><i class="fas fa-plus"></i> NHÀ</button>` : ''}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                        const isRunning = (h.batchQty > 0); 
                        return `
                        <div class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1 h-full ${isRunning ? 'bg-green-500' : 'bg-slate-300'}"></div>
                            <div class="pl-3">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <div class="font-bold text-slate-700 text-sm">${h.name}</div>
                                        <div class="text-[10px] text-slate-400 mt-0.5">
                                            Lô: <b>${isRunning ? (h.currentBatch || '--') : ''}</b>
                                        </div>
                                    </div>
                                    ${isManager ? `<button onclick="window.SX_Action.adjust('${h.id}', ${h.batchQty||0})" class="text-slate-300 hover:text-blue-500"><i class="fas fa-pen text-[10px]"></i></button>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="block font-black text-lg ${isRunning ? 'text-blue-600' : 'text-slate-400'}">
                                        ${(h.batchQty||0).toLocaleString()}
                                    </span>
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isRunning ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}">
                                        ${isRunning ? 'RUNNING' : 'EMPTY'}
                                    </span>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
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
