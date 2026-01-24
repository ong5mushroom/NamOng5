import { auth, db, signInAnonymously, collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, ROOT_PATH } from './config.js';
import { UI } from './core.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        // Init UI
        if(UI && UI.initModals) UI.initModals(); else console.error("UI Module Error");

        // GLOBAL EVENT DELEGATION
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
                UI.toggleModal(UI.Templates.ModalBase("Quản Trị", `<button class="w-full py-3 bg-blue-100 text-blue-700 font-bold rounded-xl btn-action" data-action="installApp">Cài App</button><button class="w-full py-3 mt-2 bg-green-100 text-green-700 font-bold rounded-xl btn-action" data-action="adminExport">Xuất Báo Cáo</button>`, "closeModal", "Đóng"));
            }
            if(e.target.closest('#btn-open-chat')) {
                const l = document.getElementById('chat-layer');
                l.classList.remove('hidden'); l.style.display='flex';
                document.getElementById('chat-badge').classList.add('hidden');
                if(App.data.chat) UI.Templates.Chat(App.data.chat, App.user?.id);
            }
        });

        // AUTH & SYNC
        signInAnonymously(auth).then(() => {
            console.log("Firebase Connected");
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                if(['Giám đốc','Quản lý','Admin'].includes(App.user.role)) document.getElementById('btn-open-settings').classList.remove('hidden');
                UI.switchTab('home');
            }
        }).catch(err => { console.error("Err:", err); });
        
        // TAB NAV
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { UI.switchTab(btn.dataset.tab); App.renderCurrent(); }));
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','shipping','chat','products'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c==='products' && snap.empty) { // Auto Seed
                    [{name:"B2",code:"b2",group:"1"},{name:"A1",code:"a1",group:"1"},{name:"Chân Nấm",code:"chan_nam",group:"2"},{name:"Snack",code:"snack",group:"3"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }
                if(c==='employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"});
                    UI.renderEmployeeOptions(App.data.employees);
                }
                if(c==='chat' && !document.getElementById('chat-layer').classList.contains('hidden')) {
                    App.data.chat.sort((a,b) => (a.time||0)-(b.time||0));
                    UI.Templates.Chat(App.data.chat, App.user?.id);
                }
                if(App.user) App.renderCurrent();
            });
        });
    },

    renderCurrent: () => {
        const tab = localStorage.getItem('n5_current_tab') || 'home';
        const el = document.getElementById(`view-${tab}`);
        if(el) {
            if(tab==='home') el.innerHTML = UI.Views.Home(App.data);
            if(tab==='sx') el.innerHTML = UI.Views.Production(App.data);
            if(tab==='th') el.innerHTML = UI.Views.Warehouse(App.data);
            if(tab==='tasks') el.innerHTML = UI.Views.HR(App.data, App.user);
            if(tab==='team') el.innerHTML = UI.Views.Team(App.user, App.data);
        }
    },

    handleAction: (action, payload) => {
        // --- ACTION HANDLER ---
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
            
            // DYNAMIC TH
            openAddProd: () => {
                const html = `<div><label class="text-xs font-bold text-slate-500">Tên</label><input id="new-prod-name" placeholder="VD: Nấm Mỡ"></div><div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" placeholder="VD: nam_mo"></div><div><label class="text-xs font-bold text-slate-500">Nhóm</label><select id="new-prod-group"><option value="1">1. Tươi</option><option value="2">2. Phụ Phẩm</option><option value="3">3. Thành Phẩm</option></select></div>`;
                UI.toggleModal(UI.Templates.ModalBase("Thêm Mã Mới", html, "submitAddProd", "Lưu Mã"));
            },
            submitAddProd: async () => {
                const n = document.getElementById('new-prod-name').value; const c = document.getElementById('new-prod-code').value; const g = document.getElementById('new-prod-group').value;
                if(!n || !c) return UI.showMsg("Thiếu tin!");
                await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:c, group:g });
                UI.toggleModal(null); UI.showMsg("Đã thêm mã");
            },
            submitTH: async () => {
                const area = document.getElementById('th-area').value; if(!area) return UI.showMsg("Chọn nguồn!");
                let d = {}, total = 0;
                App.data.products.forEach(p => { const el = document.getElementById(`th-${p.code}`); if(el) { const v = Number(el.value)||0; if(v>0) { d[p.code]=v; total+=v; } el.value=''; } });
                if(total===0) return UI.showMsg("Chưa nhập số!");
                await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:'', user:App.user.name, time:Date.now() });
                UI.showMsg(`Đã lưu ${total} đơn vị`);
            },
            submitShip: async () => { const c = document.getElementById('ship-cust').value; const q = Number(document.getElementById('ship-qty').value); if(!c || !q) return UI.showMsg("Thiếu tin!"); await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, qty: q, user: App.user.name, time: Date.now() }); UI.showMsg("Đã xuất kho"); },
            
            // TASK & HR
            addTask: async () => {
                const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const checks = document.querySelectorAll('.task-emp-check:checked');
                if(!t || checks.length===0) return UI.showMsg("Thiếu tin!");
                checks.forEach(async (cb) => { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:cb.value, status:'pending', createdBy:App.user.name, time:Date.now() }); });
                UI.showMsg(`Đã giao ${checks.length} việc`);
            },
            submitTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:App.user.name, completedAt:Date.now()}); UI.showMsg("Đã xong"); },
            receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận"); },
            submitAttendance: async () => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:App.user.name, type:'CHECK_IN', time:Date.now() }); UI.showMsg("Đã điểm danh"); } },
            
            // MODALS
            openLeaveModal: () => UI.toggleModal(UI.Templates.ModalBase("Xin Nghỉ", `<input id="leave-date" type="date"><select id="leave-reason"><option>Việc riêng</option><option>Ốm</option></select>`, "submitLeave", "Gửi Đơn")),
            submitLeave: async () => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:App.user.name, type:'LEAVE', date:document.getElementById('leave-date').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
            openBuyModal: () => UI.toggleModal(UI.Templates.ModalBase("Mua Hàng", `<input id="buy-name" placeholder="Tên hàng"><input id="buy-qty" type="number" placeholder="SL">`, "submitBuyRequest", "Gửi Đề Xuất")),
            submitBuyRequest: async () => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:App.user.name, item:document.getElementById('buy-name').value, status:'pending', time:Date.now() }); UI.toggleModal(null); UI.showMsg("Đã gửi"); },
            
            // ADMIN
            installApp: () => { if (!App.deferredPrompt) return UI.showMsg("Không hỗ trợ"); App.deferredPrompt.prompt(); },
            adminExport: () => UI.showMsg("Đang xuất file...")
        };

        if(handlers[action]) handlers[action](payload);
    }
};

window.onload = App.init;
