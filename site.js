/* ==========================================================================
   MICHAEL'S PORTFOLIO - site.js
   --------------------------------------------------------------------------
   TABLE OF CONTENTS (use Ctrl+F and search the number, e.g. "[3]")
     [1] Configuration & canvas state variables
     [2] Canvas animations (sea particles, bioluminescence, click ripples)
     [3] Depth gauge & background scroll color interpolation
     [4] Projects reveal on scroll (IntersectionObserver)
     [5] Screenshots carousel & navigation
     [6] Initial dive-in intro screen & bubbles generator
     [7] Copy email to clipboard & toast notification
     [8] Event listeners & setup initialization
   ========================================================================== */


/* ==========================================================================
   [1] CONFIGURATION & CANVAS STATE VARIABLES
   ========================================================================== */

(function () {
  // Canvas elements & contexts
  var cv = document.getElementById('sea'),
      cx = cv.getContext('2d'),
      gauge = document.getElementById('gauge');

  // Device & accessibility checks
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches,
      touch = matchMedia('(pointer: coarse)').matches,
      scale = parseFloat(document.body.getAttribute('data-depth')) || 1;

  // Background gradient color stops (RGB values corresponding to scroll depths)
  var stops = [
    [15, 76, 92],  // Surface blue
    [10, 52, 72],  // Mid-depth ocean blue
    [6, 30, 50],   // Deep ocean navy
    [3, 12, 22]    // Abyss dark navy
  ];

  // Animation runtime variables
  var W, H, dpr,
      parts = [],    // Floating ambient bioluminescent particles
      rings = [],    // Expanding click ripple rings
      flashes = [],  // Deep sea light flash bursts
      progress = 0,  // Scroll depth percentage (0 to 1)
      raf = 0,       // RequestAnimationFrame ID
      mx = -999,     // Mouse X coordinate
      my = -999,     // Mouse Y coordinate
      io = null;     // IntersectionObserver instance


/* ==========================================================================
   [2] CANVAS ANIMATIONS (sea particles, bioluminescence, click ripples)
   ========================================================================== */

  // Adjust canvas dimensions to match display DPI / device pixel ratio
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Generate initial particle array based on screen capability (fewer on mobile)
  function seed() {
    parts = [];
    var n = touch ? 40 : 85;
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.7 + Math.pow(Math.random(), 2.5) * 7,  // Particle size
        s: 0.12 + Math.random() * 0.3,               // Upward rise speed
        p: Math.random() * 6.28,                     // Wave phase offset
        h: Math.random()                             // Color hue variant
      });
    }
  }

  // Main rendering engine loop
  function draw(t) {
    cx.clearRect(0, 0, W, H);
    var a = 0.3 + progress * 0.6; // Opacity increases as you scroll deeper
    cx.shadowBlur = 9;

    // --- Floating bioluminescent particles ---
    parts.forEach(function (p) {
      if (!reduce) {
        p.y -= p.s;
        p.x += Math.sin(t / 1000 + p.p) * 0.2; // Gentle horizontal sway

        // Mouse avoidance displacement
        var dx = p.x - mx,
            dy = p.y - my,
            d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90 && d > 0) {
          p.x += (dx / d) * (90 - d) * 0.05;
          p.y += (dy / d) * (90 - d) * 0.05;
        }

        // Ripple ring wave impact: expanding rings push nearby particles outward
        rings.forEach(function (r) {
          var rdx = p.x - r.x,
              rdy = p.y - r.y,
              rd = Math.sqrt(rdx * rdx + rdy * rdy),
              ringThickness = 25; // Active impact wave width

          if (Math.abs(rd - r.r) < ringThickness && rd > 0) {
            var pushForce = (1 - Math.abs(rd - r.r) / ringThickness) * r.a * 5;
            p.x += (rdx / rd) * pushForce;
            p.y += (rdy / rd) * pushForce;
          }
        });

        // Loop particles when floating past top edge
        if (p.y < -10) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
      }

      // Render glowing particle
      var c = 'hsl(' + (165 + p.h * 35) + ',100%,72%)';
      cx.shadowColor = c;
      cx.fillStyle = c;
      cx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t / (450 + p.h * 900) + p.p));
      cx.beginPath();
      cx.arc(p.x, p.y, p.r, 0, 6.283);
      cx.fill();
    });

    cx.shadowBlur = 0;

    // --- Deep sea radial flashes (trigger near bottom depth) ---
    if (!reduce && progress > 0.75 && Math.random() < 0.012 && flashes.length < 1) {
      flashes.push({
        x: Math.random() * W,
        y: H * (0.2 + Math.random() * 0.7),
        r: 2 + Math.random() * 3.5,
        g: 30 + Math.random() * 40,
        t: 0,
        d: 70 + Math.random() * 90,
        h: 155 + Math.random() * 40
      });
    }

    flashes = flashes.filter(function (f) { return f.t < f.d; });
    flashes.forEach(function (f) {
      f.t++;
      f.y -= 0.1;
      var k = Math.sin((Math.PI * f.t) / f.d) * (0.75 + 0.25 * Math.sin(f.t * 0.5));
      var gr = cx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.g);
      gr.addColorStop(0, 'hsla(' + f.h + ',100%,85%,' + (0.9 * k) + ')');
      gr.addColorStop(0.15, 'hsla(' + f.h + ',100%,70%,' + (0.35 * k) + ')');
      gr.addColorStop(1, 'hsla(' + f.h + ',100%,60%,0)');

      cx.globalAlpha = 1;
      cx.fillStyle = gr;
      cx.beginPath();
      cx.arc(f.x, f.y, f.g, 0, 6.283);
      cx.fill();

      cx.fillStyle = 'hsla(' + f.h + ',100%,92%,' + k + ')';
      cx.beginPath();
      cx.arc(f.x, f.y, f.r, 0, 6.283);
      cx.fill();
    });

    // --- Click ripple rings ---
    rings = rings.filter(function (r) { return r.a > 0; });
    rings.forEach(function (r) {
      r.r += r.v;    // Ring growth velocity
      r.a -= 0.011;  // Fade rate
      cx.lineWidth = 1.2;

      // Outer primary ring
      cx.globalAlpha = Math.max(r.a, 0) * 0.45;
      cx.strokeStyle = '#BFFFF5';
      cx.beginPath();
      cx.arc(r.x, r.y, r.r, 0, 6.283);
      cx.stroke();

      // Inner echo ring
      cx.globalAlpha = Math.max(r.a, 0) * 0.22;
      cx.beginPath();
      cx.arc(r.x, r.y, r.r * 0.7, 0, 6.283);
      cx.stroke();
    });

    cx.globalAlpha = 1;
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  // Start animation loop
  function start() {
    cancelAnimationFrame(raf);
    resize();
    seed();
    update();
    raf = requestAnimationFrame(draw);
  }


