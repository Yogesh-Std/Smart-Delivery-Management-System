function getToken(){return localStorage.getItem('token')}
function getUser(){try{return JSON.parse(localStorage.getItem('user')||'null')}catch{return null}}
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');location.href='/login.html'}
async function api(url,options={}){const headers={...(options.headers||{})};if(!headers['Content-Type']&&options.body)headers['Content-Type']='application/json';if(getToken())headers.Authorization='Bearer '+getToken();const r=await fetch(url,{...options,headers});const data=await r.json().catch(()=>({message:'Invalid server response'}));if(!r.ok)throw new Error(data.message||'Request failed');return data}
function requireLogin(){if(!getToken()){location.href='/login.html';return false}return true}
function money(v){return '₹'+Number(v).toLocaleString('en-IN',{minimumFractionDigits:2})}
function nav(){const u=getUser();const el=document.getElementById('navLinks');if(!el)return;el.innerHTML=`<a href="/">Home</a><a href="/products.html">Products</a>${u?'<a href="/orders.html">Orders</a><a href="/cart.html">Cart</a>':''}${u?.role==='admin'?'<a href="/admin.html">Admin</a>':''}${u?.role==='delivery'?'<a href="/delivery.html">Delivery</a>':''}${u?`<span>${u.name}</span><button class="btn secondary" onclick="logout()">Logout</button>`:'<a href="/login.html">Login</a><a class="btn" href="/register.html">Register</a>'}`}
document.addEventListener('DOMContentLoaded',nav);
