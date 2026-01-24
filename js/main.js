import { auth, db, signInAnonymously, collection, onSnapshot, doc, getDoc, addDoc, ROOT_PATH } from './config.js';
import { UI } from './core.js';
import { Actions } from './features.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [], materials: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals();
        
        // --- 1. GLOBAL CLICK HANDLER (DUY NHẤT) ---
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const actionName = btn.dataset.action;
                const payload = btn.dataset.payload;
                
                // Tìm action trong Features.js
                if(Actions[actionName]) {
                    Actions[actionName](App.user, App.data || payload); // Truyền User và Data vào để xử lý
                } else {
                    console.warn(`Action "${actionName}" chưa được định nghĩa trong features.js`);
                }
            }
            
            // Xử lý nút Toggle riêng lẻ (style)
            if(e.target.dataset.action === 'toggleTH') {
                const mode = e.target.dataset.payload;
                e.target.parentElement.querySelectorAll('button').forEach(b => {
                    if(b===e.target) b.classList.add('bg-white','text-green-600','shadow-sm');
                    else b.classList.remove('bg-white','text-green-600','shadow-sm');
                });
            }
            
            // Xử lý mở Settings & Chat (UI Only)
            if(e.target.closest('#btn-open-settings')) {
                if(['Quản lý', 'Admin', 'Giám đốc'].includes(App.user.role)) UI.renderSettingsModal(App.data.employees); // Cần hàm này trong core.js nhưng ta dùng template cơ bản
                UI.toggleModal(UI.Templates.ModalBase("Quản Trị", `<div class="space-y-2"><h4 class="text-xs font-bold text-slate-400 uppercase">Báo cáo</h4><div class="grid grid-cols-2 gap-2"><button class="p-2 bg-blue-50 text-blue-600 font-bold rounded text-xs btn-action" data-action="adminExport" data-payload="day">Theo Ngày</button><button class="p-2 bg-blue-50 text-blue-600 font-bold rounded text-xs btn-action" data-action="adminExport" data-payload="month">Theo Tháng</button></div><h4 class="text-xs font-bold text-slate-400 uppercase mt-2">Nhân sự</h4><button class="w-full p-3 bg-slate-100 font-bold rounded text-xs btn-action" data-action="openAddStaff">Quản lý Nhân viên</button></div>`, "closeModal", "Đóng"));
            }
            if(e.target.closest('#btn-open-chat')) {
                const l = document.getElementById('chat-layer'); l.classList.remove('hidden'); l.style.display='flex';
                document.getElementById('chat-badge').classList.add('hidden');
                if(App.data.chat) UI.Templates.Chat(App.data.chat, App.user?.id);
            }
        });

        // --- 2. AUTH & SYNC ---
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
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
            UI.switchTab(btn.dataset.tab);
            App.renderAll();
        }));
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','shipping','chat','products','materials'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                if(c === 'products' && snap.empty) { 
                    [{name:"B2",code:"b2",group:"1"},{name:"A1",code:"a1",group:"1"},{name:"Chân Nấm",code:"chan_nam",group:"2"},{name:"Snack",code:"snack",group:"3"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }
                if(c === 'employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"});
                    UI.renderEmployeeOptions(App.data.employees);
                }
                if(c === 'chat' && !document.getElementById('chat-layer').classList.contains('hidden')) {
                    App.data.chat.sort((a,b) => (a.time||0)-(b.time||0));
                    UI.Templates.Chat(App.data.chat, App.user?.id);
                }
                if(App.user) App.renderAll();
            });
        });
    },

    renderAll: () => {
        const tab = localStorage.getItem('n5_current_tab') || 'home';
        if(tab==='home') document.getElementById('view-home').innerHTML = UI.Views.Home(App.data, ['Giám đốc','Quản lý'].includes(App.user.role));
        if(tab==='sx') document.getElementById('view-sx').innerHTML = UI.Views.Production(App.data);
        if(tab==='th') document.getElementById('view-th').innerHTML = UI.Views.Warehouse(App.data);
        if(tab==='tasks') document.getElementById('view-tasks').innerHTML = UI.Views.HR(App.data, App.user);
        if(tab==='team') document.getElementById('view-team').innerHTML = UI.Views.Team(App.user, App.data);
    }
};

window.onload = App.init;
