const KEY = "invenora_v1";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const defaultCategories = ["Elektronik","Makanan","Alat Tulis","Pakaian","Perlengkapan Rumah"];
const defaultUnits = ["pcs","unit","box","kg","liter"];

let db = JSON.parse(localStorage.getItem(KEY) || '{"users":[],"items":[],"categories":[],"units":[],"history":[]}');
db.categories = [...new Set([...defaultCategories, ...(db.categories||[])])];
db.units = [...new Set([...defaultUnits, ...(db.units||[])])];
let currentUser = null, currentPage = "dashboard", editingId = null, selectedImage = "";

function save(){localStorage.setItem(KEY, JSON.stringify(db))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function toast(msg){const x=document.createElement("div");x.className="toast";x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(v){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v)||0)}
function formatDate(d){return new Date(d).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}

setTimeout(()=>{$("#splash").classList.add("hidden"); checkAuth()},1500);

function checkAuth(){
  const session=localStorage.getItem("invenora_session");
  if(session && db.users.some(u=>u.username===session)){currentUser=db.users.find(u=>u.username===session);openApp()}
  else showAuth();
}
function showAuth(){
  $("#authPage").classList.remove("hidden");$("#app").classList.add("hidden");
  $("#loginForm").classList.remove("hidden");$("#registerForm").classList.add("hidden");$("#backLogin").classList.add("hidden");
}
$("#showRegister").onclick=()=>{$("#loginForm").classList.add("hidden");$("#registerForm").classList.remove("hidden");$("#backLogin").classList.remove("hidden");$("#loginMessage").textContent=""};
$("#backLogin").onclick=()=>showAuth();

$("#registerForm").onsubmit=e=>{
 e.preventDefault();
 const name=$("#regName").value.trim(), username=$("#regUsername").value.trim().toLowerCase(), pass=$("#regPassword").value, confirm=$("#regConfirm").value;
 if(pass!==confirm){$("#registerMessage").textContent="Konfirmasi password tidak sama.";return}
 if(db.users.some(u=>u.username===username)){ $("#registerMessage").textContent="Username sudah digunakan.";return}
 db.users.push({id:uid(),name,username,password:pass,createdAt:new Date().toISOString()});save();
 $("#registerMessage").style.color="var(--green)";$("#registerMessage").textContent="Akun berhasil dibuat. Silakan login.";
 setTimeout(showAuth,700);
};
$("#loginForm").onsubmit=e=>{
 e.preventDefault();
 const username=$("#loginUsername").value.trim().toLowerCase(),pass=$("#loginPassword").value;
 const u=db.users.find(x=>x.username===username&&x.password===pass);
 if(!u){$("#loginMessage").textContent="Username atau password salah.";return}
 currentUser=u;localStorage.setItem("invenora_session",u.username);openApp();
};
$$(".eye").forEach(b=>b.onclick=()=>{const i=$("#"+b.dataset.target);i.type=i.type==="password"?"text":"password"});
function logout(){localStorage.removeItem("invenora_session");currentUser=null;showAuth()}

function openApp(){$("#authPage").classList.add("hidden");$("#app").classList.remove("hidden");$("#topUser").textContent=currentUser.name;renderPage("dashboard")}
$("#mobileMenu").onclick=()=>$(".sidebar").classList.toggle("open");
$$(".nav-item").forEach(b=>b.onclick=()=>{renderPage(b.dataset.page);$(".sidebar").classList.remove("open")});

function renderPage(page){
 currentPage=page;
 const titles={dashboard:"Beranda",items:"Daftar Barang",add:editingId?"Edit Barang":"Tambah Barang",history:"Riwayat Aktivitas",profile:"Profil"};
 $("#pageTitle").textContent=titles[page];$("#welcomeText").textContent=page==="dashboard"?`Selamat datang, ${currentUser.name}`:"Kelola data inventaris Anda";
 $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 if(page==="dashboard")renderDashboard(); if(page==="items")renderItems(); if(page==="add")renderForm(); if(page==="history")renderHistory(); if(page==="profile")renderProfile();
}

