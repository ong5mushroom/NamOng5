// Dùng ../config.js và ../utils.js
import { ... } from '../config.js'; 
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if (c.classList.contains('hidden')) return;

        const msgs = data.chat || [];
        const content = document.getElementById('chat-msgs');
        
        // Render danh sách tin nhắn
        if (msgs.length === 0) {
            content.innerHTML = `<div class="text-center mt-10 text-slate-400">Chưa có tin nhắn</div>`;
        } else {
            content.innerHTML = msgs.map((m, index) => {
                // Ép kiểu về String để so sánh chính xác
                const currentUserId = user ? String(user.id) : "guest";
                const senderId = String(m.senderId);
                const isMe = senderId === currentUserId;
                
                return `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2 w-full animate-pop">
                    <div class="max-w-[75%] px-4 py-3 text-sm shadow-sm break-words leading-relaxed
                        ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm'}">
                        ${m.text}
                    </div>
                    <span class="text-[9px] text-slate-400 px-1 mt-1 opacity-70">
                        ${new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                    </span>
                </div>`;
            }).join('');
        }
        
        // Luôn cuộn xuống cuối sau khi render
        setTimeout(() => content.scrollTop = content.scrollHeight, 50);

        // GẮN SỰ KIỆN (Chỉ gắn 1 lần)
        const sendBtn = document.querySelector('[data-action="sendChat"]');
        if(sendBtn) {
            const newBtn = sendBtn.cloneNode(true); // Xóa event cũ
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            const handleSend = (e) => {
                if(e) e.preventDefault(); // CHẶN RELOAD
                Chat.sendMessage(user);
            };

            newBtn.addEventListener('click', handleSend);
            
            const input = document.getElementById('chat-input');
            input.onkeydown = null;
            input.onkeydown = (e) => {
                if(e.key === 'Enter') handleSend(e);
            };
        }
    },

    sendMessage: async (user) => {
        if (!user) return Utils.toast("Chưa đăng nhập", "err");
        
        const inp = document.getElementById('chat-input');
        const text = inp.value.trim();
        if(!text) return;

        inp.value = ''; // Xóa ô nhập
        inp.focus();

        // --- QUAN TRỌNG: KHÔNG VẼ TẠM Ở ĐÂY NỮA ---
        // Chỉ gửi lên server và để onSnapshot tự lo
        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: text, 
                senderId: String(user.id), 
                senderName: user.name, 
                time: Date.now() 
            });
        } catch (e) {
            console.error(e);
            Utils.toast("Lỗi gửi tin", "err");
            inp.value = text; // Trả lại text nếu lỗi
        }
    }
};
