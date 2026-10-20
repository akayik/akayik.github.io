/* =====================================================================
   CASE STUDY SCRIPT
   ---------------------------------------------------------------------
   Runs after js/main.js (which handles the theme, navbar, top blur,
   preloader and entrance animations). It reuses main.js's helpers:
   $, $$, root, mqLarge, mqReducedMotion, events, SETTINGS.

     1. CS_SETTINGS   timings and feel (edit these)
     2. Carousels     drag / swipe / dots, loops after the last slide
     3. Videos        play without controls while on screen
     4. Side menu     built from the groups' data-menu labels
     5. Lightbox      per-section groups, captions, zoom, swipe, keys
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SETTINGS
   --------------------------------------------------------------------- */
const CS_SETTINGS = {
  // How long one carousel move takes (ms). Same as the landing carousel.
  carouselDuration: 900,
  // A drag must cover this share of the image (0–1) to change the slide…
  dragThreshold: 0.15,
  // …or be flicked faster than this (px per ms)
  flickSpeed: 0.5,
  // Sideways trackpad scroll: how far (px) before it changes slide…
  wheelThreshold: 40,
  // …and how long a pause (ms) ends one swipe, so the next swipe can move again
  wheelGestureGap: 180,

  // Side menu, large screens: a section becomes "current" once its top has
  // passed this share of the menu's height (0.5 = half the menu).
  menuActiveShareLarge: 0.5,
  // Small/medium: once its top passes this far below the pill's top (px)
  menuActiveOffsetSmall: 8,

  // Lightbox zoom level when an image is clicked
  lightboxZoom: 2,
  // A lightbox swipe must be at least this long (px)
  lightboxSwipe: 50,
};


/* ---------------------------------------------------------------------
   2. CAROUSELS
   Any [data-carousel]. Drag with the mouse or swipe sideways; the arrow
   pills step one image, dots jump.
   After the last slide it loops back to the first (and the other way).
   A drag never opens the lightbox; a plain click does.
   --------------------------------------------------------------------- */
const carousels = [];

// Optional crop focus: data-focus="center top" on a figure or slide
$$("[data-focus]").forEach((el) => {
  const media = $("img, video", el);
  if (media) media.style.setProperty("--focus", el.dataset.focus);
});

