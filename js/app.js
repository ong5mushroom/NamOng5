import { auth, db, signInAnonymously, collection, onSnapshot, addDoc, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { Home } from './modules/home.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [], materials: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        Utils.init();
        
        // --- GLOBAL CLICK HANDLER ---
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                
                // Gọi Action tương ứng từ các Module (nếu có trong Actions của Features cũ hoặc tự định nghĩa)
                // Ở V900, ta dùng cơ chế gọi trực tiếp hoặc qua switch case nếu cần
                // Tuy nhiên để đơn giản, ta xử lý các nút chung ở đây
            }

            // Xử lý nút Settings (Quản trị)
            // FIX LỖI: Dùng đúng ID 'btn-settings' khớp với index.html
            if(e.target.closest('#btn-settings')) {
                if(['Quản lý', 'Admin', 'Giám đốc'].includes(App.user?.role)) {
                    Admin.openSettings();
                } else {
                    Utils.toast("Bạn không có quyền truy cập!", "err");
                }
            }

            // Xử lý nút Chat
            if(e.target.closest('#btn-chat')) {
                const l = document.getElementById('chat-layer');
                l.classList.remove('hidden'); l.style.display = 'flex';
                document.getElementById('chat-badge').classList.add('hidden');
                Chat.render(App.data, App.user);
            }

            // Nút đóng chat
            if(e.target.dataset.action === 'closeChat') {
                document.getElementById('chat-layer').classList.add('hidden');
            }

            // Nút style toggle cho THDG
            if(e.target.dataset.action === 'toggleTH') {
                e.target.parentElement.querySelectorAll('button').forEach(b => {
                    if(b === e.target) b.classList.add('bg-green-100','text-green-700','shadow-sm');
                    else b.classList.remove('bg-green-100','text-green-700','shadow-sm');
                });
            }
        });

        // Xử lý đăng nhập
        document.getElementById('login-btn')?.addEventListener('click', App.handleLogin);

        // Tab Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { 
            UI_App.switchTab(btn);
            App.renderModule(btn.dataset.tab); 
        }));

        // Firebase Sync
        signInAnonymously(auth).then(() => {
            console.log("System Online");
            App.syncData();
        });
    },

    syncData: () => {
        ['employees','houses','harvest_logs','tasks','shipping','chat','products','materials'].forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
                const key = c==='harvest_logs'?'harvest':c;
                App.data[key] = snap.docs.map(d => ({...d.data(), _id: d.id}));
                
                // Auto Seeder
                if(c==='products' && snap.empty) App.seedProducts();
                if(c==='employees' && snap.empty) App.seedAdmin();

                // Realtime Chat Update
                if(c==='chat' && !document.getElementById('chat-layer').classList.contains('hidden')) {
                    Chat.render(App.data, App.user);
                }

                // Update Login Dropdown
                if(c==='employees') {
                    const sel = document.getElementById('login-user');
                    if(sel) sel.innerHTML = '<option value="">-- Chọn --</option>' + App.data.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
                }

                // NẾU ĐÃ ĐĂNG NHẬP -> VẼ GIAO DIỆN & HIỆN NÚT SETTINGS
                if(App.user) {
                    document.getElementById('login-overlay').classList.add('hidden');
                    document.getElementById('head-user').innerText = App.user.name;
                    document.getElementById('head-role').innerText = App.user.role;
                    
                    // FIX LỖI QUAN TRỌNG: Hiện nút settings dùng đúng ID 'btn-settings'
                    if(['Admin','Quản lý','Giám đốc'].includes(App.user.role)) {
                        document.getElementById('btn-settings').classList.remove('hidden');
                    }
                    
                    const currentTab = localStorage.getItem('n5_current_tab') || 'home';
                    App.renderModule(currentTab);
                }
            });
        });
    },

    renderModule: (tab) => {
        if(tab === 'home') Home.render(App.data, ['Giám đốc','Quản lý','Admin'].includes(App.user?.role));
        if(tab === 'sx') SX.render(App.data);
        if(tab === 'th') THDG.render(App.data, App.user);
        if(tab === 'tasks') HR.renderTasks(App.data, App.user);
        if(tab === 'team') HR.renderTeam(App.data, App.user);
    },

    handleLogin: () => {
        const id = document.getElementById('login-user').value; 
        const pin = document.getElementById('login-pin').value;
        const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
        if(emp) { 
            App.user = emp;
            localStorage.setItem('n5_modular_user', JSON.stringify(emp)); 
            location.reload(); 
        } else Utils.toast("Sai thông tin đăng nhập!", "err");
    },

    seedProducts: () => { [{name:"B2",code:"b2",group:"1"},{name:"A1",code:"a1",group:"1"}].forEach(p => addDoc(collection(db, `${ROOT_PATH}/products`), p)); },
    seedAdmin: () => { addDoc(collection(db, `${ROOT_PATH}/employees`), {id:999, name:"Admin", pin:"9999", role:"Giám đốc"}); }
};

const UI_App = {
    switchTab: (btn) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${btn.dataset.tab}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b => {
            if(b === btn) { b.classList.add('text-blue-600', '-translate-y-1'); b.classList.remove('text-slate-400'); }
            else { b.classList.remove('text-blue-600', '-translate-y-1'); b.classList.add('text-slate-400'); }
        });
        localStorage.setItem('n5_current_tab', btn.dataset.tab);
    }
};

window.onload = App.init;
