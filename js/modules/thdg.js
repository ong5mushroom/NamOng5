// ĐƯỜNG DẪN: js/modules/thdg.js
import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, getDoc } from '../config.js';
import { Utils } from '../utils.js';

const COMPANY_INFO = { 
    name: "CÔNG TY TNHH NẤM ÔNG 5", 
    address: "Thôn Đa Ra Hoa, xã Lạc Dương, Tỉnh Lâm Đồng", 
    mst: "5801474272", 
    contact: "0983.59.0808 - Hotline: 0899.49.0808",
    web: "ong5mushroom.com",
    slogan: '"Trao sức khỏe, trọn yêu thương"'
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        // Data Safe
        const houses = Array.isArray(data.houses) ? data.houses : [];
        const products = Array.isArray(data.products) ? data.products : [];
        // Lấy tồn kho từ collection riêng hoặc tính toán (ở đây giả sử có collection 'warehouse_stock')
        // Để đơn giản, ta sẽ dùng data.products để hiển thị list, tồn kho sẽ hiển thị realtime khi chọn
        
        // Phân nhóm sản phẩm
        const g1 = products.filter(p => p.group == '1'); // Nấm Tươi
        const g2 = products.filter(p => p.group == '2'); // Phụ Phẩm
        const g3 = products.filter(p => p.group == '3'); // Sơ Chế

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow-md transition-all" id="btn-tab-harvest">
                    <i class="fas fa-leaf mr-1"></i> THU HOẠCH
                </button>
                <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all" id="btn-tab-sell">
                    <i class="fas fa-shopping-cart mr-1"></i> XUẤT BÁN
                </button>
            </div>

            <div id="zone-harvest" class="glass p-5 border-l-8 border-green-500 bg-green-50/30 animate-pop">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-black text-green-800 uppercase text-xs flex items-center gap-2">
                        <i class="fas fa-warehouse text-lg"></i> NHẬP KHO THÀNH PHẨM
                    </h3>
                    <button id="btn-new-code" class="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-green-50">
                        + Mã Mới
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Nguồn Thu (Nhà Nấm)</label>
                        <select id="h-house" class="w-full p-3 rounded-xl border border-green-200 font-bold text-green-800 outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">-- Chọn Nhà --</option>
                            ${houses.map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}
                            <option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option>
                        </select>
                    </div>

                    <div class="space-y-3">
                        ${g1.length ? `
                        <div class="bg-white p-3 rounded-xl border border-green-100 shadow-sm">
                            <div class="text-[10px] font-black text-green-600 uppercase mb-2 border-b border-green-50 pb-1">1. Nấm Tươi</div>
                            <div class="grid grid-cols-2 gap-2">
                                ${g1.map(p => `<div class="flex items-center justify-between bg-green-50 p-2 rounded-lg"><span class="text-[10px] font-bold text-slate-600 truncate w-16" title="${p.name}">${p.name}</span><input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-green-700 bg-white border border-green-200 rounded focus:outline-none" placeholder="0"></div>`).join('')}
                            </div>
                        </div>` : ''}

                        ${g2.length ? `
                        <div class="bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                            <div class="text-[10px] font-black text-orange-600 uppercase mb-2 border-b border-orange-50 pb-1">2. Phụ Phẩm (Chân/Vụn)</div>
                            <div class="grid grid-cols-2 gap-2">
                                ${g2.map(p => `<div class="flex items-center justify-between bg-orange-50 p-2 rounded-lg"><span class="text-[10px] font-bold text-slate-600 truncate w-16" title="${p.name}">${p.name}</span><input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-orange-700 bg-white border border-orange-200 rounded focus:outline-none" placeholder="0"></div>`).join('')}
                            </div>
                        </div>` : ''}

                        ${g3.length ? `
                        <div class="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                            <div class="text-[10px] font-black text-purple-600 uppercase mb-2 border-b border-purple-50 pb-1">3. Sơ Chế / Khô</div>
                            <div class="grid grid-cols-2 gap-2">
                                ${g3.map(p => `<div class="flex items-center justify-between bg-purple-50 p-2 rounded-lg"><span class="text-[10px] font-bold text-slate-600 truncate w-16" title="${p.name}">${p.name}</span><input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-purple-700 bg-white border border-purple-200 rounded focus:outline-none" placeholder="0"></div>`).join('')}
                            </div>
                        </div>` : ''}
                    </div>

                    <button id="btn-save-harvest" class="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-sm shadow-lg shadow-green-200 active:scale-95 transition flex items-center justify-center gap-2">
                        <i class="fas fa-save"></i> LƯU KHO & CẬP NHẬT NHÀ
                    </button>
                </div>
            </div>

            <div id="zone-sell" class="hidden glass p-5 border-l-8 border-orange-500 bg-orange-50/30 animate-pop">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-black text-orange-800 uppercase text-xs flex items-center gap-2">
                        <i class="fas fa-truck text-lg"></i> XUẤT BÁN HÀNG
                    </h3>
                    <button id="btn-report-day" class="bg-white border border-orange-200 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-orange-50">
                        <i class="fas fa-file-csv mr-1"></i> BC Ngày
                    </button>
                </div>

                <div class="space-y-3 bg-white p-3 rounded-xl shadow-sm border border-orange-100">
                    <div class="grid grid-cols-1 gap-2">
                        <input id="s-cust" placeholder="Tên Khách Hàng" class="w-full p-2 text-xs border rounded font-bold uppercase">
                        <textarea id="s-note" placeholder="Ghi chú đơn hàng..." class="w-full p-2 text-xs border rounded h-12"></textarea>
                    </div>

                    <div class="bg-slate-50 p-2 rounded border border-slate-200">
                        <div class="flex gap-2 mb-2">
                            <select id="s-prod" class="flex-1 p-2 text-xs border rounded font-bold">
                                <option value="">-- Chọn Nấm --</option>
                                ${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}" data-stock="${p.stock||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex gap-2 items-center">
                            <input id="s-qty" type="number" placeholder="SL" class="w-16 p-2 text-xs border rounded text-center font-bold">
                            <span class="text-xs font-bold text-slate-400">x</span>
                            <input id="s-price" type="number" placeholder="Giá bán" class="w-24 p-2 text-xs border rounded text-center font-bold">
                            <button id="btn-add-cart" class="flex-1 bg-orange-500 text-white p-2 rounded font-bold text-xs shadow hover:bg-orange-600">THÊM</button>
                        </div>
                    </div>

                    <div class="border-t border-dashed border-orange-200 pt-2">
                        <div id="cart-list" class="space-y-1 mb-2"></div>
                        <div class="flex justify-between items-center text-sm font-black text-orange-800 bg-orange-100 p-2 rounded">
                            <span>TỔNG TIỀN:</span>
                            <span id="cart-total">0</span> <span class="text-[10px]">VNĐ</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-4">
                    <button id="btn-save-sell" class="py-3 bg-orange-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition">
                        LƯU & TRỪ KHO
                    </button>
                    <button id="btn-print-bill" class="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition">
                        <i class="fas fa-print mr-1"></i> IN HÓA ĐƠN
                    </button>
                </div>
            </div>
        </div>`;

        // BIẾN TOÀN CỤC CHO CART
        let cart = [];

        // HÀM RENDER GIỎ HÀNG
        const updateCartUI = () => {
            const el = document.getElementById('cart-list');
            if(!el) return;
            el.innerHTML = cart.map((i, idx) => `
                <div class="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span class="font-bold text-slate-700">${i.name}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500">${i.qty} x ${Number(i.price).toLocaleString()}</span>
                        <span class="font-black text-orange-600">${(i.qty*i.price).toLocaleString()}</span>
                        <button class="text-red-400 hover:text-red-600" onclick="document.getElementById('del-cart-${idx}').click()"><i class="fas fa-times"></i></button>
                        <button id="del-cart-${idx}" class="hidden"></button>
                    </div>
                </div>
            `).join('');
            
            const total = cart.reduce((acc, i) => acc + (i.qty * i.price), 0);
            document.getElementById('cart-total').innerText = total.toLocaleString();

            // Gắn lại sự kiện xóa
            cart.forEach((_, idx) => {
                const btn = document.getElementById(`del-cart-${idx}`);
                if(btn) btn.onclick = () => { cart.splice(idx, 1); updateCartUI(); };
            });
        };

        // GẮN SỰ KIỆN (EVENTS)
        setTimeout(() => {
            // 1. CHUYỂN TAB
            const bIn = document.getElementById('btn-tab-harvest');
            const bOut = document.getElementById('btn-tab-sell');
            const zIn = document.getElementById('zone-harvest');
            const zOut = document.getElementById('zone-sell');

            if(bIn && bOut) {
                bIn.onclick = () => {
                    zIn.classList.remove('hidden'); zOut.classList.add('hidden');
                    bIn.classList.replace('text-slate-500', 'text-white'); bIn.classList.replace('bg-slate-100', 'bg-green-600');
                    bOut.classList.replace('text-white', 'text-slate-500'); bOut.classList.replace('bg-orange-600', 'hover:bg-slate-100');
                };
                bOut.onclick = () => {
                    zIn.classList.add('hidden'); zOut.classList.remove('hidden');
                    bOut.classList.remove('hover:bg-slate-100'); bOut.classList.add('bg-orange-600', 'text-white'); bOut.classList.remove('text-slate-500');
                    bIn.classList.replace('bg-green-600', 'bg-slate-100'); bIn.classList.replace('text-white', 'text-slate-500');
                };
            }

            // 2. THÊM MÃ SẢN PHẨM MỚI
            const btnAddP = document.getElementById('btn-add-prod');
            if(btnAddP) btnAddP.onclick = () => {
                Utils.modal("Thêm Mã Mới", `
                    <label class="text-[10px] font-bold uppercase text-slate-500">Tên SP</label>
                    <input id="np-name" class="w-full p-2 border rounded mb-2 font-bold" placeholder="VD: Nấm Mỡ A1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Mã (Viết liền)</label>
                    <input id="np-code" class="w-full p-2 border rounded mb-2" placeholder="VD: nammo_a1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Nhóm</label>
                    <select id="np-group" class="w-full p-2 border rounded font-bold text-blue-600">
                        <option value="1">1. Nấm Tươi</option>
                        <option value="2">2. Phụ Phẩm</option>
                        <option value="3">3. Sơ Chế</option>
                    </select>
                `, [{id:'save-new-prod', text:'Lưu Mã'}]);
                
                setTimeout(() => document.getElementById('save-new-prod').onclick = async () => {
                    const n = document.getElementById('np-name').value;
                    const c = document.getElementById('np-code').value;
                    const g = document.getElementById('np-group').value;
                    if(n && c) {
                        await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g, stock: 0 });
                        Utils.modal(null); Utils.toast("Đã thêm mã hàng!");
                    }
                }, 100);
            };

            // 3. LƯU THU HOẠCH (CỘNG KHO & CỘNG NHÀ)
            const btnSaveHarvest = document.getElementById('btn-save-th');
            if(btnSaveHarvest) btnSaveHarvest.onclick = async () => {
                const hEl = document.getElementById('h-house');
                const houseId = hEl.value;
                const houseName = hEl.options[hEl.selectedIndex].getAttribute('data-name');
                
                if(!houseId) return Utils.toast("Chưa chọn Nhà!", "err");

                let details = {}, totalKg = 0;
                const batch = db.batch(); // Dùng batch để update nhiều nơi 1 lúc

                // Duyệt qua tất cả sản phẩm để lấy số lượng nhập
                products.forEach(p => {
                    const el = document.getElementById(`in-${p.code}`);
                    if(el && Number(el.value) > 0) {
                        const qty = Number(el.value);
                        details[p.code] = qty;
                        totalKg += qty;
                        
                        // 1. Cộng vào tồn kho (products collection)
                        const prodRef = doc(db, `${ROOT_PATH}/products`, p._id);
                        batch.update(prodRef, { stock: increment(qty) });
                        
                        el.value = ''; // Reset input
                    }
                });

                if(totalKg === 0) return Utils.toast("Chưa nhập số lượng!", "err");

                // 2. Lưu log thu hoạch
                const logRef = doc(collection(db, `${ROOT_PATH}/harvest_logs`));
                batch.set(logRef, {
                    area: houseName,
                    details: details,
                    total: totalKg,
                    user: user.name,
                    time: Date.now()
                });

                // 3. Cộng tổng thu vào Nhà (trừ trường hợp Mua Ngoài)
                if(houseId !== 'MuaNgoai') {
                    const houseRef = doc(db, `${ROOT_PATH}/houses`, houseId);
                    // Lưu ý: Cần chắc chắn field totalYield tồn tại hoặc dùng set merge
                    // Ở đây dùng update đơn giản, nếu lỗi thì cần check lại model house
                    batch.update(houseRef, { totalYield: increment(totalKg) }); 
                }

                await batch.commit();
                Utils.toast(`✅ Đã nhập ${totalKg}kg và cập nhật kho!`);
            };

            // 4. THÊM VÀO GIỎ BÁN
            document.getElementById('btn-add-cart').onclick = () => {
                const prodEl = document.getElementById('s-prod');
                const code = prodEl.value;
                if(!code) return Utils.toast("Chưa chọn hàng!", "err");
                
                const name = prodEl.options[prodEl.selectedIndex].getAttribute('data-name');
                const stock = Number(prodEl.options[prodEl.selectedIndex].getAttribute('data-stock'));
                const qty = Number(document.getElementById('s-qty').value);
                const price = Number(document.getElementById('s-price').value);

                if(qty <= 0) return Utils.toast("Số lượng lỗi!", "err");
                // if(qty > stock) return Utils.toast(`Kho không đủ (Còn ${stock})`, "err"); // Bỏ comment nếu muốn chặn bán âm

                cart.push({code, name, qty, price});
                updateCartUI();
                document.getElementById('s-qty').value = '';
            };

            // 5. LƯU BÁN HÀNG & TRỪ KHO
            document.getElementById('btn-save-sell').onclick = async () => {
                const cust = document.getElementById('s-cust').value;
                if(!cust || cart.length === 0) return Utils.toast("Thiếu tên khách hoặc giỏ hàng!", "err");

                const batch = db.batch();

                // 1. Lưu log bán hàng
                const shipRef = doc(collection(db, `${ROOT_PATH}/shipping`));
                const totalBill = cart.reduce((a,b) => a + (b.qty*b.price), 0);
                
                batch.set(shipRef, {
                    customer: cust,
                    note: document.getElementById('s-note').value,
                    items: cart,
                    total: totalBill,
                    user: user.name,
                    time: Date.now()
                });

                // 2. Trừ tồn kho
                cart.forEach(item => {
                    // Tìm id của product dựa vào code (vì trong cart lưu code)
                    const p = products.find(prod => prod.code === item.code);
                    if(p) {
                        const pRef = doc(db, `${ROOT_PATH}/products`, p._id);
                        batch.update(pRef, { stock: increment(-item.qty) });
                    }
                });

                await batch.commit();
                Utils.toast("Đã lưu đơn và trừ kho!");
                
                // Reset form nhưng giữ lại tên khách để in nếu cần
                cart = []; updateCartUI();
            };

            // 6. IN HÓA ĐƠN
            document.getElementById('btn-print-bill').onclick = () => {
                if(cart.length === 0) return Utils.toast("Giỏ hàng trống!", "err");
                
                const cust = document.getElementById('s-cust').value || 'Khách lẻ';
                const date = new Date().toLocaleString('vi-VN');
                const total = cart.reduce((sum, i) => sum + (i.qty * i.price), 0);

                const w = window.open('', '', 'height=600,width=500');
                w.document.write(`
                    <html>
                    <head>
                        <title>HOA DON BAN LE</title>
                        <style>
                            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                            .center { text-align: center; }
                            .right { text-align: right; }
                            .bold { font-weight: bold; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th, td { border-bottom: 1px dashed #000; padding: 5px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="center">
                            <h3 style="margin:0">${COMPANY_INFO.name}</h3>
                            <p style="margin:2px">ĐC: ${COMPANY_INFO.address}</p>
                            <p style="margin:2px">MST: ${COMPANY_INFO.mst}</p>
                            <p style="margin:2px">Hotline: ${COMPANY_INFO.contact}</p>
                            <p style="margin:2px"><i>${COMPANY_INFO.slogan}</i></p>
                            <br>
                            <h2 style="margin:5px">HÓA ĐƠN BÁN LẺ</h2>
                        </div>
                        <p>Khách hàng: <b>${cust}</b></p>
                        <p>Ngày: ${date}</p>
                        <table>
                            <thead><tr><th class="left">SP</th><th class="center">SL</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr></thead>
                            <tbody>
                                ${cart.map(i => `
                                    <tr>
                                        <td>${i.name}</td>
                                        <td class="center">${i.qty}</td>
                                        <td class="right">${i.price.toLocaleString()}</td>
                                        <td class="right">${(i.qty*i.price).toLocaleString()}</td>
                                    </tr>`).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="right bold" style="padding-top:10px">TỔNG CỘNG:</td>
                                    <td class="right bold" style="padding-top:10px; font-size:14px">${total.toLocaleString()} đ</td>
                                </tr>
                            </tfoot>
                        </table>
                        <div class="center" style="margin-top:20px">
                            <p>Cảm ơn quý khách!</p>
                            <p>Hẹn gặp lại</p>
                        </div>
                    </body>
                    </html>
                `);
                w.document.close();
                w.focus();
                setTimeout(() => w.print(), 500);
            };

            // 7. XUẤT BÁO CÁO NGÀY
            document.getElementById('btn-report-day').onclick = () => {
                // Logic xuất CSV các đơn hàng trong ngày
                const today = new Date().toDateString();
                // Lọc shipping log (cần truy cập data.shipping từ App.data, nhưng ở đây ta chỉ có local scope)
                // Ta sẽ dùng Admin export hoặc gọi hàm global. Ở đây alert tạm.
                Utils.toast("Vui lòng vào Cài đặt -> Xuất báo cáo chi tiết");
            };

        }, 200);
    }
};
