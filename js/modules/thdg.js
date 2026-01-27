import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

const COMPANY = { 
    name: "CÔNG TY TNHH NẤM ÔNG 5", 
    address: "Thôn Đa Ra Hoa, xã Lạc Dương, Tỉnh Lâm Đồng", 
    mst: "5801474272", 
    hotline: "0899.49.0808", 
    slogan: "Trao sức khỏe, trọn yêu thương" 
};

// --- HÀM XÓA TOÀN CỤC (Đảm bảo 100% chạy được) ---
window.THDG_Delete = async (id, name) => {
    if(confirm(`⚠️ CẢNH BÁO ADMIN:\nXóa mã "${name}" sẽ mất toàn bộ lịch sử tồn kho của nó.\nBạn chắc chắn chứ?`)) {
        try {
            await deleteDoc(doc(db, `${ROOT_PATH}/products`, id));
            Utils.toast("✅ Đã xóa thành công!");
        } catch (e) {
            alert("Lỗi: " + e.message);
        }
    }
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        if (!data) { c.innerHTML = '<div class="p-10 text-center text-slate-400">Đang tải dữ liệu...</div>'; return; }

        try {
            // Phân quyền
            const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));

            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const logs = Array.isArray(data.harvest) ? data.harvest : [];
            
            // Xử lý ngày
            const todayStr = new Date().toDateString();
            const todayLogs = (data.shipping || []).filter(s => new Date(s.time).toDateString() === todayStr);
            const y = new Date(); y.setDate(y.getDate()-1);
            const yStr = y.toDateString();
            const yHarvest = logs.filter(l => new Date(l.time).toDateString() === yStr);
            const yShips = (data.shipping||[]).filter(s => new Date(s.time).toDateString() === yStr);

            // Phân nhóm
            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');
            const g3 = products.filter(p => p && String(p.group) === '3');

            // Hàm vẽ dòng (Nút xóa gắn vào window.THDG_Delete)
            const renderRow = (p) => `
                <div class="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200">
                    <div class="flex items-center gap-1 overflow-hidden">
                        ${isAdmin ? `<button onclick="window.THDG_Delete('${p._id}', '${p.name}')" class="text-red-300 hover:text-red-600 px-1"><i class="fas fa-times"></i></button>` : ''}
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
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-green-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-warehouse text-lg"></i> NHẬP KHO</h3>
                            ${isAdmin ? `<button id="btn-add-prod" class="bg-white border text-green-700 px-2 py-1 rounded text-[10px] font-bold shadow-sm">+ Mã SP</button>` : ''}
                        </div>
                        <div class="space-y-3">
                            <div class="flex gap-2">
                                <div class="w-1/3"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Ngày Thu</label><input type="date" id="h-date" class="w-full p-2 rounded border text-xs font-bold"></div>
                                <div class="flex-1"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Nguồn Thu</label><select id="h-area" class="w-full p-2 rounded border text-xs font-bold"><option value="">-- Chọn --</option>${houses.map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}<option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option></select></div>
                            </div>
                            ${g1.length ? `<div class="bg-green-50 p-2 rounded border border-green-200"><div class="text-[10px] font-bold text-green-700 mb-1">Nấm Tươi</div><div class="grid grid-cols-2 gap-2">${g1.map(renderRow).join('')}</div></div>`:''}
                            ${g2.length ? `<div class="bg-orange-50 p-2 rounded border border-orange-200"><div class="text-[10px] font-bold text-orange-700 mb-1">Phụ Phẩm</div><div class="grid grid-cols-2 gap-2">${g2.map(renderRow).join('')}</div></div>`:''}
                            ${g3.length ? `<div class="bg-purple-50 p-2 rounded border border-purple-200"><div class="text-[10px] font-bold text-purple-700 mb-1">Sơ Chế</div><div class="grid grid-cols-2 gap-2">${g3.map(renderRow).join('')}</div></div>`:''}
                            <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded font-bold text-xs shadow-lg active:scale-95 transition">LƯU KHO</button>
                            
                            <div class="mt-4 pt-2 border-t border-green-200">
                                <span class="text-[9px] font-bold text-slate-400 uppercase">Hôm qua</span>
                                <div class="max-h-24 overflow-y-auto space-y-1 mt-1">${yHarvest.length ? yHarvest.map(l=>`<div class="flex justify-between text-[10px] bg-white p-1 rounded border"><span>${l.area}</span><span class="font-bold text-green-600">${l.total}kg</span></div>`).join('') : '<div class="text-[10px] text-slate-300 italic">Không có</div>'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="zone-sell" class="hidden animate-pop">
                    <div class="glass p-5 border-l-8 border-orange-500 bg-orange-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-orange-800 text-xs uppercase flex items-center gap-2"><i class="fas fa-truck text-lg"></i> XUẤT BÁN</h3>
                            ${isAdmin ? `<button id="btn-rep-day" class="bg-white border text-orange-700 px-2 py-1 rounded text-[10px] font-bold shadow-sm">BC Ngày</button>` : ''}
                        </div>
                        <div class="space-y-3 bg-white p-3 rounded shadow-sm border border-orange-100">
                            <div class="grid grid-cols-1 gap-2"><input id="s-cust" placeholder="Khách Hàng" class="w-full p-2 text-xs border rounded font-bold"><textarea id="s-note" placeholder="Ghi chú..." class="w-full p-2 text-xs border rounded h-10"></textarea></div>
                            <div class="bg-slate-50 p-2 rounded border border-slate-200">
                                <div class="flex gap-2 mb-2"><select id="s-prod" class="flex-1 p-2 text-xs border rounded font-bold"><option value="">-- Chọn Nấm --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select></div>
                                <div class="flex gap-2 items-center"><input id="s-qty" type="number" placeholder="SL" class="w-16 p-2 text-xs border rounded text-center font-bold"><span class="text-xs">x</span><input id="s-price" type="number" placeholder="Giá" class="w-20 p-2 text-xs border rounded text-center"><button id="btn-add-cart" class="flex-1 bg-orange-500 text-white p-2 rounded font-bold text-xs shadow">THÊM</button></div>
                            </div>
                            <div class="border-t pt-2"><div id="cart-list" class="space-y-1 mb-2 text-xs"></div><div class="flex justify-between text-sm font-black text-orange-800"><span>TỔNG:</span><span id="cart-total">0</span></div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-4"><button id="btn-save-sell" class="py-2 bg-orange-600 text-white rounded font-bold text-xs shadow">LƯU & TRỪ KHO</button><button id="btn-print" class="py-2 bg-blue-600 text-white rounded font-bold text-xs shadow">IN PHIẾU</button></div>
                        <div class="mt-4 pt-2 border-t border-orange-200"><span class="text-[9px] font-bold text-slate-400 uppercase">Hôm qua</span><div class="max-h-24 overflow-y-auto space-y-1 mt-1">${yShips.length ? yShips.map(s=>`<div class="flex justify-between text-[10px] bg-white p-1 rounded border"><span>${s.customer}</span><span class="font-bold text-orange-600">${Number(s.total).toLocaleString()}đ</span></div>`).join('') : '<div class="text-[10px] text-slate-300 italic">Không có</div>'}</div></div>
                    </div>
                </div>
            </div>`;

            // EVENT HANDLERS
            setTimeout(() => {
                const dateInput = document.getElementById('h-date'); if(dateInput) dateInput.valueAsDate = new Date();
                const bIn=document.getElementById('btn-tab-in'), bOut=document.getElementById('btn-tab-out');
                
                bIn.onclick=()=>{document.getElementById('zone-harvest').classList.remove('hidden');document.getElementById('zone-sell').classList.add('hidden');bIn.classList.add('bg-green-600','text-white');bIn.classList.remove('text-slate-500');bOut.classList.remove('bg-orange-600','text-white');};
                bOut.onclick=()=>{document.getElementById('zone-harvest').classList.add('hidden');document.getElementById('zone-sell').classList.remove('hidden');bOut.classList.add('bg-orange-600','text-white');bIn.classList.remove('bg-green-600','text-white');};

                // Admin Events
                const btnAddP = document.getElementById('btn-add-prod');
                if(btnAddP) btnAddP.onclick=()=>{
                    Utils.modal("Thêm Mã",`<input id="n-n" placeholder="Tên" class="w-full p-2 border mb-2"><input id="n-c" placeholder="Mã" class="w-full p-2 border mb-2"><select id="n-g" class="w-full p-2 border"><option value="1">Tươi</option><option value="2">Phụ</option><option value="3">Sơ chế</option></select>`,[{id:'s-p',text:'Lưu'}]);
                    setTimeout(()=>document.getElementById('s-p').onclick=async()=>{const n=document.getElementById('n-n').value,c=document.getElementById('n-c').value,g=document.getElementById('n-g').value;if(n&&c){await addDoc(collection(db,`${ROOT_PATH}/products`),{name:n,code:c,group:g,stock:0});Utils.modal(null);}},100);
                };
                const btnRep = document.getElementById('btn-report-day');
                if(btnRep) btnRep.onclick=()=>{
                    if(!todayLogs.length)return Utils.toast("Không có đơn!","err");
                    let csv="Ngay,Khach,SP,SL,Gia,ThanhTien\n";todayLogs.forEach(l=>{const d=new Date(l.time).toLocaleDateString('vi-VN');l.items.forEach(i=>csv+=`${d},${l.customer},${i.name},${i.qty},${i.price},${i.qty*i.price}\n`)});
                    const l=document.createElement("a");l.href=encodeURI("data:text/csv;charset=utf-8,"+csv);l.download="BC.csv";l.click();
                };

                // Common Events
                document.getElementById('btn-save-h').onclick=async()=>{
                    const aid=document.getElementById('h-area').value, dateVal=document.getElementById('h-date').value;
                    if(!dateVal||!aid) return Utils.toast("Thiếu thông tin!","err");
                    const aname=document.getElementById('h-area').options[document.getElementById('h-area').selectedIndex].getAttribute('data-name');
                    let d={},t=0,batch=db.batch();
                    products.forEach(p=>{const el=document.getElementById(`in-${p.code}`);if(el&&Number(el.value)>0){const q=Number(el.value);d[p.code]=q;t+=q;batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(q)});el.value='';}});
                    if(t===0) return Utils.toast("Chưa nhập số!","err");
                    const saveTime = new Date(dateVal).setHours(12,0,0,0);
                    batch.set(doc(collection(db,`${ROOT_PATH}/harvest_logs`)),{area:aname,details:d,total:t,user:user.name,time:saveTime});
                    if(aid!=='MuaNgoai') batch.update(doc(db,`${ROOT_PATH}/houses`,aid),{totalYield:increment(t)});
                    await batch.commit(); Utils.toast(`Đã lưu ${t}kg`);
                };

                document.getElementById('btn-add-cart').onclick=()=>{const s=document.getElementById('s-prod'),c=s.value,n=s.options[s.selectedIndex].getAttribute('data-name'),q=Number(document.getElementById('s-qty').value),p=Number(document.getElementById('s-price').value);if(c&&q>0){cart.push({code:c,name:n,qty:q,price:p});updateCart();document.getElementById('s-qty').value='';}};
                document.getElementById('btn-save-sell').onclick=async()=>{const cust=document.getElementById('s-cust').value;if(!cust||!cart.length)return Utils.toast("Thiếu tên/giỏ!","err");const batch=db.batch();batch.set(doc(collection(db,`${ROOT_PATH}/shipping`)),{customer:cust,items:cart,total:cart.reduce((a,b)=>a+b.qty*b.price,0),note:document.getElementById('s-note').value,user:user.name,time:Date.now()});cart.forEach(i=>{const p=products.find(x=>x.code===i.code);if(p)batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(-i.qty)});});await batch.commit();Utils.toast("Đã xuất kho!");cart=[];updateCart();};
                document.getElementById('btn-print').onclick=()=>{
                    if(!cart.length)return Utils.toast("Giỏ trống!","err");
                    const w=window.open('','','height=600,width=500');
                    w.document.write(`<html><head><title>PHIEU</title><style>body{font-family:monospace;padding:10px;font-size:12px}.c{text-align:center}.r{text-align:right}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px dashed #000;padding:5px 0}</style></head><body><div class="c"><h3>${COMPANY.name}</h3><p>${COMPANY.address}</p><p>Hotline:${COMPANY.hotline}</p><br><h2>PHIẾU BÁN HÀNG</h2></div><p>Khách: ${document.getElementById('s-cust').value}</p><p>NV: ${user.name}</p><table><tr><th align="left">SP</th><th class="c">SL</th><th class="r">Đơn giá</th><th class="r">Tiền</th></tr>${cart.map(i=>`<tr><td>${i.name}</td><td class="c">${i.qty}</td><td class="r">${i.price.toLocaleString()}</td><td class="r">${(i.qty*i.price).toLocaleString()}</td></tr>`).join('')}<tr><td colspan="3" class="r"><b>TỔNG:</b></td><td class="r"><b>${cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString()}</b></td></tr></table><div class="c" style="margin-top:20px">Cảm ơn quý khách!</div></body></html>`);
                    w.document.close();setTimeout(()=>w.print(),500);
                };

                let cart=[]; const updateCart=()=>{const el=document.getElementById('cart-list');if(el){el.innerHTML=cart.map((i,idx)=>`<div class="flex justify-between items-center bg-slate-50 p-1 border"><span>${i.name}</span><div class="flex gap-2"><span>${i.qty}x${Number(i.price).toLocaleString()}</span><span class="font-bold text-orange-600">${(i.qty*i.price).toLocaleString()}</span><button class="text-red-400" onclick="document.getElementById('dc-${idx}').click()">x</button><button id="dc-${idx}" class="hidden"></button></div></div>`).join('');document.getElementById('cart-total').innerText=cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString();cart.forEach((_,i)=>document.getElementById(`dc-${i}`).onclick=()=>{cart.splice(i,1);updateCart();});}};
            }, 200);

        } catch (e) { c.innerHTML=`<div class="p-10 text-center text-red-500">LỖI: ${e.message}</div>`; }
    }
};
