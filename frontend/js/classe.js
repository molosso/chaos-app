/* ------------------------------------------------------------
   Chaos Français - classe.js
   Gestion des classes et tirage au sort, via l'API backend.
   Réservé aux comptes enseignant et administrateur.
------------------------------------------------------------ */

(function () {
  const guestNotice = document.getElementById("guest-notice");
  const teacherArea = document.getElementById("teacher-area");

  const classroomList = document.getElementById("classroom-list");
  const newClassroomName = document.getElementById("new-classroom-name");
  const createClassroomBtn = document.getElementById("create-classroom");

  const addStudentsPanel = document.getElementById("add-students-panel");
  const activeClassroomName = document.getElementById("active-classroom-name");
  const namesInput = document.getElementById("names-input");
  const addStudentsBtn = document.getElementById("add-students");

  const drawPanel = document.getElementById("draw-panel");
  const drawClassroomName = document.getElementById("draw-classroom-name");
  const drawFace = document.getElementById("draw-face");
  const drawNameBtn = document.getElementById("draw-name");
  const resetRoundBtn = document.getElementById("reset-round");
  const joinCodePanel = document.getElementById("class-join-code");
  const joinCodeValue = document.getElementById("join-code-value");
  const copyJoinCodeBtn = document.getElementById("copy-join-code");
  const workshopList = document.getElementById("class-workshop-list");
  const saveWorkshopsBtn = document.getElementById("save-class-workshops");
  const workshopFeedback = document.getElementById("class-workshop-feedback");
  const submissionsFeed = document.getElementById("class-submissions-feed");
  const submissionsEmpty = document.getElementById("class-submissions-empty");
  const exportSubmissionsBtn = document.getElementById("export-class-submissions");

  const rosterPanel = document.getElementById("roster-panel");
  const remainingCount = document.getElementById("remaining-count");
  const remainingList = document.getElementById("remaining-list");

  const historyPanel = document.getElementById("history-panel");
  const historyList = document.getElementById("history-list");

  let classrooms = [];
  let activeClassroom = null;
  let availableWorkshops = [];
  let currentSubmissions = [];

  function renderBadgeList(container, names, earned) {
    container.innerHTML = "";
    names.forEach(function (name) {
      const span = document.createElement("span");
      span.className = "badge" + (earned ? " is-earned" : "");
      span.textContent = name;
      container.appendChild(span);
    });
  }

  function renderClassroomList() {
    classroomList.innerHTML = "";
    classrooms.forEach(function (classroom) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = classroom.name;
      btn.setAttribute("aria-pressed", activeClassroom && activeClassroom.id === classroom.id ? "true" : "false");
      btn.addEventListener("click", function () {
        selectClassroom(classroom.id);
      });
      classroomList.appendChild(btn);
    });
  }

  function renderActiveClassroom() {
    if (!activeClassroom) {
      addStudentsPanel.hidden = true;
      drawPanel.hidden = true;
      rosterPanel.hidden = true;
      historyPanel.hidden = true;
      return;
    }
    addStudentsPanel.hidden = false;
    drawPanel.hidden = false;
    rosterPanel.hidden = false;
    activeClassroomName.textContent = activeClassroom.name;
    drawClassroomName.textContent = activeClassroom.name;
    joinCodeValue.textContent = activeClassroom.join_code || "Indisponible";
    joinCodePanel.hidden = !activeClassroom.join_code;
    renderWorkshopOptions();

    const remaining = activeClassroom.students.filter(function (s) { return !s.already_drawn; });
    const drawn = activeClassroom.students.filter(function (s) { return s.already_drawn; });

    remainingCount.textContent = String(remaining.length);
    renderBadgeList(remainingList, remaining.map(function (s) { return s.name; }), false);
    renderBadgeList(historyList, drawn.map(function (s) { return s.name; }), true);
    historyPanel.hidden = drawn.length === 0;
    drawNameBtn.disabled = remaining.length === 0;
  }

  function renderWorkshopOptions() {
    workshopList.replaceChildren();
    const selected = new Set(activeClassroom.allowed_workshops || []);
    availableWorkshops.forEach(function (workshop) {
      const label = document.createElement("label");
      label.className = "badge";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(workshop.id);
      input.checked = selected.has(workshop.id);
      input.setAttribute("aria-label", workshop.title);
      label.append(input, document.createTextNode(" " + workshop.title));
      workshopList.appendChild(label);
    });
    saveWorkshopsBtn.disabled = availableWorkshops.length === 0;
  }

  async function loadClassrooms() {
    classrooms = await apiFetchJson("/classrooms/");
    renderClassroomList();
  }

  async function loadWorkshops() {
    availableWorkshops = await apiFetchJson("/content/workshops/");
  }

  async function selectClassroom(id) {
    activeClassroom = await apiFetchJson("/classrooms/" + id + "/");
    renderClassroomList();
    renderActiveClassroom();
    drawFace.textContent = "Prêt";
    await loadClassSubmissions();
  }

  async function loadClassSubmissions() {
    if (!submissionsFeed || !activeClassroom) return;
    const items = await apiFetchJson("/submissions/?classroom=" + encodeURIComponent(activeClassroom.id));
    currentSubmissions = items;
    exportSubmissionsBtn.disabled = items.length === 0;
    submissionsFeed.replaceChildren();
    submissionsEmpty.hidden = items.length > 0;
    items.forEach(function (submission) {
      const row = document.createElement("article"); row.className = "admin-activity-row";
      const heading = document.createElement("strong"); heading.textContent = submission.student_name + " · " + submission.atelier;
      const text = document.createElement("span"); text.textContent = submission.text;
      const time = document.createElement("time"); time.textContent = new Date(submission.created_at).toLocaleString("fr-FR");
      row.append(heading, text, time); submissionsFeed.appendChild(row);
    });
  }

  exportSubmissionsBtn.addEventListener("click", function () {
    const escapeCell = function (value) {
      let text = String(value == null ? "" : value);
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [["Élève", "Atelier", "Production", "Date"].map(escapeCell).join(",")]
      .concat(currentSubmissions.map(function (item) {
        return [item.student_name, item.atelier, item.text, item.created_at].map(escapeCell).join(",");
      }));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "productions-classe.csv"; link.click(); URL.revokeObjectURL(url);
  });

  createClassroomBtn.addEventListener("click", async function () {
    const name = newClassroomName.value.trim();
    if (!name) {
      return;
    }
    const classroom = await apiFetchJson("/classrooms/", {
      method: "POST",
      body: JSON.stringify({ name: name })
    });
    newClassroomName.value = "";
    await loadClassrooms();
    await selectClassroom(classroom.id);
  });

  addStudentsBtn.addEventListener("click", async function () {
    if (!activeClassroom) {
      return;
    }
    const names = namesInput.value.split("\n").map(function (n) { return n.trim(); }).filter(Boolean);
    if (names.length === 0) {
      return;
    }
    await apiFetchJson("/classrooms/" + activeClassroom.id + "/students/", {
      method: "POST",
      body: JSON.stringify({ names: names })
    });
    namesInput.value = "";
    await selectClassroom(activeClassroom.id);
  });

  drawNameBtn.addEventListener("click", async function () {
    if (!activeClassroom) {
      return;
    }
    drawNameBtn.disabled = true;

    const remainingNames = activeClassroom.students
      .filter(function (s) { return !s.already_drawn; })
      .map(function (s) { return s.name; });

    let step = 0;
    const interval = window.setInterval(function () {
      if (remainingNames.length > 0) {
        drawFace.textContent = remainingNames[Math.floor(Math.random() * remainingNames.length)];
      }
      step += 1;
      if (step >= 12) {
        window.clearInterval(interval);
        finishDraw();
      }
    }, 80);
  });

  async function finishDraw() {
    try {
      const student = await apiFetchJson("/classrooms/" + activeClassroom.id + "/draw/", { method: "POST" });
      drawFace.textContent = student.name;
    } catch (error) {
      drawFace.textContent = "Tout le monde est passé";
    }
    await selectClassroom(activeClassroom.id);
  }

  resetRoundBtn.addEventListener("click", async function () {
    if (!activeClassroom) {
      return;
    }
    await apiFetchJson("/classrooms/" + activeClassroom.id + "/reset-round/", { method: "POST" });
    drawFace.textContent = "Prêt";
    await selectClassroom(activeClassroom.id);
  });

  saveWorkshopsBtn.addEventListener("click", async function () {
    if (!activeClassroom) return;
    workshopFeedback.textContent = "";
    const ids = Array.from(workshopList.querySelectorAll('input[type="checkbox"]:checked'))
      .map(function (input) { return Number(input.value); });
    try {
      activeClassroom = await apiFetchJson("/classrooms/" + activeClassroom.id + "/", {
        method: "PATCH", body: JSON.stringify({ allowed_workshops: ids })
      });
      workshopFeedback.textContent = "Les ateliers de la classe ont été enregistrés.";
      renderActiveClassroom();
    } catch (error) { workshopFeedback.textContent = error.message; }
  });

  copyJoinCodeBtn.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(joinCodeValue.textContent);
      copyJoinCodeBtn.textContent = "Copié";
    } catch (error) {
      workshopFeedback.textContent = "Copiez le code manuellement : " + joinCodeValue.textContent;
    }
  });

  async function init() {
    const user = getCurrentUser();
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      guestNotice.hidden = false;
      return;
    }
    teacherArea.hidden = false;
    if (user.role === "admin") {
      document.getElementById("new-classroom-name").closest(".field").hidden = true;
      createClassroomBtn.hidden = true;
    }
    await Promise.all([loadClassrooms(), loadWorkshops()]);
    if (classrooms.length > 0) {
      await selectClassroom(classrooms[0].id);
    }
  }

  init();
})();
