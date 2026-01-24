import { auth, db, signInAnonymously, collection, onSnapshot, doc, getDoc, addDoc, ROOT_PATH } from './config.js';
import { UI } from './core.js';
import { Features } from './features.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals(); // Gọi hàm đã sửa
        
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
            if(e.target.closest('#btn-open-settings')) UI.toggleModal(UI.Templates.ModalBase("Quản Trị", `<button class="w-full py-3 bg-blue-100 rounded-xl font-bold btn-action" data-action="installApp">Cài App</button>`, "closeModal", "Đóng"));
            if(e.target.closest('#btn-open-chat')) {
                const l = document.getElementById('chat-layer'); l.classList.remove('hidden'); l.style.display='flex'; UI.Templates.Chat(App.data.chat, App.user?.id);
            }
        });

        signInAnonymously(auth).then(() => {
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                if(App.user.role === 'Giám đốc' || App.user.role === 'Quản lý') document.getElementById('btn-open-settings').classList.remove('hidden');
                UI.switchTab('home');
                App.renderAll();
            }
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
        },
        else if(action === 'logout') { if(confirm("Thoát?")) { localStorage.removeItem('n5_modular_user'); location.reload(); } }
        else if(action === 'closeModal') UI.toggleModal(null);
        else if(action === 'sendChat') {
            const inp = document.getElementById('chat-input');
            if(inp.value.trim()) { addDoc(collection(db, `${ROOT_PATH}/chat`), { text: inp.value, senderId: App.user.id, senderName: App.user.name, time: Date.now() }); inp.value=''; }
        }
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','shipping','chat','products'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c === 'products' && snap.empty) { // Tự tạo mã nấm mẫu
                    [{name:"B2",code:"b2",group:"1"}, {name:"A1",code:"a1",group:"1"}, {name:"Chân Nấm",code:"chan_nam",group:"2"}, {name:"Snack",code:"snack",group:"3"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }
                if(c === 'employees' && snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"});
                
                if(c === 'employees') UI.renderEmployeeOptions(App.data.employees);
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
