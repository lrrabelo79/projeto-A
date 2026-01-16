// ======= CONTEÚDO =======
// ✅ IMPORTANTE: vírgula entre os objetos!
const PAGES = [
  { title:"GÊNESIS 1:1", text:"Versículo 1", img:"GENESIS/G1-1.png" },
  { title:"Capítulo 2", text:"Página 2 (esquerda)." },
  { title:"Capítulo 3", text:"Página 3 (direita)." },
  { title:"Capítulo 4", text:"Página 4 (esquerda)." },
  { title:"Capítulo 5", text:"Página 5 (direita)." },
  { title:"Capítulo 6", text:"Página 6 (esquerda)." },
];

const bookEl     = document.getElementById("book");
const coverEl    = document.getElementById("cover");
const fixedLeft  = document.getElementById("fixedLeft");
const fixedRight = document.getElementById("fixedRight");
const leavesEl   = document.getElementById("leaves");
const nextZone   = document.getElementById("nextZone");
const prevZone   = document.getElementById("prevZone");

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function pageMarkup(pageObj, pageNumber, side){
  const footerLeft  = side === "left"  ? `<span>${pageNumber}</span>` : `<span></span>`;
  const footerRight = side === "right" ? `<span>${pageNumber}</span>` : `<span></span>`;

  const title = escapeHtml(pageObj?.title || "");
  const text  = escapeHtml(pageObj?.text  || "");

  let media = "";
  if (pageObj?.img) {
    media = `
      <figure class="media">
        <img src="${pageObj.img}" alt="${title}">
      </figure>
    `;
  }

  return `
    <div class="content">
      <h2>${title}</h2>
      ${text ? `<p>${text}</p>` : ""}
      ${media}
      <div class="footer">${footerLeft}${footerRight}</div>
    </div>
  `;
}

// Monta folhas: (ímpar = direita/front) e (par = esquerda/back)
const leaves = [];
for (let i = 0; i < PAGES.length; i += 2) {
  leaves.push({
    odd: PAGES[i],
    even: PAGES[i+1] || { title:"", text:"" },
    oddNum: i + 1,
    evenNum: i + 2
  });
}

// Render folhas em pilha
leaves.forEach((lf, idx) => {
  const z = (leaves.length - idx) + 10;
  const leaf = document.createElement("div");
  leaf.className = "leaf";
  leaf.dataset.index = String(idx);
  leaf.dataset.z = String(z);
  leaf.style.zIndex = String(z);

  leaf.innerHTML = `
    <div class="front">${pageMarkup(lf.odd, lf.oddNum, "right")}</div>
    <div class="back">${pageMarkup(lf.even, lf.evenNum, "left")}</div>
  `;
  leavesEl.appendChild(leaf);
});

const leafEls = Array.from(document.querySelectorAll(".leaf"));

// ====== ESTADO ======
let isOpen = false;
let current = 0;

let isDragging = false;
let dragSide = null; // "next" | "prev"
let dragLeaf = null;
let startX = 0;

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function setTurning(el, on){ el?.classList.toggle("turning", !!on); }

function setInstantTransform(el, deg){
  el.style.transition = "none";
  el.style.transform = `rotateY(${deg}deg)`;
}

function sendLeafToBottom(el){
  const idx = Number(el.dataset.index || 0);
  el.style.zIndex = String(1 + idx);
}
function restoreLeafZ(el){
  el.style.zIndex = el.dataset.z;
}

function updateFixedPages(){
  const rightLeaf = leaves[current];
  const leftLeaf  = leaves[current - 1];

  fixedRight.innerHTML = rightLeaf
    ? pageMarkup(rightLeaf.odd, rightLeaf.oddNum, "right")
    : "";

  fixedLeft.innerHTML = leftLeaf
    ? pageMarkup(leftLeaf.even, leftLeaf.evenNum, "left")
    : "";
}

function openCover(){
  isOpen = true;
  bookEl.classList.remove("closed");
  bookEl.classList.add("open");
  updateFixedPages();
}

function closeBook(){
  // desfaz todas as folhas
  leafEls.forEach((lf) => {
    lf.classList.remove("flipped");
    restoreLeafZ(lf);
  });

  current = 0;
  isOpen = false;

  bookEl.classList.add("closed");
  bookEl.classList.remove("open");
  updateFixedPages();
}

function canGoNext(){
  if (!isOpen) return true; // capa abre
  return current < leafEls.length;
}

function canGoPrev(){
  if (!isOpen) return false;
  return current > 0;
}

