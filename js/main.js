document.addEventListener("DOMContentLoaded", () => {
  const DOM = {
    header: document.getElementById("header"),
    sliderImages: document.getElementById("sliderImages"),
    fullscreenSlider: document.getElementById("fullscreenSlider"),
    overlay: document.getElementById("fullscreenOverlay"),
    sliderContainer: document.querySelector('.slider-container'),
    fullscreenContainer: document.querySelector('.fullscreen-container'),
    dotsContainer: document.getElementById('dotsContainer'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    fsPrev: document.getElementById('fsPrev'),
    fsNext: document.getElementById('fsNext'),
    btnClose: document.getElementById('btnClose'),
    tabButtons: document.getElementById('tabButtons'),
    tabContents: document.getElementById('tabContents'),
    youtubeContainer: document.getElementById('youtubeContainer')
  };

  // ================= IDIOMAS (i18n) =================
  const I18N = {
    es: {
      langAria: 'Idioma',
      kofiHeader: 'Apóyame',
      kofiHeaderAria: 'Apóyame en Ko-fi',
      gravatarAria: 'Ver mi perfil de Gravatar',
      prevAria: 'Imagen anterior',
      nextAria: 'Siguiente imagen',
      closeAria: 'Cerrar',
      playAria: 'Reproducir video',
      imgAlt: 'Captura BT4 HD',
      donateTitle: '¿Te gusta el Texture Pack? ☕',
      donateText: 'Este proyecto es <strong>100% gratis</strong> y lo creo en mi tiempo libre. Si te ha servido para disfrutar más del juego, un cafecito me ayuda a seguir mejorando las texturas y a sacar nuevas versiones. ¡Gracias por estar aquí! 💛',
      perk1: '✓ Totalmente opcional',
      perk2: '✓ Cualquier cantidad ayuda',
      perk3: '✓ Sin suscripciones',
      donateBtn: 'Invítame a un café en Ko-fi',
      donateThanks: 'Cada apoyo, grande o pequeño, me motiva muchísimo ❤️',
      toastText: '<strong>¡Gracias por descargar! ☕</strong><br>Si te gusta el pack, puedes apoyarme.'
    },
    en: {
      langAria: 'Language',
      kofiHeader: 'Support me',
      kofiHeaderAria: 'Support me on Ko-fi',
      gravatarAria: 'View my Gravatar profile',
      prevAria: 'Previous image',
      nextAria: 'Next image',
      closeAria: 'Close',
      playAria: 'Play video',
      imgAlt: 'BT4 HD screenshot',
      donateTitle: 'Enjoying the Texture Pack? ☕',
      donateText: 'This project is <strong>100% free</strong> and I make it in my spare time. If it helped you enjoy the game more, a coffee helps me keep improving the textures and releasing new versions. Thanks for being here! 💛',
      perk1: '✓ Totally optional',
      perk2: '✓ Every amount helps',
      perk3: '✓ No subscriptions',
      donateBtn: 'Buy me a coffee on Ko-fi',
      donateThanks: 'Every bit of support, big or small, motivates me a lot ❤️',
      toastText: '<strong>Thanks for downloading! ☕</strong><br>If you like the pack, you can support me.'
    }
  };

  // Detecta el idioma: 1) el guardado por el usuario, 2) el del navegador, 3) inglés por defecto
  function detectLang() {
    try {
      const saved = localStorage.getItem('lang');
      if (saved && I18N[saved]) return saved;
    } catch (e) {}
    const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (const l of prefs) {
      const code = String(l).toLowerCase().slice(0, 2);
      if (I18N[code]) return code;
    }
    return 'en';
  }

  let currentLang = detectLang();
  const t = key => (I18N[currentLang] && I18N[currentLang][key]) || I18N.es[key] || key;

  const langDropdown = document.getElementById('langDropdown');
  const langBtn = document.getElementById('langBtn');
  const langCurrent = document.getElementById('langCurrent');

  function applyLang(lang, save) {
    if (!I18N[lang]) return;
    currentLang = lang;
    if (save) { try { localStorage.setItem('lang', lang); } catch (e) {} }

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('.slider-images img, .fullscreen-slider img').forEach((img, i, all) => {
      const idx = img.dataset.index !== undefined ? Number(img.dataset.index) : i % Math.max(imageList.length, 1);
      img.alt = `${t('imgAlt')} ${idx + 1}`;
    });

    langCurrent.textContent = lang.toUpperCase();
    langDropdown.querySelectorAll('.lang-option').forEach(opt => {
      opt.setAttribute('aria-selected', opt.dataset.lang === lang ? 'true' : 'false');
    });
  }

  function setLangMenu(open) {
    langDropdown.classList.toggle('open', open);
    langBtn.setAttribute('aria-expanded', String(open));
  }

  langBtn.addEventListener('click', e => {
    e.stopPropagation();
    setLangMenu(!langDropdown.classList.contains('open'));
  });
  langDropdown.addEventListener('click', e => {
    const opt = e.target.closest('.lang-option');
    if (!opt) return;
    applyLang(opt.dataset.lang, true);
    setLangMenu(false);
    langBtn.focus();
  });
  document.addEventListener('click', e => {
    if (!langDropdown.contains(e.target)) setLangMenu(false);
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') setLangMenu(false);
  });

  let currentIndex = 0;
  let fullscreenIndex = 0;
  let imageList = [];
  let isAnimating = false;
  let isAnimatingFS = false;

  // Estado de botones de navegación
  function setNavEnabled(enabled) {
    const state = enabled ? 'auto' : 'none';
    DOM.btnPrev.style.pointerEvents = state;
    DOM.btnNext.style.pointerEvents = state;
    DOM.fsPrev.style.pointerEvents = state;
    DOM.fsNext.style.pointerEvents = state;
    DOM.btnClose.style.pointerEvents = state;
  }

  // Asigna el src real solo cuando hace falta (carga diferida de imágenes)
  function ensureSrc(img) {
    if (!img.getAttribute('src')) img.src = img.dataset.src;
  }

  // Animaciones de slider vía CSS/JS sincronizadas
  function animateSlide(currentImg, nextImg, direction, isFullscreen) {
    if (isFullscreen) isAnimatingFS = true; else isAnimating = true;
    setNavEnabled(false);

    const container = isFullscreen ? DOM.fullscreenSlider : DOM.sliderImages;
    container.style.pointerEvents = 'none';

    ensureSrc(nextImg);
    nextImg.style.display = 'block';
    nextImg.style.transition = 'none';
    nextImg.style.transform = `translateX(${direction * 100}%)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        currentImg.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        nextImg.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';

        currentImg.style.transform = `translateX(${-direction * 100}%)`;
        nextImg.style.transform = 'translateX(0)';
      });
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(safetyTimer);
      currentImg.removeEventListener('transitionend', onTransitionEnd);
      currentImg.style.display = 'none';
      currentImg.style.transition = '';
      currentImg.style.transform = 'translateX(0)';
      nextImg.style.transition = '';
      nextImg.style.transform = 'translateX(0)';

      if (isFullscreen) isAnimatingFS = false; else isAnimating = false;
      container.style.pointerEvents = 'auto';
      setNavEnabled(true);
    };
    const onTransitionEnd = (e) => { if (e.target === currentImg) finish(); };
    const safetyTimer = setTimeout(finish, 650);

    currentImg.addEventListener('transitionend', onTransitionEnd);
  }

  function showSlide(index) {
    if (!imageList.length || isAnimating) return;
    const imgs = DOM.sliderImages.children;
    const total = imageList.length;
    const newIndex = (index + total) % total;

    if (newIndex === currentIndex) return;

    const currentImg = imgs[currentIndex];
    const nextImg = imgs[newIndex];

    let direction = newIndex > currentIndex ? 1 : -1;
    if (currentIndex === 0 && newIndex === total - 1) direction = -1;
    if (currentIndex === total - 1 && newIndex === 0) direction = 1;

    animateSlide(currentImg, nextImg, direction, false);
    currentIndex = newIndex;
    updateDots();
  }

  function updateDots() {
    const dots = DOM.dotsContainer.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === currentIndex);
    }
  }

  function openFullscreen(index) {
    if (isAnimatingFS) return;
    fullscreenIndex = index;
    DOM.overlay.style.display = 'flex';
    document.documentElement.style.overflow = 'hidden';
    DOM.header.classList.add('hidden');
    const imgs = DOM.fullscreenSlider.children;
    for (let i = 0; i < imgs.length; i++) {
      ensureSrc(imgs[i]);
      imgs[i].style.display = i === index ? 'block' : 'none';
    }
  }

  function closeFullscreen() {
    DOM.overlay.style.display = 'none';
    document.documentElement.style.overflow = '';
    DOM.header.classList.remove('hidden');

    // Sincroniza el slider principal con la imagen que se vio en pantalla completa
    if (!isAnimating && imageList.length && fullscreenIndex !== currentIndex) {
      const imgs = DOM.sliderImages.children;
      imgs[currentIndex].style.display = 'none';
      ensureSrc(imgs[fullscreenIndex]);
      imgs[fullscreenIndex].style.display = 'block';
      imgs[fullscreenIndex].style.transform = 'translateX(0)';
      currentIndex = fullscreenIndex;
      updateDots();
    }
  }

  function changeFullscreen(direction) {
    if (isAnimatingFS || !imageList.length) return;
    const imgs = DOM.fullscreenSlider.children;
    const currentImg = imgs[fullscreenIndex];
    const newIndex = (fullscreenIndex + direction + imageList.length) % imageList.length;
    if (newIndex === fullscreenIndex) return;
    const nextImg = imgs[newIndex];

    animateSlide(currentImg, nextImg, direction, true);
    fullscreenIndex = newIndex;
  }

  // Inicialización centralizada de imágenes y Fragmentos DOM
  function initImages() {
    if (typeof imgData === 'undefined') return;
    imageList = imgData.trim().split('\n').filter(Boolean).map(l => l.replace(/^-/, ""));
    if (!imageList.length) return;

    const sliderFrag = document.createDocumentFragment();
    const fullFrag = document.createDocumentFragment();
    const dotsFrag = document.createDocumentFragment();

    imageList.forEach((imgName, index) => {
      const src = `img/${imgName}`;

      // Slider principal: solo la 1ª imagen se pide ya (con prioridad alta)
      const img = document.createElement('img');
      img.alt = `${t('imgAlt')} ${index + 1}`;
      img.decoding = 'async';
      img.dataset.index = index;
      img.dataset.src = src;
      if (index === 0) {
        img.fetchPriority = 'high';
        img.src = src;
        img.style.display = 'block';
      } else {
        img.style.display = 'none';
      }
      sliderFrag.appendChild(img);

      // Pantalla completa: el src se asigna al abrirla por primera vez (sale de caché)
      const imgFull = document.createElement('img');
      imgFull.alt = `${t('imgAlt')} ${index + 1}`;
      imgFull.decoding = 'async';
      imgFull.dataset.src = src;
      fullFrag.appendChild(imgFull);

      // Dot
      const dot = document.createElement('div');
      dot.className = `dot ${index === 0 ? 'active' : ''}`;
      dot.dataset.index = index;
      dotsFrag.appendChild(dot);
    });

    DOM.sliderImages.appendChild(sliderFrag);
    DOM.fullscreenSlider.appendChild(fullFrag);
    DOM.dotsContainer.appendChild(dotsFrag);

    // El resto de imágenes se descargan y decodifican cuando el navegador está libre,
    // así no compiten con la carga inicial y las transiciones salen fluidas.
    const loadRest = () => {
      Array.from(DOM.sliderImages.children).forEach(img => {
        ensureSrc(img);
        if (img.decode) img.decode().catch(() => {});
      });
    };
    const schedule = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(loadRest, { timeout: 2500 });
      else setTimeout(loadRest, 400);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  }

  // Parseo eficiente de list.js
  function buildData() {
    if (typeof listData === 'undefined') return;

    const lines = listData.trim().split('\n');
    const sections = {};
    const ytLinks = [];
    let currentSection = null;

    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) return;

      if (line.endsWith(':')) {
        currentSection = line.slice(0, -1).trim();
        if (currentSection.toLowerCase() !== 'youtube') {
          sections[currentSection] = [];
        }
      } else if (line.startsWith('-')) {
        const content = line.slice(1).trim();
        if (currentSection && currentSection.toLowerCase() === 'youtube') {
          ytLinks.push(content);
        } else if (currentSection && sections[currentSection]) {
          const match = content.match(/^(.*?)\s+"([^"]+)"$/);
          if (match) {
            sections[currentSection].push({ name: match[1].trim(), url: match[2].trim() });
          }
        }
      }
    });

    // Generar Pestañas
    const btnFrag = document.createDocumentFragment();
    const contentFrag = document.createDocumentFragment();
    let isFirst = true;

    for (const [section, items] of Object.entries(sections)) {
      const btn = document.createElement('button');
      btn.textContent = section;
      if (isFirst) btn.classList.add('active');

      const contentDiv = document.createElement('div');
      contentDiv.className = `tab-content-container ${isFirst ? 'active' : ''}`;

      items.forEach(item => {
        const dl = document.createElement('a');
        dl.className = 'download-button';
        dl.textContent = item.name;
        dl.href = item.url;
        dl.target = '_blank';
        dl.rel = 'noopener noreferrer';
        contentDiv.appendChild(dl);
      });

      btnFrag.appendChild(btn);
      contentFrag.appendChild(contentDiv);
      isFirst = false;
    }

    DOM.tabButtons.appendChild(btnFrag);
    DOM.tabContents.appendChild(contentFrag);

    // YouTube Embeds
    if (ytLinks.length) {
      DOM.youtubeContainer.style.display = 'flex';
      const ytFrag = document.createDocumentFragment();
      ytLinks.forEach(link => {
        let videoId = null;
        try {
          const url = new URL(link);
          videoId = url.hostname.includes('youtube.com') ? url.searchParams.get('v') : (url.hostname === 'youtu.be' ? url.pathname.slice(1) : null);
        } catch (e) {}

        if (videoId) {
        const facade = document.createElement('button');
        facade.type = 'button';
        facade.className = 'youtube-facade';
        facade.dataset.videoId = videoId;
        facade.setAttribute('data-i18n-aria', 'playAria');
        facade.setAttribute('aria-label', t('playAria'));

        // Miniatura en la mejor calidad disponible: 1280x720 -> 640x480 -> 480x360
        const thumb = document.createElement('img');
        const thumbQualities = ['maxresdefault', 'sddefault', 'hqdefault'];
        let q = 0;
        const setThumb = () => { thumb.src = `https://i.ytimg.com/vi/${videoId}/${thumbQualities[q]}.jpg`; };
        const nextThumb = () => { if (q < thumbQualities.length - 1) { q++; setThumb(); } };
        thumb.addEventListener('error', nextThumb);
        // Si un tamaño no existe, YouTube a veces devuelve una imagen gris diminuta (120px)
        thumb.addEventListener('load', () => { if (thumb.naturalWidth <= 120) nextThumb(); });
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        setThumb();
        facade.appendChild(thumb);

        facade.insertAdjacentHTML('beforeend',
          '<span class="youtube-play" aria-hidden="true"><svg viewBox="0 0 68 48">' +
          '<path d="M66.5 7.7c-.8-2.9-2.5-5.4-5.4-6.2C55.8.1 34 0 34 0S12.2.1 6.9 1.6c-3 .8-4.7 3.3-5.4 6.2C.1 13 0 24 0 24s.1 11 1.5 16.3c.8 2.9 2.5 5.4 5.4 6.2C12.2 47.9 34 48 34 48s21.8-.1 27.1-1.6c3-.8 4.7-3.3 5.4-6.2C67.9 35 68 24 68 24s-.1-11-1.5-16.3z" fill="#f00"/>' +
          '<path d="M45 24L27 14v20" fill="#fff"/></svg></span>');
        ytFrag.appendChild(facade);
      }
      });
      DOM.youtubeContainer.appendChild(ytFrag);
    }
  }

  // Delegación de Eventos
  DOM.tabButtons.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    const buttons = Array.from(DOM.tabButtons.children);
    const contents = DOM.tabContents.children;
    const index = buttons.indexOf(e.target);

    buttons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
      contents[i].classList.toggle('active', i === index);
    });
  });

  DOM.youtubeContainer.addEventListener('click', e => {
    const facade = e.target.closest('.youtube-facade');
    if (!facade) return;
    const iframe = document.createElement('iframe');
    iframe.className = 'youtube-embed';
    const origin = location.protocol.startsWith('http') ? `&origin=${encodeURIComponent(location.origin)}` : '';
    iframe.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.videoId}?autoplay=1${origin}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
  });

  DOM.dotsContainer.addEventListener('click', e => {
    if (!e.target.classList.contains('dot')) return;
    showSlide(parseInt(e.target.dataset.index, 10));
  });

  DOM.sliderImages.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && !isAnimatingFS) {
      openFullscreen(parseInt(e.target.dataset.index, 10));
    }
  });

  // Controles y botones
  DOM.btnNext.addEventListener('click', e => { e.stopPropagation(); showSlide(currentIndex + 1); });
  DOM.btnPrev.addEventListener('click', e => { e.stopPropagation(); showSlide(currentIndex - 1); });
  DOM.fsNext.addEventListener('click', e => { e.stopPropagation(); changeFullscreen(1); });
  DOM.fsPrev.addEventListener('click', e => { e.stopPropagation(); changeFullscreen(-1); });
  DOM.btnClose.addEventListener('click', e => { e.stopPropagation(); closeFullscreen(); });

  // Rueda del ratón
  DOM.sliderContainer.addEventListener('wheel', e => {
    e.preventDefault();
    if (!isAnimating) showSlide(currentIndex + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  DOM.fullscreenContainer.addEventListener('wheel', e => {
    e.preventDefault();
    if (!isAnimatingFS) changeFullscreen(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // Eventos táctiles
  function setupSwipe(elem, onLeft, onRight) {
    let startX = 0, startY = 0;
    elem.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
      startY = e.changedTouches[0].screenY;
    }, { passive: true });
    elem.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - startX;
      const dy = e.changedTouches[0].screenY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft(); else onRight();
      }
    }, { passive: true });
  }

  setupSwipe(DOM.sliderContainer, () => showSlide(currentIndex + 1), () => showSlide(currentIndex - 1));
  setupSwipe(DOM.fullscreenContainer, () => changeFullscreen(1), () => changeFullscreen(-1));

  // Pantalla completa: tocar el fondo oscuro cierra; la rueda no mueve la página de fondo
  DOM.overlay.addEventListener('click', e => { if (e.target === DOM.overlay) closeFullscreen(); });
  DOM.overlay.addEventListener('wheel', e => e.preventDefault(), { passive: false });

  // Teclado
  window.addEventListener('keydown', e => {
    const isFS = DOM.overlay.style.display === 'flex';
    if (e.key === 'ArrowRight') isFS ? changeFullscreen(1) : showSlide(currentIndex + 1);
    else if (e.key === 'ArrowLeft') isFS ? changeFullscreen(-1) : showSlide(currentIndex - 1);
    else if (e.key === 'Escape' && isFS) closeFullscreen();
  });

  // ================= KO-FI =================
  // 👉 CAMBIA AQUÍ TU LINK DE KO-FI (se aplica a todos los botones)
  const KOFI_URL = "https://ko-fi.com/angel06oficial";

  document.querySelectorAll('[data-kofi]').forEach(a => { a.href = KOFI_URL; });

  const kofiToast = document.getElementById('kofiToast');
  const kofiToastClose = document.getElementById('kofiToastClose');
  let toastTimer = null;

  function hideKofiToast() {
    kofiToast.classList.remove('show');
    clearTimeout(toastTimer);
  }

  // Aviso amable tras hacer clic en una descarga (solo 1 vez por sesión)
  function maybeShowKofiToast() {
    try { if (sessionStorage.getItem('kofiToastShown')) return; } catch (e) {}
    try { sessionStorage.setItem('kofiToastShown', '1'); } catch (e) {}
    setTimeout(() => {
      kofiToast.classList.add('show');
      toastTimer = setTimeout(hideKofiToast, 12000);
    }, 2500);
  }

  DOM.tabContents.addEventListener('click', e => {
    if (e.target.closest('.download-button')) maybeShowKofiToast();
  });
  kofiToastClose.addEventListener('click', hideKofiToast);
  kofiToast.querySelector('a').addEventListener('click', hideKofiToast);

  // Inicialización Ejecutiva
  initImages();
  buildData();
  applyLang(currentLang, false);
});
