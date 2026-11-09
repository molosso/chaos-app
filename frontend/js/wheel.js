/* ------------------------------------------------------------
   Chaos Français - wheel.js
   Spinning wheel on the home page. The spin animation and the
   generated result are independent: the wheel gives the visual
   sense of chance, the result is drawn fresh from CHAOS_DATA.
------------------------------------------------------------ */

(function () {
  const disc = document.getElementById("wheel-disc");
  const spinButton = document.getElementById("wheel-spin");
  const resultBox = document.getElementById("wheel-result");

  if (!disc || !spinButton) {
    return;
  }

  const colors = ["#d43d24", "#23459c", "#e6ab1f", "#2c7a4b", "#16181f", "#faf9f4"];
  const segmentCount = colors.length;
  const center = 100;
  const radius = 98;

  function polarPoint(angleDeg, r) {
    const rad = (Math.PI / 180) * angleDeg;
    return [center + r * Math.cos(rad), center + r * Math.sin(rad)];
  }

  function buildWheel() {
    const anglePer = 360 / segmentCount;
    let markup = "";
    for (let i = 0; i < segmentCount; i++) {
      const start = i * anglePer;
      const end = start + anglePer;
      const [x1, y1] = polarPoint(start, radius);
      const [x2, y2] = polarPoint(end, radius);
      markup += `<path d="M${center},${center} L${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 0,1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${colors[i]}" stroke="#16181f" stroke-width="1.5"></path>`;
    }
    disc.innerHTML = markup;
  }

  let currentRotation = 0;
  let spinning = false;

  function spin() {
    if (spinning) {
      return;
    }
    spinning = true;
    spinButton.disabled = true;
    resultBox.hidden = true;

    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const finalOffset = Math.random() * 360;
    currentRotation += extraTurns * 360 + finalOffset;
    disc.style.transform = `rotate(${currentRotation}deg)`;

    window.setTimeout(function () {
      spinning = false;
      spinButton.disabled = false;
      showResult();
    }, 4300);
  }

  function showResult() {
    document.getElementById("wheel-sujet").textContent = pickRandom(CHAOS_DATA.wheelSujets);
    document.getElementById("wheel-style").textContent = pickRandom(CHAOS_DATA.wheelStyles);
    document.getElementById("wheel-format").textContent = pickRandom(CHAOS_DATA.wheelFormats);
    document.getElementById("wheel-contrainte").textContent = pickRandom(CHAOS_DATA.wheelContraintes);
    resultBox.hidden = false;
  }

  buildWheel();
  spinButton.addEventListener("click", spin);
})();
