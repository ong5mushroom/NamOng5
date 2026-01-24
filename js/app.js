import { auth, db, signInAnonymously, collection, onSnapshot, addDoc, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { Home } from './modules/home.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
// Import thêm SX, Chat, Admin khi bạn tạo xong file

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], products: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        Utils.init();
        
        // 1. Xử lý Login
        document.getElementById('login-btn').addEventListener('click', () => {
            const id = document.getElementById('login-user').value; const pin = document.getElementById('login-pin').value;
            const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
            if(emp) { App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp)); location.reload(); } 
            else Utils.toast("Sai PIN!");
        });

        // 2. Chuyển Tab
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // UI Tab
                document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
                document.getElementById(`view-${btn.dataset.tab}`).classList.remove('hidden');
                document.querySelectorAll('.nav-btn').forEach(b => {
                    if(b === btn) { b.classList.add('text-blue-600', '-translate-y-1'); b.classList.remove('text-slate-400'); }
                    else { b.classList.remove('text-blue-600', '-translate-y-1'); b.classList.add('text-slate-400'); }
                });
                
                // Gọi Render Module tương ứng
                App.renderModule(btn.dataset.tab);
            });
        });

        // 3. Kết nối Firebase
        signInAnonymously(auth).then(() => {
            console.log("Connected");
            App.syncData();
        });
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','products'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                // Auto Seed Products
                if(c === 'products' && snap.empty) { 
                    [{name:"B2",code:"b2",group:"1"},{name:"A1",code:"a1",group:"1"},{name:"Chân Nấm",code:"chan_nam",group:"2"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p));
                }
                
                // Load danh sách NV vào ô login
                if(c === 'employees') {
                    if(snap.empty) addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"});
                    const sel = document.getElementById('login-user');
                    sel.innerHTML = '<option value="">-- Chọn --</option>' + App.data.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
                }

                // Nếu đã login, vẽ lại giao diện
                if(App.user) {
                    document.getElementById('login-overlay').classList.add('hidden');
                    document.getElementById('head-user').innerText = App.user.name;
                    document.getElementById('head-role').innerText = App.user.role;
                    App.renderModule('home'); // Mặc định về home
                }
            });
        });
    },

    renderModule: (tab) => {
        if(tab === 'home') Home.render(App.data);
        if(tab === 'th') THDG.render(App.data, App.user);
        if(tab === 'tasks') HR.renderTasks(App.data, App.user);
        if(tab === 'team') HR.renderTeam(App.data, App.user);
        // if(tab === 'sx') SX.render(...)
    }
};

window.onload = App.init;
