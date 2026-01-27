import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

const COMPANY = { 
    name: "CÔNG TY TNHH NẤM ÔNG 5", address: "Lạc Dương, Lâm Đồng", mst: "5801474272", hotline: "0899.49.0808", slogan: "Trao sức khỏe, trọn yêu thương" 
};

// --- FIX LỖI XÓA (Gắn vào window) ---
window.THDG_Fix = {
    delOne: async (id) => {
        if(confirm("⚠️ Xóa mã sản phẩm này?")) {
            try { await deleteDoc(doc(db, `${ROOT_PATH}/products`, id)); Utils.toast("Đã xóa!"); } 
            catch (e) { alert("Lỗi: " + e.message); }
        }
    }
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;
        if (!data) { c.innerHTML = '...'; return; }

        try {
            const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
            const products = Array.isArray(data.products) ? data.products : [];
            const logs = Array.isArray(data.harvest) ? data.harvest : [];
            
            // ... (Logic ngày tháng giữ nguyên) ...
            const todayStr = new Date().toDateString();
            const todayLogs = (data.shipping || []).filter(s => new Date(s.time).toDateString() === todayStr);
            const y = new Date(); y.setDate(y.getDate()-1);
            const yHarvest = logs.filter(l => new Date(l.time).toDateString() === y.toDateString());
            const yShips = (data.shipping||[]).filter(s => new Date(s.time).toDateString() === y.toDateString());

            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');
            const g3 = products.filter(p => p && String(p.group) === '3');

            // Render Row: Sử dụng window.THDG_Fix.delOne
            const renderRow = (p) => `
                <div class="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200">
                    <div class="flex items-center gap-1 overflow-hidden">
                        ${isAdmin ? `<button onclick="window.THDG_Fix.delOne('${p._id}')" class="text-red-300 hover:text-red-600 px-1 font-bold">✕</button>` : ''}
                        <span class="text-[10px] font-bold text-slate-600 truncate w-20" title="${p.name}">${p.name}</span>
                    </div>
                    <input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-slate-700 border border-slate-300 rounded text-xs" placeholder="0">
                </div>`;

            c.innerHTML = `
            <div class="space-y-5 pb-24">
                <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow" id="btn-tab-in">THU HOẠCH</button>
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100" id="btn-tab-out">XUẤT BÁN</button>
                </div>

                <div id="zone-harvest" class="animate-pop">
                    <div class="glass p-5 border-l-8 border-green-500 bg-green-50/40">
                        <div class="flex justify-between items-center mb-4"><h3 class="font-black text-green-800 text-xs flex items-center gap-2"><i class="fas fa-warehouse text-lg"></i> NHẬP KHO</h3>${isAdmin ? `<button id="btn-add-prod" class="bg-white border text-green-700 px-2 py-1 rounded text-[10px] font-bold">+ Mã SP</button>`:''}</div>
                        <div class="space-y-3">
                            <div class="flex gap-2"><div class="w-1/3"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Ngày Thu</label><input type="date" id="h-date" class="w-full p-2 rounded border text-xs font-bold"></div><div class="flex-1"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Nguồn Thu</label><select id="h-area" class="w-full p-2 rounded border text-xs font-bold"><option value="">-- Chọn --</option>${(data.houses||[]).map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}<option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option></select></div></div>
                            ${g1.length ? `<div class="bg-green-50 p-2 rounded border border-green-200"><div class="text-[10px] font-bold text-green-700 mb-1">Nấm Tươi</div><div class="grid grid-cols-2 gap-2">${g1.map(renderRow).join('')}</div></div>`:''}
                            ${g2.length ? `<div class="bg-orange-50 p-2 rounded border border-orange-200"><div class="text-[10px] font-bold text-orange-700 mb-1">Phụ Phẩm</div><div class="grid grid-cols-2 gap-2">${g2.map(renderRow).join('')}</div></div>`:''}
                            ${g3.length ? `<div class="bg-purple-50 p-2 rounded border border-purple-200"><div class="text-[10px] font-bold text-purple-700 mb-1">Sơ Chế</div><div class="grid grid-cols-2 gap-2">${g3.map(renderRow).join('')}</div></div>`:''}
                            <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded font-bold text-xs shadow-lg">LƯU KHO</button>
                            <div class="mt-4 pt-2 border-t border-green-200"><span class="text-[9px] font-bold text-slate-400 uppercase">Hôm qua</span><div class="max-h-24 overflow-y-auto space-y-1 mt-1">${yHarvest.length ? yHarvest.map(l=>`<div class="flex justify-between text-[10px] bg-white p-1 rounded border"><span>${l.area}</span><span class="font-bold text-green-600">${l.total}kg</span></div>`).join('') : '<div class="text-[10px] text-slate-300 italic">Không có</div>'}</div></div>
                        </div>
                    </div>
                </div>

                <div id="zone-sell" class="hidden animate-pop">
                    <div class="glass p-5 border-l-8 border-orange-500 bg-orange-50/40">
                        <div class="flex justify-between items-center mb-4"><h3 class="font-black text-orange-800 text-xs flex items-center gap-2"><i class="fas fa-truck text-lg"></i> XUẤT BÁN</h3>${isAdmin?`<button id="btn-rep-day" class="bg-white border text-orange-700 px-2 py-1 rounded text-[10px] font-bold">BC Ngày</button>`:''}</div>
                        <div class="space-y-3 bg-white p-3 rounded shadow-sm border border-orange-100">
                            <div class="grid grid-cols-1 gap-2"><input id="s-cust" placeholder="Khách Hàng" class="w-full p-2 text-xs border rounded font-bold"><textarea id="s-note" placeholder="Ghi chú..." class="w-full p-2 text-xs border rounded h-10"></textarea></div>
                            <div class="bg-slate-50 p-2 rounded border border-slate-200"><div class="flex gap-2 mb-2"><select id="s-prod" class="flex-1 p-2 text-xs border rounded font-bold"><option value="">-- Chọn Nấm --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select></div><div class="flex gap-2 items-center"><input id="s-qty" type="number" placeholder="SL" class="w-16 p-2 text-xs border rounded text-center font-bold"><span class="text-xs">x</span><input id="s-price" type="number" placeholder="Giá" class="w-20 p-2 text-xs border rounded text-center"><button id="btn-add-cart" class="flex-1 bg-orange-500 text-white p-2 rounded font-bold text-xs">THÊM</button></div></div>
                            <div class="border-t pt-2"><div id="cart-list" class="space-y-1 mb-2 text-xs"></div><div class="flex justify-between text-sm font-black text-orange-800"><span>TỔNG:</span><span id="cart-total">0</span></div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-4"><button id="btn-save-sell" class="py-2 bg-orange-600 text-white rounded font-bold text-xs">LƯU & TRỪ KHO</button><button id="btn-print" class="py-2 bg-blue-600 text-white rounded font-bold text-xs">IN PHIẾU</button></div>
                        <div class