function commitNext(){
  if (!canGoNext()) return;
  if (!isOpen){ openCover(); return; }

  const lf = leafEls[current];
  setTurning(lf, true);
  lf.classList.add("flipped");
  sendLeafToBottom(lf);
  window.setTimeout(() => setTurning(lf, false), 220);

  current++;
  updateFixedPages();
}

function commitPrev(){
  if (!isOpen) return;

  // ✅ se voltou tudo, fecha o livro
  if (current === 0){
    closeBook();
    return;
  }

  const lf = leafEls[current - 1];
  setTurning(lf, true);
  lf.classList.remove("flipped");
  restoreLeafZ(lf);
  window.setTimeout(() => setTurning(lf, false), 220);

  current--;
  updateFixedPages();

  // ✅ se chegou na capa, fecha
  if (current === 0){
    closeBook();
  }
}

// Clique
nextZone.addEventListener("click", commitNext);
prevZone.addEventListener("click", commitPrev);

// Drag
function angleFromDrag(dx, side){
  const halfW = bookEl.getBoundingClientRect().width * 0.5;
  const progress = clamp(Math.abs(dx) / (halfW * 0.85), 0, 1);
  const ang = -180 * progress;
  return (side === "next") ? ang : (-180 + 180 * progress);
}

function pointerDown(e, side){
  if (side === "next" && !canGoNext()) return;
  if (side === "prev" && !canGoPrev()) {
    // se estiver aberto mas current==0: fecha
    if (isOpen && current === 0) closeBook();
    return;
  }

  isDragging = true;
  dragSide = side;
  startX = e.clientX;

  // capa
  if (!isOpen && side === "next"){
    dragLeaf = coverEl;
    setTurning(dragLeaf, true);
    setInstantTransform(dragLeaf, 0);
    dragLeaf.setPointerCapture?.(e.pointerId);
    return;
  }

  // folhas
  dragLeaf = (side === "next") ? leafEls[current] : leafEls[current - 1];
  setTurning(dragLeaf, true);

  const initialDeg = (side === "next") ? 0 : -180;
  setInstantTransform(dragLeaf, initialDeg);
  dragLeaf.setPointerCapture?.(e.pointerId);
}

function pointerMove(e){
  if (!isDragging || !dragLeaf) return;
  const dx = e.clientX - startX;
  const deg = angleFromDrag(dx, dragSide);
  setInstantTransform(dragLeaf, deg);
}

function pointerUp(e){
  if (!isDragging || !dragLeaf) return;

  const dx = e.clientX - startX;
  const halfW = bookEl.getBoundingClientRect().width * 0.5;
  const threshold = halfW * 0.25;

  dragLeaf.style.transition = "";

  // capa
  if (!isOpen && dragLeaf === coverEl){
    if (dx < -threshold) openCover();
    dragLeaf.style.transform = "";
    window.setTimeout(() => {
      setTurning(dragLeaf, false);
      dragLeaf = null; isDragging = false; dragSide = null;
    }, 220);
    return;
  }

  // folhas
  if (dragSide === "next") {
    if (dx < -threshold) {
      dragLeaf.style.transform = "";
      dragLeaf.classList.add("flipped");
      sendLeafToBottom(dragLeaf);
      current++;
      updateFixedPages();
    } else {
      dragLeaf.style.transform = "";
    }
  } else {
    if (dx > threshold) {
      dragLeaf.style.transform = "";
      dragLeaf.classList.remove("flipped");
      restoreLeafZ(dragLeaf);
      current--;
      updateFixedPages();

      // ✅ se voltou tudo, fecha
      if (current === 0) closeBook();
    } else {
      dragLeaf.style.transform = "";
      dragLeaf.classList.add("flipped");
    }
  }

  window.setTimeout(() => {
    setTurning(dragLeaf, false);
    dragLeaf = null; isDragging = false; dragSide = null;
  }, 220);
}

nextZone.addEventListener("pointerdown", (e) => pointerDown(e, "next"));
prevZone.addEventListener("pointerdown", (e) => pointerDown(e, "prev"));
window.addEventListener("pointermove", pointerMove);
window.addEventListener("pointerup", pointerUp);

// Teclado
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") commitNext();
  if (e.key === "ArrowLeft") commitPrev();
});

// ✅ recalcula ao girar
function refreshLayout(){
  updateFixedPages();
  bookEl.style.transform = "translateZ(0)";
  requestAnimationFrame(() => bookEl.style.transform = "");
}
window.addEventListener("resize", () => {
  clearTimeout(window.__bookResizeT);
  window.__bookResizeT = setTimeout(refreshLayout, 120);
});
window.addEventListener("orientationchange", () => {
  setTimeout(refreshLayout, 250);
});

updateFixedPages();
