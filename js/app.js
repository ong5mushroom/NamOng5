// ... các import cũ ...

const App = {
    data: {
        houses: [],
        spawn_inventory: [],
        materials: [],
        chat: [],
        users: [] // <--- 1. THÊM MẢNG USERS VÀO DATA
    },
    
    // ...

    init: () => {
        // ... Các onSnapshot cũ (Chat, Kho, Nhà...) giữ nguyên ...

        // --- 2. THÊM ĐOẠN NÀY ĐỂ LẤY DANH SÁCH USER ---
        onSnapshot(collection(db, `${ROOT_PATH}/users`), (snap) => {
            // Lấy dữ liệu và lưu vào biến chung
            App.data.users = snap.docs.map(d => ({...d.data(), id: d.id}));
            
            console.log("Danh sách User tải về:", App.data.users); // Log để kiểm tra

            // Nếu đang mở Modal đăng nhập thì vẽ lại danh sách (nếu cần)
            // Hoặc gọi hàm render Login nếu bạn tách riêng
            App.renderLoginList(); 
        });
        // ----------------------------------------------
    },

    // --- 3. THÊM HÀM VẼ LIST ĐĂNG NHẬP ---
    renderLoginList: () => {
        const select = document.getElementById('login-user-select'); // ID của thẻ <select> trong modal login
        if (select) {
            select.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + 
                App.data.users.map(u => `<option value="${u.id}">${u.name} (${u.role || 'Member'})</option>`).join('');
        }
    },

    // ... (Giữ nguyên các phần còn lại)
};
