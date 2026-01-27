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

        // An toàn dữ liệu
        if (!data) { c.innerHTML = '<div class="p-10 text-center text-slate-400">Đang tải...</div>'; return; }
        
        try {
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const logs = Array.isArray(data.harvest) ? data.harvest : [];
            const ships = Array.isArray(data.shipping) ? data.shipping : [];
            
            // --- XỬ LÝ NGÀY THÁNG ---
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            // Lọc dữ liệu HÔM QUA
            const yesterdayHarvest = logs.filter(l => new Date(l.time).toDateString() === yesterdayStr);
            const yesterdayShips = ships.filter(s => new Date(s.time).toDateString() === yesterdayStr);

            // Phân nhóm SP
            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');
            const g3 = products.filter(p => p && String(p.group) === '3');

            c.innerHTML = `
            <div class="space-y-5 pb-24">
                <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow transition-all" id="btn-tab-in"><i class="fas fa-leaf mr-1"></i> THU HOẠCH</button>
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all" id="btn-tab-out"><i class="fas fa-file-invoice-dollar mr-1"></i> XUẤT BÁN</button>
                </div>

                <div id="zone-harvest" class="animate-pop">
                    <div class="glass p-5 border-l-8 border-green-500 bg-green-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-green-800 uppercase text-xs flex items-center gap-2"><i class="fas fa-warehouse text-lg"></i> NHẬP KHO THÀNH PHẨM</h3>
                            <button id="btn-add-prod" class="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-green-50">+ Mã SP</button>
                        </div>

                        <div class="space-y-3">
                            <div class="flex gap-2">
                                <div class="w-1/3">
                                    <label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Ngày Thu</label>
                                    <input type="date" id="h-date" class="w-full p-2.5 rounded-xl border border-green-200 font-bold text-green-800 outline-none bg-white text-xs">
                                </div>
                                <div class="flex-1">
                                    <label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Nguồn Thu</label>
                                    <select id="h-area" class="w-full p-2.5 rounded-xl border border-green-200 font-bold text-green-800 outline-none bg-white text-xs">
                                        <option value="">-- Chọn Nhà --</option>
                                        ${houses.map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}
                                        <option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option>
                                    </select>
                                </div>
                            </div>

                            ${g1.length ? `<div class="bg-white p-2 rounded-xl border border-green-100 shadow-sm"><div class="text-[10px] font-black text-green-600 uppercase mb-1 border-b pb-1">1. Nấm Tươi</div><div class="grid grid-cols-2 gap-2">${g1.map(p=>`<div class="flex justify-between items-center bg-green-50 p-1.5 rounded"><span class="text-[10px] font-bold text-slate-600 w-20 truncate">${p.name}</span><input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-green-700 bg-white border border-green-200 rounded outline-none text-xs" placeholder="0"></div>`).join('')}</div></div>`:''}
                            ${g2.length ? `<div class="bg-white p-2 rounded-xl border border-orange-100 shadow-sm"><div class="text-[10px] font-black text-orange-600 uppercase mb-1 border-b pb-1">2. Phụ Phẩm</div><div class="grid grid-cols-2 gap-2">${g2.map(p=>`<div class="flex justify-between items-center bg-orange-50 p-1.5 rounded"><span class="text-[10px] font-bold text-slate-600 w-20 truncate">${p.name}</span><input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-orange-700 bg-white border border-orange-200 rounded outline-none text-xs" placeholder="0"></div>`).join('')}</div></div>`:''}
                            ${g3.length ? `<div class="bg-white p-2 rounded-xl border border-purple-100 shadow-sm"><div class="text-[10px] font-black text-purple-600 uppercase mb-1 border-b pb-1">3. Sơ Chế</div><div class="grid grid-cols-2 gap-2">${g3.map(p=>`<div class="flex justify-between items-center bg-purple-50 p-1.5 rounded"><span class="text-[10px] font-bold text-slate-600 w-20 truncate">${p.name}</span><input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-purple-700 bg-white border border-purple-200 rounded outline-none text-xs" placeholder="0"></div>`).join('')}</div></div>`:''}

                            <button id="btn-save-h" class="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs shadow-lg active:scale-95 transition">LƯU KHO & CỘNG SẢN LƯỢNG</button>
                        </div>

                        <div class="mt-4 pt-3 border-t border-green-200">
                            <h4 class="text-[10px] font-bold text-green-800 uppercase mb-2">Lịch sử hôm qua (${yesterday.toLocaleDateString('vi-VN').slice(0,5)})</h4>
                            <div class="space-y-1 max-h-32 overflow-y-auto pr-1">
                                ${yesterdayHarvest.length ? yesterdayHarvest.map(l => `
                                    <div class="bg-white p-2 rounded border border-green-50 text-[10px] flex justify-between">
                                        <span class="font-bold text-slate-600">${l.area}</span>
                                        <span class="font-black text-green-600">+${l.total} kg</span>
                                    </div>
                                `).join('') : '<div class="text-[10px] text-slate-400 italic">Không có dữ liệu</div>'}
                            </div>
                        </div>
                    </div>
                </div>

                <div id="zone-sell" class="hidden animate-pop">
                    <div class="glass p-5 border-l-8 border-orange-500 bg-orange-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-orange-800 uppercase text-xs flex items-center gap-2"><i class="fas fa-truck text-lg"></i> XUẤT BÁN HÀNG</h3>
                            <button id="btn-report-day" class="bg-white border border-orange-200 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-orange-50">BC Ngày</button>
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
                            <button id="btn-print" class="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition">IN PHIẾU</button>
                        </div>

                        <div class="mt-4 pt-3 border-t border-orange-200">
                            <h4 class="text-[10px] font-bold text-orange-800 uppercase mb-2">Đơn hàng hôm qua (${yesterday.toLocaleDateString('vi-VN').slice(0,5)})</h4>
                            <div class="space-y-1 max-h-32 overflow-y-auto pr-1">
                                ${yesterdayShips.length ? yesterdayShips.map(s => `
                                    <div class="bg-white p-2 rounded border border-orange-100 text-[10px] flex justify-between items-center">
                                        <div>
                                            <span class="font-bold text-slate-700 block">${s.customer}</span>
                                            <span class="text-[9px] text-slate-400">${s.items.length} món</span>
                                        </div>
                                        <span class="font-bold text-orange-600">${Number(s.total).toLocaleString()} đ</span>
                                    </div>
                                `).join('') : '<div class="text-[10px] text-slate-400 italic">Không có đơn hàng</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            // LOGIC CART
            let cart = [];
            const updateCart = () => {
                const el = document.getElementById('cart-list');
                if(el) {
                    el.innerHTML = cart.map((i,idx)=>`<div class="flex justify-between items-center bg-slate-50 p-1 rounded border border-slate-100"><span class="font-bold text-slate-700">${i.name}</span><div class="flex items-center gap-2"><span>${i.qty}x${i.price.toLocaleString()}</span><span class="font-black text-orange-600">${(i.qty*i.price).toLocaleString()}</span><button class="text-red-400" onclick="document.getElementById('del-${idx}').click()">x</button><button id="del-${idx}" class="hidden"></button></div></div>`).join('');
                    document.getElementById('cart-total').innerText = cart.reduce((a,b)=>a+(b.qty*b.price),0).toLocaleString();
                    cart.forEach((_,i)=>document.getElementById(`del-${i}`).onclick=()=>{cart.splice(i,1);updateCart();});
                }
            };

            setTimeout(() => {
                // Auto set today
                const dateInput = document.getElementById('h-date');
                if(dateInput) dateInput.valueAsDate = new Date();

                const bIn=document.getElementById('btn-tab-in'), bOut=document.getElementById('btn-tab-out');
                bIn.onclick=()=>{document.getElementById('zone-harvest').classList.remove('hidden');document.getElementById('zone-sell').classList.add('hidden');bIn.classList.add('bg-green-600','text-white');bIn.classList.remove('text-slate-500');bOut.classList.remove('bg-orange-600','text-white');};
                bOut.onclick=()=>{document.getElementById('zone-harvest').classList.add('hidden');document.getElementById('zone-sell').classList.remove('hidden');bOut.classList.add('bg-orange-600','text-white');bIn.classList.remove('bg-green-600','text-white');};

                document.getElementById('btn-add-prod').onclick=()=>{
                    Utils.modal("Thêm Mã Mới",`<input id="n-n" placeholder="Tên SP" class="w-full p-2 border mb-2"><input id="n-c" placeholder="Mã (ko dấu)" class="w-full p-2 border mb-2"><select id="n-g" class="w-full p-2 border"><option value="1">Tươi</option><option value="2">Phụ phẩm</option><option value="3">Sơ chế</option></select>`,[{id:'s-p',text:'Lưu'}]);
                    setTimeout(()=>document.getElementById('s-p').onclick=async()=>{const n=document.getElementById('n-n').value,c=document.getElementById('n-c').value,g=document.getElementById('n-g').value;if(n&&c){await addDoc(collection(db,`${ROOT_PATH}/products`),{name:n,code:c,group:g,stock:0});Utils.modal(null);}},100);
                };

                // LƯU THU HOẠCH
                document.getElementById('btn-save-h').onclick=async()=>{
                    const aid=document.getElementById('h-area').value; 
                    const dateVal=document.getElementById('h-date').value;
                    if(!dateVal) return Utils.toast("Chưa chọn Ngày!", "err");
                    if(!aid) return Utils.toast("Chọn Nguồn Thu!", "err");
                    
                    const aname=document.getElementById('h-area').options[document.getElementById('h-area').selectedIndex].getAttribute('data-name');
                    let d={},t=0,batch=db.batch();
                    products.forEach(p=>{const el=document.getElementById(`in-${p.code}`);if(el&&Number(el.value)>0){const q=Number(el.value);d[p.code]=q;t+=q;batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(q)});el.value='';}});
                    if(t===0) return Utils.toast("Nhập số lượng!","err");
                    
                    const saveTime = new Date(dateVal).setHours(12,0,0,0);
                    batch.set(doc(collection(db,`${ROOT_PATH}/harvest_logs`)),{area:aname,details:d,total:t,user:user.name,time:saveTime});
                    if(aid!=='MuaNgoai') batch.update(doc(db,`${ROOT_PATH}/houses`,aid),{totalYield:increment(t)});
                    
                    await batch.commit(); Utils.toast(`✅ Đã lưu ${t}kg (${new Date(saveTime).toLocaleDateString('vi-VN')})`);
                };

                document.getElementById('btn-add-cart').onclick=()=>{const s=document.getElementById('s-prod'),c=s.value,n=s.options[s.selectedIndex].getAttribute('data-name'),q=Number(document.getElementById('s-qty').value),p=Number(document.getElementById('s-price').value);if(c&&q>0){cart.push({code:c,name:n,qty:q,price:p});updateCart();document.getElementById('s-qty').value='';}};
                
                document.getElementById('btn-save-sell').onclick=async()=>{
                    const cust=document.getElementById('s-cust').value;if(!cust||!cart.length)return Utils.toast("Thiếu tên/giỏ hàng!","err");
                    const batch=db.batch();
                    batch.set(doc(collection(db,`${ROOT_PATH}/shipping`)),{customer:cust,items:cart,total:cart.reduce((a,b)=>a+b.qty*b.price,0),note:document.getElementById('s-note').value,user:user.name,time:Date.now()});
                    cart.forEach(i=>{const p=products.find(x=>x.code===i.code);if(p)batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(-i.qty)});});
                    await batch.commit();Utils.toast("Đã xuất kho!");cart=[];updateCart();
                };

                // IN PHIẾU BÁN HÀNG (ĐÃ CẬP NHẬT GIAO DIỆN)
                document.getElementById('btn-print').onclick=()=>{
                    if(!cart.length)return Utils.toast("Giỏ trống!","err");
                    const cust = document.getElementById('s-cust').value || 'Khách lẻ';
                    const timeStr = new Date().toLocaleString('vi-VN');
                    
                    const w=window.open('','','height=600,width=500');
                    w.document.write(`
                        <html>
                        <head>
                            <title>PHIẾU BÁN HÀNG</title>
                            <style>
                                body{font-family:'Courier New', monospace; padding:10px; font-size:12px; line-height:1.4;}
                                .c{text-align:center} .r{text-align:right} .b{font-weight:bold}
                                table{width:100%; border-collapse:collapse; margin-top:10px}
                                th{border-top:1px dashed #000; border-bottom:1px dashed #000; padding:5px 0}
                                td{padding:4px 0}
                                .footer{margin-top:20px; text-align:center; font-style:italic}
                            </style>
                        </head>
                        <body>
                            <div class="c">
                                <h3 style="margin:0">${COMPANY.name}</h3>
                                <p style="margin:2px">${COMPANY.address}</p>
                                <p style="margin:2px">MST: ${COMPANY.mst}</p>
                                <p style="margin:2px">Hotline: ${COMPANY.hotline}</p>
                                <br>
                                <h2 style="margin:5px">PHIẾU BÁN HÀNG</h2>
                            </div>
                            <div>
                                <p>Khách hàng: <span class="b">${cust}</span></p>
                                <p>Người lập phiếu: ${user.name}</p>
                                <p>Ngày giờ in: ${timeStr}</p>
                            </div>
                            <table>
                                <thead><tr><th style="text-align:left">SP</th><th class="c">SL</th><th class="r">Đơn giá</th><th class="r">Tiền</th></tr></thead>
                                <tbody>
                                    ${cart.map(i=>`
                                        <tr>
                                            <td>${i.name}</td>
                                            <td class="c">${i.qty}</td>
                                            <td class="r">${i.price.toLocaleString()}</td>
                                            <td class="r">${(i.qty*i.price).toLocaleString()}</td>
                                        </tr>`).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="3" class="r b" style="padding-top:10px; border-top:1px solid #000">TỔNG CỘNG:</td>
                                        <td class="r b" style="padding-top:10px; border-top:1px solid #000; font-size:14px">${cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString()} đ</td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div class="footer">
                                <p>Nấm Ông 5 cảm ơn quý khách và hẹn gặp lại!</p>
                            </div>
                        </body>
                        </html>
                    `);
                    w.document.close();
                    // Đợi 1 chút để load style rồi mới in
                    setTimeout(() => w.print(), 500);
                };

                document.getElementById('btn-report-day').onclick = () => {
                    if(!todayLogs.length) return Utils.toast("Hôm nay chưa có đơn!", "err");
                    let csv = "Khach,SP,SL,Gia,ThanhTien\n";
                    todayLogs.forEach(l => l.items.forEach(i => csv += `${l.customer},${i.name},${i.qty},${i.price},${i.qty*i.price}\n`));
                    const link = document.createElement("a"); link.href = encodeURI("data:text/csv;charset=utf-8,"+csv); link.download = `BC_Ngay.csv`; link.click();
                };

            }, 200);

        } catch (e) {
            c.innerHTML = `<div class="p-10 text-center text-red-500">LỖI: ${e.message}</div>`;
        }
    }
};
