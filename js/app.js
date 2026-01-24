// ... trong hàm syncData ...
syncData: () => {
    // Thêm 'spawn_inventory' vào danh sách
    ['employees','houses','harvest_logs','tasks','shipping','chat','products','materials', 'spawn_inventory'].forEach(c => {
        onSnapshot(collection(db, `${ROOT_PATH}/${c}`), (snap) => {
            // ... Logic cũ giữ nguyên ...
            
            // Logic riêng cho Kho A (nếu cần xử lý global, nhưng ở đây SX.init đã tự lo rồi)
            // Chỉ cần đảm bảo App.data có chứa nó để truyền đi các module khác nếu cần
            App.data[c] = snap.docs.map(d => ({...d.data(), _id: d.id}));
            
            // ...
        });
    });
    // Gọi SX.init() để nó tự lắng nghe riêng
    if(SX.init) SX.init();
},
// ...
