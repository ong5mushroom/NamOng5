import { addDoc, collection, db, ROOT_PATH, doc, updateDoc, increment, deleteDoc, writeBatch, getDocs } from '../config.js';
import { Utils } from '../utils.js';

// ... (Giữ nguyên phần đầu: window.THDG_Action, v.v...) ...
window.THDG_Action = {
    delOne: async (id, name) => {
        if(confirm(`Xóa mã "${name}"?`)) {
            try { await deleteDoc(doc(db, `${ROOT_PATH}/products`, id)); Utils.toast("Đã xóa!"); } catch(e) { alert(e.message); }
        }
    },
    resetAll: async () => {
        if(confirm("⚠️ CẢNH BÁO: XÓA SẠCH DANH SÁCH HÀNG HÓA?")) {
            try {
                const snap = await getDocs(collection(db, `${ROOT_PATH}/products`));
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                Utils.toast("✅ Đã xóa sạch!");
            } catch(e) { alert("Lỗi: "+e.message); }
        }
    }
};

export const THDG = {
    render: (data, user) => {
        // ... (Giữ nguyên phần render danh sách sản phẩm) ...
        const c = document.getElementById('view-th'); if (!c || c.classList.contains('hidden')) return;

        // --- PHÂN QUYỀN ---
        const role = (user.role || '').toLowerCase();
        const isManager = ['admin', 'giám đốc', 'quản lý'].some(r => role.includes(r));
        
        let products = (Array.isArray(data.products) ? data.products : []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
        
        const renderProductList = () => {
             // ... (Copy lại phần renderProductList cũ hoặc dùng file cũ, chỉ cần chú ý hàm btn-save-h bên dưới) ...
             // ĐỂ TIẾT KIỆM CHỖ, TÔI CHỈ VIẾT LẠI ĐOẠN XỬ LÝ NÚT LƯU KHO QUAN TRỌNG NHẤT:
             const groups = {
                '1': { title: '🍄 NẤM TƯƠI', color: 'green', items: products.filter(p => String(p.group) === '1') },
                '2': { title: '🍂 PHỤ PHẨM', color: 'orange', items: products.filter(p => String(p.group) === '2') },
                '3': { title: '🏭 SƠ CHẾ', color: 'purple', items: products.filter(p => String(p.group) === '3') },
                '4': { title: '🛠️ VẬT TƯ & KHÁC', color: 'blue', items: products.filter(p => !['1','2','3'].includes(String(p.group))) }
            };

            const renderRow = (p, color) => `
                <div class="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200 shadow-sm relative">
                    <div class="flex items-center gap-1 overflow-hidden">
                        ${isManager ? `<button onclick="window.THDG_Action.delOne('${p.id}', '${p.name}')" class="text-red-400 hover:text-red-600 font-bold px-1 text-xs">×</button>` : ''}
                        <div>
                            <span class="text-[11px] font-bold text-slate-700 truncate w-24 block" title="${p.name}">${p.name}</span>
                            <span class="text-[9px] text-slate-400 font-bold">Tồn: <span id="stk-${p.code}" class="text-blue-600 font-black">${(p.stock||0).toLocaleString()}</span></span>
                        </div>
                    </div>
                    <input type="number" step="0.1" id="in-${p.code}" class="w-16 p-1 text-center font-bold text-slate-700 border border-slate-200 rounded text-xs outline-none focus:border-${color}-500 bg-white transition" placeholder="...">
                </div>`;

            const container = document.getElementById('product-groups-container');
            if(container) {
                container.innerHTML = Object.keys(groups).map(k => `
                    <div class="bg-white/60 p-2 rounded-xl border border-slate-100">
                        <div class="text-[10px] font-bold text-${groups[k].color}-700 mb-2 uppercase border-b border-slate-100 pb-1 ml-1">${groups[k].title}</div>
                        <div class="grid grid-cols-2 gap-2">
                            ${groups[k].items.length ? groups[k].items.map(p => renderRow(p, groups[k].color)).join('') : '<div class="col-span-2 text-[10px] text-slate-300 italic text-center">Chưa có mã</div>'}
                        </div>
                    </div>
                `).join('');
            }
        };

        c.innerHTML = `... (Giữ nguyên HTML cũ) ...`; // Bạn dùng lại HTML của file thdg.js cũ, chỉ thay thế đoạn logic JS dưới đây:

        // VẼ LẠI UI VÀ GẮN SỰ KIỆN
        const fullRender = () => {
             // ... HTML của view ...
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
                            ${isManager ? `<div class="flex gap-2"><button onclick="window.THDG_Action.resetAll()" class="text-[9px] font-bold text-red-500 border border-red-200 bg-white px-2 py-1 rounded">RESET</button><button id="btn-add" class="text-[9px] font-bold text-green-600 border border-green-200 bg-white px-2 py-1 rounded">+ MÃ</button></div>` : ''}
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
                            <div id="product-groups-container"></div>
                            <button id="btn-save-h" class="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-green-200 active:scale-95 transition">LƯU KHO</button>
                        </div>
                    </div>
                </div>
                <div id="zone-sell" class="hidden animate-fade-in">... (Giữ nguyên phần Xuất Bán) ...</div>
            </div>`;
            
            renderProductList();
            
            // --- SỰ KIỆN QUAN TRỌNG: LƯU KHO ---
            setTimeout(() => {
                const di = document.getElementById('h-date'); if(di) di.valueAsDate = new Date();
                
                // Switch Tab
                const bIn = document.getElementById('btn-tab-in'), bOut = document.getElementById('btn-tab-out');
                const switchTab = (isIn) => {
                    const zIn = document.getElementById('zone-harvest'), zOut = document.getElementById('zone-sell');
                    if(isIn) { zIn.classList.remove('hidden'); zOut.classList.add('hidden'); bIn.classList.replace('text-slate-500','bg-white'); bIn.classList.add('text-green-700','shadow-sm'); bOut.classList.remove('bg-white','text-orange-600','shadow-sm'); bOut.classList.add('text-slate-500'); } 
                    else { zIn.classList.add('hidden'); zOut.classList.remove('hidden'); bOut.classList.replace('text-slate-500','bg-white'); bOut.classList.add('text-orange-600','shadow-sm'); bIn.classList.remove('bg-white','text-green-700','shadow-sm'); bIn.classList.add('text-slate-500'); }
                };
                bIn.onclick = () => switchTab(true); bOut.onclick = () => switchTab(false);

                // Nút Thêm Mã (Manager)
                if(isManager) {
                    const btnAdd = document.getElementById('btn-add');
                    if(btnAdd) btnAdd.onclick = () => {
                         Utils.modal("Tạo Mã Mới", `<input id="n-n" placeholder="Tên (VD: Nấm Hương)" class="w-full p-2 border rounded mb-2"><input id="n-c" placeholder="Mã (Viết liền: namhuong)" class="w-full p-2 border rounded mb-2"><select id="n-g" class="w-full p-2 border rounded"><option value="1">Nấm Tươi</option><option value="2">Phụ Phẩm</option><option value="3">Sơ Chế</option><option value="4">Vật Tư</option></select>`, [{id:'s-ok', text:'Lưu'}]);
                         setTimeout(() => document.getElementById('s-ok').onclick = async () => { const n=document.getElementById('n-n').value, c=document.getElementById('n-c').value, g=document.getElementById('n-g').value; if(n && c) { await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g, stock:0}); Utils.modal(null); Utils.toast("Đã thêm!"); } }, 100);
                    }
                }

                // --- LOGIC LƯU VÀ CỘNG DỒN VÀO NHÀ ---
                document.getElementById('btn-save-h').onclick = async () => {
                    const aid = document.getElementById('h-area').value; 
                    const dVal = document.getElementById('h-date').value;
                    if(!dVal || !aid) return Utils.toast("Thiếu ngày hoặc nguồn!", "err");
                    
                    try {
                        const batch = writeBatch(db); 
                        let hasData = false; 
                        let totalKg = 0; 
                        let details = {};
                        
                        products.forEach(p => { 
                            const el = document.getElementById(`in-${p.code}`); 
                            if(el && Number(el.value) > 0) { 
                                const q = Number(el.value); 
                                if(p.id) {
                                    // 1. Cộng vào Kho sản phẩm
                                    batch.update(doc(db, `${ROOT_PATH}/products`, p.id), {stock: increment(q)}); 
                                    
                                    details[p.code] = q; 
                                    totalKg += q; 
                                    hasData = true; 
                                    
                                    // UI Update
                                    p.stock = (p.stock || 0) + q;
                                    const stockEl = document.getElementById(`stk-${p.code}`);
                                    if(stockEl) stockEl.innerText = p.stock.toLocaleString();
                                    el.value = ''; 
                                }
                            } 
                        });

                        if(hasData) { 
                            const aname = document.getElementById('h-area').options[document.getElementById('h-area').selectedIndex].getAttribute('data-name'); 
                            
                            // 2. Lưu Nhật Ký Thu Hoạch
                            batch.set(doc(collection(db, `${ROOT_PATH}/harvest_logs`)), {
                                area: aname, 
                                details, 
                                total: totalKg, 
                                user: user.name, 
                                time: new Date(dVal).setHours(12)
                            }); 
                            
                            // 3. CỘNG DỒN VÀO NHÀ TRỒNG (Fix lỗi tại đây)
                            if(aid !== 'MuaNgoai') {
                                // Kiểm tra xem aid (ID nhà) có đúng không
                                if(aid && aid.length > 3) {
                                    batch.update(doc(db, `${ROOT_PATH}/houses`, aid), { 
                                        totalYield: increment(totalKg) // Dùng increment để cộng dồn an toàn
                                    }); 
                                } else {
                                    console.error("Lỗi ID nhà:", aid);
                                }
                            }

                            await batch.commit(); 
                            Utils.toast(`✅ Đã lưu ${totalKg}kg!`); 
                            Utils.notifySound(); // Kêu Ting 1 cái xác nhận
                        } else { 
                            Utils.toast("Chưa nhập số!", "err"); 
                        }
                    } catch(err) {
                        alert("Lỗi lưu: " + err.message);
                    }
                };
            }, 300);
        };
        
        fullRender();
    }
};
