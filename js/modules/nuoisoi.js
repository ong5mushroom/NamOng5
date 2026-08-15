import { doc, collection, db, ROOT_PATH, writeBatch, increment, getDocs } from '../config.js';
import { Utils } from '../utils.js';

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
                <div class="flex justify-between"><span>Thời gian:</span><span class="font-bold">${timeStr}</span></div>
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
            <button onclick="window.print()" class="bg-blue-600 active:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><i class="fas fa-print"></i> IN / LƯU ẢNH</button>
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

window.NuoiSoi_Action = {
    merge: async (targetRackId, batchCode) => {
        if(!confirm(`⚠️ GOM MÃ LÔ: "${batchCode}"\nHệ thống sẽ quét và hút toàn bộ phôi mã này từ các giàn khác về giàn ${targetRackId}. Bạn có chắc chắn?`)) return;
        const allRacks = window._tempNuoiSoiData || [];
        let totalToAdd = 0; const batchDb = writeBatch(db); let foundOther = false;
        allRacks.forEach(r => {
            if(r.id !== targetRackId) {
                let bMap = r.batches || {};
                if (r.batch && r.qty) bMap[r.batch] = (bMap[r.batch]||0) + Number(r.qty); 
                if(bMap[batchCode] && bMap[batchCode] > 0) {
                    foundOther = true; totalToAdd += bMap[batchCode]; delete bMap[batchCode]; 
                    let extra = { batches: bMap, time: Date.now() };
                    if (r.batch === batchCode) { extra.batch = ''; extra.qty = 0; }
                    batchDb.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, r.id), extra, { merge: true });
                }
            }
        });
        if(foundOther) {
            let targetRack = allRacks.find(r => r.id === targetRackId) || { batches: {} };
            let tMap = targetRack.batches || {};
            if (targetRack.batch && targetRack.qty) tMap[targetRack.batch] = (tMap[targetRack.batch]||0) + Number(targetRack.qty);
            tMap[batchCode] = (tMap[batchCode] || 0) + totalToAdd; 
            batchDb.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, targetRackId), { batches: tMap, batch: '', qty: 0, time: Date.now() }, { merge: true });
            await batchDb.commit(); Utils.modal(null); Utils.toast(`✅ Đã gom thêm ${totalToAdd} bịch phôi về giàn ${targetRackId}!`);
        } else { Utils.toast(`Không có giàn nào khác chứa mã ${batchCode} để gom.`, "info"); }
    },
    // NÂNG CẤP: Quét lịch sử để xuất phiếu tổng kết tỷ lệ Đạt/Tận Dụng/Hủy
    clearRack: async (id, rackDataStr, userName) => {
        if(!confirm(`⚠️ BẠN CHẮC CHẮN MUỐN XÓA SẠCH GIÀN ${id}?\nToàn bộ phôi trên giàn này sẽ bị xóa khỏi hệ thống.`)) return;
        try {
            Utils.toast("⏳ Đang dọn giàn và tính toán số liệu...", "info");
            let rack = JSON.parse(decodeURIComponent(rackDataStr));
            let batches = rack.batches || {};
            const batchKeys = Object.keys(batches);
            
            // Lấy dữ liệu log để tính toán
            let allLogs = [];
            if(batchKeys.length > 0) {
                const snap = await getDocs(collection(db, `${ROOT_PATH}/supplies`));
                allLogs = snap.docs.map(d => d.data());
            }
            
            const batchDb = writeBatch(db);
            batchDb.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, id), { batches: {}, batch: '', qty: 0, time: Date.now() }, { merge: true });
            await batchDb.commit(); 
            Utils.modal(null); Utils.toast(`✅ Đã dọn sạch giàn ${id}!`);

            if(batchKeys.length > 0) {
                setTimeout(() => {
                    if(confirm(`Bạn có muốn xuất PHIẾU TỔNG KẾT GIÀN ${id} không?`)) {
                        let items = [];
                        batchKeys.forEach(bCode => {
                            let importLogs = allLogs.filter(l => l.type === 'IMPORT' && l.code === bCode);
                            let totalImport = importLogs.reduce((s, l) => s + Number(l.qty||0), 0);
                            let importTime = importLogs.length ? new Date(Math.min(...importLogs.map(l => l.time))).toLocaleDateString('vi-VN') : '--';
                            
                            let datQty = allLogs.filter(l => l.type === 'EXPORT' && (l.code||'').startsWith(bCode + 'D-')).reduce((s, l) => s + Number(l.qty||0), 0);
                            let tdQty = allLogs.filter(l => l.type === 'EXPORT' && (l.code||'').startsWith(bCode + 'TD-')).reduce((s, l) => s + Number(l.qty||0), 0);
                            let huyQty = allLogs.filter(l => l.type === 'DESTROY' && (l.code||'').startsWith(bCode + 'HUY-')).reduce((s, l) => s + Number(l.qty||0), 0);
                            
                            // Tính cả số lượng còn kẹt lại trên giàn lúc bấm xóa coi như là Hủy
                            huyQty += Number(batches[bCode]);

                            items.push({ label: `<span class="text-blue-700 underline text-base">MÃ LÔ: ${bCode}</span>`, value: "" });
                            items.push({ label: `Ngày lên giàn`, value: importTime });
                            items.push({ label: `Tổng nhập (A)`, value: `${totalImport.toLocaleString()} bịch` });
                            items.push({ label: `✅ Đạt`, value: `${datQty.toLocaleString()} (${totalImport?Math.round(datQty/totalImport*100):0}%)` });
                            items.push({ label: `♻️ Tận dụng`, value: `${tdQty.toLocaleString()} (${totalImport?Math.round(tdQty/totalImport*100):0}%)` });
                            items.push({ label: `🗑️ Hủy/Hao hụt`, value: `${huyQty.toLocaleString()} (${totalImport?Math.round(huyQty/totalImport*100):0}%)` });
                        });
                        window.showReceipt(`TỔNG KẾT TỶ LỆ DỌN GIÀN ${id}`, userName, items, "Số liệu quét tự động từ lịch sử Nhập/Xuất của các mã lô.");
                    }
                }, 300);
            }
        } catch(e) { alert(e.message); }
    },
    edit: (id, rackDataStr, userName) => {
        let rack = JSON.parse(decodeURIComponent(rackDataStr));
        let batches = rack.batches || {};
        if(rack.batch && rack.qty) batches[rack.batch] = (batches[rack.batch]||0) + Number(rack.qty);

        const batchKeys = Object.keys(batches).filter(k => batches[k] > 0);
        let firstBatchQty = batchKeys.length ? batches[batchKeys[0]] : 0;

        let listHtml = batchKeys.length ? batchKeys.map(k => `
            <div class="flex flex-col gap-1 bg-white p-2 mb-2 border border-slate-200 rounded shadow-sm">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-slate-700">${k}</span>
                    <span class="font-black text-blue-600 bg-blue-50 px-2 rounded">${batches[k].toLocaleString()} bịch</span>
                </div>
                <div class="flex justify-end border-t border-slate-50 pt-1.5 mt-0.5">
                    <button onclick="window.NuoiSoi_Action.merge('${id}', '${k}')" class="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1 shadow-sm"><i class="fas fa-magnet"></i> Gom các giàn khác về đây</button>
                </div>
            </div>
        `).join('') : '<div class="text-[10px] text-center text-slate-400 py-2 italic">Giàn đang trống, chưa có lô nào!</div>';

        let selectHtml = batchKeys.length ? batchKeys.map(k => `<option value="${k}" data-qty="${batches[k]}">Lô: ${k}</option>`).join('') : '<option value="">-- Trống --</option>';

        const houses = window._tempHouses || [];
        const houseA = window._tempHouseA || {};

        Utils.modal(`THAO TÁC GIÀN ${id}`, `
            <div class="flex gap-1 bg-slate-100 p-1 rounded-lg mb-3">
                <button id="btn-tab-nhap" class="flex-1 py-2 text-xs font-bold bg-white text-blue-600 rounded shadow-sm transition">QUẢN LÝ GIÀN</button>
                <button id="btn-tab-xuat" class="flex-1 py-2 text-xs font-bold text-slate-500 rounded transition">LỌC & XUẤT PHÔI</button>
            </div>
            <div id="tab-nhap" class="space-y-3 animate-fade-in">
                <div class="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div class="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">📦 Các lô đang có trên giàn:</div>
                    <div class="max-h-36 overflow-y-auto pr-1">${listHtml}</div>
                </div>
                <div class="border-t border-dashed border-slate-300 pt-3">
                    <label class="text-[10px] font-bold text-blue-600 uppercase block mb-1">➕ Thêm Lô Phôi mới vào giàn:</label>
                    <div class="flex gap-2">
                        <input type="text" id="ns-add-batch" class="w-[55%] p-2 border border-slate-300 rounded-lg text-sm font-bold uppercase outline-none focus:border-blue-500" placeholder="Mã lô (VD: 049-13/1)">
                        <input type="number" id="ns-add-qty" class="w-[45%] p-2 border border-slate-300 rounded-lg text-sm font-bold text-center outline-none focus:border-blue-500" placeholder="Số lượng">
                    </div>
                    <button id="btn-save-nhap" class="w-full py-2.5 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-lg mt-2 shadow-md flex justify-center items-center gap-2"><i class="fas fa-plus-circle"></i> CỘNG VÀO GIÀN NÀY</button>
                </div>
                <button onclick="window.NuoiSoi_Action.clearRack('${id}', '${rackDataStr}', '${userName}')" class="w-full py-2 bg-red-50 text-red-600 font-bold rounded-lg mt-2 border border-red-200 flex justify-center items-center gap-2 transition hover:bg-red-100"><i class="fas fa-trash-alt"></i> XÓA SẠCH GIÀN NÀY</button>
            </div>
            <div id="tab-xuat" class="hidden space-y-3 animate-fade-in">
                <div class="bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex justify-between items-center mb-2 shadow-sm">
                    <select id="ns-x-source" onchange="document.getElementById('ns-x-ton').innerText = this.options[this.selectedIndex].getAttribute('data-qty')" class="p-1 rounded border border-blue-200 text-xs font-bold text-blue-800 outline-none max-w-[140px] shadow-sm">${selectHtml}</select>
                    <span class="text-[10px] font-bold text-blue-800">Tồn lô này: <span id="ns-x-ton" class="text-base text-blue-600">${firstBatchQty}</span></span>
                </div>
                <div class="bg-green-50 p-3 rounded-xl border border-green-200 shadow-sm">
                    <label class="text-[10px] font-bold text-green-700 uppercase block mb-2">🍄 Xuất Phôi ĐẠT (Lên nhà trồng):</label>
                    <div class="flex gap-2">
                        <input type="number" id="ns-x-dat" class="w-1/3 p-2 rounded-lg border border-green-300 text-sm font-bold text-center outline-none focus:border-green-500" placeholder="SL Đạt">
                        <select id="ns-x-house" class="flex-1 p-2 rounded-lg border border-green-300 text-xs font-bold outline-none focus:border-green-500"><option value="">-- Chọn Nhà Trồng --</option>${houses.filter(h => h.id !== houseA.id).map(h => `<option value="${h.id}">${h.name}</option>`).join('')}</select>
                    </div>
                </div>
                <div class="flex gap-2">
                    <div class="bg-orange-50 p-3 rounded-xl border border-orange-200 flex-1 flex flex-col gap-2 shadow-sm">
                        <label class="text-[10px] font-bold text-orange-700 uppercase">♻️ Tận Dụng:</label>
                        <input type="number" id="ns-x-td" class="w-full p-2 rounded-lg border border-orange-300 text-sm font-bold text-center outline-none" placeholder="SL TD">
                        <select id="ns-x-td-house" class="w-full p-2 rounded-lg border border-orange-300 text-[10px] font-bold outline-none"><option value="">- Vào Nhà -</option>${houses.filter(h => h.id !== houseA.id).map(h => `<option value="${h.id}">${h.name}</option>`).join('')}</select>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl border border-red-200 flex-1 flex flex-col gap-2 shadow-sm">
                        <label class="text-[10px] font-bold text-red-700 uppercase">🗑️ Hư Hỏng:</label>
                        <input type="number" id="ns-x-huy" class="w-full p-2 rounded-lg border border-red-300 text-sm font-bold text-center outline-none" placeholder="SL Hủy">
                        <div class="text-[9px] text-red-400 italic text-center mt-auto font-bold">Hủy bỏ hoàn toàn</div>
                    </div>
                </div>
                <button id="btn-save-xuat" class="w-full py-3 bg-green-600 active:bg-green-700 text-white font-bold rounded-lg mt-2 shadow-md">XÁC NHẬN XUẤT LÔ NÀY</button>
            </div>
        `, []);

        setTimeout(() => {
            const btnTNhap = document.getElementById('btn-tab-nhap'); const btnTXuat = document.getElementById('btn-tab-xuat');
            const tabNhap = document.getElementById('tab-nhap'); const tabXuat = document.getElementById('tab-xuat');
            btnTNhap.onclick = () => { tabNhap.classList.remove('hidden'); tabXuat.classList.add('hidden'); btnTNhap.className = "flex-1 py-2 text-xs font-bold bg-white text-blue-600 rounded shadow-sm transition"; btnTXuat.className = "flex-1 py-2 text-xs font-bold text-slate-500 rounded transition"; };
            btnTXuat.onclick = () => { tabXuat.classList.remove('hidden'); tabNhap.classList.add('hidden'); btnTXuat.className = "flex-1 py-2 text-xs font-bold bg-white text-blue-600 rounded shadow-sm transition"; btnTNhap.className = "flex-1 py-2 text-xs font-bold text-slate-500 rounded transition"; };

            document.getElementById('btn-save-nhap').onclick = async () => {
                const b = document.getElementById('ns-add-batch').value.toUpperCase().trim(); 
                const q = Number(document.getElementById('ns-add-qty').value);
                if(!b || q <= 0) return Utils.toast("Nhập thiếu Mã Lô hoặc Số Lượng!", "err");
                
                batches[b] = (batches[b] || 0) + q;
                const batchDb = writeBatch(db); 
                batchDb.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, id), { batches: batches, time: Date.now(), batch: '', qty: 0 }, { merge: true });
                
                const houseAId = houseA?.id || 'KHO_TONG';
                batchDb.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type: 'IMPORT', to: houseAId, code: b, qty: q, user: userName, time: Date.now(), note: `Nhập lên Giàn ${id}` });
                await batchDb.commit(); 
                Utils.modal(null); Utils.toast("✅ Đã xếp phôi lên giàn!");

                setTimeout(() => {
                    if(confirm("Bạn có muốn xuất PHIẾU NHẬP KHU NUÔI SỢI không?")) {
                        window.showReceipt("PHIẾU NHẬP KHU NUÔI SỢI", userName, [
                            { label: "Vị trí giàn", value: `Giàn ${id}` },
                            { label: "Mã Lô", value: b },
                            { label: "Số lượng nhập", value: `${q.toLocaleString()} bịch` }
                        ], "Phôi được kiểm tra và xếp lên giàn chờ ủ tơ.");
                    }
                }, 300);
            };

            document.getElementById('btn-save-xuat').onclick = async () => {
                const sourceBatch = document.getElementById('ns-x-source').value;
                if(!sourceBatch) return Utils.toast("Chưa chọn Mã Lô để xuất!", "err");

                const qDat = Number(document.getElementById('ns-x-dat').value) || 0; const targetHouse = document.getElementById('ns-x-house').value;
                const qTD = Number(document.getElementById('ns-x-td').value) || 0; const targetHouseTD = document.getElementById('ns-x-td-house').value;
                const qHuy = Number(document.getElementById('ns-x-huy').value) || 0;

                const totalExport = qDat + qTD + qHuy;
                if(totalExport <= 0) return Utils.toast("Chưa nhập số lượng để xuất!", "err");
                
                if(totalExport > batches[sourceBatch]) {
                    alert(`❌ CẢNH BÁO: KHO KHÔNG ĐỦ PHÔI!\n\nLô ${sourceBatch} trên giàn chỉ còn ${batches[sourceBatch]} bịch.\nBạn đang cố gắng xuất ra ${totalExport} bịch.`);
                    return Utils.toast(`Vượt quá số lượng tồn của Lô ${sourceBatch}!`, "err");
                }
                
                if(qDat > 0 && !targetHouse) return Utils.toast("Vui lòng chọn Nhà Trồng cho phôi Đạt!", "err");
                if(qTD > 0 && !targetHouseTD) return Utils.toast("Vui lòng chọn Nhà Trồng cho phôi Tận Dụng!", "err");

                const batchDb = writeBatch(db);
                const houseAId = houseA?.id || 'KHO_TONG';

                batches[sourceBatch] -= totalExport;
                if(batches[sourceBatch] <= 0) delete batches[sourceBatch];
                batchDb.set(doc(db, `${ROOT_PATH}/nuoisoi_A`, id), { batches: batches, time: Date.now(), batch: '', qty: 0 }, { merge: true });

                const dObj = new Date();
                const dateStr = ('0' + dObj.getDate()).slice(-2) + '/' + ('0' + (dObj.getMonth()+1)).slice(-2) + '/' + dObj.getFullYear().toString().slice(-2);

                if(qDat > 0) {
                    const codeDat = `${sourceBatch}D-${dateStr}`;
                    batchDb.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'EXPORT', from:houseAId, to:targetHouse, code:codeDat, qty:qDat, user:userName, time:Date.now() });
                    batchDb.update(doc(db, `${ROOT_PATH}/houses`, targetHouse), { status:'ACTIVE', batchQty: increment(qDat), currentBatch:codeDat });
                }
                if(qTD > 0) {
                    const codeTD = `${sourceBatch}TD-${dateStr}`;
                    batchDb.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'EXPORT', from:houseAId, to:targetHouseTD, code:codeTD, qty:qTD, user:userName, time:Date.now() });
                    batchDb.update(doc(db, `${ROOT_PATH}/houses`, targetHouseTD), { status:'ACTIVE', batchQty: increment(qTD), currentBatch:codeTD });
                }
                if(qHuy > 0) {
                    const codeHuy = `${sourceBatch}HUY-${dateStr}`;
                    batchDb.set(doc(collection(db, `${ROOT_PATH}/supplies`)), { type:'DESTROY', from:houseAId, to:'HUY', code:codeHuy, qty:qHuy, user:userName, time:Date.now() });
                }

                await batchDb.commit(); Utils.modal(null); Utils.toast("🚀 Đã xuất và tạo mã lô tự động!");

                setTimeout(() => {
                    if(confirm("Bạn có muốn xuất PHIẾU LỌC & CHUYỂN NHÀ không?")) {
                        let items = [{ label: "Xuất từ Giàn", value: id }, { label: "Mã Lô", value: sourceBatch }];
                        if(qDat > 0) { const hName = houses.find(x=>x.id===targetHouse)?.name||''; items.push({ label: `Phôi đạt ➔ ${hName}`, value: `${qDat.toLocaleString()} bịch` }); }
                        if(qTD > 0) { const hNameTD = houses.find(x=>x.id===targetHouseTD)?.name||''; items.push({ label: `Tận dụng ➔ ${hNameTD}`, value: `${qTD.toLocaleString()} bịch` }); }
                        if(qHuy > 0) items.push({ label: `Hư hỏng ➔ Bãi Hủy`, value: `${qHuy.toLocaleString()} bịch` });
                        window.showReceipt("PHIẾU LỌC & XUẤT PHÔI", userName, items, "Kiểm tra kỹ tình trạng nhiễm mốc trước khi xuất.");
                    }
                }, 300);
            };
        }, 100);
    }
};

