import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.SX_Action = {
    // ... (Giữ nguyên các hàm xóa, reset, sửa, thêm nhà...) ...
    delLog: async (id, qty, houseId) => { if(confirm(`Xóa lô ${qty}?`)) { try { const b=writeBatch(db); b.delete(doc(db,`${ROOT_PATH}/supplies`,id)); if(houseId)b.update(doc(db,`${ROOT_PATH}/houses`,houseId),{batchQty:increment(-Number(qty))}); await b.commit(); Utils.toast("Đã xóa!"); } catch(e){alert(e.message)} } },
    reset0: async (hid) => { if(confirm("Reset nhà về 0?")) { await updateDoc(doc(db,`${ROOT_PATH}/houses`,hid),{batchQty:0,currentBatch:'',status:'EMPTY',injectCount:0}); Utils.toast("Đã Reset!"); } },
    adjust: async (hid, cQ) => { const v=prompt("Số lượng (+/-):"); if(v){ const n=Number(v), newQ=(cQ||0)+n, u={batchQty:increment(n)}; if(newQ<=0){u.status='EMPTY';u.currentBatch='';u.batchQty=0}else{u.status='ACTIVE'} await updateDoc(doc(db,`${ROOT_PATH}/houses`,hid),u); Utils.toast("Đã sửa!"); } },
    addHouse: async () => { const n=prompt("Tên nhà:"); if(n) { await addDoc(collection(db,`${ROOT_PATH}/houses`),{name:n,status:'EMPTY',batchQty:0,currentBatch:'',startDate:Date.now(),totalYield:0,injectCount:0}); Utils.toast("Đã thêm!"); } },
    setInject: async (hid, currentVal) => { const v = prompt("Nhập số lần tiêm nước:", currentVal || 0); if(v !== null) { await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { injectCount: Number(v) }); Utils.toast("Đã lưu!"); } },
    exportReport: () => alert("Tính năng đang phát triển")
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx'); if(!c || c.classList.contains('hidden')) return;
        
        const role = (user.role || '').toLowerCase();
        const isManager = ['admin', 'giám đốc', 'quản lý'].some(r => role.includes(r));
        
        const houses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        const houseA = houses.find(h => ['nhà a','kho a', 'kho phôi', 'kho vật tư', 'kho tổng'].includes((h.name||'').toLowerCase()));
        
        const logsA = supplies.filter(s => houseA && s.to === houseA.id).sort((a,b)=>b.time-a.time);
        
        // --- LOGIC MỚI: TÍNH TỒN KHO THỰC TẾ CHO TỪNG MÃ LÔ TẠI KHO A ---
        // Để biết lô nào còn bao nhiêu mà xuất
        const stockMapA = {};
        const logsRelatedA = supplies.filter(s => s.to === houseA?.id || s.from === houseA?.id);
        logsRelatedA.forEach(l => {
            if(!l.code) return;
            if(!stockMapA[l.code]) stockMapA[l.code] = 0;
            if(l.to === houseA.id) stockMapA[l.code] += Number(l.qty); // Nhập
            if(l.from === houseA.id) stockMapA[l.code] -= Number(l.qty); // Xuất
        });
        
        // Chỉ lấy những mã còn tồn > 0 để hiển thị trong Select box xuất kho
        const availableCodes = Object.keys(stockMapA).filter(code => stockMapA[code] > 0);
        // ------------------------------------------------------------------

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${houseA ? `
            <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div><h3 class="font-black text-purple-800 text-sm uppercase flex items-center gap-2"><i class="fas fa-warehouse"></i> ${houseA.name}</h3><div class="text-[10px] text-purple-400 font-bold mt-1 tracking-wider">KHO TỔNG HỢP</div></div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-purple-700 block tracking-tight">${(houseA.batchQty||0).toLocaleString()}</span>
                        ${isManager ? `<div class="flex gap-2 justify-end mt-1 opacity-80"><button onclick="window.SX_Action.reset0('${houseA.id}')" class="text-[9px] font-bold text-red-500 hover:underline">RESET 0</button><button onclick="window.SX_Action.adjust('${houseA.id}', ${houseA.batchQty||0})" class="text-[9px] font-bold text-purple-500 hover:underline">SỬA</button></div>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div class="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <div class="text-[10px] font-bold text-purple-400 mb-2 uppercase">Nhập Kho</div>
                        <div class="flex gap-2 mb-2">
                            <input id="i-name" placeholder="Tên giống" class="w-1/2 p-2 border rounded-lg text-xs">
                            <input type="date" id="i-date" class="w-1/2 p-2 border rounded-lg text-xs">
                        </div>
                        <div class="flex gap-2">
                            <input type="number" id="i-qty" placeholder="SL" class="flex-1 p-2 border rounded-lg text-xs text-center">
                            <button id="btn-imp" class="bg-purple-600 text-white px-4 rounded-lg font-bold text-xs shadow-md active:scale-95">+</button>
                        </div>
                    </div>

                    <div class="bg-white p-3 rounded-xl border border-green-100 shadow-sm">
                        <div class="text-[10px] font-bold text-green-500 mb-2 uppercase">Xuất Kho</div>
                        <div class="flex gap-2 mb-2">
                            <select id="e-house" class="w-1/2 p-2 border rounded-lg text-xs">
                                <option value="">Nhà</option>
                                ${houses.filter(h=>h.id!==houseA.id).map(h=>`<option value="${h.id}">${h.name}</option>`).join('')}
                            </select>
                            <select id="e-code" class="w-1/2 p-2 border rounded-lg text-xs font-bold text-purple-700">
                                <option value="">Mã (Tồn)</option>
                                ${availableCodes.map(c => `<option value="${c}">${c} (${stockMapA[c]})</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex gap-2">
                            <input type="number" id="e-qty" placeholder="SL" class="flex-1 p-2 border rounded-lg text-xs text-center">
                            <input type="date" id="e-date" class="w-1/3 p-2 border rounded-lg text-xs">
                            <button id="btn-exp" class="bg-green-600 text-white px-4 rounded-lg font-bold text-xs shadow-md active:scale-95">-</button>
                        </div>
                    </div>
                </div>

                <div class="max-h-40 overflow-y-auto space-y-1 bg-white/50 p-1 rounded-lg">
                    ${Object.entries(stockMapA).map(([code, remain]) => {
                        // Tìm log nhập gốc để lấy ngày nhập
                        const importLog = logsA.find(l => l.code === code && l.type === 'IMPORT');
                        const dateStr = importLog ? new Date(importLog.time).toLocaleDateString('vi-VN') : '--';
                        return `
                        <div class="flex justify-between items-center text-[10px] p-2 bg-white rounded border border-purple-50 mb-1">
                            <div>
                                <span class="font-bold text-slate-700 block">${code}</span>
                                <span class="text-slate-400">${dateStr}</span>
                            </div>
                            <div class="text-right">
                                <span class="block font-bold ${remain > 0 ? 'text-green-600' : 'text-red-400'}">Còn: ${remain.toLocaleString()}</span>
                                ${isManager ? `<button onclick="window.SX_Action.delLog('${importLog?._id}', ${importLog?.qty}, '${houseA.id}')" class="text-red-300 hover:text-red-500 text-[9px] underline">Xóa gốc</button>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>` : '<div class="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">Chưa có dữ liệu Kho</div>'}

            <div>
                <div class="flex justify-between items-center mb-4 px-1">
                    <h3 class="font-bold text-slate-600 text-xs uppercase tracking-wide">CÁC NHÀ TRỒNG</h3>
                    <div class="flex gap-2">
                        ${isManager ? `<button onclick="window.SX_Action.addHouse()" class="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md active:scale-95 flex items-center gap-1"><i class="fas fa-plus"></i> NHÀ</button>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                        const isRunning = (h.batchQty > 0);
                        
                        // Tính chi tiết lô trong nhà (Cộng dồn tự động)
                        const hLogs = supplies.filter(s => s.to === h.id || s.from === h.id);
                        const batchMap = {};
                        hLogs.forEach(log => {
                            if(!log.code) return;
                            if(!batchMap[log.code]) batchMap[log.code] = 0;
                            if(log.to === h.id) batchMap[log.code] += Number(log.qty);
                            else if (log.from === h.id) batchMap[log.code] -= Number(log.qty);
                        });
                        
                        const detailBatches = Object.entries(batchMap)
                            .filter(([code, qty]) => qty > 0)
                            .map(([code, qty]) => `<div class="flex justify-between text-[10px] text-slate-500 border-b border-dashed border-slate-100 py-1"><span>${code}</span><span class="font-bold text-slate-700">${qty.toLocaleString()}</span></div>`)
                            .join('');

                        return `
                        <div class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden h-auto min-h-[140px] flex flex-col justify-between">
                            <div class="absolute top-0 left-0 w-1 h-full ${isRunning ? 'bg-green-500' : 'bg-slate-300'}"></div>
                            <div class="pl-3 w-full">
                                <div class="flex justify-between items-start mb-1">
                                    <div class="font-bold text-slate-700 text-sm">${h.name}</div>
                                    ${isManager ? `<button onclick="window.SX_Action.adjust('${h.id}', ${h.batchQty||0})" class="text-slate-300 hover:text-blue-500"><i class="fas fa-pen text-[10px]"></i></button>` : ''}
                                </div>
                                <div class="bg-slate-50 rounded p-1 mb-2">
                                    ${detailBatches || '<span class="text-[10px] text-slate-300 italic">Nhà trống</span>'}
                                </div>
                                <div class="text-right border-b border-dashed border-slate-100 pb-2 mb-2">
                                    <span class="block font-black text-lg ${isRunning ? 'text-blue-600' : 'text-slate-400'}">${(h.batchQty||0).toLocaleString()}</span>
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isRunning ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}">${isRunning ? 'RUNNING' : 'EMPTY'}</span>
                                </div>
                                <div class="space-y-1 mt-auto">
                                    <div class="flex justify-between items-center cursor-pointer active:scale-95 transition" onclick="window.SX_Action.setInject('${h.id}', ${h.injectCount||0})">
                                        <span class="text-[10px] text-slate-400 font-bold">Tiêm nước:</span>
                                        <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded flex items-center gap-1">${h.injectCount || 0} lần <i class="fas fa-pen text-[8px] opacity-50"></i></span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-[10px] text-slate-400 font-bold">Tổng thu:</span>
                                        <span class="text-[11px] font-black text-orange-600">${(h.totalYield||0).toLocaleString()}kg</span>
                                    </div>
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
            
            // Xử lý nút NHẬP KHO (Tạo mã lô mới)
            const bImp = document.getElementById('btn-imp');
            if(bImp) bImp.onclick = async () => {
                const n=document.getElementById('i-name').value, q=Number(document.getElementById('i-qty').value), d=document.getElementById('i-date').value;
                if(n && q>0 && d) {
                    // Tạo mã lô: Tên + Ngày tháng
                    const code = `${n}-${new Date(d).getDate()}${new Date(d).getMonth()+1}${new Date(d).getFullYear()}`;
                    const b = writeBatch(db);
                    // Lưu log nhập vào Kho A
                    b.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'IMPORT', to:houseA.id, code, qty:q, user:user.name, time:new Date(d).getTime() });
                    // Cộng tổng số lượng Kho A
                    b.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(q) });
                    await b.commit(); 
                    Utils.toast(`Đã nhập ${code}`); document.getElementById('i-qty').value='';
                } else Utils.toast("Thiếu tin!", "err");
            };

            // Xử lý nút XUẤT KHO (Trừ đúng mã lô)
            const bExp = document.getElementById('btn-exp');
            if(bExp) bExp.onclick = async () => {
                const hid=document.getElementById('e-house').value;
                const c=document.getElementById('e-code').value; // Mã lô chọn từ select
                const q=Number(document.getElementById('e-qty').value);
                const d=document.getElementById('e-date').value;
                
                if(hid && c && q>0) {
                    // Kiểm tra tồn kho của lô này có đủ không
                    if(q > (stockMapA[c] || 0)) return Utils.toast(`Lô ${c} không đủ hàng!`, "err");
                    
                    const b = writeBatch(db);
                    // Tạo log Xuất: Từ Kho A -> Nhà B
                    b.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'EXPORT', from:houseA.id, to:hid, code:c, qty:q, user:user.name, time:new Date(d).getTime() });
                    
                    // Trừ Kho A
                    b.update(doc(db, `${ROOT_PATH}/houses`, houseA.id), { batchQty: increment(-q) });
                    
                    // Cộng Nhà B (Cộng dồn vào tổng số)
                    b.update(doc(db, `${ROOT_PATH}/houses`, hid), { 
                        status:'ACTIVE', 
                        batchQty: increment(q), 
                        currentBatch: c // Cập nhật mã lô mới nhất để tham khảo (chi tiết thì đã có logic tính toán ở trên lo rồi)
                    });
                    
                    await b.commit(); Utils.toast("Đã xuất!"); document.getElementById('e-qty').value='';
                } else Utils.toast("Thiếu thông tin hoặc chưa chọn lô!", "err");
            };
        }, 300);
    }
};
