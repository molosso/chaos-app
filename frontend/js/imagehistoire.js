/* ------------------------------------------------------------
   Chaos Français - imagehistoire.js
------------------------------------------------------------ */

(function () {
  const imageInput = document.getElementById("image-input");
  const randomImageBtn = document.getElementById("random-image");
  const imagePreview = document.getElementById("image-preview");
  const storyPrompt = document.getElementById("story-prompt");
  const newPromptBtn = document.getElementById("new-prompt");
  const storyText = document.getElementById("image-story-text");
  const sentenceCount = document.getElementById("sentence-count");
  const sentenceCountLine = document.getElementById("sentence-count-line");

  const MIN_SENTENCES = 10;

  async function newPrompt() {
    storyPrompt.textContent = "Chargement...";
    try {
      const items = await apiFetchJson("/content/random/?atelier=image_histoire&category=prompt&count=1");
      storyPrompt.textContent = items[0] ? items[0].text : "Aucune consigne disponible.";
    } catch (error) {
      storyPrompt.textContent = "Impossible de charger une consigne.";
    }
  }

  function countSentences(text) {
    const matches = text.match(/[^.!?]+[.!?]+/g);
    return matches ? matches.length : (text.trim().length > 0 ? 1 : 0);
  }

  function updateCount() {
    const count = countSentences(storyText.value);
    sentenceCount.textContent = count + (count === 1 ? " phrase" : " phrases");
    sentenceCountLine.classList.toggle("is-met", count >= MIN_SENTENCES);
  }

  imageInput.addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function (readerEvent) {
      imagePreview.src = readerEvent.target.result;
      imagePreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  randomImageBtn.addEventListener("click", function () {
    const seed = Date.now();
    imagePreview.src = "https://picsum.photos/seed/" + seed + "/700/500";
    imagePreview.hidden = false;
  });

  storyText.addEventListener("input", updateCount);
  newPromptBtn.addEventListener("click", newPrompt);

  newPrompt();
  updateCount();
})();
