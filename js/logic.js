import { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc } from './config.js';
import { UI } from './ui.js';

const ROOT_PATH = "artifacts/namong5_production/public/data"; 

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], hr_requests: [], buy_requests: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,
    deferredPrompt: null, // Biến lưu sự kiện cài app

    helpers: {
        notify: async (msg) => {
            UI.playSound('success');
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: msg, senderId: 'SYSTEM', senderName: 'HỆ THỐNG', type: 'system', time: Date.now() });
            UI.showMsg(msg);
        }
    },

    init: () => {
        UI.initModals();
        
        // PWA INSTALL HANDLER
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            App.deferredPrompt = e;
        });

        // SỰ KIỆN CLICK TẬP TRUNG (FIX LỖI BẤM KHÔNG ĂN)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) App.actions[action](payload);
            }
            if(e.target.closest('#btn-open-chat')) UI.renderChat(App.data.chat, App.user?.id);
            if(e.target.dataset.action === 'toggleTH') {
                const mode = e.target.dataset.payload;
                document.getElementById('zone-th').classList.toggle('hidden', mode !== 'in');
                document.getElementById('zone-ship').classList.toggle('hidden', mode !== 'out');
            }
            if(e.target.closest('#btn-open-settings')) UI.renderSettingsModal(App.data.employees);
        });
        
        signInAnonymously(auth).then(() => {
            document.getElementById('login-status').innerText = '✔ V450 Ready';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        });
        document.getElementById('login-btn')?.addEventListener('click', App.actions.login);
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
    },

    syncData: () => {
        const colls = ['employees','houses','harvest_logs','tasks','shipping','chat','hr_requests','buy_requests'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c==='chat' && !document.getElementById('chat-layer').classList.contains('hidden')) UI.renderChat(App.data.chat, App.user?.id);
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
            if(tab==='th') UI.renderTH(App.data.houses, App.data.harvest, App.data.shipping);
            if(tab==='tasks') UI.renderTasksAndShip(App.data.tasks, App.user, App.data.houses, App.data.employees);
            if(tab==='team') UI.renderTeam(App.user, [...(App.data.hr_requests||[]), ...(App.data.buy_requests||[])], App.data.employees);
        },
        switchTab: (tab) => {
            UI.switchTab(tab);
            App.ui.refresh(tab);
        }
    },

    actions: {
        login: () => {
            const id = document.getElementById('login-user').value; const pin = document.getElementById('login-pin').value;
            const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
            if(emp) { App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp)); location.reload(); } else alert("Sai PIN!");
        },
        logout: () => { if(confirm("Đăng xuất?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
        sendChat: async () => { const inp = document.getElementById('chat-input'); if(inp.value.trim()) { await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); inp.value=''; } },

        // --- NEW FEATURES ---
        installApp: () => {
            if (!App.deferredPrompt) return UI.showMsg("App đã cài hoặc không hỗ trợ", "error");
            App.deferredPrompt.prompt();
        },
        enableNotif: () => {
            Notification.requestPermission().then(p => {
                if(p==='granted') UI.showMsg("Đã bật thông báo!"); else UI.showMsg("Bạn đã chặn thông báo", "error");
            });
        },

        // --- CORE LOGIC ---
        addTask: async () => {
            const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const a = document.getElementById('task-assignee').value; const d = document.getElementById('task-deadline').value; const desc = document.getElementById('task-desc').value;
            if(!t || !a) return UI.showMsg("Thiếu tên hoặc người làm!", "error"); // Fix lỗi báo thiếu tin
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:a, deadline:d, desc, status:'pending', createdBy:App.user.name, time:Date.now() });
            App.helpers.notify(`📋 Giao việc: ${t} cho ${a}`);
        },
        receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận việc"); },
        submitTask: async (id) => { 
            // FIX BẢO MẬT: CHỈ NGƯỜI ĐƯỢC GIAO MỚI BÁO CÁO
            const task = App.data.tasks.find(t => t._id === id);
            if(task && task.assignee !== App.user.name) return UI.showMsg("Không phải việc của bạn!", "error");

            const todayTasks = App.data.tasks.filter(t => t.assignee === App.user.name && new Date(t.time).getDate() === new Date().getDate());
            const points = todayTasks.length > 0 ? (10 / todayTasks.length) : 10;
            const empRef = App.data.employees.find(e => e.id === App.user.id);
            if(empRef) { await updateDoc(doc(db, `${ROOT_PATH}/employees`, empRef._id), { score: Math.round(((empRef.score||0) + points) * 10) / 10 }); }
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:App.user.name, completedAt:Date.now()});
            App.helpers.notify(`✅ ${App.user.name} xong việc (+${points.toFixed(1)}đ)`);
        },
        submitTH: async () => {
            const area = document.getElementById('th-area').value; if(!area) return alert("Chọn nơi thu hoạch!");
            const codes = ['b2','a1','a2','b1','ht','a1f','a2f','b2f','d1','cn','hc','hh','snack','kho','tra','chan_nam','mu_l1','mu_l2','hau_thu_kho'];
            let d = {}, total = 0;
            codes.forEach(c => { const v = Number(document.getElementById(`th-${c}`)?.value)||0; if(v>0) { d[c]=v; total+=v; } });
            if(total===0) return alert("Chưa nhập số!");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:'', user:App.user.name, time:Date.now() });
            // Reset fields
            codes.forEach(c => { if(document.getElementById(`th-${c}`)) document.getElementById(`th-${c}`).value = ''; });
            App.helpers.notify(`🍄 ${App.user.name} nhập ${total} đơn vị`);
        },
        submitShip: async () => {
            const c = document.getElementById('ship-cust').value; const t = document.getElementById('ship-type').value; const q = Number(document.getElementById('ship-qty').value);
            if(!c || !q) return alert("Thiếu tin!");
            await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, type: t, qty: q, note: document.getElementById('ship-note').value, user: App.user.name, time: Date.now() });
            App.helpers.notify(`🚚 Xuất ${q}kg ${t} cho ${c}`);
        },
        calcVariance: () => {
            const actual = Number(document.getElementById('stock-count').value);
            const system = 150.0; const diff = actual - system;
            const res = document.getElementById('stock-variance-res');
            res.classList.remove('hidden');
            res.className = diff===0 ? 'mt-3 p-3 rounded-lg text-center text-sm font-bold bg-green-100 text-green-700' : 'mt-3 p-3 rounded-lg text-center text-sm font-bold bg-red-100 text-red-700';
            res.innerText = diff===0 ? '✅ KHỚP SỐ LIỆU' : `⚠️ LỆCH: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
        },
        submitAttendance: async () => { if(confirm("Chấm công?")) { await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:App.user.name, type:'CHECK_IN', time:Date.now() }); App.helpers.notify(`🕒 ${App.user.name} đã điểm danh`); } },
        submitLeave: async () => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:App.user.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now() }); document.getElementById('modal-leave').classList.add('hidden'); App.helpers.notify("📝 Đã gửi đơn nghỉ"); },
        submitBuyRequest: async () => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:App.user.name, item:document.getElementById('buy-name').value, unit:document.getElementById('buy-unit').value, qty:document.getElementById('buy-qty').value, status:'pending', time:Date.now() }); document.getElementById('modal-buy-req').classList.add('hidden'); App.helpers.notify("🛒 Đã gửi đề xuất mua"); },
        punishEmp: async (payload) => { const [id, points] = payload.split('|'); const r = prompt("Lý do:"); if(r) { const emp = App.data.employees.find(e => e._id === id); await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: (emp.score || 0) - Number(points) }); App.helpers.notify(`⚠️ PHẠT: ${emp.name} -${points}đ (${r})`); } },
        adminAddEmp: async () => { const n = document.getElementById('new-emp-name').value; const p = document.getElementById('new-emp-pin').value; if(n && p) { await addDoc(collection(db, `${ROOT_PATH}/employees`), { id:Date.now(), name:n, pin:p, role:'Nhân viên', score:100 }); App.helpers.notify("Đã thêm NV"); } },
        adminDelEmp: async (id) => { if(confirm("Xóa?")) await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id)); },
        approveRequest: async (id) => { let isHR=App.data.hr_requests.find(r=>r._id===id); await updateDoc(doc(db,`${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`,id),{status:'approved'}); App.helpers.notify("Đã duyệt đơn"); },
        rejectRequest: async (id) => { let isHR=App.data.hr_requests.find(r=>r._id===id); await updateDoc(doc(db,`${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`,id),{status:'rejected'}); App.helpers.notify("Đã từ chối đơn"); },
        setupHouseBatch: async () => { const h = document.getElementById('sx-house-select').value; const s = document.getElementById('sx-strain').value; const dStr = document.getElementById('sx-date').value; const q = Number(document.getElementById('sx-spawn-qty').value); if(!h) return alert("Thiếu tin!"); const d = new Date(dStr); const bc = `${s.toUpperCase()}-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`; await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: bc, currentSpawn: q, status: 'ACTIVE', startDate: Date.now() }); App.helpers.notify(`🏭 Vào lô: ${bc} tại ${h}`); },
        adminExport: (type) => { UI.renderSettingsModal(App.data.employees); UI.showMsg("Đang xuất file..."); }
    }
};

window.App = App;
window.onload = App.init;
