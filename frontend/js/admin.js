/* ------------------------------------------------------------
   Chaos Français - admin.js
   Interface d'administration : gestion de tous les comptes.
   Toutes les actions passent par l'API, qui vérifie elle-même
   que la personne connectée a le rôle administrateur.
------------------------------------------------------------ */

(function () {
  const ROLE_LABELS = { admin: "Administrateur", teacher: "Enseignant", student: "Élève" };

  const guestNotice = document.getElementById("guest-notice");
  const adminArea = document.getElementById("admin-area");
  const statGrid = document.getElementById("stat-grid");
  const djangoAdminLink = document.getElementById("django-admin-link");

  const newUsername = document.getElementById("new-username");
  const newFirstname = document.getElementById("new-firstname");
  const newRole = document.getElementById("new-role");
  const newPassword = document.getElementById("new-password");
  const createUserBtn = document.getElementById("create-user");
  const createFeedback = document.getElementById("create-feedback");

  const resetPanel = document.getElementById("reset-panel");
  const resetTarget = document.getElementById("reset-target");
  const resetPassword = document.getElementById("reset-password");
  const resetConfirm = document.getElementById("reset-confirm");
  const resetCancel = document.getElementById("reset-cancel");
  const resetFeedback = document.getElementById("reset-feedback");
  const editPanel = document.getElementById("edit-user-panel");
  const editTarget = document.getElementById("edit-user-target");
  const editFirstname = document.getElementById("edit-user-firstname");
  const editEmail = document.getElementById("edit-user-email");
  const editRole = document.getElementById("edit-user-role");
  const editInstitution = document.getElementById("edit-user-institution");
  const editFeedback = document.getElementById("edit-user-feedback");
  const editSave = document.getElementById("edit-user-save");
  const editCancel = document.getElementById("edit-user-cancel");
  const exportButton = document.getElementById("export-users");
  const usersPrevious = document.getElementById("users-previous");
  const usersNext = document.getElementById("users-next");
  const usersPageStatus = document.getElementById("users-page-status");

  const roleFilter = document.getElementById("role-filter");
  const searchInput = document.getElementById("search-input");
  const usersBody = document.getElementById("users-body");
  const usersEmpty = document.getElementById("users-empty");
  const usersFeedback = document.getElementById("users-feedback");

  const classroomsBody = document.getElementById("classrooms-body");
  const classroomsEmpty = document.getElementById("classrooms-empty");

  let currentRole = "";
  let resetUserId = null;
  let currentUser = null;
  let editingUser = null;
  let displayedUsers = [];
  let searchTimer = null;
  let currentPage = 1;
  let totalPages = 1;

  function showFeedback(element, message, ok) {
    element.textContent = message;
    element.className = ok ? "feedback-ok" : "feedback-error";
  }

  function td(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
  }

  function formatDate(iso) {
    if (!iso) {
      return "jamais";
    }
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }

  function actionButton(label, className, handler) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-small " + className;
    btn.textContent = label;
    btn.addEventListener("click", handler);
    return btn;
  }

  /* Statistiques ------------------------------------------------------- */

  async function loadStats() {
    const stats = await apiFetchJson("/accounts/admin/stats/");
    const tiles = [
      [stats.teachers, "enseignants"],
      [stats.students, "comptes élèves"],
      [stats.admins, "administrateurs"],
      [stats.classrooms, "classes"],
      [stats.classroom_students, "élèves en classe"],
      [stats.inactive, "comptes désactivés"],
      [stats.workshops, "ateliers"],
      [stats.enrollments, "inscriptions"],
      [stats.submissions, "productions"]
    ];
    statGrid.innerHTML = "";
    tiles.forEach(function (tile) {
      const box = document.createElement("div");
      box.className = "stat-tile";
      const value = document.createElement("span");
      value.className = "stat-value";
      value.textContent = String(tile[0]);
      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = tile[1];
      box.appendChild(value);
      box.appendChild(label);
      statGrid.appendChild(box);
    });
  }

  /* Comptes ------------------------------------------------------------ */

  async function loadUsers(page) {
    currentPage = page || 1;
    const params = new URLSearchParams();
    if (currentRole) {
      params.set("role", currentRole);
    }
    if (searchInput.value.trim()) {
      params.set("q", searchInput.value.trim());
    }
    params.set("page", String(currentPage));
    params.set("page_size", "25");
    const response = await apiFetchJson("/accounts/admin/users/?" + params.toString());
    const users = response.results;
    totalPages = Math.max(1, Math.ceil(response.count / 25));
    usersPageStatus.textContent = "Page " + currentPage + " / " + totalPages + " · " + response.count + " comptes";
    usersPrevious.disabled = !response.previous;
    usersNext.disabled = !response.next;
    displayedUsers = users;

    usersBody.innerHTML = "";
    usersEmpty.hidden = users.length > 0;

    users.forEach(function (user) {
      const row = document.createElement("tr");
      if (!user.is_active) {
        row.className = "is-inactive";
      }

      row.appendChild(td(user.username));
      row.appendChild(td(user.first_name || "-"));

      const roleCell = document.createElement("td");
      const tag = document.createElement("span");
      tag.className = "role-tag role-" + user.role;
      tag.textContent = ROLE_LABELS[user.role] || user.role;
      roleCell.appendChild(tag);
      row.appendChild(roleCell);

      row.appendChild(td(user.role === "teacher" ? String(user.classroom_count) : "-"));
      row.appendChild(td(formatDate(user.last_login)));
      row.appendChild(td(user.is_active ? "Actif" : "Désactivé"));

      const actions = document.createElement("td");
      const group = document.createElement("div");
      group.className = "row-actions";
      const isSelf = currentUser && user.username === currentUser.username;

      group.appendChild(actionButton("Modifier", "btn-secondary", function () { openEdit(user); }));

      group.appendChild(actionButton("Mot de passe", "btn-secondary", function () {
        openReset(user);
      }));
      if (!isSelf) {
        group.appendChild(actionButton(user.is_active ? "Désactiver" : "Réactiver", "btn-secondary", function () {
          toggleActive(user);
        }));
        group.appendChild(actionButton("Supprimer", "btn-danger", function () {
          removeUser(user);
        }));
      }
      actions.appendChild(group);
      row.appendChild(actions);

      usersBody.appendChild(row);
    });
  }

  function openEdit(user) {
    editingUser = user;
    editTarget.textContent = user.username;
    editFirstname.value = user.first_name || "";
    editEmail.value = user.email || "";
    editRole.value = user.role;
    editInstitution.value = user.institution || "";
    editRole.disabled = user.username === currentUser.username;
    editFeedback.textContent = "";
    editPanel.hidden = false;
    editPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  editCancel.addEventListener("click", function () { editPanel.hidden = true; editingUser = null; });
  editSave.addEventListener("click", async function () {
    if (!editingUser) return;
    try {
      await apiFetchJson("/accounts/admin/users/" + editingUser.id + "/", {
        method: "PATCH", body: JSON.stringify({
          first_name: editFirstname.value.trim(), email: editEmail.value.trim(),
          role: editRole.value, institution: editInstitution.value.trim()
        })
      });
      editPanel.hidden = true; editingUser = null;
      showFeedback(usersFeedback, "Compte mis à jour.", true);
      await Promise.all([loadUsers(1), loadStats()]);
    } catch (error) { showFeedback(editFeedback, error.message, false); }
  });

  exportButton.addEventListener("click", async function () {
    const columns = ["username", "first_name", "email", "role", "institution", "is_active", "date_joined", "last_login"];
    const quote = function (value) {
      let cell = String(value == null ? "" : value);
      if (/^[=+\-@\t\r]/.test(cell)) cell = "'" + cell;
      return '"' + cell.replaceAll('"', '""') + '"';
    };
    try {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      if (currentRole) params.set("role", currentRole);
      if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
      let response = await apiFetchJson("/accounts/admin/users/?" + params.toString());
      const allUsers = response.results.slice();
      let page = 2;
      while (response.next) {
        params.set("page", String(page++));
        response = await apiFetchJson("/accounts/admin/users/?" + params.toString());
        allUsers.push.apply(allUsers, response.results);
      }
      const rows = [columns.join(",")].concat(allUsers.map(function (user) {
        return columns.map(function (column) { return quote(user[column]); }).join(",");
      }));
      const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "comptes-chaos-francais.csv"; link.click();
      URL.revokeObjectURL(url);
    } catch (error) { showFeedback(usersFeedback, "Export impossible : " + error.message, false); }
  });

  async function toggleActive(user) {
    try {
      await apiFetchJson("/accounts/admin/users/" + user.id + "/", {
        method: "PATCH",
        body: JSON.stringify({ is_active: !user.is_active })
      });
      showFeedback(usersFeedback, "Compte " + user.username + (user.is_active ? " désactivé." : " réactivé."), true);
      await Promise.all([loadUsers(1), loadStats()]);
    } catch (error) {
      showFeedback(usersFeedback, error.message, false);
    }
  }

  async function removeUser(user) {
    const warning = user.role === "teacher"
      ? "Supprimer " + user.username + " supprimera aussi ses classes et leurs élèves. Continuer ?"
      : "Supprimer définitivement le compte " + user.username + " ?";
    if (!window.confirm(warning)) {
      return;
    }
    try {
      await apiFetchJson("/accounts/admin/users/" + user.id + "/", { method: "DELETE" });
      showFeedback(usersFeedback, "Compte " + user.username + " supprimé.", true);
      await Promise.all([loadUsers(1), loadStats(), loadClassrooms()]);
    } catch (error) {
      showFeedback(usersFeedback, error.message, false);
    }
  }

  /* Création ----------------------------------------------------------- */

  createUserBtn.addEventListener("click", async function () {
    const username = newUsername.value.trim();
    if (!username || !newPassword.value) {
      showFeedback(createFeedback, "Identifiant et mot de passe sont obligatoires.", false);
      return;
    }
    try {
      await apiFetchJson("/accounts/admin/users/", {
        method: "POST",
        body: JSON.stringify({
          username: username,
          first_name: newFirstname.value.trim(),
          role: newRole.value,
          password: newPassword.value
        })
      });
      showFeedback(createFeedback, "Compte " + username + " créé.", true);
      newUsername.value = "";
      newFirstname.value = "";
      newPassword.value = "";
      await Promise.all([loadUsers(1), loadStats()]);
    } catch (error) {
      showFeedback(createFeedback, "Impossible de créer ce compte (identifiant déjà pris ?).", false);
    }
  });

  /* Réinitialisation du mot de passe ----------------------------------- */

  function openReset(user) {
    resetUserId = user.id;
    resetTarget.textContent = user.username;
    resetPassword.value = "";
    resetFeedback.textContent = "";
    resetPanel.hidden = false;
    resetPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    resetPassword.focus();
  }

  resetCancel.addEventListener("click", function () {
    resetPanel.hidden = true;
    resetUserId = null;
  });

  resetConfirm.addEventListener("click", async function () {
    if (!resetUserId || resetPassword.value.length < 8) {
      showFeedback(resetFeedback, "Le mot de passe doit contenir au moins 8 caractères.", false);
      return;
    }
    try {
      await apiFetchJson("/accounts/admin/users/" + resetUserId + "/reset-password/", {
        method: "POST",
        body: JSON.stringify({ password: resetPassword.value })
      });
      showFeedback(usersFeedback, "Mot de passe de " + resetTarget.textContent + " mis à jour.", true);
      resetPanel.hidden = true;
      resetUserId = null;
    } catch (error) {
      showFeedback(resetFeedback, error.message, false);
    }
  });

  /* Classes ------------------------------------------------------------ */

  async function loadClassrooms() {
    const classrooms = await apiFetchJson("/classrooms/");
    classroomsBody.innerHTML = "";
    classroomsEmpty.hidden = classrooms.length > 0;
    classrooms.forEach(function (classroom) {
      const drawn = classroom.students.filter(function (s) { return s.already_drawn; }).length;
      const row = document.createElement("tr");
      row.appendChild(td(classroom.name));
      row.appendChild(td(classroom.teacher_username));
      row.appendChild(td(String(classroom.students.length)));
      row.appendChild(td(drawn + " / " + classroom.students.length));
      classroomsBody.appendChild(row);
    });
  }

  async function loadActivity() {
    const feed = document.getElementById("activity-feed");
    const empty = document.getElementById("activity-empty");
    const events = await apiFetchJson("/accounts/admin/activity/");
    const chart = document.getElementById("activity-chart");
    chart.replaceChildren();
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(); day.setUTCHours(0, 0, 0, 0); day.setUTCDate(day.getUTCDate() - offset);
      const key = day.toISOString().slice(0, 10);
      days.push({ key: key, label: day.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }), count: 0 });
    }
    events.forEach(function (event) {
      const key = new Date(event.created_at).toISOString().slice(0, 10);
      const day = days.find(function (item) { return item.key === key; });
      if (day) day.count += 1;
    });
    const peak = Math.max(1, ...days.map(function (day) { return day.count; }));
    days.forEach(function (day) {
      const column = document.createElement("div"); column.className = "activity-chart-day";
      const value = document.createElement("span"); value.textContent = String(day.count);
      const bar = document.createElement("div"); bar.className = "activity-chart-bar"; bar.style.height = Math.max(4, day.count / peak * 72) + "px";
      const label = document.createElement("small"); label.textContent = day.label;
      column.append(value, bar, label); chart.appendChild(column);
    });
    feed.replaceChildren();
    empty.hidden = events.length > 0;
    events.forEach(function (event) {
      const row = document.createElement("article");
      row.className = "admin-activity-row";
      const heading = document.createElement("strong");
      heading.textContent = event.actor + " · " + event.action.replaceAll(".", " ");
      const target = document.createElement("span");
      target.textContent = event.target;
      const time = document.createElement("time");
      time.textContent = formatDate(event.created_at);
      row.append(heading, target, time);
      feed.appendChild(row);
    });
  }

  /* Filtres ------------------------------------------------------------ */

  roleFilter.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      roleFilter.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      chip.setAttribute("aria-pressed", "true");
      currentRole = chip.dataset.role;
      loadUsers(1);
    });
  });

  searchInput.addEventListener("input", function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () { loadUsers(1); }, 250);
  });

  usersPrevious.addEventListener("click", function () { if (currentPage > 1) loadUsers(currentPage - 1); });
  usersNext.addEventListener("click", function () { if (currentPage < totalPages) loadUsers(currentPage + 1); });

  /* Démarrage ---------------------------------------------------------- */

  async function init() {
    currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      guestNotice.hidden = false;
      return;
    }
    djangoAdminLink.href = CHAOS_API_BASE.replace(/\/api\/?$/, "") + "/admin/";
    adminArea.hidden = false;
    try {
      await Promise.all([loadStats(), loadUsers(1), loadClassrooms(), loadActivity()]);
    } catch (error) {
      showFeedback(usersFeedback, "Impossible de charger les données : " + error.message, false);
    }
  }

  init();
})();