$$("[data-carousel]").forEach((carousel) => {
  const track = $(".cs-carousel__track", carousel);
  const slides = $$(".cs-carousel__slide", track);
  if (!track || !slides.length) return;

  let index = 0;
  carousel.style.setProperty("--carousel-duration", CS_SETTINGS.carouselDuration + "ms");

  // Controls (only when there is more than one slide):
  // ( ‹ )  ( • • • )  ( › )   three frosted pills along the bottom
  const dots = [];
  if (slides.length > 1) {
    const controls = document.createElement("div");
    controls.className = "cs-carousel__controls";

    const arrow = (dir) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cs-carousel__arrow cs-carousel__arrow--${dir}`;
      btn.setAttribute("aria-label", dir === "prev" ? "Previous image" : "Next image");
      // Own small chevron (the sprite's one gets too thin at this size); points left, CSS flips "next"
      btn.innerHTML = '<svg viewBox="0 0 8 14" aria-hidden="true"><path d="M6.5 1.5 1.5 7l5 5.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.addEventListener("click", (e) => { e.stopPropagation(); go(index + (dir === "prev" ? -1 : 1)); });
      return btn;
    };

    const dotsWrap = document.createElement("div");
    dotsWrap.className = "cs-carousel__dots";
    dotsWrap.setAttribute("role", "group");
    dotsWrap.setAttribute("aria-label", "Choose image");
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "cs-dot";
      dot.setAttribute("aria-label", `Show image ${i + 1} of ${slides.length}`);
      dot.addEventListener("click", (e) => { e.stopPropagation(); go(i); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    controls.append(arrow("prev"), dotsWrap, arrow("next"));
    carousel.appendChild(controls);
  }

  slides.forEach((s, i) => {
    s.setAttribute("role", "group");
    s.setAttribute("aria-roledescription", "slide");
    s.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
  });

  /* Frame height follows the showing slide, so square and wide images keep
     their shape. Portrait images (taller than wide) are shown at 4:3.
     The shape comes from the width/height written on each img/video. */
  const ratios = slides.map((s) => {
    const m = $("img, video", s);
    const w = Number(m?.getAttribute("width")), h = Number(m?.getAttribute("height"));
    if (!w || !h) return 4 / 3;
    return h > w ? 4 / 3 : w / h;
  });
  function fitHeight() {
    const width = carousel.clientWidth;
    if (!width) return;
    carousel.style.setProperty("--carousel-h", (width / ratios[index]) + "px");
    carousel.classList.add("has-height");
  }
  let lastWidth = 0;
  new ResizeObserver(() => {
    if (carousel.clientWidth !== lastWidth) { lastWidth = carousel.clientWidth; fitHeight(); }   // width only
  }).observe(carousel);

  function go(i) {
    index = (i + slides.length) % slides.length;   // loops at both ends
    fitHeight();
    track.style.setProperty("--offset", index);
    slides.forEach((s, n) => {
      const active = n === index;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", String(!active));
      s.tabIndex = active ? 0 : -1;               // only the visible slide is focusable
    });
    dots.forEach((d, n) => {
      d.classList.toggle("is-active", n === index);
      if (n === index) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
    carousel.dispatchEvent(new Event("slidechange"));
  }

  /* ---- Dragging (mouse) / swiping (touch) ---- */
  let drag = null;

  carousel.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".cs-carousel__controls") || slides.length < 2) return;
    // Mouse: stop the browser from starting a text selection or its own image drag
    if (e.pointerType === "mouse") e.preventDefault();
    drag = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      delta: 0,
      time: performance.now(),
      locked: false,
    };
  });

  carousel.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.locked) {
      // Touch: a mostly-vertical move is a page scroll, not a swipe
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { drag = null; return; }
      if (Math.abs(dx) < 6) return;
      drag.locked = true;
      carousel.setPointerCapture(e.pointerId);
      carousel.classList.add("is-dragging");
    }
    drag.delta = dx;
    track.style.setProperty("--drag", dx + "px");
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { delta, time, locked } = drag;
    drag = null;
    carousel.classList.remove("is-dragging");
    track.style.setProperty("--drag", "0px");
    if (!locked) return;

    // This was a drag: stop the click that follows from opening the lightbox
    carousel.dataset.justDragged = "true";
    setTimeout(() => delete carousel.dataset.justDragged, 0);

    const speed = Math.abs(delta) / Math.max(1, performance.now() - time);
    if (Math.abs(delta) > carousel.clientWidth * CS_SETTINGS.dragThreshold || speed > CS_SETTINGS.flickSpeed) {
      go(index + (delta < 0 ? 1 : -1));
    }
  }
  carousel.addEventListener("pointerup", endDrag);
  carousel.addEventListener("pointercancel", endDrag);
  carousel.addEventListener("dragstart", (e) => e.preventDefault());

  /* ---- Sideways trackpad scrolling (or shift + mouse wheel) ----
     One sideways swipe = one slide. Vertical scrolling is left alone, so
     the page still scrolls normally over the carousel. */
  let wheelSum = 0;
  let wheelLocked = false;
  let wheelTimer = null;
  carousel.addEventListener("wheel", (e) => {
    if (slides.length < 2) return;
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;   // mostly vertical: let the page scroll
    e.preventDefault();               // also stops the browser's swipe-back gesture
    clearTimeout(wheelTimer);
    // The gesture counts as finished once the events stop for a moment
    wheelTimer = setTimeout(() => { wheelSum = 0; wheelLocked = false; }, CS_SETTINGS.wheelGestureGap);
    if (wheelLocked) return;
    wheelSum += dx;
    if (Math.abs(wheelSum) > CS_SETTINGS.wheelThreshold) {
      go(index + (wheelSum > 0 ? 1 : -1));
      wheelLocked = true;             // one slide per swipe, however long the swipe
      wheelSum = 0;
    }
  }, { passive: false });

  // Keyboard: left/right arrows while a slide is focused
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); slides[index].focus({ preventScroll: true }); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); go(index - 1); slides[index].focus({ preventScroll: true }); }
  });

  go(0);
  carousels.push({ el: carousel, slides, isActive: (slide) => slides.indexOf(slide) === index });
});


/* ---------------------------------------------------------------------
   3. VIDEOS
   Muted, looping, no controls. A video plays only while it is on
   screen and, inside a carousel, only while its slide is showing.
   Visitors who ask for reduced motion see the first frame instead.
   --------------------------------------------------------------------- */
(function videos() {
  const list = $$(".cs-body video, .cs-hero video");
  if (!list.length) return;

  const visible = new Set();

  function shouldPlay(video) {
    if (mqReducedMotion.matches || !visible.has(video)) return false;
    const slide = video.closest(".cs-carousel__slide");
    return !slide || slide.classList.contains("is-active");
  }
  function update(video) {
    if (shouldPlay(video)) {
      const p = video.play();
      if (p && p.catch) p.catch(() => { /* autoplay blocked: stays on the first frame */ });
    } else {
      video.pause();
    }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      update(entry.target);
    });
  }, { threshold: 0.25 });

  list.forEach((video) => {
    video.muted = true;          // required for autoplay
    video.removeAttribute("controls");
    observer.observe(video);
  });

  // Carousel slide changes start/stop their videos
  carousels.forEach(({ el }) => el.addEventListener("slidechange", () => $$("video", el).forEach(update)));
})();


/* ---------------------------------------------------------------------
   4. SIDE MENU
   One menu item per <section class="cs-group" data-menu="Label" id="…">.
   Several sections can sit in one group, so the menu never has to match
   the sections one to one.

   Current item:
     large:        the last group whose first title has passed the middle of the menu
     small/medium: the last group whose first title has passed just under the pill's top
   Clicking an item scrolls so that group's title lines up with the menu's top.
   --------------------------------------------------------------------- */
(function sideMenu() {
  const menu = $("#cs-menu");
  const groups = $$(".cs-group[data-menu]");
  if (!menu || !groups.length) return;

  const toggle = $(".cs-menu__toggle", menu);
  const panel = $(".cs-menu__panel", menu);
  const list = $(".cs-menu__list", menu);
  const line = $(".cs-menu__line", menu);
  const marks = $(".cs-menu__marks", menu);

  // Build the links (and the pill's marks)
  const links = groups.map((group) => {
    const label = group.dataset.menu;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "cs-menu__link";
    a.href = "#" + group.id;
    a.textContent = label;
    a.dataset.label = label;    // reserves the bold width (see CSS)
    li.appendChild(a);
    list.appendChild(li);

    const mark = document.createElement("span");
    mark.className = "cs-menu__mark";
    marks.appendChild(mark);
    return a;
  });
  const markEls = $$(".cs-menu__mark", marks);

  // The point in each group that counts as "its top": where its first title sits
  // (the group's top + its padding). Measured on the group itself, because the
  // title may still be shifted by its entrance animation.
  const anchorTop = (group) => group.getBoundingClientRect().top + parseFloat(getComputedStyle(group).paddingTop);

  let current = -1;

  function setCurrent(i) {
    if (i === current) return;
    current = i;
    links.forEach((a, n) => {
      if (n === i) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    markEls.forEach((m, n) => m.classList.toggle("is-active", n === i));
    placeLine();
    measurePill();
  }

  // Moves the line next to the current item
  function placeLine() {
    const a = links[current];
    if (!a || !line) return;
    const thickness = line.offsetHeight;
    line.style.setProperty("--line-y", (a.offsetTop + (a.offsetHeight - thickness) / 2) + "px");
  }

  // The panel opens out of the pill, so it needs the pill's height
  function measurePill() {
    if (toggle && toggle.offsetHeight) menu.style.setProperty("--pill-h", toggle.offsetHeight + "px");
  }

  /* While a menu click is scrolling the page, the menu stays on the clicked
     item instead of stepping through every group it passes (that stepping
     was the "flutter"). Released when the scroll settles, or as soon as the
     visitor scrolls by themselves. */
  let lock = null;   // { index, timer }

  function releaseLock() {
    if (!lock) return;
    clearTimeout(lock.timer);
    lock = null;
    update();
  }
  function holdLock() {
    // Each scroll frame pushes the release back; when frames stop, the scroll has ended
    clearTimeout(lock.timer);
    lock.timer = setTimeout(releaseLock, 150);
  }
  ["wheel", "touchstart", "keydown"].forEach((type) =>
    window.addEventListener(type, () => { if (lock) releaseLock(); }, { passive: true }));

  function update() {
    if (lock) { holdLock(); return; }
    const rect = mqLarge.matches ? menu.getBoundingClientRect() : (toggle || menu).getBoundingClientRect();
    const refY = mqLarge.matches
      ? rect.top + rect.height * CS_SETTINGS.menuActiveShareLarge
      : rect.top + CS_SETTINGS.menuActiveOffsetSmall;

    let active = 0;
    groups.forEach((g, i) => { if (anchorTop(g) <= refY) active = i; });

    // At the very bottom of the page the last item is current, even if its title can't reach the line
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = groups.length - 1;
    setCurrent(active);
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", () => { placeLine(); measurePill(); update(); });
  mqLarge.addEventListener("change", () => { close(); placeLine(); measurePill(); update(); });
  document.fonts?.ready.then(() => { placeLine(); measurePill(); });

  /* ---- Where the menu's top will be once the scroll ends ----
     Mirrors the CSS: (navbar height + space-5) × blur factor + space-4.
     Scrolling down hides the navbar (factor 0.9); scrolling up shows it (1.2). */
  const probe = document.createElement("div");
  probe.className = "cs-measure";
  probe.setAttribute("aria-hidden", "true");
  document.body.appendChild(probe);

  function menuTopAfterScroll(goingDown, targetY) {
    const css = getComputedStyle(probe);
    const base = parseFloat(css.height);          // navbar height + space-5
    const gap = parseFloat(css.paddingTop);       // space-4
    let factor = goingDown ? 0.9 : 1.2;
    if (targetY < SETTINGS.navHideAfter) factor = 1;
    return base * factor + gap;
  }

  function scrollToGroup(i) {
    const absTop = anchorTop(groups[i]) + window.scrollY;
    let target = absTop - menuTopAfterScroll(absTop > window.scrollY + 1, absTop);
    const goingDown = target > window.scrollY;
    target = absTop - menuTopAfterScroll(goingDown, target);
    window.scrollTo({ top: Math.max(0, target), behavior: mqReducedMotion.matches ? "auto" : "smooth" });
    history.replaceState(null, "", "#" + groups[i].id);
  }

  links.forEach((a, i) => a.addEventListener("click", (e) => {
    e.preventDefault();
    close();
    setCurrent(i);
    if (lock) clearTimeout(lock.timer);
    lock = { index: i, timer: null };
    holdLock();
    scrollToGroup(i);
  }));

  /* ---- Small/medium: open and close the panel ---- */
  function open() {
    measurePill();
    menu.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    requestAnimationFrame(placeLine);
  }
  function close() {
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle?.addEventListener("click", () => (menu.classList.contains("is-open") ? close() : open()));
  document.addEventListener("pointerdown", (e) => { if (!menu.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { close(); toggle.focus(); }
  });
  // Tabbing out of the open panel closes it
  menu.addEventListener("focusout", (e) => { if (!menu.contains(e.relatedTarget)) close(); });

  // Arriving with a #hash (e.g. a shared link): align that group once the page is ready
  events.addEventListener("ready", () => {
    const i = groups.findIndex((g) => "#" + g.id === location.hash);
    if (i > -1) setTimeout(() => scrollToGroup(i), 50);
    update();
  });

  update();
})();


/* ---------------------------------------------------------------------
   5. LIGHTBOX
   Every [data-lightbox-item] opens the lightbox. Items inside the same
   [data-lightbox-group] (one per article, plus the landing carousel)
   form one set: arrows, swipe and ←/→ move within it, and it loops.
   Caption = the item's data-caption. Images zoom on click.
   --------------------------------------------------------------------- */
(function lightbox() {
  const box = $("#lightbox");
  if (!box) return;

  const stage = $(".lightbox__stage", box);
  const caption = $(".lightbox__caption", box);
  const text = $(".lightbox__text", box);
  const count = $(".lightbox__count", box);
  const prevBtn = $(".lightbox__nav--prev", box);
  const nextBtn = $(".lightbox__nav--next", box);
  const closeBtn = $(".lightbox__close", box);

  let items = [];
  let index = 0;
  let lastFocus = null;
  let closeTimer = null;

  // Make every item reachable by keyboard
  $$("[data-lightbox-item]").forEach((item) => {
    if (!item.hasAttribute("tabindex")) item.tabIndex = 0;
    item.setAttribute("role", "button");
    const media = $("img, video", item);
    const what = media && media.tagName === "VIDEO" ? "video" : "image";
    item.setAttribute("aria-label", `Open ${what}: ${item.dataset.caption || media?.alt || ""}`.trim());
  });

  function openFrom(item) {
    const group = item.closest("[data-lightbox-group]");
    items = group ? $$("[data-lightbox-item]", group) : [item];
    index = Math.max(0, items.indexOf(item));
    lastFocus = document.activeElement;

    clearTimeout(closeTimer);
    box.hidden = false;
    box.classList.toggle("is-single", items.length < 2);
    root.classList.add("is-lightbox-open");
    show(index, 0);
    requestAnimationFrame(() => box.classList.add("is-open"));
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (box.hidden) return;
    box.classList.remove("is-open");
    root.classList.remove("is-lightbox-open");
    $$("video", stage).forEach((v) => v.pause());
    closeTimer = setTimeout(() => { box.hidden = true; stage.replaceChildren(); }, 400);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  // Builds the big version of an item's image or video
  function buildMedia(item) {
    const src = $("img, video", item);
    if (!src) return document.createElement("div");
    let el;
    if (src.tagName === "VIDEO") {
      el = document.createElement("video");
      el.src = src.currentSrc || src.src;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.autoplay = !mqReducedMotion.matches;
      el.setAttribute("aria-label", src.getAttribute("aria-label") || "");
    } else {
      el = document.createElement("img");
      // Full-screen: let the browser pick the sharpest size from the srcset
      if (src.srcset) { el.sizes = "100vw"; el.srcset = src.srcset; }
      el.src = src.currentSrc || src.src;
      el.alt = src.alt;
      el.draggable = false;
    }
    if (src.getAttribute("width")) { el.width = src.getAttribute("width"); el.height = src.getAttribute("height"); }
    el.className = "lightbox__media";
    return el;
  }

  // dir: 1 = next, -1 = previous, 0 = first open (no slide animation)
  function show(i, dir) {
    index = (i + items.length) % items.length;
    const item = items[index];
    const swap = () => {
      stage.classList.remove("is-zoomed", "is-panning", "is-leaving");
      stage.replaceChildren(buildMedia(item));
      const cap = item.dataset.caption || "";
      text.textContent = cap;
      count.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : "";
      caption.classList.toggle("is-empty", !cap && items.length < 2);
    };

    if (!dir || mqReducedMotion.matches) { swap(); return; }
    stage.style.setProperty("--dir", dir);
    stage.classList.add("is-leaving");
    setTimeout(() => {
      swap();
      stage.classList.add("is-entering");
      stage.getBoundingClientRect();        // apply the start position before animating in
      stage.classList.remove("is-entering");
    }, 200);
  }

  const next = () => show(index + 1, 1);
  const prev = () => show(index - 1, -1);

  /* ---- Opening: click or Enter/Space on an item ---- */
  document.addEventListener("click", (e) => {
    const item = e.target.closest("[data-lightbox-item]");
    if (!item) return;
    if (item.closest("[data-carousel]")?.dataset.justDragged) return;   // that was a drag
    if (item.getAttribute("aria-hidden") === "true") return;            // a hidden carousel slide
    openFrom(item);
  });
  document.addEventListener("keydown", (e) => {
    const item = e.target.closest?.("[data-lightbox-item]");
    if (item && box.hidden && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openFrom(item); }
  });

  /* ---- Buttons and keys inside the lightbox ---- */
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  $$("[data-lightbox-close]", box).forEach((el) => el.addEventListener("click", close));

  // Listens on the whole document: clicking the image moves focus out of the buttons
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight" && items.length > 1) { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" && items.length > 1) { e.preventDefault(); prev(); }
    else if (e.key === "Tab") {
      // Keep keyboard focus inside the lightbox
      const focusable = $$("button", box).filter((b) => b.offsetParent !== null);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---- Click to zoom (images), move to look around; swipe to change ---- */
  let press = null;

  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  });

  stage.addEventListener("pointermove", (e) => {
    const img = $("img.lightbox__media", stage);
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.moved = true;
    // While zoomed, the zoom point follows the pointer
    if (img && stage.classList.contains("is-zoomed")) {
      const r = img.getBoundingClientRect();
      stage.classList.add("is-panning");
      img.style.setProperty("--zoom-x", Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)) + "%");
      img.style.setProperty("--zoom-y", Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) + "%");
    }
  });

  stage.addEventListener("pointerup", (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    const moved = press.moved;
    press = null;
    const img = $("img.lightbox__media", stage);
    const zoomed = stage.classList.contains("is-zoomed");

    if (moved) {
      // A swipe changes the image (not while zoomed: then the move is for looking around)
      if (!zoomed && items.length > 1 && Math.abs(dx) > CS_SETTINGS.lightboxSwipe) (dx < 0 ? next : prev)();
      return;
    }
    if (!img) return;
    if (zoomed) {
      stage.classList.remove("is-zoomed", "is-panning");
    } else {
      const r = img.getBoundingClientRect();
      img.style.setProperty("--zoom-x", ((e.clientX - r.left) / r.width) * 100 + "%");
      img.style.setProperty("--zoom-y", ((e.clientY - r.top) / r.height) * 100 + "%");
      stage.classList.add("is-zoomed");
    }
  });
  stage.addEventListener("pointerleave", () => stage.classList.remove("is-panning"));
})();
