import { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const OLD_DATA_PATH = "artifacts/namong5_production/public/data"; 
const COMPANY_INFO = { name: "TRẠI NẤM ÔNG 5", address: "Đà Lạt, Lâm Đồng", hotline: "0909.xxx.xxx" };

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], supplies: [], distributions: [], chat: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    // --- HELPER: THÔNG BÁO & CHUYỂN CHAT ---
    helpers: {
        notifyAndRedirect: async (msg, type='success') => {
            // 1. Phát âm thanh
            UI.playSound(type);
            // 2. Gửi tin nhắn vào hệ thống Chat
            await addDoc(collection(db, `${OLD_DATA_PATH}/chat`), {
                user: "Hệ Thống",
                msg: msg,
                time: Date.now(),
                type: 'system' // Để hiển thị khác màu
            });
            // 3. Mở khung chat để mọi người cùng thấy
            UI.toggleModal('chat-layer', true);
        }
    },

    init: () => {
        UI.initModals();
        document.getElementById('btn-open-chat')?.addEventListener('click', () => UI.toggleModal('chat-layer', true));
        document.getElementById('btn-open-settings')?.addEventListener('click', () => alert("Tính năng Cài đặt đang bảo trì."));

        signInAnonymously(auth).then(() => {
            document.getElementById('login-status').innerHTML = '<span class="text-green-500">✔ Đã kết nối</span>';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        }).catch(err => { alert("Lỗi: " + err.message); });

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
        // Thêm 'chat' vào sync
        const colls = ['employees', 'houses', 'harvest_logs', 'tasks', 'shipping', 'supplies', 'distributions', 'chat'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${OLD_DATA_PATH}/${c}`), (snapshot) => {
                const key = c === 'harvest_logs' ? 'harvest' : c;
                App.data[key] = snapshot.docs.map(d => ({...d.data(), _id: d.id}));
                // Chat cần sort ngược (Mới nhất ở dưới)
                if(c === 'chat') App.data[key].sort((a,b) => (a.time || 0) - (b.time || 0));
                else if(App.data[key].length > 0 && App.data[key][0].time) App.data[key].sort((a,b) => (b.time || 0) - (a.time || 0));
                
                if(c === 'employees') UI.renderEmployeeOptions(App.data.employees);
                
                // Render Chat nếu đang mở (Chưa implement trong UI.js nhưng logic sẵn sàng)
                // renderChat(App.data.chat); 

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
            if(tab === 'tasks') UI.renderTasksAndShip(App.data.tasks, App.user);
            if(tab === 'team') UI.renderTeam(App.user);
        }
    },

    actions: {
        login: () => {
            const id = document.getElementById('login-user').value;
            const pin = document.getElementById('login-pin').value;
            if (!id) return alert("Chọn nhân viên!");
            const emp = App.data.employees.find(e => String(e.id) == String(id) && String(e.pin) == String(pin));
            if(emp) {
                App.user = emp;
                localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = emp.name;
                document.getElementById('head-role').innerText = emp.role;
                App.ui.switchTab('home');
            } else { alert("Sai mã PIN!"); }
        },
        logout: () => { if(confirm('Đăng xuất?')) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        toggleModal: (id) => UI.toggleModal(id, true),

        // --- CÁC HÀM XỬ LÝ CHÍNH ---

        submitTH: async () => {
            const area = document.getElementById('th-area').value;
            if(!area) return UI.showMsg("Chưa chọn nhà!", "error");
            const houseObj = App.data.houses.find(h => h.name === area);
            
            // Danh sách mã nấm mới
            const types = ['b2','a1','a2','b1','ht', 'a1f','a2f','b2f','d1'];
            let details = {}, total = 0;
            
            types.forEach(code => { 
                const val = Number(document.getElementById(`th-${code}`).value)||0; 
                if (val>0) { details[code]=val; total+=val; } 
            });

            if (total<=0) return UI.showMsg("Chưa nhập số!", "error");
            
            await addDoc(collection(db, `${OLD_DATA_PATH}/harvest_logs`), { 
                area: area, 
                batchCode: houseObj?.currentBatch||'N/A', 
                details: details, 
                total: total, 
                note: document.getElementById('th-note').value, 
                user: App.user.name, 
                time: Date.now() 
            });

            types.forEach(code => document.getElementById(`th-${code}`).value='');
            document.getElementById('th-note').value=''; document.getElementById('th-display-total').innerText='0.0';
            
            // THÔNG BÁO VỀ CHAT
            App.helpers.notifyAndRedirect(`🍄 <b>${App.user.name}</b> vừa nhập kho <b>${total}kg</b> nấm tại nhà ${area}.`);
        },

        submitStockCheck: async () => {
            const act = Number(document.getElementById('stock-actual-mushroom').value);
            const note = document.getElementById('stock-note-mushroom').value;
            if(!act && act!==0) return UI.showMsg("Nhập số thực!", "error");
            await addDoc(collection(db, `${OLD_DATA_PATH}/stock_checks`), { type: 'MUSHROOM', actual: act, note, user: App.user.name, time: Date.now() });
            App.helpers.notifyAndRedirect(`📦 <b>${App.user.name}</b> vừa chốt tồn kho nấm: ${act}kg.`);
        },

        submitDistribute: async () => {
            const selectEl = document.getElementById('dist-item');
            const itemId = selectEl.value;
            const itemName = selectEl.options[selectEl.selectedIndex].getAttribute('data-name');
            const currentStock = Number(selectEl.options[selectEl.selectedIndex].getAttribute('data-stock'));
            const toHouse = document.getElementById('dist-to').value;
            const qty = Number(document.getElementById('dist-qty').value);

            if(!itemId || !qty) return UI.showMsg("Thiếu tin!", "error");
            if(qty > currentStock) return UI.showMsg(`Kho không đủ!`, "error");

            await updateDoc(doc(db, `${OLD_DATA_PATH}/supplies`, itemId), { stock: currentStock - qty, lastUpdated: Date.now() });
            await addDoc(collection(db, `${OLD_DATA_PATH}/distributions`), { itemId, itemName, toHouse, qty, user: App.user.name, time: Date.now() });
            
            UI.toggleModal('modal-distribute', false);
            App.helpers.notifyAndRedirect(`🚚 <b>${App.user.name}</b> vừa cấp ${qty} ${itemName} cho ${toHouse}.`);
        },

        // --- QUẢN LÝ VIỆC ---
        addTask: async () => {
            const t = document.getElementById('task-title').value;
            const a = document.getElementById('task-assignee').value;
            const d = document.getElementById('task-deadline').value;
            const desc = document.getElementById('task-desc').value;
            if(!t || !a) return UI.showMsg("Thiếu tin!", "error");
            await addDoc(collection(db, `${OLD_DATA_PATH}/tasks`), { title: t, assignee: a, deadline: d, desc, status: 'pending', createdBy: App.user.name, time: Date.now() });
            UI.showMsg("✅ Đã giao việc!", "success");
            document.getElementById('task-title').value = '';
            // Gửi thông báo riêng cho người được giao
            App.helpers.notifyAndRedirect(`📋 <b>${App.user.name}</b> đã giao việc "${t}" cho <b>${a}</b>.`);
        },

        receiveTask: async (id) => {
            await updateDoc(doc(db, `${OLD_DATA_PATH}/tasks`, id), { status: 'received', receivedAt: Date.now() });
            UI.showMsg("✅ Đã nhận việc!", "success");
        },

        submitTask: async (id) => {
            const q = prompt("Số lượng làm được:");
            if(!q) return; 
            const n = prompt("Ghi chú kết quả:");
            
            await updateDoc(doc(db, `${OLD_DATA_PATH}/tasks`, id), { status: 'done', completedBy: App.user.name, actualQty: q, resultNote: n, completedAt: Date.now() });
            
            App.helpers.notifyAndRedirect(`✅ <b>${App.user.name}</b> đã hoàn thành công việc! KQ: ${q}`);
        },

        remindAttendance: async () => {
             App.helpers.notifyAndRedirect(`📢 <b>QUẢN LÝ NHẮC NHỞ:</b> Yêu cầu mọi người báo cáo công việc và điểm danh ngay!`, 'remind');
        },

        // --- CÁC HÀM KHÁC GIỮ NGUYÊN (NHƯNG THÊM SOUND NẾU CẦN) ---
        submitAttendance: async () => {
            if(confirm(`Chấm công lúc ${new Date().toLocaleTimeString()}?`)) {
                await addDoc(collection(db, `${OLD_DATA_PATH}/attendance`), { user: App.user.name, type: 'CHECK_IN', time: Date.now() });
                App.helpers.notifyAndRedirect(`🕒 <b>${App.user.name}</b> vừa chấm công.`);
            }
        },

        setupHouseBatch: async () => { /* Giữ nguyên code V163 */
            const h = document.getElementById('sx-house-select').value; 
            const s = document.getElementById('sx-strain').value;
            const dStr = document.getElementById('sx-date').value;
            const q = Number(document.getElementById('sx-spawn-qty').value);
            if(!h || !s || !dStr || !q) return UI.showMsg("Thiếu tin!", "error");
            const d = new Date(dStr);
            const bc = `${s.toUpperCase()}-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
            await updateDoc(doc(db, `${OLD_DATA_PATH}/houses`, h), { currentBatch: bc, currentSpawn: q, status: 'ACTIVE', startDate: Date.now() });
            UI.showMsg(`✅ Kích hoạt lô ${bc}!`, "success");
        },

        submitLeave: async () => { /* Giữ nguyên */
             const date = document.getElementById('leave-date').value;
            const reason = document.getElementById('leave-reason').value;
            if(!date) return UI.showMsg("Chọn ngày!", "error");
            await addDoc(collection(db, `${OLD_DATA_PATH}/hr_requests`), { user: App.user.name, type: 'LEAVE', date, reason, status: 'pending', time: Date.now() });
            UI.showMsg("✅ Đã gửi đơn!", "success");
            UI.toggleModal('modal-leave', false);
        },
        submitBuyRequest: async () => { /* Giữ nguyên */ 
            const n = document.getElementById('buy-name').value;
            const u = document.getElementById('buy-unit').value;
            const q = document.getElementById('buy-qty').value;
            const note = document.getElementById('buy-note').value;
            if(!n || !q) return UI.showMsg("Thiếu tin!", "error");
            await addDoc(collection(db, `${OLD_DATA_PATH}/buy_requests`), { user: App.user.name, item: n, unit: u, qty: q, note, status: 'pending', time: Date.now() });
            UI.showMsg("✅ Đã gửi đề xuất!", "success");
            UI.toggleModal('modal-buy-req', false);
        },
        submitShip: async () => { /* Giữ nguyên */
             const c = document.getElementById('ship-cust').value; 
            const t = document.getElementById('ship-type').value; 
            const q = Number(document.getElementById('ship-qty').value);
            const note = document.getElementById('ship-note').value;
            if(!c || !q) return UI.showMsg("Thiếu tin!", "error");
            const ref = await addDoc(collection(db, `${OLD_DATA_PATH}/shipping`), { customer: c, type: t, qty: q, note: note, user: App.user.name, time: Date.now() });
            UI.showMsg("✅ Đã tạo phiếu!", "success"); 
            document.getElementById('ship-cust').value = '';
            document.getElementById('ship-qty').value = '';
            App.actions.printInvoice(ref.id);
        },
        openSupplyImport: () => {
            const n = prompt("Tên vật tư:"); const u = prompt("Đơn vị:"); const q = Number(prompt("Số lượng:"));
            if(n && q) { addDoc(collection(db, `${OLD_DATA_PATH}/supplies`), { name: n, unit: u, stock: q }); UI.showMsg("✅ Đã nhập!", "success"); }
        },
        openSupplyCheck: () => alert("Tính năng đang phát triển..."),
        printInvoice: (id) => {
            const o = App.data.shipping.find(s => s._id === id); if(!o) return;
            const w = window.open('', '', 'height=800,width=600');
            w.document.write(`<html><head><title>Phiếu Xuất</title><style>body{font-family:'Times New Roman';padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #000;padding:8px}th{background:#eee}</style></head><body><h2 style="text-align:center">${COMPANY_INFO.name}</h2><p style="text-align:center">Đ/c: ${COMPANY_INFO.address} - Hotline: ${COMPANY_INFO.hotline}</p><hr><h3 style="text-align:center">PHIẾU XUẤT KHO</h3><p>Số: #${id.slice(-6).toUpperCase()} | Ngày: ${new Date(o.time).toLocaleString('vi-VN')}</p><p>Khách: ${o.customer}</p><p>NV: ${o.user}</p><table><thead><tr><th>Tên hàng</th><th>ĐVT</th><th>SL</th><th>Ghi chú</th></tr></thead><tbody><tr><td>${o.type}</td><td style="text-align:center">Kg</td><td style="text-align:center;font-weight:bold">${o.qty}</td><td>${o.note||''}</td></tr></tbody></table><br><div style="display:flex;justify-content:space-between;text-align:center"><div><b>Người nhận</b><br>(Ký tên)</div><div><b>Người lập</b><br>(Ký tên)<br><br>${o.user}</div></div></body></html>`);
            w.document.close(); w.focus(); setTimeout(()=>w.print(),500);
        }
    }
};

window.App = App;
window.onload = App.init;
