/* =====================================================================
   MAIN SCRIPT
   ---------------------------------------------------------------------
   Plain JavaScript, no libraries. Loaded with "defer", so it runs after
   the HTML is parsed.

   Edit these two blocks to change behaviour or content:
     1. SETTINGS        timings and feel
     2. HERO_CARD       the hero card's gradient (colours, fade, parallax)

   Everything below them is the machinery:
     3.  Helpers
     4.  Theme toggle (Light / Dark)
     5.  Navbar + gradual blur on scroll
     6.  Hero card: shrink on scroll + the nacre gradient (WebGL)
     7.  3D tilt on hover (case studies + tool stack)
     8.  "See More" / "See Less" (experience, case studies list)
     9.  Testimonials slider
     10. Entrance animations
     11. Preloader (runs last; starts the entrance animations)
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SETTINGS
   --------------------------------------------------------------------- */
const SETTINGS = {
  // Preloader stays at least this long (ms), even if the page loads faster
  preloaderMinTime: 1200,

  // Testimonials rotate every … ms (paused while hovered or focused)
  testimonialDelay: 8000,

  // Navbar hides only after scrolling down this far (px)
  navHideAfter: 80,

  // Case study image tilt: maximum angle in degrees
  tiltMax: 5,
};


/* ---------------------------------------------------------------------
   2. HERO CARD
   The gradient in the landing page's hero card. Sizes and spacing of the
   card itself are tokens in css/tokens.css (--hero-card-*, --fs-hero-large…).
   --------------------------------------------------------------------- */
const HERO_CARD = {
  // Per theme:
  //   palette  gradient colours (dark → light for dark mode, light → darker for light mode)
  //   page     Surface/Page, what the gradient sits on and fades into
  //   amount   opacity of the moving gradient over the page colour
  //   fade     strength of the page-colour fade at its fullest (bottom-left)
  themes: {
    dark:  { palette: ['#201e1d', '#454545', '#737373', '#969696', '#b0b0b0'],
             page: '#191919', amount: 0.45, fade: 0.9 },
    light: { palette: ['#ffffff', '#f0f0f0', '#dadada', '#c2c2c2', '#a8a8a8'],
             page: '#FBFBFB', amount: 0.6, fade: 0.5 },
  },
  themeFade: 600,       // ms for everything above to crossfade between themes

  // Page-colour fade: Figma's radial gradient on "Frame 136" (Landing - Exploration),
  // its gradientTransform as is. Maps card position (0–1, from the top-left) to
  // gradient space, where the fade runs from the centre (0.5, 0.5) out to radius 0.5:
  // centred on the top-right corner, main axis to the bottom edge 27% from the left.
  fadeTransform: [[-0.3765251934528351, 0.22371850907802582, 0.8765251636505127],
                  [-0.22371850907802582, -0.16415709257125854, 0.723718523979187]],

  // Surface (same values as explorations/nacre-gradient.html in the Desktop folder)
  scale: 0.9, flow: 0.5, crease: 0.6, depth: 1.0, iridescence: 0.6,
  light: 40, grain: 0.04, speed: 1.0,
  offset: [71.3125, 68.125],
  maxDpr: 2,

  // Mouse parallax
  parallax: { shift: 0.05, relief: 0.06, light: 0.35, ease: 0.45 },
};


/* ---------------------------------------------------------------------
   3. HELPERS
   --------------------------------------------------------------------- */
const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const root = document.documentElement;
const mqLarge = window.matchMedia("(min-width: 64rem)");
const mqReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mqFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

const currentTheme = () => (root.getAttribute("data-theme") === "light" ? "light" : "dark");

/* Small event bus so modules can react to the preloader finishing and theme changes */
const events = new EventTarget();


/* ---------------------------------------------------------------------
   4. THEME TOGGLE
   Large screens: click the inactive word. Small/medium: tap anywhere on it.
   --------------------------------------------------------------------- */
