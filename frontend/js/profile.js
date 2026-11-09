(function () {
  if (!getCurrentUser()) { window.location.href = "login.html"; return; }
  const feedback = document.getElementById("profile-feedback");
  const profileForm = document.getElementById("profile-form");
  const passwordForm = document.getElementById("password-form");
  function message(text, failed) { feedback.textContent = text; feedback.className = failed ? "feedback-error" : "feedback-ok"; }
  async function load() {
    try {
      const user = await apiFetchJson("/accounts/me/");
      document.getElementById("username").value = user.username;
      document.getElementById("first-name").value = user.first_name || "";
      document.getElementById("email").value = user.email || "";
    } catch (error) { message("Impossible de charger votre profil : " + error.message, true); }
  }
  profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await apiFetchJson("/accounts/me/", { method: "PATCH", body: JSON.stringify({ first_name: document.getElementById("first-name").value.trim(), email: document.getElementById("email").value.trim() }) });
      message("Profil mis à jour.", false);
    } catch (error) { message("Mise à jour impossible : " + error.message, true); }
  });
  passwordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await apiFetchJson("/accounts/me/password/", { method: "POST", body: JSON.stringify({ current_password: document.getElementById("current-password").value, password: document.getElementById("new-password").value }) });
      passwordForm.reset(); message("Mot de passe changé. Utilisez-le lors de votre prochaine connexion.", false);
    } catch (error) { message("Changement impossible : " + error.message, true); }
  });
  load();
})();
