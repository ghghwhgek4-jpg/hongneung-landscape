document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('galleryGrid');
  if (!root) return;

  try {
    const res = await fetch('/api/gallery', {headers:{'Accept':'application/json'}, cache:'no-store'});
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data.items) || !data.items.length) return;

    root.innerHTML = data.items.map(item => `
      <figure data-cat="${escapeHtml(item.category)}">
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || item.title)}" data-lightbox>
        <figcaption><b>${escapeHtml(item.title)}</b><span>${escapeHtml(categoryName(item.category))}</span></figcaption>
      </figure>`).join('');

    root.dispatchEvent(new CustomEvent('gallery:updated'));
  } catch (_) {
    // If the API is not configured yet, the V10 static gallery remains visible.
  }

  function categoryName(c) {
    return ({
      pine:'소나무', planting:'식재', care:'관리', garden:'정원·조경'
    })[c] || '조경';
  }
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
});