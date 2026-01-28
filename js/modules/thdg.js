import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch, getDocs } from '../config.js';
import { Utils } from '../utils.js';

// Thông tin hóa đơn (Đã kiểm tra kỹ dấu phẩy)
const COMPANY_INFO = {
    name: "NẤM ÔNG 5",
    address: "Đà Lạt, Lâm Đồng",
    hotline: "0899.49.0808",
    web: "ong5mushroom.com"
};

window.THDG_Action = {
    delOne: async (id, name) => {
        if(confirm(`Xóa mã "${name}"?`)) {
            try { 
                await deleteDoc(doc(db, `${ROOT_PATH}/products`, id)); 
                Utils.toast("Đã xóa!"); 
            } catch(e) { alert(e.message); }
        }
    },
    resetAll: async () => {
        if(confirm("⚠️ CẢNH BÁO: XÓA SẠCH TOÀN BỘ DANH SÁCH?\n(Hành động này không thể phục hồi)")) {
            try {
                const snap = await getDocs(collection(db, `${ROOT_PATH}/products`));
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                Utils.toast("✅ Đã xóa sạch danh sách!");
            } catch(e) { alert("Lỗi: "+e.message); }
        }
    }
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        // Sắp xếp danh sách
        const products = (Array.isArray(data.products) ? data.products : []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
        
        // Phân nhóm
        const groups = {
            '1': { title: '🍄 NẤM TƯƠI', color: 'green', items: products.filter(p => String(p.group) === '1') },
            '2': { title: '🍂 PHỤ PHẨM', color: 'orange', items: products.filter(p => String(p.group) === '2') },
            '3': { title: '🏭 SƠ CHẾ', color: 'purple', items: products.filter(p => String(p.group) === '3') }
        };

        // Render từng dòng (2 cột)
        const renderRow = (p, color) => `
            <div class="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200 shadow-sm">
                <div class="flex items-center gap-1 overflow-hidden">
                    ${isAdmin ? `<button onclick="window.THDG_Action.delOne('${p._id}', '${p.name}')" class="text-red-400 hover:text-red-600 font-bold px-1 text-xs">×</button>` : ''}
                    <span class="text-[11px] font-bold text-slate-700 truncate w-24" title="${p.name}">${p.name}</span>
                </div>
                <input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-slate-700 border border-slate-200 rounded text-xs outline-none focus:border-${color}-500 focus:bg-${color}-50 transition" placeholder="0">
            </div>`;

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="flex bg-slate-100 p-1 rounded-xl">
                <button class="flex-1 py-2 rounded-lg font-bold text-xs bg-white text-green-700 shadow-sm transition" id="btn-tab-in">NHẬP KHO</button>
                <button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-700 transition" id="btn-tab-out">XUẤT BÁN</button>
            </div>

            <div id="zone-harvest" class="animate-fade-in">
                <div class="glass p-3 border-l-8 border-green-500 bg-green-50/30">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-green-800 text-xs uppercase"><i class="fas fa-warehouse"></i> NHẬP SẢN LƯỢNG</h3>
                        ${isAdmin ? `<div class="flex gap-2"><button onclick="window.THDG_Action.resetAll()" class="text-[9px] font-bold text-red-500 border border-red-200 bg-white px-2 py-1 rounded">RESET</button><button id="btn-add" class="text-[9px] font-bold text-green-600 border border-green-200 bg-white px-2 py-1 rounded">+ MÃ</button></div>` : ''}
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex gap-2 sticky top-0 z-10 bg-green-50/95 py-2 backdrop-blur-sm">
                            <input type="date" id="h-date" class="w-1/3 p-2 rounded border border-green-200 text-xs font-bold bg-white text-center">
                            <select id="h-area" class="flex-1 p-2 rounded border border-green-200 text-xs font-bold bg-white outline-none">
                                <option value="">-- Chọn Nguồn --</option>
                                ${(data.houses||[]).map(h=>`<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}
                                <option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option>
                            </select>
                        </div>

                        ${Object.keys(groups).map(k => `
                            <div class="bg-white/60 p-2 rounded-xl border border-slate-100">
                                <div class="text-[10px] font-bold text-${groups[k].color}-700 mb-2 uppercase border-b border-slate-100 pb-1 ml-1">${groups[k].title}</div>
                                <div class="grid grid-cols-2 gap-2">
                                    ${groups[k].items.length ? groups[k].items.map(p => renderRow(p, groups[k].color)).join('') : '<div class="col-span-2 text-[10px] text-slate-300 italic text-center">Chưa có mã</div>'}
                                </div>
                            </div>
                        `).join('')}

                        <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-green-200 active:scale-95 transition">LƯU KHO</button>
                    </div>
                </div>
            </div>

            <div id="zone-sell" class="hidden animate-fade-in">
                <div class="bg-white p-4 rounded-xl border border-orange-100 shadow-sm space-y-3">
                    <h3 class="font-black text-orange-600 text-xs uppercase mb-2 flex items-center gap-2"><i class="fas fa-file-invoice-dollar"></i> LẬP ĐƠN HÀNG</h3>
                    <input id="s-cust" placeholder="Tên Khách Hàng (Bắt buộc)" class="w-full p-2.5 rounded border border-slate-300 text-sm font-bold focus:border-orange-500 outline-none">
                    
                    <div class="bg-orange-50 p-2 rounded border border-orange-100">
                        <select id="s-prod" class="w-full p-2 mb-2 rounded border border-orange-200 text-xs font-bold bg-white"><option value="">-- Chọn sản phẩm --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select>
                        <div class="flex gap-2">
                            <input id="s-qty" type="number" placeholder="SL" class="w-1/3 p-2 rounded border border-orange-200 text-xs text-center font-bold">
                            <input id="s-price" type="number" placeholder="Giá bán" class="flex-1 p-2 rounded border border-orange-200 text-xs font-bold">
                            <button id="btn-add-cart" class="bg-orange-500 text-white px-4 rounded font-bold text-lg shadow active:scale-90">+</button>
                        </div>
                    </div>

                    <div id="cart-list" class="space-y-1 pt-1 max-h-52 overflow-y-auto"></div>
                    
                    <div class="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                        <span class="text-xs font-bold text-slate-500">TỔNG CỘNG:</span>
                        <span class="text-xl font-black text-orange-600" id="cart-total">0đ</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mt-4">
                    <button id="btn-print" class="py-3 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2"><i class="fas fa-print"></i> IN HÓA ĐƠN</button>
                    <button id="btn-save-sell" class="py-3 bg-orange-600 text-white rounded-lg font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2"><i class="fas fa-save"></i> LƯU & TRỪ</button>
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const di = document.getElementById('h-date'); if(di) di.valueAsDate = new Date();
            const bIn = document.getElementById('btn-tab-in'), bOut = document.getElementById('btn-tab-out');
            
            // Chuyển Tab
            const switchTab = (isIn) => {
                const zIn = document.getElementById('zone-harvest');
                const zOut = document.getElementById('zone-sell');
                if(isIn) {
                    zIn.classList.remove('hidden'); zOut.classList.add('hidden');
                    bIn.className = "flex-1 py-2 rounded-lg font-bold text-xs bg-white text-green-700 shadow-sm transition";
                    bOut.className = "flex-1 py-2 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-700 transition";
                } else {
                    zIn.classList.add('hidden'); zOut.classList.remove('hidden');
                    bOut.className = "flex-1 py-2 rounded-lg font-bold text-xs bg-white text-orange-600 shadow-sm transition";
                    bIn.className = "flex-1 py-2 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-700 transition";
                }
            };
            bIn.onclick = () => switchTab(true);
            bOut.onclick = () => switchTab(false);

            // Thêm mã mới
            if(isAdmin) {
                const btnAdd = document.getElementById('btn-add');
                if(btnAdd) btnAdd.onclick = () => {
                    Utils.modal("Tạo Mã Mới", 
                        `<input id="n-n" placeholder="Tên (VD: Nấm Hương)" class="w-full p-2 border rounded mb-2"><input id="n-c" placeholder="Mã (Viết liền: namhuong)" class="w-full p-2 border rounded mb-2"><select id="n-g" class="w-full p-2 border rounded"><option value="1">Nấm Tươi</option><option value="2">Phụ Phẩm</option><option value="3">Sơ Chế</option></select>`,
                        [{id:'s-ok', text:'Lưu'}]
                    );
                    setTimeout(() => document.getElementById('s-ok').onclick = async () => {
                        const n=document.getElementById('n-n').value, c=document.getElementById('n-c').value, g=document.getElementById('n-g').value;
                        if(n && c) { await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g, stock:0}); Utils.modal(null); Utils.toast("Đã thêm!"); }
                    }, 100);
                }
            }

            // Lưu nhập kho
            document.getElementById('btn-save-h').onclick = async () => {
                const aid = document.getElementById('h-area').value; const dVal = document.getElementById('h-date').value;
                if(!dVal || !aid) return Utils.toast("Thiếu ngày hoặc nguồn!", "err");
                
                const batch = writeBatch(db); 
                let hasData = false; let totalKg = 0; let details = {};
                
                products.forEach(p => {
                    const el = document.getElementById(`in-${p.code}`);
                    if(el && Number(el.value) > 0) {
                        const q = Number(el.value);
                        batch.update(doc(db, `${ROOT_PATH}/products`, p._id), {stock: increment(q)});
                        details[p.code] = q; totalKg += q; el.value = ''; hasData = true;
                    }
                });
                
                if(hasData) {
                    const aname = document.getElementById('h-area').options[document.getElementById('h-area').selectedIndex].getAttribute('data-name');
                    batch.set(doc(collection(db, `${ROOT_PATH}/harvest_logs`)), {area: aname, details, total: totalKg, user: user.name, time: new Date(dVal).setHours(12)});
                    if(aid !== 'MuaNgoai') batch.update(doc(db, `${ROOT_PATH}/houses`, aid), { totalYield: increment(totalKg) });
                    await batch.commit();
                    Utils.toast(`✅ Đã lưu ${totalKg}kg!`);
                } else { Utils.toast("Chưa nhập số!", "err"); }
            };
            
            // Giỏ hàng
            let cart=[]; 
            const upC=()=>{
                document.getElementById('cart-list').innerHTML=cart.map((i,x)=>`
                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                        <div class="text-[11px]"><div class="font-bold text-slate-700">${i.name}</div><div class="text-slate-500">${i.qty} x ${i.price.toLocaleString()}</div></div>
                        <div class="flex items-center gap-3"><span class="font-bold text-orange-600">${(i.qty*i.price).toLocaleString()}</span><button onclick="document.getElementById('d-${x}').click()" class="text-red-400 hover:text-red-600 font-bold px-1">×</button></div><button id="d-${x}" class="hidden"></button>
                    </div>`).join(''); 
                document.getElementById('cart-total').innerText=cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString()+'đ'; 
                cart.forEach((_,i)=>document.getElementById(`d-${i}`).onclick=()=>{cart.splice(i,1);upC()})
            };

            document.getElementById('btn-add-cart').onclick=()=>{
                const s=document.getElementById('s-prod'); 
                if(s.value){cart.push({code:s.value,name:s.options[s.selectedIndex].getAttribute('data-name'),qty:Number(document.getElementById('s-qty').value),price:Number(document.getElementById('s-price').value)}); upC(); document.getElementById('s-qty').value='';}
            };

            // In hóa đơn
            document.getElementById('btn-print').onclick = () => {
                const cust = document.getElementById('s-cust').value;
                if(!cart.length) return Utils.toast("Giỏ hàng trống!", "err");
                if(!cust) return Utils.toast("Nhập tên khách hàng!", "err");

                const total = cart.reduce((a,b) => a + b.qty * b.price, 0);
                const dateStr = new Date().toLocaleString('vi-VN');

                const w = window.open('', '', 'height=600,width=400');
                w.document.write(`
                    <html>
                    <head>
                        <title>HOA DON - ${cust}</title>
                        <style>
                            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; margin: 0; }
                            .c { text-align: center; } .r { text-align: right; } .b { font-weight: bold; }
                            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            td, th { padding: 4px 0; vertical-align: top; }
                        </style>
                    </head>
                    <body>
                        <div class="c">
                            <div style="font-size:16px; font-weight:bold">${COMPANY_INFO.name}</div>
                            <div>${COMPANY_INFO.address}</div>
                            <div>Hotline: ${COMPANY_INFO.hotline}</div>
                            <div class="line"></div>
                            <div style="font-size:14px; font-weight:bold; margin:5px 0">HÓA ĐƠN BÁN LẺ</div>
                        </div>
                        <div>Khách hàng: <b>${cust}</b></div>
                        <div>Ngày: ${dateStr}</div>
                        <div>NV: ${user.name}</div>
                        <div class="line"></div>
                        <table>
                            <tr><th align="left">Món</th><th class="c">SL</th><th class="r">Đ.Giá</th><th class="r">Tiền</th></tr>
                            ${cart.map(i => `
                                <tr>
                                    <td>${i.name}</td>
                                    <td class="c">${i.qty}</td>
                                    <td class="r">${i.price.toLocaleString()}</td>
                                    <td class="r">${(i.qty*i.price).toLocaleString()}</td>
                                </tr>`).join('')}
                        </table>
                        <div class="line"></div>
                        <div class="r" style="font-size:14px">TỔNG CỘNG: <b style="font-size:16px">${total.toLocaleString()}đ</b></div>
                        <div class="c" style="margin-top:20px; font-style:italic">Cảm ơn quý khách!</div>
                    </body>
                    </html>
                `);
                w.document.close();
                w.print();
            };

            // Lưu & Trừ kho
            document.getElementById('btn-save-sell').onclick=async()=>{
                if(cart.length){
                    const batch=writeBatch(db); 
                    const ref=doc(collection(db,`${ROOT_PATH}/shipping`)); 
                    batch.set(ref,{customer:document.getElementById('s-cust').value,items:cart,total:cart.reduce((a,b)=>a+b.qty*b.price,0),user:user.name, time:Date.now()}); 
                    cart.forEach(i=>{const p=products.find(x=>x.code===i.code);if(p)batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(-i.qty)})}); 
                    await batch.commit(); 
                    Utils.toast("✅ Đã xuất bán thành công!"); 
                    cart=[]; upC(); document.getElementById('s-cust').value='';
                } else {Utils.toast("Giỏ trống!","err")} 
            };
        }, 300);
    }
};
