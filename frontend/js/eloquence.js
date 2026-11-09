/* ------------------------------------------------------------
   Chaos Français - eloquence.js
------------------------------------------------------------ */

(function () {
  const topicText = document.getElementById("topic-text");
  const topicWords = document.getElementById("topic-words");
  const newTopicBtn = document.getElementById("new-topic");
  const levelGroup = document.getElementById("level-group");
  const timerFace = document.getElementById("timer-face");
  const timerLabel = document.getElementById("timer-label");
  const startBtn = document.getElementById("timer-start");
  const resetBtn = document.getElementById("timer-reset");

  const SPEAKING_SECONDS = 90;
  let prepSeconds = 60;
  let phase = "idle"; // idle | prep | speaking | done

  async function newTopic() {
    topicText.textContent = "Chargement...";
    topicWords.textContent = "";
    try {
      const [topics, words] = await Promise.all([
        apiFetchJson("/content/random/?atelier=eloquence&category=topic&count=1"),
        apiFetchJson("/content/random/?atelier=eloquence&category=word&count=3")
      ]);
      topicText.textContent = topics[0] ? topics[0].text : "Aucun sujet disponible.";
      topicWords.textContent = words.map(function (w) { return w.text; }).join(", ");
    } catch (error) {
      topicText.textContent = "Impossible de charger un sujet. Vérifiez votre connexion.";
    }
  }

  function selectLevel(button) {
    levelGroup.querySelectorAll(".chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip === button ? "true" : "false");
    });
    prepSeconds = Number(button.dataset.seconds);
    if (phase === "idle") {
      timer.setDisplay(prepSeconds);
    }
  }

  const timer = ChaosTimer(timerFace, function () {
    if (phase === "prep") {
      phase = "speaking";
      timerLabel.textContent = "Passage à l'oral";
      timer.start(SPEAKING_SECONDS);
    } else if (phase === "speaking") {
      phase = "done";
      timerLabel.textContent = "Terminé, passez à l'auto-évaluation";
      startBtn.textContent = "Recommencer";
      startBtn.disabled = false;
    }
  });

  startBtn.addEventListener("click", function () {
    if (phase === "idle" || phase === "done") {
      phase = "prep";
      timerLabel.textContent = "Préparation";
      startBtn.textContent = "En cours";
      startBtn.disabled = true;
      resetBtn.hidden = false;
      timer.start(prepSeconds);
    }
  });

  resetBtn.addEventListener("click", function () {
    timer.stop();
    phase = "idle";
    timer.setDisplay(prepSeconds);
    timerLabel.textContent = "Préparation";
    startBtn.textContent = "Commencer";
    startBtn.disabled = false;
    resetBtn.hidden = true;
  });

  levelGroup.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      selectLevel(chip);
    });
  });

  newTopicBtn.addEventListener("click", newTopic);

  newTopic();
  timer.setDisplay(prepSeconds);
})();
