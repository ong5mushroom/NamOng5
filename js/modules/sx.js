import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

// CỖ MÁY IN PHIẾU ĐIỆN TỬ
if (!window.showReceipt) {
    window.showReceipt = function(title, user, items, note, qrOrderCode = null) {
        const timeStr = new Date().toLocaleString('vi-VN');
        let itemsHtml = items.map(i => `<div class="flex justify-between border-b border-dashed border-slate-300 py-2"><span class="font-bold">${i.label}</span><span class="text-right">${i.value}</span></div>`).join('');
        let qrHtml = qrOrderCode ? `<div class="flex flex-col items-center mt-4 pt-4 border-t-2 border-slate-800"><div class="text-[10px] mb-2 font-bold uppercase">Quét để truy xuất nguồn gốc</div><div id="receipt-qr" class="p-2 bg-white border-2 border-slate-200 rounded-xl"></div><div class="text-[9px] mt-1 font-bold">${qrOrderCode}</div></div>` : '';

        let html = `
        <div id="print-section" class="bg-white p-6 text-slate-800 rounded-xl mx-auto w-full max-w-[120mm] shadow-2xl border border-slate-200 relative" style="font-family: 'Courier New', Courier, monospace;">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-black uppercase tracking-widest text-slate-900">NẤM ÔNG 5</h2>
                <p class="text-[10px] text-slate-500 font-bold tracking-widest">NÔNG NGHIỆP HỮU CƠ THỰC CHẤT</p>
                <div class="border-b-2 border-slate-800 w-16 mx-auto mt-3"></div>
            </div>
            <h1 class="text-lg font-black text-center uppercase mb-6 text-slate-800">${title}</h1>
            <div class="text-xs mb-4 space-y-1 text-slate-700">
                <div class="flex justify-between"><span>Thời gian lập:</span><span class="font-bold">${timeStr}</span></div>
                <div class="flex justify-between"><span>Người lập:</span><span class="font-bold">${user}</span></div>
            </div>
            <div class="border-t-2 border-slate-800 pt-2 mb-2 text-sm text-slate-800">
                ${itemsHtml}
            </div>
            ${note ? `<div class="text-xs mt-4 italic text-slate-600">Ghi chú: ${note}</div>` : ''}
            ${qrHtml}
            <div class="mt-8 flex justify-between text-xs text-center px-2 text-slate-800">
                <div>
                    <p class="font-bold mb-10">Người nhận</p>
                    <p class="italic text-slate-400">(Ký, họ tên)</p>
                </div>
                <div>
                    <p class="font-bold mb-10">Người lập</p>
                    <p class="font-bold text-slate-700">${user}</p>
                </div>
            </div>
        </div>
        <div class="mt-4 flex gap-2 justify-center hide-on-print relative z-50">
            <button onclick="window.print()" class="bg-blue-600 active:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><i class="fas fa-print"></i> IN / LƯU BÁO CÁO</button>
            <button onclick="document.getElementById('receipt-overlay').remove()" class="bg-slate-200 active:bg-slate-300 text-slate-700 px-5 py-3 rounded-xl font-bold shadow-md">ĐÓNG</button>
        </div>
        <style>
            @media print {
                body * { visibility: hidden !important; }
                #receipt-overlay { background: transparent !important; }
                #print-section, #print-section * { visibility: visible !important; }
                #print-section { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; margin: 0; padding: 15px; }
                .hide-on-print { display: none !important; }
            }
        </style>
        `;
        const overlay = document.createElement('div');
        overlay.id = 'receipt-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in';
        overlay.innerHTML = `<div class="w-full max-w-lg my-auto">${html}</div>`;
        document.body.appendChild(overlay);
    };
}

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
    
    // NÂNG CẤP: Truyền thêm chuỗi batchMapStr để in phiếu chi tiết
    reset0: async (hid, hName, userName, batchQty, injectCountStr, totalYield, startTime, batchMapStr) => { 
        if(confirm(`⚠️ XÁC NHẬN HẾT VỤ (DỌN SẠCH ${hName.toUpperCase()})?`)) { 
            try {
                const injectCount = decodeURIComponent(injectCountStr);
                const batchMap = JSON.parse(decodeURIComponent(batchMapStr));
                
                // Tính số ngày từ lúc lô phôi đầu tiên vào nhà cho đến lúc bấm dọn nhà
                const days = Math.max(1, Math.round((Date.now() - startTime) / (1000 * 60 * 60 * 24)));
                
                // Chuyển danh sách lô thành chuỗi (VD: 049D: 1000 bịch)
                let batchDetails = Object.entries(batchMap).filter(([k,v])=>v>0).map(([k,v])=>`${k} <span class="text-[10px] text-slate-500">(${v.toLocaleString()})</span>`).join('<br>') || 'Không rõ';

                // LƯU CƠ SỞ DỮ LIỆU
                await updateDoc(doc(db,`${ROOT_PATH}/houses`,hid),{ batchQty: 0, currentBatch: '', status: 'EMPTY', injectCount: '', totalYield: 0, lastClearTime: Date.now() }); 
                Utils.toast("✅ Đã dọn sạch nhà!"); 

                // IN PHIẾU BÁO CÁO NHÀ TRỒNG
                setTimeout(() => {
                    if(confirm(`Bạn có muốn xuất PHIẾU BÁO CÁO TỔNG KẾT VỤ cho ${hName} không?`)) {
                        window.showReceipt(`BÁO CÁO HẾT VỤ - ${hName}`, userName, [
                            { label: "Mã lô sử dụng", value: `<div class="text-right leading-relaxed">${batchDetails}</div>` },
                            { label: "Tổng số phôi", value: `<span class="font-black text-blue-700">${batchQty.toLocaleString()} bịch</span>` },
                            { label: "Ngày vào lô đầu", value: new Date(startTime).toLocaleDateString('vi-VN') },
                            { label: "Ngày kết thúc", value: new Date().toLocaleDateString('vi-VN') },
                            { label: "Thời gian khai thác", value: `<span class="font-black text-slate-700">${days} ngày</span>` },
                            { label: "Số lần tiêm", value: injectCount || '0 lần' },
                            { label: "TỔNG SẢN LƯỢNG", value: `<span class="text-lg font-black text-green-700">${totalYield.toLocaleString()} kg</span>` }
                        ], "Giàn đã được dọn vệ sinh an toàn, sẵn sàng cho vụ mới.");
                    }
                }, 300);
            } catch(e) { alert("Lỗi khi dọn nhà: " + e.message); }
        } 
    },
    
    adjust: async (hid, cQ) => { const v=prompt("Số lượng (+/-):"); if(v){ const n=Number(v), newQ=(cQ||0)+n, u={batchQty:increment(n)}; if(newQ<=0){u.status='EMPTY';u.currentBatch='';u.batchQty=0}else{u.status='ACTIVE'} await updateDoc(doc(db,`${ROOT_PATH}/houses`,hid),u); Utils.toast("Đã sửa!"); } },
    addHouse: async () => { const n=prompt("Tên nhà:"); if(n) { await addDoc(collection(db,`${ROOT_PATH}/houses`),{name:n,status:'EMPTY',batchQty:0,currentBatch:'',startDate:Date.now(),totalYield:0,injectCount:''}); Utils.toast("Đã thêm!"); } },
    setInject: async (hid, currentVal) => { const v = prompt("Nhập thông tin tiêm (VD: Lần 2 - 15/06):", currentVal || ""); if(v !== null) { await updateDoc(doc(db, `${ROOT_PATH}/houses`, hid), { injectCount: v }); Utils.toast("Đã lưu!"); } }
};

