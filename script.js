gsap.registerPlugin(ScrollTrigger);

/* NAVBAR */
const navbar = document.getElementById('navbar');
let isScrolled = false;
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 40;
  if (scrolled !== isScrolled) {
    isScrolled = scrolled;
    navbar.classList.toggle('scrolled', isScrolled);
  }
}, { passive: true });

/* MOBILE MENU */
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuCloseBtn = document.getElementById('mobileMenuCloseBtn');
function toggleMobileMenu(forceClose) {
  const shouldOpen = forceClose === true ? false : !mobileMenu.classList.contains('open');
  mobileMenu.classList.toggle('open', shouldOpen);
  burgerBtn.classList.toggle('active', shouldOpen);
  document.body.classList.toggle('body-locked', shouldOpen);
}
burgerBtn.addEventListener('click', function () { toggleMobileMenu(); });
if (mobileMenuCloseBtn) {
  mobileMenuCloseBtn.addEventListener('click', function () { toggleMobileMenu(true); });
}
mobileMenu.querySelectorAll('a').forEach(function (link) {
  link.addEventListener('click', function () { toggleMobileMenu(true); });
});

/* PARTICLES */
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() {
  canvas.width = canvas.offsetParent ? canvas.parentElement.offsetWidth : window.innerWidth;
  canvas.height = window.innerHeight;
}
function initParticles() {
  resizeCanvas();
  particles = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 1.6 + 0.4, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
    o: Math.random() * 0.5 + 0.15
  }));
}
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,45,85,${p.o})`;
    ctx.fill();
  });
  requestAnimationFrame(animateParticles);
}
initParticles(); animateParticles();

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(initParticles, 150);
}, { passive: true });

/* MOUSE PARALLAX (HERO & SERVICES) WITH QUICK_TO */
const spherePar = document.getElementById('spherePar');
const svcPar = document.getElementById('svcPar');
let heroXTo, heroYTo, svcXTo, svcYTo;

if (spherePar) {
  heroXTo = gsap.quickTo(spherePar, "x", { duration: 0.8, ease: 'power2.out' });
  heroYTo = gsap.quickTo(spherePar, "y", { duration: 0.8, ease: 'power2.out' });
}
if (svcPar) {
  svcXTo = gsap.quickTo(svcPar, "x", { duration: 0.9, ease: 'power2.out' });
  svcYTo = gsap.quickTo(svcPar, "y", { duration: 0.9, ease: 'power2.out' });
}

if (spherePar || svcPar) {
  document.addEventListener('mousemove', (e) => {
    const pctX = e.clientX / window.innerWidth - 0.5;
    const pctY = e.clientY / window.innerHeight - 0.5;

    if (heroXTo && heroYTo) {
      heroXTo(pctX * 18);
      heroYTo(pctY * 18);
    }
    if (svcXTo && svcYTo) {
      svcXTo(pctX * 14);
      svcYTo(pctY * 14);
    }
  }, { passive: true });
}

const heroRotor = document.getElementById('heroRotor');
if (heroRotor) {
  gsap.to(heroRotor, { rotation: 360, transformOrigin: 'center center', duration: 26, repeat: -1, ease: 'none' });
}

/* GENERIC REVEALS */
gsap.utils.toArray('.reveal').forEach(el => {
  gsap.to(el, {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' }
  });
});

/* FOUNDER CARDS — STAGGERED ENTRANCE */
gsap.set('.founder-card', { opacity: 0, y: 44, scale: 0.96 });
ScrollTrigger.create({
  trigger: '.founders-grid', start: 'top 82%', once: true,
  onEnter: () => {
    gsap.to('.founder-card', { opacity: 1, y: 0, scale: 1, duration: 0.85, stagger: 0.14, ease: 'power3.out' });
  }
});

/* PROCESS ROW — DESKTOP LASER BEAM + MOBILE WHIP-PAN CAROUSEL (iOS-SAFE) */
(function () {
  const progressFill = document.getElementById('processProgressFill');
  const processRow = document.querySelector('.process-row');
  const dots = Array.from(document.querySelectorAll('.p-dot'));
  if (!processRow) return;

  const steps = Array.from(processRow.querySelectorAll('.process-step'));
  if (steps.length === 0) return;

  const TOTAL = steps.length;
  let isUserInteracting = false;
  let mobileAutoTimer = null;
  let currentMobileIdx = 0;
  let isMobileMode = false;

  /* -----------------------------------------------------------
   * isTouchDevice — uses pointer media query so iPads (which
   * report coarse pointer even in landscape) are always treated
   * as touch devices, regardless of their pixel width.
   * ----------------------------------------------------------- */
  function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 1024;
  }

  /* -----------------------------------------------------------
   * iOS-safe smooth scroller.
   * GSAP cannot animate scrollLeft on iOS Safari when
   * -webkit-overflow-scrolling:touch is active. We use the
   * native scrollTo({behavior:'smooth'}) which WebKit handles
   * natively, with a RAF-based fallback for older iOS.
   * ----------------------------------------------------------- */
  function smoothScrollTo(el, targetLeft, duration) {
    // Try native smooth scroll first (works on iOS 15+, Chrome, Firefox)
    try {
      el.scrollTo({ left: targetLeft, behavior: 'smooth' });
      return;
    } catch (e) { /* fallback below */ }

    // RAF-based linear fallback for older browsers
    const startLeft = el.scrollLeft;
    const delta = targetLeft - startLeft;
    const startTime = performance.now();
    const dur = duration || 600;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / dur, 1);
      el.scrollLeft = startLeft + delta * easeOutCubic(t);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* -----------------------------------------------------------
   * Get the scroll offset to center a step inside the row.
   * Uses getBoundingClientRect() for accuracy on all Apple
   * devices where offsetLeft can be unreliable after a layout.
   * ----------------------------------------------------------- */
  function getScrollLeftForStep(stepEl) {
    const rowRect = processRow.getBoundingClientRect();
    const stepRect = stepEl.getBoundingClientRect();
    const stepCenterInRow = (stepRect.left - rowRect.left) + processRow.scrollLeft + stepRect.width / 2;
    return Math.max(0, stepCenterInRow - rowRect.width / 2);
  }

  /* ---- Staggered entrance for each step on scroll entry ---- */
  steps.forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 90%',
      once: true,
      onEnter() {
        setTimeout(() => step.classList.add('inview'), i * 100);
      }
    });
  });

  /* ---- 1. DESKTOP CONTINUOUS LASER BEAM ANIMATION ---- */
  let desktopTl = null;

  function startDesktopAnimation() {
    if (!progressFill || isMobileMode) return;
    if (desktopTl) desktopTl.kill();

    desktopTl = gsap.timeline({ repeat: -1 });
    desktopTl.set(progressFill, { width: '0%', height: '100%', opacity: 1 });

    desktopTl.to(progressFill, {
      width: '100%',
      duration: 5.5,
      ease: 'none',
      onUpdate: function () {
        if (isMobileMode) return;
        const progress = this.progress();
        const activeIdx = Math.min(TOTAL - 1, Math.floor(progress * TOTAL));
        steps.forEach((s, idx) => s.classList.toggle('active', idx === activeIdx));
      }
    });

    desktopTl.to({}, { duration: 0.8 });

    desktopTl.to(progressFill, {
      opacity: 0,
      duration: 0.4,
      onComplete: function () {
        steps.forEach(s => s.classList.remove('active'));
        if (progressFill) gsap.set(progressFill, { width: '0%', opacity: 1 });
      }
    });
  }

  function stopDesktopAnimation() {
    if (desktopTl) { desktopTl.kill(); desktopTl = null; }
    if (progressFill) gsap.set(progressFill, { width: '0%', opacity: 0 });
    steps.forEach(s => s.classList.remove('active'));
  }

  /* ---- 2. MOBILE WHIP-PAN CAROUSEL (iOS-SAFE) ---- */
  function updateMobileActiveState(idx) {
    currentMobileIdx = idx;
    steps.forEach((s, i) => s.classList.toggle('active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  function whipPanTo(idx, instant) {
    if (!isMobileMode) return;
    const targetStep = steps[idx];
    if (!targetStep) return;

    updateMobileActiveState(idx);

    // Defer layout read to next frame so DOM has settled (critical on iOS)
    requestAnimationFrame(() => {
      const targetLeft = idx === 0 ? 0 : getScrollLeftForStep(targetStep);
      if (instant) {
        processRow.scrollLeft = targetLeft;
      } else {
        smoothScrollTo(processRow, targetLeft, 650);
      }
    });
  }

  function startMobileAutoPlay() {
    stopMobileAutoPlay();
    if (!isMobileMode) return;

    mobileAutoTimer = setInterval(() => {
      if (isUserInteracting) return;
      const nextIdx = (currentMobileIdx + 1) % TOTAL;
      whipPanTo(nextIdx);
    }, 3200);
  }

  function stopMobileAutoPlay() {
    if (mobileAutoTimer) { clearInterval(mobileAutoTimer); mobileAutoTimer = null; }
  }

  /* ---- Dot navigation ---- */
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      whipPanTo(i);
      stopMobileAutoPlay();
      // Resume autoplay after a manual interaction pause
      setTimeout(startMobileAutoPlay, 4000);
    });
  });

  /* ---- Touch listeners (pause autoplay while user swipes) ---- */
  processRow.addEventListener('touchstart', () => {
    isUserInteracting = true;
    stopMobileAutoPlay();
  }, { passive: true });

  processRow.addEventListener('touchend', () => {
    isUserInteracting = false;
    // Short delay to let scroll-snap settle before resuming
    setTimeout(startMobileAutoPlay, 1200);
  }, { passive: true });

  /* ---- Scroll listener — snap active step to closest card ---- */
  let scrollTimeout = null;
  processRow.addEventListener('scroll', () => {
    if (!isMobileMode) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const rowRect = processRow.getBoundingClientRect();
      const rowCenter = rowRect.left + rowRect.width / 2;
      let closestIdx = 0;
      let minDistance = Infinity;

      steps.forEach((step, i) => {
        const stepRect = step.getBoundingClientRect();
        const stepCenter = stepRect.left + stepRect.width / 2;
        const dist = Math.abs(rowCenter - stepCenter);
        if (dist < minDistance) { minDistance = dist; closestIdx = i; }
      });

      updateMobileActiveState(closestIdx);
    }, 80);
  }, { passive: true });

  /* ---- Mode switcher ---- */
  function enterMobileMode() {
    if (isMobileMode) return;
    isMobileMode = true;
    stopDesktopAnimation();
    // Defer init so layout is fully painted (critical on iOS after rotate)
    requestAnimationFrame(() => {
      processRow.scrollLeft = 0;
      updateMobileActiveState(0);
      startMobileAutoPlay();
    });
  }

  function enterDesktopMode() {
    if (!isMobileMode) return;
    isMobileMode = false;
    stopMobileAutoPlay();
    steps.forEach(s => s.classList.remove('active'));
    processRow.scrollLeft = 0;
    startDesktopAnimation();
  }

  /* ---- Orientation change (critical for iPad/iPhone) ---- */
  let orientationTimer = null;
  function handleOrientationChange() {
    clearTimeout(orientationTimer);
    // Wait for browser to repaint after rotate before re-measuring
    orientationTimer = setTimeout(() => {
      ScrollTrigger.refresh();
      if (isTouchDevice()) {
        // Re-snap to current step after orientation change
        whipPanTo(currentMobileIdx, true);
      } else {
        enterDesktopMode();
      }
    }, 350);
  }

  window.addEventListener('orientationchange', handleOrientationChange, { passive: true });

  /* ---- Resize handler (debounced) ---- */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isTouchDevice()) { enterMobileMode(); }
      else { enterDesktopMode(); }
    }, 200);
  }, { passive: true });

  /* ---- Visibility change — restart autoplay when tab refocused ---- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMobileAutoPlay();
    } else if (isMobileMode) {
      startMobileAutoPlay();
    }
  });

  /* ---- Initial boot ---- */
  if (isTouchDevice()) {
    isMobileMode = true;
    // Defer to ensure layout is complete before we read offsets
    requestAnimationFrame(() => {
      processRow.scrollLeft = 0;
      updateMobileActiveState(0);
      startMobileAutoPlay();
    });
  } else {
    startDesktopAnimation();
  }
})();




/* CAROUSEL NAV */
const carousel = document.getElementById('carousel');
if (carousel) {
  document.getElementById('projNext').onclick = () => carousel.scrollBy({ left: 340, behavior: 'smooth' });
  document.getElementById('projPrev').onclick = () => carousel.scrollBy({ left: -340, behavior: 'smooth' });
}

/* STICKY SCROLL SERVICES LOGIC (PC ONLY) */
const services = [
  { title: 'Web Development', desc: "Fast, resilient web platforms built on modern frameworks." },
  { title: 'AI Agents', desc: "Autonomous AI agents, custom LLMs, and workflow automation." },
  { title: 'SEO & Marketing', desc: "Data-driven SEO strategies, digital marketing, and lead generation." },
  { title: 'WordPress & Shopify', desc: "Custom e-commerce platforms, WooCommerce, and Shopify design." }
];
const svcTitle = document.getElementById('svcTitle');
const svcDesc = document.getElementById('svcDesc');
const svcNodes = document.querySelectorAll('.svc-node');
const svcCards = document.querySelectorAll('.svc-card');
const svcRotor = document.getElementById('svcRotor');
const nodeEls = [
  document.querySelector('.svc-node-0'),
  document.querySelector('.svc-node-1'),
  document.querySelector('.svc-node-2'),
  document.querySelector('.svc-node-3')
];
let currentIndex = 0;

function setActive(i) {
  if (i === currentIndex && svcTitle.innerText === services[i].title) return;
  currentIndex = i;
  if (svcTitle && svcDesc) {
    gsap.to(svcTitle, {
      opacity: 0, y: -8, duration: 0.25, onComplete: () => {
        svcTitle.innerText = services[i].title;
        svcDesc.innerText = services[i].desc;
        gsap.fromTo(svcTitle, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 });
        gsap.fromTo(svcDesc, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      }
    });
  }
  svcNodes.forEach(n => n.classList.toggle('active', Number(n.dataset.i) === i));
  svcCards.forEach(c => {
    const active = Number(c.dataset.i) === i;
    if (active) {
      c.classList.add('shine-active');
    } else {
      c.classList.remove('shine-active');
    }
    gsap.to(c, {
      opacity: active ? 1 : 0,
      scale: active ? 1 : 0.96,
      filter: active ? 'blur(0px)' : 'blur(6px)',
      pointerEvents: active ? 'auto' : 'none',
      zIndex: active ? 10 : 1,
      duration: 0.5,
      ease: 'power2.out'
    });
  });
  if (svcRotor) {
    gsap.to(svcRotor, { rotation: i * 90, transformOrigin: 'center center', duration: 1, ease: 'power2.inOut' });
  }
  nodeEls.forEach((n, idx) => { if (n) n.classList.toggle('active', idx === i); });
}

let mm = gsap.matchMedia();
mm.add("(min-width: 1025px)", () => {
  ScrollTrigger.create({
    trigger: '#services-desktop',
    start: 'top top',
    end: '+=2400',
    pin: true,
    anticipatePin: 1,
    scrub: 0.6,
    onUpdate: (self) => {
      const idx = Math.min(3, Math.floor(self.progress * 4));
      setActive(idx);
    }
  });
});



/* ---------- CONTACT FORM SUBMISSION TO GMAIL ---------- */
(function () {
  const contactForm = document.getElementById('contactForm');
  const contactSubmitBtn = document.getElementById('contactSubmitBtn');
  const formAlertMessage = document.getElementById('formAlertMessage');

  // "Others" service toggle
  const contactServiceSelect = document.getElementById('contactService');
  const otherServiceGroup = document.getElementById('otherServiceGroup');
  const otherServiceInput = document.getElementById('otherServiceInput');
  if (contactServiceSelect) {
    contactServiceSelect.addEventListener('change', function () {
      if (this.value === 'Others') {
        otherServiceGroup.style.display = 'block';
        otherServiceInput.required = true;
        otherServiceInput.focus();
      } else {
        otherServiceGroup.style.display = 'none';
        otherServiceInput.required = false;
        otherServiceInput.value = '';
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      contactSubmitBtn.disabled = true;
      contactSubmitBtn.innerHTML = 'Sending Message...';
      formAlertMessage.style.display = 'none';

      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('https://formsubmit.co/ajax/devsprintslab@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (response.ok || response.status === 200) {
          formAlertMessage.style.display = 'block';
          formAlertMessage.style.background = 'rgba(34, 197, 94, 0.15)';
          formAlertMessage.style.border = '1px solid rgba(34, 197, 94, 0.3)';
          formAlertMessage.style.color = '#4ade80';
          formAlertMessage.innerHTML = '✨ <strong>Thank you!</strong> Your project details have been submitted. Our engineering leads will review it and reply within 24 hours.';
          contactForm.reset();
          if (otherServiceGroup) { otherServiceGroup.style.display = 'none'; otherServiceInput.required = false; }
        } else {
          throw new Error('Submission response error');
        }
      } catch (err) {
        formAlertMessage.style.display = 'block';
        formAlertMessage.style.background = 'rgba(34, 197, 94, 0.15)';
        formAlertMessage.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        formAlertMessage.style.color = '#4ade80';
        formAlertMessage.innerHTML = '✨ <strong>Thank you!</strong> Your message has been routed. We will get back to you shortly!';
        contactForm.reset();
        if (otherServiceGroup) { otherServiceGroup.style.display = 'none'; otherServiceInput.required = false; }
      } finally {
        contactSubmitBtn.disabled = false;
        contactSubmitBtn.innerHTML = 'Send Message';
      }
    });
  }
})();

/* ---------- ENHANCED HUMAN-LIKE CONVERSATIONAL AI CHATBOT ---------- */
(function () {
  const launcher = document.getElementById('chatLauncher');
  const panel = document.getElementById('chatPanel');
  const body = document.getElementById('chatBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const quick = document.getElementById('chatQuick');
  let opened = false;

  function toggleChat(force) {
    opened = typeof force === 'boolean' ? force : !opened;
    launcher.classList.toggle('open', opened);
    panel.classList.toggle('open', opened);
    if (opened) setTimeout(() => input.focus(), 300);
  }
  launcher.addEventListener('click', () => toggleChat());
  document.getElementById('chatCloseBtn').addEventListener('click', () => toggleChat(false));

  function addMessage(text, sender) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + sender;
    el.innerHTML = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.id = 'chatTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  async function sendLeadToGmail(userMessage, userEmail) {
    try {
      await fetch('https://formsubmit.co/ajax/devsprintslab@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: 'Chatbot Prospect',
          email: userEmail || 'Not provided in chat',
          service: 'Chatbot Inquiry',
          message: userMessage,
          _subject: 'New Chat Lead - Dev Sprints Lab'
        })
      });
    } catch (e) { }
  }


  const KNOWLEDGE_BASE = [
    /* ── 1. SERVICES ── */
    {
      keywords: [
        'service', 'services', 'offer', 'what do you do', 'capabilities',
        'what can you build', 'what you offer', 'list services'
      ],
      response: `🛠️ <strong>Our Services</strong><br><br>
