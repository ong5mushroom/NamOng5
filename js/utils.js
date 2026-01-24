// --- UTILS: CÔNG CỤ DÙNG CHUNG ---
export const Utils = {
    // 1. Thông báo
    toast: (msg) => {
        const b = document.getElementById('msg-box');
        if(b) { b.innerText = msg; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 3000); }
    },

    // 2. Modal Động
    modal: (title, content, actions = []) => {
        const m = document.getElementById('modal-container');
        if(!title) { m.classList.add('hidden'); return; } // Đóng
        
        let btns = actions.map(a => `<button id="${a.id}" class="flex-1 py-3 ${a.cls||'bg-blue-600 text-white'} rounded-xl font-bold btn-action shadow-lg">${a.text}</button>`).join('');
        
        m.innerHTML = `
            <div class="glass !bg-white w-full max-w-sm p-6 space-y-4 shadow-2xl animate-pop" onclick="event.stopPropagation()">
                <div class="flex justify-between items-center border-b pb-2">
                    <h3 class="font-black text-slate-800 text-lg uppercase">${title}</h3>
                    <button class="text-2xl text-slate-400" onclick="document.getElementById('modal-container').classList.add('hidden')">&times;</button>
                </div>
                <div class="space-y-3">${content}</div>
                <div class="flex gap-3 pt-2">
                    <button class="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500" onclick="document.getElementById('modal-container').classList.add('hidden')">Hủy</button>
                    ${btns}
                </div>
            </div>`;
        m.classList.remove('hidden');
    },

    // 3. Khởi tạo
    init: () => {
        const m = document.getElementById('modal-container');
        if(m) m.addEventListener('click', e => { if(e.target === m) m.classList.add('hidden'); });
    }
};
