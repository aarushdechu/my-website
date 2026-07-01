/* =====================================================================
   Aarush's website — main.js
   Runs on every page. It: (1) opens/closes the phone menu,
   (2) fills the footer year, (3) builds the Shop cards.

   ✏️  TO ADD OR CHANGE ITEMS: edit the SHOP_CATEGORIES list below.
   ===================================================================== */

const SHOP_CATEGORIES = [
  {
    name: "Origami",
    emoji: "O",
    desc: "Handmade paper folds, sorted like project folders.",
    accent: "#efbd52",
    deep: "#d9962d",
    items: [
      {
        emoji: "B",
        name: "Birds and Wings",
        desc: "Flying folds with dramatic wings and display shapes.",
        status: "available",
        children: [
          { emoji: "E", name: "Origami Eagle", desc: "A bold folded eagle with wide wings and a sharp beak.", status: "available", image: "images/shop/eagle-mywebsite-shop.png", thumbZoom: 1.5 },
          { emoji: "P", name: "Origami Phoenix", desc: "A red and gold winged phoenix-style fold.", status: "available", image: "images/shop/pheonix-mywebsite-shop.png", thumbZoom: 1.65 },
          { emoji: "Pa", name: "Origami Parrot", desc: "A tall blue bird fold with a perch-style display.", status: "available", image: "images/shop/parrot-mywebsite-shop.png", thumbZoom: 2.2 },
        ],
      },
      {
        emoji: "D",
        name: "Origami Dragons",
        desc: "Choose the dragon version you want.",
        status: "available",
        children: [
          { emoji: "D1", name: "Dragon v1", desc: "Standing red dragon with wings and a simple strong pose.", status: "available", image: "images/shop/dragonv1-mywebsite-shop.png", thumbZoom: 1.35 },
          { emoji: "D2", name: "Dragon v2", desc: "Sleeping red dragon, longer and lower to the table.", status: "available", image: "images/shop/dragonv2-mywebsite-shop.png", thumbZoom: 1.28 },
          { emoji: "D3", name: "Dragon v3", desc: "Darker red dragon with a more detailed display look.", status: "available", image: "images/shop/dragonv3-mywebsite-shop.png", thumbZoom: 1.42 },
        ],
      },
      {
        emoji: "F",
        name: "Origami Flowers",
        desc: "Folded flowers in several styles.",
        status: "available",
        children: [
          { emoji: "Da", name: "Daisy", desc: "Red and yellow flower in a paper pot.", status: "available", image: "images/shop/flowerdaisy-mywebsite-shop.png", thumbZoom: 1.42 },
          { emoji: "Su", name: "Sunflower", desc: "Yellow petals with an orange center.", status: "available", image: "images/shop/flowersunflower-mywebsite-shop.png", thumbZoom: 1.5 },
          { emoji: "Ro", name: "Rose", desc: "Dark red folded rose in a paper pot.", status: "available", image: "images/shop/flowerrose-mywebsite-shop.png", thumbZoom: 1.38 },
          { emoji: "Li", name: "Lily", desc: "Pink folded lily with a tall stem.", status: "available", image: "images/shop/flowerlily-mywebsite-shop.png", thumbZoom: 1.34 },
        ],
      },
      {
        emoji: "Di",
        name: "Origami Dinosaurs",
        desc: "Green dinosaur folds with different body shapes.",
        status: "available",
        children: [
          { emoji: "V", name: "Velociraptor", desc: "Longer-than-tall green dinosaur with a long tail.", status: "available", image: "images/shop/dinovelociraptor-mywebsite-shop.png", thumbZoom: 1.62 },
          { emoji: "T", name: "T-Rex", desc: "Fatter green dinosaur with a bigger body.", status: "available", image: "images/shop/dinotrex-mywebsite-shop.png", thumbZoom: 1.48 },
          { emoji: "Br", name: "Brachiosaurus / Brontosaurus", desc: "Tall-necked green dinosaur fold.", status: "available", image: "images/shop/dinobrachiosaurus-mywebsite-shop.png", thumbZoom: 1.42 },
        ],
      },
      {
        emoji: "A",
        name: "Other Origami",
        desc: "Small characters and custom name pieces.",
        status: "available",
        children: [
          { emoji: "M", name: "Origami Mouse", desc: "Mouse fold with a pointed nose and round ears.", status: "available", image: "images/shop/mouse-mywebsite-shop.png", thumbZoom: 1.8 },
          { emoji: "ABC", name: "Origami Alphabet Name", desc: "A custom name made from folded origami letters.", status: "available", image: "images/shop/alphabet-mywebsite-shop.png", thumbZoom: 1.45 },
        ],
      },
    ],
  },
  {
    name: "Art",
    emoji: "A",
    desc: "Personalized drawings made for the person ordering.",
    accent: "#f27d7d",
    deep: "#dd555f",
    items: [
      { emoji: "C", name: "Personalized Caricature", desc: "A fun exaggerated portrait based on the person.", status: "available" },
      { emoji: "M", name: "Personalized Manga", desc: "A manga-style character drawing made from your idea.", status: "available" },
    ],
  },
  {
    name: "Other",
    emoji: "N",
    desc: "A spot for future ideas.",
    accent: "#7fd0c4",
    deep: "#3aaea1",
    items: [
      { emoji: "+", name: "More coming soon", desc: "Aarush will add more items here later.", status: "soon" },
    ],
  },
];

