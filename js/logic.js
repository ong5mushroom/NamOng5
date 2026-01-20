import { auth, db, ROOT_PATH, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const App = {
    // Thêm mảng employees vào data
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

            // Nếu đã đăng nhập trước đó -> Vào thẳng
            if(App.user) {
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                App.ui.switchTab('home');
            }
        }).catch(err => {
            alert("Lỗi kết nối: " + err.message);
        });

        // Xử lý sự kiện click
        document.body.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) await App.actions[action](payload);
            }
        });

        // Chuyển tab
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => App.ui.switchTab(btn.dataset.tab)));
        
        // Nút Đăng nhập
        document.getElementById('login-btn')?.addEventListener('click', App.actions.login);
    },

    syncData: () => {
        const colls = ['employees', 'houses', 'harvest_logs', 'tasks', 'shipping', 'supplies'];
        
        colls.forEach(c => {
            onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snapshot) => {
                // Mapping dữ liệu
                const key = c === 'harvest_logs' ? 'harvest' : c;
                App.data[key] = snapshot.docs.map(d => ({...d.data(), _id: d.id})).sort((a,b) => (b.time || 0) - (a.time || 0));
                
                // [QUAN TRỌNG] Nếu tải xong nhân viên -> Hiển thị lên ô chọn ngay
                if(c === 'employees') {
                    UI.renderEmployeeOptions(App.data.employees);
                }

                // Cập nhật giao diện hiện tại
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
            const pin = document.getElementById('login-pin').value; // Lấy mã PIN

            if (!id) return alert("Vui lòng chọn nhân viên!");
            if (!pin) return alert("Vui lòng nhập mã PIN!");

            // Tìm nhân viên khớp ID và PIN
            const emp = App.data.employees.find(e => String(e.id) == id && String(e.pin) == pin);
            
            if(emp) {
                App.user = emp;
                localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                
                // Cập nhật UI ngay lập tức
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = emp.name;
                document.getElementById('head-role').innerText = emp.role;
                App.ui.switchTab('home');
            } else {
                alert("Sai mã PIN! Vui lòng thử lại.");
                document.getElementById('login-pin').value = '';
            }
        },

        logout: () => {
            if(confirm('Đăng xuất?')) {
                localStorage.removeItem('n5_modular_user');
                location.reload();
            }
        },

        // --- CÁC HÀM XỬ LÝ KHÁC (GIỮ NGUYÊN) ---
        
        setupHouseBatch: async () => {
            const houseId = document.getElementById('sx-house-select').value; 
            const strain = document.getElementById('sx-strain').value;
            const dateStr = document.getElementById('sx-date').value;
            const spawnQty = Number(document.getElementById('sx-spawn-qty').value);
            
            if(!houseId || !strain || !dateStr || !spawnQty) return UI.showMsg("Thiếu thông tin!", "error");

            const d = new Date(dateStr);
            const batchCode = `${strain.toUpperCase()}-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;

            await updateDoc(doc(db, `${ROOT_PATH}/houses`, houseId), { 
                currentBatch: batchCode, currentSpawn: spawnQty, status: 'ACTIVE', startDate: Date.now()
            });
            UI.showMsg(`✅ Đã kích hoạt lô ${batchCode}!`, "success");
            document.getElementById('sx-strain').value = '';
        },

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

        submitStockCheck: async () => {
            const actual = Number(document.getElementById('stock-actual-mushroom').value);
            const note = document.getElementById('stock-note-mushroom').value;
            const theory = 50.0;
            
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
             alert("Tính năng đang hoàn thiện kết nối API...");
        },

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
            w.document.write(`<html><body style="font-family:monospace;padding:20px"><h2 style="text-align:center">NẤM ÔNG 5</h2><p>Khách: ${order.customer}</p><p>Loại: ${order.type} - ${order.qty}kg</p><hr><h3>TỔNG: ${order.qty} KG</h3></body></html>`);
            w.document.close(); w.focus(); w.print();
        },

        submitTask: async (taskId) => {
            const qty = prompt("Số lượng làm được:");
            if(!qty) return;
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, taskId), {
                status: 'done', completedBy: App.user.name, completedAt: Date.now(), 
                actualQty: qty, resultNote: prompt("Ghi chú:")
            });
            UI.showMsg("✅ Đã báo cáo xong!", "success");
        }
    }
};
window.onload = App.init;
