// app.js (Hoặc main.js của bạn)
import { db, collection, onSnapshot, ROOT_PATH } from './config.js';
import { Home } from './modules/home.js';
import { SX } from './modules/sx.js'; // Import module SX

const App = {
    data: {
        houses: [],
        spawn_inventory: [],
        materials: []
    },
    
    currentTab: 'home', // Mặc định là home

    init: () => {
        // 1. LẮNG NGHE DỮ LIỆU TỪ FIREBASE (Realtime)
        // Khi DB thay đổi, nó tự động cập nhật biến App.data và vẽ lại giao diện
        
        // Lắng nghe Nhà
        onSnapshot(collection(db, `${ROOT_PATH}/houses`), (snap) => {
            App.data.houses = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.renderCurrentTab();
        });

        // Lắng nghe Kho Phôi (Quan trọng: Sửa lỗi mất dữ liệu)
        onSnapshot(collection(db, `${ROOT_PATH}/spawn_inventory`), (snap) => {
            App.data.spawn_inventory = snap.docs.map(d => ({...d.data(), _id: d.id}));
            // Sắp xếp theo ngày mới nhất
            App.data.spawn_inventory.sort((a,b) => new Date(b.date) - new Date(a.date));
            App.renderCurrentTab();
        });
        
        // Lắng nghe Vật tư
        onSnapshot(collection(db, `${ROOT_PATH}/materials`), (snap) => {
            App.data.materials = snap.docs.map(d => ({...d.data(), _id: d.id}));
            App.renderCurrentTab();
        });

        // 2. Xử lý chuyển Tab
        document.getElementById('nav-home').onclick = () => App.switchTab('home');
        document.getElementById('nav-sx').onclick = () => App.switchTab('sx');
    },

    switchTab: (tabName) => {
        App.currentTab = tabName;
        // Ẩn tất cả view
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        // Hiện view được chọn
        document.getElementById(`view-${tabName}`).classList.remove('hidden');
        App.renderCurrentTab();
    },

    renderCurrentTab: () => {
        // Truyền TOÀN BỘ dữ liệu mới nhất vào các module con
        if (App.currentTab === 'home') {
            Home.render(App.data); 
        } else if (App.currentTab === 'sx') {
            SX.render(App.data);
        }
    }
};

App.init();
