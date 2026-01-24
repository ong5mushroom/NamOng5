import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if(c.classList.contains('hidden')) return;
        
        const g1 = data.products.filter(p => p.group == '1');
        
        c.innerHTML = `
        <div class="space-y-4">
            <div id="zone-th" class="glass p-5 border-l-4 border-green-500">
                <div class="flex justify-between items-center mb-4"><span class="font-black text-slate-700 uppercase">Nhập Kho</span><button id="btn-add-prod" class="text-xs bg-slate-100 px-3 py-1 rounded text-blue-600 font-bold">+ Mã SP</button></div>
                <div class="space-y-4">
                    <select id="th-area" class="font-bold text-green-700 w-full p-3 bg-slate-50 rounded"><option value="">-- Chọn Nguồn --</option>${data.houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="KhuCheBien">Khu Chế Biến</option></select>
                    <div class="bg-slate-50 p-3 rounded-xl"><h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">Nấm Tươi</h4><div class="grid grid-cols-3 gap-3">${g1.map(p=>`<div><label class="text-[9px] font-bold text-slate-500 block truncate text-center mb-1">${p.name}</label><input type="number" id="th-${p.code}" class="text-center font-bold text-sm w-full p-2 rounded border" placeholder="-"></div>`).join('')}</div></div>
                    <button id="btn-save-th" class="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg active:scale-95">LƯU KHO</button>
                </div>
            </div>
        </div>`;

        // Gắn sự kiện (Riêng biệt cho module này)
        document.getElementById('btn-save-th').onclick = async () => {
            const area = document.getElementById('th-area').value;
            if(!area) return Utils.toast("Chưa chọn nguồn!");
            let d = {}, total = 0;
            data.products.forEach(p => { const el = document.getElementById(`th-${p.code}`); if(el && Number(el.value)>0) { d[p.code]=Number(el.value); total+=Number(el.value); el.value=''; } });
            if(total===0) return Utils.toast("Chưa nhập số!");
            await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), { area, details:d, total, user: user.name, time:Date.now() });
            Utils.toast(`Đã lưu ${total} đơn vị`);
        };

        document.getElementById('btn-add-prod').onclick = () => {
            Utils.modal("Thêm Mã Mới", `<div><label class="text-xs font-bold text-slate-500">Tên</label><input id="new-prod-name" placeholder="VD: Nấm Mỡ"></div><div><label class="text-xs font-bold text-slate-500">Mã (ko dấu)</label><input id="new-prod-code" placeholder="VD: nam_mo"></div><select id="new-prod-group" class="w-full p-2 border rounded"><option value="1">Tươi</option><option value="2">Phụ</option></select>`, [{id:'btn-save-prod', text:'Lưu Mã'}]);
            setTimeout(() => document.getElementById('btn-save-prod').onclick = async () => {
                const n = document.getElementById('new-prod-name').value; const cd = document.getElementById('new-prod-code').value; const g = document.getElementById('new-prod-group').value;
                if(n && cd) { await addDoc(collection(db, `${ROOT_PATH}/products`), { name:n, code:cd, group:g }); Utils.modal(null); Utils.toast("Đã thêm mã"); }
            }, 100);
        };
    }
};
