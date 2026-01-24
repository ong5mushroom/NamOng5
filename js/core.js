export const UI = {
    // 1. SETUP SỰ KIỆN NỀN (QUAN TRỌNG: ĐÃ BỔ SUNG)
    initModals: () => {
        // Tự động đóng modal khi click vào vùng đen (overlay)
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) modalContainer.classList.add('hidden');
            });
        }
    },

    // 2. TIỆN ÍCH
    playSound: (type) => { 
        try { 
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            if(type==='success') { osc.frequency.setValueAtTime(600, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime+0.15); }
            else if(type==='msg') { osc.frequency.setValueAtTime(800, ctx.currentTime); gain.gain.setValueAtTime(0.05, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime+0.1); }
        } catch(e){} 
    },
    
    showMsg: (t) => { 
        const b = document.getElementById('msg-box'); 
        if(b) { 
            b.innerText = t; 
            b.classList.remove('hidden'); 
            b.classList.add('animate-fade');
            setTimeout(() => b.classList.add('hidden'), 3000); 
        } 
    },

    toggleModal: (contentHTML) => {
        const m = document.getElementById('modal-container');
        if (contentHTML) {
            m.innerHTML = contentHTML;
            m.classList.remove('hidden');
        } else {
            m.classList.add('hidden');
        }
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${tabName}`)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabName) { 
                btn.classList.add('text-blue-600', '-translate-y-1'); 
                btn.classList.remove('text-slate-400'); 
            } else { 
                btn.classList.remove('text-blue-600', '-translate-y-1'); 
                btn.classList.add('text-slate-400'); 
            }
        });
        localStorage.setItem('n5_current_tab', tabName);
    },

    renderEmployeeOptions: (employees) => {
        const h = '<option value="">-- Chọn --</option>' + employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        const s1 = document.getElementById('login-user'); if(s1) s1.innerHTML = h;
    },

    // 3. TEMPLATE BUILDERS (HÀM VẼ HTML ĐỘNG)
    Templates: {
        ModalBase: (title, content, actionBtn, actionName) => `
            <div class="glass !bg-white w-full max-w-sm p-6 space-y-4 shadow-2xl animate-fade" onclick="event.stopPropagation()">
                <div class="flex justify-between items-center border-b pb-2">
                    <h3 class="font-black text-slate-800 text-lg uppercase">${title}</h3>
                    <button class="text-2xl text-slate-400 btn-action" data-action="closeModal">&times;</button>
                </div>
                <div class="space-y-3">${content}</div>
                <div class="flex gap-3 pt-2">
                    <button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 btn-action" data-action="closeModal">Hủy</button>
                    <button class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold btn-action shadow-lg" data-action="${actionBtn}">${actionName}</button>
                </div>
            </div>
        `,
        Chat: (msgs, uid) => {
            const b = document.getElementById('chat-msgs');
            b.innerHTML = msgs.map(m => `
                <div class="flex flex-col ${String(m.senderId)===String(uid)?'items-end':'items-start'} animate-fade">
                    <span class="text-[9px] text-slate-400 px-2 uppercase font-bold">${m.senderName}</span>
                    <div class="${String(m.senderId)===String(uid)?'bg-blue-600 text-white':'bg-white text-slate-700'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] mb-2 break-words">
                        ${m.text}
                    </div>
                </div>`).join('');
            b.scrollTop = b.scrollHeight; 
        }
    }
};
