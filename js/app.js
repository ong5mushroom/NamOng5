import { auth, db, signInAnonymously, collection, onSnapshot, addDoc, ROOT_PATH } from './config.js';
import { Utils } from './utils.js';
import { Home } from './modules/home.js';
import { THDG } from './modules/thdg.js';
import { HR } from './modules/hr.js';
import { SX } from './modules/sx.js';
import { Chat } from './modules/chat.js';
import { Admin } from './modules/admin.js';

// Mảng màu sắc đẹp để random cho avatar
const AVATAR_COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], chat: [], products: [], materials: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        Utils.init();
        
        // GLOBAL CLICK HANDLER
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                // Xử lý các nút action chung nếu cần
            }

            // Xử lý chọn User ở màn hình Login (Logic mới)
            const userOpt = e.target.closest('.user-option');
            if(userOpt) {
                // Xóa chọn cũ
                document.querySelectorAll('.user-option').forEach(el => el.classList.remove('selected', 'ring-2', 'ring-blue-500'));
                // Chọn mới
                userOpt.classList.add('selected', 'ring-2', 'ring-blue-500');
                document.getElementById('login-user').value = userOpt.dataset.name;
                // Focus vào ô PIN để nhập luôn
                document.getElementById('login-pin').focus();
            }

            if(e.target.closest('#btn-settings')) {
                if(['Quản lý', 'Admin', 'Giám đốc'].includes(App.user?.role)) Admin.openSettings();
                else Utils.toast("Bạn không có quyền!", "err");
            }

            if(e.target.closest('#btn-chat')) {
                document.getElementById('chat-layer').classList.remove('hidden');
                document.getElementById('chat-layer').style.display = 'flex';
                document.getElementById('chat-badge').classList.add('hidden');
                Chat.render(App.data, App.user);
            }
            if(e.target.dataset.action === 'closeChat') document.getElementById('chat-layer').classList.add('hidden');
            
            if(e.target.dataset.action === 'toggleTH') {
                e.target.parentElement.querySelectorAll('button').forEach(b => {
                    if(b === e.target) b.classList.add('bg-green-100','text-green-700','shadow-sm');
                    else b.classList.remove('bg-green-100','text-green-700','shadow-sm');
                });
            }
        });

        document.getElementById('login-btn')?.addEventListener('click', App.handleLogin);
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { 
            UI_App.switchTab(btn);
            App.renderModule(btn.dataset.tab); 
        }));

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
                
                if(c==='products' && snap.empty) App.seedProducts();
                if(c==='employees' && snap.empty) App.seedAdmin();
                
                if(c==='chat' && !document.getElementById('chat-layer').classList.contains('hidden')) Chat.render(App.data, App.user);

                // --- RENDER LOGIN USER LIST (AVATAR MÀU SẮC) ---
                if(c==='employees') {
                    const listContainer = document.getElementById('login-user-list');
                    if(listContainer) {
                        if(App.data.employees.length === 0) {
                            listContainer.innerHTML = '<div class="col-span-4 text-center text-xs text-slate-400">Chưa có dữ liệu</div>';
                        } else {
                            listContainer.innerHTML = App.data.employees.map((e, index) => {
                                // Lấy chữ cái đầu
                                const firstLetter = e.name.charAt(0).toUpperCase();
                                // Chọn màu cố định dựa trên độ dài tên để không bị đổi màu khi reload
                                const colorClass = AVATAR_COLORS[e.name.length % AVATAR_COLORS.length];
                                
                                return `
                                <div class="user-option flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer hover:bg-slate-50" data-name="${e.name}">
                                    <div class="user-avatar ${colorClass}">${firstLetter}</div>
                                    <span class="text-[10px] font-bold text-slate-600 truncate w-full text-center">${e.name}</span>
                                </div>`;
                            }).join('');
                        }
                    }
                }

                if(App.user) {
                    document.getElementById('login-overlay').classList.add('hidden');
                    document.getElementById('head-user').innerText = App.user.name;
                    document.getElementById('head-role').innerText = App.user.role;
                    if(['Admin','Quản lý','Giám đốc'].includes(App.user.role)) document.getElementById('btn-settings').classList.remove('hidden');
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
        const id = document.getElementById('login-user').value; // Lấy từ input hidden
        const pin = document.getElementById('login-pin').value;
        
        if(!id) return Utils.toast("Vui lòng chọn nhân viên!", "err");

        const emp = App.data.employees.find(e => e.name === id && String(e.pin) == pin);
        if(emp) { 
            App.user = emp;
            localStorage.setItem('n5_modular_user', JSON.stringify(emp)); 
            location.reload(); 
        } else Utils.toast("Sai mã PIN!", "err");
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
