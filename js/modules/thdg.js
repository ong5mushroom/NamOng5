import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch, getDocs } from '../config.js';
import { Utils } from '../utils.js';

window.THDG_Action = {
    delOne: async (id, name) => {
        if(confirm(`Xóa mã "${name}"?`)) {
            try { await deleteDoc(doc(db, `${ROOT_PATH}/products`, id)); Utils.toast("Đã xóa!"); } catch(e){alert(e.message)}
        }
    },
    resetAll: async () => {
        if(confirm("⚠️ CẢNH BÁO: XÓA SẠCH TOÀN BỘ DANH SÁCH?\n(Hành động này không thể phục hồi)")) {
            try {
                const snap = await getDocs(collection(db, `${ROOT_PATH}/products`));
                const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deletePromises);
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
        const products = (Array.isArray(data.products) ? data.products : []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
        
        // Nhóm màu sắc cho từng loại
        const groups = {
            '1': { title: 'NẤM TƯƠI', color: 'green', items: products.filter(p => String(p.group) === '1') },
            '2': { title: 'PHỤ PHẨM', color: 'orange', items: products.filter(p => String(p.group) === '2') },
            '3': { title: 'SƠ CHẾ', color: 'purple', items: products.filter(p => String(p.group) === '3') }
        };

        const renderRow = (p, color) => `
            <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm mb-2">
                <div class="flex items-center gap-2 overflow-hidden">
                    ${isAdmin ? `<button onclick="window.THDG_Action.delOne('${p._id}', '${p.name}')" class="text-red-400 bg-red-50 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs hover:bg-red-100">×</button>` : ''}
                    <span class="text-sm font-bold text-slate-700 truncate w-32">${p.name}</span>
                </div>
                <input type="number" step="0.1" id="in-${p.code}" class="w-20 p-2 text-center font-bold text-slate-700 border border-slate-200 rounded-lg text-sm outline-none focus:border-${color}-500 focus:ring-1 focus:ring-${color}-500 transition" placeholder="0">
            </div>`;

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="flex bg-slate-100 p-1 rounded-xl">
                <button class="flex-1 py-2 rounded-lg font-bold text-xs bg-white text-green-700 shadow-sm transition" id="btn-tab-in">NHẬP KHO</button>
                <button class="flex-1 py-2 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-700 transition" id="btn-tab-out">XUẤT BÁN</button>
            </div>

            <div id="zone-harvest" class="animate-fade-in">
                ${isAdmin ? `
                <div class="flex justify-end gap-2 mb-3">
                    <button onclick="window.THDG_Action.resetAll()" class="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">RESET LIST</button>
                    <button id="btn-add" class="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">+ THÊM MÃ</button>
                </div>` : ''}

                <div class="sticky top-0 bg-white z-10 py-2 shadow-sm mb-4 border-b border-slate-100">
                    <div class="flex gap-2">
                        <input type="date" id="h-date" class="w-1/3 p-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 bg-slate-50">
                        <select id="h-area" class="flex-1 p-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 bg-slate-50 outline-none">
                            <option value="">-- Chọn Nguồn --</option>
                            ${(data.houses||[]).map(h=>`<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}
                            <option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option>
                        </select>
                    </div>
                </div>

                <div class="space-y-6">
                    ${Object.keys(groups).map(k => `
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="w-2 h-6 rounded-full bg-${groups[k].color}-500"></span>
                                <h3 class="font-black text-${groups[k].color}-700 text-sm uppercase">${groups[k].title}</h3>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-3">
                                ${groups[k].items.length ? groups[k].items.map(p => renderRow(p, groups[k].color)).join('') : '<div class="text-xs text-slate-300 italic py-2 pl-4">Chưa có mã hàng</div>'}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="fixed bottom-20 right-4 left-4">
                    <button id="btn-save-h" class="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200 active:scale-95 transition">LƯU KHO & CỘNG TỒN</button>
                </div>
            </div>

            <div id="zone-sell" class="hidden animate-fade-in">
                <div class="bg-white p-4 rounded-xl border border-orange-100 shadow-sm space-y-3">
                    <h3 class="font-black text-orange-600 text-xs uppercase mb-2">LẬP ĐƠN HÀNG</h3>
                    <input id="s-cust" placeholder="Tên Khách Hàng" class="w-full p-3 rounded-lg border border-slate-200 text-sm font-bold focus:border-orange-500 outline-none">
                    
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <select id="s-prod" class="w-full p-2 mb-2 rounded border border-slate-300 text-sm bg-white"><option value="">-- Chọn sản phẩm --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select>
                        <div class="flex gap-2">
                            <input id="s-qty" type="number" placeholder="Số lượng" class="w-1/3 p-2 rounded border border-slate-300 text-sm text-center font-bold">
                            <input id="s-price" type="number" placeholder="Đơn giá" class="flex-1 p-2 rounded border border-slate-300 text-sm font-bold">
                            <button id="btn-add-cart" class="bg-orange-500 text-white px-4 rounded font-bold text-xl shadow active:scale-90">+</button>
                        </div>
                    </div>

                    <div id="cart-list" class="space-y-2 pt-2 max-h-60 overflow-y-auto"></div>
                    
                    <div class="flex justify-between items-center pt-3 border-t border-dashed border-orange-200">
                        <span class="text-xs font-bold text-slate-500">TỔNG CỘNG:</span>
                        <span class="text-xl font-black text-orange-600" id="cart-total">0đ</span>
                    </div>
                </div>
                <button id="btn-save-sell" class="w-full mt-4 py-3.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 active:scale-95 transition">HOÀN TẤT ĐƠN HÀNG</button>
            </div>
        </div>`;

        setTimeout(() => {
            const di = document.getElementById('h-date'); if(di) di.valueAsDate = new Date();
            const bIn = document.getElementById('btn-tab-in'), bOut = document.getElementById('btn-tab-out');
            
            bIn.onclick=()=>{
                document.getElementById('zone-harvest').classList.remove('hidden');document.getElementById('zone-sell').classList.add('hidden');
                bIn.className = "flex-1 py-2 rounded-lg font-bold text-xs bg-white text-green-700 shadow-sm transition";
                bOut.className = "flex-1 py-2 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-700 transition";
            };
            bOut.onclick=()=>{
                document.getElementById('zone-harvest').classList.add('hidden');document.getElementById('zone-sell').classList.remove('hidden');
                bOut.className = "flex-1 py-2 rounded-lg font-bold text-xs bg-white text-orange-600 shadow-sm transition";
                bIn.className = "flex-1 py-2 rounded-lg font-bold text-xs text-slate-500 hover:text-slate-700 transition";
            };

            if(isAdmin) {
                const btnAdd = document.getElementById('btn-add');
                if(btnAdd) btnAdd.onclick = () => {
                    Utils.modal("Thêm Mã Mới", 
                        `<input id="n-n" placeholder="Tên (VD: Nấm Hương)" class="w-full p-2 border rounded mb-2"><input id="n-c" placeholder="Mã (Viết liền: namhuong)" class="w-full p-2 border rounded mb-2"><select id="n-g" class="w-full p-2 border rounded"><option value="1">Nấm Tươi</option><option value="2">Phụ Phẩm</option><option value="3">Sơ Chế</option></select>`,
                        [{id:'s-ok', text:'Lưu'}]
                    );
                    setTimeout(() => document.getElementById('s-ok').onclick = async () => {
                        const n=document.getElementById('n-n').value, c=document.getElementById('n-c').value, g=document.getElementById('n-g').value;
                        if(n && c) { await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g, stock:0}); Utils.modal(null); Utils.toast("Đã thêm!"); }
                    }, 100);
                }
            }

            document.getElementById('btn-save-h').onclick = async () => {
                const aid = document.getElementById('h-area').value; const dVal = document.getElementById('h-date').value;
                if(!dVal || !aid) return Utils.toast("Thiếu ngày hoặc nguồn!", "err");
                
                // --- SỬ DỤNG writeBatch ĐỂ FIX LỖI db.batch ---
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
                    const ref = doc(collection(db, `${ROOT_PATH}/harvest_logs`));
                    batch.set(ref, {area: aname, details, total: totalKg, user: user.name, time: new Date(dVal).setHours(12)});
                    // Cộng sản lượng cho nhà nếu không phải mua ngoài
                    if(aid !== 'MuaNgoai') {
                        batch.update(doc(db, `${ROOT_PATH}/houses`, aid), { totalYield: increment(totalKg) });
                    }
                    await batch.commit();
                    Utils.toast(`✅ Đã lưu ${totalKg}kg!`);
                } else { Utils.toast("Chưa nhập số liệu!", "err"); }
            };
            
            // Logic Giỏ hàng
            let cart=[]; 
            const upC=()=>{document.getElementById('cart-list').innerHTML=cart.map((i,x)=>`<div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100"><div class="text-xs"><div class="font-bold text-slate-700">${i.name}</div><div class="text-slate-500">${i.qty} x ${i.price.toLocaleString()}</div></div><div class="flex items-center gap-3"><span class="font-bold text-orange-600">${(i.qty*i.price).toLocaleString()}</span><button onclick="document.getElementById('d-${x}').click()" class="text-red-400 bg-white w-6 h-6 rounded shadow-sm flex items-center justify-center">×</button></div><button id="d-${x}" class="hidden"></button></div>`).join(''); document.getElementById('cart-total').innerText=cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString()+'đ'; cart.forEach((_,i)=>document.getElementById(`d-${i}`).onclick=()=>{cart.splice(i,1);upC()})};
            document.getElementById('btn-add-cart').onclick=()=>{const s=document.getElementById('s-prod'); if(s.value){cart.push({code:s.value,name:s.options[s.selectedIndex].getAttribute('data-name'),qty:Number(document.getElementById('s-qty').value),price:Number(document.getElementById('s-price').value)}); upC(); document.getElementById('s-qty').value='';}};
            document.getElementById('btn-save-sell').onclick=async()=>{if(cart.length){const batch=writeBatch(db); const ref=doc(collection(db,`${ROOT_PATH}/shipping`)); batch.set(ref,{customer:document.getElementById('s-cust').value,items:cart,total:cart.reduce((a,b)=>a+b.qty*b.price,0),user:user.name, time:Date.now()}); cart.forEach(i=>{const p=products.find(x=>x.code===i.code);if(p)batch.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(-i.qty)})}); await batch.commit(); Utils.toast("✅ Xuất bán thành công!"); cart=[]; upC(); document.getElementById('s-cust').value='';} else {Utils.toast("Giỏ hàng trống!","err")} };
        }, 300);
    }
};
