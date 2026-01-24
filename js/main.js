import { auth, db, signInAnonymously, collection, onSnapshot, doc, getDoc, addDoc, ROOT_PATH } from './config.js';
import { UI } from './core.js';
import { Features } from './features.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        // --- SAFE INIT (QUAN TRỌNG) ---
        if (UI && typeof UI.initModals === 'function') {
            UI.initModals();
        } else {
            console.error("Critical: UI.initModals not found");
        }

        // --- GLOBAL EVENTS ---
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
                e.target.parentElement.querySelectorAll('button').forEach(b => {
                    if(b===e.target) b.classList.add('bg-white','text-green-600','shadow-sm');
                    else b.classList.remove('bg-white','text-green-600','shadow-sm');
                });
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
        }).catch(err => {
            console.error("Auth Error:", err);
            document.getElementById('debug-msg').innerText = "Lỗi kết nối Server";
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
            UI.switchTab(btn.dataset.tab);
            App.renderAll();
        }));
    },

    handleAction: (action, payload) => {
        if(Features.Production.actions[action]) Features.Production.actions[action](App.user);
        else if(Features.Warehouse.actions[action]) Features.Warehouse.actions[action](App.user, App.data);
        else if(Features.HR.actions[action]) Features.HR.actions[action](App.user, payload);
        else if(action === 'login') {
            const id = document.getElementById('login-user').value; const pin = document.getElementById('login-pin').value;
            const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
            if(emp) { App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp)); location.reload(); } else UI.showMsg("Sai PIN!");
        }
        else if(action === 'logout') { if(confirm("Thoát?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } }
        else if(action === 'closeModal') UI.toggleModal(null);
        else if(action === 'closeChat') document.getElementById('chat-layer').classList.add('hidden');
        else if(action === 'sendChat') {
            const inp = document.getElementById('chat-input');
            if(inp.value.trim()) { addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); inp.value=''; }
        }
        else if(action === 'installApp') { UI.showMsg("Chức năng đang cập nhật"); }
        else if(action === 'adminExport') { UI.showMsg("Đang xuất file..."); }
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','shipping','chat','products'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c === 'products' && snap.empty) { // Auto Seed
                    [{name:"B2",code:"b2",group:"1"}, {name:"A1",code:"a1",group:"1"}, {name:"Chân Nấm",code:"chan_nam",group:"2"}, {name:"Snack",code:"snack",group:"3"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }
                if(c === 'employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"});
                    UI.renderEmployeeOptions(App.data.employees);
                }
                if(c === 'chat' && !document.getElementById('chat-layer').classList.contains('hidden')) UI.Templates.Chat(App.data.chat, App.user?.id);
                
                if(App.user) App.renderAll();
            });
        });
    },

    renderAll: () => {
        const tab = localStorage.getItem('n5_current_tab') || 'home';
        if(tab==='home') Features.Home.render(App.data);
        if(tab==='sx') Features.Production.render(App.data);
        if(tab==='th') Features.Warehouse.render(App.data);
        if(tab==='tasks') Features.HR.renderTasks(App.data, App.user);
        if(tab==='team') Features.HR.renderTeam(App.user, []);
    }
};

window.onload = App.init;
