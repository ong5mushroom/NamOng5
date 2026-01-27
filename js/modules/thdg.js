import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        // An toàn dữ liệu
        if (!data || !data.houses) { c.innerHTML = '<div class="p-10 text-center text-slate-400">Đang tải...</div>'; return; }

        try {
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const logs = Array.isArray(data.harvest) ? data.harvest : [];
            
            // Tính tổng
            const report = {};
            logs.forEach(l => {
                if(l && l.area) {
                    if(!report[l.area]) report[l.area] = 0;
                    report[l.area] += (Number(l.total) || 0);
                }
            });

            // Lọc SP
            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');

            c.innerHTML = `
            <div class="space-y-4 pb-24">
                <div class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs bg-green-100 text-green-700 shadow-sm" id="tab-in">NHẬP KHO</button>
                    <button class="flex-1 py-3 rounded-lg font-bold text-xs text-slate-400 hover:bg-slate-50" id="tab-out">XUẤT & HÓA ĐƠN</button>
                </div>

                <div id="zone-th-in" class="glass p-5 border-l-4 border-green-500 bg-white animate-pop">
                    <div class="flex justify-between items-center mb-4"><span class="font-black text-slate-700 uppercase flex items-center gap-2"><i class="fas fa-warehouse text-green-600"></i> Nhập Kho</span><button id="btn-add-prod" class="text-xs bg-slate-100 px-3 py-1 rounded font-bold border border-slate-200">+ Mã</button></div>
                    <div class="space-y-3">
                        <select id="th-area" class="w-full p-3 border rounded-xl font-bold text-green-700 outline-none"><option value="">-- Nguồn Thu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="Mua Ngoài">Mua Ngoài</option></select>
                        ${g1.length ? `<div class="bg-green-50 p-3 rounded-xl border border-green-100"><h5 class="text-[10px] font-bold text-green-700 mb-2 uppercase">Nấm Tươi</h5><div class="grid grid-cols-3 gap-2">${g1.map(p=>`<div><label class="text-[9px] block text-center truncate">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="w-full p-1 text-center border rounded font-bold text-green-700 bg-white" placeholder="0"></div>`).join('')}</div></div>`:''}
                        ${g2.length ? `<div class="bg-orange-50 p-3 rounded-xl border border-orange-100"><h5 class="text-[10px] font-bold text-orange-700 mb-2 uppercase">Nấm Khô</h5><div class="grid grid-cols-3 gap-2">${g2.map(p=>`<div><label class="text-[9px] block text-center truncate">${p.name}</label><input type="number" step="0.1" id="th-${p.code}" class="w-full p-1 text-center border rounded font-bold text-orange-700 bg-white" placeholder="0"></div>`).join('')}</div></div>`:''}
                        <button id="btn-save-th" class="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 active:scale-95 transition">LƯU KHO</button>
                    </div>
                </div>

                <div id="zone-th-out" class="hidden glass p-5 border-l-4 border-orange-500 bg-white animate-pop">
                    <h4 class="font-black text-slate-700 uppercase mb-4 flex items-center gap-2"><i class="fas fa-file-invoice text-orange-600"></i> Hóa Đơn Bán Lẻ</h4>
                    <div class="space-y-3">
                        <input id="inv-cust" placeholder="Tên Khách Hàng / Đối Tác" class="w-full p-2 border rounded font-bold">
                        <input id="inv-phone" placeholder="Số Điện Thoại" class="w-full p-2 border rounded">
                        <textarea id="inv-note" placeholder="Ghi chú đơn hàng" class="w-full p-2 border rounded h-16"></textarea>
                        
                        <div class="bg-slate-50 p-3 rounded border border-slate-200">
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Chọn Sản Phẩm:</label>
                            <div class="flex gap-2 mb-2">
                                <select id="inv-prod" class="flex-1 p-2 border rounded text-sm font-bold"><option value="">-- Chọn --</option>${products.map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</select>
                                <input id="inv-qty" type="number" placeholder="SL" class="w-16 p-2 border rounded text-center font-bold">
                                <input id="inv-price" type="number" placeholder="Giá" class="w-20 p-2 border rounded text-center">
                            </div>
                            <button id="btn-add-item" class="w-full py-2 bg-slate-200 text-slate-600 font-bold rounded text-xs hover:bg-slate-300">+ Thêm dòng</button>
                        </div>
                        <div id="inv-cart" class="space-y-1 border-t pt-2"></div>
                        <div class="flex gap-2 pt-2">
                            <button id="btn-save-ship" class="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition">LƯU & XUẤT</button>
                            <button id="btn-print" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition"><i class="fas fa-print"></i> IN</button>
                        </div>
                    </div>
                </div>
            </div>`;

            let cart = [];
            const renderCart = () => {
                const el = document.getElementById('inv-cart');
                if(!el) return;
                el.innerHTML = cart.map((item, idx) => `
                    <div class="flex justify-between text-xs items-center bg-white p-2 rounded border border-slate-100">
                        <span class="font-bold text-slate-700">${item.name}</span>
                        <div class="flex gap-2 items-center">
                            <span>${item.qty} x ${item.price.toLocaleString()}</span>
                            <span class="font-bold text-orange-600">= ${(item.qty*item.price).toLocaleString()}</span>
                            <button class="text-red-500 px-2" onclick="document.getElementById('del-${idx}').click()"><i class="fas fa-times"></i></button>
                            <button id="del-${idx}" class="hidden"></button>
                        </div>
                    </div>`).join('');
                cart.forEach((_, idx) => { const btn = document.getElementById(`del-${idx}`); if(btn) btn.onclick = () => { cart.splice(idx, 1); renderCart(); }});
            };

            setTimeout(() => {
                document.getElementById('tab-in').onclick = () => { document.getElementById('zone-th-in').classList.remove('hidden'); document.getElementById('zone-th-out').classList.add('hidden'); };
                document.getElementById('tab-out').onclick = () => { document.getElementById('zone-th-in').classList.add('hidden'); document.getElementById('zone-th-out').classList.remove('hidden'); };
                
                document.getElementById('btn-add-prod').onclick = () => { Utils.modal("Thêm Mã", `<div><label>Tên</label><input id="n-n" class="w-full border p-2 mb-2"></div><div><label>Mã (ko dấu)</label><input id="n-c" class="w-full border p-2 mb-2"></div><select id="n-g" class="w-full border p-2"><option value="1">Tươi</option><option value="2">Khô</option></select>`, [{id:'s-p', text:'Lưu'}]); setTimeout(()=>document.getElementById('s-p').onclick=async()=>{const n=document.getElementById('n-n').value, c=document.getElementById('n-c').value, g=document.getElementById('n-g').value; if(n&&c){await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g}); Utils.modal(null);}},100); };
                
                document.getElementById('btn-add-item').onclick = () => { const n=document.getElementById('inv-prod').value, q=Number(document.getElementById('inv-qty').value), p=Number(document.getElementById('inv-price').value); if(n&&q>0) { cart.push({name:n, qty:q, price:p}); renderCart(); document.getElementById('inv-qty').value=''; } };
                
                document.getElementById('btn-save-th').onclick = async () => {
                    const area = document.getElementById('th-area').value;
                    let d={}, total=0;
                    products.forEach(p => { const el = document.getElementById(`th-${p.code}`); if(el && Number(el.value)>0) { d[p.code]=Number(el.value); total+=Number(el.value); el.value=''; } });
                    if(area && total>0) { await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), {area, details:d, total, user:user.name, time:Date.now()}); Utils.toast(`Đã lưu ${total}kg`); } else Utils.toast("Thiếu thông tin!", "err");
                };

                const printInvoice = () => {
                    if(cart.length === 0) return Utils.toast("Giỏ hàng trống!", "err");
                    const cust = document.getElementById('inv-cust').value || 'Khách lẻ';
                    const phone = document.getElementById('inv-phone').value || '';
                    const total = cart.reduce((sum, i) => sum + (i.qty*i.price), 0);
                    const date = new Date().toLocaleString('vi-VN');
                    
                    const w = window.open('', '', 'height=600,width=500');
                    w.document.write(`<html><head><title>HOA DON</title></head><body style="font-family: monospace; padding: 20px;">
                        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
                            <h3 style="margin: 0;">CÔNG TY TNHH NẤM ÔNG 5</h3>
                            <p style="margin: 2px 0; font-size: 11px;">MST: 5801474272</p>
                            <p style="margin: 2px 0; font-size: 11px;">ĐT: 03 789 777 68 - Hotline: 0899 49 0808</p>
                            <p style="margin: 2px 0; font-size: 11px;">ong5mushroom.com</p>
                            <p style="margin: 5px 0; font-style: italic; font-weight: bold; font-size: 11px;">"Trao sức khỏe, trọn yêu thương"</p>
                        </div>
                        <h4 style="text-align: center; margin: 10px 0;">HÓA ĐƠN BÁN LẺ</h4>
                        <div style="font-size: 12px; margin-bottom: 10px;">Khách: ${cust}<br>SĐT: ${phone}<br>Ngày: ${date}</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; border-top: 1px solid #000;">
                            <tr><th style="text-align:left">SP</th><th style="text-align:center">SL</th><th style="text-align:right">Giá</th><th style="text-align:right">Thành tiền</th></tr>
                            ${cart.map(i => `<tr><td style="padding: 4px 0;">${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${i.price.toLocaleString()}</td><td style="text-align:right">${(i.qty*i.price).toLocaleString()}</td></tr>`).join('')}
                            <tr style="border-top: 1px solid #000;"><td colspan="3" style="text-align:right; padding-top: 5px; font-weight: bold;">TỔNG CỘNG:</td><td style="text-align:right; padding-top: 5px; font-weight: bold;">${total.toLocaleString()}</td></tr>
                        </table>
                        <div style="text-align: center; margin-top: 20px; font-style: italic; font-size: 11px;">Cảm ơn quý khách!</div>
                    </body></html>`);
                    w.document.close(); w.print();
                };

                document.getElementById('btn-print').onclick = printInvoice;
                document.getElementById('btn-save-ship').onclick = async () => {
                    const cust = document.getElementById('inv-cust').value;
                    if(cart.length > 0 && cust) {
                        await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: cust, phone: document.getElementById('inv-phone').value, note: document.getElementById('inv-note').value, items: cart, user: user.name, time: Date.now() });
                        Utils.toast("Đã lưu đơn hàng!"); cart = []; renderCart(); document.getElementById('inv-cust').value = '';
                    } else Utils.toast("Thiếu tên khách hoặc giỏ hàng!", "err");
                };
            }, 100);

        } catch (e) { c.innerHTML = `<div class="p-10 text-red-500">Lỗi THDG: ${e.message}</div>`; }
    }
};
