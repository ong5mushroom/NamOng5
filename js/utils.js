export const Utils = {
    toast: (msg, type = 'success') => {
        const d = document.createElement('div');
        d.className = `fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl font-bold text-white text-xs animate-bounce ${type === 'err' ? 'bg-red-500' : 'bg-green-600'}`;
        d.innerText = msg;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 3000);
    },
    
    modal: (title, content, buttons = []) => {
        const old = document.getElementById('base-modal'); if(old) old.remove();
        if(!title) return; // Nếu title null thì tắt modal
        const d = document.createElement('div');
        d.id = 'base-modal';
        d.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in';
        d.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-black text-slate-700 uppercase text-sm">${title}</h3>
                <button onclick="document.getElementById('base-modal').remove()" class="text-slate-400 hover:text-red-500 font-bold">✕</button>
            </div>
            <div class="p-4 max-h-[70vh] overflow-y-auto text-sm text-slate-600">${content}</div>
            <div class="p-3 bg-slate-50 flex gap-2 justify-end">
                ${buttons.map(b => `<button id="${b.id}" class="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow hover:bg-blue-700">${b.text}</button>`).join('')}
            </div>
        </div>`;
        document.body.appendChild(d);
    },

    // --- MỚI: HÀM PHÁT TIẾNG & RUNG ---
    notifySound: () => {
        try {
            // Rung điện thoại (2 nhịp ngắn)
            if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
            
            // Phát tiếng "Ping" (Base64 để không lỗi mạng)
            const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // (Đây là ví dụ ngắn, trình duyệt sẽ chặn nếu chưa tương tác. Code dưới App.js sẽ xử lý)
            
            // Dùng tiếng Beep mặc định của trình duyệt nếu có thể, hoặc âm thanh beep ngắn
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = 800; // Tần số cao (tiếng Ting)
            gain.gain.value = 0.1;
            osc.start();
            setTimeout(() => osc.stop(), 200); // Kêu trong 0.2 giây
        } catch(e) { console.log("Silent mode"); }
    }
};
