(function () {
  const user = getCurrentUser();
  const form = document.getElementById("production-form");
  const classroomSelect = document.getElementById("production-classroom");
  const workshopSelect = document.getElementById("production-workshop");
  const feed = document.getElementById("production-history");
  const empty = document.getElementById("production-empty");
  const feedback = document.getElementById("production-feedback");
  let classrooms = [];
  let workshops = [];
  let enrollments = [];

  if (!user || user.role !== "student") { window.location.href = "login.html"; return; }

  function showHistory(items) {
    feed.replaceChildren();
    empty.hidden = items.length > 0;
    items.forEach(function (submission) {
      const card = document.createElement("article"); card.className = "admin-activity-row";
      const heading = document.createElement("strong"); heading.textContent = submission.atelier_label || submission.atelier;
      const body = document.createElement("span"); body.textContent = submission.text;
      const time = document.createElement("time"); time.textContent = new Date(submission.created_at).toLocaleString("fr-FR");
      card.append(heading, body, time); feed.appendChild(card);
    });
  }

  function updateWorkshops() {
    const classroom = classrooms.find(function (item) { return String(item.id) === classroomSelect.value; });
    const assigned = new Set(classroom ? classroom.allowed_workshops : []);
    const enrolled = new Set(enrollments.map(function (item) { return item.workshop; }));
    workshopSelect.replaceChildren();
    workshops.filter(function (item) { return assigned.has(item.id) && enrolled.has(item.id); }).forEach(function (item) {
      const option = document.createElement("option"); option.value = item.atelier; option.textContent = item.title; workshopSelect.appendChild(option);
    });
    if (!workshopSelect.options.length) feedback.textContent = "Cette classe n'a pas encore d'atelier auquel vous êtes inscrit.";
    else feedback.textContent = "";
  }

  async function loadHistory() {
    if (!classroomSelect.value) { showHistory([]); return; }
    const items = await apiFetchJson("/submissions/?classroom=" + encodeURIComponent(classroomSelect.value));
    showHistory(items);
  }

  async function init() {
    try {
      const results = await Promise.all([
        apiFetchJson("/classrooms/"), apiFetchJson("/content/workshops/"), apiFetchJson("/content/enrollments/")
      ]);
      classrooms = results[0]; workshops = results[1]; enrollments = results[2];
      classroomSelect.replaceChildren();
      classrooms.forEach(function (item) { const opt = document.createElement("option"); opt.value = item.id; opt.textContent = item.name; classroomSelect.appendChild(opt); });
      if (!classrooms.length) {
        form.hidden = true; feedback.textContent = "Rejoignez d'abord votre classe depuis Mes activités avec le code donné par votre professeur."; showHistory([]); return;
      }
      updateWorkshops(); await loadHistory();
    } catch (error) { feedback.textContent = "Chargement impossible : " + error.message; }
  }

  classroomSelect.addEventListener("change", function () { updateWorkshops(); loadHistory().catch(function (e) { feedback.textContent = e.message; }); });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await apiFetchJson("/submissions/", { method: "POST", body: JSON.stringify({
        classroom: Number(classroomSelect.value), atelier: workshopSelect.value,
        text: document.getElementById("production-text").value.trim()
      }) });
      document.getElementById("production-text").value = "";
      feedback.textContent = "Production publiée. Bravo !"; await loadHistory();
    } catch (error) { feedback.textContent = "Publication impossible : " + error.message; }
  });
  init();
})();
