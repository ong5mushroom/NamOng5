import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(c.classList.contains('hidden')) return;
        
        const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        
        // 1. Phân loại 3 nhóm theo yêu cầu
        const g1 = data.products.filter(p => p.group == '1'); // Nấm Tươi
        const g2 = data.products.filter(p => p.group == '2'); // Nấm Khô
        const g3 = data.products.filter(p => p.group == '3'); // Nấm Sơ Chế
        
        // Lấy lịch sử xuất hàng 48h
        const recentLogs = data.shipping.filter(s => (Date.now() - s.time) < 172800000).sort((a,b)=>b.time-a.time);

        c.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm transition-all btn-tab-th" data-target="in">
                    <i class="fas fa-arrow-down"></i> NHẬP KHO
                </button>
                <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50 transition-all btn-tab-th" data-target="out">
                    <i class="fas fa-arrow-up"></i> XUẤT BÁN
                </button>
            </div>

            <div id="zone-th-in" class="glass p-5 border-l-4 border-green-500 animate-pop">
                <div class="flex justify-between items-center mb-4">
                    <span class="font-black text-slate-700 uppercase flex items-center gap-2">
                        <i class="fas fa-warehouse text-green-600"></i> Nhập Kho
                    </span>
                    <button id="btn-add-prod" class="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-blue-600 font-bold border border-blue-100 shadow-sm">
                        + Mã Mới
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Nguồn thu</label>
                        <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none">
                            <option value="">-- Chọn Nhà / Khu --</option>
                            ${sorted.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}
                            <option value="KhuCheBien">Khu Chế Biến</option>
                            <option value="ThuMuaNgoai">Thu Mua Ngoài</option>
                        </select>
                    </div>

                    ${g1.length ? `
                    <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                        <h4 class="text-[10px] font-bold text-green-700 uppercase mb-2 flex items-center gap-1"><i class="fas fa-leaf"></i> 1. Nấm Tươi (Kg)</h4>
                        <div class="grid grid-cols-3 gap-3">
                            ${g1.map(p=>`
                                <div>
                                    <label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label>
                                    <input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 text-green-700" placeholder="0">
                                </div>`).join('')}
                        </div>
                    </div>` : ''}

                    ${g2.length ? `
                    <div class="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <h4 class="text-[10px] font-bold text-orange-700 uppercase mb-2 flex items-center gap-1"><i class="fas fa-sun"></i> 2. Nấm Khô (Kg)</h4>
                        <div class="grid grid-cols-3 gap-3">
                            ${g2.map(p=>`
                                <div>
                                    <label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label>
                                    <input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 focus:border-orange-500 text-orange-700" placeholder="0">
                                </div>`).join('')}
                        </div>
                    </div>` : ''}

                    ${g3.length ? `
                    <div class="bg-purple-50 p-3 rounded-xl border border-purple-100">
                        <h4 class="text-[10px] font-bold text-purple-700 uppercase mb-2 flex items-center gap-1"><i class="fas fa-box-open"></i> 3. Sơ Chế / TP</h4>
                        <div class="grid grid-cols-3 gap-3">
                            ${g3.map(p=>`
                                <div>
                                    <label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label>
                                    <input type="number" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 focus:border-purple-500 text-purple-700" placeholder="0">
                                </div>`).join('')}
                        </div>
                    </div>` : ''}

                    <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 active:scale-95 transition mt-2">LƯU KHO</button>
                </div>
            </div>

            <div id="zone-th-out" class="hidden glass p-5 border-l-4 border-orange-500 animate-pop">
                <h4 class="font-black text-slate-700 uppercase mb-4 flex items-center gap-2">
                    <i class="fas fa-shipping-fast text-orange-600"></i> Xuất Bán / Chuyển
                </h4>
                <div class="space-y-3">
                    <input id="ship-cust" placeholder="Khách hàng / Đối tác" class="font-bold">
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Mã hàng</label>
                            <select id="ship-type" class="w-full p-3 border rounded-xl bg-white font-bold text-slate-700">
                                <option value="">-- Chọn --</option>
                                <optgroup label="1. Nấm Tươi">${g1.map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</optgroup>
                                <optgroup label="2. Nấm Khô">${g2.map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</optgroup>
                                <optgroup label="3. Sơ Chế">${g3.map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</optgroup>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Số lượng</label>
                            <input id="ship-qty" type="number" placeholder="0" class="font-bold text-lg text-orange-600">
                        </div>
                    </div>
                    
                    <textarea id="ship-note" placeholder="Ghi chú xuất hàng..." class="h-20"></textarea>
                    
                    <button id="btn-submit-ship" class="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition">XUẤT KHO</button>
                </div>

                <div class="mt-6 pt-4 border-t border-slate-200">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Nhật ký xuất (48h qua)</p>
                    <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
                        ${recentLogs.length ? recentLogs.map(l=>`
                            <div class="flex justify-between items-center text-xs p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <div>
                                    <div class="font-bold text-slate-700">${l.customer}</div>
                                    <div class="text-[9px] text-slate-400">${new Date(l.time).toLocaleString('vi-VN')}</div>
                                </div>
                                <div class="font-black text-orange-600 text-sm">${l.qty} <span class="text-[10px
