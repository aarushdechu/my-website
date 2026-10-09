(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "space-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let stars = [];
  let lastFrame = 0;
  let hyperspaceUntil = 0;
  let constellationUntil = 0;

  function makeStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.35 + Math.random() * 1.35,
      speed: 0.7 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.88 ? "255,211,106" : "190,232,242",
    };
  }

  function resizeCanvas() {
    const density = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * density);
    canvas.height = Math.floor(height * density);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(density, 0, 0, density, 0, 0);
    const starCount = Math.max(70, Math.min(210, Math.round((width * height) / 8500)));
    stars = Array.from({ length: starCount }, makeStar);
  }

  function drawConstellation(now) {
    if (now > constellationUntil || stars.length < 8) return;
    context.save();
    context.strokeStyle = "rgba(110,231,255,0.24)";
    context.lineWidth = 0.7;
    context.beginPath();
    stars.slice(0, 8).forEach((star, index) => {
      if (index === 0) context.moveTo(star.x, star.y);
      else context.lineTo(star.x, star.y);
    });
    context.stroke();
    context.restore();
  }

  function draw(now = 0) {
    const delta = Math.min((now - lastFrame) / 16.67 || 1, 2);
    const hyperspace = now < hyperspaceUntil;
    lastFrame = now;
    context.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      const velocity = star.speed * (hyperspace ? 10 : 0.13) * delta;
      star.y += velocity;
      star.x += velocity * (hyperspace ? 0.18 : 0.015);
      if (star.y > height + 20 || star.x > width + 20) {
        Object.assign(star, makeStar(), { y: -10 });
      }

      const alpha = 0.25 + (Math.sin(now / 1500 + star.phase) + 1) * 0.2;
      context.strokeStyle = `rgba(${star.color},${alpha})`;
      context.fillStyle = `rgba(${star.color},${alpha})`;
      if (hyperspace) {
        context.beginPath();
        context.moveTo(star.x, star.y);
        context.lineTo(star.x - 12, star.y - 54 - star.speed * 20);
        context.stroke();
      } else {
        context.fillRect(star.x, star.y, star.size, star.size);
      }
    });

    drawConstellation(now);
    if (!reduceMotion) window.requestAnimationFrame(draw);
  }

  function toast(message) {
    let notice = document.querySelector(".space-toast");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "space-toast";
      notice.setAttribute("role", "status");
      document.body.append(notice);
    }
    notice.textContent = message;
    notice.classList.add("is-visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => notice.classList.remove("is-visible"), 2400);
  }

  function hyperspace(message = "Hyperspace unlocked") {
    hyperspaceUntil = performance.now() + 6500;
    document.body.classList.add("is-hyperspace");
    window.setTimeout(() => document.body.classList.remove("is-hyperspace"), 6500);
    toast(message);
  }

  function scramble(element, nextText) {
    if (reduceMotion) {
      element.textContent = nextText;
      return;
    }
    const glyphs = "01/\\.-";
    let frame = 0;
    const frames = 16;
    const timer = window.setInterval(() => {
      element.textContent = [...nextText].map((character, index) => {
        if (character === " " || index < (frame / frames) * nextText.length) return character;
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      }).join("");
      frame += 1;
      if (frame > frames) {
        window.clearInterval(timer);
        element.textContent = nextText;
      }
    }, 38);
  }

  resizeCanvas();
  if (reduceMotion) draw(0);
  else window.requestAnimationFrame(draw);
  window.addEventListener("resize", resizeCanvas, { passive: true });

  const cycleCopy = document.querySelector("[data-cycle-copy]");
  if (cycleCopy) {
    const lines = ["Origami. Art. Code.", "Fold. Draw. Build.", "Still making."];
    let line = 0;
    window.setInterval(() => {
      line = (line + 1) % lines.length;
      scramble(cycleCopy, lines[line]);
    }, 5600);
  }

  const titles = document.querySelectorAll(".signal-title");
  if (titles.length && !reduceMotion) {
    window.setInterval(() => {
      titles.forEach((title) => title.classList.add("is-glitching"));
      window.setTimeout(() => titles.forEach((title) => title.classList.remove("is-glitching")), 480);
    }, 8700);
  }

  let orbitClicks = 0;
  let orbitTimer;
  document.querySelectorAll(".brand .mark").forEach((mark) => {
    mark.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      orbitClicks += 1;
      window.clearTimeout(orbitTimer);
      orbitTimer = window.setTimeout(() => { orbitClicks = 0; }, 1800);
      if (orbitClicks >= 5) {
        orbitClicks = 0;
        hyperspace("Orbit five confirmed");
      }
    });
  });

  const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let sequenceIndex = 0;
  let typed = "";
  document.addEventListener("keydown", (event) => {
    const isTyping = event.target.matches("input, textarea, select, [contenteditable='true']");
    if (isTyping) return;

    sequenceIndex = event.key === sequence[sequenceIndex] ? sequenceIndex + 1 : 0;
    if (sequenceIndex === sequence.length) {
      sequenceIndex = 0;
      hyperspace("Flight sequence accepted");
    }

    if (event.key.length === 1) {
      typed = `${typed}${event.key.toLowerCase()}`.slice(-12);
      if (typed.endsWith("origami")) {
        constellationUntil = performance.now() + 7000;
        typed = "";
        toast("Paper constellation found");
      }
    }
  });

  const secretMessages = [
    "Signal 03.14 / Pi received",
    "Signal 07 / Seven interests",
    "Signal 12 / Made by Aarush",
    "Signal 42 / Still no final answer",
  ];
  let secretIndex = 0;
  document.querySelectorAll("[data-secret-signal]").forEach((button) => {
    button.addEventListener("click", () => {
      secretIndex = (secretIndex + 1) % secretMessages.length;
      button.textContent = secretMessages[secretIndex];
    });
  });

  document.querySelector(".hero-case-photo > span")?.addEventListener("click", (event) => {
    const frame = event.currentTarget.closest(".hero-case-photo");
    frame.classList.toggle("is-scanning");
    toast(frame.classList.contains("is-scanning") ? "Object scan active" : "Object scan closed");
  });

  const revealTargets = document.querySelectorAll(".section-head, .stat-card, .door, .gallery-item");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((target) => {
      target.classList.add("space-reveal");
      observer.observe(target);
    });
  }
})();
