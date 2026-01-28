import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

// --- HÀM QUẢN LÝ SẢN PHẨM ---
window.THDG_Action = {
    // Xóa 1 mã
    delOne: async (id, name) => {
        if(confirm(`Xóa mã "${name}"?`)) {
            try { await deleteDoc(doc(db, `${ROOT_PATH}/products`, id)); Utils.toast("Đã xóa!"); } 
            catch(e) { alert(e.message); }
        }
    },
    // Xóa sạch làm lại (RESET) - Đã sửa lỗi
    resetAll: async () => {
        // Lấy danh sách từ biến toàn cục đã lưu lúc render
        const products = window._CURRENT_PRODUCTS || [];
        
        if (products.length === 0) return Utils.toast("Danh sách đang trống!");

        const code = prompt(`⚠️ CẢNH BÁO NGUY HIỂM!\n\nBạn đang xóa ${products.length} mã sản phẩm.\nHành động này KHÔNG THỂ phục hồi.\n\nNhập chữ 'OK' để xóa sạch:`);
        
        if (code === 'OK') {
            try {
                // Xóa từng dòng (Dùng Batch để an toàn hơn nếu danh sách < 500)
                const batch = db.batch();
                products.forEach(p => {
                    batch.delete(doc(db, `${ROOT_PATH}/products`, p._id));
                });
                await batch.commit();
                Utils.toast("✅ Đã xóa sạch danh sách!");
            } catch (e) { 
                alert("Lỗi: " + e.message); 
            }
        }
    }
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;
        if (!data) { c.innerHTML = '...'; return; }

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        
        // 1. SẮP XẾP & LƯU BIẾN TOÀN CỤC (Để dùng cho nút Reset)
        const products = (Array.isArray(data.products) ? data.products : []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
        window._CURRENT_PRODUCTS = products; // Lưu lại để nút Reset dùng
        
        // 2. PHÂN NHÓM CỐ ĐỊNH
        const groups = {
            '1': { title: '🍄 NẤM TƯƠI', items: products.filter(p => String(p.group) === '1') },
            '2': { title: '🍂 PHỤ PHẨM', items: products.filter(p => String(p.group) === '2') },
            '3': { title: '🏭 SƠ CHẾ', items: products.filter(p => String(p.group) === '3') }
        };

        const renderRow = (p) => `
            <div class="flex justify-between items-center bg-white p-2 rounded border border-slate-200 mb-1 shadow-sm">
                <div class="flex items-center gap-2 overflow-hidden">
                    ${isAdmin ? `<button onclick="window.THDG_Action.delOne('${p._id}', '${p.name}')" class="text-red-500 font-bold px-1 hover:bg-red-50 text-lg leading-none">×</button>` : ''}
                    <span class="text-xs font-bold text-slate-700 truncate w-32">${p.name}</span>
                </div>
                <input type="number" step="0.1" id="in-${p.code}" class="w-20 p-1 text-center font-bold text-slate-700 border border-slate-300 rounded text-xs outline-none focus:border-green-500" placeholder="0">
            </div>`;

        c.innerHTML = `
        <div class="space-y-5 pb-24">
            <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-600 text-white shadow" id="btn-tab-in">NHẬP KHO</button>
                <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-500 hover:bg-slate-100" id="btn-tab-out">XUẤT BÁN</button>
            </div>

            <div id="zone-harvest" class="animate-pop">
                <div class="glass p-4 border-l-8 border-green-500 bg-green-50/40">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-black text-green-800 text-xs uppercase"><i class="fas fa-warehouse"></i> NHẬP KHO</h3>
                        ${isAdmin ? `
                        <div class="flex gap-2">
                            <button onclick="window.THDG_Action.resetAll()" class="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold border border-red-200 shadow-sm">RESET ALL</button>
                            <button id="btn-add" class="bg-white border border-green-600 text-green-700 px-2 py-1 rounded text-[10px] font-bold shadow-sm">+ MÃ SP</button>
                        </div>` : ''}
                    </div>
                    
                    <div class="space-y-4">
                        <div class="flex gap-2">
                            <input type="date" id="h-date" class="w-1/3 p-2 rounded border text-xs font-bold bg-white">
                            <select id="h-area" class="flex-1 p-2 rounded border text-xs font-bold bg-white">
                                <option value="">-- Chọn Nguồn --</option>
                                ${(data.houses||[]).map(h=>`<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}
                                <option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option>
                            </select>
                        </div>

                        ${Object.keys(groups).map(k => `
                            <div class="bg-white/60 p-2 rounded-xl border border-slate-200">
                                <div class="text-[10px] font-bold text-slate-500 mb-2 uppercase border-b border-slate-100 pb-1">${groups[k].title}</div>
                                <div class="grid grid-cols-1 gap-1">
                                    ${groups[k].items.length ? groups[k].items.map(renderRow).join('') : '<div class="text-[10px] text-slate-300 italic text-center py-2">-- Chưa có mã --</div>'}
                                </div>
                            </div>
                        `).join('')}

                        <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-xs shadow-lg active:scale-95 transition">LƯU KHO & CỘNG TỒN</button>
                    </div>
                </div>
            </div>

            <div id="zone-sell" class="hidden animate-pop">
                <div class="glass p-4 border-l-8 border-orange-500 bg-orange-50/40">
                    <div class="flex justify-between items-center mb-4"><h3 class="font-black text-orange-800 text-xs uppercase"><i class="fas fa-truck"></i> XUẤT BÁN</h3></div>
                    <div class="space-y-3 bg-white p-3 rounded shadow-sm border border-orange-100">
                        <input id="s-cust" placeholder="Khách Hàng" class="w-full p-2 text-xs border rounded font-bold">
                        <div class="flex gap-2"><select id="s-prod" class="flex-1 p-2 text-xs border rounded font-bold"><option value="">-- Chọn Nấm Tồn Kho --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select></div>
                        <div class="flex gap-2"><input id="s-qty" type="number" placeholder="SL" class="w-1/3 p-2 text-xs border rounded font-bold"><input id="s-price" type="number" placeholder="Giá" class="flex-1 p-2 text-xs border rounded font-bold"><button id="btn-add-cart" class="bg-orange-500 text-white px-3 rounded font-bold text-xs">OK</button></div>
                        <div id="cart-list" class="border-t pt-2 space-y-1 max-h-40 overflow-y-auto"></div>
                        <div class="text-right font-black text-orange-700 text-sm" id="cart-total">0đ</div>
                    </div>
                    <button id="btn-save-sell" class="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-xs shadow-lg mt-3">LƯU & TRỪ KHO</button>
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            const di = document.getElementById('h-date'); if(di) di.valueAsDate = new Date();
            const bIn = document.getElementById('btn-tab-in'), bOut = document.getElementById('btn-tab-out');
            
            bIn.onclick=()=>{document.getElementById('zone-harvest').classList.remove('hidden');document.getElementById('zone-sell').classList.add('hidden');bIn.classList.add('bg-green-600','text-white');bIn.classList.remove('text-slate-500');bOut.classList.remove('bg-orange-600','text-white');};
            bOut.onclick=()=>{document.getElementById('zone-harvest').classList.add('hidden');document.getElementById('zone-sell').classList.remove('hidden');bOut.classList.add('bg-orange-600','text-white');bIn.classList.remove('bg-green-600','text-white');};

            // Logic Thêm Mã
            if(isAdmin) {
                const btnAdd = document.getElementById('btn-add');
                if(btnAdd) btnAdd.onclick = () => {
                    Utils.modal("Tạo Mã Mới", 
                        `<input id="n-n" placeholder="Tên (VD: Nấm Hương L1)" class="w-full p-2 border rounded mb-2">
                         <input id="n-c" placeholder="Mã (Viết liền không dấu: huongl1)" class="w-full p-2 border rounded mb-2">
                         <select id="n-g" class="w-full p-2 border rounded">
                            <option value="1">1. Nấm Tươi</option>
                            <option value="2">2. Phụ Phẩm</option>
                            <option value="3">3. Sơ Chế</option>
                         </select>`,
                        [{id:'s-ok', text:'Lưu'}]
                    );
                    setTimeout(() => document.getElementById('s-ok').onclick = async () => {
                        const n=document.getElementById('n-n').value, c=document.getElementById('n-c').value, g=document.getElementById('n-g').value;
                        if(n && c) { await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g, stock:0}); Utils.modal(null); Utils.toast("Đã thêm!"); }
                        else { alert("Thiếu tên hoặc mã!"); }
                    }, 100);
                }
            }

            // Logic Lưu Kho
            document.getElementById('btn-save-h').onclick = async () => {
                const aid = document.getElementById('h-area').value;
                const dVal = document.getElementById('h-date').value;
                if(!dVal || !aid) return Utils.toast("Thiếu ngày/nguồn!", "err");
                
                const batch = db.batch();
                let hasData = false;
                let totalKg = 0;
                
                products.forEach(p => {
                    const el = document.getElementById(`in-${p.code}`);
                    if(el && Number(el.value) > 0) {
                        const q = Number(el.value);
                        batch.update(doc(db, `${ROOT_PATH}/products`, p._id), {stock: increment(q)});
                        totalKg += q;
                        el.value = ''; 
                        hasData = true;
                    }
                });
                
                if(hasData) {
                    const aname = document.getElementById('h-area').options[document.getElementById('h-area').selectedIndex].getAttribute('data-name');
                    batch.set(doc(collection(db, `${ROOT_PATH}/harvest_logs`)), {area: aname, time: new Date(dVal).setHours(12), user: user.name, total: totalKg});
                    await batch.commit();
                    Utils.toast(`Đã lưu ${totalKg}kg vào kho!`);
                } else { Utils.toast("Chưa nhập số!", "err"); }
            };
            
            // Logic Giỏ hàng
            let cart=[]; 
            const upC=()=>{document.getElementById('cart-list').innerHTML=cart.map((i,x)=>`<div class="flex justify-between text-[10px] bg-slate-50 p-1 rounded mb-1"><span>${i.name}</span><span>${i.qty} x ${i.price.toLocaleString()} = ${(i.qty*i.price).toLocaleString()} <b onclick="document.getElementById('d-${x}').click()" class="text-red-500 cursor-pointer ml-2">x</b></span><button id="d-${x}" class="hidden"></button></div>`).join(''); document.getElementById('cart-total').innerText=cart.reduce((a,b)=>a+b.qty*b.price,0).toLocaleString()+'đ'; cart.forEach((_,i)=>document.getElementById(`d-${i}`).onclick=()=>{cart.splice(i,1);upC()})};
            document.getElementById('btn-add-cart').onclick=()=>{const s=document.getElementById('s-prod'); if(s.value){cart.push({code:s.value,name:s.options[s.selectedIndex].getAttribute('data-name'),qty:Number(document.getElementById('s-qty').value),price:Number(document.getElementById('s-price').value)}); upC(); document.getElementById('s-qty').value='';}};
            document.getElementById('btn-save-sell').onclick=async()=>{if(cart.length){const b=db.batch(); b.set(doc(collection(db,`${ROOT_PATH}/shipping`)),{customer:document.getElementById('s-cust').value,items:cart,total:cart.reduce((a,b)=>a+b.qty*b.price,0),user:user.name, time:Date.now()}); cart.forEach(i=>{const p=products.find(x=>x.code===i.code);if(p)b.update(doc(db,`${ROOT_PATH}/products`,p._id),{stock:increment(-i.qty)})}); await b.commit(); Utils.toast("Đã xuất bán!"); cart=[]; upC(); document.getElementById('s-cust').value='';} else {Utils.toast("Giỏ trống!","err")} };

        }, 300);
    }
};
