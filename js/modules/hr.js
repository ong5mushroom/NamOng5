import { addDoc, collection, db, ROOT_PATH, updateDoc, doc, deleteDoc, increment, writeBatch } from '../config.js';
import { Utils } from '../utils.js';

// --- HỆ THỐNG XỬ LÝ (CHAT, ĐIỂM, DUYỆT) ---
window.HR_Action = {
    // 1. Chat & Thông báo
    chat: async (user, msg, isSystem = false) => {
        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), {
                user: user,
                message: msg,
                time: Date.now(),
                type: isSystem ? 'NOTIFY' : 'CHAT'
            });
        } catch (e) {
            console.error("Lỗi chat:", e);
        }
    },

    // 2. Chấm điểm
    score: async (id, name, val, adminName) => {
        const reason = prompt(`Lý do ${val > 0 ? 'thưởng' : 'phạt'} ${Math.abs(val)} điểm?`);
        if (reason) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/employees`, id), { score: increment(val) });
                Utils.toast("Đã cập nhật điểm!");
                window.HR_Action.chat("HỆ THỐNG", `⚖️ ${adminName} đã ${val > 0 ? 'THƯỞNG' : 'PHẠT'} ${name} ${Math.abs(val)} điểm. Lý do: ${reason}`, true);
            } catch (e) {
                alert("Lỗi: " + e.message);
            }
        }
    },

    // 3. Nhắc nhở
    remind: async (name, title, type) => {
        Utils.toast(`Đã gửi nhắc nhở đến ${name}!`);
        const icon = type === 'ACCEPT' ? '🔔' : '⏰';
        const action = type === 'ACCEPT' ? 'nhận việc' : 'báo cáo';
        window.HR_Action.chat("NHẮC NHỞ", `${icon} Nhắc @${name} ${action}: "${decodeURIComponent(title)}"`, true);
    },

    // 4. Duyệt đơn
    approve: async (id, title, user, admin, isOk) => {
        if (confirm(isOk ? "Duyệt đơn này?" : "Từ chối đơn này?")) {
            try {
                await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: isOk ? 'DONE' : 'REJECT' });
                Utils.toast("Đã xử lý!");
                const statusText = isOk ? "✅ DUYỆT" : "❌ TỪ CHỐI";
                window.HR_Action.chat("HỆ THỐNG", `${statusText} đơn: "${title}" của ${user} (bởi ${admin})`, true);
            } catch (e) {
                alert("Lỗi: " + e.message);
            }
        }
    },

    // 5. Thao tác công việc
    task: {
        del: async (id) => {
            if (confirm("Bạn chắc chắn muốn xóa việc này?")) {
                await deleteDoc(doc(db, `${ROOT_PATH}/tasks`, id));
                Utils.toast("Đã xóa!");
            }
        },
        accept: async (id, t, u) => {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DOING' });
            window.HR_Action.chat("TIẾN ĐỘ", `💪 ${u} đã NHẬN việc: "${decodeURIComponent(t)}"`, true);
        },
        finish: async (id, t, u) => {
            await updateDoc(doc(db, `${ROOT_PATH}/tasks`, id), { status: 'DONE' });
            window.HR_Action.chat("TIẾN ĐỘ", `🏁 ${u} đã HOÀN THÀNH: "${decodeURIComponent(t)}"`, true);
        }
    }
};

export const HR = {
    renderTasks: (data, user) => {
        const c = document.getElementById('view-tasks');
        if (c && !c.classList.contains('hidden')) {
            HR.renderTasks_Logic(data, user, c);
        }
    },

    renderTasks_Logic: (data, user, c) => {
        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const houses = Array.isArray(data.houses) ? data.houses : [];

        c.innerHTML = `
        <div class="space-y-4 pb-24">
            ${isAdmin ? `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <h3 class="font-black text-blue-600 text-xs uppercase mb-3 flex items-center gap-2">
                    <i class="fas fa-paper-plane"></i> GIAO VIỆC NHANH
                </h3>
                
                <input id="t-t" placeholder="Nội dung công việc..." class="w-full p-3 rounded-lg border border-slate-200 text-sm mb-3 focus:border-blue-500 outline-none">
                
                <div class="flex gap-2 mb-3">
                    <select id="t-area" class="w-1/2 p-2 rounded-lg border border-slate-200 text-xs font-bold bg-white">
                        <option value="">-- Khu vực --</option>
                        ${houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
                        <option value="Khác">Khác</option>
                    </select>
                    <input type="date" id="t-date" class="w-1/2 p-2 rounded-lg border border-slate-200 text-xs font-bold">
                </div>
                
                <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
                    <label class="col-span-2 font-bold text-xs border-b pb-1 text-blue-600 flex items-center gap-2">
                        <input type="checkbox" id="check-all"> Chọn tất cả
                    </label>
                    ${employees.map(e => `
                        <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-blue-600">
                            <input type="checkbox" class="ec" value="${e._id}" data-name="${e.name}"> ${e.name}
                        </label>
                    `).join('')}
                </div>
                
                <button id="btn-tsk" class="w-full bg-blue-600 text-white rounded-lg py-3 text-xs font-bold shadow-md shadow-blue-200 active:scale-95 transition">
                    GỬI YÊU CẦU
                </button>
            </div>` : ''}

            <div>
                <div class="flex justify-between items-center mb-2 px-1">
                    <h2 class="font-black text-slate-700 text-sm uppercase border-l-4 border-orange-500 pl-2">NHẬT KÝ</h2>
                    <select id="filter-emp" class="text-[10px] border rounded p-1 bg-white outline-none">
                        <option value="ALL">Tất cả nhân viên</option>
                        ${employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div id="lst" class="space-y-3"></div>
            </div>
        </div>`;

        // Hàm render danh sách
        const renderList = () => {
            const fid = document.getElementById('filter-emp').value;
            let list = tasks.filter(t => !t.type || t.type === 'TASK');

            if (fid !== 'ALL') list = list.filter(t => t.to === fid);
            if (!isAdmin) list = list.filter(t => t.to === user._id || t.by === user.name);

            list.sort((a, b) => b.time - a.time);

            document.getElementById('lst').innerHTML = list.length ? list.map(t => {
                const isDone = t.status === 'DONE';
                const empName = employees.find(e => e._id === t.to)?.name || 'Unknown';
                const safeTitle = encodeURIComponent(t.title); // Mã hóa để tránh lỗi quote

                return `
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative ${isDone ? 'opacity-60 bg-slate-50' : ''}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="pr-8">
                            <span class="text-xs font-bold text-slate-700 block ${isDone ? 'line-through text-slate-400' : ''}">
                                ${t.area ? `<span class="text-blue-600">[${t.area}]</span> ` : ''}${t.title}
                            </span>
                            <span class="text-[10px] text-slate-400 mt-1 block">
                                Người làm: <b class="text-slate-600">${empName}</b> • ${new Date(t.time).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        
                        ${isAdmin ? `
                            <button onclick="window.HR_Action.task.del('${t.id}')" class="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-1">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>

                    <div class="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-slate-100">
                        ${isAdmin && !isDone ? `
                            <button onclick="window.HR_Action.remind('${empName}', '${safeTitle}', '${t.status === 'PENDING' ? 'ACCEPT' : 'REPORT'}')" 
                                    class="text-[9px] font-bold px-2 py-1 rounded border ${t.status === 'PENDING' ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-blue-600 border-blue-200 bg-blue-50'} active:scale-95 transition">
                                ${t.status === 'PENDING' ? '🔔 Nhắc nhận việc' : '⏰ Nhắc báo cáo'}
                            </button>
                        ` : '<span></span>'}

                        ${!isDone && t.to === user._id ? (
                            t.status !== 'DOING'
                                ? `<button onclick="window.HR_Action.task.accept('${t.id}', '${safeTitle}', '${user.name}')" 
                                           class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition animate-pulse">
                                     NHẬN VIỆC
                                   </button>`
                                : `<button onclick="window.HR_Action.task.finish('${t.id}', '${safeTitle}', '${user.name}')" 
                                           class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition">
                                     BÁO CÁO XONG
                                   </button>`
                        ) : ''}
                    </div>
                </div>`;
            }).join('') : '<div class="text-center text-slate-300 italic text-xs py-10">Chưa có công việc nào</div>';
        };

        // Gắn sự kiện (Events)
        setTimeout(() => {
            renderList();
            
            // Auto date
            const dIn = document.getElementById('t-date');
            if (dIn) dIn.valueAsDate = new Date();

            // Filter change
            const fSel = document.getElementById('filter-emp');
            if (fSel) fSel.onchange = renderList;

            // Check all
            const chkAll = document.getElementById('check-all');
            if (chkAll) {
                chkAll.onchange = (e) => {
                    document.querySelectorAll('.ec').forEach(cb => cb.checked = e.target.checked);
                };
            }

            // Giao việc Button
            const btn = document.getElementById('btn-tsk');
            if (btn) {
                btn.onclick = async () => {
                    const title = document.getElementById('t-t').value;
                    const area = document.getElementById('t-area').value;
                    const chk = document.querySelectorAll('.ec:checked');

                    if (title && chk.length) {
                        try {
                            const batch = writeBatch(db);
                            const names = [];
                            
                            chk.forEach(c => {
                                const ref = doc(collection(db, `${ROOT_PATH}/tasks`));
                                batch.set(ref, {
                                    title: title,
                                    area: area,
                                    to: c.value,
                                    by: user.name,
                                    status: 'PENDING',
                                    time: Date.now(),
                                    type: 'TASK'
                                });
                                names.push(c.getAttribute('data-name'));
                            });

                            await batch.commit();
                            
                            // Gửi thông báo
                            window.HR_Action.chat(user.name, `📢 Đã giao việc: "${title}" ${area ? `tại ${area}` : ''} cho ${names.join(', ')}`, true);
                            
                            Utils.toast("Đã giao việc thành công!");
                            renderList();
                            document.getElementById('t-t').value = '';
                            // Reset checkbox
                            document.querySelectorAll('.ec').forEach(c => c.checked = false);
                            if (chkAll) chkAll.checked = false;
                            
                        } catch (err) {
                            alert("Lỗi khi giao việc: " + err.message);
                        }
                    } else {
                        Utils.toast("Vui lòng nhập nội dung và chọn nhân viên!", "err");
                    }
                };
            }
        }, 300);
    },

    renderTeam: (data, user) => {
        const c = document.getElementById('view-team');
        if (!c || c.classList.contains('hidden')) return;

        const isAdmin = user && ['admin', 'quản lý', 'giám đốc'].some(r => (user.role || '').toLowerCase().includes(r));
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        
        // Lọc đơn cần duyệt
        const pending = tasks.filter(t => t.status === 'PENDING' && ['LEAVE', 'BUY', 'CHECKIN'].includes(t.type));

        c.innerHTML = `
        <div class="space-y-6 pb-24">
            
            ${isAdmin && pending.length ? `
            <div class="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm animate-pop">
                <h3 class="font-black text-red-600 text-xs uppercase mb-3 flex items-center gap-2">
                    <i class="fas fa-bell animate-bounce"></i> CẦN DUYỆT (${pending.length})
                </h3>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${pending.map(t => `
                        <div class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center border border-red-50">
                            <div>
                                <div class="text-[10px] font-bold text-slate-500">${t.by} • ${t.type === 'LEAVE' ? 'Xin Nghỉ' : (t.type === 'BUY' ? 'Mua Hàng' : 'Chấm Công')}</div>
                                <div class="text-xs font-bold text-slate-800">${t.title}</div>
                                <div class="text-[9px] text-slate-400">${new Date(t.time).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="window.HR_Approve.approve('${t.id}', '${encodeURIComponent(t.title)}', '${t.by}', '${user.name}', true)" 
                                        class="bg-green-100 text-green-700 w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-green-200 transition">✓</button>
                                <button onclick="window.HR_Approve.approve('${t.id}', '${encodeURIComponent(t.title)}', '${t.by}', '${user.name}', false)" 
                                        class="bg-red-100 text-red-700 w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-red-200 transition">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-5 rounded-2xl shadow-lg text-white">
                <h3 class="font-bold text-xs uppercase mb-4 opacity-80 text-center tracking-widest">TIỆN ÍCH CÁ NHÂN</h3>
                <div class="grid grid-cols-3 gap-4">
                    <button id="btn-checkin" class="flex flex-col items-center gap-2 group">
                        <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition backdrop-blur-sm border border-white/30">📍</div>
                        <span class="text-[10px] font-bold tracking-wide">Chấm công</span>
                    </button>
                    <button id="btn-leave" class="flex flex-col items-center gap-2 group">
                        <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition backdrop-blur-sm border border-white/30">📝</div>
                        <span class="text-[10px] font-bold tracking-wide">Xin nghỉ</span>
                    </button>
                    <button id="btn-buy" class="flex flex-col items-center gap-2 group">
                        <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition backdrop-blur-sm border border-white/30">🛒</div>
                        <span class="text-[10px] font-bold tracking-wide">Mua hàng</span>
                    </button>
                </div>
            </div>

            <div>
                <h2 class="font-black text-slate-700 text-sm border-l-4 border-slate-500 pl-2 mb-3 uppercase">ĐỘI NGŨ NHÂN VIÊN</h2>
                <div class="space-y-2">
                    ${employees.map(e => `
                    <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-200 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200 shadow-inner">
                                ${e.name.charAt(0)}
                            </div>
                            <div>
                                <div class="font-bold text-slate-700 text-sm">${e.name}</div>
                                <div class="text-[10px] text-slate-400 font-bold uppercase">${e.role || 'Nhân viên'}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-right">
                                <div class="font-black text-lg ${e.score >= 0 ? 'text-green-600' : 'text-red-500'}">${e.score || 0}</div>
                                <div class="text-[8px] text-slate-400 uppercase font-bold">ĐIỂM</div>
                            </div>
                            
                            ${isAdmin ? `
                            <div class="flex flex-col gap-1 pl-2 border-l border-slate-100">
                                <button onclick="window.HR_Action.score('${e._id}', '${e.name}', 10, '${user.name}')" 
                                        class="w-6 h-6 bg-green-50 text-green-600 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-green-100 active:scale-90 transition shadow-sm border border-green-100">
                                    +
                                </button>
                                <button onclick="window.HR_Action.score('${e._id}', '${e.name}', -10, '${user.name}')" 
                                        class="w-6 h-6 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-xs hover:bg-red-100 active:scale-90 transition shadow-sm border border-red-100">
                                    -
                                </button>
                            </div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;

        // Gắn sự kiện cho các nút Tiện ích
        setTimeout(() => {
            // Hàm gửi yêu cầu chung
            const sendReq = async (title, type) => {
                try {
                    await addDoc(collection(db, `${ROOT_PATH}/tasks`), {
                        title: title,
                        to: 'ADMIN',
                        by: user.name,
                        type: type,
                        status: 'PENDING',
                        time: Date.now()
                    });
                    Utils.toast("✅ Đã gửi yêu cầu thành công!");
                    // Gửi log vào chat
                    window.HR_Action.chat(user.name, `📝 Đã gửi yêu cầu: "${title}"`, true);
                } catch (e) {
                    alert("Lỗi: " + e.message);
                }
            };

            // 1. Chấm công
            const btnCheckin = document.getElementById('btn-checkin');
            if (btnCheckin) {
                btnCheckin.onclick = () => {
                    if (confirm("📍 Xác nhận chấm công ngay bây giờ?")) {
                        sendReq("Đã chấm công", "CHECKIN");
                    }
                };
            }

            // 2. Xin nghỉ (Modal Form)
            const btnLeave = document.getElementById('btn-leave');
            if (btnLeave) {
                btnLeave.onclick = () => {
                    Utils.modal("Đơn Xin Nghỉ Phép", `
                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lý do nghỉ</label>
                                <input id="l-reason" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold" placeholder="VD: Việc gia đình...">
                            </div>
                            <div class="flex gap-2">
                                <div class="w-1/2">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Từ ngày</label>
                                    <input type="date" id="l-date" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold">
                                </div>
                                <div class="w-1/2">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Số ngày</label>
                                    <input type="number" id="l-days" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-center" value="1">
                                </div>
                            </div>
                        </div>
                    `, [{ id: 's-leave', text: 'GỬI ĐƠN NGAY' }]);

                    setTimeout(() => {
                        document.getElementById('l-date').valueAsDate = new Date();
                        document.getElementById('s-leave').onclick = () => {
                            const r = document.getElementById('l-reason').value;
                            const d = document.getElementById('l-date').value;
                            const n = document.getElementById('l-days').value;
                            if (r && d && n) {
                                const dStr = new Date(d).toLocaleDateString('vi-VN');
                                sendReq(`Xin nghỉ ${n} ngày (bắt đầu từ ${dStr}). Lý do: ${r}`, "LEAVE");
                                Utils.modal(null); // Đóng modal
                            } else {
                                alert("Vui lòng điền đầy đủ thông tin!");
                            }
                        };
                    }, 100);
                };
            }

            // 3. Mua hàng (Modal Form)
            const btnBuy = document.getElementById('btn-buy');
            if (btnBuy) {
                btnBuy.onclick = () => {
                    Utils.modal("Đề Xuất Mua Sắm", `
                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên vật tư / thiết bị</label>
                                <input id="b-name" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold" placeholder="VD: Bóng đèn, Phân bón...">
                            </div>
                            <div class="flex gap-2">
                                <div class="w-1/2">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Số lượng</label>
                                    <input type="number" id="b-qty" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-center" value="1">
                                </div>
                                <div class="w-1/2">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ngày cần có</label>
                                    <input type="date" id="b-date" class="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold">
                                </div>
                            </div>
                        </div>
                    `, [{ id: 's-buy', text: 'GỬI ĐỀ XUẤT' }]);

                    setTimeout(() => {
                        document.getElementById('b-date').valueAsDate = new Date();
                        document.getElementById('s-buy').onclick = () => {
                            const n = document.getElementById('b-name').value;
                            const q = document.getElementById('b-qty').value;
                            const d = document.getElementById('b-date').value;
                            if (n && q && d) {
                                const dStr = new Date(d).toLocaleDateString('vi-VN');
                                sendReq(`Đề xuất mua: ${q} ${n} (Cần vào ngày ${dStr})`, "BUY");
                                Utils.modal(null);
                            } else {
                                alert("Vui lòng điền đầy đủ thông tin!");
                            }
                        };
                    }, 100);
                };
            }
        }, 100);
    }
};
