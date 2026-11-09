/* ------------------------------------------------------------
   Chaos Français - timer.js
   Small countdown helper used by activity pages. Each page
   creates its own ChaosTimer instance and wires it to its own
   buttons, so timing logic never touches page-specific data.
------------------------------------------------------------ */

function ChaosTimer(faceEl, onComplete) {
  let remaining = 0;
  let intervalId = null;

  function render() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    faceEl.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    faceEl.classList.toggle("is-low", remaining <= 10 && remaining > 0);
  }

  function tick() {
    remaining -= 1;
    render();
    if (remaining <= 0) {
      stop();
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  }

  function start(seconds) {
    stop();
    remaining = seconds;
    render();
    intervalId = window.setInterval(tick, 1000);
  }

  function stop() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function setDisplay(seconds) {
    remaining = seconds;
    render();
  }

  return { start: start, stop: stop, setDisplay: setDisplay };
}
