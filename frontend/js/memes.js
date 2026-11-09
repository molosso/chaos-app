/* ------------------------------------------------------------
   Chaos Français - memes.js
   Draws the user's own uploaded image with a caption onto a
   canvas. No stock or generated imagery is used anywhere.
------------------------------------------------------------ */

(function () {
  const situationText = document.getElementById("meme-situation");
  const newSituationBtn = document.getElementById("new-situation");
  const imageInput = document.getElementById("image-input");
  const captionInput = document.getElementById("meme-caption");
  const canvas = document.getElementById("meme-canvas");
  const downloadBtn = document.getElementById("download-meme");
  const ctx = canvas.getContext("2d");

  let loadedImage = null;

  async function newSituation() {
    situationText.textContent = "Chargement...";
    try {
      const items = await apiFetchJson("/content/random/?atelier=memes&category=situation&count=1");
      situationText.textContent = items[0] ? items[0].text : "Aucune situation disponible.";
    } catch (error) {
      situationText.textContent = "Impossible de charger une situation.";
    }
  }

  function drawPlaceholder() {
    ctx.fillStyle = "#f1efe7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#16181f";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
    ctx.fillStyle = "#8b8e96";
    ctx.font = "20px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Importez une image pour commencer", canvas.width / 2, canvas.height / 2);
  }

  function wrapText(text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";

    words.forEach(function (word) {
      const test = current.length === 0 ? word : current + " " + word;
      if (ctx.measureText(test).width > maxWidth && current.length > 0) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current.length > 0) {
      lines.push(current);
    }
    return lines;
  }

  function render() {
    if (!loadedImage) {
      drawPlaceholder();
      downloadBtn.disabled = true;
      return;
    }

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    const scale = Math.max(size / loadedImage.width, size / loadedImage.height);
    const drawWidth = loadedImage.width * scale;
    const drawHeight = loadedImage.height * scale;
    const offsetX = (size - drawWidth) / 2;
    const offsetY = (size - drawHeight) / 2;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(loadedImage, offsetX, offsetY, drawWidth, drawHeight);

    const caption = captionInput.value.trim();
    if (caption.length > 0) {
      ctx.font = "700 34px Space Grotesk, sans-serif";
      ctx.textAlign = "center";
      const lines = wrapText(caption.toUpperCase(), size - 60);
      const lineHeight = 42;
      const blockHeight = lines.length * lineHeight + 30;
      const startY = size - blockHeight + lineHeight;

      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, size - blockHeight - 10, size, blockHeight + 20);

      ctx.fillStyle = "#ffffff";
      lines.forEach(function (line, index) {
        ctx.fillText(line, size / 2, startY + index * lineHeight);
      });
    }

    downloadBtn.disabled = false;
  }

  imageInput.addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function (readerEvent) {
      const img = new Image();
      img.onload = function () {
        loadedImage = img;
        render();
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });

  captionInput.addEventListener("input", render);
  newSituationBtn.addEventListener("click", newSituation);

  downloadBtn.addEventListener("click", function () {
    const link = document.createElement("a");
    link.download = "meme-chaos-francais.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  newSituation();
  drawPlaceholder();
})();
