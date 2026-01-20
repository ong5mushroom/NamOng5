import { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const ROOT_PATH = "artifacts/namong5_production/public/data"; // PATH GỐC
const COMPANY = { name: "CÔNG TY TNHH NẤM ÔNG 5", address: "Lạc Dương, Lâm Đồng", contact: "0983.59.0808" };

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], supplies: [], distributions: [], chat: [], hr_requests: [], buy_requests: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals(); // Khởi tạo sự kiện đóng
        
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) App.actions[action](payload);
            }
            if(e.target.closest('#btn-open-chat')) {
                UI.renderChat(App.data.chat, App.user?.id);
            }
            if(e.target.closest('#btn-open-settings')) {
                if(['Quản lý','Admin','Giám đốc'].includes(App.user?.role)) {
                    UI.renderSettings(App.data.employees);
                    UI.toggleModal('modal-settings', true);
                } else UI.showMsg("Không có quyền!", "error");
            }
        });

        signInAnonymously(auth).then(() => {
            document.getElementById('login-status').innerText = '✔ Đã kết nối V225';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        });

        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
        document.getElementById('login-btn')?.addEventListener('click', App.actions.login);
    },

    syncData: () => {
        const colls = ['employees','houses','harvest_logs','tasks','shipping','supplies','distributions','chat','hr_requests','buy_requests'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const k = c==='harvest_logs'?'harvest':c;
                App.data[k] = snap.docs.map(d=>({...d.data(), _id:d.id}));
                
                // Sort
                if(c==='chat') App.data.chat.sort((a,b)=>(a.time||0)-(b.time||0));
                else if(App.data[k].length && App.data[k][0].time) App.data[k].sort((a,b)=>(b.time||0)-(a.time||0));

                if(c==='employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:9999, name:"Giám Đốc", pin:"9999", role:"Giám đốc", score:100});
                    UI.renderEmployeeOptions(App.data.employees);
                }

                // Refresh Chat nếu đang mở
                if(c==='chat' && !document.getElementById('chat-layer').classList.contains('hidden')) 
                    UI.renderChat(App.data.chat, App.user?.id);

                App.ui.refresh(localStorage.getItem('n5_current_tab') || 'home');
            });
        });
    },

    ui: {
        switchTab: (tab) => {
            UI.switchTab(tab);
            if(tab==='home') UI.renderHome(App.data.houses, App.data.harvest);
            if(tab==='sx') UI.renderSX(App.data.houses);
            if(tab==='th') UI.renderTH(App.data.houses, App.data.harvest, App.data.shipping);
            if(tab==='stock') UI.renderStock([], App.data.supplies, App.data.distributions);
            // Quan trọng: Truyền App.data.employees vào để render dropdown nhân viên
            if(tab==='tasks') UI.renderTasksAndShip(App.data.tasks, App.user, App.data.houses, App.data.employees);
            if(tab==='team') UI.renderTeam(App.user, [...(App.data.hr_requests||[]), ...(App.data.buy_requests||[])]);
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
            } else alert("Sai thông tin!");
        },
        logout: () => { if(confirm("Đăng xuất?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        toggleModal: (id) => UI.toggleModal(id, true),
        closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),

        // Tasks
        addTask: async () => {
            const t = document.getElementById('task-title').value;
            const h = document.getElementById('task-house').value;
            const a = document.getElementById('task-assignee').value;
            const d = document.getElementById('task-deadline').value;
            const desc = document.getElementById('task-desc').value;
            if(!t || !a) return alert("Thiếu tin!");
            await addDoc(collection(db, `${ROOT_PATH}/tasks`), { title:t, house:h, assignee:a, deadline:d, desc, status:'pending', createdBy:App.user.name, time:Date.now() });
            UI.playSound('success'); UI.showMsg("Đã giao việc");
            // Gửi chat thông báo
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text:`📋 ${App.user.name} giao việc "${t}" cho ${a}`, senderId:'SYSTEM', type:'system', time:Date.now() });
        },
        receiveTask: async (id) => { await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'received', receivedAt:Date.now()}); UI.showMsg("Đã nhận"); },
        submitTask: async (id) => { 
            const q = prompt("Số lượng / Kết quả:"); if(!q) return;
            const n = prompt("Ghi chú:");
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), {status:'done', actualQty:q, resultNote:n, completedBy:App.user.name, completedAt:Date.now()});
            UI.playSound('success'); UI.showMsg("Hoàn thành");
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text:`✅ ${App.user.name} đã làm xong việc!`, senderId:'SYSTEM', type:'system', time:Date.now() });
        },
        remindAttendance: async () => {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text:`📢 QUẢN LÝ NHẮC NHỞ: Mọi người báo cáo & điểm danh!`, senderId:'SYSTEM', type:'system', time:Date.now() });
            UI.playSound('remind'); UI.showMsg("Đã nhắc nhở");
        },

        // Team
        submitAttendance: async () => {
            if(confirm("Chấm công bây giờ?")) {
                await addDoc(collection(db, `${ROOT_PATH}/attendance`), { user:App.user.name, type:'CHECK_IN', time:Date.now() });
                UI.playSound('success'); UI.showMsg("Đã chấm công");
            }
        },
        submitLeave: async () => {
            const d = document.getElementById('leave-date').value;
            const r = document.getElementById('leave-reason').value;
            if(!d) return alert("Chọn ngày!");
            await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { user:App.user.name, type:'LEAVE', date:d, reason:r, status:'pending', time:Date.now() });
            UI.toggleModal('modal-leave', false); UI.showMsg("Đã gửi đơn");
        },
        submitBuyRequest: async () => {
            const n = document.getElementById('buy-name').value;
            const u = document.getElementById('buy-unit').value;
            const q = document.getElementById('buy-qty').value;
            const note = document.getElementById('buy-note').value;
            if(!n) return alert("Thiếu tên!");
            await addDoc(collection(db, `${ROOT_PATH}/buy_requests`), { user:App.user.name, item:n, unit:u, qty:q, note, status:'pending', time:Date.now() });
            UI.toggleModal('modal-buy-req', false); UI.showMsg("Đã gửi đề xuất");
        },
        approveRequest: async (id) => {
            let isHR = App.data.hr_requests.find(r=>r._id===id);
            await updateDoc(doc(db, `${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`, id), {status:'approved', approvedBy:App.user.name});
            UI.showMsg("Đã duyệt");
        },
        rejectRequest: async (id) => {
            let isHR = App.data.hr_requests.find(r=>r._id===id);
            await updateDoc(doc(db, `${ROOT_PATH}/${isHR?'hr_requests':'buy_requests'}`, id), {status:'rejected', approvedBy:App.user.name});
            UI.showMsg("Đã từ chối");
        },

        // Chat
        sendChat: async () => {
            const inp = document.getElementById('chat-input');
            const txt = inp.value.trim();
            if(!txt) return;
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { text:txt, senderId:App.user.id, senderName:App.user.name, time:Date.now() });
            inp.value = '';
        },

        // Admin Settings
        addEmp: async () => {
            const n = document.getElementById('ne-name').value;
            const p = document.getElementById('ne-pin').value;
            const r = document.getElementById('ne-role').value;
            if(!n || !p) return alert("Thiếu tin!");
            await addDoc(collection(db, `${ROOT_PATH}/employees`), { id:Date.now(), name:n, pin:p, role:r, score:100 });
            UI.renderSettings(App.data.employees); // Refresh list
        },
        delEmp: async (id) => {
            if(confirm("Xóa nhân viên này?")) {
                await deleteDoc(doc(db, `${ROOT_PATH}/employees`, id));
                UI.renderSettings(App.data.employees);
            }
        },
        export: (type) => {
            let d = type==='tasks' ? App.data.tasks : App.data.harvest;
            if(!d.length) return alert("Không có dữ liệu");
            const csv = "data:text/csv;charset=utf-8," + Object.keys(d[0]).join(",") + "\n" + d.map(e=>Object.values(e).join(",")).join("\n");
            const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `${type}_report.csv`; document.body.appendChild(link); link.click();
        },

        // Common
        setupHouseBatch: async () => { /* Giữ nguyên */ },
        submitTH: async () => { /* Giữ nguyên */ },
        submitShip: async () => { /* Giữ nguyên */ },
        submitStockCheck: async () => { /* Giữ nguyên */ },
        submitDistribute: async () => { /* Giữ nguyên */ }
    }
};

window.App = App;
window.onload = App.init;
