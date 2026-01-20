import { auth, db, ROOT_PATH, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], shipping: [], supplies: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals();
        const overlay = document.getElementById('login-overlay');
        if(overlay) overlay.style.zIndex = '9999';

        signInAnonymously(auth).then(() => {
            document.getElementById('login-status')?.innerHTML = '<span class="text-green-500">✔ Đã kết nối</span>';
            App.syncData();
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        });

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
        // Lấy dữ liệu Realtime từ Firebase
        const colls = ['employees', 'houses', 'harvest_logs', 'tasks', 'shipping', 'supplies'];
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snapshot) => {
                const key = c === 'harvest_logs' ? 'harvest' : c;
                App.data[key] = snapshot.docs.map(d => ({...d.data(), _id: d.id})).sort((a,b) => (b.time || 0) - (a.time || 0));
                
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
            const emp = App.data.employees.find(e => String(e.id) == id);
            if(emp) {
                App.user = emp;
                localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                location.reload();
            } else alert("Vui lòng chọn nhân viên!");
        },

        // --- SẢN XUẤT: KÍCH HOẠT LÔ ---
        setupHouseBatch: async () => {
            const houseId = document.getElementById('sx-house-select').value; 
            const strain = document.getElementById('sx-strain').value;
            const dateStr = document.getElementById('sx-date').value;
            const spawnQty = Number(document.getElementById('sx-spawn-qty').value);
            
            if(!houseId || !strain || !dateStr || !spawnQty) return UI.showMsg("Thiếu thông tin!", "error");

            // Công thức Mã Lô: STRAIN-DDMMYY
            const d = new Date(dateStr);
            const batchCode = `${strain.toUpperCase()}-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;

            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseId), { 
                currentBatch: batchCode, currentSpawn: spawnQty, status: 'ACTIVE', startDate: Date.now()
            });
            UI.showMsg(`✅ Đã kích hoạt lô ${batchCode}!`, "success");
            document.getElementById('sx-strain').value = '';
        },

        // --- THU HOẠCH ---
        submitTH: async () => {
            const area = document.getElementById('th-area').value;
            if(!area) return UI.showMsg("Chưa chọn nhà!", "error");
            
            const houseObj = App.data.houses.find(h => h.name === area);
            
            const types = ['b2','a1','a2','b1','d1','abf','b2f','ht'];
            let details = {}, total = 0;
            types.forEach(code => {
                const val = Number(document.getElementById(`th-${code}`).value) || 0;
                if (val > 0) { details[code] = val; total += val; }
            });

            if (total <= 0) return UI.showMsg("Chưa nhập số lượng!", "error");

            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), {
                area: area, batchCode: houseObj?.currentBatch || 'N/A', details: details, total: total,
                note: document.getElementById('th-note').value, user: App.user.name, time: Date.now()
            });

            types.forEach(code => document.getElementById(`th-${code}`).value = '');
            document.getElementById('th-note').value = '';
            document.getElementById('th-display-total').innerText = '0.0';
            UI.showMsg(`✅ Đã lưu phiếu ${total}kg!`, "success");
        },

        // --- KHO ---
        submitStockCheck: async () => {
            const actual = Number(document.getElementById('stock-actual-mushroom').value);
            const note = document.getElementById('stock-note-mushroom').value;
            const theory = 50.0; // Số máy tính ra (hiện fix để demo)
            
            if(!actual && actual !== 0) return UI.showMsg("Chưa nhập số thực tế!", "error");
            if(Math.abs(actual - theory) > 0.5 && !note) return UI.showMsg("Lệch quá lớn. Vui lòng nhập Ghi chú!", "error");

            await addDoc(collection(db, `${ROOT_PATH}/stock_checks`), {
                type: 'MUSHROOM', theory, actual, variance: actual - theory, note, user: App.user.name, time: Date.now()
            });
            UI.showMsg("✅ Đã chốt kho!", "success");
        },

        openSupplyImport: () => {
            const name = prompt("Tên vật tư mua mới (VD: Cồn 90):");
            const unit = prompt("Đơn vị tính (VD: Lít):");
            const qty = Number(prompt("Số lượng nhập:"));
            if(name && qty) {
                 addDoc(collection(db, `${ROOT_PATH}/supplies`), { name, unit, stock: qty, lastUpdated: Date.now() });
                 UI.showMsg("✅ Đã nhập vật tư!", "success");
            }
        },

        openSupplyCheck: () => {
             alert("Chức năng kiểm kê ngược (Tự động trừ tiêu hao) đang được kết nối với API...");
        },

        // --- XUẤT BÁN & IN ---
        submitShip: async () => {
            const cust = document.getElementById('ship-cust').value;
            const type = document.getElementById('ship-type').value;
            const qty = Number(document.getElementById('ship-qty').value);
            if(!cust || !qty) return UI.showMsg("Thiếu thông tin đơn hàng!", "error");

            const ref = await addDoc(collection(db, `${ROOT_PATH}/shipping`), {
                customer: cust, type, qty, user: App.user.name, time: Date.now()
            });
            document.getElementById('ship-cust').value = '';
            document.getElementById('ship-qty').value = '';
            UI.showMsg("✅ Đã tạo đơn & Đang in...", "success");
            App.actions.printInvoice(ref.id);
        },

        printInvoice: (shipId) => {
            const order = App.data.shipping.find(s => s._id === shipId);
            if(!order) return;
            const w = window.open('', '', 'height=600,width=400');
            w.document.write(`
                <html><head><title>Hóa Đơn</title></head>
                <body style="font-family:monospace;padding:20px;max-width:350px;">
                    <h2 style="text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;">NẤM ÔNG 5</h2>
                    <p>Ngày: ${new Date(order.time).toLocaleString('vi-VN')}</p>
                    <p>Khách hàng: <b>${order.customer}</b></p>
                    <hr style="border-top:1px dotted #000;">
                    <div style="display:flex;justify-content:space-between;margin-top:10px;">
                        <span>${order.type}</span><span>${order.qty} kg</span>
                    </div>
                    <hr style="border-top:1px dotted #000;">
                    <h3 style="display:flex;justify-content:space-between;">
                        <span>TỔNG CỘNG:</span><span>${order.qty} Kg</span>
                    </h3>
                    <p style="text-align:center;font-style:italic;margin-top:20px;">Cảm ơn quý khách!</p>
                </body></html>
            `);
            w.document.close(); w.focus(); w.print();
        },

        submitTask: async (taskId) => {
            const qty = prompt("Số lượng làm được (VD: 5 bóng đèn, 100 bịch):");
            if(!qty) return;
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, taskId), {
                status: 'done', completedBy: App.user.name, completedAt: Date.now(), 
                actualQty: qty, resultNote: prompt("Ghi chú kết quả công việc:")
            });
            UI.showMsg("✅ Đã báo cáo xong việc!", "success");
        }
    }
};
window.onload = App.init;
