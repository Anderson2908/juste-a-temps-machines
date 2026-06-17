(function () {
  "use strict";

  const HEADER_OFFSET = 72;

  // Scroll fluide : Lenis sur desktop, natif sur mobile
  function setupScroll() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = window.matchMedia("(pointer: fine) and (min-width: 769px)").matches;
    const useLenis = !reduceMotion && isDesktop && typeof Lenis !== "undefined";

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    let lenis = null;

    if (useLenis) {
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.16,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
      });
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

      if (lenis) {
        lenis.scrollTo(target, {
          offset: -HEADER_OFFSET,
          immediate: Boolean(immediate),
          duration: immediate ? 0 : 1.1,
        });
        return;
      }

      target.scrollIntoView({
        behavior: reduceMotion || immediate ? "auto" : "smooth",
        block: "start",
      });
    }

    document.querySelectorAll('a[href*="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
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
      });
    });

    const hash = location.hash;

    if (hash === "#top") {
      requestAnimationFrame(() => scrollToTop(true));
      return;
    }

    const hashTarget = hash ? document.querySelector(hash) : null;

    if (hashTarget) {
      requestAnimationFrame(() => scrollToTarget(hashTarget, true));
      return;
    }

    requestAnimationFrame(() => scrollToTop(true));
  }

  // Menu mobile
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

  // Contact form (démo)
  const form = document.querySelector(".contact-form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Merci ! Ceci est une démo, branchez ce formulaire à votre CRM ou backend.");
  });

  const newsletter = document.querySelector(".newsletter-form");
  newsletter?.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Inscription newsletter, à connecter à votre outil emailing.");
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
      ".machines-grid .machine-item",
      ".stats-grid .stat",
      ".eco-list li",
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
      ".about-cta",
      ".hero-content > *",
      ".hero-visual",
      ".services-panel",
      ".machines-header",
      ".section-title",
      ".section-lead",
      ".testimonials",
      ".carousel-dots",
      ".section--logos .eyebrow",
      ".section--logos .logos-row",
      ".section--cta .container > *",
      ".contact-info",
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

    function stagger(selector) {
      document.querySelectorAll(selector).forEach((el, i) => {
        mark(el);
        el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 300)}ms`);
      });
    }

    staggerSelectors.forEach(stagger);

    document.querySelectorAll(".split-section > :first-child").forEach((el) => {
      mark(el, "reveal--left");
    });

    document.querySelectorAll(".split-section > :last-child:not(:first-child)").forEach((el) => {
      mark(el, "reveal--right");
    });

    singleSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => mark(el));
    });

    const targets = [...document.querySelectorAll(".reveal")];
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -4% 0px", threshold: 0.08 }
    );

    targets.forEach((el) => observer.observe(el));
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

  setupScrollReveal();
  setupMachineStatCounters();
  setupStatsBandCounters();
  setupScroll();
  setupSectionParallax("#rse", ".rse-bg");
  setupSectionParallax(".about-impact", ".about-impact-bg");
})();
