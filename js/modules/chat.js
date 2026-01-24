import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const Chat = {
    render: (data, user) => {
        const c = document.getElementById('chat-layer');
        if(c.classList.contains('hidden')) return;

        const msgs = data.chat || [];
        const content = document.getElementById('chat-msgs');
        
        // --- 1. FIX LỖI TRẮNG MÀN HÌNH ---
        // Nếu không có tin nhắn, hiển thị thông báo "Chưa có tin nhắn"
        if (msgs.length === 0) {
            content.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center opacity-40">
                    <i class="fas fa-comments text-4xl mb-2 text-slate-400"></i>
                    <p class="text-xs font-bold text-slate-500">Chưa có tin nhắn nào</p>
                    <p class="text-[10px] text-slate-400">Hãy là người đầu tiên nhắn tin!</p>
                </div>`;
            return;
        }

        // --- 2. VẼ TIN NHẮN (Cải thiện màu sắc) ---
        content.innerHTML = msgs.map((m, index) => {
            const isMe = String(m.senderId) === String(user.id);
            // Kiểm tra tin nhắn liên tiếp để ẩn tên
            const isPrevSame = index > 0 && String(msgs[index-1].senderId) === String(m.senderId);
            
            return `
            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 animate-pop w-full">
                ${!isPrevSame && !isMe ? `<span class="text-[9px] text-slate-500 px-2 font-bold mt-2">${m.senderName}</span>` : ''}
                
                <div class="max-w-[80%] px-4 py-2 text-sm shadow-sm break-words
                    ${isMe 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                        : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
                    }">
                    ${m.text}
                </div>
                
                <span class="text-[8px] text-slate-300 px-1 mt-0.5 select-none">
                    ${new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                </span>
            </div>`;
        }).join('');
        
        // Tự động cuộn xuống cuối
        setTimeout(() => content.scrollTop = content.scrollHeight, 0);

        // --- 3. XỬ LÝ GỬI TIN ---
        const sendBtn = document.querySelector('[data-action="sendChat"]');
        if(sendBtn) {
            // Clone nút để xóa các event listener cũ (tránh gửi đúp)
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            
            // Xử lý khi bấm nút Gửi
            newBtn.addEventListener('click', async () => Chat.sendMessage(user));
            
            // Xử lý khi nhấn Enter
            const input = document.getElementById('chat-input');
            input.onkeydown = (e) => {
                if(e.key === 'Enter') Chat.sendMessage(user);
            };
        }
    },

    sendMessage: async (user) => {
        const inp = document.getElementById('chat-input');
        const text = inp.value.trim();
        if(!text) return;

        inp.value = ''; // Xóa ô nhập ngay lập tức cho mượt
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
            inp.value = text; // Trả lại tin nhắn nếu lỗi
        }
    }
};
