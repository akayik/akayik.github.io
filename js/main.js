/* =====================================================================
   MAIN SCRIPT
   ---------------------------------------------------------------------
   Plain JavaScript, no libraries. Loaded with "defer", so it runs after
   the HTML is parsed.

   Edit these two blocks to change behaviour or content:
     1. SETTINGS        timings and feel
     2. HERO_PROJECTS   the project types in the hero (name, image)

   Everything below them is the machinery:
     3.  Helpers
     4.  Theme toggle (Light / Dark)
     5.  Navbar + gradual blur on scroll
     6.  Hero: list, carousel, dots, dragging, auto-cycle with progress
     7.  3D tilt on hover (case studies + tool stack)
     8.  "See More" / "See Less" (experience, case studies list)
     9.  Testimonials slider
     10. Entrance animations
     11. Preloader (runs last; starts the hero auto-cycle + animations)
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SETTINGS
   --------------------------------------------------------------------- */
const SETTINGS = {
  // Preloader stays at least this long (ms), even if the page loads faster
  preloaderMinTime: 1200,

  // Hero auto-cycle: time on each project (ms). Cycles through all of them and
  // loops, until the visitor clicks, taps or drags (then it stops for good).
  // Pauses while hovered, while the hero is off screen, or the tab is hidden.
  heroCycleDelay: 6000,

  // How long one carousel move takes (ms). Same for every jump, so long
  // jumps (e.g. Products → Website) move faster rather than taking longer.
  heroSlideDuration: 900,

  // A drag must cover this share of the image (0–1) to change the slide…
  heroDragThreshold: 0.15,
  // …or be flicked faster than this (px per ms)
  heroFlickSpeed: 0.5,

  // Testimonials rotate every … ms (paused while hovered or focused)
  testimonialDelay: 8000,

  // Navbar hides only after scrolling down this far (px)
  navHideAfter: 80,

  // Case study image tilt: maximum angle in degrees
  tiltMax: 5,
};


/* ---------------------------------------------------------------------
   2. HERO PROJECTS
   One line per project type, in the order they appear in the list.
   - name:    label in the list
   - image:   file name part, e.g. "products" → assets/img/hero-products-640.webp / -1200.webp
   - focus:   (optional) which part of the image to keep when it is cropped,
              e.g. "center top" or "50% 30%". Default is "center".
   --------------------------------------------------------------------- */
const HERO_PROJECTS = [
  { name: "Products",       image: "products" },
  { name: "Experiences",    image: "experiences" },
  { name: "Solutions",      image: "solutions" },
  { name: "Brands",         image: "brands" },
  { name: "Packaging",      image: "packaging" },
  { name: "SaaS",           image: "saas" },
  { name: "B2C Platforms",  image: "b2c-platforms" },
  { name: "Ecommerce",      image: "ecommerce" },
  { name: "Mobile Apps",    image: "mobile-apps" },
  { name: "Merch",          image: "merch" },
  { name: "Brochures",      image: "brochures" },
  { name: "B2B Platforms",  image: "b2b-platforms" },
  { name: "Zippo Lighters", image: "zippo-lighters" },
  { name: "Website",        image: "website" },
];


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
   6. HERO
   --------------------------------------------------------------------- */
