document.addEventListener("DOMContentLoaded",()=>{
 const btn=document.querySelector(".menu-btn"),nav=document.querySelector(".nav");
 if(btn&&nav){btn.addEventListener("click",()=>{const open=nav.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰"});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");btn.setAttribute("aria-expanded","false");btn.textContent="☰"}));document.addEventListener("click",e=>{if(!nav.contains(e.target)&&!btn.contains(e.target)){nav.classList.remove("open");btn.setAttribute("aria-expanded","false");btn.textContent="☰"}})}
 const grid=document.querySelector("#galleryGrid");
 if(!grid)return;
 let items=[],filtered=[],current=0;
 const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
 function render(){grid.innerHTML=filtered.length?filtered.map((x,i)=>`<figure data-cat="${esc(x.category)}" data-index="${i}"><img loading="lazy" src="${esc(x.src)}" alt="${esc(x.title)}"><figcaption><b>${esc(x.title)}</b><span>${esc(x.categoryLabel||"")}</span></figcaption></figure>`).join(""):'<div class="gallery-empty">선택한 카테고리에 등록된 이미지가 없습니다.</div>';grid.querySelectorAll("figure").forEach(fig=>fig.addEventListener("click",()=>open(Number(fig.dataset.index))))}
 function apply(filter){filtered=filter==='all'?items.slice():items.filter(x=>x.category===filter);render()}
 document.querySelectorAll(".filter button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter button").forEach(x=>x.classList.remove("active"));b.classList.add("active");apply(b.dataset.filter)}));
 const lb=document.querySelector("#lightbox"),img=document.querySelector("#lightboxImg"),cap=document.querySelector("#lightboxCaption");
 function open(i){if(!filtered.length)return;current=(i+filtered.length)%filtered.length;const x=filtered[current];img.src=x.src;img.alt=x.title;cap.textContent=x.title;lb.classList.add("open");lb.setAttribute("aria-hidden","false");document.body.style.overflow="hidden"}
 function close(){lb.classList.remove("open");lb.setAttribute("aria-hidden","true");document.body.style.overflow=""}
 function move(n){open(current+n)}
 document.querySelector(".lightbox-close")?.addEventListener("click",close);document.querySelector(".lightbox-bg")?.addEventListener("click",close);document.querySelector(".lightbox-prev")?.addEventListener("click",()=>move(-1));document.querySelector(".lightbox-next")?.addEventListener("click",()=>move(1));document.addEventListener("keydown",e=>{if(!lb.classList.contains("open"))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)});
 let sx=0;lb?.addEventListener('touchstart',e=>{sx=e.changedTouches[0].screenX},{passive:true});lb?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-sx;if(Math.abs(dx)>45)move(dx<0?1:-1)},{passive:true});
 fetch("api/gallery",{cache:"no-store"}).then(r=>r.json()).then(j=>{items=j.ok?j.items:[];apply("all")}).catch(()=>{grid.innerHTML='<div class="gallery-empty">갤러리를 불러오지 못했습니다.</div>'});
});