function renderDashboard(){
 const items=db.items.filter(i=>i.owner===currentUser.username);
 $("#content").innerHTML=`
 <section class="hero"><div><h1>Halo, ${esc(currentUser.name)} 👋</h1><p>Kelola stok dan informasi barang toko Anda dengan mudah.</p></div><button class="primary" onclick="startAdd()">＋ Tambah Barang</button></section>
 <div class="stats">
  <div class="stat"><small>Total Barang</small><strong>${items.length}</strong></div>
  <div class="stat"><small>Stok Tersedia</small><strong>${items.reduce((a,i)=>a+Number(i.stock||0),0)}</strong></div>
  <div class="stat"><small>Stok Menipis</small><strong>${items.filter(i=>Number(i.stock)<=2).length}</strong></div>
  <div class="stat"><small>Stok Habis</small><strong>${items.filter(i=>Number(i.stock)<=0).length}</strong></div>
 </div>
 <section class="section"><div class="section-head"><h3>Barang Terbaru</h3><button class="secondary" onclick="renderPage('items')">Lihat Semua</button></div>${items.length?`<div class="item-grid">${items.slice().reverse().slice(0,4).map(itemCard).join("")}</div>`:`<div class="empty"><div class="box">▱</div><h3>Belum ada data barang</h3><p>Mulai dengan menambahkan barang pertama Anda.</p><button class="primary" onclick="startAdd()">＋ Tambah Barang</button></div>`}</section>`;
}
function itemCard(i){return `<article class="item-card" onclick="showDetail('${i.id}')"><div class="item-image">${i.image?`<img src="${i.image}" alt="">`:`<span>◇</span>`}</div><div class="item-body"><h3>${esc(i.name)}</h3><span class="tag">${esc(i.category)}</span><div class="item-meta"><div><small>Kode</small><b>${esc(i.code)}</b></div><div><small>Stok</small><b>${i.stock} ${esc(i.unit)}</b></div><div><small>Harga</small><b>${money(i.price)}</b></div><div><small>Supplier</small><b>${esc(i.supplier)}</b></div></div></div></article>`}