function slugifyProductName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function shopProducts() {
  const products = [];

  SHOP_CATEGORIES.forEach((category) => {
    category.items.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          products.push({
            ...child,
            slug: slugifyProductName(child.name),
            category: category.name,
            group: item.name,
          });
        });
        return;
      }

      products.push({
        ...item,
        slug: slugifyProductName(item.name),
        category: category.name,
        group: "",
      });
    });
  });

  return products;
}

function shopItemCard(item, nested = false) {
  const soon = item.status === "soon";
  const detailUrl = item.image ? `product.html?item=${slugifyProductName(item.name)}` : "";
  const pill = soon
    ? '<span class="pill pill--soon">Coming soon</span>'
    : '<span class="pill pill--available">Available</span>';
  const thumb = item.image
    ? `<div class="thumb shop-photo-frame"><img class="shop-photo" src="${item.image}" alt="${item.name}" style="--thumb-zoom:${item.thumbZoom || 1.2}" onerror="this.nextElementSibling.hidden=false;this.remove()"><div class="shop-letter" hidden>${item.emoji}</div></div>`
    : `<div class="thumb shop-letter">${item.emoji}</div>`;
  const price = item.price ? `<span class="price">${item.price}</span>` : "";

  return `
    <article class="card shop-item-card ${nested ? "shop-item-card--nested" : ""}">
      ${thumb}
      <div class="body">
        <h3>${item.name}</h3>
        <p class="desc">${item.desc}</p>
        <div class="meta">
          ${price}
          ${pill}
        </div>
      </div>
      ${detailUrl
        ? `<a class="ask" href="${detailUrl}">View details</a>`
        : `<button class="ask" data-item="${item.name}">${soon ? "Notify me" : "Ask about this"}</button>`}
    </article>`;
}

function shopFolderButton(folder, itemCount) {
  return `
    <button class="shop-folder-toggle" type="button" aria-expanded="false">
      <span class="folder-art" aria-hidden="true">
        <span class="folder-back"></span>
        <span class="folder-paper folder-paper--one"></span>
        <span class="folder-paper folder-paper--two"></span>
        <span class="folder-front"></span>
      </span>
      <span class="folder-copy">
        <strong>${folder.name}</strong>
        <small>${folder.desc}</small>
        <em>${itemCount} item${itemCount === 1 ? "" : "s"}</em>
      </span>
    </button>`;
}

function shopFolderGroup(item) {
  return `
    <section class="shop-folder-group is-collapsed">
      ${shopFolderButton(item, item.children.length)}
      <div class="shop-subitems" aria-label="${item.name} choices">
        ${item.children.map(child => shopItemCard(child, true)).join("")}
      </div>
    </section>`;
}

