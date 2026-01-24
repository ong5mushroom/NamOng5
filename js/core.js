export const UI = {
    // 1. FIX LỖI CRASH: Hàm initModals phải tồn tại và được export
    initModals: () => {
        const c = document.getElementById('modal-container');
        if(c) c.addEventListener('click', e => { if(e.target === c) c.classList.add('hidden'); });
        console.log("UI Initialized");
    },

    playSound: (type) => { try { const a=new AudioContext(); const o=a.createOscillator(); const g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=type==='success'?600:300; g.gain.value=0.1; o.start(); o.stop(a.currentTime+0.2); } catch(e){} },
    
    showMsg: (t) => { const b = document.getElementById('msg-box'); if(b) { b.innerText = t; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 3000); } },

    toggleModal: (html) => {
        const m = document.getElementById('modal-container');
        if(!m) return;
        if(html) { m.innerHTML = html; m.classList.remove('hidden'); } else { m.classList.add('hidden'); }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabName) { btn.classList.add('text-blue-600', '-translate-y-1'); btn.classList.remove('text-slate-400'); }
            else { btn.classList.remove('text-blue-600', '-translate-y-1'); btn.classList.add('text-slate-400'); }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const sel = document.getElementById('login-user');
        if(sel) {
            if (employees.length === 0) {
                sel.innerHTML = '<option value="">Chưa có dữ liệu...</option>';
            } else {
                sel.innerHTML = '<option value="">-- Chọn tên --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
            }
        }
        // Cập nhật ô chọn trong task nếu có
        const taskSel = document.getElementById('task-assignee');
        if(taskSel && employees.length > 0) taskSel.innerHTML = employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
    },

    Templates: {
        ModalBase: (t, c, btn, btnTxt) => `<div class="glass !bg-white w-full max-w-sm p-6 space-y-4 shadow-2xl animate-fade" onclick="event.stopPropagation()"><div class="flex justify-between items-center border-b pb-2"><h3 class="font-black text-slate-800 text-lg uppercase">${t}</h3><button class="text-2xl text-slate-400 btn-action" data-action="closeModal">&times;</button></div><div class="space-y-3">${c}</div><div class="flex gap-3 pt-2"><button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="closeModal">Hủy</button><button class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold btn-action shadow-lg" data-action="${btn}">${btnTxt}</button></div></div>`,
        Chat: (msgs, uid) => {
            const b = document.getElementById('chat-msgs');
            if(b) {
                b.innerHTML = msgs.map(m => `<div class="flex flex-col ${String(m.senderId)===String(uid)?'items-end':'items-start'} animate-fade"><span class="text-[9px] text-slate-400 px-2 uppercase font-bold">${m.senderName}</span><div class="${String(m.senderId)===String(uid)?'bg-blue-600 text-white':'bg-white text-slate-700'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] mb-2 break-words">${m.text}</div></div>`).join('');
                b.scrollTop = b.scrollHeight;
            }
        }
    }
};
