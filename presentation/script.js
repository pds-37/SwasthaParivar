document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  let currentSlide = 0;

  const counterEl = document.getElementById('slide-counter-text');
  const dotsContainer = document.getElementById('pagination-dots');
  const progressFill = document.getElementById('progress-fill');
  
  // Teleprompter / Speaker Notes Elements
  const notesDrawer = document.getElementById('teleprompter-drawer');
  const notesToggleBtn = document.getElementById('btn-toggle-notes');
  const closeNotesBtn = document.getElementById('btn-close-notes');
  const notesBody = document.getElementById('notes-body');

  let isNotesOpen = false;

  // Speaker notes content database synced with slide index
  const speakerNotes = [
    {
      title: "Slide 1: Title & Vision",
      content: `
        <p><strong>Hook:</strong> "Good morning everyone. Today we are presenting Swastha Parivar—a paradigm shift in how households manage family healthcare."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li>Introduce yourself and thank the corporate executives for their time.</li>
          <li>Emphasize our core thesis: Healthcare shouldn't be siloed into individual disconnected records; it lives in the context of a family.</li>
          <li>Highlight that Swastha Parivar combines structured records, proactive AI intelligence, and verified remedies into one cohesive digital OS.</li>
        </ul>
        <div class="key-takeaway">🎯 Key Takeaway: Position Swastha Parivar not just as an app, but as the foundational digital health infrastructure for Indian families.</div>
      `
    },
    {
      title: "Slide 2: The Core Industry Problem",
      content: `
        <p><strong>Hook:</strong> "Why do 80% of families struggle to maintain consistent health awareness until an emergency happens?"</p>
        <h4>Talking Points:</h4>
        <ul>
          <li><strong>Fragmented Records:</strong> WhatsApp groups and paper files lead to lost prescriptions and diagnostic histories.</li>
          <li><strong>Lack of Context-Aware AI:</strong> Generic bots give generic answers because they lack long-term memory of a family's chronic trends.</li>
          <li><strong>Unverified Tradition:</strong> Millions practice home remedies without clinical safety checks, leading to drug interactions and adverse events.</li>
        </ul>
        <div class="key-takeaway">💡 Corporate Hook: This fragmentation represents an enormous efficiency loss for healthcare systems and insurers alike.</div>
      `
    },
    {
      title: "Slide 3: Our Solution - Swastha Parivar",
      content: `
        <p><strong>Hook:</strong> "Swastha Parivar bridges this gap by unifying family records, intelligent AI chat, and clinical safety under a single dashboard."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li>Walk through the unified value proposition: One household account for elders, parents, and children.</li>
          <li>Point out the <strong>Live Demo</strong> capability—our app is not a mockup; it's a fully functional full-stack system deployed globally.</li>
          <li>Mention our seamless UX: PWA mobile support combined with instant VAPID push notifications.</li>
        </ul>
        <div class="key-takeaway">🚀 Interactive Cue: You can click the 'Launch Live App' button right now if you wish to show the live Vercel dashboard!</div>
      `
    },
    {
      title: "Slide 4: Technical Moat #1 - Contextual AI",
      content: `
        <p><strong>Hook:</strong> "What makes our AI truly defensible? It remembers, it listens in local languages, and it detects risks before human observation."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li><strong>Google Gemini Integration:</strong> We architected a custom AI orchestrator that maintains persistent 'AI Memory' of medical history.</li>
          <li><strong>Regional & Voice Native:</strong> Speech-to-text input with regional language translation (including Hindi) breaks down adoption barriers for elderly family members.</li>
          <li><strong>Proactive Chronic Trend Alerts:</strong> Automated background CRON jobs scan health readings for chronic high/low anomalies and trigger instant push alerts.</li>
        </ul>
        <div class="key-takeaway">🛡️ Competitive Advantage: Ordinary apps wait for inputs; our AI proactively guards the household.</div>
      `
    },
    {
      title: "Slide 5: Technical Moat #2 - Verified Remedies",
      content: `
        <p><strong>Hook:</strong> "We are pioneering a standardized bridge between cultural wellness practices and clinical safety."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li>We built an exhaustive Home Remedy Library structured by medical sectors and symptom classifications.</li>
          <li><strong>Clinical Safety Guardrails:</strong> Every remedy includes automated safety checks and explicit adverse-event reporting protocols.</li>
          <li>This directly reduces emergency ER room visits for minor ailments while safeguarding users from dangerous folk remedies.</li>
        </ul>
        <div class="key-takeaway">🌿 Strategic Synergy: Perfect for preventive health programs and corporate wellness initiatives.</div>
      `
    },
    {
      title: "Slide 6: Doctor-Share & Report AI Ecosystem",
      content: `
        <p><strong>Hook:</strong> "How do we connect home health tracking with professional clinical environments?"</p>
        <h4>Talking Points:</h4>
        <ul>
          <li><strong>One-Click Doctor-Share PDF:</strong> Users compile vitals, medication histories, and AI trend insights into a verified, clinical-grade summary in seconds.</li>
          <li><strong>AI Report Analysis:</strong> Pro users can upload complex diagnostic laboratory reports (CBG, blood panels, imaging logs) and have Google Gemini translate them into simple, actionable summaries.</li>
          <li>Reminds doctors of context instantly, saving diagnostic time during clinical consultations.</li>
        </ul>
        <div class="key-takeaway">📋 Demo Cue: Point out the sample clinical report analysis workflow available in our live production environment.</div>
      `
    },
    {
      title: "Slide 7: Business Model & Monetization",
      content: `
        <p><strong>Hook:</strong> "We have implemented a rigorous freemium monetization architecture designed for sustained recurring revenue and low customer acquisition costs."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li><strong>Free Tier Gating:</strong> Enforced backend rate-limiting (3 members, 30 days history, 10 AI chats/day) drives organic conversion to Pro.</li>
          <li><strong>Pro & Family Plans:</strong> Unlimited tracking, automated report analysis, and deep trend alerts.</li>
          <li><strong>Viral Zero-CAC Referral Engine:</strong> Built-in referral loop where users gift and earn 1-month Pro extensions, creating exponential household growth.</li>
        </ul>
        <div class="key-takeaway">📈 Investor Metric: Combining high retention (household utility) with built-in viral referral mechanics.</div>
      `
    },
    {
      title: "Slide 8: Enterprise Engineering Excellence",
      content: `
        <p><strong>Hook:</strong> "Under the hood, Swastha Parivar is built to enterprise-grade scalability and security standards."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li><strong>Modern Frontend:</strong> React 19, Vite, Material UI, and Framer Motion with PWA service-worker offline caching.</li>
          <li><strong>Robust Backend:</strong> Node.js/Express with MongoDB, strict Zod validation, JWT bearer cookies, and Redis rate limiting.</li>
          <li><strong>Enterprise Observability:</strong> Integrated Sentry real-time error tracking and PostHog product telemetry.</li>
        </ul>
        <div class="key-takeaway">⚙️ Technical Rigor: Built with rigorous production architectural patterns ready to scale to millions of users immediately.</div>
      `
    },
    {
      title: "Slide 9: Intellectual Property & Defensibility",
      content: `
        <p><strong>Hook:</strong> "Beyond software execution, our core innovations are formalized through comprehensive Intellectual Property structures."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li>Highlight our filed <strong>Invention Disclosure Form (IDF)</strong> detailing our proprietary methodologies.</li>
          <li>Our patentable claims encompass: context-aware household AI memory synthesis, automated chronic trend anomaly generation, and safety-verified traditional remedy evaluation protocols.</li>
          <li>Creates a deep, highly defensible moat against commercial competitors or casual clones.</li>
        </ul>
        <div class="key-takeaway">🏛️ Corporate Value: Real intellectual property asset value backing our technological innovations.</div>
      `
    },
    {
      title: "Slide 10: Strategic Partnership & Next Steps",
      content: `
        <p><strong>Hook:</strong> "We are inviting corporate partners and industry leaders to join us in scaling the future of family healthcare."</p>
        <h4>Talking Points:</h4>
        <ul>
          <li>Summarize our three synergy pillars: Enterprise Employee Health Integration, Insurance Risk Reduction, and Clinical Network Deployment.</li>
          <li>Reiterate that the system is fully operational, verified, and ready for immediate technical evaluation or integration pilot studies.</li>
          <li>Open the floor for strategic conversation, architectural deep dives, or live platform exploration.</li>
        </ul>
        <div class="key-takeaway">🤝 Closing Call to Action: 'Let's open the live dashboard or discuss integration roadmaps!'</div>
      `
    }
  ];

  // Initialize navigation dots
  function buildPaginationDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = `nav-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('title', `Go to Slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  // Slide translation state machine
  function goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;

    slides[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');

    // Update controls
    counterEl.textContent = `${currentSlide + 1} / ${totalSlides}`;
    
    // Update progress bar
    const progressPercent = ((currentSlide + 1) / totalSlides) * 100;
    progressFill.style.width = `${progressPercent}%`;

    // Update dots
    const dots = dotsContainer.querySelectorAll('.nav-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });

    // Sync teleprompter speaker notes if drawer is open or updated
    syncSpeakerNotes();
  }

  function syncSpeakerNotes() {
    const noteData = speakerNotes[currentSlide] || {
      title: `Slide ${currentSlide + 1} Notes`,
      content: "<p>No detailed notes registered for this section.</p>"
    };
    
    notesBody.innerHTML = `
      <h3 style="color:#fff; font-size:1.15rem; margin-bottom:0.75rem;">${noteData.title}</h3>
      ${noteData.content}
    `;
  }

  function nextSlide() {
    if (currentSlide < totalSlides - 1) {
      goToSlide(currentSlide + 1);
    }
  }

  function prevSlide() {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  }

  // Teleprompter drawer toggle logic
  function toggleNotes() {
    isNotesOpen = !isNotesOpen;
    notesDrawer.classList.toggle('visible', isNotesOpen);
    notesToggleBtn.classList.toggle('active-notes', isNotesOpen);
  }

  if (notesToggleBtn) {
    notesToggleBtn.addEventListener('click', toggleNotes);
  }

  if (closeNotesBtn) {
    closeNotesBtn.addEventListener('click', () => {
      isNotesOpen = false;
      notesDrawer.classList.remove('visible');
      notesToggleBtn.classList.remove('active-notes');
    });
  }

  // Button binders for footer
  document.getElementById('btn-prev').addEventListener('click', prevSlide);
  document.getElementById('btn-next').addEventListener('click', nextSlide);
  
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  });

  // Keyboard navigation controller
  document.addEventListener('keydown', (e) => {
    // Prevent interfering if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault();
        prevSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(totalSlides - 1);
        break;
      case 'f':
      case 'F':
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          document.getElementById('btn-fullscreen').click();
        }
        break;
      case 'n':
      case 'N':
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          toggleNotes();
        }
        break;
    }
  });

  // Touch Swipe Support for touch-enabled executive screens / tables
  let touchStartX = 0;
  let touchEndX = 0;

  const viewport = document.getElementById('slide-viewport');
  if (viewport) {
    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, false);

    viewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleGesture();
    }, false);
  }

  function handleGesture() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
      nextSlide(); // Swipe Left -> Next slide
    }
    if (touchEndX > touchStartX + threshold) {
      prevSlide(); // Swipe Right -> Prev slide
    }
  }

  // Initialize
  buildPaginationDots();
  goToSlide(0);
});