export const NuoiSoi = {
    render: (data, user) => {
        const c = document.getElementById('view-nuoisoi'); if(!c || c.classList.contains('hidden')) return;
        const role = (user.role || '').toLowerCase(); 
        const isManager = ['admin', 'giám đốc', 'quản lý', 'tổ trưởng'].some(r => role.includes(r));
        if(!isManager) { c.innerHTML = '<div class="p-10 text-center text-red-500 font-bold">Bạn không có quyền xem khu vực này.</div>'; return; }

        window._tempHouses = (Array.isArray(data.houses) ? data.houses : []).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        window._tempHouseA = window._tempHouses.find(h => ['nhà a','kho a', 'kho phôi', 'kho tổng', 'nuôi sợi'].some(n => (h.name||'').toLowerCase().includes(n)));

        const racks = Array.isArray(data.nuoisoi_A) ? data.nuoisoi_A : [];
        window._tempNuoiSoiData = racks; 

        const getRack = (id) => racks.find(r => r.id === id) || { batches: {} };

        let grid = `<div class="grid grid-cols-[1fr_50px_1fr] gap-y-1.5 gap-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 relative overflow-hidden"><div class="bg-blue-100 text-blue-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-blue-200" style="grid-column: 1; grid-row: 1;">Hệ quạt</div><div class="bg-blue-100 text-blue-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-blue-200" style="grid-column: 3; grid-row: 1;">Hệ quạt</div><div class="flex items-center justify-center bg-stone-300 border-x-2 border-stone-400 shadow-inner relative" style="grid-column: 2; grid-row: 1 / span 27;"><div class="absolute inset-0 w-0.5 border-l-2 border-dashed border-white mx-auto opacity-70"></div><span class="rotate-90 text-stone-600 font-black tracking-widest text-[10px] whitespace-nowrap z-10 bg-stone-300 px-3 py-1 rounded-full border border-stone-400/50 shadow-sm">LỐI ĐI XE NỘI BỘ</span></div>`;

        const totalRows = 25;
        for(let i = totalRows; i >= 1; i--) {
            const bId = `B${i}`; const aId = `A${i}`; const bData = getRack(bId); const aData = getRack(aId); const currentRow = totalRows - i + 2; 
            
            const renderCell = (id, rack, col, row) => {
                let bMap = rack.batches || {};
                if(rack.batch && rack.qty) bMap[rack.batch] = (bMap[rack.batch]||0) + Number(rack.qty); 
                let totalQ = 0; let codes = [];
                Object.entries(bMap).forEach(([c, q]) => { if(q > 0) { totalQ += q; codes.push(c); } });
                
                const hasData = totalQ > 0;
                const isReady = totalQ >= 1000; 
                const displayCode = codes.length > 1 ? `${codes.length} Lô phôi` : (codes[0] || 'Trống');
                
                let cellClass = 'border-slate-200'; let badgeHtml = '<span class="text-[8px] text-slate-300">Trống</span>'; let qtyHtml = '<span class="text-slate-300">--</span>';

                if(hasData) {
                    if(isReady) {
                        cellClass = 'border-purple-500 shadow-md bg-purple-50';
                        badgeHtml = `<span class="text-[8px] bg-purple-200 text-purple-800 px-1 rounded font-bold truncate max-w-[65px]">${displayCode}</span>`;
                        qtyHtml = `<span class="text-purple-700 font-black">${totalQ.toLocaleString()}</span>`;
                    } else {
                        cellClass = 'border-blue-400 shadow-md bg-blue-50/30';
                        badgeHtml = `<span class="text-[8px] bg-green-100 text-green-700 px-1 rounded font-bold truncate max-w-[65px]">${displayCode}</span>`;
                        qtyHtml = `<span class="text-blue-600 font-black">${totalQ.toLocaleString()}</span>`;
                    }
                }
                const rackDataStr = encodeURIComponent(JSON.stringify({ batches: bMap }));
                return `<div style="grid-column: ${col}; grid-row: ${row};" onclick="window.NuoiSoi_Action.edit('${id}', '${rackDataStr}', '${user.name}')" class="bg-white border ${cellClass} p-1.5 rounded cursor-pointer active:scale-95 transition flex flex-col justify-center min-h-[45px] hover:border-purple-400"><div class="flex justify-between items-center border-b border-slate-100 pb-0.5 mb-1"><span class="text-[10px] font-black text-slate-700">Giàn ${id}</span>${badgeHtml}</div><div class="text-[10px] text-slate-500 font-bold">SL: ${qtyHtml}</div></div>`;
            };
            grid += renderCell(bId, bData, 1, currentRow); grid += renderCell(aId, aData, 3, currentRow); 
        }
        grid += `<div class="bg-cyan-100 text-cyan-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-cyan-200" style="grid-column: 1; grid-row: 27;">Hệ cooling</div><div class="bg-cyan-100 text-cyan-700 text-center text-[10px] font-bold py-2 rounded shadow-sm border border-cyan-200" style="grid-column: 3; grid-row: 27;">Hệ cooling</div></div>`;
        c.innerHTML = `<div class="space-y-4 pb-24 animate-fade-in"><div class="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm"><div><h2 class="font-black text-blue-800 text-lg uppercase">SƠ ĐỒ NHÀ NUÔI SỢI A</h2><p class="text-[10px] text-blue-500 font-bold">Dãy B (Trái) - Dãy A (Phải). Bấm để Thêm/Xuất Lô.</p></div></div>${grid}</div>`;
    }
};
