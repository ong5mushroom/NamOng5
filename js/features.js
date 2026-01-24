import { addDoc, updateDoc, doc, collection, db, ROOT_PATH, deleteDoc } from './config.js';
import { UI } from './core.js';

// TẤT CẢ CÁC HÀM XỬ LÝ (ACTION) GỘP VÀO ĐÂY
export const Actions = {
    // --- AUTH & SYSTEM ---
    login: (user, data) => {
        const id = document.getElementById('login-user').value; const pin = document.getElementById('login-pin').value;
        const emp = data.employees.find(e => e.name === id && String(e.pin) == pin);
        if(emp) { 
            localStorage.setItem('n5_modular_user', JSON.stringify(emp)); 
            location.reload(); 
        } else UI.showMsg("Sai PIN!");
    },
    logout: () => { if(confirm("Thoát?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
    closeModal: () => UI.toggleModal(null),
    closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
    
    // --- CHAT ---
    sendChat: async (user) => { 
        const inp = document.getElementById('chat-input'); 
        if(inp.value.trim()) { 
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: user.id, senderName: user.name, time: Date.now() }); 
            inp.value=''; 
        } 
    },

    // --- HOME ---
    openAddHouse: () => UI.toggleModal(UI.Templates.ModalBase("Thêm Nhà Mới", `<input id="new-house-name" placeholder="Tên nhà (VD: Nhà F)">`, "submitAddHouse", "Tạo Nhà")),
    submitAddHouse: async () => { const n = document.getElementById('new-house-name').value; if(n) { await addDoc(collection(db, `${ROOT_PATH}/houses`), { name:n, status:'ACTIVE' }); UI.toggleModal(null); UI.showMsg("Đã thêm nhà"); } },
    showScoreGuide: () => UI.toggleModal(UI.Templates.ModalBase("Cách Tính Điểm", UI.Templates.ScoreGuide(), "closeModal", "Đã Hiểu")),

    // --- PRODUCTION (SX) ---
    setupHouseBatch: async () => { 
        const h = document.getElementById('sx-house-select').value; const s = document.getElementById('sx-strain').value; const q = Number(document.getElementById('sx-spawn-qty').value); const n = document.getElementById('sx-note').value;
        if(!h) return alert("Thiếu tin!"); 
        await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: s, currentSpawn: q, status: 'ACTIVE', startDate: Date.now(), note: n }); 
        UI.showMsg(`Đã vào lô tại ${h}`); 
    },
    openAddMat: () => UI.toggleModal(UI.Templates.ModalBase("Nhập Vật Tư", `<input id="mat-name" placeholder="Tên (Cồn, Găng tay...)"><input id="mat-qty" type="number" placeholder="Số lượng"><input id="mat-unit" placeholder="ĐVT (Lít, Hộp...)">`, "submitAddMat", "Nhập Kho")),
    submitAddMat: async () => { const n = document.getElementById('mat-name').value; const q = document.getElementById('mat-qty').value; const u = document.getElementById('mat-unit').value; if(!n) return; await addDoc(collection(db, `${ROOT_PATH}/materials`), { name:n, qty:q, unit:u }); UI.toggleModal(null); UI.showMsg("Đã nhập vật tư"); },

    // --- WAREHOUSE (THDG) ---
    submitTH: async (user, data) => {
        const area = document.getElementById('th-area').value; if(!area) return UI.showMsg("Chọn nguồn!");
        let d = {}, total = 0;
        data.products.forEach(p => { const el = document.getElementById(`th-${p.code}`); if(el) { const v = Number(el.value)||0; if(v>0) { d[p.code]=v; total+=v; } el.value=''; } });
        if(total===0) return UI.showMsg("Chưa nhập số!");
        await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:'', user:user.name, time:Date.now() });
        UI.showMsg(`Đã lưu ${total} đơn vị`);
    },
    submitShip: async (user) => { 
        const c = document.getElementById('ship-cust').value; const t = document.getElementById('ship-type').value; const q = Number(document.getElementById('ship-qty').value); const n = document.getElementById('ship-note').value;
        if(!c || !q) return UI.showMsg("Thiếu tin!"); 
        await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, type: t, qty: q, note: n, user: user.name, time: Date.now() }); 
        UI.showMsg("Đã xuất kho"); 
    },
    toggleTH: (mode) => {
        document.getElementById('zone-th').classList.toggle('hidden', mode !== 'in');
        document.getElementById('zone-ship').classList.toggle('hidden', mode !== 'out');
    },
    openAddProd: () => UI.toggleModal(UI.Templates.ModalBase("Thêm Mã Mới", `<div><label class="text-xs font-bold text-slate-500">Tên</label><input id="new-prod-name" placeholder="VD: Nấm Mỡ"></div><div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" placeholder="VD: nam_mo"></div><div><label class="text-xs font-bold text-slate-500">Nhóm</label><select id="new-prod-group"><option value="1">1. Tươi</option><option value="2">2. Phụ Phẩm</option><option value="3">3. Thành Phẩm</option></select></div>`, "submitAddProd", "Lưu Mã")),
    submitAddProd: async () => { const n = document.getElementById('new-prod-name').value; const c = document.getElementById('new-prod-code').value; const g = document.getElementById('new-prod-group').value; if(!n || !c) return UI.showMsg("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g }); UI.toggleModal(null); UI.showMsg("Đã thêm mã"); },
    calcVariance: () => { const a = Number(document.getElementById('stock-count').value); const r = document.getElementById('stock-variance-res'); r.classList.remove('hidden'); r.className = 'mt-2 text-center text-xs font-bold p-2 rounded bg-slate-100'; r.innerText = `Chênh lệch: ${a - 150}kg`; },

    // --- HR ---
    addTask: async (user) => {
        const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const d = document.getElementById('task-deadline').value; const desc = document.getElementById('task-desc').value;
        const checks = document.querySelectorAll('.task-emp-check:checked');
        if(!t || checks.length===0) return UI.showMsg("Thiếu tin!");
        checks.forEach(async (cb) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:cb.value, deadline:d, desc, status:'pending', createdBy:user.name, time:Date.now() }); });
        UI.showMsg(`Đã giao cho ${checks.length} người`);
    },
    submitTask: async (u, id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:u.name, completedAt:Date.now()}); UI.showMsg("Đã xong"); },
    receiveTask: async (u, id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận"); },
    
    submitAttendance: async (u) => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:u.name, type:'CHECK_IN', time:Date.now() }); UI.showMsg("Đã điểm danh"); } },
    
    openLeaveModal: () => UI.toggleModal(UI.Templates.ModalBase("Xin Nghỉ", `<input id="leave-date" type="date"><select id="leave-reason"><option>Việc riêng</option><option>Ốm</option></select>`, "submitLeave", "Gửi Đơn")),
    submitLeave: async (u) => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:u.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
    
    openBuyModal: () => UI.toggleModal(UI.Templates.ModalBase("Mua Hàng", `<input id="buy-name" placeholder="Tên hàng"><div class="flex gap-3"><input id="buy-unit" class="w-1/3" placeholder="ĐVT"><input id="buy-qty" type="number" class="w-2/3" placeholder="SL"></div>`, "submitBuyRequest", "Gửi Đề Xuất")),
    submitBuyRequest: async (u) => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:u.name, item:document.getElementById('buy-name').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
    
    punishEmp: async (user, payload) => { const [id, points] = payload.split('|'); const r = prompt("Lý do:"); if(r) { const empDoc = doc(db, `${ROOT_PATH}/employees`, id); /* Logic update score pending implementation */ UI.showMsg(`Đã phạt ${points}đ`); } },

    // --- ADMIN ---
    openAddStaff: () => UI.toggleModal(UI.Templates.ModalBase("Thêm Nhân Sự", `<input id="new-emp-name" placeholder="Tên"><div class="grid grid-cols-2 gap-2"><input id="new-emp-id" placeholder="ID (Số)"><input id="new-emp-pin" placeholder="PIN"></div><select id="new-emp-role"><option>Nhân viên</option><option>Tổ trưởng</option><option>Quản lý</option></select>`, "submitAddStaff", "Thêm")),
    submitAddStaff: async () => { const n = document.getElementById('new-emp-name').value; const id = document.getElementById('new-emp-id').value; const pin = document.getElementById('new-emp-pin').value; const r = document.getElementById('new-emp-role').value; if(!n || !id || !pin) return; await addDoc(collection(db, `${ROOT_PATH}/employees`), { name:n, id:Number(id), pin, role:r, score:0 }); UI.toggleModal(null); UI.showMsg("Đã thêm NV"); },
    installApp: () => { UI.showMsg("Chức năng đang cập nhật"); },
    enableNotif: () => UI.showMsg("Đã bật thông báo"),
    adminExport: () => UI.showMsg("Đang xuất báo cáo...")
};
