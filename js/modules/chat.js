// ĐƯỜNG DẪN: js/modules/chat.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if (!c || c.classList.contains('hidden')) return;

        try {
            const msgs = Array.isArray(data.chat) ? data.chat : [];
            const content = document.getElementById('chat-msgs');
            
            if (!content) return;

            // VẼ TIN NHẮN (Nguyên bản)
            if (msgs.length === 0) {
                content.innerHTML = `<div class="text-center mt-10 text-slate-400">Chưa có tin nhắn</div>`;
            } else {
                content.innerHTML = msgs.map((m) => {
                    try {
                        if (!m) return ''; 
                        const myId = user ? String(user._id || user.id) : "guest";
                        const senderId = m.senderId ? String(m.senderId) : "unknown";
                        const isMe = senderId === myId;
                        const timeStr = m.time ? new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '';

                        return `
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2 w-full animate-pop">
                            ${!isMe ? `<span class="text-[10px] text-slate-500 px-2 font-bold mb-1 ml-1">${m.senderName || '...'}</span>` : ''}
                            
                            <div class="max-w-[75%] px-4 py-3 text-sm shadow-sm break-words leading-relaxed
                                ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm'}">
                                ${m.text || '...'}
                            </div>
                            
                            <span class="text-[9px] text-slate-400 px-1 mt-1 opacity-70">${timeStr}</span>
                        </div>`;
                    } catch { return ''; }
                }).join('');
            }
            
            setTimeout(() => { if(content) content.scrollTop = content.scrollHeight; }, 100);

            // GẮN SỰ KIỆN GỬI
            const sendBtn = document.querySelector('[data-action="sendChat"]');
            if(sendBtn && !sendBtn.dataset.bound) {
                const newBtn = sendBtn.cloneNode(true);
                sendBtn.parentNode.replaceChild(newBtn, sendBtn);
                newBtn.dataset.bound = "true";

                const handleSend = (e) => {
                    if(e) e.preventDefault();
                    Chat.sendMessage(user);
                };

                newBtn.addEventListener('click', handleSend);
                
                const input = document.getElementById('chat-input');
                if(input) input.onkeydown = (e) => { if(e.key === 'Enter') handleSend(e); };
            }

        } catch (e) { console.error(e); }
    },

    sendMessage: async (user) => {
        if (!user) return Utils.toast("Chưa đăng nhập", "err");
        const inp = document.getElementById('chat-input');
        const text = inp.value.trim();
        if(!text) return;

        inp.value = ''; inp.focus();

        try {
            await addDoc(collection(db, `${ROOT_PATH}/chat`), { 
                text: text, 
                senderId: String(user._id || user.id), 
                senderName: user.name, 
                time: Date.now() 
            });
        } catch (e) {
            Utils.toast("Lỗi gửi tin", "err");
            inp.value = text;
        }
    }
};