(function themeToggle() {
  const toggle = $("#theme-toggle");
  const metaTheme = $('meta[name="theme-color"]');
  if (!toggle) return;

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    $$(".theme-toggle__option", toggle).forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeOption === theme));
    });
    if (metaTheme) metaTheme.setAttribute("content", theme === "light" ? "#FBFBFB" : "#191919");
    try { localStorage.setItem("theme", theme); } catch (e) { /* storage blocked */ }
    events.dispatchEvent(new Event("themechange"));
  }

  toggle.addEventListener("click", (event) => {
    const option = event.target.closest(".theme-toggle__option");
    if (mqLarge.matches) {
      // Large screens: only the inactive word does something
      if (option && option.dataset.themeOption !== currentTheme()) apply(option.dataset.themeOption);
    } else {
      // Small/medium: any tap flips the theme
      apply(currentTheme() === "dark" ? "light" : "dark");
    }
  });

  apply(currentTheme());

  /* The page you leave decides the theme of the page you land on.
     (Without this, the theme last toggled anywhere, e.g. in another tab,
     would win.) */
  window.addEventListener("pagehide", () => {
    try { localStorage.setItem("theme", currentTheme()); } catch (e) { /* storage blocked */ }
  });
  // Back/Forward can restore a page from memory without reloading it:
  // bring it in line with the page you just came from.
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch (err) { /* storage blocked */ }
    if ((saved === "light" || saved === "dark") && saved !== currentTheme()) apply(saved);
  });
})();


/* ---------------------------------------------------------------------
   5. NAVBAR + GRADUAL BLUR
   Sets data-nav on <html>, which the CSS reads:
     "top"     at the top of the page   → navbar shown, blur 100%
     "hidden"  while scrolling down     → navbar hidden, blur 90%
     "visible" while scrolling back up  → navbar shown, blur 120%
   --------------------------------------------------------------------- */
