/* ------------------------------------------------------------
   Chaos Français - histoires.js
------------------------------------------------------------ */

(function () {
  const elCharacter = document.getElementById("el-character");
  const elPlace = document.getElementById("el-place");
  const elObject = document.getElementById("el-object");
  const elGrammar = document.getElementById("el-grammar");
  const elBan = document.getElementById("el-ban");
  const newMissionBtn = document.getElementById("new-mission");
  const formatGroup = document.getElementById("format-group");
  const storyText = document.getElementById("story-text");
  const wordCount = document.getElementById("word-count");
  const banStatus = document.getElementById("ban-status");
  const countLine = document.getElementById("count-line");

  let currentBan = "";

  async function fetchOne(category) {
    const items = await apiFetchJson("/content/random/?atelier=histoires&category=" + category + "&count=1");
    return items[0] ? items[0].text : "";
  }

  async function newMission() {
    elCharacter.textContent = "...";
    elPlace.textContent = "...";
    elObject.textContent = "...";
    elGrammar.textContent = "...";
    elBan.textContent = "...";
    try {
      const [character, place, object, grammar, ban] = await Promise.all([
        fetchOne("character"), fetchOne("place"), fetchOne("object"),
        fetchOne("grammar"), fetchOne("ban")
      ]);
      elCharacter.textContent = character;
      elPlace.textContent = place;
      elObject.textContent = object;
      elGrammar.textContent = grammar;
      currentBan = ban;
      elBan.textContent = "\"" + currentBan + "\"";
    } catch (error) {
      elCharacter.textContent = "Impossible de charger la mission.";
    }
    updateCounts();
  }

  function buildFormatChips() {
    formatGroup.innerHTML = "";
    CHAOS_DATA.storyFormats.forEach(function (format, index) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = format.label;
      chip.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      chip.addEventListener("click", function () {
        formatGroup.querySelectorAll(".chip").forEach(function (c) {
          c.setAttribute("aria-pressed", "false");
        });
        chip.setAttribute("aria-pressed", "true");
      });
      formatGroup.appendChild(chip);
    });
  }

  function countWords(text) {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return 0;
    }
    return trimmed.split(/\s+/).length;
  }

  function updateCounts() {
    const text = storyText.value;
    const count = countWords(text);
    wordCount.textContent = count + (count === 1 ? " mot" : " mots");
    countLine.classList.toggle("is-met", count >= 150);

    const banPattern = new RegExp("\\b" + currentBan + "\\b", "i");
    const containsBan = currentBan.length > 0 && banPattern.test(text);
    banStatus.textContent = containsBan ? "le mot interdit apparaît dans le texte" : "";
  }

  storyText.addEventListener("input", updateCounts);
  newMissionBtn.addEventListener("click", newMission);

  buildFormatChips();
  newMission();
})();
