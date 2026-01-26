// ĐƯỜNG DẪN: js/modules/chat.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        // Nếu chat đang ẩn thì không làm gì cả
        if (c.classList.contains('hidden')) return;

        // --- FIX LỖI DATA: Đảm bảo luôn là mảng ---
        const msgs = data.chat || [];
        const content = document.getElementById('chat-msgs');
        
        if (!content) return; // Bảo vệ nếu chưa load HTML

        if (msgs.length === 0) {
            content.innerHTML = `<div class="h-full flex flex-col items-center justify-center opacity-40">
                <i class="fas fa-comments text-4xl mb-2"></i>
                <p>Chưa có tin nhắn nào</p>
            </div>`;
        } else {
            content.innerHTML = msgs.map((m) => {
                // --- FIX LỖI ID: Ép kiểu String để so sánh chính xác ---
                const currentUserId = user ? String(user._id || user.id) : "guest";
                const senderId = String(m.senderId);
                const isMe = senderId === currentUserId;
                
                return `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3 w-full animate-pop">
                    ${!isMe ? `<span class="text-[10px] text-slate-500 ml-2 mb-0.5 font-bold">${m.senderName}</span>` : ''}
                    <div class="max-w-[80%] px-4 py-3 text-sm shadow-sm break-words leading-relaxed
                        ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm'}">
                        ${m.text}
                    </div>
                    <span class="text-[9px] text-slate-400 px-1 mt-1 opacity-70">
                        ${new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                    </span>
                </div>`;
            }).join('');
        }
        
        // Cuộn xuống cuối
        setTimeout(() => content.scrollTop = content.scrollHeight, 100);

        // Gắn sự kiện Gửi (Chỉ gắn 1 lần bằng cách clone node)
        const sendBtn = document.querySelector('[data-action="sendChat"]');
        if(sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            const handleSend = () => Chat.sendMessage(user);
            newBtn.addEventListener('click', handleSend);
            
            // Enter để gửi
            const input = document.getElementById('chat-input');
            input.onkeydown = (e) => {
                if(e.key === 'Enter') handleSend();
            };
        }
    },

    sendMessage: async (user) => {
        if (!user) return Utils.toast("Vui lòng đăng nhập!", "err");
        
        const inp = document.getElementById('chat-input');
        const text = inp.value.trim();
        if(!text) return;

        // Optimistic UI: Xóa ô nhập ngay cho mượt
        inp.value = ''; 
        inp.focus();

        try {
            // --- FIX LỖI GỬI: Đảm bảo lưu đúng trường _id ---
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: text, 
                senderId: String(user._id || user.id), // Lưu ID dạng chuỗi
                senderName: user.name, 
                time: Date.now() 
            });
        } catch (e) {
            console.error(e);
            Utils.toast("Lỗi gửi tin!", "err");
            inp.value = text; // Trả lại tin nhắn nếu lỗi
        }
    }
};
