// ĐƯỜNG DẪN: js/modules/thdg.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(!c || c.classList.contains('hidden')) return;

        try {
            // 1. DATA SAFE (Chống undefined)
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            
            // Sắp xếp nhà an toàn
            const sorted = [...houses].sort((a,b) => (a.name||"").localeCompare(b.name||"", 'vi', {numeric:true}));
            
            // Lọc sản phẩm an toàn (check p tồn tại trước khi check group)
            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');
            const g3 = products.filter(p => p && String(p.group) === '3');

            // 2. HTML GIAO DIỆN (Nguyên bản 3 màu)
            c.innerHTML = `
            <div class="space-y-4 pb-24">
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
                        <button id="btn-add-prod" class="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-blue-600 font-bold border border-blue-100 shadow-sm">+ Mã Mới</button>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Nguồn thu</label>
                            <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none">
                                <option value="">-- Chọn Nhà / Khu --</option>
                                ${sorted.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
                                <option value="ThuMuaNgoai">Thu Mua Ngoài</option>
                            </select>
                        </div>

                        ${g1.length ? `
                        <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                            <h4 class="text-[10px] font-bold text-green-700 uppercase mb-2">1. Nấm Tươi (Kg)</h4>
                            <div class="grid grid-cols-3 gap-3">
                                ${g1.map(p => `<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 text-green-700 bg-white" placeholder="0"></div>`).join('')}
                            </div>
                        </div>` : ''}

                        ${g2.length ? `
                        <div class="bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <h4 class="text-[10px] font-bold text-orange-700 uppercase mb-2">2. Nấm Khô (Kg)</h4>
                            <div class="grid grid-cols-3 gap-3">
                                ${g2.map(p => `<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 text-orange-700 bg-white" placeholder="0"></div>`).join('')}
                            </div>
                        </div>` : ''}

                        ${g3.length ? `
                        <div class="bg-purple-50 p-3 rounded-xl border border-purple-100">
                            <h4 class="text-[10px] font-bold text-purple-700 uppercase mb-2">3. Sơ Chế / TP</h4>
                            <div class="grid grid-cols-3 gap-3">
                                ${g3.map(p => `<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded-lg border border-slate-200 text-purple-700 bg-white" placeholder="0"></div>`).join('')}
                            </div>
                        </div>` : ''}

                        <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg mt-2">LƯU KHO</button>
                    </div>
                </div>

                <div id="zone-th-out" class="hidden glass p-5 border-l-4 border-orange-500 animate-pop">
                    <h4 class="font-black text-slate-700 uppercase mb-4"><i class="fas fa-shipping-fast text-orange-600"></i> Xuất Bán</h4>
                    <div class="space-y-3">
                        <input id="ship-cust" placeholder="Khách hàng" class="font-bold">
                        <input id="ship-qty" type="number" placeholder="Số lượng" class="font-bold text-lg text-orange-600">
                        <button id="btn-submit-ship" class="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg">XUẤT KHO</button>
                    </div>
                </div>
            </div>`;

            // 3. GẮN SỰ KIỆN
            setTimeout(() => {
                // Tab
                document.querySelectorAll('.btn-tab-th').forEach(btn => {
                    btn.onclick = () => {
                        const target = btn.dataset.target;
                        document.getElementById('zone-th-in').classList.toggle('hidden', target !== 'in');
                        document.getElementById('zone-th-out').classList.toggle('hidden', target !== 'out');
                        // Update Style...
                        document.querySelectorAll('.btn-tab-th').forEach(b => {
                            b.classList.toggle('bg-green-100', b === btn);
                            b.classList.toggle('text-green-700', b === btn);
                            b.classList.toggle('text-slate-400', b !== btn);
                        });
                    }
                });

                // Lưu Nhập Kho
                const btnSave = document.getElementById('btn-save-th');
                if(btnSave) {
                    const newBtn = btnSave.cloneNode(true);
                    btnSave.parentNode.replaceChild(newBtn, btnSave);
                    newBtn.onclick = async () => {
                        const area = document.getElementById('th-area').value;
                        if(!area) return Utils.toast("Chưa chọn Nguồn thu!", "err");
                        let d = {}, total = 0;
                        products.forEach(p => { 
                            if(!p || !p.code) return;
                            const el = document.getElementById(`th-${p.code}`); 
                            if(el && Number(el.value) > 0) { 
                                d[p.code] = Number(el.value); 
                                total += Number(el.value);
                                el.value = ''; 
                            } 
                        });
                        if(total === 0) return Utils.toast("Chưa nhập số lượng!", "err");
                        await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details: d, total, user: user.name, time: Date.now() });
                        Utils.toast(`✅ Đã nhập: ${total} kg`);
                    };
                }
                
                // Add Product
                const btnAddProd = document.getElementById('btn-add-prod');
                if(btnAddProd) {
                    btnAddProd.onclick = () => {
                         Utils.modal("Thêm Mã Hàng Mới", `
                            <div><label class="text-xs font-bold text-slate-500">Tên</label><input id="new-prod-name" class="w-full p-2 border rounded font-bold"></div>
                            <div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" class="w-full p-2 border rounded"></div>
                            <div><select id="new-prod-group" class="w-full p-2 border rounded"><option value="1">1. Tươi</option><option value="2">2. Khô</option><option value="3">3. Sơ Chế</option></select></div>`, 
                            [{id:'submit-new-prod', text:'Lưu Mã', cls:'bg-blue-600 text-white'}]);
                        setTimeout(() => document.getElementById('submit-new-prod').onclick = async () => {
                            const n = document.getElementById('new-prod-name').value;
                            const c = document.getElementById('new-prod-code').value;
                            const g = document.getElementById('new-prod-group').value;
                            if(n && c) { await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g }); Utils.modal(null); Utils.toast("Đã thêm!"); }
                        }, 100);
                    }
                }
                
                // Xuất kho
                 const btnShip = document.getElementById('btn-submit-ship');
                 if(btnShip) {
                     btnShip.onclick = async () => {
                         const c = document.getElementById('ship-cust').value;
                         const q = document.getElementById('ship-qty').value;
                         if(!c || !q) return Utils.toast("Thiếu thông tin!", "err");
                         await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, qty: Number(q), user: user.name, time: Date.now() });
                         Utils.toast("🚚 Đã xuất!");
                     }
                 }

            }, 100);

        } catch (e) {
            c.innerHTML = `<div class="p-4 text-red-500 text-center">Lỗi THDG: ${e.message}</div>`;
        }
    }
};
