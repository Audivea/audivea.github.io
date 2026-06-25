/* Audivea — animated hero background.
 *
 * Draws the brand's flowing cyan waves on a deep-blue field into a <canvas>
 * layered inside .bg-fixed. While it runs the (opaque) canvas covers the static
 * BK.webp; BK.webp stays as the fallback for reduced-motion, no-JS, or browsers
 * without canvas. Drop-in: include after header.js/footer.js on any page that has
 * a .bg-fixed element. No assets, no dependencies — path-agnostic.
 */
(function () {
  'use strict';

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function init() {
    var host = document.querySelector('.bg-fixed');
    if (!host) return;
    // Respect reduced motion — leave the static BK.webp in place.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var st = canvas.style;
    st.position = 'absolute'; st.top = '0'; st.left = '0';
    st.width = '100%'; st.height = '100%';
    st.display = 'block'; st.pointerEvents = 'none';
    var ctx = canvas.getContext('2d');
    if (!ctx) return; // unsupported -> keep BK.webp
    host.appendChild(canvas);

    var field = document.createElement('canvas');
    var fctx = field.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, step = 8, veil = null;

    // Brand palette (matches :root --color-primary* in styles.css)
    var LEAD = '#33cfff', MID = '#00aaff', DEEP = '#0088ff';

    // Layered strands: vertical offset (fraction of H, trailing downward),
    // peak alpha, core line width, colour. Lead is brightest; trails fade out.
    var LAYERS = [
      { off: 0.00, a: 0.55, w: 2.0, col: LEAD },
      { off: 0.06, a: 0.34, w: 1.6, col: MID },
      { off: 0.11, a: 0.24, w: 1.4, col: MID },
      { off: 0.16, a: 0.17, w: 1.3, col: DEEP },
      { off: 0.21, a: 0.12, w: 1.2, col: DEEP },
      { off: 0.26, a: 0.08, w: 1.1, col: DEEP },
      { off: 0.31, a: 0.05, w: 1.0, col: DEEP }
    ];
    var AMP = 0.15;   // wave amplitude (fraction of H)
    var PER = 1.05;   // periods across the width
    var BASE = 0.50;  // bundle vertical centre (fraction of H)
    var RISE = 0.30;  // diagonal lift across the full width (fraction of H)

    // Build the cached field image + the per-layer (phase-independent) x-gradients.
    function build() {
      field.width = W; field.height = H;
      var g = fctx.createLinearGradient(0, 0, W * 0.35, H);
      g.addColorStop(0, '#0a1426');     // deep luminous navy
      g.addColorStop(1, '#04070e');     // near-abyss
      fctx.fillStyle = g; fctx.fillRect(0, 0, W, H);
      // Brand glow upper-right, where the crest gathers.
      var rg = fctx.createRadialGradient(W * 0.82, H * 0.12, 0, W * 0.82, H * 0.12, Math.max(W, H) * 0.72);
      rg.addColorStop(0, 'rgba(0,132,212,0.20)');
      rg.addColorStop(0.5, 'rgba(0,110,190,0.05)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = rg; fctx.fillRect(0, 0, W, H);

      for (var i = 0; i < LAYERS.length; i++) {
        var L = LAYERS[i];
        var grad = ctx.createLinearGradient(0, 0, W, 0); // fade in from the left so the title stays dark
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.22, rgba(L.col, L.a * 0.22));
        grad.addColorStop(1, rgba(L.col, L.a));
        L.grad = grad;
      }
      // Gentle top veil for nav / heading contrast.
      veil = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      veil.addColorStop(0, 'rgba(2,5,11,0.42)');
      veil.addColorStop(1, 'rgba(2,5,11,0)');
    }

    function resize() {
      W = Math.max(1, Math.floor(window.innerWidth * DPR));
      H = Math.max(1, Math.floor(window.innerHeight * DPR));
      canvas.width = W; canvas.height = H;
      step = Math.max(6, Math.floor(W / 180));
      build();
    }

    function drawWave(L, phase) {
      var baseY = (BASE + L.off) * H, amp = AMP * H, rise = RISE * H;
      ctx.beginPath();
      for (var x = 0; x <= W; x += step) {
        var t = x / W;
        var y = baseY + amp * Math.sin(t * PER * 6.28318 + phase) - rise * t;
        if (x === 0) ctx.moveTo(0, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = L.grad;
      ctx.globalAlpha = 0.5; ctx.lineWidth = L.w * DPR * 4; ctx.stroke(); // soft halo
      ctx.globalAlpha = 1.0; ctx.lineWidth = L.w * DPR;     ctx.stroke(); // bright core
    }

    var t0 = null, last = -1e9, FRAME = 1000 / 30, raf;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;          // pause when tab not visible
      if (t0 === null) t0 = ts;
      if (ts - last < FRAME) return;        // cap ~30fps (ambient, slow)
      last = ts;
      var phase = (ts - t0) / 9000;         // slow drift
      ctx.globalAlpha = 1;
      ctx.drawImage(field, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var i = LAYERS.length - 1; i >= 0; i--) drawWave(LAYERS[i], phase + i * 0.5);
      ctx.globalAlpha = 1; ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H * 0.55);
    }

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    resize();
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
