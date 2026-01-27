import { addDoc, collection, db, ROOT_PATH, deleteDoc, doc } from '../config.js';
import { Utils } from '../utils.js';

export const Admin = {
    openSettings: () => {
        const html = `
            <div class="space-y-4">
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Quản trị Hệ thống</h4>
                    <button class="w-full p-3 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs mb-2 flex justify-between" id="btn-manage-staff">
                        <span>Quản lý Nhân viên (Thêm/Xóa)</span><i class="fas fa-users-cog"></i>
                    </button>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Xuất Báo Cáo</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="p-3 bg-green-50 text-green-700 font-bold rounded-xl text-xs border border-green-100" id="btn-exp-th">Báo Cáo Thu Hoạch</button>
                        <button class="p-3 bg-orange-50 text-orange-700 font-bold rounded-xl text-xs border border-orange-100" id="btn-exp-ship">Báo Cáo Bán Hàng</button>
                    </div>
                </div>
            </div>`;
        
        Utils.modal("Cài Đặt & Quản Lý", html);

        setTimeout(() => {
            document.getElementById('btn-manage-staff').onclick = Admin.openStaffManager;
            document.getElementById('btn-exp-th').onclick = () => Admin.exportCSV('harvest_logs', 'ThuHoach');
            document.getElementById('btn-exp-ship').onclick = () => Admin.exportCSV('shipping', 'BanHang');
        }, 100);
    },

    openStaffManager: () => {
        // Form thêm nhân viên
        Utils.modal("Danh Sách Nhân Viên", `
            <div class="mb-4 border-b pb-4">
                <h5 class="text-xs font-bold mb-2">Thêm Mới</h5>
                <input id="new-u-name" placeholder="Họ Tên" class="w-full p-2 border rounded mb-2">
                <div class="flex gap-2 mb-2">
                    <input id="new-u-id" placeholder="ID (Số)" type="number" class="flex-1 p-2 border rounded">
                    <input id="new-u-pin" placeholder="PIN (4 số)" type="number" class="flex-1 p-2 border rounded">
                </div>
                <select id="new-u-role" class="w-full p-2 border rounded mb-2">
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Tổ trưởng">Tổ trưởng</option>
                    <option value="Quản lý">Quản lý</option>
                </select>
                <button id="btn-save-user" class="w-full py-2 bg-blue-600 text-white font-bold rounded">Lưu Nhân Viên</button>
            </div>
            <div id="staff-list" class="max-h-60 overflow-y-auto space-y-2">Loading...</div>
        `);

        // Render list & Bind events (Cần lấy data từ app - ở đây ta mock logic gọi lại sau)
        // Lưu ý: Logic này cần truy cập db trực tiếp
        // ... (Logic chi tiết thêm/xóa đã được tích hợp trong App.listenData, ở đây ta chỉ gửi lệnh)
        
        setTimeout(() => {
            const btnSave = document.getElementById('btn-save-user');
            if(btnSave) btnSave.onclick = async () => {
                const n=document.getElementById('new-u-name').value, id=document.getElementById('new-u-id').value, pin=document.getElementById('new-u-pin').value, r=document.getElementById('new-u-role').value;
                if(n&&id&&pin) {
                    await addDoc(collection(db, `${ROOT_PATH}/employees`), { name:n, id:id, pin:pin, role:r, score:0 });
                    Utils.toast("Đã thêm nhân viên!");
                    // Admin.openStaffManager(); // Refresh
                }
            }
        }, 100);
    },

    exportCSV: (coll, name) => {
        Utils.toast("Đang tải dữ liệu...");
        // Logic export đơn giản: Tạo link download dummy (Cần implement logic fetch data thật nếu muốn full)
        const content = "data:text/csv;charset=utf-8,Ngay,Nguoi,NoiDung\n" + new Date().toISOString() + ",System,Export Test";
        const link = document.createElement("a");
        link.href = encodeURI(content);
        link.download = `${name}_${Date.now()}.csv`;
        link.click();
    }
};
