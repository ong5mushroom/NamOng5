import { auth, db, ROOT_PATH, signInAnonymously, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from './config.js';
import { UI } from './ui.js';

const App = {
    data: { employees: [], houses: [], harvest: [], tasks: [], production: [], attendance: [], chat: [], hr_requests: [], shipping: [] },
    user: JSON.parse(localStorage.getItem('n5_modular_user')) || null,

    init: () => {
        UI.initModals(); 
        signInAnonymously(auth).then(() => {
            const statusEl = document.getElementById('login-status');
            if(statusEl) statusEl.innerHTML = '<span class="text-green-500">✔ Đã kết nối</span>';
            
            // 1. Tải nhân viên ngay để đăng nhập
            App.syncEmployees();

            // 2. Nếu đã có session cũ (F5 lại), tự động vào và tải dữ liệu
            if(App.user) {
                App.syncData();
                App.ui.switchTab('home');
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = App.user.name;
                document.getElementById('head-role').innerText = App.user.role;
                const adminTools = document.getElementById('admin-tools');
                if(['Giám đốc', 'Quản lý', 'Kế toán'].includes(App.user.role) && adminTools) adminTools.classList.remove('hidden');
            }
        }).catch(err => console.error("Lỗi kết nối:", err));
        
        // --- SỰ KIỆN CLICK TOÀN CỤC ---
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-action');
            if(btn) {
                const action = btn.dataset.action;
                const payload = btn.dataset.payload;
                if(App.actions[action]) App.actions[action](payload);
            }
            const nav = e.target.closest('.nav-btn');
            if(nav && nav.dataset.tab) App.ui.switchTab(nav.dataset.tab);
            
            if(e.target.id === 'login-btn') App.auth.login();
            
            if(e.target.closest('#btn-open-settings')) {
                UI.toggleModal('settings-modal', true);
                if(['Giám đốc','Quản lý'].includes(App.user?.role)) UI.renderApproveList(App.data.hr_requests);
            }
            
            if(e.target.closest('#btn-open-chat')) {
                const layer = document.getElementById('chat-layer');
                layer.classList.remove('hidden'); layer.style.display = 'flex';
                App.ui.renderChat();
            }
        });

        // Enter để gửi chat
        document.body.addEventListener('keyup', (e) => {
            if(e.key === 'Enter' && e.target.id === 'chat-input-field') App.actions.sendChat();
        });
    },

    // Hàm tải nhân viên (Chạy trước tiên)
    syncEmployees: () => {
        onSnapshot(collection(db, `${ROOT_PATH}/employees`), s => {
            App.data.employees = s.docs.map(d => ({...d.data(), _id: d.id}));
            if(!App.user) UI.renderEmployeeOptions(App.data.employees); 
        });
    },

    // Hàm tải dữ liệu chính (Chỉ chạy sau khi Login)
    syncData: () => {
        const mapD = s => s.docs.map(d => ({...d.data(), _id: d.id}));
        const cols = ['chat', 'hr_requests', 'houses', 'harvest_logs', 'tasks', 'production_logs', 'attendance_logs', 'shipping_logs'];
        
        cols.forEach(col => {
            onSnapshot(collection(db, `${ROOT_PATH}/${col}`), s => {
                const data = mapD(s);
                
                // --- HỆ THỐNG THÔNG BÁO (Notification) ---
                s.docChanges().forEach((change) => {
                    if (change.type === "added" && App.user) {
                        const newItem = change.doc.data();
                        // Chỉ báo nếu tin mới tạo trong vòng 30 giây
                        const isRecent = (Date.now() - (newItem.time || 0)) < 30000;
                        
                        if(isRecent) {
                            // Báo tin nhắn mới
                            if(col === 'chat' && String(newItem.senderId) !== String(App.user.id)) {
                                UI.showMsg(`💬 ${newItem.senderName}: ${newItem.text}`, 'notify');
                                // Nếu đang mở chat thì vẽ lại ngay
                                if(!document.getElementById('chat-layer').classList.contains('hidden')) App.ui.renderChat();
                            }
                            // Báo việc mới
                            if(col === 'tasks' && String(newItem.assignee) === String(App.user.id)) {
                                UI.showMsg(`📋 Việc mới: ${newItem.title}`, 'notify');
                            }
                        }
                    }
                });

                // Cập nhật dữ liệu vào App
                if(col==='harvest_logs') App.data.harvest = data;
                else if(col==='production_logs') App.data.production = data;
                else if(col==='attendance_logs') App.data.attendance = data;
                else if(col==='shipping_logs') App.data.shipping = data;
                else App.data[col] = data;

                // Refresh giao diện nếu đang đăng nhập
                if(App.user) {
                    if(col === 'chat' && !document.getElementById('chat-layer').classList.contains('hidden')) App.ui.renderChat();
                    if(col === 'hr_requests' && document.getElementById('approval-list')) UI.renderApproveList(App.data.hr_requests);
                    App.ui.refresh();
                }
            });
        });
    },

    auth: {
        login: () => {
            const id = document.getElementById('login-user').value;
            const pin = document.getElementById('login-pin').value.trim();
            const emp = App.data.employees.find(e => String(e.id) === id && String(e.pin) === pin);
            if(emp) {
                App.user = emp; localStorage.setItem('n5_modular_user', JSON.stringify(emp));
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('head-user').innerText = emp.name;
                document.getElementById('head-role').innerText = emp.role;
                const adminTools = document.getElementById('admin-tools');
                if(['Giám đốc', 'Quản lý', 'Kế toán'].includes(emp.role) && adminTools) adminTools.classList.remove('hidden');
                
                // QUAN TRỌNG: Kích hoạt tải dữ liệu sau khi đăng nhập thành công
                App.syncData();
                App.ui.switchTab('home');
            } else UI.showMsg("Sai mã PIN!");
        }
    },

    ui: {
        switchTab: (id) => {
            const u = App.user;
            const isGenAdmin = ['Giám đốc', 'Quản lý', 'Kế toán'].includes(u.role);
            
            // Phân quyền
            if (!isGenAdmin) {
                if (id === 'th' && u.team !== 'Tổ Thu Hoạch') return UI.showMsg("Chỉ dành cho Tổ Thu Hoạch!");
                if (id === 'sx' && u.team !== 'Tổ Sản Xuất') return UI.showMsg("Chỉ dành cho Tổ Sản Xuất!");
            }

            // Ẩn tất cả tab cũ
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            
            // Hiện tab mới
            const view = document.getElementById('view-'+id);
            const btn = document.querySelector(`.nav-btn[data-tab="${id}"]`);
            if(view) view.classList.remove('hidden');
            if(btn) btn.classList.add('active');
            
            // Render dữ liệu
            if(id === 'home') UI.renderHome(App.data.houses, App.data.harvest, App.data.production, App.data.employees);
            if(id === 'tasks') UI.renderTasks(App.data.tasks, App.data.employees, App.data.houses, u);
            if(id === 'sx') UI.renderSX(App.data.houses, App.data.production);
            if(id === 'th') UI.renderTH(App.data.houses, App.data.harvest, App.data.shipping);
            if(id === 'team') UI.renderTeam(App.data.employees, u);
        },
        refresh: () => { 
            const activeTab = document.querySelector('.nav-btn.active')?.dataset.tab; 
            if(activeTab) App.ui.switchTab(activeTab); 
        },
        renderChat: () => { 
            UI.renderChat(App.data.chat, App.user.id); 
        }
    },

    actions: {
        logout: () => { localStorage.removeItem('n5_modular_user'); location.reload(); },
        closeModal: (id) => UI.toggleModal(id, false),
        openModal: (id) => UI.toggleModal('modal-'+id, true),
        closeChat: () => document.getElementById('chat-layer').classList.add('hidden'),
        
        sendChat: async () => {
            const input = document.getElementById('chat-input-field'); 
            const txt = input.value.trim();
            if(!txt) return; 
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: txt, senderId: App.user.id, senderName: App.user.name, time: Date.now() 
            });
            input.value = '';
        },
        
        checkIn: async (shift) => {
            const today = new Date().toISOString().split('T')[0];
            await updateDoc(doc(db, `${ROOT_PATH}/employees`, App.user._id), { lastLogin: today });
            await addDoc(collection(db, `${ROOT_PATH}/attendance_logs`), { 
                date: today, time: Date.now(), user: App.user.name, uid: App.user.id, shift, team: App.user.team 
            });
            await App.actions.modScore(`${App.user._id}|2`); 
            UI.showMsg(`Đã điểm danh ${shift}!`);
        },

        // --- LOGIC SX KHO TỔNG & KHO LẺ ---
        submitSX: async (payloadAction) => {
            const house = document.getElementById('sx-house-id').value;
            const type = document.getElementById('sx-type').value;
            const qty = Number(document.getElementById('sx-qty').value);
            const batch = document.getElementById('sx-batch').value;
            const date = document.getElementById('sx-date').value;
            
            if(!house || !qty) return UI.showMsg("Thiếu thông tin!");

            if(payloadAction === 'NHAP_MOI') {
                await addDoc(collection(db, `${ROOT_PATH}/production_logs`), { 
                    action: 'NHẬP', house, type, qty, batch, date, user: App.user.name, time: Date.now() 
                }); 
                UI.showMsg("Đã Nhập Kho Tổng!");
            } 
            else if(payloadAction === 'LAY_TU_A') {
                // Nhập vào kho lẻ
                await addDoc(collection(db, `${ROOT_PATH}/production_logs`), { 
                    action: 'NHẬP', house, type, qty, batch: `Nhận từ A (${batch})`, date, user: App.user.name, time: Date.now() 
                });
                // Trừ từ kho A
                await addDoc(collection(db, `${ROOT_PATH}/production_logs`), { 
                    action: 'XUẤT', house: 'Nhà A', type, qty, batch: `Chuyển cho ${house}`, date, user: 'SYSTEM', time: Date.now() 
                }); 
                UI.showMsg(`Đã chuyển ${qty} túi!`);
            } 
            else if(payloadAction === 'HUY') {
                await addDoc(collection(db, `${ROOT_PATH}/production_logs`), { 
                    action: 'HỦY', house, type, qty, batch: `Dọn/Hủy (${batch})`, date, user: App.user.name, time: Date.now() 
                }); 
                UI.showMsg("Đã Dọn vụ/Hủy!");
            }
        },

        submitTH: async () => {
            const area = document.getElementById('th-area').value;
            const note = document.getElementById('th-note').value;
            const ids = ['b2','a1','a2','b1','chan','d1','a1f','a2f','b2f','ht']; 
            let d = {}, total = 0;
            ids.forEach(k => { 
                const val = Number(document.getElementById('th-'+k).value)||0; 
                if(val>0){ d[k]=val; total+=val; } 
            });
            
            if(total<=0) return UI.showMsg("Nhập số lượng!");
            
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { 
                area, details: d, total, note, user: App.user.name, time: Date.now() 
            });
            
            ids.forEach(k => document.getElementById('th-'+k).value=''); 
            document.getElementById('th-note').value='';
            UI.showMsg(`Đã lưu ${total}kg!`); 
            await App.actions.modScore(`${App.user._id}|10`);
        },

        submitShip: async () => {
            const cust = document.getElementById('ship-cust').value;
            const qty = document.getElementById('ship-qty').value;
            const type = document.getElementById('ship-type').value;
            const note = document.getElementById('ship-note').value;
            
            if(!cust || !qty) return UI.showMsg("Thiếu tin xuất!");
            
            await addDoc(collection(db, `${ROOT_PATH}/shipping_logs`), { 
                customer: cust, qty, type, note, user: App.user.name, time: Date.now() 
            });
            
            document.getElementById('ship-qty').value=''; 
            document.getElementById('ship-note').value='';
            UI.showMsg("Đã xuất kho!");
        },

        // --- CÁC HÀM KHÁC ---
        createTask: async () => {
            const title = document.getElementById('task-title').value;
            const houses = Array.from(document.querySelectorAll('input[name="h-chk"]:checked')).map(c=>c.value);
            const users = Array.from(document.querySelectorAll('input[name="u-chk"]:checked')).map(c=>c.value);
            
            if(!title || !houses.length || !users.length) return UI.showMsg("Thiếu thông tin!");
            
            for(let h of houses) { 
                for(let u of users) { 
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), { 
                        title, houseId: h, assignee: u, status: 'pending', time: Date.now(), assigner: App.user.name 
                    }); 
                }
            }
            UI.showMsg("Đã giao việc!");
        },
        
        completeTask: async (id) => { 
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'completed', finishTime: Date.now() }); 
            UI.showMsg("Đã xong!"); 
        },
        
        delTask: async (id) => { 
            if(confirm("Xóa việc này?")) await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id)); 
        },
        
        addEmployee: async () => {
            const n = document.getElementById('new-emp-name').value; 
            const id = document.getElementById('new-emp-id').value; 
            const p = document.getElementById('new-emp-pin').value;
            
            if(!n || !id || !p) return UI.showMsg("Thiếu thông tin!");
            
            await addDoc(collection(db, `${ROOT_PATH}/employees`), { 
                id, name: n, pin: p, 
                role: document.getElementById('new-emp-role').value, 
                team: document.getElementById('new-emp-team').value, 
                score: 0 
            });
            UI.toggleModal('modal-addStaff', false); 
            UI.showMsg("Đã thêm nhân sự!");
        },
        
        modScore: async (payload) => { 
            const [uid, val] = payload.split('|'); 
            const e = App.data.employees.find(x => x._id === uid); 
            if(e) await updateDoc(doc(db, `${ROOT_PATH}/employees`, uid), { score: (Number(e.score)||0) + Number(val) }); 
        },
        
        delEmp: async (uid) => { 
            if(confirm("Xóa nhân sự này?")) await deleteDoc(doc(db, `${ROOT_PATH}/employees`, uid)); 
        },
        
        submitHR: async (type) => {
            const c = type==='LEAVE' ? 
                (document.getElementById('leave-date').value + '-' + document.getElementById('leave-reason').value) :
                document.getElementById('pur-item').value;
                
            await addDoc(collection(db, `${ROOT_PATH}/hr_requests`), { 
                type, content: c, requester: App.user.name, status: 'pending', time: Date.now() 
            });
            UI.showMsg("Đã gửi đơn!"); 
            UI.toggleModal(type==='LEAVE'?'modal-leave':'modal-buy', false);
        },
        
        decideRequest: async (payload) => { 
            const [rid, decision] = payload.split('|'); 
            await updateDoc(doc(db, `${ROOT_PATH}/hr_requests`, rid), { status: decision }); 
            UI.showMsg(decision === 'approved' ? "Đã duyệt!" : "Đã từ chối!"); 
        },
        
        resetLeaderboard: async () => { 
            if(confirm("⚠️ Xóa toàn bộ điểm thi đua?")) { 
                App.data.employees.forEach(e => updateDoc(doc(db, `${ROOT_PATH}/employees`, e._id), { score: 0 })); 
                UI.showMsg("Đã Reset điểm!"); 
            }
        },
        
        exportReport: (type) => {
             let csv = "";
             if(type === 'ALL') {
                 csv += "--- SẢN XUẤT ---\nNGAY;NHA;LOAI;SL;LO;HANH_DONG\n";
                 App.data.production.forEach(l => csv+=`${l.date};${l.house};${l.type};${l.qty};${l.batch};${l.action}\n`);
                 csv += "\n--- THU HOẠCH ---\nNGAY;NHA;KG;GHI_CHU;NV\n";
                 App.data.harvest.forEach(l => csv+=`${new Date(l.time).toLocaleDateString()};${l.area};${l.total};${l.note||''};${l.user}\n`);
                 csv += "\n--- XUẤT HÀNG ---\nNGAY;KHACH;LOAI;KG;GHI_CHU;NV\n";
                 App.data.shipping.forEach(l => csv+=`${new Date(l.time).toLocaleDateString()};${l.customer};${l.type};${l.qty};${l.note||''};${l.user}\n`);
             } else { 
                 csv += "TEN;CHUC_VU;TO;DIEM_THI_DUA\n"; 
                 App.data.employees.forEach(e => csv+=`${e.name};${e.role};${e.team};${e.score}\n`); 
             }
             App.helpers.downloadCSV(csv, `BaoCao_${type}.csv`);
        },
        
        exportCSVByHouse: (h) => { 
            let csv = "NGAY;NHA;KG;GHI_CHU;NV\n"; 
            App.data.harvest.filter(x=>x.area===h).forEach(l=>{ 
                csv+=`${new Date(l.time).toLocaleDateString()};${l.area};${l.total};${l.note||''};${l.user}\n`; 
            }); 
            App.helpers.downloadCSV(csv, `NK_${h}.csv`); 
        },
        
        exportAttendance: () => { 
            let csv = "NGAY;GIO;TEN;CA;TO\n"; 
            App.data.attendance.forEach(l => csv += `${l.date};${new Date(l.time).toLocaleTimeString()};${l.user};${l.shift};${l.team}\n`); 
            App.helpers.downloadCSV(csv, 'ChamCong.csv'); 
        }
    },
    
    helpers: {
        downloadCSV: (c, f) => { 
            const blob = new Blob(["\uFEFFsep=;\n"+c], { type: 'text/csv;charset=utf-8' }); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement('a'); a.href=url; a.download=f; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); 
        }
    }
};

window.onload = App.init;