const hero = (function heroCarousel() {
  const list = $("#hero-list");
  const carousel = $("#hero-carousel");
  const track = $("#hero-track");
  const dotsWrap = $("#hero-dots");
  const heroSection = $(".hero");
  if (!list || !carousel || !track) return null;

  const SIZES = "(min-width: 80rem) 588px, (min-width: 64rem) 460px, (min-width: 48rem) 600px, 350px";
  let index = 0;
  let cycling = false;                 // true while the auto-cycle is running
  const pauses = new Set();            // reasons it is paused: "hover", "offscreen", "hidden"

  carousel.style.setProperty("--carousel-duration", SETTINGS.heroSlideDuration + "ms");
  heroSection.style.setProperty("--cycle-duration", SETTINGS.heroCycleDelay + "ms");

  /* ---- Build the list, slides and dots from HERO_PROJECTS ---- */
  HERO_PROJECTS.forEach((project, i) => {
    // List button
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hero-list__item";
    btn.textContent = project.name;
    btn.dataset.label = project.name;          // reserves bold width (see CSS)
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-controls", "hero-carousel");
    btn.addEventListener("click", () => select(i, { byUser: true }));
    li.appendChild(btn);
    list.appendChild(li);

    // Slide
    const slide = document.createElement("div");
    slide.className = "hero-slide";
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} of ${HERO_PROJECTS.length}: ${project.name}`);
    const img = document.createElement("img");
    const base = `assets/img/hero-${project.image}`;
    img.src = `${base}-1200.webp`;
    img.srcset = `${base}-640.webp 640w, ${base}-1200.webp 1200w`;
    img.sizes = SIZES;
    img.width = 1200;
    img.height = 752;
    img.alt = `${project.name} project example`;
    img.draggable = false;
    img.decoding = "async";
    if (i === 0) {
      img.fetchPriority = "high";
    } else {
      img.loading = "lazy";                   // fetched after the preloader (see loadAll)
    }
    // Per-image crop focus (data-driven, so it is set here rather than in CSS)
    if (project.focus) img.style.setProperty("--focus", project.focus);
    slide.appendChild(img);
    track.appendChild(slide);

    // Dot
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-dot";
    dot.setAttribute("aria-label", `Show ${project.name}`);
    dot.addEventListener("click", () => select(i, { byUser: true }));
    dotsWrap.appendChild(dot);
  });

  const buttons = $$(".hero-list__item", list);
  const slides = $$(".hero-slide", track);
  const dots = $$(".hero-dot", dotsWrap);

  // Large screens: the line beside the selected item (same as the case study menu).
  // Hidden from screen readers; the selected button already says aria-pressed.
  const line = document.createElement("li");
  line.className = "hero-list__line";
  line.setAttribute("aria-hidden", "true");
  list.appendChild(line);

  function placeLine() {
    if (!mqLarge.matches) return;
    const btn = buttons[index];
    line.style.setProperty("--line-y", (btn.offsetTop + (btn.offsetHeight - line.offsetHeight) / 2) + "px");
  }

  /* ---- Select a project ---- */
  function select(i, { byUser = false, fromCycle = false } = {}) {
    index = Math.max(0, Math.min(HERO_PROJECTS.length - 1, i));
    if (byUser) stopCycle();

    buttons.forEach((b, n) => b.setAttribute("aria-pressed", String(n === index)));
    slides.forEach((s, n) => {
      s.classList.toggle("is-active", n === index);
      s.setAttribute("aria-hidden", String(n !== index));
    });
    dots.forEach((d, n) => {
      d.classList.toggle("is-active", n === index);
      if (n === index) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });

    track.style.setProperty("--offset", index);
    if (fromCycle) bringItemToFront(buttons[index]); else keepListItemVisible(buttons[index]);
    placeLine();
    if (cycling) restartProgress();
  }

  /* Small screens: scroll the horizontal list so the selected item is in view
     (scrolls only the list, never the page) */
  function keepListItemVisible(btn) {
    if (mqLarge.matches) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = btn.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
    if (itemRect.left < listRect.left + pad || itemRect.right > listRect.right - pad) {
      list.scrollBy({ left: itemRect.left - listRect.left - pad, behavior: mqReducedMotion.matches ? "auto" : "smooth" });
    }
  }

  /* Small screens, during the auto-cycle: scroll the row so the new item takes the
     first position (it "replaces" the previous one, and shows the row scrolls) */
  function bringItemToFront(btn) {
    if (mqLarge.matches) return;
    const left = btn.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollBy({ left, behavior: mqReducedMotion.matches ? "auto" : "smooth" });
  }

  /* ---- Auto-cycle ----
     The timing lives in CSS: the progress fill is an animation lasting
     heroCycleDelay. When it ends we move to the next project (looping).
     Pausing = pausing that animation, so it resumes exactly where it froze. */
  function indicator() {
    return mqLarge.matches ? line : buttons[index];
  }
  function restartProgress() {
    buttons.forEach((b) => b.classList.remove("is-progressing"));
    line.classList.remove("is-progressing");
    const el = indicator();
    void el.offsetWidth;                // restart the CSS animation
    el.classList.add("is-progressing");
  }
  function onProgressEnd(e) {
    if (!cycling || e.animationName !== "hero-progress") return;
    select((index + 1) % HERO_PROJECTS.length, { fromCycle: true });
  }
  line.addEventListener("animationend", onProgressEnd);
  buttons.forEach((b) => b.addEventListener("animationend", onProgressEnd));

  function setPaused(reason, on) {
    if (on) pauses.add(reason); else pauses.delete(reason);
    if (pauses.size) heroSection.setAttribute("data-paused", ""); else heroSection.removeAttribute("data-paused");
  }

  function startCycle() {
    if (mqReducedMotion.matches || cycling) return;
    cycling = true;
    restartProgress();
  }
  /* Any click, tap or drag: stop for good; the indicator stays full */
  function stopCycle() {
    if (!cycling) return;
    cycling = false;
    buttons.forEach((b) => b.classList.remove("is-progressing"));
    line.classList.remove("is-progressing");
    heroSection.removeAttribute("data-paused");
  }

  // Pause while the mouse is over the list or the image
  [list, carousel].forEach((el) => {
    el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") setPaused("hover", true); });
    el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setPaused("hover", false); });
    // Touch: the first tap anywhere on them stops the cycle
    el.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") stopCycle(); });
  });
  // Pause while the hero is off screen or the tab is hidden
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => setPaused("offscreen", !entry.isIntersecting), { threshold: 0.2 })
      .observe(heroSection);
  }
  document.addEventListener("visibilitychange", () => setPaused("hidden", document.hidden));

  /* ---- Dragging ----
     Large screens: drag up/down. Small/medium: swipe left/right.
     The mouse wheel is ignored on purpose (the page scrolls normally). */
  let drag = null;

  carousel.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".hero-dot")) return;
    const vertical = mqLarge.matches;
    drag = {
      id: e.pointerId,
      vertical,
      start: vertical ? e.clientY : e.clientX,
      cross: vertical ? e.clientX : e.clientY,
      size: vertical ? carousel.clientHeight : carousel.clientWidth,
      delta: 0,
      time: performance.now(),
      locked: e.pointerType === "mouse", // touch waits to see which way the finger goes
    };
    if (drag.locked) {
      carousel.setPointerCapture(e.pointerId);
      carousel.classList.add("is-dragging");
    }
  });

  carousel.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const pos = drag.vertical ? e.clientY : e.clientX;
    const cross = drag.vertical ? e.clientX : e.clientY;
    const delta = pos - drag.start;

    if (!drag.locked) {
      // Decide: is this a carousel swipe or a page scroll?
      if (Math.abs(cross - drag.cross) > Math.abs(delta) && Math.abs(cross - drag.cross) > 6) { drag = null; return; }
      if (Math.abs(delta) < 6) return;
      drag.locked = true;
      carousel.setPointerCapture(e.pointerId);
      carousel.classList.add("is-dragging");
    }

    // Resist at the ends (no slide before the first or after the last)
    const atStart = index === 0 && delta > 0;
    const atEnd = index === HERO_PROJECTS.length - 1 && delta < 0;
    drag.delta = atStart || atEnd ? delta * 0.3 : delta;
    track.style.setProperty("--drag", drag.delta + "px");
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { delta, size, time, locked } = drag;
    drag = null;
    carousel.classList.remove("is-dragging");
    track.style.setProperty("--drag", "0px");
    if (!locked) return;

    const speed = Math.abs(delta) / Math.max(1, performance.now() - time);
    const farEnough = Math.abs(delta) > size * SETTINGS.heroDragThreshold;
    if (farEnough || speed > SETTINGS.heroFlickSpeed) {
      select(index + (delta < 0 ? 1 : -1), { byUser: true });
    } else {
      stopCycle();
    }
  }
  carousel.addEventListener("pointerup", endDrag);
  carousel.addEventListener("pointercancel", endDrag);

  /* ---- Fetch the remaining images quietly once the page is ready ---- */
  function loadAll() {
    slides.forEach((s) => { const img = $("img", s); if (img.loading === "lazy") img.loading = "eager"; });
  }

  select(0);

  // Re-align the list (and move the progress to the right indicator) when
  // switching between small and large layouts
  mqLarge.addEventListener("change", () => select(index));
  // The line's position depends on text size, so re-place it once fonts load and on resize
  document.fonts?.ready.then(placeLine);
  window.addEventListener("resize", placeLine);

  return { startCycle, loadAll };
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
      if (hero) { hero.loadAll(); hero.startCycle(); }
    }, wait);
  }

  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish);

  // Never wait more than 5 seconds (slow network): show the page anyway
  setTimeout(finish, 5000);
})();
