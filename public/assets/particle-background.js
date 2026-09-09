(() => {
  const script = document.currentScript;
  const asset = new URL('particle-background.html', script.src).href;
  const style = document.createElement('style');
  style.textContent = `
    body { isolation:isolate; }
    .swarm-background { position:fixed; inset:0; z-index:-1; pointer-events:none; background:linear-gradient(135deg,#edf3ff,#f0eaff); opacity:0; transition:opacity .8s ease; }
    .swarm-background.is-visible { opacity:1; }
    .swarm-background iframe { width:100%; height:100%; border:0; opacity:.52; pointer-events:none; mix-blend-mode:normal; }
    body:has(.swarm-background) main { position:relative; z-index:1; background:rgba(251,251,254,.82); }
    @media(prefers-reduced-motion:reduce) { .swarm-background { transition:none; } }
  `;
  document.head.append(style);
  const layer = document.createElement('div');
  layer.className = 'swarm-background';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);
  let frame;
  const update = () => {
    const cover = document.querySelector('[data-page-curl]');
    if (!cover) return;
    const visible = getComputedStyle(cover).display === 'none';
    layer.classList.toggle('is-visible', visible);
    if (visible && !frame) {
      frame = document.createElement('iframe');
      frame.title = '装飾用の青紫パーティクル背景';
      frame.tabIndex = -1;
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.src = asset;
      layer.append(frame);
      // Hide the former decorative canvas only after the new layer starts.
      document.querySelectorAll('canvas[aria-hidden="true"], .dot-field').forEach(el => { el.style.visibility = 'hidden'; });
    }
    if (frame && frame.style.display !== (visible ? '' : 'none')) frame.style.display = visible ? '' : 'none';
  };
  new MutationObserver(update).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['style'] });
  update();
})();
