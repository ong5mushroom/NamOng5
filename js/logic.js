import { auth, db, ROOT_PATH, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], production: [], attendance: [], chat: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals(); 
        signInAnonymously(auth).then(() => {
            const statusEl = document.getElementById('login-status');
            if(statusEl) statusEl.innerHTML = '<span class="text-green-500">✔ Đã kết nối</span>';
            App.sync();
        }).catch(err => console.error("Lỗi kết nối:", err));
        
        // GLOBAL CLICK HANDLER (SỬA LỖI NÚT BÁNH XE & CHAT)
        document.body.addEventListener('click', (e) => {
            // 1. Nút chức năng (btn-action)
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) App.actions[action](payload);
            }
            // 2. Chuyển Tab
            const nav = e.target.closest('.nav-btn');
            if(nav && nav.dataset.tab) App.ui.switchTab(nav.dataset.tab);
            // 3. Login
            if(e.target.id === 'login-btn') App.auth.login();
            
            // 4. Mở Cài đặt (FIX LỖI: Bắt sự kiện vào cả icon)
            if(e.target.closest('#btn-open-settings')) UI.toggleModal('settings-modal', true);
            
            // 5. Mở Chat
            if(e.target.closest('#btn-open-chat')) {
                const layer = document.getElementById('chat-layer');
                layer.classList.remove('hidden');
                layer.style.display = 'flex';
                App.ui.renderChat(); // Vẽ chat ngay khi mở
            }
        });

        // ENTER KEY CHO CHAT
        document.body.addEventListener('keyup', (e) => {
            if(e.key === 'Enter' && e.target.id === 'chat-input-field') {
                App.actions.sendChat();
            }
        });
    },

    sync: () => {
        const mapD = s => s.docs.map(d => ({...d.data(), _id: d.id}));
        // 1. Nhân sự
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), s => {
            App.data.employees = mapD(s);
            if(!App.user) UI.renderEmployeeOptions(App.data.employees);
            else App.ui.refresh();
        });
        // 2. Chat (Sync riêng để realtime)
        onSnapshot(collection(db, `${ROOT_PATH}/chat`), s => {
            App.data.chat = mapD(s).sort((a,b)=>a.time-b.time);
            if(App.user && !document.getElementById('chat-layer').classList.contains('hidden')) {
                App.ui.renderChat();
            }
        });
        // 3. Các dữ liệu khác
        ['houses', 'harvest_logs', 'tasks', 'production_logs', 'attendance_logs'].forEach(col => {
            onSnapshot(collection(db, `${ROOT_PATH}/${col}`), s => {
                if(col==='harvest_logs') App.data.harvest = mapD(s);
                else if(col==='production_logs') App.data.production = mapD(s);
                else if(col==='attendance_logs') App.data.attendance = mapD(s);
                else App.data[col] = mapD(s);
                if(App.user) App.ui.refresh();
            });
        });
    },

    auth: {
        login: () => {
            const id = document.getElementById('login-user').value;
            const pin = document.getElementById('login-pin').value.trim();
            const emp = App.data.employees.find(e => String(e.id) === id && String(e.pin) === pin);
            if(emp) {
                App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = emp.name;
                document.getElementById('head-role').innerText = emp.role;
                
                const isGenAdmin = ['Giám đốc', 'Quản lý', 'Kế toán'].includes(emp.role);
                const adminTools = document.getElementById('admin-tools');
                if(isGenAdmin && adminTools) adminTools.classList.remove('hidden');
                
                App.ui.switchTab('home');
            } else UI.showMsg("Sai mã PIN!");
        }
    },

    ui: {
        switchTab: (id) => {
            const u = App.user;
            const isGenAdmin = ['Giám đốc', 'Quản lý', 'Kế toán'].includes(u.role);
            if (!isGenAdmin) {
                if (id === 'th' && u.team !== 'Tổ Thu Hoạch') return UI.showMsg("Chỉ dành cho Tổ Thu Hoạch!");
                if (id === 'sx' && u.team !== 'Tổ Sản Xuất') return UI.showMsg("Chỉ dành cho Tổ Sản Xuất!");
            }
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            
            const view = document.getElementById('view-'+id);
            const btn = document.querySelector(`.nav-btn[data-tab="${id}"]`);
            if(view) view.classList.remove('hidden');
            if(btn) btn.classList.add('active');
            
            // Pass đủ data cho Home
            if(id === 'home') UI.renderHome(App.data.houses, App.data.harvest, App.data.production, App.data.employees);
            if(id === 'tasks') UI.renderTasks(App.data.tasks, App.data.employees, App.data.houses, u);
            if(id === 'sx') UI.renderSX(App.data.houses, App.data.production);
            if(id === 'th') UI.renderTH(App.data.houses, App.data.harvest);
            if(id === 'team') UI.renderTeam(App.data.employees, u);
        },
        refresh: () => {
            const activeTab = document.querySelector('.nav-btn.active')?.dataset.tab;
            if(activeTab) App.ui.switchTab(activeTab);
        },
        renderChat: () => {
            UI.renderChat(App.data.chat, App.user.id);
        }
    },

    actions: {
        logout: () => { localStorage.removeItem('n5_modular_user'); location.reload(); },
        closeModal: (id) => UI.toggleModal(id, false),
        openModal: (id) => UI.toggleModal('modal-'+id, true),
        closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
        
        // CHAT ACTION (Mới)
        sendChat: async () => {
            const input = document.getElementById('chat-input-field');
            const txt = input.value.trim();
            if(!txt) return;
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: txt, senderId: App.user.id, senderName: App.user.name, time: Date.now() 
            });
            input.value = '';
        },

        checkIn: async (shift) => {
            const today = new Date().toISOString().split('T')[0];
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, App.user._id), { lastLogin: today });
            await addDoc(collection(db, `${ROOT_PATH}/attendance_logs`), { date: today, time: Date.now(), user: App.user.name, uid: App.user.id, shift, team: App.user.team });
            await App.actions.modScore(`${App.user._id}|2`);
            UI.showMsg(`Đã điểm danh ${shift}!`);
        },
        createTask: async () => {
            const title = document.getElementById('task-title').value;
            const houses = Array.from(document.querySelectorAll('input[name="h-chk"]:checked')).map(c=>c.value);
            const users = Array.from(document.querySelectorAll('input[name="u-chk"]:checked')).map(c=>c.value);
            if(!title || !houses.length || !users.length) return UI.showMsg("Thiếu thông tin!");
            for(let h of houses) { for(let u of users) { await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title, houseId: h, assignee: u, status: 'pending', time: Date.now(), assigner: App.user.name }); }}
            UI.showMsg("Đã giao việc!");
        },
        completeTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'completed', finishTime: Date.now() }); UI.showMsg("Đã xong!"); },
        delTask: async (id) => { if(confirm("Xóa?")) await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); },
        submitSX: async (action) => {
            const house = document.getElementById('sx-house-id').value;
            const type = document.getElementById('sx-type').value;
            const qty = document.getElementById('sx-qty').value;
            const batch = document.getElementById('sx-batch').value;
            const date = document.getElementById('sx-date').value;
            if(!house || !qty) return UI.showMsg("Thiếu thông tin!");
            await addDoc(collection(db, `${ROOT_PATH}/production_logs`), { action, house, type, qty, batch, date, user: App.user.name, time: Date.now() });
            UI.showMsg("Đã lưu!");
        },
        submitTH: async () => {
            const area = document.getElementById('th-area').value;
            if(!area) return UI.showMsg("Chưa chọn Nhà!");
            const ids = ['b2','a1','a2','b1','chan','d1','a1f','a2f','b2f','ht'];
            let d = {}, total = 0;
            ids.forEach(k => { const val = Number(document.getElementById('th-'+k).value)||0; if(val>0){d[k]=val; total+=val;} });
            if(total<=0) return UI.showMsg("Nhập số lượng!");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details: d, total, user: App.user.name, time: Date.now() });
            ids.forEach(k => document.getElementById('th-'+k).value='');
            UI.showMsg(`Đã lưu ${total}kg!`);
            await App.actions.modScore(`${App.user._id}|10`);
        },
        addEmployee: async () => {
            const n = document.getElementById('new-emp-name').value;
            const id = document.getElementById('new-emp-id').value;
            const p = document.getElementById('new-emp-pin').value;
            if(!n || !id || !p) return UI.showMsg("Thiếu tin!");
            await addDoc(collection(db, `${ROOT_PATH}/employees`), { id, name: n, pin: p, role: document.getElementById('new-emp-role').value, team: document.getElementById('new-emp-team').value, score: 0 });
            UI.toggleModal('modal-addStaff', false); UI.showMsg("Đã thêm!");
        },
        modScore: async (payload) => {
            const [uid, val] = payload.split('|');
            const e = App.data.employees.find(x => x._id === uid);
            if(e) await updateDoc(doc(db, `${ROOT_PATH}/employees`, uid), { score: (Number(e.score)||0) + Number(val) });
        },
        delEmp: async (uid) => { if(confirm("Xóa?")) await deleteDoc(doc(db, `${ROOT_PATH}/employees`, uid)); },
        submitHR: async (type) => {
            const c = type==='LEAVE'?(document.getElementById('leave-date').value+'-'+document.getElementById('leave-reason').value):document.getElementById('pur-item').value;
            await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { type, content: c, requester: App.user.name, status: 'pending', time: Date.now() });
            UI.showMsg("Đã gửi!"); UI.toggleModal(type==='LEAVE'?'modal-leave':'modal-buy', false);
        },
        exportTH: () => {
            let csv = "NGAY;NHA;TONG_KG;NV\n"; App.data.harvest.forEach(l => csv += `${new Date(l.time).toLocaleDateString()};${l.area};${l.total};${l.user}\n`);
            App.helpers.downloadCSV(csv, 'TongHop.csv');
        },
        exportAttendance: () => {
            let csv = "NGAY;GIO;TEN;CA;TO\n"; App.data.attendance.forEach(l => csv += `${l.date};${new Date(l.time).toLocaleTimeString()};${l.user};${l.shift};${l.team}\n`);
            App.helpers.downloadCSV(csv, 'ChamCong.csv');
        },
        exportCSVByHouse: (h) => {
            let csv = "NGAY;NHA;KG;NV\n"; App.data.harvest.filter(x=>x.area===h).forEach(l=>{ csv+=`${new Date(l.time).toLocaleDateString()};${l.area};${l.total};${l.user}\n`; });
            App.helpers.downloadCSV(csv, `NK_${h}.csv`);
        },
        resetLeaderboard: async () => {
             if(confirm("Reset thi đua?")) { App.data.employees.forEach(e => updateDoc(doc(db, `${ROOT_PATH}/employees`, e._id), { score: 0 })); UI.showMsg("Đã Reset!"); }
        }
    },
    helpers: {
        downloadCSV: (c, f) => {
            const blob = new Blob(["\uFEFFsep=;\n"+c], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=f; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
    }
};

window.onload = App.init;
