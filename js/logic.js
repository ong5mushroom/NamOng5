import { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const ROOT_PATH = "artifacts/namong5_production/public/data"; 
const COMPANY_INFO = { 
    name: "CÔNG TY TNHH NẤM ÔNG 5", 
    address: "Thôn Đa Ra Hoa, xã Đạ Nhim, huyện Lạc Dương, Tỉnh Lâm Đồng", 
    mst: "5801474272", 
    contact: "0983.59.0808 - Hotline: 0899.49.0808" 
};

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], supplies: [], distributions: [], chat: [], hr_requests: [], buy_requests: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    helpers: {
        notifyAndRedirect: async (msg, type='success') => {
            UI.playSound(type);
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { user: "Hệ Thống", msg: msg, time: Date.now(), type: 'system', senderId: 'SYSTEM', senderName: 'HỆ THỐNG', text: msg });
            UI.toggleModal('chat-layer', true);
        }
    },

    init: () => {
        UI.initModals();
        
        // Gắn sự kiện nút Chat & Settings
        document.addEventListener('click', (e) => {
            if(e.target.closest('#btn-open-chat')) {
                UI.toggleModal('chat-layer', true);
                App.ui.renderChat();
            }
            if(e.target.closest('#btn-open-settings')) {
                const role = App.user?.role;
                if(['Quản lý', 'Admin', 'Giám đốc'].includes(role)) {
                    UI.renderSettingsModal(App.data.employees);
                    UI.toggleModal('modal-settings', true);
                } else {
                    UI.showMsg("Không có quyền truy cập!", "error");
                }
            }
        });

        signInAnonymously(auth).then(() => {
            document.getElementById('login-status').innerHTML = '<span class="text-green-500">✔ Đã kết nối V225</span>';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        }).catch(err => { alert("Lỗi kết nối: " + err.message); });

        document.body.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) await App.actions[action](payload);
            }
        });

        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
        document.getElementById('login-btn')?.addEventListener('click', App.actions.login);
    },

    syncData: () => {
        const colls = ['employees', 'houses', 'harvest_logs', 'tasks', 'shipping', 'supplies', 'distributions', 'chat', 'hr_requests', 'buy_requests'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snapshot) => {
                const key = c === 'harvest_logs' ? 'harvest' : c;
                App.data[key] = snapshot.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c === 'chat') {
                    App.data.chat.sort((a,b) => (a.time || 0) - (b.time || 0));
                    if(!document.getElementById('chat-layer').classList.contains('hidden')) App.ui.renderChat();
                } else if(App.data[key].length > 0 && App.data[key][0].time) {
                    App.data[key].sort((a,b) => (b.time || 0) - (a.time || 0));
                }
                
                if(c === 'employees') {
                    // Nếu danh sách trống -> Tạo Admin dự phòng để không bị kẹt
                    if (snapshot.empty) {
                        addDoc(collection(db, `${ROOT_PATH}/employees`), { id: 9999, name: "Giám Đốc", pin: "9999", role: "Giám đốc", score: 100 });
                        UI.showMsg("Đã tạo User Giám Đốc (PIN 9999)", "remind");
                    }
                    UI.renderEmployeeOptions(App.data.employees);
                }
                
                App.ui.refresh(localStorage.getItem('n5_current_tab') || 'home');
            });
        });
    },

    ui: {
        switchTab: (tab) => { UI.switchTab(tab); App.ui.refresh(tab); },
        refresh: (tab) => {
            if(tab === 'home') UI.renderHome(App.data.houses, App.data.harvest);
            if(tab === 'sx') UI.renderSX(App.data.houses);
            if(tab === 'th') UI.renderTH(App.data.houses, App.data.harvest, App.data.shipping);
            if(tab === 'stock') UI.renderStock({}, App.data.supplies, App.data.distributions);
            // SỬA LỖI: Truyền danh sách nhân viên vào Task để dropdown không bị trống
            if(tab === 'tasks') UI.renderTasksAndShip(App.data.tasks, App.user, App.data.houses, App.data.employees);
            // SỬA LỖI: Gom HR Request & Buy Request
            const allReqs = [...(App.data.hr_requests||[]), ...(App.data.buy_requests||[])];
            if(tab === 'team') UI.renderTeam(App.user, allReqs);
        },
        renderChat: () => UI.renderChat(App.data.chat, App.user.id)
    },

    actions: {
        login: () => {
            const id = document.getElementById('login-user').value;
            const pin = document.getElementById('login-pin').value;
            if (!id) return alert("Chọn nhân viên!");
            const emp = App.data.employees.find(e => String(e.id) == String(id) && String(e.pin) == String(pin));
            if(emp) {
                App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = emp.name;
                document.getElementById('head-role').innerText = emp.role;
                App.ui.switchTab('home');
            } else { alert("Sai mã PIN!"); }
        },
        logout: () => { if(confirm('Đăng xuất?')) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        toggleModal: (id) => UI.toggleModal(id, true),
        closeChat: () => UI.toggleModal('chat-layer', false),

        // --- CÁC HÀM NGHIỆP VỤ ---
        addTask: async () => {
            const t = document.getElementById('task-title').value;
            const house = document.getElementById('task-house').value;
            const a = document.getElementById('task-assignee').value;
            const d = document.getElementById('task-deadline').value;
            const desc = document.getElementById('task-desc').value;
            if(!t || !a) return UI.showMsg("Thiếu tin!", "error");
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title: t, house, assignee: a, deadline: d, desc, status: 'pending', createdBy: App.user.name, time: Date.now() });
            App.helpers.notifyAndRedirect(`📋 <b>${App.user.name}</b> giao việc "${t}" cho ${a}.`);
        },
        receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'received', receivedAt: Date.now() }); UI.showMsg("✅ Đã nhận việc!"); },
        submitTask: async (id) => { const q = prompt("Số lượng làm được:"); if(!q) return; const n = prompt("Ghi chú kết quả:"); await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'done', completedBy: App.user.name, actualQty: q, resultNote: n, completedAt: Date.now() }); App.helpers.notifyAndRedirect(`✅ <b>${App.user.name}</b> đã hoàn thành công việc!`); },
        remindAttendance: async () => App.helpers.notifyAndRedirect(`📢 QUẢN LÝ NHẮC NHỞ: Yêu cầu mọi người báo cáo!`, 'remind'),
        
        // Admin
        adminAddEmp: async () => {
            const name = document.getElementById('new-emp-name').value;
            const pin = document.getElementById('new-emp-pin').value;
            const role = document.getElementById('new-emp-role').value;
            if(!name || !pin) return UI.showMsg("Thiếu tên hoặc PIN!", "error");
            await addDoc(collection(db, `${ROOT_PATH}/employees`), { id: Date.now(), name, pin, role, score: 100 });
            UI.showMsg("Đã thêm nhân viên!", "success"); UI.renderSettingsModal(App.data.employees); 
        },
        adminDelEmp: async (id) => { if(confirm("Xóa nhân viên?")) { await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id)); UI.showMsg("Đã xóa!", "success"); } },
        adminExport: (type) => {
            let data = type === 'tasks' ? App.data.tasks : App.data.harvest;
            if(data.length === 0) return UI.showMsg("Không có dữ liệu!", "error");
            const csvContent = "data:text/csv;charset=utf-8," + Object.keys(data[0]).join(",") + "\n" + data.map(e => Object.values(e).join(",")).join("\n");
            const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `${type}_report.csv`); document.body.appendChild(link); link.click();
        },
        approveRequest: async (id) => { let isHR=App.data.hr_requests.find(r=>r._id===id); await updateDoc(doc(db,`${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`,id),{status:'approved',approvedBy:App.user.name}); UI.showMsg("Đã duyệt!"); },
        rejectRequest: async (id) => { let isHR=App.data.hr_requests.find(r=>r._id===id); await updateDoc(doc(db,`${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`,id),{status:'rejected',approvedBy:App.user.name}); UI.showMsg("Đã từ chối!"); },

        setupHouseBatch: async () => { /* Giữ nguyên code cũ */
            const h = document.getElementById('sx-house-select').value; 
            const s = document.getElementById('sx-strain').value;
            const dStr = document.getElementById('sx-date').value;
            const q = Number(document.getElementById('sx-spawn-qty').value);
            if(!h || !s || !dStr || !q) return UI.showMsg("Thiếu tin!", "error");
            const d = new Date(dStr);
            const bc = `${s.toUpperCase()}-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
            await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: bc, currentSpawn: q, status: 'ACTIVE', startDate: Date.now() });
            App.helpers.notifyAndRedirect(`🏭 <b>${App.user.name}</b> vào lô: ${bc} (${q} bịch) tại ${h}`);
        },
        submitTH: async () => { /* Giữ nguyên code cũ */
            const area = document.getElementById('th-area').value;
            if(!area) return UI.showMsg("Chưa chọn nhà!", "error");
            const houseObj = App.data.houses.find(h => h.name === area);
            const types = ['b2','a1','a2','b1','ht', 'a1f','a2f','b2f','d1','cn','hc','hh'];
            let details = {}, total = 0;
            types.forEach(code => { const val = Number(document.getElementById(`th-${code}`).value)||0; if (val>0) { details[code]=val; total+=val; } });
            if (total<=0) return UI.showMsg("Chưa nhập số!", "error");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, batchCode: houseObj?.currentBatch||'N/A', details, total, note: document.getElementById('th-note').value, user: App.user.name, time: Date.now() });
            types.forEach(code => document.getElementById(`th-${code}`).value='');
            document.getElementById('th-note').value=''; document.getElementById('th-display-total').innerText='0.0';
            App.helpers.notifyAndRedirect(`🍄 <b>${App.user.name}</b> nhập <b>${total}kg</b> nấm tại ${area}.`);
        },
        submitShip: async () => { /* Giữ nguyên code cũ */
            const c = document.getElementById('ship-cust').value; const t = document.getElementById('ship-type').value; const q = Number(document.getElementById('ship-qty').value); const note = document.getElementById('ship-note').value;
            if(!c || !q) return UI.showMsg("Thiếu tin!", "error");
            const ref = await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, type: t, qty: q, note: note, user: App.user.name, time: Date.now() });
            document.getElementById('ship-cust').value = ''; document.getElementById('ship-qty').value = '';
            App.actions.printInvoice(ref.id); UI.showMsg("Đã tạo phiếu! Đang in...");
        },
        printInvoice: (id) => { /* Giữ nguyên code cũ */
            const o = App.data.shipping.find(s => s._id === id); if(!o) return;
            const w = window.open('', '', 'height=800,width=600');
            w.document.write(`<html><head><title>Phiếu Xuất Kho</title><style>body{font-family:'Times New Roman',serif;padding:20px;font-size:14px}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px}.title{font-size:18px;font-weight:bold;text-transform:uppercase;margin:5px 0}.info{font-style:italic;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #000;padding:8px;text-align:left}th{background:#eee;text-align:center}.footer{margin-top:30px;display:flex;justify-content:space-between;text-align:center}</style></head><body><div class="header"><div class="title">${COMPANY_INFO.name}</div><div class="info">${COMPANY_INFO.address}</div><div class="info">MST: ${COMPANY_INFO.mst}</div><div class="info">Liên hệ: ${COMPANY_INFO.contact}</div><h2 style="margin-top:15px">PHIẾU XUẤT KHO</h2><div>Số: #${id.slice(-6).toUpperCase()} | Ngày: ${new Date(o.time).toLocaleString('vi-VN')}</div></div><div style="margin-bottom:10px"><p><b>Khách hàng:</b> ${o.customer}</p><p><b>Diễn giải:</b> ${o.note||'Xuất bán hàng'}</p></div><table><thead><tr><th>STT</th><th>Tên Hàng Hóa</th><th>ĐVT</th><th>Số Lượng</th><th>Ghi Chú</th></tr></thead><tbody><tr><td style="text-align:center">1</td><td>${o.type}</td><td style="text-align:center">Kg</td><td style="text-align:center;font-weight:bold">${o.qty}</td><td></td></tr></tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:bold">TỔNG CỘNG:</td><td style="text-align:center;font-weight:bold">${o.qty}</td><td></td></tr></tfoot></table><div class="footer"><div style="width:40%"><b>Người nhận hàng</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br></div><div style="width:40%"><b>Người lập phiếu</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br>${o.user}</div></div></body></html>`);
            w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
        },
        submitAttendance: async () => { if(confirm(`Chấm công lúc ${new Date().toLocaleTimeString()}?`)) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user: App.user.name, type: 'CHECK_IN', time: Date.now() }); App.helpers.notifyAndRedirect(`🕒 <b>${App.user.name}</b> đã điểm danh.`); } },
        sendChat: async () => { const input = document.getElementById('chat-input-field'); const txt = input.value.trim(); if(!txt) return; await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: txt, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); input.value = ''; },
        submitLeave: async () => { const d = document.getElementById('leave-date').value; const r = document.getElementById('leave-reason').value; if(!d) return UI.showMsg("Chọn ngày!","error"); await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user: App.user.name, type: 'LEAVE', date: d, reason: r, status: 'pending', time: Date.now() }); UI.showMsg("✅ Đã gửi đơn!"); UI.toggleModal('modal-leave', false); },
        submitBuyRequest: async () => { const n = document.getElementById('buy-name').value; const u = document.getElementById('buy-unit').value; const q = document.getElementById('buy-qty').value; const note = document.getElementById('buy-note').value; if(!n) return UI.showMsg("Thiếu tên!","error"); await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user: App.user.name, item: n, unit: u, qty: q, note, status: 'pending', time: Date.now() }); UI.showMsg("✅ Đã gửi đề xuất!"); UI.toggleModal('modal-buy-req', false); },
        submitDistribute: async () => { const selectEl = document.getElementById('dist-item'); const itemId = selectEl.value; const itemName = selectEl.options[selectEl.selectedIndex].getAttribute('data-name'); const currentStock = Number(selectEl.options[selectEl.selectedIndex].getAttribute('data-stock')); const toHouse = document.getElementById('dist-to').value; const qty = Number(document.getElementById('dist-qty').value); if(!itemId || !qty) return UI.showMsg("Thiếu tin!", "error"); if(qty > currentStock) return UI.showMsg(`Kho không đủ!`, "error"); await updateDoc(doc(db, `${ROOT_PATH}/supplies`, itemId), { stock: currentStock - qty, lastUpdated: Date.now() }); await addDoc(collection(db, `${ROOT_PATH}/distributions`), { itemId, itemName, toHouse, qty, user: App.user.name, time: Date.now() }); UI.toggleModal('modal-distribute', false); App.helpers.notifyAndRedirect(`🚚 <b>${App.user.name}</b> cấp ${qty} ${itemName} cho ${toHouse}.`); },
        submitStockCheck: async () => { const act = Number(document.getElementById('stock-actual-mushroom').value); const note = document.getElementById('stock-note-mushroom').value; if(!act && act!==0) return UI.showMsg("Nhập số thực!", "error"); await addDoc(collection(db, `${ROOT_PATH}/stock_checks`), { type: 'MUSHROOM', actual: act, note, user: App.user.name, time: Date.now() }); App.helpers.notifyAndRedirect(`📦 <b>${App.user.name}</b> chốt kho nấm: ${act}kg.`); },
        openSupplyImport: () => { const n = prompt("Tên vật tư:"); const u = prompt("Đơn vị:"); const q = Number(prompt("Số lượng:")); if(n && q) { addDoc(collection(db, `${ROOT_PATH}/supplies`), { name: n, unit: u, stock: q }); UI.showMsg("✅ Đã nhập!", "success"); } }
    }
};

window.App = App;
window.onload = App.init;