function shopCategory(category) {
  const itemCount = category.items.reduce((count, item) => count + 1 + (item.children ? item.children.length : 0), 0);
  const items = category.items.map((item) => {
    return item.children ? shopFolderGroup(item) : shopItemCard(item);
  }).join("");

  return `
    <section class="shop-category is-collapsed" style="--folder-accent:${category.accent || "#efbd52"}; --folder-deep:${category.deep || "#d9962d"}">
      ${shopFolderButton(category, itemCount)}
      <div class="shop-category__items">
        ${items}
      </div>
    </section>`;
}

function renderProductDetail() {
  const detail = document.getElementById("product-detail");
  if (!detail) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("item") || "";
  const product = shopProducts().find((item) => item.slug === slug);

  if (!product || !product.image) {
    detail.innerHTML = `
      <div class="product-empty">
        <span class="eyebrow">Shop item</span>
        <h1>Item not found</h1>
        <p>That origami item could not be found. Head back to the shop and choose one from a folder.</p>
        <a class="btn" href="shop.html">Back to shop</a>
      </div>`;
    return;
  }

  const path = [product.category, product.group].filter(Boolean).join(" / ");

  detail.innerHTML = `
    <article class="product-detail-card">
      <div class="product-photo-panel">
        <img class="product-photo-large" src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-info-panel">
        <a class="product-back" href="shop.html">Back to shop</a>
        <span class="eyebrow">${path}</span>
        <h1>${product.name}</h1>
        <p class="product-lead">${product.desc}</p>

        <div class="buy-box">
          <h2>Buying Info</h2>
          <p>Price, pickup or delivery details, timing, and customization options will be added here later.</p>
        </div>

        <button class="btn btn--coral add-cart-preview" type="button">Add to cart</button>
        <p class="cart-preview-note">Cart checkout is coming later. For now this button is just here so the page looks ready.</p>

        <ul class="product-facts">
          <li><b>Handmade:</b> each fold may differ slightly from the photo.</li>
          <li><b>Made by:</b> Aarush Dechu.</li>
          <li><b>Safety:</b> a grown-up helps handle payments and deliveries.</li>
        </ul>
      </div>
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
  const authTokenKey = "aarush-auth-token";
  let authState = {
    authenticated: false,
    username: null,
    email: null,
    displayName: null,
    profileInitial: null,
  };

  function setAuthMessage(text, type = "") {
    const message = document.getElementById("login-message");
    if (!message) return;

    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }

  function isValidEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  async function apiJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const authToken = localStorage.getItem(authTokenKey);
    if (authToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers,
    });
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
        link.textContent = authState.profileInitial || "?";
        link.href = "#profile";
        link.title = `Profile for ${authState.displayName || authState.email || authState.username}`;
        link.classList.add("profile-pill");
        return;
      }

      link.classList.remove("profile-pill");
      link.textContent = "Login / Sign up";
      link.href = "login.html";
      link.title = "Log in or sign up";
    });
  }

  async function refreshSession() {
    try {
      authState = await apiJson("/api/session");
    } catch {
      authState = { authenticated: false, username: null, email: null, displayName: null, profileInitial: null };
      localStorage.removeItem(authTokenKey);
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

  async function logout() {
    try {
      await apiJson("/api/logout", { method: "POST" });
    } finally {
      localStorage.removeItem(authTokenKey);
      authState = { authenticated: false, username: null, email: null, displayName: null, profileInitial: null };
      updateAuthLinks();
      window.location.href = "login.html";
    }
  }

  function getProfileMenu() {
    let menu = document.getElementById("profile-menu");
    if (menu) return menu;

    menu = document.createElement("div");
    menu.className = "profile-menu";
    menu.id = "profile-menu";
    menu.hidden = true;
    menu.innerHTML = `
      <div class="profile-menu__panel">
        <div class="profile-menu__top">
          <span class="profile-menu__avatar"></span>
          <div>
            <strong class="profile-menu__name"></strong>
            <span class="profile-menu__email"></span>
          </div>
        </div>
        <div class="profile-menu__item">
          <b>Password</b>
          <span>Hidden and encrypted. Use Forgot password to reset it.</span>
        </div>
        <div class="profile-menu__item">
          <b>Past billing info</b>
          <span>Coming later.</span>
        </div>
        <button class="profile-menu__button" type="button" data-profile-reset>Reset password</button>
        <button class="profile-menu__button profile-menu__button--danger" type="button" data-profile-logout>Log out</button>
      </div>
    `;
    document.body.append(menu);
    menu.querySelector("[data-profile-logout]").addEventListener("click", logout);
    menu.querySelector("[data-profile-reset]").addEventListener("click", () => {
      window.location.href = "login.html?mode=reset";
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-auth-link]") || event.target.closest("#profile-menu")) return;
      menu.hidden = true;
    });
    return menu;
  }

  function showProfileMenu() {
    const menu = getProfileMenu();
    menu.querySelector(".profile-menu__avatar").textContent = authState.profileInitial || "?";
    menu.querySelector(".profile-menu__name").textContent = authState.displayName || "Profile";
    menu.querySelector(".profile-menu__email").textContent = authState.email || authState.username || "";
    menu.hidden = !menu.hidden;
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
      showProfileMenu();
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
        intro: "Create an account to unlock Quadratic.",
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
    const email = form.querySelector('[name="email"]')?.value.trim().toLowerCase();
    const username = email || form.querySelector('[name="username"]')?.value.trim().toLowerCase() || "";
    const password = form.querySelector('[name="password"]').value;
    const confirmPassword = form.querySelector('[name="confirm-password"]')?.value;
    const displayName = form.querySelector('[name="display-name"]')?.value.trim();
    const resetCode = form.querySelector('[name="reset-code"]')?.value;
    const emailCode = form.querySelector('[name="email-code"]')?.value;
    const submitButton = form.querySelector('button[type="submit"]');

    if (!username || !password) {
      setAuthMessage("Enter your email and password.", "error");
      return;
    }

    if (!isValidEmail(username)) {
      setAuthMessage("Enter an email like someone@example.com.", "error");
      return;
    }

    if (displayName !== undefined && displayName.length < 2) {
      setAuthMessage("Enter a username with at least 2 characters.", "error");
      return;
    }

    if (resetCode !== undefined && !resetCode) {
      setAuthMessage("Enter the reset code.", "error");
      return;
    }

    if (emailCode !== undefined && !/^[0-9]{6}$/.test(emailCode)) {
      setAuthMessage("Enter the 6-digit email verification code.", "error");
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      setAuthMessage("Those passwords do not match.", "error");
      return;
    }

    const passwordError = validatePassword(password);
    if (endpoint !== "/api/login" && passwordError) {
      setAuthMessage(passwordError, "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Checking";
    }
    setAuthMessage("Checking...", "");

    try {
      const payload = { username, email: username, password };
      if (displayName !== undefined) payload.displayName = displayName;
      if (resetCode !== undefined) payload.resetCode = resetCode;
      if (emailCode !== undefined) payload.emailCode = emailCode;

      const data = await apiJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (data.authenticated) {
        if (data.sessionToken) localStorage.setItem(authTokenKey, data.sessionToken);
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
    const requestEmailCodeButton = document.getElementById("request-email-code");
    if (requestEmailCodeButton) {
      requestEmailCodeButton.addEventListener("click", async () => {
        const email = signupForm.querySelector('[name="email"]').value.trim().toLowerCase();

        if (!email) {
          setAuthMessage("Enter your email first.", "error");
          return;
        }

        if (!isValidEmail(email)) {
          setAuthMessage("Enter an email like someone@example.com.", "error");
          return;
        }

        requestEmailCodeButton.disabled = true;
        requestEmailCodeButton.textContent = "Sending";
        setAuthMessage("Sending verification code...", "");

        try {
          const data = await apiJson("/api/request-email-verification", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          });
          setAuthMessage(data.message || "Verification code sent. Check your email.", "success");
        } catch (error) {
          setAuthMessage(error.message, "error");
        } finally {
          requestEmailCodeButton.disabled = false;
          requestEmailCodeButton.textContent = "Send 6-digit code";
        }
      });
    }

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitCredentials(signupForm, "/api/signup", "Account created. Redirecting...");
    });
  }

  const resetForm = document.getElementById("reset-form");
  if (resetForm) {
    const requestResetCodeButton = document.getElementById("request-reset-code");
    if (requestResetCodeButton) {
      requestResetCodeButton.addEventListener("click", async () => {
        const username = resetForm.querySelector('[name="email"]').value.trim().toLowerCase();

        if (!username) {
          setAuthMessage("Enter your email first.", "error");
          return;
        }

        if (!isValidEmail(username)) {
          setAuthMessage("Enter an email like someone@example.com.", "error");
          return;
        }

        requestResetCodeButton.disabled = true;
        requestResetCodeButton.textContent = "Generating";
        setAuthMessage("Generating reset code...", "");

        try {
          const data = await apiJson("/api/request-password-reset", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
          });
          setAuthMessage(data.message || "Password reset code sent. Check your email.", "success");
        } catch (error) {
          setAuthMessage(error.message, "error");
        } finally {
          requestResetCodeButton.disabled = false;
          requestResetCodeButton.textContent = "Send 6-digit code";
        }
      });
    }

    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitCredentials(resetForm, "/api/reset-password", "Password reset. Go log in.");
    });
  }

  function loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
  }

  async function handleGoogleCredential(response) {
    if (!response?.credential) {
      setAuthMessage("Google did not return a sign-in credential.", "error");
      return;
    }

    setAuthMessage("Checking Google sign-in...", "");

    try {
      const data = await apiJson("/api/google-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (data.sessionToken) localStorage.setItem(authTokenKey, data.sessionToken);
      authState = data;
      updateAuthLinks();

      const confirmedSession = await refreshSession();
      if (!confirmedSession.authenticated) {
        throw new Error("Google sign-in worked, but the browser did not save the login session. Check COOKIE_SECURE and use the HTTPS Render URL.");
      }

      setAuthMessage("Signed in with Google. Redirecting...", "success");
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 550);
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  }

  async function setupGoogleSignIn() {
    const googleButton = document.getElementById("google-signin");
    const googleHint = document.getElementById("google-signin-hint");
    if (!googleButton) return;

    try {
      const config = await apiJson("/api/auth-config");
      if (!config.googleClientId) {
        if (googleHint) googleHint.textContent = "Google sign-in is not configured yet.";
        return;
      }

      await loadGoogleScript();
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: "popup",
      });
      window.google.accounts.id.renderButton(googleButton, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: Math.min(420, googleButton.parentElement?.clientWidth || 360),
      });
      if (googleHint) googleHint.textContent = "";
    } catch {
      if (googleHint) googleHint.textContent = "Google sign-in could not load.";
    }
  }

  setupGoogleSignIn();

  const authReady = refreshSession();
  authReady.then((session) => {
    if (!session.authenticated && !isQuadraticPage) {
      showAuthPrompt(false);
    }
  });

  // Build the shop grid (only on shop.html)
  const shopGrid = document.getElementById("shop-grid");
  if (shopGrid) {
    shopGrid.innerHTML = SHOP_CATEGORIES.map(shopCategory).join("");

    shopGrid.addEventListener("click", (event) => {
      const header = event.target.closest(".shop-folder-toggle");
      if (!header || event.target.closest(".ask")) return;

      const folder = header.closest(".shop-category, .shop-folder-group");
      const open = !folder.classList.toggle("is-collapsed");
      header.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  renderProductDetail();

  // "Ask about this" button
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".ask");
    if (!btn) return;
    if (btn.tagName === "A") return;
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
