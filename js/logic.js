import { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc } from './config.js';
import { UI } from './ui.js';

const ROOT_PATH = "artifacts/namong5_production/public/data"; 

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], hr_requests: [], buy_requests: [], products: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,
    deferredPrompt: null,

    helpers: {
        notify: async (msg) => {
            UI.playSound('success');
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: msg, senderId: 'SYSTEM', senderName: 'HỆ THỐNG', type: 'system', time: Date.now() });
            UI.showMsg(msg);
        }
    },

    init: () => {
        UI.initModals();
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.deferredPrompt = e; });

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) App.actions[action](payload);
            }
            if(e.target.closest('#btn-open-chat')) App.actions.toggleChat();
            if(e.target.dataset.action === 'toggleTH') {
                const mode = e.target.dataset.payload;
                document.getElementById('zone-th').classList.toggle('hidden', mode !== 'in');
                document.getElementById('zone-ship').classList.toggle('hidden', mode !== 'out');
                // Active style toggle
                const btns = e.target.parentElement.querySelectorAll('button');
                btns.forEach(b => {
                    if(b === e.target) b.classList.add('bg-white','text-green-600','shadow-sm');
                    else b.classList.remove('bg-white','text-green-600','shadow-sm');
                });
            }
            if(e.target.closest('#btn-open-settings')) {
                if(['Quản lý', 'Admin', 'Giám đốc'].includes(App.user.role)) UI.renderSettingsModal(App.data.employees);
            }
        });
        
        signInAnonymously(auth).then(() => {
            document.getElementById('login-status').innerText = '✔ V605 Connected';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                if(['Quản lý', 'Admin', 'Giám đốc'].includes(App.user.role)) document.getElementById('btn-open-settings').classList.remove('hidden');
                App.ui.switchTab('home');
            }
        });
        document.getElementById('login-btn')?.addEventListener('click', App.actions.login);
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
    },

    syncData: () => {
        const colls = ['employees','houses','harvest_logs','tasks','shipping','chat','hr_requests','buy_requests', 'products'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                // --- AUTO SEEDER ---
                if(c === 'products' && snap.empty) {
                    const seeds = [
                        {name:"B2", code:"b2", group:"1"}, {name:"A1", code:"a1", group:"1"}, {name:"Hầu Thủ", code:"ht", group:"1"},
                        {name:"Chân Nấm", code:"chan_nam", group:"2"}, {name:"Hư Hỏng", code:"hu_hong", group:"2"},
                        {name:"Snack", code:"snack", group:"3"}, {name:"Nấm Khô", code:"nam_kho", group:"3"}, 
                        {name:"Trà", code:"tra", group:"3"}, {name:"Chân Nấm (TP)", code:"chan_nam_tp", group:"3"},
                        {name:"Mũ L1", code:"mu_l1", group:"3"}, {name:"Mũ L2", code:"mu_l2", group:"3"}, {name:"Hầu Thủ Khô", code:"hau_thu_kho", group:"3"}
                    ];
                    seeds.forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }

                if(c==='chat') {
                    App.data.chat.sort((a,b) => (a.time||0)-(b.time||0));
                    if(!document.getElementById('chat-layer').classList.contains('hidden')) UI.renderChat(App.data.chat, App.user?.id);
                    if(document.getElementById('chat-layer').classList.contains('hidden') && snap.docChanges().some(ch=>ch.type==='added')) {
                        document.getElementById('chat-badge')?.classList.remove('hidden');
                        UI.playSound('msg');
                    }
                }

                if(c==='employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), { id: 9999, name: "Giám Đốc", pin: "9999", role: "Giám đốc", score: 100 });
                    UI.renderEmployeeOptions(App.data.employees);
                }
                
                if(App.user) App.ui.refresh(localStorage.getItem('n5_current_tab') || 'home');
            });
        });
    },

    ui: {
        refresh: (tab) => {
            if(tab==='home') UI.renderHome(App.data.houses, App.data.harvest, App.data.employees);
            if(tab==='sx') UI.renderSX(App.data.houses);
            if(tab==='th') UI.renderTH(App.data.houses, App.data.harvest, App.data.shipping, App.data.products); // Truyền products vào
            if(tab==='tasks') UI.renderTasksAndShip(App.data.tasks, App.user, App.data.houses, App.data.employees);
            if(tab==='team') UI.renderTeam(App.user, [], App.data.employees);
        },
        switchTab: (tab) => { UI.switchTab(tab); App.ui.refresh(tab); }
    },

    actions: {
        login: () => {
            const id = document.getElementById('login-user').value; const pin = document.getElementById('login-pin').value;
            const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
            if(emp) { App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp)); location.reload(); } else alert("Sai PIN!");
        },
        logout: () => { if(confirm("Đăng xuất?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        
        toggleChat: () => { 
            const l = document.getElementById('chat-layer'); l.classList.toggle('hidden');
            if(!l.classList.contains('hidden')) { document.getElementById('chat-badge').classList.add('hidden'); UI.renderChat(App.data.chat, App.user?.id); }
        },
        closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
        
        // FIX: ĐÃ THÊM ACTION MỞ/ĐÓNG MODAL
        openModal: (id) => {
            if(id === 'modal-add-prod') UI.renderAddProductModal(); // Render trước khi mở
            UI.toggleModal(id);
        },
        closeModal: (id) => document.getElementById(id).classList.add('hidden'),
        openSettings: () => { if(['Quản lý', 'Admin', 'Giám đốc'].includes(App.user.role)) UI.renderSettingsModal(App.data.employees); },

        sendChat: async () => { const inp = document.getElementById('chat-input'); if(inp.value.trim()) { await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); inp.value=''; } },
        installApp: () => { if (!App.deferredPrompt) return UI.showMsg("Đã cài hoặc không hỗ trợ"); App.deferredPrompt.prompt(); },
        enableNotif: () => { Notification.requestPermission().then(p => UI.showMsg(p==='granted'?"Đã bật thông báo!":"Đã chặn")); },

        // FIX: HÀM LƯU SẢN PHẨM MỚI
        submitAddProd: async () => {
            const n = document.getElementById('new-prod-name').value; const c = document.getElementById('new-prod-code').value; const g = document.getElementById('new-prod-group').value;
            if(!n || !c) return UI.showMsg("Thiếu tin!");
            await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g });
            document.getElementById('modal-add-prod').classList.add('hidden'); UI.showMsg(`Đã thêm ${n}`);
        },

        // FIX: HÀM LƯU KHO DUYỆT QUA LIST ĐỘNG
        submitTH: async () => {
            const area = document.getElementById('th-area').value; if(!area) return alert("Chọn nơi thu hoạch!");
            let d = {}, total = 0;
            // Loop qua danh sách sản phẩm lấy từ DB
            App.data.products.forEach(p => {
                const el = document.getElementById(`th-${p.code}`);
                if(el) { const v = Number(el.value)||0; if(v>0) { d[p.code]=v; total+=v; } el.value=''; }
            });
            if(total===0) return alert("Chưa nhập số!");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:'', user:App.user.name, time:Date.now() });
            App.helpers.notify(`🍄 ${App.user.name} nhập ${total} đơn vị`);
        },
        
        submitShip: async () => { const c = document.getElementById('ship-cust').value; const t = document.getElementById('ship-type').value; const q = Number(document.getElementById('ship-qty').value); if(!c || !q) return alert("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, type: t, qty: q, note: document.getElementById('ship-note').value, user: App.user.name, time: Date.now() }); App.helpers.notify(`🚚 Xuất ${q}kg ${t}`); },
        calcVariance: () => { const a = Number(document.getElementById('stock-count').value); const diff = a - 150.0; const r = document.getElementById('stock-variance-res'); r.classList.remove('hidden'); r.className = diff===0 ? 'mt-2 text-center text-xs font-bold text-green-600 bg-green-100 p-2 rounded' : 'mt-2 text-center text-xs font-bold text-red-600 bg-red-100 p-2 rounded'; r.innerText = diff===0 ? '✅ KHỚP' : `⚠️ LỆCH: ${diff}kg`; },
        submitAttendance: async () => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:App.user.name, type:'CHECK_IN', time:Date.now() }); App.helpers.notify(`🕒 Đã điểm danh`); } },
        submitLeave: async () => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:App.user.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now() }); document.getElementById('modal-leave').classList.add('hidden'); App.helpers.notify("📝 Đã gửi đơn nghỉ"); },
        submitBuyRequest: async () => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:App.user.name, item:document.getElementById('buy-name').value, unit:document.getElementById('buy-unit').value, qty:document.getElementById('buy-qty').value, status:'pending', time:Date.now() }); document.getElementById('modal-buy-req').classList.add('hidden'); App.helpers.notify("🛒 Đã gửi đề xuất mua"); },
        punishEmp: async (payload) => { const [id, points] = payload.split('|'); const r = prompt("Lý do:"); if(r) { const emp = App.data.employees.find(e => e._id === id); await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: (emp.score || 0) - Number(points) }); App.helpers.notify(`⚠️ PHẠT: ${emp.name} -${points}đ (${r})`); } },
        addTask: async () => { const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const a = document.getElementById('task-assignee').value; if(!t) return UI.showMsg("Thiếu tên việc!"); await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:a, status:'pending', createdBy:App.user.name, time:Date.now() }); App.helpers.notify(`📋 Giao việc cho ${a}`); },
        receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận việc"); },
        submitTask: async (id) => { const task = App.data.tasks.find(t=>t._id===id); if(task.assignee!==App.user.name) return UI.showMsg("Không phải việc của bạn!"); await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:App.user.name, completedAt:Date.now()}); const emp = App.data.employees.find(e=>e.name===App.user.name); if(emp) await updateDoc(doc(db, `${ROOT_PATH}/employees`, emp._id), {score: (emp.score||0)+10}); App.helpers.notify(`✅ Xong việc (+10đ)`); },
        setupHouseBatch: async () => { const h = document.getElementById('sx-house-select').value; const s = document.getElementById('sx-strain').value; const q = Number(document.getElementById('sx-spawn-qty').value); if(!h) return alert("Thiếu tin!"); await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: s, currentSpawn: q, status: 'ACTIVE' }); App.helpers.notify(`🏭 Vào lô tại ${h}`); },
        adminExport: () => UI.showMsg("Tính năng đang phát triển")
    }
};

window.App = App;
window.onload = App.init;
