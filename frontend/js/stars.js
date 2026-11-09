/* ------------------------------------------------------------
   Chaos Français - stars.js
   Builds interactive 1-to-5 star ratings inside any
   ".stars" container found on the page.
------------------------------------------------------------ */

const STAR_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8-5.2-4.7 6.9-.7L12 2.5z"/></svg>';

function initStarRatings(root) {
  const scope = root || document;
  scope.querySelectorAll(".stars").forEach(function (container) {
    if (container.dataset.built === "true") {
      return;
    }
    container.dataset.built = "true";
    container.dataset.value = "0";

    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star-btn";
      btn.dataset.value = String(i);
      btn.innerHTML = STAR_ICON;
      btn.setAttribute("aria-label", i + " sur 5");
      btn.addEventListener("click", function () {
        setStarValue(container, i);
      });
      container.appendChild(btn);
    }
  });
}

function setStarValue(container, value) {
  container.dataset.value = String(value);
  container.querySelectorAll(".star-btn").forEach(function (btn) {
    const isFilled = Number(btn.dataset.value) <= value;
    btn.classList.toggle("is-filled", isFilled);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initStarRatings(document);
});
