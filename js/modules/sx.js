
import { db, doc, updateDoc, addDoc, collection, ROOT_PATH } from '../config.js';
import { Utils } from '../utils.js';

export const SX = {
    render: (data) => {
        const c = document.getElementById('view-sx');
        if(c.classList.contains('hidden')) return;

        const sorted = [...data.houses].sort((a,b)=>a.name.localeCompare(b.name, 'vi', {numeric:true}));
        const mats = data.materials || [];

        c.innerHTML = `
        <div class="space-y-6">
            <div class="glass p-5 border-l-4 border-blue-500 space-y-4">
                <h3 class="font-black text-slate-700 uppercase flex items-center gap-2"><i class="fas fa-industry"></i> Nhập Phôi (Kho A)</h3>
                <select id="sx-house-select" class="w-full p-3 font-bold bg-slate-50 border rounded-xl outline-none">
                    ${sorted.map(h=>`<option value="${h._id}">${h.name} (${h.currentBatch||'Trống'})</option>`).join('')}
                </select>
                <div class="grid grid-cols-2 gap-3">
                    <input id="sx-strain" placeholder="Mã giống (VD: 012)" class="font-bold">
                    <input id="sx-date" type="date" title="Ngày cấy">
                </div>
                <div class="flex gap-3">
                    <input id="sx-spawn-qty" type="number" placeholder="SL Bịch" class="w-1/2 font-bold text-blue-600 text-lg">
                    <input id="sx-ncc" placeholder="Nhà Cung Cấp" class="w-1/2">
                </div>
                <textarea id="sx-note" placeholder="Ghi chú thêm..." class="h-16 p-2 border rounded-xl w-full"></textarea>
                <button id="btn-setup-batch" class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg btn-action active:scale-95">
                    KÍCH HOẠT LÔ MỚI
                </button>
            </div>
            
            <div class="glass p-5 border-l-4 border-purple-500">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-black text-slate-700 uppercase flex items-center gap-2"><i class="fas fa-boxes"></i> Kho Vật Tư</h3>
                    <button id="btn-add-mat" class="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold btn-action">+ Nhập</button>
                </div>
                <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    ${mats.length ? mats.map(m => `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span class="text-xs font-bold text-slate-600 truncate">${m.name}</span>
                            <div class="text-purple-600 font-black text-sm">${m.qty} <span class="text-[9px] text-slate-400">${m.unit}</span></div>
                        </div>`).join('') : '<span class="text-xs italic text-slate-400 text-center col-span-2">Kho trống</span>'}
                </div>
            </div>
        </div>`;

        // EVENTS
        setTimeout(() => {
            document.getElementById('btn-setup-batch').onclick = async () => {
                const h = document.getElementById('sx-house-select').value;
                const s = document.getElementById('sx-strain').value;
                const q = Number(document.getElementById('sx-spawn-qty').value);
                const ncc = document.getElementById('sx-ncc').value;
                const note = document.getElementById('sx-note').value;
                const date = document.getElementById('sx-date').value || new Date().toISOString().split('T')[0];

                if(!h || !s || !q) return Utils.toast("Thiếu thông tin bắt buộc!", "err");

                await updateDoc(doc(db, `${ROOT_PATH}/houses`, h), { 
                    currentBatch: s, 
                    currentSpawn: q, 
                    status: 'ACTIVE', 
                    startDate: date, 
                    supplier: ncc,
                    note: note 
                });
                Utils.toast(`✅ Đã vào lô ${s} cho nhà nấm`);
            };

            document.getElementById('btn-add-mat').onclick = () => {
                Utils.modal("Nhập Vật Tư", `
                    <input id="mat-name" placeholder="Tên (Cồn, Găng tay...)" class="w-full p-2 border rounded mb-2">
                    <div class="flex gap-2 mb-2">
                        <input id="mat-qty" type="number" placeholder="Số lượng" class="w-2/3 p-2 border rounded">
                        <input id="mat-unit" placeholder="ĐVT" class="w-1/3 p-2 border rounded">
                    </div>
                `, [{id:'submit-mat', text:'Lưu Kho', cls:'bg-purple-600 text-white'}]);

                setTimeout(() => document.getElementById('submit-mat').onclick = async () => {
                    const n = document.getElementById('mat-name').value;
                    const q = Number(document.getElementById('mat-qty').value);
                    const u = document.getElementById('mat-unit').value;
                    if(n && q) {
                        await addDoc(collection(db, `${ROOT_PATH}/materials`), { name:n, qty:q, unit:u, time: Date.now() });
                        Utils.modal(null);
                        Utils.toast("Đã nhập kho vật tư");
                    }
                }, 100);
            };
        }, 0);
    }
};
