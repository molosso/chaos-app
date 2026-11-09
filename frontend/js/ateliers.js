(function () {
  const user = getCurrentUser();
  const title = document.getElementById("workspace-title");
  const intro = document.getElementById("workspace-intro");
  const grid = document.getElementById("workshop-grid");
  const feedback = document.getElementById("workspace-feedback");
  const studentJoin = document.getElementById("student-join");
  const teacherTools = document.getElementById("teacher-tools");
  const adminLink = document.getElementById("admin-link");
  const classLink = document.getElementById("class-link");
  const joinClassForm = document.getElementById("join-class-form");
  const joinedClassList = document.getElementById("joined-class-list");

  const atelierPages = {
    eloquence: "eloquence.html", histoires: "histoires.html", memes: "memes.html",
    fake_news: "fake-news.html", image_histoire: "image-histoire.html", improvisation: "improvisation.html"
  };
  const colors = ["tone-red", "tone-blue", "tone-yellow", "tone-green", "tone-teal"];

  function card(workshop, enrolled, index) {
    const article = document.createElement("article");
    article.className = "module-card " + colors[index % colors.length];
    const heading = document.createElement("h2"); heading.textContent = workshop.title;
    const description = document.createElement("p"); description.textContent = workshop.description || "Un atelier pour pratiquer le français en s'amusant.";
    const meta = document.createElement("p"); meta.className = "tag";
    meta.textContent = workshop.teacher_name ? "Avec " + workshop.teacher_name : "Atelier Chaos Français";
    article.append(heading, description, meta);
    if (user.role === "student") {
      const action = document.createElement("button"); action.type = "button"; action.className = "btn btn-red";
      action.textContent = enrolled ? "Commencer" : "Rejoindre";
      action.addEventListener("click", async function () {
        try {
          if (!enrolled) await apiFetchJson("/content/workshops/" + workshop.id + "/enroll/", { method: "POST" });
          const page = atelierPages[workshop.atelier];
          if (!page) throw new Error("Cette activité n'a pas encore de page de jeu.");
          window.location.href = page + "?workshop=" + encodeURIComponent(workshop.id);
        } catch (error) { feedback.textContent = error.message; }
      });
      article.appendChild(action);
    } else {
      const page = atelierPages[workshop.atelier];
      if (page) { const link = document.createElement("a"); link.className = "btn btn-red"; link.href = page; link.textContent = "Ouvrir l'activité"; article.appendChild(link); }
    }
    const resourceList = document.createElement("ul");
    workshop.resources.forEach(function (resource) {
      const row = document.createElement("li"); const link = document.createElement("a"); link.href = resource.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = resource.title; row.appendChild(link);
      if (resource.description) { const text = document.createElement("span"); text.textContent = " — " + resource.description; row.appendChild(text); }
      resourceList.appendChild(row);
    });
    if (workshop.resources.length) article.appendChild(resourceList);
    return article;
  }

  async function init() {
    if (!user) { window.location.href = "login.html"; return; }
    if (user.role === "admin") { title.textContent = "Pilotage de la plateforme"; intro.textContent = "Gérez les utilisateurs et le catalogue pédagogique."; classLink.hidden = true; adminLink.href = "admin.html"; }
    else if (user.role === "teacher") { title.textContent = "Votre espace professeur"; intro.textContent = "Retrouvez vos ateliers, vos ressources et vos classes."; studentJoin.hidden = true; teacherTools.hidden = false; }
    else { title.textContent = "Prêt à jouer, " + user.username + " ?"; intro.textContent = "Rejoignez les activités ouvertes par vos professeurs et lancez-vous."; studentJoin.hidden = false; classLink.hidden = true; adminLink.hidden = true; }
    try {
      const [workshops, enrollments, resources, classrooms] = await Promise.all([
        apiFetchJson("/content/workshops/"), apiFetchJson("/content/enrollments/"), apiFetchJson("/content/resources/"),
        apiFetchJson("/classrooms/")
      ]);
      joinedClassList.replaceChildren();
      classrooms.forEach(function (classroom) {
        const item = document.createElement("span");
        item.className = "badge";
        item.textContent = classroom.name + " · " + classroom.teacher_username;
        joinedClassList.appendChild(item);
      });
      const enrolledIds = new Set(enrollments.map(function (item) { return item.workshop; }));
      const visible = workshops.filter(function (item) { return user.role !== "student" || !enrolledIds.has(item.id) || item.is_active; });
      grid.replaceChildren();
      visible.forEach(function (workshop, i) {
        workshop.resources = resources.filter(function (item) { return item.workshop === workshop.id; });
        grid.appendChild(card(workshop, enrolledIds.has(workshop.id), i));
      });
      if (user.role === "teacher") {
        const select = document.getElementById("resource-workshop");
        workshops.forEach(function (item) { const option = document.createElement("option"); option.value = item.id; option.textContent = item.title; select.appendChild(option); });
        if (!workshops.length) { teacherTools.hidden = true; feedback.textContent = "Aucun atelier ne vous est attribué pour le moment. Contactez votre administrateur."; }
      }
      if (!visible.length) feedback.textContent = user.role === "student" ? "Aucun atelier n'est ouvert pour le moment. Demandez à votre professeur de vous inviter." : "Aucun atelier à afficher pour le moment.";
    } catch (error) { feedback.textContent = "Chargement impossible : " + error.message; }
  }

  joinClassForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const input = document.getElementById("join-class-code");
    try {
      const classroom = await apiFetchJson("/classrooms/join/", {
        method: "POST", body: JSON.stringify({ code: input.value.trim().toUpperCase() })
      });
      input.value = "";
      feedback.textContent = "Vous avez rejoint « " + classroom.name + " ». Les ateliers de la classe sont maintenant disponibles.";
      await init();
    } catch (error) { feedback.textContent = error.message; }
  });

  document.getElementById("resource-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiFetchJson("/content/resources/", { method: "POST", body: JSON.stringify({
        workshop: Number(document.getElementById("resource-workshop").value), title: document.getElementById("resource-title").value.trim(),
        url: document.getElementById("resource-url").value.trim(), description: document.getElementById("resource-description").value.trim(), is_published: true
      }) });
      feedback.textContent = "Ressource publiée."; form.reset(); await init();
    } catch (error) { feedback.textContent = "Publication impossible : " + error.message; }
  });
  init();
})();
