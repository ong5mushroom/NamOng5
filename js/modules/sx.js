import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

window.SX_Action = {
    delLog: async (id, adjustQty, houseId) => { 
        if(confirm(`Hủy lệnh này? (Sẽ trừ lại số lượng trong Nhà Trồng)`)) { 
            try { 
                const b = writeBatch(db); b.delete(doc(db,`${ROOT_PATH}/supplies`,id)); 
                if(houseId && houseId !== 'HUY') b.update(doc(db,`${ROOT_PATH}/houses`,houseId), {batchQty: increment(adjustQty)}); 
                await b.commit(); Utils.toast("Đã hủy lệnh!"); 
            } catch(e){alert(e.message)} 
        } 
    },
    reset0: async (hid) => { 
        if(confirm("⚠️ XÁC NHẬN HẾT VỤ (DỌN NHÀ)?")) { 
            await updateDoc(doc(db,`${ROOT_PATH}/houses`,hid),{ batchQty: 0, currentBatch: '', status: 'EMPTY', injectCount: '', totalYield: 0, lastClearTime: Date.now() }); Utils.toast("✅ Đã dọn sạch nhà!"); 
        } 
    },
    adjust: async (hid, cQ) => { const v=prompt("Số lượng (+/-):"); if(v){ const n=Number(v), newQ=(cQ||0)+n, u={batchQty:increment(n)}; if(newQ<=0){u.status='EMPTY';u.currentBatch='';u.batchQty=0}else{u.status='ACTIVE'} await updateDoc(doc(db,`${ROOT_PATH}/houses`,hid),u); Utils.toast("Đã sửa!"); } },
    addHouse: async () => { const n=prompt("Tên nhà:"); if(n) { await addDoc(collection(db,`${ROOT_PATH}/houses`),{name:n,status:'EMPTY',batchQty:0,currentBatch:'',startDate:Date.now(),totalYield:0,injectCount:''}); Utils.toast("Đã thêm!"); } },
    setInject: async (hid, currentVal) => { const v = prompt("Nhập thông tin tiêm:", currentVal || ""); if(v !== null) { await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { injectCount: v }); Utils.toast("Đã lưu!"); } },
    exportReport: () => alert("Tính năng đang phát triển")
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx'); if(!c || c.classList.contains('hidden')) return;
        
        // Cấp quyền Quản lý Thẻ SX cho Tổ Trưởng
        const role = (user.role || '').toLowerCase(); 
        const isManager = ['admin', 'giám đốc', 'quản lý', 'tổ trưởng'].some(r => role.includes(r));
        
        const houses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        const houseA = houses.find(h => ['nhà a','kho a', 'kho phôi', 'kho tổng', 'nuôi sợi'].some(n => (h.name||'').toLowerCase().includes(n)));
        
        // Quét cấu trúc dữ liệu Lô mới từ tất cả các giàn
        const racks = Array.isArray(data.nuoisoi_A) ? data.nuoisoi_A : [];
        const stockMapA = {}; let totalStockA = 0;
        
        racks.forEach(r => {
            let bMap = r.batches || {};
            if(r.batch && r.qty) bMap[r.batch] = (bMap[r.batch]||0) + Number(r.qty); 
            
            Object.entries(bMap).forEach(([bCode, q]) => {
                if(q > 0) {
                    bCode = bCode.toUpperCase();
                    if(!stockMapA[bCode]) stockMapA[bCode] = 0;
                    stockMapA[bCode] += Number(q); totalStockA += Number(q);
                }
            });
        });
        const availableCodes = Object.keys(stockMapA).sort();

        const exportLogsA = supplies.filter(s => houseA && s.from === houseA.id).sort((a,b)=>b.time-a.time).slice(0, 20);

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            ${houseA ? `
            <div class="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-black text-blue-800 text-sm uppercase flex items-center gap-2"><i class="fas fa-boxes"></i> KHU NUÔI SỢI (NHÀ A)</h3>
                        <div class="text-[10px] text-blue-500 font-bold mt-1 tracking-wider">TỔNG HỢP TỪ CÁC GIÀN</div>
                    </div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-blue-700 block tracking-tight">${totalStockA.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col mb-4">
                    <div class="text-[10px] font-bold text-blue-500 mb-2 uppercase border-b border-dashed border-blue-100 pb-1">Tồn kho theo Mã Lô (Đang trên giàn)</div>
                    <div class="flex-1 overflow-y-auto max-h-32 space-y-1 mt-1 pr-1">
                        ${availableCodes.length ? availableCodes.map(code => `<div class="flex justify-between text-xs py-1 border-b border-slate-50"><span class="font-bold text-slate-700">${code}</span><span class="text-blue-600 font-black">${stockMapA[code].toLocaleString()}</span></div>`).join('') : '<div class="text-xs text-slate-400 italic text-center py-4">Các giàn đang trống</div>'}
                    </div>
                    <div class="mt-2 pt-2 border-t border-slate-100 text-[10px] text-blue-600 bg-blue-50/50 p-2 rounded italic text-center font-bold">
                        👉 ĐỂ XUẤT LÊN NHÀ TRỒNG HOẶC LỌC HƯ HỎNG: <br>Hãy qua thẻ NUÔI SỢI và bấm trực tiếp vào Giàn.
                    </div>
                </div>

                <div class="text-[10px] font-bold text-slate-400 mb-1 uppercase pl-1">Lịch sử xuất / lọc phôi gần đây</div>
                <div class="max-h-48 overflow-y-auto space-y-1.5 bg-white/60 p-1.5 rounded-lg border border-blue-50">
                    ${exportLogsA.length ? exportLogsA.map(l => {
                        let targetName = 'Không rõ'; let color = 'text-slate-600'; let icon = '';
                        
                        if(l.to === 'HUY' || (l.code && l.code.includes('HUY-'))) { 
                            targetName = 'Hủy bỏ'; color = 'text-red-600 bg-red-50'; icon = '🗑️'; 
                        } else { 
                            targetName = houses.find(h => h.id === l.to)?.name || l.to; 
                            if(l.code && l.code.includes('TD-')) {
                                color = 'text-orange-600 bg-orange-50'; icon = '♻️'; 
                            } else {
                                color = 'text-green-600 bg-green-50'; icon = '🍄'; 
                            }
                        }
                        const canCancel = isManager && l.to !== 'HUY';

                        return `
                        <div class="flex justify-between items-center text-[10px] p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <div>
                                <span class="font-bold text-slate-700 block text-xs mb-0.5">Mã: <span class="text-blue-600">${l.code||'--'}</span> ➔ <span class="font-black ${color} px-1 rounded">${icon} ${targetName}</span></span>
                                <span class="text-slate-400">Bởi: ${l.user||'--'} • ${new Date(l.time).toLocaleString('vi-VN')}</span>
                            </div>
                            <div class="text-right">
                                <span class="block font-black text-lg ${color.split(' ')[0]}">${Number(l.qty).toLocaleString()}</span>
                                ${canCancel ? `<button onclick="window.SX_Action.delLog('${l._id}', ${-l.qty}, '${l.to}')" class="text-slate-400 hover:text-red-600 text-[9px] underline font-bold mt-1 block">Hủy lệnh</button>` : ''}
                            </div>
                        </div>`;
                    }).join('') : '<div class="text-xs text-slate-400 italic text-center py-3">Chưa có dữ liệu</div>'}
                </div>
            </div>` : '<div class="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">Chưa có dữ liệu Nhà Nuôi Sợi</div>'}

            <div>
                <div class="flex justify-between items-center mb-4 px-1 mt-2">
                    <h3 class="font-bold text-slate-600 text-xs uppercase tracking-wide">CÁC NHÀ TRỒNG NẤM</h3>
                    <div class="flex gap-2">${isManager ? `<button onclick="window.SX_Action.addHouse()" class="bg-slate-700 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md active:scale-95 flex items-center gap-1"><i class="fas fa-plus"></i> THÊM NHÀ</button>` : ''}</div>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    ${houses.filter(h => h.id !== (houseA?.id)).map(h => {
                        const isRunning = (h.batchQty > 0);
                        const clearTime = h.lastClearTime || 0;
                        const hLogs = supplies.filter(s => (s.to === h.id || s.from === h.id) && s.time >= clearTime);
                        const batchMap = {};
                        hLogs.forEach(log => {
                            if(!log.code) return;
                            if(!batchMap[log.code]) batchMap[log.code] = 0;
                            if(log.to === h.id) batchMap[log.code] += Number(log.qty);
                            else if (log.from === h.id) batchMap[log.code] -= Number(log.qty);
                        });
                        
                        const detailBatches = Object.entries(batchMap).filter(([code, qty]) => qty > 0).map(([code, qty]) => {
                            let textColor = 'text-slate-700 font-bold';
                            if(code.includes('TD-')) textColor = 'text-orange-600 font-black';
                            else if(code.includes('D-')) textColor = 'text-green-700 font-bold';
                            return `<div class="flex justify-between text-[10px] text-slate-500 border-b border-dashed border-slate-100 py-1"><span class="${textColor}">${code}</span><span class="${textColor}">${qty.toLocaleString()}</span></div>`
                        }).join('');

                        return `<div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden h-auto min-h-[140px] flex flex-col justify-between">
                            <div class="absolute top-0 left-0 w-1.5 h-full ${isRunning ? 'bg-green-500' : 'bg-slate-200'}"></div>
                            <div class="pl-3 w-full">
                                <div class="flex justify-between items-start mb-1">
                                    <div class="font-black text-slate-700 text-sm">${h.name}</div>
                                    <div class="flex gap-2 items-center">
                                        ${isManager ? `
                                        <button onclick="window.SX_Action.reset0('${h.id}')" class="text-slate-300 hover:text-red-500" title="Dọn nhà (Hết vụ)"><i class="fas fa-broom text-[11px]"></i></button>
                                        <button onclick="window.SX_Action.adjust('${h.id}', ${h.batchQty||0})" class="text-slate-300 hover:text-blue-500" title="Sửa số lượng"><i class="fas fa-pen text-[10px]"></i></button>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="bg-slate-50/80 rounded p-1 mb-2 border border-slate-100">${detailBatches || '<span class="text-[10px] text-slate-400 italic block text-center py-1">Nhà trống</span>'}</div>
                                <div class="text-right border-b border-dashed border-slate-200 pb-2 mb-2">
                                    <span class="block font-black text-xl ${isRunning ? 'text-green-600' : 'text-slate-300'}">${(h.batchQty||0).toLocaleString()} <span class="text-[10px] text-slate-400 font-normal">bịch</span></span>
                                </div>
                                <div class="space-y-1.5 mt-auto">
                                    <div class="flex justify-between items-center cursor-pointer active:scale-95 transition" onclick="window.SX_Action.setInject('${h.id}', '${h.injectCount || ''}')">
                                        <span class="text-[10px] text-slate-400 font-bold whitespace-nowrap">Tiêm:</span>
                                        <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[90px] truncate" title="${h.injectCount || 'Chưa tiêm'}">${h.injectCount || 'Chưa tiêm'} <i class="fas fa-pen text-[8px] opacity-50"></i></span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-[10px] text-slate-400 font-bold">Thu hoạch:</span>
                                        <span class="text-[11px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">${(h.totalYield||0).toLocaleString()} kg</span>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }
};
