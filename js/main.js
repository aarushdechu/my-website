/* =====================================================================
   Aarush's website — main.js
   Runs on every page. It: (1) opens/closes the phone menu,
   (2) fills the footer year, (3) builds the Shop cards.

   ✏️  TO ADD OR CHANGE ITEMS: edit the SHOP_ITEMS list below.
   ===================================================================== */

const SHOP_ITEMS = [
  { emoji: "🕊️", name: "Origami crane",      desc: "Folded from pretty patterned paper. Great on a shelf.",   price: "$5",  status: "available" },
  { emoji: "🐉", name: "Origami dragon",     desc: "My hardest fold. Looks awesome, takes me an hour.",       price: "$12", status: "available" },
  { emoji: "🎨", name: "Mini canvas art",    desc: "A small painting — pick a color theme and I'll make it.", price: "$15", status: "available" },
  { emoji: "✏️", name: "Custom doodle",      desc: "I'll draw your pet, your name, or anything you like.",    price: "$3",  status: "available" },
  { emoji: "🔖", name: "Painted bookmark",   desc: "Handmade and laminated so it lasts.",                     price: "$4",  status: "available" },
  { emoji: "🎁", name: "Surprise paper set", desc: "Five mystery origami pieces. You don't know what you'll get!", price: "$10", status: "soon" },
];

function shopCard(item) {
  const soon = item.status === "soon";
  const pill = soon
    ? '<span class="pill pill--soon">Coming soon</span>'
    : '<span class="pill pill--available">Available</span>';
  return `
    <article class="card">
      <div class="thumb">${item.emoji}</div>
      <div class="body">
        <h3>${item.name}</h3>
        <p class="desc">${item.desc}</p>
        <div class="meta">
          <span class="price">${item.price}</span>
          ${pill}
        </div>
      </div>
      <button class="ask" data-item="${item.name}">${soon ? "Notify me" : "Ask about this"}</button>
    </article>`;
}

