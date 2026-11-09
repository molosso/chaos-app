/* ------------------------------------------------------------
   Chaos Français - fakenews.js
------------------------------------------------------------ */

(function () {
  const newsTopic = document.getElementById("news-topic");
  const newTopicBtn = document.getElementById("new-topic");
  const newsBody = document.getElementById("news-body");
  const bodyWordCount = document.getElementById("body-word-count");
  const bodyCountLine = document.getElementById("body-count-line");

  const MIN_WORDS = 80;

  async function newTopic() {
    newsTopic.textContent = "Chargement...";
    try {
      const items = await apiFetchJson("/content/random/?atelier=fake_news&category=topic&count=1");
      newsTopic.textContent = items[0] ? items[0].text : "Aucun sujet disponible.";
    } catch (error) {
      newsTopic.textContent = "Impossible de charger un sujet.";
    }
  }

  function countWords(text) {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return 0;
    }
    return trimmed.split(/\s+/).length;
  }

  function updateCount() {
    const count = countWords(newsBody.value);
    bodyWordCount.textContent = count + (count === 1 ? " mot" : " mots") + " (minimum " + MIN_WORDS + ")";
    bodyCountLine.classList.toggle("is-met", count >= MIN_WORDS);
  }

  newsBody.addEventListener("input", updateCount);
  newTopicBtn.addEventListener("click", newTopic);

  newTopic();
  updateCount();
})();
