/* global gsap, ScrollTrigger */
(() => {
  if (typeof window.gsap === "undefined") return;

  const gsap = window.gsap;
  const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";
  const ScrollTrigger = hasScrollTrigger ? window.ScrollTrigger : null;

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // iOS/Safari: évite les refresh agressifs quand la barre d’adresse bouge
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  // ---- Fix 100vh iOS via CSS var --vh ----
  function setViewportUnits() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }
  setViewportUnits();

  // Debounce refresh (meilleure perf orientation/resize)
  const refreshDebounced = gsap
    .delayedCall(0.25, () => {
      if (hasScrollTrigger) ScrollTrigger.refresh();
    })
    .pause();

  window.addEventListener(
    "resize",
    () => {
      setViewportUnits();
      refreshDebounced.restart(true);
    },
    { passive: true }
  );

  window.addEventListener(
    "orientationchange",
    () => {
      setViewportUnits();
      refreshDebounced.restart(true);
    },
    { passive: true }
  );

  // ---- Détection tactile : désactive le curseur custom ----
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (isTouch) document.body.classList.add("is-touch");

  // iPhone + iPad : on repasse en scroll vertical
const isMobileLayout = window.matchMedia("(max-width: 1024px)").matches;
if (isMobileLayout) document.body.classList.add("is-mobile");

  // ========================
  // CURSEUR SIMPLE (desktop)
  // ========================
  if (!isTouch) {
    const cursor = document.querySelector(".cursor");
    if (cursor) {
      window.addEventListener(
        "mousemove",
        (e) => {
          cursor.style.left = e.clientX + "px";
          cursor.style.top = e.clientY + "px";
        },
        { passive: true }
      );

      const clickableElements = document.querySelectorAll(
        "a, button, .painting-frame, .cta-circle, input, textarea, .filter-btn"
      );

      clickableElements.forEach((el) => {
        el.addEventListener("mouseenter", () => cursor.classList.add("clickable"));
        el.addEventListener("mouseleave", () => cursor.classList.remove("clickable"));
      });
    }
  }

  // ========================
  // TRANSITION DE PAGE
  // (uniquement si overlay présent)
  // ========================
  const transitionOverlay = document.querySelector(".transition-overlay");

  // ========================
// LOADER — fonctionne partout (mobile + desktop)
// ========================
const loader = document.querySelector(".loader");
if (loader) {
  window.addEventListener("load", () => {
    if (typeof gsap !== "undefined") {
      gsap.to(".loader-text", {
        opacity: 0,
        y: -30,
        duration: 0.6,
        delay: 0.2
      });

      gsap.to(".loader", {
        scaleY: 0,
        transformOrigin: "top",
        duration: 0.8,
        ease: "power4.inOut",
        delay: 0.35,
        onComplete: () => {
          loader.style.display = "none";
        }
      });
    } else {
      loader.style.display = "none";
    }
  }, { once: true });
}

  if (transitionOverlay) {
    window.addEventListener("load", () => {
      gsap.to(transitionOverlay, {
        scaleY: 0,
        transformOrigin: "top",
        duration: 0.8,
        ease: "power4.inOut"
      });
    });

    document.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", function (e) {
        // liens internes uniquement (et pas les ancres / nouveaux onglets)
        if (this.hostname === window.location.hostname && !this.hash && this.target !== "_blank") {
          e.preventDefault();
          const destination = this.href;

          gsap.to(transitionOverlay, {
            scaleY: 1,
            transformOrigin: "bottom",
            duration: 0.6,
            ease: "power4.inOut",
            onComplete: () => {
              window.location.href = destination;
            }
          });
        }
      });
    });
  }

  // ========================
  // INDEX — scroll horizontal
  // ========================
  let scrollTween = null;
  const wrapper = document.querySelector(".wrapper");
  const sections = gsap.utils.toArray(".panel");

  if (hasScrollTrigger && wrapper && sections.length && !document.body.classList.contains("is-mobile")) {


    // Largeur du wrapper en fonction du nombre de sections
    gsap.set(wrapper, { width: sections.length * 100 + "%" });

    scrollTween = gsap.to(sections, {
      xPercent: -100 * (sections.length - 1),
      ease: "none",
      scrollTrigger: {
  trigger: wrapper,
  pin: true,
  scrub: 1.2,          // plus doux (augmente si tu veux encore plus “smooth”)
  anticipatePin: 1,    // évite les petits à-coups au pin
  fastScrollEnd: true, // évite l’effet “élastique” quand tu scroll très vite
  end: () => "+=" + wrapper.offsetWidth,
  invalidateOnRefresh: true
}

    });

    // --- Progress bar (index) ---
    const progressBar = document.querySelector("#exhibitProgressBar");
    const progressFill = document.querySelector("#exhibitProgressFill");
    const progressSteps = document.querySelector("#exhibitProgressSteps");
    const progressLabel = document.querySelector("#exhibitProgressLabel");

    if (progressBar && progressFill && progressSteps && scrollTween) {
      const st = scrollTween.scrollTrigger;
      const labels = sections.map((s, i) => s.getAttribute("data-progress-label") || `Section ${i + 1}`);

      progressSteps.innerHTML = "";
      const stepEls = [];

      sections.forEach((_, i) => {
        const li = document.createElement("li");
        li.className = "exhibit-progress__step";
        li.style.left = sections.length === 1 ? "0%" : (i / (sections.length - 1)) * 100 + "%";
        li.setAttribute("aria-label", labels[i]);

        li.addEventListener("click", () => {
          if (!st) return;
          const ratio = sections.length === 1 ? 0 : i / (sections.length - 1);
          const target = st.start + ratio * (st.end - st.start);
          window.scrollTo({ top: target, behavior: "smooth" });
        });

        progressSteps.appendChild(li);
        stepEls.push(li);
      });

      function setActiveStep(index) {
        stepEls.forEach((el, i) => el.classList.toggle("is-active", i === index));
        if (progressLabel) progressLabel.textContent = labels[index] || "";
      }

      sections.forEach((section, i) => {
        ScrollTrigger.create({
          trigger: section,
          containerAnimation: scrollTween,
          start: "left center",
          end: "right center",
          onEnter: () => setActiveStep(i),
          onEnterBack: () => setActiveStep(i)
        });
      });

      const prevUpdate = scrollTween.eventCallback("onUpdate");
      scrollTween.eventCallback("onUpdate", () => {
        if (prevUpdate) prevUpdate();

        const p = scrollTween.progress();
        progressFill.style.transform = `scaleX(${p})`;

        const val = Math.round(p * 100);
        progressBar.setAttribute("aria-valuenow", String(val));
      });

      setActiveStep(0);
      progressFill.style.transform = `scaleX(${scrollTween.progress()})`;
      ScrollTrigger.refresh();
    }

    // Parallaxe interne des images
    sections.forEach((section) => {
      const img = section.querySelector("img");
      if (!img) return;

      gsap.to(img, {
        scale: 1,
        xPercent: 20,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          containerAnimation: scrollTween,
          start: "left center",
          end: "right center",
          scrub: true
        }
      });
    });

    // Skew Effect (désactivé sur tactile pour perf)
    if (!isTouch) {
      const proxy = { skew: 0 };
      const skewSetter = gsap.quickSetter(".panel", "skewX", "deg");
      const clamp = gsap.utils.clamp(-10, 10);

      ScrollTrigger.create({
        onUpdate: (self) => {
          const skew = clamp(self.getVelocity() / -500);
          if (Math.abs(skew) > 0.1) {
            gsap.to(proxy, {
              skew,
              duration: 0.8,
              ease: "power3",
              overwrite: true,
              onUpdate: () => skewSetter(proxy.skew)
            });
          }
        }
      });
    }

    // Animation spécifique pour les Compétences
    if (document.querySelector(".skills")) {
      gsap.fromTo(
        ".skill-item",
        { y: 100, opacity: 0, scale: 0.5 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.1,
          duration: 0.8,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: ".skills",
            containerAnimation: scrollTween,
            start: "left center",
            toggleActions: "play none none reverse",
            immediateRender: false
          }
        }
      );
    }

    // Animation "Parcours"
    // Animation "Parcours" (Frise)
