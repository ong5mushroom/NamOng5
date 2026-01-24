import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if(c.classList.contains('hidden')) return;

        // Kiểm tra log xem dữ liệu có về không (Bật F12 console để xem)
        console.log("Chat Data:", data.chat);

        const msgs = data.chat || [];
        const content = document.getElementById('chat-msgs');
        
        // 1. Nếu chưa có tin nhắn
        if (msgs.length === 0) {
            content.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center opacity-40 mt-20">
                    <i class="fas fa-comments text-6xl mb-4 text-slate-400"></i>
                    <p class="text-sm font-bold text-slate-500">Chưa có tin nhắn nào</p>
                </div>`;
            return;
        }

        // 2. Render tin nhắn
        content.innerHTML = msgs.map((m, index) => {
            // Kiểm tra an toàn user id
            const currentUserId = user ? String(user.id) : "guest";
            const senderId = String(m.senderId);
            const isMe = senderId === currentUserId;
            
            // Logic hiển thị tên người gửi (nếu tin trước đó không phải của cùng người)
            const isPrevSame = index > 0 && String(msgs[index-1].senderId) === senderId;
            const showName = !isMe && !isPrevSame;

            return `
            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2 w-full animate-pop">
                ${showName ? `<span class="text-[10px] text-slate-500 px-2 font-bold mb-1 ml-1">${m.senderName}</span>` : ''}
                
                <div class="max-w-[75%] px-4 py-3 text-sm shadow-sm break-words leading-relaxed
                    ${isMe 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm'
                    }">
                    ${m.text}
                </div>
                
                <span class="text-[9px] text-slate-400 px-1 mt-1 opacity-70">
                    ${new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                </span>
            </div>`;
        }).join('');
        
        // Cuộn xuống cuối
        setTimeout(() => content.scrollTop = content.scrollHeight, 100);

        // 3. Gắn sự kiện gửi tin (Fix lỗi duplicate event)
        const sendBtn = document.querySelector('[data-action="sendChat"]');
        if(sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            newBtn.addEventListener('click', () => Chat.sendMessage(user));
            
            // Sự kiện Enter
            const input = document.getElementById('chat-input');
            input.onkeydown = (e) => {
                if(e.key === 'Enter') Chat.sendMessage(user);
            };
        }
    },

    sendMessage: async (user) => {
        if (!user) {
            Utils.toast("Vui lòng đăng nhập để chat!", "err");
            return;
        }
        const inp = document.getElementById('chat-input');
        const text = inp.value.trim();
        if(!text) return;

        inp.value = ''; // Xóa ô nhập ngay lập tức
        inp.focus();

        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: text, 
                senderId: user.id, 
                senderName: user.name, 
                time: Date.now() 
            });
        } catch (e) {
            console.error(e);
            Utils.toast("Lỗi gửi tin!", "err");
            inp.value = text; // Hoàn tác nếu lỗi
        }
    }
};
