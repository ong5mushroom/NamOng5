// ĐƯỜNG DẪN: js/modules/chat.js
import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if (!c || c.classList.contains('hidden')) return;

        try {
            // Lấy dữ liệu an toàn
            const msgs = Array.isArray(data.chat) ? data.chat : [];
            const content = document.getElementById('chat-msgs');
            
            if (!content) return;

            if (msgs.length === 0) {
                content.innerHTML = `<div class="h-full flex flex-col items-center justify-center opacity-40 text-slate-500">
                    <i class="fas fa-comments text-4xl mb-2"></i>
                    <p class="font-bold">Chưa có tin nhắn</p>
                </div>`;
            } else {
                content.innerHTML = msgs.map((m) => {
                    // TRY-CATCH CHO TỪNG TIN NHẮN
                    try {
                        if (!m) return ''; // Bỏ qua tin rác

                        // Xử lý ID và Tên an toàn
                        const myId = user ? String(user._id || user.id) : "guest";
                        const senderId = m.senderId ? String(m.senderId) : "unknown";
                        const senderName = m.senderName || "Người lạ";
                        const isMe = senderId === myId;
                        
                        // Xử lý thời gian an toàn
                        let timeStr = "";
                        if (m.time) {
                            try {
                                timeStr = new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                            } catch(e) { timeStr = "--:--"; }
                        }

                        // Nội dung tin nhắn
                        const textContent = m.text ? String(m.text) : "...";

                        return `
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3 w-full animate-pop">
                            ${!isMe ? `<span class="text-[10px] text-slate-500 ml-2 mb-0.5 font-bold">${senderName}</span>` : ''}
                            
                            <div class="max-w-[80%] px-4 py-3 text-sm shadow-sm break-words leading-relaxed 
                                ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'}">
                                ${textContent}
                            </div>
                            
                            <span class="text-[9px] text-slate-400 px-1 mt-1 opacity-70">${timeStr}</span>
                        </div>`;
                    } catch (itemErr) {
                        return ''; // Nếu tin này lỗi thì ẩn nó đi
                    }
                }).join('');
            }
            
            // Cuộn xuống cuối
            setTimeout(() => { 
                if(content) content.scrollTop = content.scrollHeight; 
            }, 100);

            // Gắn sự kiện Gửi (Bảo vệ chống gắn nhiều lần)
            const sendBtn = document.querySelector('[data-action="sendChat"]');
            if(sendBtn && !sendBtn.dataset.bound) {
                const newBtn = sendBtn.cloneNode(true);
                sendBtn.parentNode.replaceChild(newBtn, sendBtn);
                newBtn.dataset.bound = "true"; // Đánh dấu đã gắn

                const handleSend = () => Chat.sendMessage(user);
                newBtn.addEventListener('click', handleSend);
                
                const inp = document.getElementById('chat-input');
                if(inp) {
                    inp.onkeydown = (e) => { 
                        if(e.key === 'Enter') handleSend(); 
                    };
                }
            }

        } catch (globalErr) {
            console.error(globalErr);
            // Không hiển thị lỗi ra giao diện chat để tránh vỡ layout
        }
    },

    sendMessage: async (user) => {
        if (!user) return Utils.toast("Chưa đăng nhập!", "err");
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
            console.error(e);
            Utils.toast("Lỗi gửi tin!", "err");
            inp.value = text;
        }
    }
};