// Animation "Parcours" (Fresque Horizontale)
    // Animation "Parcours" (Livre d'Histoire)
    if (document.querySelector(".journey")) {
      
      // 1. La ligne centrale se dessine de gauche à droite
      gsap.from(".museum-axis", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: ".journey",
          containerAnimation: scrollTween,
          start: "left center"
        }
      });

      // 2. Les éléments apparaissent un par un
      gsap.fromTo(
        ".museum-item",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".journey",
            containerAnimation: scrollTween,
            start: "left center",
            toggleActions: "play none none reverse"
          }
        }
      );
      
    }
  }

  // ========================
  // PROJETS — animations + filtres
  // ========================
    const catalogGrid = document.querySelector(".catalog-grid");
    if (catalogGrid) {
      // Apparition au chargement
      gsap.from(".catalog-item", {
        y: 80,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out"
      });

      // --- Système de tri ---
      const filterButtons = document.querySelectorAll(".filter-btn");
      const items = document.querySelectorAll(".catalog-item");

            // --- Fil d'Ariane (jauge) : scroll dans le catalogue ---
      const catalogGauge =
        document.querySelector(".catalog-gauge") ||
        (() => {
          const el = document.createElement("div");
          el.className = "catalog-gauge";
          el.setAttribute("data-filter", "all");
          el.setAttribute("aria-hidden", "true");
          el.innerHTML = `
            <div class="gauge-counter">
              <span class="gauge-current">01</span>
              <span class="gauge-sep"></span>
              <span class="gauge-total">01</span>
            </div>
            <div class="gauge-line">
              <div class="gauge-fill"></div>
            </div>
          `;
          const filterBar = document.querySelector(".filter-bar");
          if (filterBar && filterBar.parentNode) {
            filterBar.parentNode.insertBefore(el, filterBar.nextSibling);
          } else {
            document.body.appendChild(el);
          }
          return el;
        })();

      const gaugeCurrent = catalogGauge.querySelector(".gauge-current");
      const gaugeTotal = catalogGauge.querySelector(".gauge-total");
      const gaugeFill = catalogGauge.querySelector(".gauge-fill");
      const gaugeLine = catalogGauge.querySelector(".gauge-line");

      const pad2 = (n) => String(n).padStart(2, "0");
      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

      const getVisibleItems = () =>
        Array.from(items).filter((el) => !el.classList.contains("is-hidden"));

      const getActiveIndex = (visible) => {
        if (!visible.length) return 0;
        const viewportCenter = window.innerHeight / 2;
        let bestIdx = 0;
        let bestDist = Infinity;

        visible.forEach((el, idx) => {
          const r = el.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const dist = Math.abs(center - viewportCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });

        return bestIdx;
      };

      const setGaugeLineLength = (filter) => {
        // Longueurs douces (respect DA), un peu + long sur "Tout"
        const map = {
          all: 80,
          webdesign: 62,
          "creative-coding": 58,
          experiences: 54,
        };
        const w = map[filter] ?? 62;

        if (window.matchMedia("(max-width: 900px)").matches) {
          // sur mobile, la ligne est horizontale -> on pilote la width
          gaugeLine.style.width = `${w}px`;
          gaugeLine.style.height = `2px`;
        } else {
          // desktop : ligne verticale
          gaugeLine.style.height = `${w}px`;
          gaugeLine.style.width = `2px`;
        }
      };

      const updateGauge = () => {
        const visible = getVisibleItems();
        const total = Math.max(visible.length, 1);
        const idx = clamp(getActiveIndex(visible), 0, total - 1);

        if (gaugeCurrent) gaugeCurrent.textContent = pad2(idx + 1);
        if (gaugeTotal) gaugeTotal.textContent = pad2(total);

        // Fill en % selon l'index
        const progress = total <= 1 ? 1 : idx / (total - 1);
        const pct = `${Math.round(progress * 100)}%`;

        // Sur desktop la jauge est verticale (height), sur mobile horizontale (width)
        if (window.matchMedia("(max-width: 900px)").matches) {
          gaugeFill.style.width = pct;
          gaugeFill.style.height = "100%";
        } else {
          gaugeFill.style.height = pct;
          gaugeFill.style.width = "100%";
        }
      };

      let currentFilter = "all";

      const setCatalogGaugeFilter = (filter) => {
        currentFilter = filter || "all";
        catalogGauge.setAttribute("data-filter", currentFilter);
        setGaugeLineLength(currentFilter);
        updateGauge();
      };

      const syncGauge = () => {
        setGaugeLineLength(currentFilter);
        updateGauge();
      };

      const syncGaugeAfterFilter = () => {
        // Laisse le temps aux anims / onComplete d'ajouter "is-hidden"
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            syncGauge();
          });
        });
      };

      window.addEventListener(
        "scroll",
        () => {
          updateGauge();
        },
        { passive: true }
      );

      window.addEventListener(
        "resize",
        () => {
          syncGauge();
        },
        { passive: true }
      );

      setCatalogGaugeFilter(currentFilter);
      syncGauge();


      function setActiveButton(btn) {
        filterButtons.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      }

      function applyFilter(filter) {
        items.forEach((item) => {
          const categories = (item.dataset.category || "")
            .split(" ")
            .map((s) => s.trim())
            .filter(Boolean);

          const shouldShow = filter === "all" || categories.includes(filter);

          if (shouldShow) {
            if (item.classList.contains("is-hidden")) {
              item.classList.remove("is-hidden");
              gsap.fromTo(item, { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" });
            }
          } else {
            if (!item.classList.contains("is-hidden")) {
              gsap.to(item, {
                autoAlpha: 0,
                y: 15,
                duration: 0.25,
                ease: "power2.inOut",
                onComplete: () => item.classList.add("is-hidden")
              });
            }
          }
        });
      }

      filterButtons.forEach((btn) => {
        btn.setAttribute("type", "button");
        btn.setAttribute("aria-pressed", btn.classList.contains("active") ? "true" : "false");

        btn.addEventListener("click", () => {
          const filter = btn.dataset.filter || "all";
          setActiveButton(btn);
          applyFilter(filter);
        });
      });
    }
  })();

