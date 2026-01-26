// ĐƯỜNG DẪN: js/modules/chat.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if (c.classList.contains('hidden')) return;

        try {
            const msgs = Array.isArray(data.chat) ? data.chat : [];
            const content = document.getElementById('chat-msgs');
            
            if (!content) return;

            // --- 1. VẼ TIN NHẮN ---
            if (msgs.length === 0) {
                content.innerHTML = `<div class="h-64 flex flex-col items-center justify-center opacity-40 text-slate-500">
                    <i class="fas fa-comments text-4xl mb-2"></i>
                    <p class="font-bold text-sm">Chưa có tin nhắn</p>
                </div>`;
            } else {
                content.innerHTML = msgs.map((m) => {
                    // Chuyển hết về String để so sánh an toàn
                    const myId = user ? String(user._id || user.id) : "guest";
                    const senderId = String(m.senderId);
                    const isMe = senderId === myId;
                    
                    return `
                    <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3 w-full animate-pop">
                        ${!isMe ? `<span class="text-[10px] text-slate-500 ml-2 mb-0.5 font-bold">${m.senderName || 'Người lạ'}</span>` : ''}
                        
                        <div class="max-w-[80%] px-4 py-3 text-sm shadow-sm break-words leading-relaxed
                            ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'}">
                            ${m.text}
                        </div>
                        
                        <span class="text-[9px] text-slate-400 px-1 mt-1 opacity-70">
                            ${m.time ? new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : ''}
                        </span>
                    </div>`;
                }).join('');
            }
            
            // Tự động cuộn xuống cuối
            setTimeout(() => {
                if(content) content.scrollTop = content.scrollHeight;
            }, 100);

            // --- 2. GẮN SỰ KIỆN GỬI (Chỉ gắn 1 lần) ---
            const sendBtn = document.querySelector('[data-action="sendChat"]');
            if(sendBtn && !sendBtn.hasAttribute('data-bound')) {
                // Clone nút để xóa sạch sự kiện cũ
                const newBtn = sendBtn.cloneNode(true);
                sendBtn.parentNode.replaceChild(newBtn, sendBtn);
                newBtn.setAttribute('data-bound', 'true'); // Đánh dấu đã gắn

                const handleSend = () => Chat.sendMessage(user);
                
                newBtn.addEventListener('click', handleSend);
                
                const input = document.getElementById('chat-input');
                if(input) {
                    input.onkeydown = (e) => {
                        if(e.key === 'Enter') handleSend();
                    };
                }
            }

        } catch (err) {
            console.error("Lỗi Render Chat:", err);
            Utils.toast("Lỗi hiển thị Chat", "err");
        }
    },

    sendMessage: async (user) => {
        if (!user) return Utils.toast("Vui lòng đăng nhập!", "err");
        
        const inp = document.getElementById('chat-input');
        const text = inp.value.trim();
        if(!text) return;

        inp.value = ''; 
        inp.focus();

        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: text, 
                // Ưu tiên lấy _id (ID chuẩn trong Employees)
                senderId: String(user._id || user.id), 
                senderName: user.name, 
                time: Date.now() 
            });
        } catch (e) {
            console.error(e);
            Utils.toast("Không gửi được tin!", "err");
            inp.value = text;
        }
    }
};