function renderItems(){
 const items=db.items.filter(i=>i.owner===currentUser.username);
 $("#content").innerHTML=`<section class="section"><div class="section-head"><h3>Daftar Barang</h3><div class="search"><input id="searchItem" placeholder="Cari kode atau nama barang..."><button class="primary" onclick="startAdd()">＋ Tambah</button></div></div><div class="filters" id="catFilters"><button class="chip active" data-cat="">Semua</button>${db.categories.map(c=>`<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div><div id="itemList"></div></section>`;
 let cat="";const input=$("#searchItem");
 const paint=()=>{let q=input.value.toLowerCase();let arr=items.filter(i=>(!cat||i.category===cat)&&(i.name.toLowerCase().includes(q)||i.code.toLowerCase().includes(q)));$("#itemList").innerHTML=arr.length?`<div class="item-grid">${arr.map(itemCard).join("")}</div>`:`<div class="empty"><div class="box">◇</div><h3>Tidak ada barang</h3><p>Belum ada barang yang cocok dengan pencarian.</p></div>`};
 input.oninput=paint;$$("[data-cat]").forEach(b=>b.onclick=()=>{$$("[data-cat]").forEach(x=>x.classList.remove("active"));b.classList.add("active");cat=b.dataset.cat;paint()});paint();
}
function startAdd(){editingId=null;selectedImage="";renderPage("add")}
function renderForm(){
 const item=editingId?db.items.find(i=>i.id===editingId):null;
 selectedImage=item?.image||"";
 $("#content").innerHTML=`<section class="section form-section"><div class="section-head"><div><h3>${item?"Edit Barang":"Tambah Barang"}</h3><p>Lengkapi informasi barang di bawah ini.</p></div></div>
 <form id="itemForm" class="form-grid">
 <label>Kode Barang<input id="fCode" required placeholder="Contoh: BRG001" value="${esc(item?.code||"")}"></label>
 <label>Nama Barang<input id="fName" required placeholder="Masukkan nama barang" value="${esc(item?.name||"")}"></label>
 <label>Kategori<select id="fCategory">${db.categories.map(c=>`<option ${item?.category===c?"selected":""}>${esc(c)}</option>`).join("")}</select></label>
 <label>Harga<input id="fPrice" type="number" min="0" required placeholder="Masukkan harga" value="${item?.price??""}"></label>
 <label>Stok<input id="fStock" type="number" min="0" required placeholder="Masukkan jumlah stok" value="${item?.stock??""}"></label>
 <label>Satuan<select id="fUnit">${db.units.map(c=>`<option ${item?.unit===c?"selected":""}>${esc(c)}</option>`).join("")}</select></label>
 <label class="full-row">Supplier<input id="fSupplier" required placeholder="Masukkan nama supplier" value="${esc(item?.supplier||"")}"></label>
 <div class="full-row"><label>Gambar Produk<div class="file-box">Pilih gambar dari penyimpanan perangkat<input id="fImage" type="file" accept="image/*"><div id="imagePreview">${selectedImage?`<img class="preview" src="${selectedImage}">`:""}</div></div></label></div>
 <div class="full-row form-actions"><button type="button" class="secondary" onclick="renderPage('items')">Batal</button><button class="primary" type="submit">${item?"Simpan Perubahan":"Simpan Barang"}</button></div>
 </form>
 <div class="form-actions" style="justify-content:flex-start"><button class="secondary" type="button" onclick="openOptionModal('category')">＋ Tambah Kategori</button><button class="secondary" type="button" onclick="openOptionModal('unit')">＋ Tambah Satuan</button></div>
 </section>`;
 $("#fImage").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{selectedImage=r.result;$("#imagePreview").innerHTML=`<img class="preview" src="${selectedImage}">`};r.readAsDataURL(f)};
 $("#itemForm").onsubmit=saveItem;
}
function saveItem(e){
 e.preventDefault();const code=$("#fCode").value.trim(), name=$("#fName").value.trim();
 const duplicate=db.items.some(i=>i.owner===currentUser.username&&i.code.toLowerCase()===code.toLowerCase()&&i.id!==editingId);
 if(duplicate){toast("Kode barang sudah digunakan.");return}
 const data={id:editingId||uid(),owner:currentUser.username,code,name,category:$("#fCategory").value,price:Number($("#fPrice").value),stock:Number($("#fStock").value),unit:$("#fUnit").value,supplier:$("#fSupplier").value.trim(),image:selectedImage,updatedAt:new Date().toISOString()};
 if(editingId){const idx=db.items.findIndex(i=>i.id===editingId);db.items[idx]={...db.items[idx],...data};addHistory("Edit Barang",data.name,data.code,"edit")}
 else {data.createdAt=new Date().toISOString();db.items.push(data);addHistory("Tambah Barang",data.name,data.code,"add")}
 save();toast(editingId?"Barang diperbarui":"Barang berhasil ditambahkan");editingId=null;setTimeout(()=>renderPage("items"),300);
}
function showDetail(id){
 const i=db.items.find(x=>x.id===id);if(!i)return;
 $("#modalRoot").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="detail"><div class="detail-image">${i.image?`<img src="${i.image}">`:`<span style="font-size:70px">◇</span>`}</div><div class="detail-info"><h1>${esc(i.name)}</h1><span class="tag">${esc(i.category)}</span><div class="detail-list" style="margin-top:14px"><div class="detail-row"><small>Kode Barang</small><b>${esc(i.code)}</b></div><div class="detail-row"><small>Harga</small><b>${money(i.price)}</b></div><div class="detail-row"><small>Stok</small><b>${i.stock} ${esc(i.unit)}</b></div><div class="detail-row"><small>Satuan</small><b>${esc(i.unit)}</b></div><div class="detail-row"><small>Supplier</small><b>${esc(i.supplier)}</b></div><div class="detail-row"><small>Tanggal Masuk</small><b>${formatDate(i.createdAt||i.updatedAt)}</b></div></div></div></div><div class="modal-actions item-actions"><button class="secondary action-close" onclick="closeModal()">Tutup</button><div class="action-right"><button class="secondary action-edit" onclick="editItem('${i.id}')">✎ Edit</button><button class="danger action-delete" onclick="confirmDelete('${i.id}')">⌫ Hapus</button></div></div></div></div>`;
}
function closeModal(){$("#modalRoot").innerHTML=""}
function editItem(id){closeModal();editingId=id;renderPage("add")}
function confirmDelete(id){
 const i=db.items.find(x=>x.id===id);if(!i)return;
 $("#modalRoot").innerHTML=`<div class="modal-backdrop"><div class="modal" style="text-align:center"><div style="font-size:45px;color:#ef3e4a">♲</div><h2>Hapus Barang?</h2><p>Apakah Anda yakin ingin menghapus <b>${esc(i.name)}</b>? Data yang dihapus tidak dapat dikembalikan.</p><div class="modal-actions confirm-actions"><button class="secondary" onclick="closeModal()">Batal</button><button class="danger action-delete" onclick="deleteItem('${id}')">⌫ Hapus</button></div></div></div>`;
}
function deleteItem(id){const i=db.items.find(x=>x.id===id);db.items=db.items.filter(x=>x.id!==id);addHistory("Hapus Barang",i.name,i.code,"delete");save();closeModal();toast("Barang berhasil dihapus");renderPage("items")}
function openOptionModal(type){
 const isCat=type==="category", title=isCat?"Tambah Kategori":"Tambah Satuan", list=isCat?db.categories:db.units;
 $("#modalRoot").innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${title}</h2><label class="form-grid"><span>Nama ${isCat?"Kategori":"Satuan"}<input id="optionName" placeholder="${isCat?"Contoh: Elektronik":"Contoh: pcs"}"></span></label><h4>${isCat?"Kategori":"Satuan"} Tersedia</h4><div class="filters">${list.map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><div class="modal-actions"><button class="secondary" onclick="closeModal()">Batal</button><button class="primary" onclick="saveOption('${type}')">Simpan</button></div></div></div>`;
}
function saveOption(type){const v=$("#optionName").value.trim();if(!v)return toast("Isi nama terlebih dahulu");const arr=type==="category"?db.categories:db.units;if(arr.some(x=>x.toLowerCase()===v.toLowerCase()))return toast("Pilihan sudah tersedia");arr.push(v);save();closeModal();toast("Pilihan ditambahkan");renderPage("add")}
function addHistory(action,name,code,type){db.history.push({id:uid(),owner:currentUser.username,action,name,code,type,date:new Date().toISOString()});db.history=db.history.slice(-100)}
function renderHistory(){
 const rows=db.history.filter(h=>h.owner===currentUser.username).slice().reverse();
 $("#content").innerHTML=`<section class="section"><div class="section-head"><h3>Riwayat Aktivitas</h3></div>${rows.length?`<div class="history-list">${rows.map(h=>`<div class="history-row"><div class="history-icon">${h.type==="delete"?"−":h.type==="edit"?"✎":"＋"}</div><div style="flex:1"><b>${esc(h.action)}</b><div>${esc(h.name)} · ${esc(h.code)}</div><small>${formatDate(h.date)}</small></div></div>`).join("")}</div>`:`<div class="empty"><div class="box">◷</div><h3>Belum ada aktivitas</h3></div>`}</section>`;
}
function renderProfile(){
  $("#content").innerHTML=`<section class="section profile-card"><div class="profile-head"><img class="profile-logo" src="assets/invenora-logo.png"><h2>${esc(currentUser.name)}</h2><p style="color:var(--muted)">@${esc(currentUser.username)}</p></div><div class="profile-menu"><button onclick="alert('Akun disimpan di perangkat ini menggunakan Local Storage.')">♙ Informasi Akun</button><button onclick="openOptionModal('category')">⚙ Kelola Kategori</button><button onclick="openOptionModal('unit')">⚙ Kelola Satuan</button><button onclick="exportData()">⇩ Backup Data (JSON)</button><button onclick="document.getElementById('importFile').click()">⇧ Pulihkan Data</button><input id="importFile" type="file" accept=".json" class="hidden"><button onclick="showAbout()">ⓘ Tentang Aplikasi</button><details class="group-option"><summary>👥 <span>Anggota Kelompok</span><b>⌄</b></summary><ol><li>Naura Citra Nathania <span>(03)</span></li><li>Pasya Ramadhani Putra Sagita <span>(10)</span></li><li>Raditya Gusti Daniswara <span>(14)</span></li><li>Rendi Aldiano Eka Saputra <span>(19)</span></li><li>Revina Dwi Agustin <span>(21)</span></li><li>Sintya Fitri Adevia <span>(28)</span></li><li>Yulanda Jihan Amelia <span>(39)</span></li><li>Zahrotul Jannah <span>(40)</span></li></ol></details><button class="danger" onclick="resetMyData()">Hapus Data Inventaris Saya</button><button id="logoutBtn" class="profile-logout" onclick="logout()">↪ Keluar dari Akun</button></div></section>`;
  $("#importFile").onchange=e=>importData(e.target.files[0]);
}
function exportData(){const items=db.items.filter(i=>i.owner===currentUser.username), history=db.history.filter(h=>h.owner===currentUser.username);const blob=new Blob([JSON.stringify({items,history,categories:db.categories,units:db.units},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="invenora-backup.json";a.click();URL.revokeObjectURL(a.href)}
function importData(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);db.items=db.items.filter(i=>i.owner!==currentUser.username).concat((x.items||[]).map(i=>({...i,owner:currentUser.username})));db.history=db.history.filter(i=>i.owner!==currentUser.username).concat((x.history||[]).map(i=>({...i,owner:currentUser.username})));db.categories=[...new Set([...db.categories,...(x.categories||[])])];db.units=[...new Set([...db.units,...(x.units||[])])];save();toast("Data berhasil dipulihkan");renderPage("dashboard")}catch{toast("File backup tidak valid")}};r.readAsText(file)}
function resetMyData(){if(!confirm("Hapus semua data inventaris akun ini?"))return;db.items=db.items.filter(i=>i.owner!==currentUser.username);db.history=db.history.filter(i=>i.owner!==currentUser.username);save();toast("Data inventaris dihapus");renderPage("dashboard")}
function showAbout(){alert("Invenora\\nSistem Inventaris Barang\\n\\nCRUD, akun lokal, gambar produk, kategori/satuan, riwayat, pencarian, backup & restore.\\n\\nSemua data tersimpan di Local Storage perangkat/browser ini.")}
