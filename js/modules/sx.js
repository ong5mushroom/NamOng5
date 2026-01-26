// ĐƯỜNG DẪN: js/modules/sx.js
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if(c.classList.contains('hidden')) return;

        // Lấy dữ liệu từ App truyền sang
        const inventory = data.spawn_inventory || [];
        
        // Sắp xếp
        const sortedInv = [...inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

        // --- VẼ GIAO DIỆN (HTML) ---
        c.innerHTML = `
            <div class="space-y-6">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase">KHO PHÔI</h3>
                        <button id="btn-import-spawn" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold">+ Nhập</button>
                    </div>
                    <div class="max-h-60 overflow-y-auto space-y-2">
                        ${sortedInv.length > 0 ? sortedInv.map(i => `
                            <div class="bg-white p-2 border rounded flex justify-between text-xs">
                                <span>${i.code} (${i.date})</span>
                                <span class="font-bold text-indigo-600">${i.qty}</span>
                            </div>
                        `).join('') : '<p class="text-center text-xs text-slate-400">Kho trống</p>'}
                    </div>
                </div>
            </div>
        `;

        // --- GẮN SỰ KIỆN ---
        setTimeout(() => {
            const btnImp = document.getElementById('btn-import-spawn');
            if(btnImp) btnImp.onclick = () => {
                Utils.modal("Nhập Phôi", 
                    `<input id="imp-code" placeholder="Mã lô phôi" class="w-full p-2 border mb-2">
                     <input id="imp-qty" type="number" placeholder="Số lượng" class="w-full p-2 border">`,
                    [{id:'save-imp', text:'Lưu', cls:'bg-indigo-600 text-white'}]
                );
                
                setTimeout(() => {
                    const btnSave = document.getElementById('save-imp');
                    if(btnSave) btnSave.onclick = async () => {
                        const code = document.getElementById('imp-code').value;
                        const qty = Number(document.getElementById('imp-qty').value);
                        
                        if(code && qty) {
                            Utils.toast("Đang lưu...");
                            Utils.modal(null); 
                            
                            // GỬI LÊN SERVER
                            await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {
                                code, qty, date: new Date().toISOString().split('T')[0], status: 'AVAILABLE'
                            });
                            Utils.toast("Đã nhập kho phôi!");
                        }
                    };
                }, 100);
            };
        }, 0);
    }
};
