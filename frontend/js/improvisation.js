/* ------------------------------------------------------------
   Chaos Français - improvisation.js
------------------------------------------------------------ */

(function () {
  const imCharacter = document.getElementById("im-character");
  const imSituation = document.getElementById("im-situation");
  const imGoal = document.getElementById("im-goal");
  const newSceneBtn = document.getElementById("new-scene");
  const timerFace = document.getElementById("timer-face");
  const startBtn = document.getElementById("timer-start");
  const resetBtn = document.getElementById("timer-reset");

  const SCENE_SECONDS = 90;

  async function newScene() {
    imCharacter.textContent = "Chargement...";
    imSituation.textContent = "";
    imGoal.textContent = "";
    try {
      const scene = await apiFetchJson("/content/improv/random/");
      imCharacter.textContent = scene.character;
      imSituation.textContent = scene.situation;
      imGoal.textContent = scene.goal;
    } catch (error) {
      imCharacter.textContent = "Impossible de charger une scène.";
    }
  }

  const timer = ChaosTimer(timerFace, function () {
    startBtn.textContent = "Recommencer";
    startBtn.disabled = false;
  });

  startBtn.addEventListener("click", function () {
    startBtn.textContent = "En cours";
    startBtn.disabled = true;
    resetBtn.hidden = false;
    timer.start(SCENE_SECONDS);
  });

  resetBtn.addEventListener("click", function () {
    timer.stop();
    timer.setDisplay(SCENE_SECONDS);
    startBtn.textContent = "Commencer";
    startBtn.disabled = false;
    resetBtn.hidden = true;
  });

  newSceneBtn.addEventListener("click", newScene);

  newScene();
  timer.setDisplay(SCENE_SECONDS);
})();