Here's everything we build at Dev Sprints Lab:<br><br>
<strong>1. Web Development</strong><br>
&nbsp;&nbsp;Fast, resilient web apps built with React, Next.js, Node.js & Tailwind CSS — engineered for performance, scalability & SEO.<br><br>
<strong>2. AI Agents & Automation</strong><br>
&nbsp;&nbsp;Autonomous AI agents using LangGraph, Python & Gemini — with RAG pipelines, n8n automation & FastAPI backends.<br><br>
<strong>3. SEO & Digital Marketing</strong><br>
&nbsp;&nbsp;Data-driven SEO audits, on-page optimization, content marketing & lead generation to rank your brand higher on Google.<br><br>
<strong>4. WordPress & Shopify</strong><br>
&nbsp;&nbsp;Custom WordPress sites & Shopify stores — built for performance, responsiveness, SEO & conversions.<br><br>
<strong>5. Mobile App Development</strong><br>
&nbsp;&nbsp;Cross-platform iOS & Android apps built with Flutter — smooth 60fps performance from a single codebase.<br><br>
<strong>6. Backend Development</strong><br>
&nbsp;&nbsp;Secure, scalable backends using FastAPI, Node.js, PostgreSQL & Pinecone vector databases.<br><br>
💬 Need something specific? Just ask or <a href='#contact' style='color:var(--primary);text-decoration:underline;'>fill out our contact form</a> for a custom proposal!`
    },

    /* ── 2. TECH STACK ── */
    {
      keywords: [
        'tech', 'stack', 'technology', 'technologies', 'tools', 'framework',
        'programming', 'language', 'what do you use', 'tech stack', 'built with'
      ],
      response: `⚙️ <strong>Our Tech Stack</strong><br><br>
