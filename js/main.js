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

  const authLinks = document.querySelectorAll("[data-auth-link]");
  const isLoginPage = Boolean(document.getElementById("login-form") || document.getElementById("signup-form"));
  const isQuadraticPage = window.location.pathname.endsWith("/math.html") || window.location.pathname.endsWith("/math");
  const authPromptKey = "aarush-auth-prompt-seen";
  let authState = {
    authenticated: false,
    username: null,
  };

  function setAuthMessage(text, type = "") {
    const message = document.getElementById("login-message");
    if (!message) return;

    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }

  async function apiJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("The login API is not active yet. Run the site with python3 server.py locally, or redeploy the latest Python backend on Render.");
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}.`);
    }

    return data;
  }

  function updateAuthLinks() {
    authLinks.forEach((link) => {
      if (authState.authenticated) {
        link.textContent = "Logout";
        link.href = "#logout";
        link.title = `Logged in as ${authState.username}`;
        return;
      }

      link.textContent = "Login / Sign up";
      link.href = "login.html";
      link.title = "Log in or sign up";
    });
  }

  async function refreshSession() {
    try {
      authState = await apiJson("/api/session");
    } catch {
      authState = { authenticated: false, username: null };
    } finally {
      updateAuthLinks();
    }

    return authState;
  }

  function getAuthModal() {
    let modal = document.getElementById("auth-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.id = "auth-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="auth-modal__backdrop" data-auth-dismiss></div>
      <section class="auth-modal__card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <span class="eyebrow">Member bonus</span>
        <h2 id="auth-modal-title">Log in or sign up for more</h2>
        <p>Make an account to unlock Quadratic and keep the website feeling more personal.</p>
        <div class="auth-modal__actions">
          <a class="btn btn--coral" href="login.html?mode=signup">Sign up</a>
          <a class="btn btn--ghost" href="login.html">Log in</a>
        </div>
        <button class="auth-modal__close" type="button" data-auth-dismiss aria-label="Close">×</button>
      </section>
    `;
    document.body.append(modal);
    modal.addEventListener("click", (event) => {
      if (!event.target.closest("[data-auth-dismiss]")) return;
      if (modal.classList.contains("is-required")) return;
      modal.hidden = true;
    });
    return modal;
  }

  function showAuthPrompt(required = false) {
    if (authState.authenticated || isLoginPage) return;
    if (!required && sessionStorage.getItem(authPromptKey)) return;

    const modal = getAuthModal();
    modal.classList.toggle("is-required", required);
    modal.hidden = false;

    if (!required) {
      sessionStorage.setItem(authPromptKey, "true");
    }
  }

  function validatePassword(password) {
    const missing = [];

    if (password.length <= 8) missing.push("more than 8 characters");
    if (!/[a-z]/.test(password)) missing.push("a lowercase letter");
    if (!/[A-Z]/.test(password)) missing.push("a capital letter");
    if (!/\d/.test(password)) missing.push("a number");
    if (!/[^A-Za-z0-9]/.test(password)) missing.push("a symbol");

    return missing.length ? `Password needs ${missing.join(", ")}.` : "";
  }

  authLinks.forEach((link) => {
    link.addEventListener("click", async (event) => {
      if (!authState.authenticated) return;

      event.preventDefault();
      try {
        await apiJson("/api/logout", { method: "POST" });
      } finally {
        authState = { authenticated: false, username: null };
        updateAuthLinks();
        window.location.href = "login.html";
      }
    });
  });

  document.addEventListener("click", (event) => {
    const quadraticLink = event.target.closest('a[href="math.html"]');
    if (!quadraticLink || authState.authenticated || isLoginPage) return;

    event.preventDefault();
    showAuthPrompt(true);
  });

  function selectAuthMode(mode) {
    const selectedMode = ["login", "signup", "reset"].includes(mode) ? mode : "login";
    const title = document.getElementById("login-title");
    const intro = document.getElementById("auth-intro");
    const copy = {
      login: {
        title: "Log in",
        intro: "Log in to unlock Quadratic.",
      },
      signup: {
        title: "Sign up",
        intro: "Create an account to unlock Quadratic and save delivery details for shop orders.",
      },
      reset: {
        title: "Reset password",
        intro: "Use the reset code to choose a new password.",
      },
    };

    if (title) {
      title.textContent = copy[selectedMode].title;
    }

    if (intro) {
      intro.textContent = copy[selectedMode].intro;
    }

    document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
      const active = tab.dataset.authTab === selectedMode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.authPanel !== selectedMode;
    });
  }

  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      selectAuthMode(tab.dataset.authTab);
      setAuthMessage("");
    });
  });

  if (isLoginPage) {
    selectAuthMode(new URLSearchParams(window.location.search).get("mode"));
  }

  async function submitCredentials(form, endpoint, successText) {
    const username = form.querySelector('[name="username"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const confirmPassword = form.querySelector('[name="confirm-password"]')?.value;
    const fullName = form.querySelector('[name="full-name"]')?.value.trim();
    const deliveryAddress = form.querySelector('[name="delivery-address"]')?.value.trim();
    const resetCode = form.querySelector('[name="reset-code"]')?.value;
    const submitButton = form.querySelector('button[type="submit"]');

    if (!username || !password) {
      setAuthMessage("Enter your username and password.", "error");
      return;
    }

    if (fullName !== undefined && fullName.length < 2) {
      setAuthMessage("Enter a delivery name.", "error");
      return;
    }

    if (deliveryAddress !== undefined && deliveryAddress.length < 8) {
      setAuthMessage("Enter a delivery address for shop orders.", "error");
      return;
    }

    if (resetCode !== undefined && !resetCode) {
      setAuthMessage("Enter the reset code.", "error");
      return;
    }

    const passwordError = validatePassword(password);
    if (endpoint !== "/api/login" && passwordError) {
      setAuthMessage(passwordError, "error");
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      setAuthMessage("Those passwords do not match.", "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Checking";
    }
    setAuthMessage("Checking...", "");

    try {
      const payload = { username, password };
      if (fullName !== undefined) payload.fullName = fullName;
      if (deliveryAddress !== undefined) payload.deliveryAddress = deliveryAddress;
      if (resetCode !== undefined) payload.resetCode = resetCode;

      const data = await apiJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (data.authenticated) {
        authState = data;
        updateAuthLinks();
      }
      setAuthMessage(successText, "success");
      window.setTimeout(() => {
        window.location.href = data.authenticated ? "index.html" : "login.html";
      }, 550);
    } catch (error) {
      setAuthMessage(error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = form.dataset.submitText || "Submit";
      }
    }
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitCredentials(loginForm, "/api/login", "You're in. Redirecting...");
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitCredentials(signupForm, "/api/signup", "Account created. Redirecting...");
    });
  }

  const resetForm = document.getElementById("reset-form");
  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitCredentials(resetForm, "/api/reset-password", "Password reset. Go log in.");
    });
  }

  const authReady = refreshSession();
  authReady.then((session) => {
    if (!session.authenticated && !isQuadraticPage) {
      showAuthPrompt(false);
    }
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

  function lockQuadraticForGuests() {
    if (!mathForm) return;

    document.body.classList.add("is-quadratic-locked");
    if (askButton) askButton.disabled = true;
    if (mathQuestion) {
      mathQuestion.disabled = true;
      mathQuestion.placeholder = "Log in or sign up to use Quadratic.";
    }

    document.querySelectorAll("[data-question]").forEach((chip) => {
      chip.disabled = true;
    });

    setQuadraticStatus("Locked");
    if (mathChat && !mathChat.querySelector("[data-auth-required-message]")) {
      const message = addMathMessage("bot", "Log in or sign up to unlock Quadratic.");
      if (message) message.dataset.authRequiredMessage = "true";
    }
  }

  authReady.then((session) => {
    if (mathForm && !session.authenticated) {
      lockQuadraticForGuests();
      showAuthPrompt(true);
    }
  });

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
    if (!authState.authenticated) {
      lockQuadraticForGuests();
      showAuthPrompt(true);
      return;
    }

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
