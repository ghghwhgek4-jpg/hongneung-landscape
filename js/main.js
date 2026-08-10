document.addEventListener('DOMContentLoaded', () => {
  // Mobile navigation
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (btn && nav) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '☰';
    }));
    document.addEventListener('click', e => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '☰';
      }
    });
  }

  // Category filters. Each filter group works independently.
  document.querySelectorAll('[data-filter-group]').forEach(group => {
    const buttons = group.querySelectorAll('[data-filter]');
    const targetSelector = group.dataset.filterTarget;
    const targetRoot = targetSelector ? document.querySelector(targetSelector) : document;
    if (!targetRoot) return;
    const items = targetRoot.querySelectorAll('[data-cat]');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        const filter = button.dataset.filter;
        items.forEach(item => {
          item.classList.toggle('is-hidden', filter !== 'all' && item.dataset.cat !== filter);
        });
      });
    });
  });

  // Universal image lightbox for galleries, products and service cards.
  document.querySelectorAll('img[data-lightbox], .case-grid img, .photo-grid img, .manage-gallery img, .product-grid article img, .service-card img').forEach(img => {
    if (img.closest('.brand')) return;
    img.classList.add('zoomable-image');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `${img.alt || '이미지'} 크게 보기`);
    const open = () => openLightbox(img);
    img.addEventListener('click', open);
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  // Lightbox navigation follows visible images in the current gallery/grid.
  let currentImages = [];
  let currentIndex = 0;
  function getGalleryImages(source) {
    const root = source.closest('.case-grid, .photo-grid, .manage-gallery, .product-grid');
    if (!root) return [source];
    return [...root.querySelectorAll('img.zoomable-image')].filter(img => {
      const item = img.closest('[data-cat]');
      return !item || !item.classList.contains('is-hidden');
    });
  }
  function openLightbox(source) {
    currentImages = getGalleryImages(source);
    currentIndex = Math.max(0, currentImages.indexOf(source));
    const modal = ensureLightbox();
    renderLightbox();
    modal.classList.add('open');
    document.body.classList.add('lightbox-open');
  }
  function ensureLightbox() {
    let modal = document.getElementById('imageLightbox');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'imageLightbox';
    modal.className = 'image-lightbox';
    modal.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="이미지 크게 보기">
        <button class="lightbox-close" type="button" aria-label="닫기">×</button>
        <button class="lightbox-prev" type="button" aria-label="이전 이미지">‹</button>
        <img class="lightbox-image" alt="">
        <button class="lightbox-next" type="button" aria-label="다음 이미지">›</button>
        <div class="lightbox-caption"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    modal.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    modal.querySelector('.lightbox-prev').addEventListener('click', () => moveLightbox(-1));
    modal.querySelector('.lightbox-next').addEventListener('click', () => moveLightbox(1));
    return modal;
  }
  function renderLightbox() {
    const modal = ensureLightbox();
    const img = currentImages[currentIndex];
    if (!img) return;
    modal.querySelector('.lightbox-image').src = img.currentSrc || img.src;
    modal.querySelector('.lightbox-image').alt = img.alt || '';
    const caption = img.closest('figure')?.querySelector('figcaption')?.innerText || img.alt || '';
    modal.querySelector('.lightbox-caption').textContent = caption;
    modal.querySelector('.lightbox-prev').disabled = currentImages.length < 2;
    modal.querySelector('.lightbox-next').disabled = currentImages.length < 2;
  }
  function moveLightbox(step) {
    if (currentImages.length < 2) return;
    currentIndex = (currentIndex + step + currentImages.length) % currentImages.length;
    renderLightbox();
  }
  function closeLightbox() {
    const modal = document.getElementById('imageLightbox');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('lightbox-open');
  }
  document.addEventListener('keydown', e => {
    if (!document.getElementById('imageLightbox')?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') moveLightbox(-1);
    if (e.key === 'ArrowRight') moveLightbox(1);
  });

  // Basic touch swipe for the lightbox.
  let touchStartX = null;
  document.addEventListener('touchstart', e => {
    if (document.getElementById('imageLightbox')?.classList.contains('open')) touchStartX = e.changedTouches[0].clientX;
  }, {passive:true});
  document.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) > 45) moveLightbox(dx > 0 ? -1 : 1);
  }, {passive:true});
});