document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Build the shop grid (only on shop.html)
  const shopGrid = document.getElementById("shop-grid");
  if (shopGrid) shopGrid.innerHTML = SHOP_ITEMS.map(shopCard).join("");

  // "Ask about this" button
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".ask");
    if (!btn) return;
    const item = btn.dataset.item || "this";
    alert(
      `Awesome — you're interested in "${item}"!\n\n` +
      `Ask Aarush (with a grown-up's help) to set up the details. ` +
      `A parent handles payments and meet-ups so everything stays safe.`
    );
  });

  // Quadratic chat (only on math.html)
  const mathForm = document.getElementById("math-form");
  const mathQuestion = document.getElementById("math-question");
  const mathChat = document.getElementById("math-chat");
  const clearMemory = document.getElementById("clear-memory");
  const statusDot = document.querySelector(".status-dot");
  const askButton = mathForm ? mathForm.querySelector('button[type="submit"]') : null;
  const chatStorageKey = "quadratic-chat-history";
  const config = window.QuadraticAIConfig || {};
  const maxTurns = config.maxConversationTurns || 12;
  let quadraticHistory = [];

  function hasUsableApiKey() {
    return Boolean(config.apiProxyUrl);
  }

  function setQuadraticStatus(text) {
    if (statusDot) statusDot.textContent = text;
  }

  function getReadyStatusText() {
    if (!isQuadraticInAiMode()) return "Local mode";

    return "Python Ready";
  }

  function setInitialQuadraticStatus() {
    if (!statusDot) return;

    if (config.useAI && hasUsableApiKey()) {
      setQuadraticStatus(getReadyStatusText());
      statusDot.classList.add("is-ai");
      return;
    }

    setQuadraticStatus("Local mode");
    statusDot.classList.add("is-local");
  }

  function isQuadraticInAiMode() {
    return Boolean(config.useAI && hasUsableApiKey());
  }

  function loadQuadraticHistory() {
    if (!config.rememberChat) return;

    try {
      quadraticHistory = JSON.parse(localStorage.getItem(chatStorageKey)) || [];
    } catch {
      quadraticHistory = [];
    }
  }

  function saveQuadraticHistory() {
    if (!config.rememberChat) return;

    const trimmed = quadraticHistory.slice(-maxTurns * 2);
    quadraticHistory = trimmed;
    localStorage.setItem(chatStorageKey, JSON.stringify(trimmed));
  }

  function rememberQuadraticMessage(role, content) {
    quadraticHistory.push({ role, content });
    saveQuadraticHistory();
  }

  function addMathMessage(role, text) {
    if (!mathChat) return null;

    const message = document.createElement("article");
    message.className = `math-message ${role}`;

    const name = document.createElement("strong");
    name.textContent = role === "user" ? "You" : "Quadratic";

    const body = document.createElement("p");
    body.textContent = text;

    message.append(name, body);
    mathChat.append(message);
    mathChat.scrollTop = mathChat.scrollHeight;
    return message;
  }

  function labelBotMessage(message, source) {
    if (!message || !source) return;

    const name = message.querySelector("strong");
    if (name) name.textContent = `Quadratic · ${source}`;
  }

  function renderSavedQuadraticHistory() {
    if (!mathChat || quadraticHistory.length === 0) return;

    mathChat.querySelectorAll(".math-message:not(:first-child)").forEach(message => message.remove());

    quadraticHistory.forEach((message) => {
      addMathMessage(message.role === "assistant" ? "bot" : "user", message.content);
    });
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function typeIntoMessage(message, text) {
    if (!message) return;

    const body = message.querySelector("p");
    const speed = config.typingSpeedMs ?? 8;
    body.textContent = "";
    message.classList.add("is-typing");
    setQuadraticStatus("Typing");

    for (let index = 0; index < text.length; index += 1) {
      body.textContent += text[index];

      if (index % 3 === 0) {
        mathChat.scrollTop = mathChat.scrollHeight;
        await wait(speed);
      }
    }

    message.classList.remove("is-typing");
    mathChat.scrollTop = mathChat.scrollHeight;
  }

  async function askQuadratic(question) {
    if (askButton) {
      askButton.disabled = true;
      askButton.textContent = "Thinking";
    }

    addMathMessage("user", question);
    rememberQuadraticMessage("user", question);
    const thinking = addMathMessage("bot", "Thinking through the method...");
    setQuadraticStatus("Thinking");

    try {
      const answer = window.AarushMathBrain
        ? await window.AarushMathBrain.answer(question, quadraticHistory.slice(0, -1))
        : "Quadratic did not load yet. Refresh the page and try again.";
      const source = window.AarushMathBrain?.getLastAnswerSource?.() || "unknown source";

      if (thinking) {
        labelBotMessage(thinking, source);
        await typeIntoMessage(thinking, answer);
        rememberQuadraticMessage("assistant", answer);
      }
    } finally {
      if (askButton) {
        askButton.disabled = false;
        askButton.textContent = "Ask";
      }

      setQuadraticStatus(getReadyStatusText());
    }
  }

  if (mathForm && mathQuestion) {
    setInitialQuadraticStatus();
    loadQuadraticHistory();
    renderSavedQuadraticHistory();

    if (!isQuadraticInAiMode() && quadraticHistory.length === 0) {
      addMathMessage(
        "bot",
        "Heads up: I am in Local mode right now, so I can only use the built-in fallback brain. Start the Python backend and set GEMINI_API_KEY in .env to use Gemini."
      );
    }

    mathForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const question = mathQuestion.value.trim();

      if (!question) {
        mathQuestion.focus();
        return;
      }

      askQuadratic(question);
      mathQuestion.value = "";
    });

    mathQuestion.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        mathForm.requestSubmit();
      }
    });
  }

  document.querySelectorAll("[data-question]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const question = chip.dataset.question;
      if (mathQuestion) mathQuestion.value = question;
      askQuadratic(question);
    });
  });

  if (clearMemory) {
    clearMemory.addEventListener("click", () => {
      quadraticHistory = [];
      localStorage.removeItem(chatStorageKey);

      if (mathChat) {
        mathChat.querySelectorAll(".math-message:not(:first-child)").forEach(message => message.remove());
      }

      setQuadraticStatus("Memory cleared");
      window.setTimeout(() => setQuadraticStatus("Ready"), 1200);
    });
  }
});