export const SX = {
    render: (data, user) => {
        const c = document.getElementById('view-sx'); if(!c || c.classList.contains('hidden')) return;
        
        const role = (user.role || '').toLowerCase(); 
        const isManager = ['admin', 'giám đốc', 'quản lý', 'tổ trưởng'].some(r => role.includes(r));
        
        const houses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        const supplies = Array.isArray(data.supplies) ? data.supplies : [];
        const houseA = houses.find(h => ['nhà a','kho a', 'kho phôi', 'kho tổng', 'nuôi sợi'].some(n => (h.name||'').toLowerCase().includes(n)));
        
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
        const logsA = supplies.filter(s => houseA && (s.from === houseA.id || s.to === houseA.id)).sort((a,b)=>b.time-a.time).slice(0, 30);

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
                        👉 ĐỂ NHẬP / XUẤT LÊN NHÀ TRỒNG HOẶC LỌC HƯ HỎNG: <br>Hãy qua thẻ NUÔI SỢI và bấm trực tiếp vào Giàn.
                    </div>
                </div>

                <div class="text-[10px] font-bold text-slate-400 mb-1 uppercase pl-1">Nhật ký Nhập/Xuất phôi gần đây</div>
                <div class="max-h-48 overflow-y-auto space-y-1.5 bg-white/60 p-1.5 rounded-lg border border-blue-50">
                    ${logsA.length ? logsA.map(l => {
                        let targetName = 'Không rõ'; let color = 'text-slate-600'; let icon = '';
                        const isImport = l.type === 'IMPORT';

                        if(isImport) {
                            targetName = `Nhập lên ${l.note || 'giàn'}`; color = 'text-purple-600 bg-purple-50'; icon = '📥';
                        } else if(l.to === 'HUY' || (l.code && l.code.includes('HUY-'))) { 
                            targetName = 'Hủy bỏ'; color = 'text-red-600 bg-red-50'; icon = '🗑️'; 
                        } else { 
                            targetName = houses.find(h => h.id === l.to)?.name || l.to; 
                            if(l.code && l.code.includes('TD-')) { color = 'text-orange-600 bg-orange-50'; icon = '♻️'; } 
                            else { color = 'text-green-600 bg-green-50'; icon = '🍄'; }
                        }

                        const canCancel = isManager && !isImport && l.to !== 'HUY';

                        return `
                        <div class="flex justify-between items-center text-[10px] p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <div>
                                <span class="font-bold text-slate-700 block text-xs mb-0.5">
                                    ${isImport ? `<span class="font-black ${color} px-1 rounded mr-1">${icon} NHẬP MỚI</span> Mã: <span class="text-blue-600">${l.code||'--'}</span>` 
                                               : `Mã: <span class="text-blue-600">${l.code||'--'}</span> ➔ <span class="font-black ${color} px-1 rounded">${icon} ${targetName}</span>`}
                                </span>
                                <span class="text-slate-400">Bởi: ${l.user||'--'} • ${new Date(l.time).toLocaleString('vi-VN')} ${l.note && !isImport ? `(${l.note})` : ''}</span>
                            </div>
                            <div class="text-right">
                                <span class="block font-black text-lg ${color.split(' ')[0]}">${isImport ? '+' : '-'}${Number(l.qty).toLocaleString()}</span>
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
                        const fallbackStartTime = h.lastClearTime || h.startDate || Date.now();
                        const injectEnc = encodeURIComponent(h.injectCount || '0');

                        // Tìm thời gian lô phôi đầu tiên vào nhà thực tế
                        const hLogs = supplies.filter(s => (s.to === h.id || s.from === h.id) && s.time >= clearTime);
                        let actualStartTime = fallbackStartTime;
                        let inLogs = hLogs.filter(s => s.to === h.id);
                        if(inLogs.length > 0) {
                            actualStartTime = Math.min(...inLogs.map(l => l.time));
                        }

                        const batchMap = {};
                        hLogs.forEach(log => {
                            if(!log.code) return;
                            if(!batchMap[log.code]) batchMap[log.code] = 0;
                            if(log.to === h.id) batchMap[log.code] += Number(log.qty);
                            else if (log.from === h.id) batchMap[log.code] -= Number(log.qty);
                        });
                        const batchMapStr = encodeURIComponent(JSON.stringify(batchMap));
                        
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
                                        <button onclick="window.SX_Action.reset0('${h.id}', '${h.name}', '${user.name}', ${h.batchQty||0}, '${injectEnc}', ${h.totalYield||0}, ${actualStartTime}, '${batchMapStr}')" class="text-slate-300 hover:text-red-500" title="Dọn nhà (Hết vụ)"><i class="fas fa-broom text-[11px]"></i></button>
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
