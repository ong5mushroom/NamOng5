import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    // Không cần hàm init riêng nữa, App lo việc đó rồi
    
    render: (data) => {
        const c = document.getElementById('view-sx');
        if(c.classList.contains('hidden')) return;

        // LẤY DỮ LIỆU TỪ APP TRUYỀN VÀO (Luôn tươi mới)
        const inventory = data.spawn_inventory || []; 
        const houses = data.houses || [];
        const materials = data.materials || [];

        // Tính toán hiển thị
        const housesDisplay = [...houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        const totalSpawn = inventory.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

        // --- VẼ HTML (Giữ nguyên cấu trúc cũ) ---
        c.innerHTML = `
            <div class="space-y-6">
                <div class="glass p-5 border-l-4 border-indigo-500">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-black text-slate-700 uppercase">Kho A: ${totalSpawn.toLocaleString()} bịch</h3>
                        <button id="btn-import-spawn" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold">+ Nhập</button>
                    </div>
                    <div class="max-h-60 overflow-y-auto space-y-2">
                        ${inventory.map(i => `
                             <div class="bg-white p-2 border rounded flex justify-between text-xs">
                                <span>${i.code} (${i.date})</span>
                                <span class="font-bold text-indigo-600">${i.qty}</span>
                             </div>
                        `).join('')}
                    </div>
                </div>

                <div class="glass p-5 border-l-4 border-blue-500 space-y-3">
                    <h3>Xuất Vào Nhà</h3>
                    <select id="sx-source" class="w-full p-2 border rounded">
                        <option value="">-- Chọn Phôi --</option>
                        ${inventory.map(i => `<option value="${i._id}" data-qty="${i.qty}">Code: ${i.code} (SL: ${i.qty})</option>`).join('')}
                    </select>
                    <select id="sx-house-dest" class="w-full p-2 border rounded">
                         ${housesDisplay.map(h=>`<option value="${h._id}">${h.name}</option>`).join('')}
                    </select>
                    <input id="sx-qty" type="number" placeholder="Số lượng" class="w-full p-2 border rounded">
                    <button id="btn-distribute" class="w-full py-3 bg-blue-600 text-white rounded font-bold">XÁC NHẬN</button>
                </div>
            </div>
        `;

        // --- GẮN SỰ KIỆN (Logic gửi lên Server) ---
        // Lưu ý: Ở đây ta chỉ gửi dữ liệu lên Firebase. 
        // Khi Firebase cập nhật xong, nó sẽ báo về App.js -> App.js gọi lại SX.render -> Giao diện tự đổi.
        
        setTimeout(() => {
            // 1. Nhập Phôi
            document.getElementById('btn-import-spawn').onclick = () => {
                Utils.modal("Nhập Phôi", 
                    `<input id="imp-code" placeholder="Mã" class="w-full p-2 border rounded mb-2">
                     <input id="imp-qty" type="number" placeholder="SL" class="w-full p-2 border rounded">`, 
                    [{id:'save-imp', text:'Lưu', cls:'bg-indigo-600 text-white'}]
                );
                
                setTimeout(()=> document.getElementById('save-imp').onclick = async () => {
                     const code = document.getElementById('imp-code').value;
                     const qty = Number(document.getElementById('imp-qty').value);
                     
                     if(code && qty) {
                         Utils.modal(null); // Đóng modal trước
                         Utils.toast("Đang lưu...");
                         // Gửi lên Server
                         await addDoc(collection(db, `${ROOT_PATH}/spawn_inventory`), {
                             code, qty, date: new Date().toISOString().split('T')[0], status: 'AVAILABLE'
                         });
                         // KHÔNG CẦN CẬP NHẬT GIAO DIỆN THỦ CÔNG NỮA
                         // onSnapshot ở App.js sẽ tự lo việc đó
                     }
                }, 100);
            };

            // 2. Xuất vào nhà
            document.getElementById('btn-distribute').onclick = async () => {
                 const sourceId = document.getElementById('sx-source').value;
                 const houseId = document.getElementById('sx-house-dest').value;
                 const qty = Number(document.getElementById('sx-qty').value);

                 if(!sourceId || !houseId || !qty) return Utils.toast("Thiếu thông tin!", "err");

                 // Logic trừ kho và cập nhật nhà trên Firebase...
                 // (Copy lại logic updateDoc cũ của bạn vào đây)
                 
                 Utils.toast("Đã gửi lệnh xuất kho!");
                 // Tương tự, onSnapshot sẽ tự cập nhật cả Home và SX
            }
        }, 0);
    }
};
