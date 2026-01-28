import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const container = document.getElementById('view-th');
        if (!container || container.classList.contains('hidden')) return;
        
        if (!data) { container.innerHTML = '<div class="p-10 text-center">Đang tải dữ liệu...</div>'; return; }

        try {
            // 1. CHUẨN BỊ DỮ LIỆU
            const isAdmin = ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
            const products = Array.isArray(data.products) ? data.products : [];
            const houses = Array.isArray(data.houses) ? data.houses : [];
            
            // Sắp xếp log mới nhất lên đầu
            const logs = Array.isArray(data.harvest) ? data.harvest : [];
            const ships = Array.isArray(data.shipping) ? data.shipping : [];
            const sortedHarvest = [...logs].sort((a,b) => b.time - a.time).slice(0, 20);
            const sortedShips = [...ships].sort((a,b) => b.time - a.time).slice(0, 20);

            // Phân nhóm
            const groups = {
                '1': products.filter(p => String(p.group) === '1'),
                '2': products.filter(p => String(p.group) === '2'),
                '3': products.filter(p => String(p.group) === '3')
            };

            // Hàm tạo HTML cho từng dòng (Dùng data-id thay vì onclick)
            const renderRow = (p) => `
                <div class="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200 mb-1">
                    <div class="flex items-center gap-1 overflow-hidden">
                        ${isAdmin ? `<button class="btn-delete-prod text-red-400 hover:text-red-600 px-1 font-bold text-lg leading-none" data-id="${p._id}" data-name="${p.name}">×</button>` : ''}
                        <span class="text-[10px] font-bold text-slate-600 truncate w-24" title="${p.name}">${p.name}</span>
                    </div>
                    <input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-slate-700 border border-slate-300 rounded text-xs focus:border-green-500 outline-none" placeholder="0">
                </div>`;

            // 2. VẼ GIAO DIỆN (HTML)
            container.innerHTML = `
            <div class="space-y-5 pb-24">
                <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow transition-all" id="btn-tab-in">NHẬP KHO</button>
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all" id="btn-tab-out">XUẤT BÁN</button>
                </div>

                <div id="zone-harvest" class="animate-pop">
                    <div class="glass p-5 border-l-8 border-green-500 bg-green-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-green-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-warehouse text-lg"></i> NHẬP KHO</h3>
                            ${isAdmin ? `<button id="btn-add-prod" class="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-green-50">+ Mã SP</button>` : ''}
                        </div>
                        
                        <div class="space-y-3">
                            <div class="flex gap-2">
                                <div class="w-1/3"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Ngày Thu</label><input type="date" id="h-date" class="w-full p-2 rounded-lg border text-xs font-bold bg-white"></div>
                                <div class="flex-1"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Nguồn Thu</label><select id="h-area" class="w-full p-2 rounded-lg border text-xs font-bold bg-white outline-none"><option value="">-- Chọn --</option>${houses.map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}<option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option></select></div>
                            </div>

                            ${groups['1'].length ? `<div class="bg-green-50 p-2 rounded-xl border border-green-200"><div class="text-[10px] font-bold text-green-700 mb-1 ml-1">Nấm Tươi</div><div class="grid grid-cols-2 gap-2">${groups['1'].map(renderRow).join('')}</div></div>`:''}
                            ${groups['2'].length ? `<div class="bg-orange-50 p-2 rounded-xl border border-orange-200"><div class="text-[10px] font-bold text-orange-700 mb-1 ml-1">Phụ Phẩm</div><div class="grid grid-cols-2 gap-2">${groups['2'].map(renderRow).join('')}</div></div>`:''}
                            ${groups['3'].length ? `<div class="bg-purple-50 p-2 rounded-xl border border-purple-200"><div class="text-[10px] font-bold text-purple-700 mb-1 ml-1">Sơ Chế</div><div class="grid grid-cols-2 gap-2">${groups['3'].map(renderRow).join('')}</div></div>`:''}

                            <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-transform mt-2">LƯU KHO</button>
                            
                            <div class="mt-4 pt-2 border-t border-green-200">
                                <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Nhật ký nhập (20 dòng)</span>
                                <div class="max-h-40 overflow-y-auto space-y-1 mt-1 bg-white p-2 rounded-lg border border-green-100 shadow-inner">
                                    ${sortedHarvest.length ? sortedHarvest.map(l => `<div class="flex justify-between text-[10px] border-b border-dashed border-slate-100 pb-1 mb-1"><div><span class="text-slate-400 mr-1">${new Date(l.time).toLocaleDateString('vi-VN').slice(0,5)}</span><span class="font-bold text-slate-600">${l.area}</span></div><span class="font-bold text-green-600">+${l.total}kg</span></div>`).join('') : '<div class="text-center text-[10px] text-slate-300 italic">Trống</div>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="zone-sell" class="hidden animate-pop">
                    <div class="glass p-5 border-l-8 border-orange-500 bg-orange-50/40">
                        <div class="flex justify-between items-center mb-4"><h3 class="font-black text-orange-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-truck text-lg"></i> XUẤT BÁN</h3>${isAdmin ? `<button id="btn-rep-day" class="bg-white border text-orange-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm">Báo Cáo</button>` : ''}</div>
                        <div class="space-y-3 bg-white p-3 rounded-xl shadow-sm border border-orange-100">
                            <div class="grid grid-cols-1 gap-2"><input id="s-cust" placeholder="Khách Hàng" class="w-full p-2 text-xs border rounded-lg font-bold"><textarea id="s-note" placeholder="Ghi chú..." class="w-full p-2 text-xs border rounded-lg h-10"></textarea></div>
                            <div class="bg-slate-50 p-2 rounded-lg border border-slate-200"><div class="flex gap-2 mb-2"><select id="s-prod" class="flex-1 p-2 text-xs border rounded-lg font-bold bg-white"><option value="">-- Chọn Nấm --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select></div><div class="flex gap-2 items-center"><input id="s-qty" type="number" placeholder="SL" class="w-16 p-2 text-xs border rounded-lg text-center font-bold"><span class="text-xs text-slate-400">x</span><input id="s-price" type="number" placeholder="Giá" class="w-20 p-2 text-xs border rounded-lg text-center"><button id="btn-add-cart" class="flex-1 bg-orange-500 text-white p-2 rounded-lg font-bold text-xs shadow">THÊM</button></div></div>
                            <div class="border-t pt-2"><div id="cart-list" class="space-y-1 mb-2 text-xs max-h-32 overflow-y-auto"></div><div class="flex justify-between text-sm font-black text-orange-800 bg-orange-50 p-2 rounded-lg"><span>TỔNG:</span><span id="cart-total">0đ</span></div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-4"><button id="btn-save-sell" class="py-3 bg-orange-600 text-white rounded-xl font-bold text-xs shadow">LƯU & TRỪ KHO</button><button id="btn-print" class="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow">IN PHIẾU</button></div>
                        <div class="mt-4 pt-2 border-t border-orange-200"><span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Đơn gần đây</span><div class="max-h-40 overflow-y-auto space-y-1 mt-1 bg-white p-2 rounded-lg border border-orange-100 shadow-inner">${sortedShips.map(s => `<div class="flex justify-between text-[10px] border-b border-dashed border-slate-100 pb-1 mb-1"><div><span class="text-slate-400 mr-1">${new Date(s.time).toLocaleDateString('vi-VN').slice(0,5)}</span><span class="font-bold text-slate-700">${s.customer}</span></div><span class="font-bold text-orange-600">${Number(s.total).toLocaleString()}đ</span></div>`).join('')}</div></div>
                    </div>
                </div>
            </div>`;

            // 3. XỬ LÝ SỰ KIỆN (EVENTS)
            setTimeout(() => {
                const dateInput = document.getElementById('h-date'); if(dateInput) dateInput.valueAsDate = new Date();

                // TAB SWITCH
                const bIn = document.getElementById('btn-tab-in'), bOut = document.getElementById('btn-tab-out');
                bIn.onclick = () => { document.getElementById('zone-harvest').classList.remove('hidden'); document.getElementById('zone-sell').classList.add('hidden'); bIn.classList.add('bg-green-600','text-white'); bIn.classList.remove('text-slate-500'); bOut.classList.remove('bg-orange-600','text-white'); };
                bOut.onclick = () => { document.getElementById('zone-harvest').classList.add('hidden'); document.getElementById('zone-sell').classList.remove('hidden'); bOut.classList.add('bg-orange-600','text-white'); bIn.classList.remove('bg-green-600','text-white'); };

                // --- XÓA SẢN PHẨM (SỬ DỤNG EVENT DELEGATION - AN TOÀN TUYỆT ĐỐI) ---
                if (isAdmin) {
                    // Gắn sự kiện vào container cha, bắt tất cả các nút xóa con
                    container.onclick = async (e) => {
                        if (e.target.classList.contains('btn-delete-prod')) {
                            const id = e.target.getAttribute('data-id');
                            const name = e.target.getAttribute('data-name');
                            
                            if (confirm(`⚠️ CẢNH BÁO:\nBạn muốn xóa vĩnh viễn mã "${name}"?\nDữ liệu tồn kho sẽ mất!`)) {
                                try {
                                    // Xóa trên giao diện ngay lập tức
                                    e.target.closest('.flex').parentElement.remove();
                                    // Xóa trong database
                                    await deleteDoc(doc(db, `${ROOT_PATH}/products`, id));
                                    Utils.toast("Đã xóa mã sản phẩm!");
                                } catch (err) {
                                    alert("Lỗi: " + err.message);
                                }
                            }
                        }
                    };

                    // THÊM SẢN PHẨM
                    const btnAddP = document.getElementById('btn-add-prod');
                    if (btnAddP) btnAddP.onclick = () => {
                        Utils.modal("Thêm Mã Mới", 
                            `<input id="n-n" placeholder="Tên SP" class="w-full p-2 border rounded mb-2"><input id="n-c" placeholder="Mã (viết liền)" class="w-full p-2 border rounded mb-2"><select id="n-g" class="w-full p-2 border rounded"><option value="1">Nấm Tươi</option><option value="2">Phụ Phẩm</option><option value="3">Sơ Chế</option></select>`,
                            [{id:'s-p', text:'Lưu Mã'}]
                        );
                        setTimeout(() => document.getElementById('s-p').onclick = async () => {
                            const n = document.getElementById('n-n').value, c = document.getElementById('n-c').value, g = document.getElementById('n-g').value;
                            if (n && c) {
                                await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g, stock:0});
                                Utils.modal(null);
                                Utils.toast("Thêm thành công! Đang tải lại...");
                                // Không cần gọi render(), onSnapshot trong app.js sẽ tự làm việc đó
                            }
                        }, 100);
                    };
                    
                    // BÁO CÁO NGÀY
                    const btnRep = document.getElementById('btn-report-day');
                    if(btnRep) btnRep.onclick = () => {
                        const todayLogs = (data.shipping || []).filter(s => new Date(s.time).toDateString() === new Date().toDateString());
                        if(!todayLogs.length) return Utils.toast("Chưa có đơn!","err");
                        let csv="Ngay,Khach,SP,SL,Gia,ThanhTien\n";
                        todayLogs.forEach(l=>{const d=new Date(l.time).toLocaleDateString('vi-VN');l.items.forEach(i=>csv+=`${d},${l.customer},${i.name},${i.qty},${i.price},${i.qty*i.price}\n`)});
                        const l=document.createElement("a");l.href=encodeURI("data:text/csv;charset=utf-8,"+csv);l.download="BC_Ngay.csv";l.click();
                    };
                }

                // LƯU KHO
                document.getElementById('btn-save-h').onclick = async () => {
                    const aid=document.getElementById('h-area').value, dateVal=document.getElementById('h-date').value;
                    if(!dateVal||!aid) return Utils.toast("Thiếu thông tin!","err");
                    const aname=document.getElementById('h-area').options[document.getElementById('h-area').selectedIndex].getAttribute('data-name');
                    let d={},t=0,batch=db.batch();
                    products.forEach(p=>{const el=document.getElementById(`in-${p.code}`);if(el&&Number(el.value)>0){const q=Number(el.value);d[p.code]=q;t+=q;batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(q)});el.value='';}});
                    if(t===0) return Utils.toast("Chưa nhập số!","err");
                    batch.set(doc(collection(db,`${ROOT_PATH}/harvest_logs`)),{area:aname,details:d,total:t,user:user.name,time:new Date(dateVal).setHours(12,0,0,0)});
                    if(aid!=='MuaNgoai') batch.update(doc(db,`${ROOT_PATH}/houses`,aid),{totalYield:increment(t)});
                    await batch.commit(); Utils.toast(`Đã lưu ${t}kg`);
                };

                // GIỎ HÀNG
                let cart = [];
                const updateCart = () => {
                    document.getElementById('cart-list').innerHTML = cart.map((i,idx)=>`<div class="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-200 mb-1"><span class="font-bold text-slate-700">${i.name}</span><div class="flex items-center gap-2"><span class="text-slate-500">${i.qty}x${Number(i.price).toLocaleString()}</span><span class="font-black text-orange-600">${(i.qty*i.price).toLocaleString()}</span><button class="text-red-400 w-5 h-5 rounded-full border border-red-200 flex items-center justify-center hover:bg-red-50" onclick="document.getElementById('dc-${idx}').click()">×</button><button id="dc-${idx}" class="hidden"></button></div></div>`).join('');
                    document.getElementById('cart-total').innerText = cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString() + 'đ';
                    cart.forEach((_,i)=>document.getElementById(`dc-${i}`).onclick=()=>{cart.splice(i,1);updateCart();});
                };
                document.getElementById('btn-add-cart').onclick=()=>{const s=document.getElementById('s-prod'),c=s.value,n=s.options[s.selectedIndex].getAttribute('data-name'),q=Number(document.getElementById('s-qty').value),p=Number(document.getElementById('s-price').value);if(c&&q>0){cart.push({code:c,name:n,qty:q,price:p});updateCart();document.getElementById('s-qty').value='';}};
                document.getElementById('btn-save-sell').onclick=async()=>{const cust=document.getElementById('s-cust').value;if(!cust||!cart.length)return Utils.toast("Thiếu tên/giỏ!","err");const batch=db.batch();batch.set(doc(collection(db,`${ROOT_PATH}/shipping`)),{customer:cust,items:cart,total:cart.reduce((a,b)=>a+b.qty*b.price,0),note:document.getElementById('s-note').value,user:user.name,time:Date.now()});cart.forEach(i=>{const p=products.find(x=>x.code===i.code);if(p)batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(-i.qty)});});await batch.commit();Utils.toast("Đã xuất kho!");cart=[];updateCart();};
                document.getElementById('btn-print').onclick=()=>{if(!cart.length)return Utils.toast("Giỏ trống!","err");const w=window.open('','','height=600,width=500');w.document.write(`<html><head><title>PHIEU</title><style>body{font-family:monospace;padding:10px;font-size:12px}.c{text-align:center}.r{text-align:right}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px dashed #000;padding:5px 0}</style></head><body><div class="c"><h3>${COMPANY.name}</h3><p>Hotline:${COMPANY.hotline}</p><br><h2>HÓA ĐƠN</h2></div><p>Khách:${document.getElementById('s-cust').value}</p><table><tr><th>SP</th><th>SL</th><th class="r">Tiền</th></tr>${cart.map(i=>`<tr><td>${i.name}</td><td class="c">${i.qty}</td><td class="r">${(i.qty*i.price).toLocaleString()}</td></tr>`).join('')}<tr><td colspan="3" class="r"><b>TỔNG:${cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString()}</b></td></tr></table></body></html>`);w.document.close();w.print();};

            }, 300);

        } catch (e) { console.error(e); c.innerHTML=`<div class="p-10 text-center text-red-500">LỖI: ${e.message}</div>`; }
    }
};
