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

  async function askQuadratic(question) {
    addMathMessage("user", question);
    const thinking = addMathMessage("bot", "Thinking...");

    const answer = window.AarushMathBrain
      ? await window.AarushMathBrain.answer(question)
      : "Quadratic did not load yet. Refresh the page and try again.";

    if (thinking) {
      thinking.querySelector("p").textContent = answer;
      mathChat.scrollTop = mathChat.scrollHeight;
    }
  }

  if (mathForm && mathQuestion) {
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
  }

  document.querySelectorAll("[data-question]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const question = chip.dataset.question;
      if (mathQuestion) mathQuestion.value = question;
      askQuadratic(question);
    });
  });
});