// ==========================================
// LOGIQUE SPÉCIFIQUE : PAGE PROJET V2
// ==========================================
(function() {
    const isProjectV2 = document.body.classList.contains("project-v2");
    
    if (isProjectV2 && typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        
        // 1. Entrée Dramatique Hero
        const tl = gsap.timeline();
        tl.from(".v2-title .line", { y: 100, opacity:0, duration: 1.2, stagger: 0.2, ease: "power4.out", delay: 0.2 })
          .from(".v2-hero-visual", { scale: 0.8, opacity: 0, rotation: 0, duration: 1.5, ease: "expo.out" }, "-=1");

        // 2. Parallaxe sur l'image Hero
        gsap.to(".v2-hero-visual", {
            yPercent: 30,
            ease: "none",
            scrollTrigger: {
                trigger: ".v2-hero",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });

        // 3. Parallaxe sur les images galerie
        document.querySelectorAll('[data-speed]').forEach(el => {
            gsap.to(el.querySelector('img'), {
                yPercent: -20 * el.dataset.speed,
                ease: "none",
                scrollTrigger: {
                    trigger: el,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true
                }
            });
        });

        // 4. Citation Reveal
        gsap.from(".quote-content blockquote", {
            y: 50,
            opacity: 0,
            duration: 1,
            scrollTrigger: {
                trigger: ".v2-full-quote",
                start: "top center",
            }
        });
    }
})();

/* =========================================
   GESTION DU MODE DARK / LIGHT
   ========================================= */
const themeBtn = document.getElementById("theme-toggle");
const themeText = document.querySelector(".theme-text");
const htmlElement = document.documentElement;

// 1. Vérifier si un thème est déjà sauvegardé
const savedTheme = localStorage.getItem("theme");

// Fonction pour appliquer le thème
function applyTheme(theme) {
    if (theme === "dark") {
        htmlElement.setAttribute("data-theme", "dark");
        if(themeText) themeText.textContent = "Jour"; // Le bouton propose de repasser en Jour
    } else {
        htmlElement.removeAttribute("data-theme");
        if(themeText) themeText.textContent = "Nuit"; // Le bouton propose de passer en Nuit
    }
}

// Initialisation au chargement
if (savedTheme) {
    applyTheme(savedTheme);
}

// 2. Écouteur d'événement sur le bouton
if (themeBtn) {
    themeBtn.addEventListener("click", () => {
        // Vérifie si le mode sombre est actif
        const isDark = htmlElement.getAttribute("data-theme") === "dark";
        
        // Bascule vers l'inverse
        const newTheme = isDark ? "light" : "dark";
        
        applyTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        
        // Petit effet GSAP sur le bouton pour le feedback
        gsap.fromTo(themeBtn, 
            { rotation: 0, scale: 0.8 }, 
            { rotation: 360, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
    });
}

const timeline = document.querySelector('.editorial-timeline');

if (timeline) {
  timeline.addEventListener('wheel', (e) => {
    const maxScroll = timeline.scrollHeight - timeline.clientHeight;
    const atTop = timeline.scrollTop <= 0;
    const atBottom = timeline.scrollTop >= maxScroll - 1;

    // Si on peut encore scroller DANS la timeline → on garde le scroll ici
    if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
      e.stopPropagation();
      // ne mets pas preventDefault si tu veux garder le scroll fluide trackpad,
      // mais si ton site capte le wheel globalement, active la ligne suivante :
      // e.preventDefault();
    }
    // Sinon → on laisse le scroll continuer vers le site (horizontal)
  }, { passive: true });
}
