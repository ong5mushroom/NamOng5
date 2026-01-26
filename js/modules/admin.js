// ĐƯỜNG DẪN: js/modules/admin.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Admin = {
    openSettings: () => {
        const html = `
            <div class="space-y-4">
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Báo cáo & Dữ liệu</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="p-3 bg-green-50 text-green-700 font-bold rounded-xl text-xs btn-action border border-green-100" id="btn-export-th"><i class="fas fa-file-excel mr-1"></i> Thu Hoạch</button>
                        <button class="p-3 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs btn-action border border-blue-100" id="btn-export-task"><i class="fas fa-tasks mr-1"></i> Công Việc</button>
                    </div>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Quản trị hệ thống</h4>
                    <button class="w-full p-3 bg-slate-100 font-bold rounded-xl text-xs btn-action mb-2 flex justify-between" id="btn-manage-staff"><span>Thêm Nhân viên Mới</span><i class="fas fa-user-plus"></i></button>
                </div>
            </div>`;
        
        Utils.modal("Quản Trị Hệ Thống", html);

        setTimeout(() => {
            const btnExpTH = document.getElementById('btn-export-th');
            if(btnExpTH) btnExpTH.onclick = () => Admin.exportCSV('harvest_logs', 'BaoCao_ThuHoach');
            
            const btnExpTask = document.getElementById('btn-export-task');
            if(btnExpTask) btnExpTask.onclick = () => Admin.exportCSV('tasks', 'BaoCao_CongViec');
            
            const btnStaff = document.getElementById('btn-manage-staff');
            if(btnStaff) btnStaff.onclick = Admin.openAddStaff;
        }, 100);
    },

    exportCSV: (collName, fileName) => {
        Utils.toast("Đang chuẩn bị file tải xuống...");
        const csvContent = "data:text/csv;charset=utf-8,Ngay,Nguoi,NoiDung\n" + new Date().toISOString() + ",Admin,Test Export";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${fileName}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        Utils.modal(null);
    },

    openAddStaff: () => {
        Utils.modal("Thêm Nhân Sự", `
            <input id="new-emp-name" placeholder="Họ và Tên" class="w-full p-2 border rounded mb-2">
            <div class="grid grid-cols-2 gap-2 mb-2">
                <input id="new-emp-id" type="number" placeholder="ID (Số)" class="p-2 border rounded">
                <input id="new-emp-pin" type="number" placeholder="PIN (4 số)" class="p-2 border rounded">
            </div>
            <select id="new-emp-role" class="w-full p-2 border rounded mb-2">
                <option value="Nhân viên">Nhân viên</option>
                <option value="Tổ trưởng">Tổ trưởng</option>
                <option value="Quản lý">Quản lý</option>
            </select>
        `, [{id:'save-staff', text:'Lưu Hồ Sơ'}]);

        setTimeout(() => document.getElementById('save-staff').onclick = async () => {
            const n = document.getElementById('new-emp-name').value;
            const id = document.getElementById('new-emp-id').value;
            const pin = document.getElementById('new-emp-pin').value;
            const r = document.getElementById('new-emp-role').value;
            
            if(!n || !id || !pin) return Utils.toast("Thiếu thông tin!", "err");
            
            await addDoc(collection(db, `${ROOT_PATH}/employees`), { 
                name:n, id:Number(id), pin:pin, role:r, score:0, joinedAt: Date.now() 
            });
            Utils.modal(null);
            Utils.toast(`Đã thêm nhân viên: ${n}`);
        }, 100);
    }
};
