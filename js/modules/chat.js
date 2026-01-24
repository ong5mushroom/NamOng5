import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if(c.classList.contains('hidden')) return;

        const msgs = data.chat || [];
        const content = document.getElementById('chat-msgs');
        
        // Vẽ tin nhắn
        content.innerHTML = msgs.map(m => {
            const isMe = String(m.senderId) === String(user.id);
            return `
            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3 animate-pop">
                <span class="text-[9px] text-slate-400 px-2 uppercase font-bold mb-0.5">${m.senderName}</span>
                <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'} px-4 py-2 rounded-2xl shadow-sm text-sm max-w-[85%] break-words">
                    ${m.text}
                </div>
                <span class="text-[8px] text-slate-300 px-1 mt-0.5">${new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>`;
        }).join('');
        
        content.scrollTop = content.scrollHeight;

        // Xử lý gửi tin
        const sendBtn = document.querySelector('[data-action="sendChat"]'); // Nút này nằm ở index.html
        if(sendBtn) {
            // Remove listener cũ để tránh duplicate (nếu có)
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            newBtn.addEventListener('click', async () => {
                const inp = document.getElementById('chat-input');
                if(inp.value.trim()) {
                    await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                        text: inp.value, 
                        senderId: user.id, 
                        senderName: user.name, 
                        time: Date.now() 
                    });
                    inp.value = '';
                }
            });
        }
    }
};
