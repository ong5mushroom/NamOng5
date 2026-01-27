import { addDoc, collection, db, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const THDG = {
    render: (data, user) => {
        const c = document.getElementById('view-th');
        if (!c || c.classList.contains('hidden')) return;

        // --- FIX LỖI CRASH ---
        if (!data || !data.houses) {
            c.innerHTML = '<div class="text-center p-10 text-slate-400">Đang tải dữ liệu...</div>';
            return;
        }

        try {
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const products = Array.isArray(data.products) ? data.products : [];
            const logs = Array.isArray(data.harvest) ? data.harvest : [];

            // Tính tổng
            const report = {};
            logs.forEach(l => {
                if(l && l.area) {
                    if(!report[l.area]) report[l.area] = 0;
                    report[l.area] += (Number(l.total) || 0);
                }
            });

            const g1 = products.filter(p => p && String(p.group) === '1');
            // ... (g2, g3 tương tự nếu cần)

            c.innerHTML = `
            <div class="space-y-4 pb-24">
                <div class="glass p-4 bg-white">
                    <h4 class="font-bold text-slate-500 text-xs uppercase mb-2">Tổng hợp thu hoạch</h4>
                    <div class="max-h-40 overflow-y-auto space-y-1">
                        ${Object.keys(report).length ? Object.keys(report).map(k => `<div class="flex justify-between text-sm border-b pb-1"><span>${k}</span><span class="font-bold text-green-600">${report[k].toLocaleString()} kg</span></div>`).join('') : '<div class="text-xs text-slate-300">Chưa có dữ liệu</div>'}
                    </div>
                </div>

                <div class="glass p-5 border-l-4 border-green-500">
                    <div class="flex justify-between mb-4"><span class="font-black text-slate-700 uppercase"><i class="fas fa-warehouse text-green-600"></i> Nhập Kho</span>${g1.length===0?'<button id="btn-add-p" class="text-xs bg-slate-100 p-1 rounded">+ Mã</button>':''}</div>
                    <div class="space-y-3">
                        <select id="th-area" class="w-full p-3 border rounded-xl font-bold text-green-700"><option value="">-- Nguồn Thu --</option>${houses.map(h=>`<option value="${h.name}">${h.name}</option>`).join('')}<option value="Mua Ngoài">Mua Ngoài</option></select>
                        ${g1.length ? `<div class="bg-green-50 p-3 rounded-xl"><h5 class="text-xs font-bold text-green-700 mb-2">Nấm Tươi</h5><div class="grid grid-cols-3 gap-2">${g1.map(p=>`<div><label class="text-[9px] block text-center truncate">${p.name}</label><input type="number" id="th-${p.code}" class="w-full p-1 text-center border rounded" placeholder="0"></div>`).join('')}</div></div>` : ''}
                        <button id="btn-save-th" class="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg">LƯU KHO</button>
                    </div>
                </div>
            </div>`;

            setTimeout(() => {
                const btnSave = document.getElementById('btn-save-th');
                if(btnSave) {
                    const n = btnSave.cloneNode(true); btnSave.parentNode.replaceChild(n, btnSave);
                    n.onclick = async () => {
                        const area = document.getElementById('th-area').value;
                        if(!area) return Utils.toast("Chưa chọn nguồn!", "err");
                        let d={}, total=0;
                        products.forEach(p => {
                            const el = document.getElementById(`th-${p.code}`);
                            if(el && Number(el.value)>0) { d[p.code]=Number(el.value); total+=Number(el.value); el.value=''; }
                        });
                        if(total===0) return Utils.toast("Chưa nhập số!", "err");
                        await addDoc(collection(db, `${ROOT_PATH}/harvest_logs`), {area, details:d, total, user:user.name, time:Date.now()});
                        Utils.toast(`Đã lưu ${total}kg`);
                    }
                }
                const btnAddP = document.getElementById('btn-add-p');
                if(btnAddP) btnAddP.onclick = () => { Utils.modal("Thêm Mã", `<div><label>Tên</label><input id="n-n" class="w-full border p-2"></div><div><label>Mã</label><input id="n-c" class="w-full border p-2"></div><select id="n-g" class="w-full border p-2 mt-2"><option value="1">Tươi</option></select>`, [{id:'s-p', text:'Lưu'}]); setTimeout(()=>document.getElementById('s-p').onclick=async()=>{const n=document.getElementById('n-n').value, c=document.getElementById('n-c').value, g=document.getElementById('n-g').value; if(n&&c){await addDoc(collection(db, `${ROOT_PATH}/products`), {name:n, code:c, group:g}); Utils.modal(null);}},100); }
            }, 100);

        } catch (e) { c.innerHTML = `<div class="text-red-500 p-4">Lỗi THDG: ${e.message}</div>`; }
    }
};
