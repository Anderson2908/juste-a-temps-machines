/* Anderson */
console.log("%c Anderson ","background:#c36043;color:#fff;padding:3px 10px;border-radius:999px;font-weight:700;letter-spacing:.04em");
(function () {
  "use strict";

  // Scroll fluide : Lenis sur desktop/tablette, offset header dynamique
  function setupScroll() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const useLenis =
      !reduceMotion &&
      window.matchMedia("(min-width: 769px)").matches &&
      typeof Lenis !== "undefined";

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    let lenis = null;

    if (useLenis) {
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.14,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
      });
    }

    function getHeaderOffset() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 72;
    }

    function scrollToTop(immediate) {
      if (lenis) {
        lenis.scrollTo(0, { immediate: Boolean(immediate) });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: immediate || reduceMotion ? "auto" : "smooth" });
    }

    function getHashTarget(href) {
      if (!href || !href.includes("#")) return null;
      const hash = href.slice(href.indexOf("#"));
      if (hash.length < 2) return null;
      return document.querySelector(hash);
    }

    function isSamePageLink(href) {
      if (href.startsWith("#")) return true;
      const page = href.split("#")[0];
      const current = location.pathname.split("/").pop() || "index.html";
      return page === current || (current === "" && page === "index.html");
    }

    function scrollToTarget(target, immediate) {
      if (!target) return;

      const offset = -getHeaderOffset();
      const anchor = target.id ? `#${target.id}` : target;

      if (lenis) {
        lenis.scrollTo(anchor, {
          offset,
          immediate: Boolean(immediate),
          lock: true,
          duration: immediate ? 0 : 1.15,
        });
        return;
      }

      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY + offset);
      window.scrollTo({
        top,
        left: 0,
        behavior: reduceMotion || immediate ? "auto" : "smooth",
      });
    }

    document.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest('a[href*="#"]');
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        if (!isSamePageLink(href)) return;

        const hash = href.startsWith("#") ? href : href.slice(href.indexOf("#"));

        if (hash === "#top") {
          e.preventDefault();
          scrollToTop(false);
          navMain?.classList.remove("is-open");
          navToggle?.setAttribute("aria-expanded", "false");
          history.pushState(null, "", location.pathname + location.search);
          return;
        }

        const target = getHashTarget(href);
        if (!target) return;

        e.preventDefault();
        scrollToTarget(target);

        navMain?.classList.remove("is-open");
        navToggle?.setAttribute("aria-expanded", "false");
        history.pushState(null, "", hash);
      },
      false
    );

    // Bouton flottant « retour en haut »
    const toTopBtn = document.createElement("button");
    toTopBtn.type = "button";
    toTopBtn.className = "back-to-top";
    toTopBtn.setAttribute("aria-label", "Revenir en haut de la page");
    toTopBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
    document.body.appendChild(toTopBtn);

    toTopBtn.addEventListener("click", () => scrollToTop(false));

    const header = document.querySelector(".site-header");
    const headerThreshold = 48;

    function onPageScroll(scrollY) {
      toTopBtn.classList.toggle("is-visible", scrollY > 400);
      header?.classList.toggle("is-scrolled", scrollY > headerThreshold);
    }

    if (lenis) {
      lenis.on("scroll", ({ scroll }) => {
        onPageScroll(scroll);
        document.dispatchEvent(new CustomEvent("jat:scroll"));
      });
    } else {
      window.addEventListener("scroll", () => onPageScroll(window.scrollY), { passive: true });
    }
    onPageScroll(lenis ? lenis.scroll : window.scrollY);

    const hash = location.hash;

    if (hash === "#top") {
      requestAnimationFrame(() => scrollToTop(true));
      return;
    }

    const hashTarget = hash ? document.querySelector(hash) : null;

    if (hashTarget) {
      requestAnimationFrame(() => scrollToTarget(hashTarget, true));
    }
  }

  // Menu mobile
  // En-tête : les liens du menu doivent tenir entre le logo et le bouton
  // « Parler à un expert ». Leur largeur dépend de la police installée
  // (Futura sur Mac) et du zoom : on mesure la place réelle et on resserre
  // par paliers (espacements, puis taille du texte) ; le menu burger n'est
  // utilisé qu'en dernier recours. Sous 769 px, le CSS mobile s'en charge.
  function setupHeaderFit() {
    const header = document.querySelector(".site-header");
    const inner = header?.querySelector(".header-inner");
    const list = header?.querySelector(".nav-list");
    const actions = header?.querySelector(".header-actions");
    const logo = header?.querySelector(".logo");
    if (!header || !inner || !list || !actions) return;

    const mobile = window.matchMedia("(max-width: 768px)");
    const PALIERS = ["", "is-nav-tight", "is-nav-tight is-nav-tighter"];
    const TOUTES = ["is-nav-tight", "is-nav-tighter", "is-nav-collapsed"];
    const MARGE = 8;

    function tient() {
      const cs = getComputedStyle(inner);
      const gap = parseFloat(cs.columnGap) || 0;
      const disponible =
        inner.clientWidth -
        (parseFloat(cs.paddingLeft) || 0) -
        (parseFloat(cs.paddingRight) || 0) -
        (logo ? logo.getBoundingClientRect().width : 0) -
        actions.getBoundingClientRect().width -
        2 * gap;
      return list.scrollWidth <= disponible - MARGE;
    }

    function fit() {
      header.classList.remove(...TOUTES);
      if (mobile.matches) return;

      for (const palier of PALIERS) {
        header.classList.remove(...TOUTES);
        if (palier) header.classList.add(...palier.split(" "));
        if (tient()) return;
      }
      header.classList.add("is-nav-collapsed");
    }

    let prevu = 0;
    const planifier = () => {
      cancelAnimationFrame(prevu);
      prevu = requestAnimationFrame(fit);
    };

    if ("ResizeObserver" in window) {
      new ResizeObserver(planifier).observe(inner);
    } else {
      window.addEventListener("resize", planifier);
    }
    document.fonts?.ready.then(planifier);
    fit();
  }

  setupHeaderFit();

  const navToggle = document.querySelector(".nav-toggle");
  const navMain = document.querySelector(".nav-main");

  if (navToggle && navMain) {
    navToggle.addEventListener("click", () => {
      const open = navMain.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    document.querySelectorAll(".has-dropdown > .nav-link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          btn.closest(".nav-item")?.classList.toggle("is-expanded");
        }
      });
    });
  }

  // Hero text rotation (style Pleyce)
  function setupRotator(selector, intervalMs) {
    const el = document.querySelector(selector);
    if (!el) return;

    const words = (el.dataset.rotate || "").split("|").filter(Boolean);
    if (words.length < 2) return;

    const line = el.closest(".hero-line");
    if (line) {
      let maxHeight = 0;
      const previous = el.textContent;
      words.forEach((word) => {
        el.textContent = word;
        maxHeight = Math.max(maxHeight, el.offsetHeight);
      });
      el.textContent = previous;
      line.style.minHeight = `${maxHeight}px`;
    }

    let index = 0;
    setInterval(() => {
      el.classList.add("is-fading");
      setTimeout(() => {
        index = (index + 1) % words.length;
        el.textContent = words[index];
        el.classList.remove("is-fading");
      }, 350);
    }, intervalMs);
  }

  setupRotator(".hero-verb", 2800);
  setupRotator(".hero-object", 3200);
  setupRotator(".hero-target", 3600);

  // Testimonials
  const testimonials = [...document.querySelectorAll(".testimonial")];
  const dotsContainer = document.querySelector("[data-dots-testimonials]");

  if (testimonials.length > 1 && dotsContainer) {
    let current = 0;

    testimonials.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Avis ${i + 1}`);
      if (i === 0) dot.classList.add("is-active");
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });

    const dots = [...dotsContainer.querySelectorAll("button")];

    function goTo(i) {
      testimonials.forEach((t, idx) => t.classList.toggle("is-active", idx === i));
      dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));
      current = i;
    }

    setInterval(() => {
      goTo((current + 1) % testimonials.length);
    }, 6000);
  }

  // Formulaires contact : envoi vers /api/contact (voir server/ et .env.example)
  const CONTACT_EMAIL = "contact@justeatemps.com";
  const CONTACT_API_URL = "/api/contact";
  const NEWSLETTER_API_URL = "/api/newsletter";

  function showFormFeedback(formEl, message, isError = false) {
    let box = formEl.querySelector(".form-feedback");
    if (!box) {
      box = document.createElement("p");
      box.className = "form-feedback";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      formEl.appendChild(box);
    }
    box.textContent = message;
    box.classList.toggle("is-error", isError);
    box.classList.add("is-visible");
  }

  function fieldValue(formEl, name) {
    const el = formEl.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : "";
  }

  function setFormBusy(formEl, busy) {
    const submitBtn = formEl.querySelector('[type="submit"]');
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-busy", busy ? "true" : "false");
  }

  async function submitContactForm(formEl) {
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    const payload = {
      company: fieldValue(formEl, "company"),
      name: fieldValue(formEl, "name"),
      email: fieldValue(formEl, "email"),
      phone: fieldValue(formEl, "phone"),
      message: fieldValue(formEl, "message"),
      source: window.location.pathname.split("/").pop() || "index.html",
    };

    setFormBusy(formEl, true);

    try {
      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi.");
      }

      showFormFeedback(formEl, data.message || "Merci ! Votre demande a bien été envoyée.");
      formEl.reset();
    } catch (error) {
      showFormFeedback(
        formEl,
        `${error.message} Vous pouvez aussi nous écrire à ${CONTACT_EMAIL}.`,
        true
      );
    } finally {
      setFormBusy(formEl, false);
    }
  }

  document.querySelectorAll(".contact-form").forEach((formEl) => {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      submitContactForm(formEl);
    });
  });

  // Newsletter (footer) : envoi vers /api/newsletter — liste Sarbacane dédiée.
  async function submitNewsletterForm(formEl) {
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    const emailInput = formEl.querySelector('input[type="email"]');
    const payload = {
      email: emailInput ? emailInput.value.trim() : "",
      source: window.location.pathname.split("/").pop() || "index.html",
    };

    setFormBusy(formEl, true);

    try {
      const response = await fetch(NEWSLETTER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'inscription.");
      }

      showFormFeedback(formEl, data.message || "Merci ! Votre inscription est bien enregistrée.");
      formEl.reset();
    } catch (error) {
      showFormFeedback(
        formEl,
        `${error.message} Vous pouvez aussi nous écrire à ${CONTACT_EMAIL}.`,
        true
      );
    } finally {
      setFormBusy(formEl, false);
    }
  }

  document.querySelectorAll(".ft-news").forEach((formEl) => {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      submitNewsletterForm(formEl);
    });
  });

  // Filtres catalogue
  function setupCatalogFilters() {
    const bar = document.querySelector("[data-catalog-filters]");
    if (!bar) return;

    const items = [...document.querySelectorAll("[data-catalog-item]")];
    const buttons = [...bar.querySelectorAll("[data-filter]")];

    function applyFilter(filter) {
      buttons.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === filter);
      });
      items.forEach((item) => {
        const match = filter === "all" || item.dataset.catalogItem === filter;
        item.classList.toggle("is-hidden", !match);
      });
    }

    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      const filter = btn.dataset.filter;
      applyFilter(filter);
      history.replaceState(null, "", filter === "all" ? location.pathname : `#${filter}`);
    });

    const hash = location.hash.replace("#", "");
    if (hash && buttons.some((b) => b.dataset.filter === hash)) {
      applyFilter(hash);
    }
  }

  setupCatalogFilters();

  // Apparition au scroll
  function setupScrollReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("js-reveal");

    const staggerSelectors = [
      ".catalog-steps .catalog-step",
      ".services-stack .service-row",
      ".machines-header__inner > *",
      ".machines-grid .machine-item",
      ".machines-cta",
      ".stats-grid .stat",
      ".eco-list li",
      ".home-bcorp__cards .home-bcorp__card",
      ".contact-info__lead",
      ".contact-offices .contact-office",
      ".contact-email",
      ".logos-row .client-logo-wrap",
      ".about-pillars .about-pillar",
      ".about-commitments .about-commitment",
      ".about-values-grid .catalog-benefit",
    ];

    const singleSelectors = [
      ".page-hero__inner",
      ".catalog-steps",
      ".catalog-filters",
      ".catalog-benefits",
      ".catalog-cta-band",
      ".about-section-header",
      ".about-cert__inner",
      ".about-bcorp__inner",
      ".home-bcorp__visual",
      ".home-bcorp__content > *",
      ".about-cta",
      ".hero-content > *",
      ".hero-visual",
      ".section-title",
      ".section-lead",
      ".testimonials",
      ".carousel-dots",
      ".section--logos .eyebrow",
      ".section--logos .logos-row",
      ".section--cta .container > *",
      ".contact-header",
      ".contact-form",
      ".footer-newsletter-band__inner",
      ".footer-brand",
      ".footer-nav .footer-col",
      ".footer-bottom__inner",
    ];

    const seen = new Set();

    function isInsideMarked(el) {
      let node = el.parentElement;
      while (node) {
        if (seen.has(node)) return true;
        node = node.parentElement;
      }
      return false;
    }

    function mark(el, variant) {
      if (!el || seen.has(el) || isInsideMarked(el)) return;
      seen.add(el);
      el.classList.add("reveal");
      if (variant) el.classList.add(variant);
    }

    function stagger(selector, step = 85, max = 480) {
      document.querySelectorAll(selector).forEach((el, i) => {
        mark(el);
        el.style.setProperty("--reveal-delay", `${Math.min(i * step, max)}ms`);
      });
    }

    staggerSelectors.forEach((selector) => stagger(selector));

    let servicesPanelIndex = 0;
    document.querySelectorAll(".services-panel > *").forEach((el) => {
      if (el.classList.contains("services-highlights")) {
        el.querySelectorAll("li").forEach((li) => {
          mark(li);
          li.style.setProperty("--reveal-delay", `${Math.min(servicesPanelIndex * 85, 480)}ms`);
          servicesPanelIndex += 1;
        });
        return;
      }
      mark(el);
      el.style.setProperty("--reveal-delay", `${Math.min(servicesPanelIndex * 85, 480)}ms`);
      servicesPanelIndex += 1;
    });

    document.querySelectorAll(".split-section > :first-child > *").forEach((el, i) => {
      mark(el);
      el.style.setProperty("--reveal-delay", `${Math.min(i * 85, 340)}ms`);
    });

    document.querySelectorAll(".split-section > :last-child:not(:first-child)").forEach((el) => {
      if (el.matches("ul, ol")) return;
      mark(el, "reveal--right");
    });

    singleSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => mark(el));
    });

    document.querySelectorAll(".hero-content > *").forEach((el) => {
      if (el.classList.contains("reveal")) {
        el.classList.add("is-visible");
      }
    });

    function revealPassedElements() {
      const triggerY = window.innerHeight * 0.92;
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
        if (el.getBoundingClientRect().top < triggerY) {
          el.classList.add("is-visible");
        }
      });
    }

    const targets = [...document.querySelectorAll(".reveal:not(.is-visible)")];
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -4% 0px", threshold: 0.01 }
    );

    targets.forEach((el) => observer.observe(el));

    let revealTick = false;
    const onRevealScroll = () => {
      if (revealTick) return;
      revealTick = true;
      requestAnimationFrame(() => {
        revealPassedElements();
        revealTick = false;
      });
    };

    window.addEventListener("scroll", onRevealScroll, { passive: true });
    document.addEventListener("jat:scroll", onRevealScroll);
    revealPassedElements();
  }

  function parseCountValue(text) {
    const match = text.trim().match(/^(\d+)(.*)$/);
    if (!match) return null;
    return { target: parseInt(match[1], 10), suffix: match[2] || "" };
  }

  function formatCountValue(value, suffix) {
    return `${value}${suffix}`;
  }

  function animateCountUp(el, target, suffix, delay, duration) {
    const run = () => {
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatCountValue(Math.round(eased * target), suffix);
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    };

    if (delay) window.setTimeout(run, delay);
    else run();
  }

  function prepareCountElement(el, parsed, reduceMotion) {
    el.dataset.countTarget = String(parsed.target);
    el.dataset.countSuffix = parsed.suffix;
    if (!reduceMotion && parsed.target > 0) {
      el.textContent = formatCountValue(0, parsed.suffix);
    }
  }

  function runCountElement(el, delay, duration) {
    const target = parseInt(el.dataset.countTarget, 10);
    const suffix = el.dataset.countSuffix || "";
    if (!Number.isFinite(target)) return;
    if (target === 0) {
      el.textContent = formatCountValue(0, suffix);
      return;
    }
    animateCountUp(el, target, suffix, delay, duration);
  }

  function setupMachineStatCounters() {
    const items = [...document.querySelectorAll(".machine-item")].filter((item) =>
      item.querySelector(".machine-item__stat-value")
    );
    if (!items.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    items.forEach((item) => {
      const values = [...item.querySelectorAll(".machine-item__stat-value")];
      if (!values.length) return;

      values.forEach((el) => {
        const parsed = parseCountValue(el.textContent);
        if (!parsed) return;
        prepareCountElement(el, parsed, reduceMotion);
      });

      if (reduceMotion) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || item.dataset.statsCounted) return;
            item.dataset.statsCounted = "true";

            values.forEach((el, i) => {
              if (!el.dataset.countTarget) return;
              const target = parseInt(el.dataset.countTarget, 10);
              const duration = Math.min(1600, 700 + target * 5);
              runCountElement(el, i * 120, duration);
            });

            observer.unobserve(item);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -4% 0px" }
      );

      observer.observe(item);
    });
  }

  function setupMachineDetailStatCounters() {
    const group = document.querySelector(".machine-detail__stats");
    if (!group) return;

    const values = [...group.querySelectorAll(".machine-detail__stat-value")];
    if (!values.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    values.forEach((el) => {
      const parsed = parseCountValue(el.textContent);
      if (!parsed) return;
      prepareCountElement(el, parsed, reduceMotion);
    });

    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || group.dataset.statsCounted) return;
          group.dataset.statsCounted = "true";

          values.forEach((el, i) => {
            if (!el.dataset.countTarget) return;
            const target = parseInt(el.dataset.countTarget, 10);
            const duration = Math.min(1600, 700 + target * 5);
            runCountElement(el, i * 120, duration);
          });

          observer.unobserve(group);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -4% 0px" }
    );

    observer.observe(group);
  }

  function setupStatsBandCounters() {
    const band = document.querySelector(".main--home .stats-band");
    if (!band) return;

    const values = [...band.querySelectorAll(".stat-value")];
    if (!values.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    values.forEach((el) => {
      const parsed = parseCountValue(el.textContent);
      if (!parsed) return;
      prepareCountElement(el, parsed, reduceMotion);
    });

    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || band.dataset.statsCounted) return;
          band.dataset.statsCounted = "true";

          values.forEach((el, i) => {
            if (!el.dataset.countTarget) return;
            const target = parseInt(el.dataset.countTarget, 10);
            const duration = Math.min(2200, 700 + target * 0.85);
            runCountElement(el, i * 150, duration);
          });

          observer.unobserve(band);
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -4% 0px" }
    );

    observer.observe(band);
  }

  function setupEcoListCounters() {
    const list = document.querySelector(".main--home #rse .eco-list");
    if (!list) return;

    const items = [...list.querySelectorAll("strong")];
    if (!items.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const parsed = items.map((el) => {
      const m = el.textContent.trim().match(/^(\D*?)(\d+)(.*)$/);
      if (!m) return null;
      return { el, prefix: m[1] || "", target: parseInt(m[2], 10), suffix: m[3] || "" };
    });

    parsed.forEach((p) => {
      if (!p) return;
      if (!reduceMotion && p.target > 0) {
        p.el.textContent = `${p.prefix}0${p.suffix}`;
      }
    });

    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || list.dataset.statsCounted) return;
          list.dataset.statsCounted = "true";

          parsed.forEach((p, i) => {
            if (!p || p.target === 0) return;
            const duration = Math.min(1800, 700 + p.target * 6);
            const run = () => {
              const start = performance.now();
              function tick(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                p.el.textContent = `${p.prefix}${Math.round(eased * p.target)}${p.suffix}`;
                if (progress < 1) requestAnimationFrame(tick);
              }
              requestAnimationFrame(tick);
            };
            window.setTimeout(run, i * 130);
          });

          observer.unobserve(list);
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -4% 0px" }
    );

    observer.observe(list);
  }

  function setupSectionParallax(sectionSelector, bgSelector) {
    const section = document.querySelector(sectionSelector);
    const bg = document.querySelector(bgSelector);
    if (!section || !bg) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (reduceMotion || isMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        bg.classList.toggle("is-active", entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(section);
  }

  // Plusieurs fonds fixes adjacents : un seul actif à la fois (celui dont la
  // section occupe le plus l'écran), pour éviter qu'une image déborde sur la suivante.
  function setupExclusiveParallax(pairs) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (reduceMotion || isMobile) return;

    const items = pairs
      .map(([sectionSelector, bgSelector]) => ({
        section: document.querySelector(sectionSelector),
        bg: document.querySelector(bgSelector),
        visible: 0,
      }))
      .filter((it) => it.section && it.bg);
    if (!items.length) return;

    const update = () => {
      let best = null;
      items.forEach((it) => {
        if (it.visible > 0 && (!best || it.visible > best.visible)) best = it;
      });
      items.forEach((it) => it.bg.classList.toggle("is-active", it === best));
    };

    const thresholds = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
    items.forEach((it) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          it.visible = entry.isIntersecting ? entry.intersectionRect.height : 0;
          update();
        },
        { threshold: thresholds }
      );
      observer.observe(it.section);
    });
  }

  function normalizeFrenchPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("33")) return "0" + digits.slice(2);
    return digits;
  }

  function isValidFrenchPhone(phone) {
    const digits = normalizeFrenchPhone(phone);
    return digits.length === 10 && /^0[1-9]/.test(digits);
  }

  function setupMachinesCatalogSort() {
    const grid = document.querySelector(".machines-grid");
    if (!grid) return;

    const items = Array.from(grid.querySelectorAll(".machine-item[data-power-kwh]"));
    if (items.length < 2) return;

    items.sort(
      (a, b) =>
        parseFloat(a.getAttribute("data-power-kwh") || "0") -
        parseFloat(b.getAttribute("data-power-kwh") || "0")
    );

    items.forEach((item) => grid.appendChild(item));
  }

  function setupHeroPhoneForm() {
    const form = document.getElementById("heroPhoneForm");
    const phoneInput = document.getElementById("heroPhone");
    const errorEl = document.getElementById("heroPhoneError");
    const successEl = document.getElementById("heroPhoneSuccess");
    if (!form || !phoneInput) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const phone = phoneInput.value.trim();
      if (!isValidFrenchPhone(phone)) {
        if (errorEl) {
          errorEl.textContent = "Veuillez saisir un numéro de téléphone français valide (10 chiffres).";
          errorEl.classList.remove("is-hidden");
        }
        if (successEl) successEl.classList.add("is-hidden");
        phoneInput.focus();
        return;
      }

      if (errorEl) errorEl.classList.add("is-hidden");

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: normalizeFrenchPhone(phone),
            source: "hero-rappel",
            message: "Demande de rappel — hero accueil",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Envoi impossible");
        }
      } catch (e) {
        if (errorEl) {
          errorEl.textContent =
            "Impossible d'enregistrer votre numéro pour le moment. Réessayez ou appelez-nous directement.";
          errorEl.classList.remove("is-hidden");
        }
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      form.querySelector(".hero-phone-form__combo, .problematique-form__combo")?.classList.add("is-hidden");
      if (successEl) successEl.classList.remove("is-hidden");
    });
  }

  function setupProblematiqueWizard() {
    const wizard = document.getElementById("problematiqueWizard");
    const form = document.getElementById("problematiquePhoneForm");
    const phoneInput = document.getElementById("problematiquePhone");
    const errorEl = document.getElementById("problematiquePhoneError");
    const successTextEl = document.getElementById("problematiqueSuccessText");
    const recapEl = document.getElementById("problematiqueRecap");
    const nextBtn = document.getElementById("problematiqueNextBtn");
    const backBtn = document.getElementById("problematiqueBackBtn");
    const otherField = document.getElementById("problematiqueOtherField");
    const otherInput = document.getElementById("problematiqueOtherText");
    const leadEl = document.getElementById("simulateurPanelLead");
    const secondaryLink = document.getElementById("simulateurSecondaryLink");
    const stepsNav = document.getElementById("simulateurStepsNav");
    if (!wizard || !form || !phoneInput) return;

    const stepEls = wizard.querySelectorAll(".problematique-wizard__step");
    const choiceBtns = wizard.querySelectorAll(".problematique-choice");
    const stepIndicators = stepsNav
      ? stepsNav.querySelectorAll("[data-step-indicator]")
      : [];

    const LEAD_BY_STEP = {
      1: "Sélectionnez ce qui vous correspond : un expert vous rappelle sous 24h pour étudier votre besoin et vous orienter vers la solution adaptée.",
      2: "Laissez-nous votre numéro : un expert vous rappelle sous 24h pour étudier votre besoin.",
    };

    let selectedProblem = "";
    let selectedLabel = "";

    function showStep(step) {
      stepEls.forEach((el) => {
        const active = Number(el.dataset.step) === step;
        el.classList.toggle("is-hidden", !active);
        el.hidden = !active;
      });

      stepIndicators.forEach((el) => {
        el.classList.toggle("is-active", Number(el.dataset.stepIndicator) === step);
        el.classList.toggle("is-done", Number(el.dataset.stepIndicator) < step);
      });

      if (leadEl) {
        if (step === 3) {
          leadEl.classList.add("is-hidden");
        } else {
          leadEl.classList.remove("is-hidden");
          leadEl.textContent = LEAD_BY_STEP[step] || LEAD_BY_STEP[1];
        }
      }

      if (secondaryLink) {
        secondaryLink.classList.toggle("is-hidden", step === 3);
      }

      if (step === 2) {
        phoneInput.focus();
      }
    }

    function getNeedSummary() {
      const extra = otherInput?.value.trim();
      if (selectedProblem === "autre" && extra) {
        return `${selectedLabel} — ${extra}`;
      }
      return selectedLabel;
    }

    choiceBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedProblem = btn.dataset.problem || "";
        selectedLabel = btn.dataset.label || btn.textContent.trim();

        choiceBtns.forEach((b) => {
          b.classList.toggle("is-selected", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });

        const isOther = selectedProblem === "autre";
        if (otherField) {
          otherField.classList.toggle("is-hidden", !isOther);
          otherField.hidden = !isOther;
          if (isOther && otherInput) {
            otherInput.focus();
          }
        }

        if (nextBtn) nextBtn.disabled = !selectedProblem;
      });
    });

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (!selectedProblem) return;
        if (recapEl) recapEl.textContent = getNeedSummary();
        showStep(2);
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (errorEl) errorEl.classList.add("is-hidden");
        showStep(1);
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const phone = phoneInput.value.trim();
      if (!isValidFrenchPhone(phone)) {
        if (errorEl) {
          errorEl.textContent = "Veuillez saisir un numéro de téléphone français valide (10 chiffres).";
          errorEl.classList.remove("is-hidden");
        }
        phoneInput.focus();
        return;
      }

      if (errorEl) errorEl.classList.add("is-hidden");

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const needSummary = getNeedSummary();

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: normalizeFrenchPhone(phone),
            source: "problematique-rappel",
            message: `Demande de rappel — ${needSummary}`,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Envoi impossible");
        }
      } catch (e) {
        if (errorEl) {
          errorEl.textContent =
            "Impossible d'enregistrer votre numéro pour le moment. Réessayez ou appelez-nous directement.";
          errorEl.classList.remove("is-hidden");
        }
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      if (successTextEl) {
        successTextEl.textContent = `Merci ! Un expert vous rappelle sous 24h pour vous aider avec : ${needSummary}.`;
      }

      showStep(3);
    });

    showStep(1);
  }

  function setupCafePopup() {
    const popup = document.getElementById("cafePopup");
    const toggle = document.getElementById("cafePopupToggle");
    const simulateur = document.getElementById("simulateur");
    const hero = document.querySelector(".main--home .hero");
    if (!popup || !toggle) return;

    const desktopMq = window.matchMedia("(min-width: 769px)");
    let dismissed = false;
    let simulateurInView = false;
    let heroInView = Boolean(hero);
    let introShown = false;
    try {
      dismissed = sessionStorage.getItem("cafePopupClosed") === "1";
    } catch (e) {}
    if (dismissed) return;

    const closeBtn = popup.querySelector(".cafe-popup__close");
    const SHOW_DELAY_MS = 4500;
    const VISIBLE_MS = 5000;
    let autoHideTimer = null;

    function isDesktop() {
      return desktopMq.matches;
    }

    function shouldBlockWidget() {
      if (!isDesktop()) return true;
      return simulateurInView || heroInView;
    }

    function hidePopupUi() {
      window.clearTimeout(autoHideTimer);
      popup.classList.remove("is-visible");
      popup.setAttribute("aria-hidden", "true");
      popup.hidden = true;
      toggle.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }

    function showToggleIfAllowed() {
      if (shouldBlockWidget() || dismissed) {
        hidePopupUi();
        return;
      }
      toggle.hidden = false;
      toggle.removeAttribute("hidden");
    }

    function showPopup() {
      if (shouldBlockWidget() || dismissed) return;
      window.clearTimeout(autoHideTimer);
      toggle.hidden = true;
      toggle.setAttribute("aria-expanded", "true");
      popup.hidden = false;
      popup.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => popup.classList.add("is-visible"));
    }

    function collapsePopup() {
      popup.classList.remove("is-visible");
      popup.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      window.setTimeout(() => {
        popup.hidden = true;
        showToggleIfAllowed();
      }, 450);
    }

    function dismissPopup() {
      dismissed = true;
      hidePopupUi();
      try {
        sessionStorage.setItem("cafePopupClosed", "1");
      } catch (e) {}
    }

    function scheduleAutoHide() {
      window.clearTimeout(autoHideTimer);
      autoHideTimer = window.setTimeout(collapsePopup, VISIBLE_MS);
    }

    function onHeroVisibilityChange(isVisible) {
      heroInView = isVisible;
      if (heroInView) {
        hidePopupUi();
        return;
      }
      if (shouldBlockWidget() || dismissed) return;
      if (!introShown) {
        introShown = true;
        showPopup();
        scheduleAutoHide();
        return;
      }
      showToggleIfAllowed();
    }

    function syncHeroInView() {
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      onHeroVisibilityChange(rect.bottom > 0 && rect.top < window.innerHeight);
    }

    if (hero && "IntersectionObserver" in window) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            onHeroVisibilityChange(entry.isIntersecting);
          });
        },
        { root: null, rootMargin: "0px", threshold: 0 }
      );
      heroObserver.observe(hero);
    } else if (hero) {
      window.addEventListener("scroll", syncHeroInView, { passive: true });
      window.addEventListener("resize", syncHeroInView, { passive: true });
      syncHeroInView();
    }

    if (simulateur && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const ratio = entry.intersectionRatio;
            if (!simulateurInView && ratio >= 0.15) {
              simulateurInView = true;
              hidePopupUi();
            } else if (simulateurInView && ratio <= 0.04) {
              simulateurInView = false;
              if (!heroInView) showToggleIfAllowed();
            }
          });
        },
        { root: null, rootMargin: "0px 0px -8% 0px", threshold: [0, 0.04, 0.15, 0.3] }
      );
      observer.observe(simulateur);
    }

    if (closeBtn) closeBtn.addEventListener("click", dismissPopup);
    toggle.addEventListener("click", showPopup);

    const onDesktopChange = () => {
      if (!isDesktop()) {
        hidePopupUi();
        return;
      }
      if (hero) {
        syncHeroInView();
        return;
      }
      if (!dismissed && !shouldBlockWidget()) showToggleIfAllowed();
    };

    if (typeof desktopMq.addEventListener === "function") {
      desktopMq.addEventListener("change", onDesktopChange);
    } else if (typeof desktopMq.addListener === "function") {
      desktopMq.addListener(onDesktopChange);
    }

    hidePopupUi();

    if (!hero) {
      window.setTimeout(() => {
        if (shouldBlockWidget()) return;
        introShown = true;
        showPopup();
        scheduleAutoHide();
      }, SHOW_DELAY_MS);
    }
  }

  function setupMachineSubnav() {
    const nav = document.querySelector(".machine-subnav");
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll(".machine-subnav__link"));
    const map = links
      .map((link) => {
        const id = link.getAttribute("href").slice(1);
        return { link, section: document.getElementById(id) };
      })
      .filter((entry) => entry.section);
    if (!map.length) return;

    function setActive(activeLink) {
      links.forEach((l) => l.classList.toggle("is-active", l === activeLink));
    }

    const offset = 120;

    function update() {
      let current = map[0];
      for (const entry of map) {
        if (entry.section.getBoundingClientRect().top <= offset) {
          current = entry;
        }
      }
      setActive(current.link);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  // Bannière d'annonce (événements, salons, actus). Modifiez CONFIG ci-dessous.
  /** Téléchargement fiche technique — événement gtag (remarketing) sans bloquer le lien */
  function setupSpecSheetDownloads() {
    document.querySelectorAll(".js-spec-sheet-download").forEach((link) => {
      link.addEventListener("click", () => {
        if (typeof window.gtag !== "function") return;

        const category = link.dataset.specCategory || "";
        const page = location.pathname.split("/").pop() || "index.html";

        window.gtag("event", "fiche_technique_download", {
          event_category: "engagement",
          event_label: category,
          product_page: page,
          file_url: link.getAttribute("href") || "",
        });
      });
    });
  }

  function setupSiteBanner() {
    const CONFIG = {
      enabled: false, // false pour masquer la bannière
      image: "assets/hero-office.webp", // vignette ("" pour aucune)
      title: "Salon Workspace Expo 2026", // titre court
      text: "Rencontrez nos équipes du 12 au 14 mars — stand B24.", // message
      ctaLabel: "En savoir +", // texte du bouton ("" pour aucun bouton)
      ctaHref: "contact.html", // lien du bouton
    };

    if (!CONFIG.enabled) return;
    // Pas de bannière sur les fiches produit (en-tête fixe + sous-menu)
    if (document.querySelector(".main--machine")) return;

    const header = document.querySelector(".site-header");
    if (!header) return;

    let closed = false;
    try {
      closed = sessionStorage.getItem("siteBannerClosed") === "1";
    } catch (e) {}
    if (closed) return;

    const bar = document.createElement("div");
    bar.className = "site-banner";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Annonce");

    const img = CONFIG.image
      ? `<img class="site-banner__img" src="${CONFIG.image}" alt="" width="48" height="48" loading="lazy" decoding="async" />`
      : "";
    const cta = CONFIG.ctaLabel
      ? `<a class="site-banner__cta" href="${CONFIG.ctaHref || "#"}">${CONFIG.ctaLabel}</a>`
      : "";

    bar.innerHTML = `<div class="container site-banner__inner">${img}<div class="site-banner__text"><strong class="site-banner__title">${CONFIG.title}</strong><span class="site-banner__desc">${CONFIG.text}</span></div>${cta}<button type="button" class="site-banner__close" aria-label="Fermer l'annonce">&times;</button></div>`;

    header.insertAdjacentElement("afterend", bar);

    const root = document.documentElement;
    function applyOffset() {
      root.style.setProperty("--site-banner-h", bar.offsetHeight + "px");
    }
    applyOffset();
    root.classList.add("has-site-banner");
    document.body.classList.add("has-site-banner");
    window.addEventListener("resize", applyOffset, { passive: true });

    bar.querySelector(".site-banner__close").addEventListener("click", () => {
      bar.remove();
      root.classList.remove("has-site-banner");
      document.body.classList.remove("has-site-banner");
      root.style.removeProperty("--site-banner-h");
      window.removeEventListener("resize", applyOffset);
      try {
        sessionStorage.setItem("siteBannerClosed", "1");
      } catch (e) {}
    });
  }

  setupSiteBanner();
  setupSpecSheetDownloads();
  setupScrollReveal();
  setupMachineStatCounters();
  setupMachineDetailStatCounters();
  setupStatsBandCounters();
  setupEcoListCounters();
  setupMachineSubnav();
  setupCafePopup();
  setupHeroPhoneForm();
  setupProblematiqueWizard();
  setupMachinesCatalogSort();
  setupScroll();
  setupExclusiveParallax([
    ["#rse", ".rse-bg"],
    ["#bcorp", ".bcorp-bg"],
  ]);
  setupSectionParallax(".about-impact", ".about-impact-bg");
})();