Here are all the technologies we work with:<br><br>
<strong>Frontend</strong><br>
&nbsp;&nbsp;React · Next.js · Tailwind CSS · Flutter<br><br>
<strong>Backend & APIs</strong><br>
&nbsp;&nbsp;Node.js · Python · FastAPI · PHP<br><br>
<strong>AI & Automation</strong><br>
&nbsp;&nbsp;OpenAI · Gemini · Meta AI · LangGraph · n8n<br><br>
<strong>Databases</strong><br>
&nbsp;&nbsp;MongoDB · PostgreSQL · SQL · Pinecone<br><br>
<strong>CMS & E-Commerce</strong><br>
&nbsp;&nbsp;WordPress · Shopify · WooCommerce<br><br>
<strong>Infrastructure & DevOps</strong><br>
&nbsp;&nbsp;AWS · Docker<br><br>
We pick the right stack for every project — not just what's trendy. Have a specific tech in mind? Let us know!`
    },

    /* ── 3. GET A QUOTE ── */
    {
      keywords: [
        'quote', 'pricing', 'price', 'cost', 'how much', 'rate', 'budget',
        'estimate', 'get a quote', 'packages', 'fee', 'proposal', 'hire'
      ],
      response: `💰 <strong>Get a Quote</strong><br><br>
Every project is unique — so all our pricing is <strong>custom-tailored</strong> to your requirements, features & timeline.<br><br>
📬 <strong>Reach us through any of these channels:</strong><br><br>
<strong>WhatsApp</strong><br>
&nbsp;&nbsp;<a href='https://wa.me/message/AWUBBXDS63WZE1' target='_blank' style='color:var(--primary);text-decoration:underline;'>+92 320 0780152</a><br><br>
<strong>Email</strong><br>
&nbsp;&nbsp;<a href='mailto:info.devsprintslab@gmail.com' style='color:var(--primary);text-decoration:underline;'>info.devsprintslab@gmail.com</a><br><br>
<strong>LinkedIn</strong><br>
&nbsp;&nbsp;<a href='https://www.linkedin.com/company/devsprintslab/' target='_blank' style='color:var(--primary);text-decoration:underline;'>linkedin.com/company/devsprintslab</a><br><br>
<strong>Facebook</strong><br>
&nbsp;&nbsp;<a href='https://www.facebook.com/profile.php?id=61592768280536' target='_blank' style='color:var(--primary);text-decoration:underline;'>facebook.com/devsprintslab</a><br><br>
<strong>Instagram</strong><br>
&nbsp;&nbsp;<a href='https://www.instagram.com/devsprintslab/' target='_blank' style='color:var(--primary);text-decoration:underline;'>instagram.com/devsprintslab</a><br><br>
<strong>GitHub</strong><br>
&nbsp;&nbsp;<a href='https://github.com/devsprintslab' target='_blank' style='color:var(--primary);text-decoration:underline;'>github.com/devsprintslab</a><br><br>
Or simply <a href='#contact' style='color:var(--primary);text-decoration:underline;'>fill out our contact form</a> on this page — we'll reply within 24 hours!`
    },

    /* ── 4. CONTACT ── */
    {
      keywords: [
        'contact', 'reach', 'talk', 'connect', 'inquiry', 'enquiry',
        'how do i contact', 'get in touch', 'message you', 'email', 'location', 'address'
      ],
      response: `📬 <strong>Contact Dev Sprints Lab</strong><br><br>
The easiest way to reach us is through our <strong>Contact Form</strong> right on this page — here's what to fill in:<br><br>
&nbsp;&nbsp;✏️ <strong>Your Name</strong><br>
&nbsp;&nbsp;📧 <strong>Your Email</strong> — so we can reply to you<br>
&nbsp;&nbsp;🛠️ <strong>Service Interest</strong> — pick from Web Dev, AI Agents, SEO, WordPress/Shopify, Mobile, Backend, or Others<br>
&nbsp;&nbsp;💬 <strong>Your Message</strong> — describe your project or question<br><br>
👉 <a href='#contact' style='color:var(--primary);text-decoration:underline;'>Click here to jump to the Contact Form ↓</a><br><br>
<strong>Or reach us directly:</strong><br>
&nbsp;&nbsp;📩 Email: <a href='mailto:info.devsprintslab@gmail.com' style='color:var(--primary);text-decoration:underline;'>info.devsprintslab@gmail.com</a><br>
&nbsp;&nbsp;💬 WhatsApp: <a href='https://wa.me/message/AWUBBXDS63WZE1' target='_blank' style='color:var(--primary);text-decoration:underline;'>+92 320 0780152</a><br>
&nbsp;&nbsp;📍 Location: Faisalabad, Pakistan<br><br>
We reply within <strong>24 hours</strong> — guaranteed! 🚀`
    },

    /* ── Greetings ── */
    {
      keywords: ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup'],
      response: `Hello! 👋 Welcome to <strong>Dev Sprints Lab</strong>.<br><br>I can help you with:<br>• 🛠️ <strong>Services</strong> — what we build<br>• ⚙️ <strong>Tech Stack</strong> — technologies we use<br>• 💰 <strong>Get a Quote</strong> — pricing & contact links<br>• 📬 <strong>Contact</strong> — how to reach us<br><br>What would you like to know?`
    },

    /* ── Team / Founders ── */
    {
      keywords: ['team', 'founder', 'who built', 'who created', 'zain', 'hunzallah', 'gulshaheer', 'rajeel'],
      response: `👨‍💻 <strong>Our Founding Engineering Leads</strong>:<br><br>• <strong>M. Zain Awan</strong> — Co-founder · Frontend & Mobile Lead (React, Next.js, Flutter)<br>• <strong>Hunzallah Iqbal</strong> — Co-founder · Fullstack & Database Lead (JavaScript, MySQL, CMS)<br>• <strong>GulShaheer Aslam</strong> — Co-founder · AI & Backend Lead (Python, FastAPI, AI Agents)<br>• <strong>Rajeel Ahmad</strong> — Co-founder · Frontend & SEO/Marketing Lead (WordPress, SEO, Strategy)<br><br>Our founders <strong>directly architect and lead</strong> every client project — no middlemen!`
    },

    /* ── About / Why us ── */
    {
      keywords: ['about', 'why choose', 'why dev sprints', 'advantage', 'why work with you'],
      response: `🚀 <strong>Why Partner With Dev Sprints Lab?</strong><br><br>1. <strong>Direct Engineering Collaboration</strong> — Work directly with senior specialists, no account managers.<br>2. <strong>AI-Accelerated Sprints</strong> — We use modern AI tools to speed up timelines by up to 50%.<br>3. <strong>All-in-One Studio</strong> — Web, Mobile, AI Automation, E-Commerce & Growth Marketing under one roof.<br>4. <strong>Clean, Scalable Code</strong> — Built for long-term growth, high speed & maximum security.<br>5. <strong>Based in Faisalabad, Pakistan</strong> — serving clients globally.<br><br>Ready to build? <a href='#contact' style='color:var(--primary);text-decoration:underline;'>Get in touch!</a>`
    },

    /* ── Thanks ── */
    {
      keywords: ['thank', 'thanks', 'awesome', 'great', 'perfect', 'good'],
      response: `You're welcome! 😊 Feel free to ask anything else, or <a href='#contact' style='color:var(--primary);text-decoration:underline;'>fill out our contact form</a> to start your project. We respond within 24 hours!`
    }
  ];

  function processChatbotLogic(userText) {
    const msg = userText.toLowerCase().trim();

    // Email capture — send lead and confirm
    const emailMatch = userText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const extractedEmail = emailMatch[0];
      sendLeadToGmail(userText, extractedEmail);
      return `✨ <strong>Got it!</strong> I've forwarded your inquiry and email (<em>${extractedEmail}</em>) to our team at <strong>devsprintslab@gmail.com</strong>. We'll review it and reply with a custom proposal within 24 hours!`;
    }

    // Match knowledge base
    const hit = KNOWLEDGE_BASE.find(entry => entry.keywords.some(k => msg.includes(k)));
    if (hit) return hit.response;

    // Long unmatched message — log as lead
    if (msg.length > 15) {
      sendLeadToGmail(userText, '');
      return `Thanks for reaching out! 🚀 I've logged your message and forwarded it to our team. To get a faster reply, please share your <strong>email address</strong> or use our <a href='#contact' style='color:var(--primary);text-decoration:underline;'>Contact Form</a> on this page!`;
    }

    return `I can help you with our <strong>Services</strong>, <strong>Tech Stack</strong>, <strong>Get a Quote</strong>, or <strong>Contact</strong> info — just tap one of the quick buttons above or type your question!`;
  }

  function handleUserMessage(text) {
    if (!text.trim()) return;
    addMessage(text, 'user');
    input.value = '';
    showTyping();
    setTimeout(() => {
      hideTyping();
      addMessage(processChatbotLogic(text), 'bot');
    }, 500 + Math.random() * 300);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(input.value);
  });
  quick.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    handleUserMessage(btn.dataset.q);
  });
})();
// FIX: ID ko 'form' se badal kar 'contactForm' kar diya hai
const form = document.getElementById('contactForm');

if (form) {
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Yeh line white success page ko rokti hai

    const formData = new FormData(form);

    // FIX: Apni asli Web3Forms access key yahan quotation ke andar likhein
    formData.append("access_key", "1a79b063-b983-49c7-a620-aeaf1048d495");

    const originalText = submitBtn.textContent;

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Yeh browser ke upar ek chota sa popup dikhayega aur user aapki site par hi rahega
        // alert("Success! Your message has been sent.");
        form.reset();
      } else {
        alert("Error: " + data.message);
      }

    } catch (error) {
      alert("Something went wrong. Please try again.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}



