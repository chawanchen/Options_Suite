const body = document.body;
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarClose = document.querySelector("#sidebarClose");
const sidebarOverlay = document.querySelector("#sidebarOverlay");

function openSidebar() {
  body.classList.add("sidebar-open");
  sidebarToggle?.setAttribute("aria-expanded", "true");
  sidebarClose?.focus();
}

function closeSidebar() {
  body.classList.remove("sidebar-open");
  sidebarToggle?.setAttribute("aria-expanded", "false");
}

sidebarToggle?.setAttribute("aria-controls", "toolSidebar");
sidebarToggle?.setAttribute("aria-expanded", "false");

sidebarToggle?.addEventListener("click", openSidebar);
sidebarClose?.addEventListener("click", closeSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
});

document.querySelectorAll(".tool-sidebar a").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 760) closeSidebar();
  });
});

document.querySelector(".sidebar-link.active")?.setAttribute("aria-current", "page");

window.OptionsSuiteUI = {
  showMessage(target, title, text) {
    if (!target) return;
    target.className = "demo-result";
    target.innerHTML = `
      <h3>${title}</h3>
      <p>${text}</p>
    `;
  },

  showSubmittedValues(target, title, form) {
    if (!target || !form) return;
    const values = [...form.elements]
      .filter((field) => field.name && field.type !== "submit" && field.type !== "reset" && field.type !== "button")
      .map((field) => {
        const label = form.querySelector(`label[for="${field.id}"]`)?.childNodes[0]?.textContent?.trim() || field.dataset.label || field.name;
        const value = field.tagName === "SELECT" ? field.options[field.selectedIndex].text : field.value;
        return `<div class="result-item"><span>${label}</span><span>${value || "—"}</span></div>`;
      })
      .join("");

    target.className = "result-content";
    target.innerHTML = `
      <div class="result-note">${title}的輸入資料如下。</div>
      <div class="result-list">${values}</div>
    `;
  }
};

function removeDecorativeIcons(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => { node.nodeValue = node.nodeValue.replace(/[🌳🎲📊📈〽️✓]/gu, ""); });
}
removeDecorativeIcons();
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => removeDecorativeIcons(node)))).observe(document.body, { childList: true, subtree: true });