/* ==========================================================================
   [3] DEPTH GAUGE & BACKGROUND SCROLL COLOR INTERPOLATION
   ========================================================================== */

  // Interpolate RGB background colors based on current scroll depth
  function colorAt(t) {
    var s = t * (stops.length - 1),
        i = Math.min(Math.floor(s), stops.length - 2),
        f = s - i;
    return stops[i].map(function (v, k) {
      return Math.round(v + (stops[i + 1][k] - v) * f);
    });
  }

  // Recalculate depth percentage on scroll and update gauge indicator text
  function update() {
    var max = document.documentElement.scrollHeight - innerHeight;
    progress = (max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0) * scale;
    document.body.style.background = 'rgb(' + colorAt(progress) + ')';
    if (gauge) {
      gauge.textContent = Math.round(progress * 200) + ' m';
    }
  }


/* ==========================================================================
   [4] PROJECTS REVEAL ON SCROLL (IntersectionObserver)
   ========================================================================== */

  // Setup scroll fade-in animations for project elements using IntersectionObserver
  function setupReveal(on) {
    var sec = document.getElementById('projects');
    if (!sec) return;
    if (io) {
      io.disconnect();
      io = null;
    }

    var els = [].slice.call(sec.querySelectorAll('.rv'));
    els.forEach(function (e) { e.classList.remove('in'); });

    if (!on || reduce || !('IntersectionObserver' in window)) {
      sec.classList.remove('rv-on');
      return;
    }

    sec.classList.add('rv-on');
    io = new IntersectionObserver(
      function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach(function (e) { io.observe(e); });
  }


/* ==========================================================================
   [5] SCREENSHOTS CAROUSEL & NAVIGATION
   ========================================================================== */

  (function () {
    var c = document.querySelector('.carousel');
    if (!c) return;
    var sl = c.querySelector('.slides'),
        dots = [].slice.call(c.querySelectorAll('.dots span'));

    // Scroll slides left or right
    function go(d) {
      sl.scrollBy({ left: d * sl.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    }

    // Prev / Next button listeners
    c.querySelector('.prev').addEventListener('click', function () { go(-1); });
    c.querySelector('.next').addEventListener('click', function () { go(1); });

    // Keyboard arrow keys navigation
    sl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    });

    // Update active pagination indicator dots on scroll
    sl.addEventListener('scroll', function () {
      var i = Math.round(sl.scrollLeft / sl.clientWidth);
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }, { passive: true });
  })();


/* ==========================================================================
   [6] INITIAL DIVE-IN INTRO SCREEN & BUBBLES GENERATOR
   ========================================================================== */

  // Inject animated rising bubbles into dive intro screen
  function bubbles(el) {
    for (var i = 0; i < 28; i++) {
      var b = document.createElement('i'),
          z = 6 + Math.random() * 24;
      b.style.cssText =
        'left:' + (Math.random() * 100) +
        '%;width:' + z +
        'px;height:' + z +
        'px;animation-duration:' + (1.1 + Math.random() * 1.3) +
        's;animation-delay:' + (Math.random() * 0.9) + 's';
      el.appendChild(b);
    }
  }

  // Dive intro animation controller
  var dv = document.getElementById('dive');
  if (dv && document.documentElement.classList.contains('diving')) {
    bubbles(dv);
    try { sessionStorage.setItem('dived', '1'); } catch (e) {}
    var doneDive = function () { document.documentElement.classList.remove('diving'); };
    dv.addEventListener('click', doneDive);
    addEventListener('keydown', doneDive, { once: true });
    setTimeout(doneDive, 3100);
  }


/* ==========================================================================
   [7] COPY EMAIL TO CLIPBOARD & TOAST NOTIFICATION
   ========================================================================== */

  (function () {
    // Dynamically inject the toast notification element
    var toast = document.createElement('div'), tt;
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    // Show temporary toast message
    function show(msg) {
      toast.textContent = msg;
      toast.classList.add('on');
      clearTimeout(tt);
      tt = setTimeout(function () {
        toast.classList.remove('on');
      }, 2400);
    }

    // Fallback copy mechanism for legacy browsers or unsecure HTTP contexts
    function fallbackCopy(text) {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    }

    // Intercept mailto link clicks to copy address to clipboard instead
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
      if (!a) return;
      e.preventDefault();

      var addr = a.getAttribute('href').replace(/^mailto:/, '').split('?')[0];

      function done(ok) {
        show(ok ? 'Email copied: ' + addr : 'Could not copy. My email is ' + addr);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addr).then(
          function () { done(true); },
          function () { done(fallbackCopy(addr)); }
        );
      } else {
        done(fallbackCopy(addr));
      }
    });
  })();


