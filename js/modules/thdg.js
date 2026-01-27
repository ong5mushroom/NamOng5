import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment } from '../config.js';
import { Utils } from '../utils.js';

const COMPANY = { 
    name: "CÔNG TY TNHH NẤM ÔNG 5", 
    address: "Thôn Đa Ra Hoa, xã Lạc Dương, Tỉnh Lâm Đồng", 
    mst: "5801474272", hotline: "0899.49.0808", slogan: '"Trao sức khỏe, trọn yêu thương"' 
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        // 1. KIỂM TRA DỮ LIỆU ĐẦU VÀO
        if (!data) { 
            c.innerHTML = '<div class="p-10 text-center text-slate-400">Đang tải dữ liệu...</div>'; 
            return; 
        }

        // 2. BẮT ĐẦU KHỐI BẢO VỆ (TRY-CATCH)
        try {
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const shippingLogs = Array.isArray(data.shipping) ? data.shipping : [];

            // Lọc dữ liệu an toàn (Chỉ lấy sản phẩm có dữ liệu, tránh null/undefined)
            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');
            const g3 = products.filter(p => p && String(p.group) === '3');

            // HTML GIAO DIỆN
            c.innerHTML = `
            <div class="space-y-5 pb-24">
                <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow transition-all" id="btn-tab-in">
                        <i class="fas fa-leaf mr-1"></i> THU HOẠCH
                    </button>
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all" id="btn-tab-out">
                        <i class="fas fa-truck mr-1"></i> XUẤT BÁN
                    </button>
                </div>

                <div id="zone-harvest" class="animate-pop">
                    <div class="glass p-5 border-l-8 border-green-500 bg-green-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-green-800 uppercase text-xs flex items-center gap-2">
                                <i class="fas fa-warehouse text-lg"></i> NHẬP KHO THÀNH PHẨM
                            </h3>
                            <button id="btn-add-prod" class="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-green-50">
                                + Mã SP
                            </button>
                        </div>

                        <div class="space-y-4">
                            <select id="h-area" class="w-full p-3 rounded-xl border border-green-200 font-bold text-green-800 outline-none bg-white">
                                <option value="">-- Chọn Nguồn Thu --</option>
                                ${houses.map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}
                                <option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option>
                            </select>

                            ${g1.length ? `<div class="bg-white p-3 rounded-xl border border-green-100 shadow-sm"><div class="text-[10px] font-black text-green-600 uppercase mb-2 border-b pb-1">1. Nấm Tươi</div><div class="grid grid-cols-2 gap-2">${g1.map(p=>`
                                <div class="flex justify-between items-center bg-green-50 p-2 rounded">
                                    <span class="text-[10px] font-bold text-slate-600 w-20 truncate">${p.name||'Lỗi tên'}</span>
                                    <input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-green-700 bg-white border border-green-200 rounded outline-none" placeholder="0">
                                </div>`).join('')}</div></div>`:''}
                            
                            ${g2.length ? `<div class="bg-white p-3 rounded-xl border border-orange-100 shadow-sm"><div class="text-[10px] font-black text-orange-600 uppercase mb-2 border-b pb-1">2. Phụ Phẩm</div><div class="grid grid-cols-2 gap-2">${g2.map(p=>`
                                <div class="flex justify-between items-center bg-orange-50 p-2 rounded">
                                    <span class="text-[10px] font-bold text-slate-600 w-20 truncate">${p.name||'Lỗi tên'}</span>
                                    <input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-orange-700 bg-white border border-orange-200 rounded outline-none" placeholder="0">
                                </div>`).join('')}</div></div>`:''}

                            ${g3.length ? `<div class="bg-white p-3 rounded-xl border border-purple-100 shadow-sm"><div class="text-[10px] font-black text-purple-600 uppercase mb-2 border-b pb-1">3. Sơ Chế</div><div class="grid grid-cols-2 gap-2">${g3.map(p=>`
                                <div class="flex justify-between items-center bg-purple-50 p-2 rounded">
                                    <span class="text-[10px] font-bold text-slate-600 w-20 truncate">${p.name||'Lỗi tên'}</span>
                                    <input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-purple-700 bg-white border border-purple-200 rounded outline-none" placeholder="0">
                                </div>`).join('')}</div></div>`:''}

                            <button id="btn-save-h" class="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs shadow-lg active:scale-95 transition">
                                LƯU KHO & CỘNG SẢN LƯỢNG
                            </button>
                        </div>
                    </div>
                </div>

                <div id="zone-sell" class="hidden animate-pop">
                    <div class="glass p-5 border-l-8 border-orange-500 bg-orange-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-orange-800 uppercase text-xs flex items-center gap-2"><i class="fas fa-truck text-lg"></i> XUẤT BÁN HÀNG</h3>
                            <button id="btn-report-day" class="bg-white border border-orange-200 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-orange-50"><i class="fas fa-file-csv mr-1"></i> BC Ngày</button>
                        </div>

                        <div class="space-y-3 bg-white p-3 rounded-xl shadow-sm border border-orange-100">
                            <div class="grid grid-cols-1 gap-2">
                                <input id="s-cust" placeholder="Tên Khách Hàng" class="w-full p-2 text-xs border rounded font-bold uppercase">
                                <textarea id="s-note" placeholder="Ghi chú đơn hàng..." class="w-full p-2 text-xs border rounded h-10"></textarea>
                            </div>

                            <div class="bg-slate-50 p-2 rounded border border-slate-200">
                                <div class="flex gap-2 mb-2">
                                    <select id="s-prod" class="flex-1 p-2 text-xs border rounded font-bold text-slate-700 outline-none">
                                        <option value="">-- Chọn Sản Phẩm (Tồn kho) --</option>
                                        ${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}" data-stock="${p.stock||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}
                                    </select>
                                </div>
                                <div class="flex gap-2 items-center">
                                    <input id="s-qty" type="number" placeholder="SL" class="w-16 p-2 text-xs border rounded text-center font-bold">
                                    <span class="text-xs text-slate-400">x</span>
                                    <input id="s-price" type="number" placeholder="Giá" class="w-20 p-2 text-xs border rounded text-center font-bold">
                                    <button id="btn-add-cart" class="flex-1 bg-orange-500 text-white p-2 rounded font-bold text-xs shadow">THÊM</button>
                                </div>
                            </div>

                            <div class="border-t border-dashed border-orange-200 pt-2">
                                <div id="cart-list" class="space-y-1 mb-2 text-xs"></div>
                                <div class="flex justify-between items-center text-sm font-black text-orange-800 bg-orange-100 p-2 rounded">
                                    <span>TỔNG CỘNG:</span>
                                    <div><span id="cart-total">0</span> <span class="text-[9px]">VNĐ</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-2 mt-4">
                            <button id="btn-save-sell" class="py-3 bg-orange-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition">LƯU & TRỪ KHO</button>
                            <button id="btn-print" class="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition"><i class="fas fa-print mr-1"></i> IN HÓA ĐƠN</button>
                        </div>
                    </div>
                </div>
            </div>`;

            // LOGIC GIỎ HÀNG
            let cart = [];
            const updateCart = () => {
                const listEl = document.getElementById('cart-list');
                if(listEl) {
                    listEl.innerHTML = cart.map((i, idx) => `
                        <div class="flex justify-between items-center bg-slate-50 p-1 rounded border border-slate-100">
                            <span class="font-bold text-slate-700">${i.name}</span>
                            <div class="flex items-center gap-2">
                                <span>${i.qty} x ${i.price.toLocaleString()}</span>
                                <span class="font-black text-orange-600">${(i.qty*i.price).toLocaleString()}</span>
                                <button class="text-red-400" onclick="document.getElementById('del-c-${idx}').click()"><i class="fas fa-times"></i></button>
                                <button id="del-c-${idx}" class="hidden"></button>
                            </div>
                        </div>`).join('');
                    
                    document.getElementById('cart-total').innerText = cart.reduce((a,b)=>a+(b.qty*b.price),0).toLocaleString();
                    
                    cart.forEach((_,i) => {
                        const btn = document.getElementById(`del-c-${i}`);
                        if(btn) btn.onclick = () => { cart.splice(i,1); updateCart(); };
                    });
                }
            };

            // GẮN SỰ KIỆN (EVENTS)
            setTimeout(() => {
                // CHUYỂN TAB
                const bIn=document.getElementById('btn-tab-in'), bOut=document.getElementById('btn-tab-out');
                if(bIn && bOut) {
                    bIn.onclick = () => { 
                        document.getElementById('zone-harvest').classList.remove('hidden'); document.getElementById('zone-sell').classList.add('hidden');
                        bIn.className="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow transition-all";
                        bOut.className="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all";
                    };
                    bOut.onclick = () => {
                        document.getElementById('zone-harvest').classList.add('hidden'); document.getElementById('zone-sell').classList.remove('hidden');
                        bOut.className="flex-1 py-3 rounded-lg font-bold text-xs bg-orange-600 text-white shadow transition-all";
                        bIn.className="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all";
                    };
                }

                // 1. Lưu Thu Hoạch
                const btnSaveH = document.getElementById('btn-save-h');
                if(btnSaveH) btnSaveH.onclick = async () => {
                    const areaEl = document.getElementById('h-area');
                    const areaId = areaEl.value;
                    if(!areaId) return Utils.toast("Chưa chọn nguồn thu!", "err");
                    
                    const areaName = areaEl.options[areaEl.selectedIndex].getAttribute('data-name');
                    let details = {}, total = 0;
                    const batch = db.batch();

                    products.forEach(p => {
                        if (!p || !p.code) return; // Bỏ qua sản phẩm lỗi
                        const el = document.getElementById(`in-${p.code}`);
                        if(el && Number(el.value) > 0) {
                            const qty = Number(el.value);
                            details[p.code] = qty;
                            total += qty;
                            // Cộng tồn kho
                            batch.update(doc(db, `${ROOT_PATH}/products`, p._id), { stock: increment(qty) });
                            el.value = '';
                        }
                    });

                    if(total === 0) return Utils.toast("Chưa nhập số lượng!", "err");

                    // Lưu log
                    const logRef = doc(collection(db, `${ROOT_PATH}/harvest_logs`));
                    batch.set(logRef, { area: areaName, details, total, user: user.name, time: Date.now() });

                    // Cộng tổng thu vào Nhà
                    if(areaId !== 'MuaNgoai') {
                        batch.update(doc(db, `${ROOT_PATH}/houses`, areaId), { totalYield: increment(total) });
                    }

                    await batch.commit();
                    Utils.toast(`✅ Đã nhập: ${total} kg`);
                };

                // 2. Thêm vào giỏ bán
                const btnAddCart = document.getElementById('btn-add-cart');
                if(btnAddCart) btnAddCart.onclick = () => {
                    const s = document.getElementById('s-prod');
                    const code = s.value;
                    if(!code) return Utils.toast("Chưa chọn hàng!", "err");
                    const name = s.options[s.selectedIndex].getAttribute('data-name');
                    const qty = Number(document.getElementById('s-qty').value);
                    const price = Number(document.getElementById('s-price').value);
                    if(qty > 0) { cart.push({code, name, qty, price}); updateCart(); document.getElementById('s-qty').value=''; }
                };

                // 3. Lưu Bán Hàng
                const btnSaveSell = document.getElementById('btn-save-sell');
                if(btnSaveSell) btnSaveSell.onclick = async () => {
                    const cust = document.getElementById('s-cust').value;
                    if(!cust || !cart.length) return Utils.toast("Thiếu tên hoặc giỏ hàng!", "err");
                    
                    const batch = db.batch();
                    const total = cart.reduce((a,b)=>a+(b.qty*b.price),0);
                    
                    batch.set(doc(collection(db, `${ROOT_PATH}/shipping`)), {
                        customer: cust, items: cart, total, 
                        note: document.getElementById('s-note').value,
                        user: user.name, time: Date.now()
                    });

                    cart.forEach(i => {
                        const p = products.find(x => x && x.code === i.code);
                        if(p) batch.update(doc(db, `${ROOT_PATH}/products`, p._id), { stock: increment(-i.qty) });
                    });

                    await batch.commit();
                    Utils.toast("Đã xuất kho!"); cart = []; updateCart(); document.getElementById('s-cust').value = '';
                };

                // 4. In Hóa Đơn
                const btnPrint = document.getElementById('btn-print');
                if(btnPrint) btnPrint.onclick = () => {
                    if(!cart.length) return Utils.toast("Giỏ hàng trống!", "err");
                    const w = window.open('', '', 'height=600,width=500');
                    w.document.write(`<html><head><title>HOA DON</title><style>body{font-family:monospace;padding:20px;font-size:12px}.c{text-align:center}.r{text-align:right}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border-bottom:1px dashed #000;padding:5px 0}</style></head><body>
                        <div class="c"><h3>${COMPANY.name}</h3><p>${COMPANY.address}</p><p>MST: ${COMPANY.mst} - Hotline: ${COMPANY.hotline}</p><p><i>${COMPANY.slogan}</i></p><br><h2>HÓA ĐƠN BÁN LẺ</h2></div>
                        <p>Khách: <b>${document.getElementById('s-cust').value||'Khách lẻ'}</b></p><p>Ngày: ${new Date().toLocaleString('vi-VN')}</p>
                        <table><tr><th class="left">SP</th><th>SL</th><th class="r">Đơn giá</th><th class="r">Tiền</th></tr>
                        ${cart.map(i=>`<tr><td>${i.name}</td><td class="c">${i.qty}</td><td class="r">${i.price.toLocaleString()}</td><td class="r">${(i.qty*i.price).toLocaleString()}</td></tr>`).join('')}
                        <tr><td colspan="3" class="r"><b>TỔNG:</b></td><td class="r"><b>${cart.reduce((a,b)=>a+(b.qty*b.price),0).toLocaleString()}</b></td></tr></table>
                        <div class="c" style="margin-top:20px"><p>Cảm ơn quý khách!</p></div></body></html>`);
                    w.document.close(); w.print();
                };

                // 5. Thêm Mã Nhanh
                const btnAddP = document.getElementById('btn-add-prod');
                if(btnAddP) btnAddP.onclick = () => {
                    Utils.modal("Thêm Mã Mới", `<input id="n-n" placeholder="Tên SP" class="w-full p-2 border mb-2"><input id="n-c" placeholder="Mã (ko dấu)" class="w-full p-2 border mb-2"><select id="n-g" class="w-full p-2 border"><option value="1">Tươi</option><option value="2">Phụ phẩm</option><option value="3">Sơ chế</option></select>`, [{id:'s-p', text:'Lưu'}]);
                    setTimeout(()=>document.getElementById('s-p').onclick=async()=>{const n=document.getElementById('n-n').value,c=document.getElementById('n-c').value,g=document.getElementById('n-g').value; if(n&&c){await addDoc(collection(db, `${ROOT_PATH}/products`),{name:n,code:c,group:g,stock:0}); Utils.modal(null);}},100);
                };

                // 6. Báo cáo ngày
                const btnRep = document.getElementById('btn-report-day');
                if(btnRep) btnRep.onclick = () => {
                    const today = new Date().toDateString();
                    const todayLogs = shippingLogs.filter(s => new Date(s.time).toDateString() === today);
                    if(!todayLogs.length) return Utils.toast("Hôm nay chưa có đơn!", "err");
                    let csv = "Khach;SP;SL;Gia;ThanhTien\n";
                    todayLogs.forEach(l => l.items.forEach(i => csv += `${l.customer},${i.name},${i.qty},${i.price},${i.qty*i.price}\n`));
                    const link = document.createElement("a"); link.href = encodeURI("data:text/csv;charset=utf-8,"+csv); link.download = `BC_Ngay.csv`; link.click();
                };

            }, 200);

        } catch (e) {
            // NẾU CÓ LỖI, HIỆN RA MÀN HÌNH THAY VÌ TRẮNG XÓA
            console.error(e);
            c.innerHTML = `<div class="p-10 text-center text-red-500 font-bold border-2 border-red-200 bg-red-50 rounded-xl m-4">
                <i class="fas fa-bug text-4xl mb-2"></i><br>
                LỖI HIỂN THỊ: ${e.message}<br>
                <span class="text-xs font-normal text-slate-500">(Hãy báo lỗi này cho kỹ thuật)</span>
            </div>`;
        }
    }
};
