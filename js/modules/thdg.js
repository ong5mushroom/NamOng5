import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc } from '../config.js';
import { Utils } from '../utils.js';

const COMPANY = { 
    name: "CÔNG TY TNHH NẤM ÔNG 5", 
    address: "Thôn Đa Ra Hoa, xã Lạc Dương, Tỉnh Lâm Đồng", 
    mst: "5801474272", hotline: "0899.49.0808", slogan: '"Trao sức khỏe, trọn yêu thương"' 
};

// --- HÀM TOÀN CỤC (Định nghĩa 1 lần duy nhất để tránh lỗi) ---
window.THDG_Actions = {
    delProd: async (id, name) => {
        if(confirm(`⚠️ CẢNH BÁO ADMIN:\nBạn có chắc chắn muốn xóa mã "${name}"?\nDữ liệu tồn kho của mã này sẽ mất vĩnh viễn!`)) {
            try {
                await deleteDoc(doc(db, `${ROOT_PATH}/products`, id));
                Utils.toast("Đã xóa mã sản phẩm!");
                // Không cần reload trang, onSnapshot trong app.js sẽ tự vẽ lại
            } catch (e) {
                Utils.toast("Lỗi khi xóa: " + e.message, "err");
            }
        }
    }
};

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        if (!data) { c.innerHTML = '<div class="p-10 text-center text-slate-400">Đang tải...</div>'; return; }

        try {
            // --- PHÂN QUYỀN (CHECK ADMIN) ---
            // Chỉ hiện các nút quản lý nếu role chứa: Admin, Quản lý, hoặc Giám đốc
            const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));

            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const logs = Array.isArray(data.harvest) ? data.harvest : [];
            
            const todayStr = new Date().toDateString();
            const todayLogs = (data.shipping || []).filter(s => new Date(s.time).toDateString() === todayStr);

            const y = new Date(); y.setDate(y.getDate()-1);
            const yStr = y.toDateString();
            const yHarvest = logs.filter(l => new Date(l.time).toDateString() === yStr);
            const yShips = (data.shipping||[]).filter(s => new Date(s.time).toDateString() === yStr);

            const g1 = products.filter(p => p && String(p.group) === '1');
            const g2 = products.filter(p => p && String(p.group) === '2');
            const g3 = products.filter(p => p && String(p.group) === '3');

            // Hàm vẽ dòng nhập (Chỉ hiện nút Xóa nếu là Admin)
            const renderInputRow = (p) => `
                <div class="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200">
                    <div class="flex items-center gap-1 overflow-hidden">
                        ${isAdmin ? `<button onclick="window.THDG_Actions.delProd('${p._id}', '${p.name}')" class="text-red-300 hover:text-red-600 w-5 h-5 flex items-center justify-center rounded-full transition-colors"><i class="fas fa-times text-[10px]"></i></button>` : ''}
                        <span class="text-[10px] font-bold text-slate-600 truncate w-20" title="${p.name}">${p.name}</span>
                    </div>
                    <input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-slate-700 border border-slate-300 rounded outline-none text-xs focus:border-green-500" placeholder="0">
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
                            <h3 class="font-black text-green-800 text-xs flex items-center gap-2"><i class="fas fa-warehouse text-lg"></i> NHẬP KHO</h3>
                            ${isAdmin ? `<button id="btn-add-prod" class="bg-white border text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-green-50">+ Mã SP</button>` : ''}
                        </div>
                        <div class="space-y-3">
                            <div class="flex gap-2">
                                <div class="w-1/3"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Ngày Thu</label><input type="date" id="h-date" class="w-full p-2 rounded-lg border text-xs font-bold"></div>
                                <div class="flex-1"><label class="text-[9px] font-bold text-slate-500 uppercase ml-1">Nguồn Thu</label><select id="h-area" class="w-full p-2 rounded-lg border text-xs font-bold"><option value="">-- Chọn --</option>${houses.map(h => `<option value="${h.id}" data-name="${h.name}">${h.name}</option>`).join('')}<option value="MuaNgoai" data-name="Mua Ngoài">Mua Ngoài</option></select></div>
                            </div>

                            ${g1.length ? `<div class="bg-green-50 p-2 rounded-xl border border-green-200"><div class="text-[10px] font-bold text-green-700 mb-1">Nấm Tươi</div><div class="grid grid-cols-2 gap-2">${g1.map(renderInputRow).join('')}</div></div>`:''}
                            ${g2.length ? `<div class="bg-orange-50 p-2 rounded-xl border border-orange-200"><div class="text-[10px] font-bold text-orange-700 mb-1">Phụ Phẩm</div><div class="grid grid-cols-2 gap-2">${g2.map(renderInputRow).join('')}</div></div>`:''}
                            ${g3.length ? `<div class="bg-purple-50 p-2 rounded-xl border border-purple-200"><div class="text-[10px] font-bold text-purple-700 mb-1">Sơ Chế</div><div class="grid grid-cols-2 gap-2">${g3.map(renderInputRow).join('')}</div></div>`:''}

                            <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition">LƯU KHO & CỘNG DỒN</button>
                            
                            <div class="mt-4 pt-2 border-t border-green-200">
                                <span class="text-[9px] font-bold text-slate-400 uppercase">Hôm qua (${y.getDate()}/${y.getMonth()+1})</span>
                                <div class="max-h-24 overflow-y-auto space-y-1 mt-1">${yHarvest.length ? yHarvest.map(l=>`<div class="flex justify-between text-[10px] bg-white p-1 rounded border"><span>${l.area}</span><span class="font-bold text-green-600">${l.total}kg</span></div>`).join('') : '<div class="text-[10px] text-slate-300 italic">Không có dữ liệu</div>'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="zone-sell" class="hidden animate-pop">
                    <div class="glass p-5 border-l-8 border-orange-500 bg-orange-50/40">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-orange-800 text-xs flex items-center gap-2"><i class="fas fa-truck text-lg"></i> XUẤT BÁN</h3>
                            ${isAdmin ? `<button id="btn-rep-day" class="bg-white border text-orange-700 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm hover:bg-orange-50">BC Ngày</button>` : ''}
                        </div>
                        <div class="space-y-3 bg-white p-3 rounded-xl shadow-sm border border-orange-100">
                            <div class="grid grid-cols-1 gap-2"><input id="s-cust" placeholder="Khách Hàng" class="w-full p-2 text-xs border rounded font-bold"><textarea id="s-note" placeholder="Ghi chú..." class="w-full p-2 text-xs border rounded h-10"></textarea></div>
                            <div class="bg-slate-50 p-2 rounded border border-slate-200">
                                <div class="flex gap-2 mb-2"><select id="s-prod" class="flex-1 p-2 text-xs border rounded font-bold outline-none"><option value="">-- Chọn Nấm (Tồn kho) --</option>${products.map(p => `<option value="${p.code}" data-name="${p.name}" data-price="${p.price||0}">${p.name} (Tồn: ${p.stock||0})</option>`).join('')}</select></div>
                                <div class="flex gap-2 items-center"><input id="s-qty" type="number" placeholder="SL" class="w-16 p-2 text-xs border rounded text-center font-bold"><span class="text-xs">x</span><input id="s-price" type="number" placeholder="Giá" class="w-20 p-2 text-xs border rounded text-center"><button id="btn-add-cart" class="flex-1 bg-orange-500 text-white p-2 rounded font-bold text-xs shadow">THÊM</button></div>
                            </div>
                            <div class="border-t pt-2"><div id="cart-list" class="space-y-1 mb-2 text-xs"></div><div class="flex justify-between text-sm font-black text-orange-800"><span>TỔNG:</span><span id="cart-total">0</span></div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-4"><button id="btn-save-sell" class="py-2 bg-orange-600 text-white rounded font-bold text-xs shadow">LƯU & TRỪ KHO</button><button id="btn-print" class="py-2 bg-blue-600 text-white rounded font-bold text-xs shadow">IN PHIẾU</button></div>
                        
                        <div class="mt-4 pt-2 border-t border-orange-200"><span class="text-[9px] font-bold text-slate-400 uppercase">Đơn hôm qua</span><div class="max-h-24 overflow-y-auto space-y-1 mt-1">${yShips.length ? yShips.map(s=>`<div class="flex justify-between text-[10px] bg-white p-1 rounded border"><span>${s.customer}</span><span class="font-bold text-orange-600">${Number(s.total).toLocaleString()}đ</span></div>`).join('') : '<div class="text-[10px] text-slate-300 italic">Không có đơn</div>'}</div></div>
                    </div>
                </div>
            </div>`;

            // EVENTS
            setTimeout(() => {
                const dateInput = document.getElementById('h-date'); if(dateInput) dateInput.valueAsDate = new Date();
                
                // Tabs
                const bIn=document.getElementById('btn-tab-in'), bOut=document.getElementById('btn-tab-out');
                bIn.onclick=()=>{document.getElementById('zone-harvest').classList.remove('hidden');document.getElementById('zone-sell').classList.add('hidden');bIn.classList.add('bg-green-600','text-white');bIn.classList.remove('text-slate-500');bOut.classList.remove('bg-orange-600','text-white');};
                bOut.onclick=()=>{document.getElementById('zone-harvest').classList.add('hidden');document.getElementById('zone-sell').classList.remove('hidden');bOut.classList.add('bg-orange-600','text-white');bIn.classList.remove('bg-green-600','text-white');};

                // CHỈ ADMIN MỚI CÓ CÁC SỰ KIỆN NÀY
                const btnAddP = document.getElementById('btn-add-prod');
                if(btnAddP) btnAddP.onclick=()=>{
                    Utils.modal("Thêm Mã Mới",`<input id="n-n" placeholder="Tên SP" class="w-full p-2 border mb-2"><input id="n-c" placeholder="Mã (ko dấu)" class="w-full p-2 border mb-2"><select id="n-g" class="w-full p-2 border"><option value="1">Tươi</option><option value="2">Phụ phẩm</option><option value="3">Sơ chế</option></select>`,[{id:'s-p',text:'Lưu'}]);
                    setTimeout(()=>document.getElementById('s-p').onclick=async()=>{const n=document.getElementById('n-n').value,c=document.getElementById('n-c').value,g=document.getElementById('n-g').value;if(n&&c){await addDoc(collection(db,`${ROOT_PATH}/products`),{name:n,code:c,group:g,stock:0});Utils.modal(null);}},100);
                };

                const btnRep = document.getElementById('btn-report-day');
                if(btnRep) btnRep.onclick=()=>{
                    if(!todayLogs.length)return Utils.toast("Chưa có đơn!","err");
                    let csv="Ngay,Khach,SP,SL,Gia,ThanhTien\n";
                    todayLogs.forEach(l=>{const d=new Date(l.time).toLocaleDateString('vi-VN');l.items.forEach(i=>csv+=`${d},${l.customer},${i.name},${i.qty},${i.price},${i.qty*i.price}\n`)});
                    const l=document.createElement("a");l.href=encodeURI("data:text/csv;charset=utf-8,"+csv);l.download="BC_BanHang.csv";l.click();
                };

                // CÁC NÚT CƠ BẢN (AI CŨNG DÙNG ĐƯỢC)
                document.getElementById('btn-save-h').onclick=async()=>{
                    const aid=document.getElementById('h-area').value, dateVal=document.getElementById