/* ==========================================================================
   [8] EVENT LISTENERS & SETUP INITIALIZATION
   ========================================================================== */

  setupReveal(true);
  
  addEventListener('scroll', update, { passive: true });
  
  addEventListener('resize', function () {
    resize();
    seed();
    update();
  });

  // Track mouse position for particle physics avoidance
  addEventListener('mousemove', function (e) {
    if (reduce || touch) return;
    mx = e.clientX;
    my = e.clientY;
  });

  // Create expanding ripples and displace particles on click
  addEventListener('click', function (e) {
    if (!reduce) {
      rings.push({ x: e.clientX, y: e.clientY, r: 2, a: 1, v: 3 });
    }
  });

// Only open specific external links (GitHub, Devpost, LinkedIn, YouTube) in a new tab
  function updateLinkTargets() {
    var externalDomains = ['github.com', 'devpost.com', 'linkedin.com', 'youtube.com', 'youtu.be', 'instagram.com'];
    var links = document.querySelectorAll('a[href]');

    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;

      var isExternalTarget = externalDomains.some(function (domain) {
        return href.toLowerCase().includes(domain);
      });

      if (isExternalTarget) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      } else {
        // Ensure internal links open in the same tab
        a.removeAttribute('target');
      }
    });
  }

  // Run on page load
  updateLinkTargets();
  // Run on page load
  updateLinkTargets();

  // Launch animation loop
  start();
})();
