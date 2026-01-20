// --- FILE: js/logic.js ---

import { auth, db, ROOT_PATH, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

// --- PHẦN QUAN TRỌNG: CÁC HÀM LOGIC ---
const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], supplies: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals();
        const overlay = document.getElementById('login-overlay');
        if(overlay) overlay.style.zIndex = '9999';

        signInAnonymously(auth).then(() => {
            const statusEl = document.getElementById('login-status');
            if(statusEl) statusEl.innerHTML = '<span class="text-green-500">✔ Đã kết nối Server</span>';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        }).catch(err => { alert("Lỗi kết nối: " + err.message); });

        document.body.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) await App.actions[action](payload);
            }
        });

        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
        document.getElementById('login-btn')?.addEventListener('click', App.actions.login);
    },

    syncData: () => {
        const colls = ['employees', 'houses', 'harvest_logs', 'tasks', 'shipping', 'supplies'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snapshot) => {
                const key = c === 'harvest_logs' ? 'harvest' : c;
                App.data[key] = snapshot.docs.map(d => ({...d.data(), _id: d.id})).sort((a,b) => (b.time || 0) - (a.time || 0));
                
                if(c === 'employees') UI.renderEmployeeOptions(App.data.employees);
                
                const currentTab = localStorage.getItem('n5_current_tab') || 'home';
                App.ui.refresh(currentTab);
            });
        });
    },

    ui: {
        switchTab: (tab) => { UI.switchTab(tab); App.ui.refresh(tab); },
        refresh: (tab) => {
            if(tab === 'home') UI.renderHome(App.data.houses, App.data.harvest);
            if(tab === 'sx') UI.renderSX(App.data.houses);
            if(tab === 'th') UI.renderTH(App.data.houses, App.data.harvest);
            if(tab === 'stock') UI.renderStock({}, App.data.supplies);
            if(tab === 'tasks') UI.renderTasksAndShip(App.data.tasks, App.data.shipping);
        }
    },

    actions: {
        login: () => {
            const id = document.getElementById('login-user').value;
            const pin = document.getElementById('login-pin').value;
            if (!id) return alert("Vui lòng chọn nhân viên!");
            const emp = App.data.employees.find(e => String(e.id) == id && String(e.pin) == pin);
            if(emp) {
                App.user = emp;
                localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = emp.name;
                document.getElementById('head-role').innerText = emp.role;
                App.ui.switchTab('home');
            } else { alert("Sai mã PIN!"); }
        },
        
        logout: () => { if(confirm('Đăng xuất?')) { localStorage.removeItem('n5_modular_user'); location.reload(); } },
        
        setupHouseBatch: async () => {
            const h = document.getElementById('sx-house-select').value; 
            const s = document.getElementById('sx-strain').value;
            const dStr = document.getElementById('sx-date').value;
            const q = Number(document.getElementById('sx-spawn-qty').value);
            if(!h || !s || !dStr || !q) return UI.showMsg("Thiếu thông tin!", "error");
            const d = new Date(dStr);
            const bc = `${s.toUpperCase()}-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
            await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { currentBatch: bc, currentSpawn: q, status: 'ACTIVE', startDate: Date.now() });
            UI.showMsg(`✅ Kích hoạt lô ${bc}!`, "success");
        },

        submitTH: async () => {
            const area = document.getElementById('th-area').value;
            if(!area) return UI.showMsg("Chưa chọn nhà!", "error");
            const houseObj = App.data.houses.find(h => h.name === area);
            const types = ['b2','a1','a2','b1','d1','abf','b2f','ht'];
            let details = {}, total = 0;
            types.forEach(code => { const val = Number(document.getElementById(`th-${code}`).value)||0; if (val>0) { details[code]=val; total+=val; } });
            if (total<=0) return UI.showMsg("Chưa nhập số!", "error");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area: area, batchCode: houseObj?.currentBatch||'N/A', details: details, total: total, note: document.getElementById('th-note').value, user: App.user.name, time: Date.now() });
            types.forEach(code => document.getElementById(`th-${code}`).value='');
            document.getElementById('th-note').value=''; document.getElementById('th-display-total').innerText='0.0';
            UI.showMsg(`✅ Đã lưu ${total}kg!`, "success");
        },

        submitStockCheck: async () => {
            const act = Number(document.getElementById('stock-actual-mushroom').value);
            const note = document.getElementById('stock-note-mushroom').value;
            if(!act && act!==0) return UI.showMsg("Chưa nhập số thực!", "error");
            await addDoc(collection(db, `${ROOT_PATH}/stock_checks`), { type: 'MUSHROOM', actual: act, note, user: App.user.name, time: Date.now() });
            UI.showMsg("✅ Đã chốt kho!", "success");
        },

        openSupplyImport: () => {
            const n = prompt("Tên vật tư:"); const u = prompt("Đơn vị:"); const q = Number(prompt("Số lượng:"));
            if(n && q) { addDoc(collection(db, `${ROOT_PATH}/supplies`), { name: n, unit: u, stock: q }); UI.showMsg("✅ Đã nhập!", "success"); }
        },
        
        openSupplyCheck: () => alert("Tính năng đang phát triển..."),

        submitShip: async () => {
            const c = document.getElementById('ship-cust').value; const t = document.getElementById('ship-type').value; const q = Number(document.getElementById('ship-qty').value);
            if(!c || !q) return UI.showMsg("Thiếu tin!", "error");
            const ref = await addDoc(collection(db, `${ROOT_PATH}/shipping`), { customer: c, type: t, qty: q, user: App.user.name, time: Date.now() });
            UI.showMsg("✅ Đã tạo đơn!", "success"); App.actions.printInvoice(ref.id);
        },

        printInvoice: (id) => {
            const o = App.data.shipping.find(s => s._id === id); if(!o) return;
            const w = window.open('', '', 'height=600,width=400');
            w.document.write(`<html><body style="font-family:monospace;padding:20px"><h2 style="text-align:center">NẤM ÔNG 5</h2><p>Khách: ${o.customer}</p><p>${o.type} - ${o.qty}kg</p><hr><h3>TỔNG: ${o.qty} KG</h3></body></html>`);
            w.document.close(); w.focus(); w.print();
        },

        submitTask: async (id) => {
            const q = prompt("Số lượng:"); if(!q) return;
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'done', completedBy: App.user.name, actualQty: q });
            UI.showMsg("✅ Xong!", "success");
        }
    }
};

// --- QUAN TRỌNG: ĐƯA APP RA GLOBAL ĐỂ HTML GỌI ĐƯỢC ---
window.App = App;
window.onload = App.init;
