import { auth, db, signInAnonymously, collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, ROOT_PATH } from './config.js';
import { UI } from './core.js';
import { Features } from './features.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [], materials: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        if(UI.initModals) UI.initModals();
        
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                App.handleAction(action, payload);
            }
            if(e.target.dataset.action === 'toggleTH') {
                const mode = e.target.dataset.payload;
                document.getElementById('zone-th').classList.toggle('hidden', mode !== 'in');
                document.getElementById('zone-ship').classList.toggle('hidden', mode !== 'out');
                e.target.parentElement.querySelectorAll('button').forEach(b => { if(b===e.target) b.classList.add('bg-white','text-green-600','shadow-sm'); else b.classList.remove('bg-white','text-green-600','shadow-sm'); });
            }
            if(e.target.closest('#btn-open-settings')) {
                UI.toggleModal(UI.Templates.ModalBase("Quản Trị", `
                    <div class="space-y-2">
                        <h4 class="text-xs font-bold text-slate-400 uppercase">Báo cáo</h4>
                        <div class="grid grid-cols-2 gap-2">
                            <button class="p-2 bg-blue-50 text-blue-600 font-bold rounded text-xs btn-action" data-action="adminExport" data-payload="day">Theo Ngày</button>
                            <button class="p-2 bg-blue-50 text-blue-600 font-bold rounded text-xs btn-action" data-action="adminExport" data-payload="month">Theo Tháng</button>
                        </div>
                        <h4 class="text-xs font-bold text-slate-400 uppercase mt-2">Nhân sự</h4>
                        <button class="w-full p-3 bg-slate-100 font-bold rounded text-xs btn-action" data-action="openAddStaff">Quản lý Nhân viên (Thêm/Xóa)</button>
                    </div>
                `, "closeModal", "Đóng"));
            }
            if(e.target.closest('#btn-open-chat')) {
                const l = document.getElementById('chat-layer'); l.classList.remove('hidden'); l.style.display='flex';
                document.getElementById('chat-badge').classList.add('hidden');
                if(App.data.chat) UI.Templates.Chat(App.data.chat, App.user?.id);
            }
        });

        signInAnonymously(auth).then(() => {
            console.log("Connected");
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                if(['Giám đốc','Quản lý','Admin'].includes(App.user.role)) document.getElementById('btn-open-settings').classList.remove('hidden');
                UI.switchTab('home');
                App.renderAll();
            }
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { UI.switchTab(btn.dataset.tab); App.renderAll(); }));
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','shipping','chat','products','materials'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c === 'products' && snap.empty) { 
                    [{name:"B2",code:"b2",group:"1"},{name:"A1",code:"a1",group:"1"},{name:"Chân Nấm",code:"chan_nam",group:"2"},{name:"Snack",code:"snack",group:"3"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }
                if(c === 'employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"});
                    UI.renderEmployeeOptions(App.data.employees);
                }
                if(c === 'chat' && !document.getElementById('chat-layer').classList.contains('hidden')) {
                    App.data.chat.sort((a,b) => (a.time||0)-(b.time||0));
                    UI.Templates.Chat(App.data.chat, App.user?.id);
                }
                if(App.user) App.renderAll();
            });
        });
    },

    renderAll: () => {
        const tab = localStorage.getItem('n5_current_tab') || 'home';
        if(tab==='home') document.getElementById('view-home').innerHTML = UI.Views.Home(App.data, ['Giám đốc','Quản lý'].includes(App.user.role));
        if(tab==='sx') document.getElementById('view-sx').innerHTML = UI.Views.Production(App.data);
        if(tab==='th') document.getElementById('view-th').innerHTML = UI.Views.Warehouse(App.data);
        if(tab==='tasks') document.getElementById('view-tasks').innerHTML = UI.Views.HR(App.data, App.user);
        if(tab==='team') document.getElementById('view-team').innerHTML = UI.Views.Team(App.user, App.data);
    },

    handleAction: (action, payload) => {
        const handlers = {
            login: () => {
                const id = document.getElementById('login-user').value; const pin = document.getElementById('login-pin').value;
                const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
                if(emp) { App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp)); location.reload(); } else UI.showMsg("Sai PIN!");
            },
            logout: () => { if(confirm("Thoát?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
            closeModal: () => UI.toggleModal(null),
            closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
            sendChat: async () => { const inp = document.getElementById('chat-input'); if(inp.value.trim()) { await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); inp.value=''; } },
            
            showScoreGuide: () => UI.toggleModal(UI.Templates.ModalBase("Cách Tính Điểm", UI.Templates.ScoreGuide(), "closeModal", "Đã Hiểu")),
            
            openAddHouse: () => UI.toggleModal(UI.Templates.ModalBase("Thêm Nhà Mới", `<input id="new-house-name" placeholder="Tên nhà (VD: Nhà F)">`, "submitAddHouse", "Tạo Nhà")),
            submitAddHouse: async () => { const n = document.getElementById('new-house-name').value; if(n) { await addDoc(collection(db, `${ROOT_PATH}/houses`), { name:n, status:'ACTIVE' }); UI.toggleModal(null); UI.showMsg("Đã thêm nhà"); } },

            openAddProd: () => UI.toggleModal(UI.Templates.ModalBase("Thêm Mã Mới", `<div><label class="text-xs font-bold text-slate-500">Tên</label><input id="new-prod-name" placeholder="VD: Nấm Mỡ"></div><div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" placeholder="VD: nam_mo"></div><div><label class="text-xs font-bold text-slate-500">Nhóm</label><select id="new-prod-group"><option value="1">1. Tươi</option><option value="2">2. Phụ Phẩm</option><option value="3">3. Thành Phẩm</option></select></div>`, "submitAddProd", "Lưu Mã")),
            submitAddProd: async () => { const n = document.getElementById('new-prod-name').value; const c = document.getElementById('new-prod-code').value; const g = document.getElementById('new-prod-group').value; if(!n || !c) return UI.showMsg("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g }); UI.toggleModal(null); UI.showMsg("Đã thêm mã"); },

            submitTH: async () => {
                const area = document.getElementById('th-area').value; if(!area) return UI.showMsg("Chọn nguồn!");
                let d = {}, total = 0;
                App.data.products.forEach(p => { const el = document.getElementById(`th-${p.code}`); if(el) { const v = Number(el.value)||0; if(v>0) { d[p.code]=v; total+=v; } el.value=''; } });
                if(total===0) return UI.showMsg("Chưa nhập số!");
                await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:'', user:App.user.name, time:Date.now() });
                UI.showMsg(`Đã lưu ${total} đơn vị`);
            },
            
            setupHouseBatch: async () => { const h = document.getElementById('sx-house-select').value; const s = document.getElementById('sx-strain').value; const q = Number(document.getElementById('sx-spawn-qty').value); const dStr = document.getElementById('sx-date').value; const n = document.getElementById('sx-note').value; if(!h) return alert("Thiếu tin!"); await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: s, currentSpawn: q, status: 'ACTIVE', startDate: dStr || new Date().toISOString(), note: n }); UI.showMsg(`Đã vào lô tại ${h}`); },
            submitShip: async () => { const c = document.getElementById('ship-cust').value; const t = document.getElementById('ship-type').value; const q = Number(document.getElementById('ship-qty').value); const n = document.getElementById('ship-note').value; if(!c || !q) return UI.showMsg("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, type: t, qty: q, note: n, user: App.user.name, time: Date.now() }); UI.showMsg("Đã xuất kho"); },
            
            toggleTaskHistory: () => document.getElementById('task-history').classList.toggle('hidden'),
            
            openAddMat: () => UI.toggleModal(UI.Templates.ModalBase("Nhập Vật Tư", `<input id="mat-name" placeholder="Tên (Cồn, Găng tay...)"><input id="mat-qty" type="number" placeholder="Số lượng"><input id="mat-unit" placeholder="ĐVT (Lít, Hộp...)">`, "submitAddMat", "Nhập Kho")),
            submitAddMat: async () => { const n = document.getElementById('mat-name').value; const q = document.getElementById('mat-qty').value; const u = document.getElementById('mat-unit').value; if(!n) return; await addDoc(collection(db, `${ROOT_PATH}/materials`), { name:n, qty:q, unit:u }); UI.toggleModal(null); },

            addTask: async () => { const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const d = document.getElementById('task-deadline').value; const checks = document.querySelectorAll('.task-emp-check:checked'); if(!t || checks.length===0) return UI.showMsg("Thiếu tin!"); checks.forEach(async (cb) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:cb.value, deadline:d, status:'pending', createdBy:App.user.name, time:Date.now() }); }); UI.showMsg(`Đã giao việc`); },
            submitTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:App.user.name, completedAt:Date.now()}); UI.showMsg("Đã xong"); },
            receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận"); },
            
            submitAttendance: async () => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:App.user.name, type:'CHECK_IN', time:Date.now() }); UI.showMsg("Đã điểm danh"); } },
            openLeaveModal: () => UI.toggleModal(UI.Templates.ModalBase("Xin Nghỉ", `<input id="leave-date" type="date"><select id="leave-reason"><option>Việc riêng</option><option>Ốm</option></select>`, "submitLeave", "Gửi Đơn")),
            submitLeave: async () => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:App.user.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
            openBuyModal: () => UI.toggleModal(UI.Templates.ModalBase("Mua Hàng", `<input id="buy-name" placeholder="Tên hàng"><div class="flex gap-3"><input id="buy-unit" class="w-1/3" placeholder="ĐVT"><input id="buy-qty" type="number" class="w-2/3" placeholder="SL"></div>`, "submitBuyRequest", "Gửi Đề Xuất")),
            submitBuyRequest: async () => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:App.user.name, item:document.getElementById('buy-name').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
            
            openAddStaff: () => UI.toggleModal(UI.Templates.ModalBase("Thêm Nhân Sự", `<input id="new-emp-name" placeholder="Tên"><div class="grid grid-cols-2 gap-2"><input id="new-emp-id" placeholder="ID (Số)"><input id="new-emp-pin" placeholder="PIN"></div><select id="new-emp-role"><option>Nhân viên</option><option>Tổ trưởng</option><option>Quản lý</option></select>`, "submitAddStaff", "Thêm")),
            submitAddStaff: async () => { const n = document.getElementById('new-emp-name').value; const id = document.getElementById('new-emp-id').value; const pin = document.getElementById('new-emp-pin').value; const r = document.getElementById('new-emp-role').value; if(!n || !id || !pin) return; await addDoc(collection(db, `${ROOT_PATH}/employees`), { name:n, id:Number(id), pin, role:r, score:0 }); UI.toggleModal(null); UI.showMsg("Đã thêm NV"); }
        };

        if(handlers[action]) handlers[action](payload);
        else if(action === 'adminExport') UI.showMsg("Đang xuất file Excel...");
    }
};

window.onload = App.init;