(function navOnScroll() {
  let lastY = window.scrollY;
  let ticking = false;
  root.setAttribute("data-nav", "top");

  function update() {
    const y = window.scrollY;
    if (y < SETTINGS.navHideAfter) {
      root.setAttribute("data-nav", "top");
    } else if (y > lastY + 4) {
      root.setAttribute("data-nav", "hidden");
    } else if (y < lastY - 4) {
      root.setAttribute("data-nav", "visible");
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  // Keyboard users tabbing to the navbar should always see it
  $("#navbar")?.addEventListener("focusin", () => {
    if (root.getAttribute("data-nav") === "hidden") root.setAttribute("data-nav", "visible");
  });
})();


/* ---------------------------------------------------------------------
   6a. HERO CARD: SHRINK ON SCROLL
   The wrapper is as tall as the starting card and the card sits at its
   bottom. Over the first D pixels of scrolling (D = start height − compact
   height) the card's height shrinks by exactly the scroll amount, so its
   top stays at the top of the screen and its bottom moves up with the page.
   The title scales down from Hero/Large to Hero, the greeting follows it
   down, and the space under the text eases from --hero-pad-start to
   --hero-pad-end. The compact height is chosen so the shrink ends exactly
   when the top of the text reaches the blur zone under the navbar
   (--hero-clear); from there the card scrolls away normally.

   Short screens (e.g. phones in landscape): the card never starts shorter
   than blur zone + text + padding, so the text never starts under the blur;
   the card then simply runs past the bottom of the screen. This part also
   applies with reduced motion (which skips only the shrinking).
   Reduced motion: none of this, the card simply scrolls with the page.
   --------------------------------------------------------------------- */
(function shrinkOnScroll() {
  const wrap = document.querySelector('.hero-card-wrap');
  const card = document.getElementById('hero-card');
  const title = document.getElementById('hero-title');
  const block = document.querySelector('.hero-card__content > .grid');
  const clear = document.getElementById('hero-clear');
  if (!wrap || !card || !title || !block || !clear) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rootPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // Custom properties come back resolved, e.g. "1.25rem" or "34px"
  const toPx = (value) => {
    const v = value.trim();
    return v.endsWith('rem') ? parseFloat(v) * rootPx() : parseFloat(v);
  };

  let startH = 0, distance = 0, endScale = 1, titleH = 0, padStart = 0, padEnd = 0;
  let last = '';

  function measure() {
    const cs = getComputedStyle(card);
    padStart = toPx(cs.getPropertyValue('--hero-pad-start'));

    // Starting height: the screen-based height from the CSS, or what the
    // content needs below the blur zone, whichever is taller
    wrap.style.removeProperty('--hero-card-start-h');
    const screenH = wrap.getBoundingClientRect().height;
    const neededH = clear.offsetHeight + block.offsetHeight + padStart;
    startH = Math.max(screenH, Math.ceil(neededH));
    if (startH > screenH) wrap.style.setProperty('--hero-card-start-h', startH + 'px');
    if (reduced) return; // no shrinking: the card keeps its starting height

    padEnd = toPx(cs.getPropertyValue('--hero-pad-end'));
    endScale = toPx(cs.getPropertyValue('--fs-hero-large-end')) / parseFloat(getComputedStyle(title).fontSize);

    // Layout sizes ignore transforms, so these are the full-size values
    titleH = title.offsetHeight;
    const blockEnd = block.offsetHeight - titleH * (1 - endScale);
    const endH = clear.offsetHeight + blockEnd + padEnd;
    distance = Math.max(0, startH - endH);
    last = '';
    update();
  }

  function update() {
    const p = distance ? Math.min(Math.max(window.scrollY / distance, 0), 1) : 0;
    const scale = 1 - p * (1 - endScale);
    const key = p.toFixed(4);
    if (key === last) return;
    last = key;
    card.style.setProperty('--card-h', (startH - p * distance).toFixed(2) + 'px');
    card.style.setProperty('--title-scale', scale.toFixed(4));
    card.style.setProperty('--lift', (titleH * (1 - scale)).toFixed(2) + 'px');
    card.style.setProperty('--pad-b', (padStart + (padEnd - padStart) * p).toFixed(2) + 'px');
  }

  window.addEventListener('resize', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
  if (reduced) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
  }, { passive: true });
})();


/* ---------------------------------------------------------------------
   6b. HERO CARD: NACRE GRADIENT
   A flowing, pearly surface (WebGL) with mouse parallax, the page-colour
   fade from the Figma design (with dithering against banding), and
   colours per theme that crossfade when the theme changes.
   Only runs on pages with #hero-gradient (the landing page).
   --------------------------------------------------------------------- */

const NACRE_VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Fragment shader. The surface is a recreation of InstantGradient's "nacre"
// style (see explorations/nacre-gradient.html in the Desktop folder).
const NACRE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_fit;      // cover-fit scale (see worldPos)
uniform float u_time;
uniform vec2 u_offset;
uniform float u_scale, u_flow, u_crease, u_depth, u_irid, u_light, u_grain;
uniform sampler2D u_ramp;
uniform vec2 u_tilt;     // eased cursor, -1..1 from the centre (x right, y up)
uniform float u_pShift, u_pRelief, u_pLight;
uniform vec3 u_page;       // page colour (follows the theme)
uniform float u_amount;    // gradient opacity over the page colour
uniform float u_fadeMax;   // page-colour fade at its fullest
uniform mat3 u_fadeMat;    // Figma gradientTransform (card 0–1 → gradient space)
uniform float u_cardFrac;  // share of the canvas height the card covers right now

const float ASPECT = 16.0 / 9.0; // pattern is laid out on a 16:9 "world", cover-fitted
const float PI = 3.14159265;

// 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT licence)
vec3 m289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec2 m289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
vec3 perm(vec3 x) { return m289((x * 34.0 + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = m289(i);
  vec3 p = perm(perm(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - floor(x + 0.5);
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}


// Cover-fit the 16:9 world into the canvas, centred, in world units.
vec2 worldPos() { return (v_uv - 0.5) * u_fit * vec2(ASPECT, 1.0); }

// Surface height: big soft lobes, plus narrow ridges along two contour
// levels of the same field (so ridges follow the lobes and never cross).
float surface(vec2 p, float f, vec2 off, vec2 warp) {
  vec2 q = (p + warp) * f + off;
  float b = snoise(q) + 0.18 * snoise(q * 2.1 + 5.0);
  float r1 = b;
  float r2 = abs(b) - 0.6;
  float ridge = exp(-r1 * r1 / 0.012) + 0.6 * exp(-r2 * r2 / 0.01);
  return 0.7 * b + 0.3 * u_crease * ridge;
}

// Soft S-curve that spreads a roughly normal value across 0..1.
float spread(float x, float sd) {
  float k = 1.07 * sd;
  return clamp(0.5 + 0.5 * (x / sqrt(x * x + k * k)) / 0.96, 0.0, 1.0);
}

// Triangle wave: ping-pongs t through the palette instead of wrapping.
float pingpong(float x) { return 1.0 - abs(1.0 - 2.0 * fract(0.5 * x)); }


void main() {
  // Layer 1: the whole field drifts against the cursor.
  vec2 p = worldPos() + u_tilt * u_pShift;
  float f = 0.55 * u_scale;
  vec2 drift = vec2(0.02 * u_time, 0.0);
  vec2 off = u_offset + drift;

  // Slow, large-scale domain warp shared by all height samples.
  vec2 wq = p * 0.45 * f + u_offset.yx + 23.0 + drift.yx;
  vec2 warp = 0.5 * u_flow * vec2(snoise(wq), snoise(wq + vec2(9.2, 4.1)));

  // Layer 2: relief parallax. Look up the height here and shift by it,
  // so raised ridges slide further than the valleys between them.
  float h = surface(p, f, off, warp);
  p -= u_tilt * h * u_pRelief;

  // Normal from central differences.
  const float e = 0.006;
  float dx = surface(p + vec2(e, 0.0), f, off, warp) - surface(p - vec2(e, 0.0), f, off, warp);
  float dy = surface(p + vec2(0.0, e), f, off, warp) - surface(p - vec2(0.0, e), f, off, warp);
  float k = 0.25 * u_depth / e;
  vec3 n = normalize(vec3(-dx * k, -dy * k, 1.0));
  float slope = 1.0 - n.z;

  // Layer 3: the light gently sways on its own and swings with the cursor.
  float az = radians(u_light) + 0.12 * sin(0.1 * u_time);
  vec3 L = normalize(vec3(cos(az) * 0.643, sin(az) * 0.643, 0.766) + vec3(u_tilt * u_pLight, 0.0));
  float diffuse = 0.7 + 0.3 * dot(n, L);
  float rim = 0.35 * pow(slope, 6.0);

  // Base palette position from a slow 2-octave field; slopes shift it (the sheen).
  vec2 c = p * 0.4 * f + u_offset + 17.0 + vec2(0.0, 0.015 * u_time);
  float base = (0.5 * snoise(c) + 0.25 * snoise(c * 2.0)) / 0.75;
  float t = pingpong(spread(base, 0.35) + 1.5 * u_irid * slope);

  vec3 col = texture2D(u_ramp, vec2(t, 0.5)).rgb * diffuse + rim;

  // Film grain.
  vec2 g = v_uv * 200.0 + u_time * 0.1;
  col += (fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * u_grain;

  // The gradient over the page colour, at its opacity.
  vec3 outCol = mix(u_page, clamp(col, 0.0, 1.0), u_amount);

  // Page-colour fade (Figma radial gradient). Position on the card, 0–1 from
  // its top-left; the card is the top part of the canvas (u_cardFrac of it),
  // so the fade follows the card as it shrinks, as Figma would scale it.
  vec2 card = vec2(v_uv.x, (1.0 - v_uv.y) / u_cardFrac);
  vec2 q = (u_fadeMat * vec3(card, 1.0)).xy;
  float fade = clamp(2.0 * length(q - 0.5), 0.0, 1.0);
  outCol = mix(outCol, u_page, fade * u_fadeMax);

  // Dither: ±half a colour step of per-pixel noise before the 8-bit output,
  // which breaks up banding in the soft fades without being visible.
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453)
               + fract(sin(dot(gl_FragCoord.xy, vec2(39.3468, 11.1353))) * 24634.6345) - 1.0;
  outCol += dither / 255.0;

  gl_FragColor = vec4(clamp(outCol, 0.0, 1.0), 1.0);
}`;

// Palette ramp: colours blended in OKLCh (perceptually even)

function hexToOklch(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = [n >> 16, (n >> 8) & 255, n & 255].map(v => {
    v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function oklchToRgb255([L, C, h]) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return lin.map(v => {
    v = Math.min(1, Math.max(0, v));
    v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(v * 255);
  });
}

function buildRamp(colors, size = 1024) {
  const stops = colors.map(hexToOklch);
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * (stops.length - 1);
    const j = Math.min(stops.length - 2, Math.floor(x));
    const t = x - j;
    const [L0, C0, h0] = stops[j], [L1, C1, h1] = stops[j + 1];
    // Greys have no meaningful hue: borrow the other stop's hue.
    const ha = C0 < 1e-4 ? h1 : h0, hb = C1 < 1e-4 ? h0 : h1;
    let dh = hb - ha;
    if (dh > Math.PI) dh -= 2 * Math.PI; else if (dh < -Math.PI) dh += 2 * Math.PI;
    const rgb = oklchToRgb255([L0 + (L1 - L0) * t, C0 + (C1 - C0) * t, ha + dh * t]);
    data.set([...rgb, 255], i * 4);
  }
  return data;
}


(function nacreGradient() {
  const ASPECT = 16 / 9;
  const S = HERO_CARD, P = S.parallax;
  const canvas = document.getElementById('hero-gradient');
  const card = document.getElementById('hero-card');
  if (!canvas || !card) return;
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return; // the card just shows the page colour

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, NACRE_VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, NACRE_FRAG));
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // One triangle that covers the canvas
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Palette texture: both ramps are built once; during a theme change the
  // texture is refilled with a blend of the two.
  const T = S.themes;
  const ramps = { dark: buildRamp(T.dark.palette), light: buildRamp(T.light.palette) };
  const blend = new Uint8Array(1024 * 4);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const theme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 1 : 0);
  let mix = theme();          // 0 = dark, 1 = light (blended in between)
  let fade = null;            // { from, to, start } while crossfading

  const U = (name) => gl.getUniformLocation(prog, name);
  const uPage = U('u_page'), uAmount = U('u_amount'), uFadeMax = U('u_fadeMax'), uCardFrac = U('u_cardFrac');
  const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const pages = { dark: hexRgb(T.dark.page), light: hexRgb(T.light.page) };
  const lerp = (a, b, m) => a + (b - a) * m;

  // Palette texture, page colour, opacity and fade strength, blended between the themes
  function setTheme(m) {
    const a = ramps.dark, b = ramps.light;
    for (let i = 0; i < blend.length; i++) blend[i] = a[i] + (b[i] - a[i]) * m;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blend);
    gl.uniform3f(uPage, ...pages.dark.map((v, i) => lerp(v, pages.light[i], m)));
    gl.uniform1f(uAmount, lerp(T.dark.amount, T.light.amount, m));
    gl.uniform1f(uFadeMax, lerp(T.dark.fade, T.light.fade, m));
  }
  setTheme(mix);

  // Figma's 2×3 matrix as a GLSL mat3 (column-major)
  const F = S.fadeTransform;
  gl.uniformMatrix3fv(U('u_fadeMat'), false, [F[0][0], F[1][0], 0, F[0][1], F[1][1], 0, F[0][2], F[1][2], 1]);

  const uFit = U('u_fit'), uTime = U('u_time'), uTilt = U('u_tilt');
  gl.uniform1i(U('u_ramp'), 0);
  gl.uniform2f(U('u_offset'), S.offset[0], S.offset[1]);
  gl.uniform1f(U('u_scale'), S.scale);
  gl.uniform1f(U('u_flow'), S.flow);
  gl.uniform1f(U('u_crease'), S.crease);
  gl.uniform1f(U('u_depth'), S.depth);
  gl.uniform1f(U('u_irid'), S.iridescence);
  gl.uniform1f(U('u_light'), S.light);
  gl.uniform1f(U('u_grain'), S.grain);
  gl.uniform1f(U('u_pShift'), P.shift);
  gl.uniform1f(U('u_pRelief'), P.relief);
  gl.uniform1f(U('u_pLight'), P.light);

  // The canvas is the starting card's size; it only changes on resize, not while scrolling
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, S.maxDpr);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h || (canvas.width === w && canvas.height === h)) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    const a = w / h;
    gl.uniform2f(uFit, a > ASPECT ? 1 : a / ASPECT, a > ASPECT ? ASPECT / a : 1);
  }

  function draw(seconds, tilt) {
    resize();
    // The card shrinks while scrolling; the canvas stays the starting size
    gl.uniform1f(uCardFrac, Math.min(1, card.clientHeight / Math.max(1, canvas.clientHeight)));
    gl.uniform1f(uTime, seconds % 1000);
    gl.uniform2f(uTilt, tilt[0], tilt[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Theme changes (from the toggle in main.js): crossfade the palette
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  new MutationObserver(() => {
    const to = theme();
    if (reduced) { mix = to; setTheme(mix); draw(10, [0, 0]); return; }
    if (to !== (fade ? fade.to : mix)) fade = { from: mix, to, start: performance.now() };
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Reduced motion: one still frame, redrawn on resize
  if (reduced) {
    draw(10, [0, 0]);
    window.addEventListener('resize', () => draw(10, [0, 0]));
    return;
  }

  // Mouse parallax: eased tilt from the cursor's position on screen
  const target = [0, 0], tilt = [0, 0];
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return; // no hover on touch
    target[0] = (e.clientX / window.innerWidth) * 2 - 1;
    target[1] = 1 - (e.clientY / window.innerHeight) * 2;
  });
  const recentre = () => { target[0] = 0; target[1] = 0; };
  document.documentElement.addEventListener('pointerleave', recentre);
  window.addEventListener('blur', recentre);

  // Only animate while the card is on screen (rAF itself pauses in hidden tabs)
  let visible = true, running = false;
  const t0 = performance.now();
  let prev = t0;

  function frame(now) {
    if (!visible) { running = false; return; }
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;

    const k = 1 - Math.exp(-dt / P.ease);
    tilt[0] += (target[0] - tilt[0]) * k;
    tilt[1] += (target[1] - tilt[1]) * k;

    if (fade) {
      const t = Math.min((now - fade.start) / S.themeFade, 1);
      const eased = t * t * (3 - 2 * t);
      mix = fade.from + (fade.to - fade.from) * eased;
      setTheme(mix);
      if (t === 1) fade = null;
    }

    draw(((now - t0) / 1000) * S.speed, tilt);
    requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    prev = performance.now();
    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(card);
  }
  start();
})();


/* ---------------------------------------------------------------------
   7. 3D TILT ON HOVER
   Any element with data-tilt (case-study images, tool stack image).
   Mouse only; touch screens have no hover.
   --------------------------------------------------------------------- */
(function tiltOnHover() {
  if (!mqFinePointer.matches || mqReducedMotion.matches) return;

  $$("[data-tilt]").forEach((media) => {
    media.addEventListener("pointermove", (e) => {
      const r = media.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      media.classList.add("is-tilting");
      media.style.setProperty("--tilt-x", (px * 2 * SETTINGS.tiltMax).toFixed(2) + "deg");
      media.style.setProperty("--tilt-y", (-py * 2 * SETTINGS.tiltMax).toFixed(2) + "deg");
      media.style.setProperty("--tilt-scale", "1.02");
    });
    media.addEventListener("pointerleave", () => {
      media.classList.remove("is-tilting");
      media.style.setProperty("--tilt-x", "0deg");
      media.style.setProperty("--tilt-y", "0deg");
      media.style.setProperty("--tilt-scale", "1");
    });
  });
})();


/* ---------------------------------------------------------------------
   8. "SEE MORE" / "SEE LESS" FOR LISTS
   Any button with data-expand="<list id>" shows/hides the list's
   [data-extra] items.
   --------------------------------------------------------------------- */
(function expandableLists() {
  $$("[data-expand]").forEach((button) => {
    const target = document.getElementById(button.dataset.expand);
    if (!target) return;
    if (!$("[data-extra]", target)) { button.hidden = true; return; }

    target.classList.add("is-collapsed");

    button.addEventListener("click", () => {
      const expand = target.classList.contains("is-collapsed");
      target.classList.toggle("is-collapsed", !expand);
      target.classList.toggle("is-expanded", expand);
      button.setAttribute("aria-expanded", String(expand));
      button.textContent = expand ? "See Less" : "See More";
      if (!expand) bringBackIntoView(target);
    });
  });
})();

/* After collapsing, if the top of the block went off-screen, scroll back to it */
function bringBackIntoView(el) {
  const top = el.getBoundingClientRect().top;
  if (top < 0) {
    const navSpace = parseFloat(getComputedStyle(root).fontSize) * 6;
    window.scrollTo({ top: window.scrollY + top - navSpace, behavior: mqReducedMotion.matches ? "auto" : "smooth" });
  }
}


/* ---------------------------------------------------------------------
   9. TESTIMONIALS SLIDER
   Rotates on its own (pauses while hovered or focused), dots to jump,
   swipe left/right on touch screens.
   --------------------------------------------------------------------- */
(function testimonials() {
  const slider = $("#quote-slider");
  if (!slider) return;
  const quotes = $$(".quote", slider);
  const dots = $$(".dots__dot", slider);
  let current = 0;
  let timer = null;
  let paused = false;

  function go(i) {
    const next = (i + quotes.length) % quotes.length;
    if (next === current) return;
    const prev = quotes[current];
    prev.classList.remove("is-active");
    prev.classList.add("is-leaving");
    setTimeout(() => prev.classList.remove("is-leaving"), 900);
    quotes[next].classList.add("is-active");
    quotes.forEach((q, n) => q.setAttribute("aria-hidden", String(n !== next)));
    dots.forEach((d, n) => {
      d.classList.toggle("is-active", n === next);
      if (n === next) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
    current = next;
  }

  function restart() {
    clearInterval(timer);
    if (mqReducedMotion.matches) return;
    timer = setInterval(() => { if (!paused) go(current + 1); }, SETTINGS.testimonialDelay);
  }

  dots.forEach((dot, i) => dot.addEventListener("click", () => { go(i); restart(); }));

  slider.addEventListener("mouseenter", () => { paused = true; });
  slider.addEventListener("mouseleave", () => { paused = false; });
  slider.addEventListener("focusin", () => { paused = true; });
  slider.addEventListener("focusout", () => { paused = false; });

  // Swipe on touch screens
  let startX = null, startY = null;
  slider.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(current + (dx < 0 ? 1 : -1)); restart(); }
    startX = startY = null;
  }, { passive: true });

  quotes.forEach((q, n) => q.setAttribute("aria-hidden", String(n !== 0)));
  events.addEventListener("ready", restart);
})();


/* ---------------------------------------------------------------------
   10. ENTRANCE ANIMATIONS
   Elements with data-reveal fade up once when they scroll into view.
   Elements that appear together are staggered slightly.
   --------------------------------------------------------------------- */
(function reveals() {
  const items = $$("[data-reveal]");
  if (!("IntersectionObserver" in window) || mqReducedMotion.matches) {
    items.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const entering = entries.filter((entry) => entry.isIntersecting);
    entering.forEach((entry, i) => {
      entry.target.style.setProperty("--reveal-delay", (i * 0.08).toFixed(2) + "s");
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  // Start once the preloader has gone, so the first screen animates in visibly
  events.addEventListener("ready", () => items.forEach((el) => observer.observe(el)));
})();


/* ---------------------------------------------------------------------
   11. PRELOADER
   Waits for the page to load (and a minimum time), slides out, then
   tells everything else to start.
   --------------------------------------------------------------------- */
(function preloader() {
  const el = $("#preloader");
  const startedAt = performance.now();
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, SETTINGS.preloaderMinTime - (performance.now() - startedAt));
    setTimeout(() => {
      if (el) {
        el.classList.add("is-done");
        setTimeout(() => el.classList.add("is-gone"), 1100);
      }
      root.classList.remove("is-loading");
      events.dispatchEvent(new Event("ready"));
    }, wait);
  }

  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish);

  // Never wait more than 5 seconds (slow network): show the page anyway
  setTimeout(finish, 5000);
})();
