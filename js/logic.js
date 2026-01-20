import { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc } from './config.js';
import { UI } from './ui.js';

const ROOT_PATH = "artifacts/namong5_production/public/data"; 

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], hr_requests: [], buy_requests: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    helpers: {
        notify: async (msg, type='system') => {
            UI.playSound('success');
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: msg, senderId: 'SYSTEM', senderName: 'HỆ THỐNG', type: 'system', time: Date.now() });
        }
    },

    init: () => {
        UI.initModals();
        
        // Sự kiện click toàn cục
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) App.actions[action](payload);
            }
            if(e.target.closest('#btn-open-chat')) UI.renderChat(App.data.chat, App.user?.id);
        });

        // Kết nối Firebase
        signInAnonymously(auth).then(() => {
            const statusEl = document.getElementById('login-status');
            if(statusEl) statusEl.innerText = '✔ V334 Connected';
            
            App.syncData();
            
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        }).catch(err => {
            alert("Lỗi kết nối: " + err.message);
            console.error(err);
        });
        
        // Tab Nav
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
        
        // Login Button
        const loginBtn = document.getElementById('login-btn');
        if(loginBtn) loginBtn.addEventListener('click', App.actions.login);
    },

    syncData: () => {
        const colls = ['employees','houses','harvest_logs','tasks','shipping','chat','hr_requests','buy_requests'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c==='chat') {
                    App.data.chat.sort((a,b) => (a.time||0)-(b.time||0));
                    if(!document.getElementById('chat-layer').classList.contains('hidden')) UI.renderChat(App.data.chat, App.user?.id);
                } else if(App.data[key].length && App.data[key][0].time) {
                    App.data[key].sort((a,b) => (b.time||0)-(a.time||0));
                }

                if(c==='employees') {
                    if(snap.empty) {
                        addDoc(collection(db, `${ROOT_PATH}/employees`), { id: 9999, name: "Giám Đốc", pin: "9999", role: "Giám đốc", score: 100 });
                    }
                    UI.renderEmployeeOptions(App.data.employees);
                }
                
                App.ui.refresh(localStorage.getItem('n5_current_tab') || 'home');
            });
        });
    },

    ui: {
        switchTab: (tab) => {
            UI.switchTab(tab);
            if(tab==='home') UI.renderHome(App.data.houses, App.data.harvest, App.data.employees);
            if(tab==='sx') UI.renderSX(App.data.houses);
            if(tab==='th') UI.renderTH(App.data.houses, App.data.harvest, App.data.shipping);
            if(tab==='tasks') UI.renderTasksAndShip(App.data.tasks, App.user, App.data.houses, App.data.employees);
            if(tab==='team') UI.renderTeam(App.user, [...(App.data.hr_requests||[]), ...(App.data.buy_requests||[])], App.data.employees);
        }
    },

    actions: {
        login: () => {
            const id = document.getElementById('login-user').value;
            const pin = document.getElementById('login-pin').value;
            const emp = App.data.employees.find(e => String(e.id) == id && String(e.pin) == pin);
            if(emp) {
                App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                location.reload();
            } else alert("Sai PIN!");
        },
        logout: () => { if(confirm("Đăng xuất?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
        sendChat: async () => {
            const inp = document.getElementById('chat-input');
            if(inp.value.trim()) { await addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); inp.value=''; }
        },

        // --- TASK & SCORING ---
        addTask: async () => {
            const t = document.getElementById('task-title').value; const h = document.getElementById('task-house').value; const a = document.getElementById('task-assignee').value; const d = document.getElementById('task-deadline').value; const desc = document.getElementById('task-desc').value;
            if(!t || !a) return alert("Thiếu tin!");
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:a, deadline:d, desc, status:'pending', createdBy:App.user.name, time:Date.now() });
            App.helpers.notify(`📋 Giao việc: ${t} cho ${a}`);
        },
        receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận việc"); },
        submitTask: async (id) => { 
            const todayTasks = App.data.tasks.filter(t => t.assignee === App.user.name && new Date(t.time).getDate() === new Date().getDate());
            const points = todayTasks.length > 0 ? (10 / todayTasks.length) : 10;
            const empRef = App.data.employees.find(e => e.id === App.user.id);
            if(empRef) {
                const newScore = (empRef.score || 0) + points;
                await updateDoc(doc(db, `${ROOT_PATH}/employees`, empRef._id), { score: Math.round(newScore * 10) / 10 });
            }
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', completedBy:App.user.name, completedAt:Date.now()});
            App.helpers.notify(`✅ ${App.user.name} xong việc (+${points.toFixed(1)}đ)`);
        },
        
        // --- ADMIN ---
        punishEmp: async (payload) => {
            const [id, points] = payload.split('|');
            const reason = prompt("Lý do phạt:");
            if(reason) {
                const emp = App.data.employees.find(e => e._id === id);
                const newScore = (emp.score || 0) - Number(points);
                await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: newScore });
                App.helpers.notify(`⚠️ PHẠT: ${emp.name} -${points}đ (${reason})`);
            }
        },
        adminAddEmp: async () => {
            const n = document.getElementById('new-emp-name').value; const p = document.getElementById('new-emp-pin').value;
            if(n && p) await addDoc(collection(db, `${ROOT_PATH}/employees`), { id:Date.now(), name:n, pin:p, role:'Nhân viên', score:100 });
        },
        adminDelEmp: async (id) => { if(confirm("Xóa?")) await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id)); },

        // --- DATA ---
        submitTH: async () => {
            const area = document.getElementById('th-area').value;
            if(!area) return alert("Chọn nơi thu hoạch!");
            const codes = ['b2','a1','a2','b1','ht','a1f','a2f','b2f','d1','cn','hc','hh','snack','kho','tra'];
            let d = {}, total = 0;
            codes.forEach(c => { const v = Number(document.getElementById(`th-${c}`).value)||0; if(v>0) { d[c]=v; total+=v; } });
            if(total===0) return alert("Chưa nhập số!");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, note:document.getElementById('th-note').value, user:App.user.name, time:Date.now() });
            App.helpers.notify(`🍄 Nhập kho ${total}kg/gói từ ${area}`);
        },
        submitAttendance: async () => {
            if(confirm("Chấm công?")) {
                await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:App.user.name, type:'CHECK_IN', time:Date.now() });
                App.helpers.notify(`🕒 ${App.user.name} đã điểm danh`);
            }
        },
        submitLeave: async () => { await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:App.user.name, type:'LEAVE', date:document.getElementById('leave-date').value, reason:document.getElementById('leave-reason').value, status:'pending', time:Date.now() }); UI.toggleModal('modal-leave'); },
        submitBuyRequest: async () => { await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:App.user.name, item:document.getElementById('buy-name').value, unit:document.getElementById('buy-unit').value, qty:document.getElementById('buy-qty').value, status:'pending', time:Date.now() }); UI.toggleModal('modal-buy-req'); },
        approveRequest: async (id) => { let isHR=App.data.hr_requests.find(r=>r._id===id); await updateDoc(doc(db,`${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`,id),{status:'approved'}); UI.showMsg("Đã duyệt"); },
        rejectRequest: async (id) => { let isHR=App.data.hr_requests.find(r=>r._id===id); await updateDoc(doc(db,`${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`,id),{status:'rejected'}); UI.showMsg("Đã hủy"); }
    }
};

window.App = App;
window.onload = App.init;
