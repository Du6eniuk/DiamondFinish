/* ==========================================================================
   DiamondFinish — interactions
   Mobile menu, sticky-header state, active nav link, scroll reveal,
   before/after sample board, finish switcher, mobile call bar, estimate form.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  const setNav = (open) => {
    root.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => setNav(!root.classList.contains("nav-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("nav-open")) { setNav(false); toggle.focus(); }
    });
    matchMedia("(min-width: 1080px)").addEventListener("change", (e) => { if (e.matches) setNav(false); });
  }

  /* ---------- Header shadow once the page scrolls ---------- */
  const header = document.querySelector("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Active nav link + scroll reveal ---------- */
  const reveals = document.querySelectorAll("[data-reveal]");

  // Once revealed, drop the attribute so the element's own hover transitions take over again.
  const settle = (el) => {
    const done = () => { el.removeAttribute("data-reveal"); el.classList.remove("is-visible"); };
    el.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 1500);
  };

  if ("IntersectionObserver" in window) {
    const links = [...document.querySelectorAll('.nav__list a[href^="#"]')];
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + entry.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((a) => { const s = document.querySelector(a.hash); if (s) spy.observe(s); });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        settle(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.removeAttribute("data-reveal"));
  }

  /* ---------- Before/after sample board ---------- */
  const board = document.querySelector("[data-compare]");

  if (board) {
    const handle = board.querySelector('[role="slider"]');
    let pos = 50;
    let dragging = false;
    let introFrame = 0;

    // --pos drives the clip and divider; unitless --p lets CSS fade the Before/After tags.
    const set = (value) => {
      pos = Math.min(100, Math.max(0, value));
      board.style.setProperty("--pos", pos + "%");
      board.style.setProperty("--p", pos.toFixed(2));
      const v = Math.round(pos);
      handle.setAttribute("aria-valuenow", v);
      handle.setAttribute("aria-valuetext", `${v}% bare concrete, ${100 - v}% finished floor`);
    };

    const fromPointer = (e) => {
      const r = board.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };

    const stopIntro = () => {
      cancelAnimationFrame(introFrame);
      introFrame = 0;
    };

    board.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".finish-switch")) return;
      stopIntro();
      dragging = true;
      board.classList.add("is-dragging");
      try { board.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      fromPointer(e);
    });
    board.addEventListener("pointermove", (e) => { if (dragging) fromPointer(e); });
    const endDrag = () => { dragging = false; board.classList.remove("is-dragging"); };
    board.addEventListener("pointerup", endDrag);
    board.addEventListener("pointercancel", endDrag);

    handle.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 10 : 2;
      const next = {
        ArrowLeft: pos - step, ArrowDown: pos - step,
        ArrowRight: pos + step, ArrowUp: pos + step,
        PageDown: pos - 10, PageUp: pos + 10, Home: 0, End: 100,
      }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      stopIntro();
      set(next);
    });

    // Finish switcher: swaps the "after" texture and pre-selects the same finish in the estimate form.
    board.querySelectorAll('input[name="finish"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        board.dataset.finish = radio.value;
        const match = document.querySelector(`[data-estimate-form] input[name="finish"][value="${radio.value[0].toUpperCase() + radio.value.slice(1)}"]`);
        if (match) match.checked = true;
      });
    });

    set(50);

    // Intro: one slow sweep across the board so visitors see it can be dragged.
    const intro = () => {
      const keys = [[0, 50], [1100, 76], [2300, 26], [3200, 52]];
      const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      let start = 0;
      const frame = (now) => {
        start ||= now;
        const t = now - start;
        const i = keys.findIndex((k) => k[0] > t);
        if (i === -1) { set(keys[keys.length - 1][1]); introFrame = 0; return; }
        const [t0, p0] = keys[i - 1];
        const [t1, p1] = keys[i];
        set(p0 + (p1 - p0) * ease((t - t0) / (t1 - t0)));
        introFrame = requestAnimationFrame(frame);
      };
      introFrame = requestAnimationFrame(frame);
    };

    if (!reduceMotion && "IntersectionObserver" in window) {
      const seen = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        setTimeout(() => { if (!dragging && pos === 50) intro(); }, 700);
      }, { threshold: 0.6 });
      seen.observe(board);
    }
  }

  /* ---------- Mobile call bar: appears once the hero buttons scroll away ---------- */
  const bar = document.querySelector(".mobile-bar");
  const heroCtas = document.querySelector(".hero__ctas");
  if (bar && heroCtas && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      const e = entries[0];
      bar.classList.toggle("is-visible", !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCtas);
  } else if (bar) {
    bar.classList.add("is-visible");
  }

  /* ---------- "Free estimate" links focus the form ---------- */
  document.querySelectorAll('a[href="#estimate"]').forEach((a) => {
    a.addEventListener("click", () => {
      setTimeout(() => document.getElementById("e-name")?.focus({ preventScroll: true }), 700);
    });
  });

  /* ---------- Estimate form ---------- */
  const form = document.querySelector("[data-estimate-form]");
  const formWrap = document.querySelector("[data-estimate]");
  const success = document.querySelector("[data-estimate-success]");

  if (form && formWrap && success) {
    const phone = form.elements.phone;
    const zip = form.elements.zip;

    // Format US numbers as the user types: (561) 563-7724
    phone.addEventListener("input", () => {
      const d = phone.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
      phone.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
        : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}`
        : d;
    });
    zip.addEventListener("input", () => { zip.value = zip.value.replace(/\D/g, "").slice(0, 5); });

    const rules = {
      name: (v) => v.trim().length >= 2 || "Please enter your name.",
      phone: (v) => v.replace(/\D/g, "").length === 10 || "Enter a 10-digit phone number.",
      zip: (v) => /^\d{5}$/.test(v) || "Enter a 5-digit ZIP code.",
      project: (v) => !!v || "Choose the space you'd like coated.",
    };

    const check = (name) => {
      const input = form.elements[name];
      const result = rules[name](input.value);
      const field = input.closest(".field");
      const ok = result === true;
      field.classList.toggle("is-invalid", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      field.querySelector(".field__error").textContent = ok ? "" : result;
      return ok;
    };

    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener("blur", () => { if (input.value) check(name); });
      input.addEventListener("change", () => { if (input.closest(".is-invalid")) check(name); });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const invalid = Object.keys(rules).filter((name) => !check(name));
      if (invalid.length) { form.elements[invalid[0]].focus(); return; }

      // Showcase build: no backend. Hook a form service (Formspree, Web3Forms, etc.) in here.
      const data = Object.fromEntries(new FormData(form));
      success.querySelector('[data-out="name"]').textContent = data.name.trim().split(/\s+/)[0];
      success.querySelector('[data-out="phone"]').textContent = data.phone;
      formWrap.hidden = true;
      success.hidden = false;
      success.querySelector("button").focus();
    });

    success.querySelector("[data-estimate-reset]").addEventListener("click", () => {
      form.reset();
      success.hidden = true;
      formWrap.hidden = false;
      form.elements.name.focus();
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
