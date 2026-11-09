/* ------------------------------------------------------------
   Chaos Français - login.js
------------------------------------------------------------ */

(function () {
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const loginSubmit = document.getElementById("login-submit");
  const loginError = document.getElementById("login-error");

  const registerName = document.getElementById("register-name");
  const registerUsername = document.getElementById("register-username");
  const registerPassword = document.getElementById("register-password");
  const registerSubmit = document.getElementById("register-submit");
  const registerFeedback = document.getElementById("register-feedback");
  const forgotToggle = document.getElementById("forgot-password-toggle");
  const forgotPanel = document.getElementById("forgot-password-panel");
  const forgotUsername = document.getElementById("forgot-username");
  const forgotSubmit = document.getElementById("forgot-password-submit");
  const forgotFeedback = document.getElementById("forgot-password-feedback");

  loginSubmit.addEventListener("click", async function () {
    loginError.textContent = "";
    try {
      const user = await chaosLogin(loginUsername.value.trim(), loginPassword.value);
      if (user.role === "admin") {
        window.location.href = "admin.html";
      } else if (user.role === "teacher") {
        window.location.href = "classe.html";
      } else {
        window.location.href = "ateliers.html";
      }
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  registerSubmit.addEventListener("click", async function () {
    registerFeedback.textContent = "";
    registerFeedback.style.color = "var(--ink-soft)";
    try {
      await apiFetchJson("/accounts/students/register/", {
        method: "POST",
        body: JSON.stringify({
          first_name: registerName.value.trim(),
          username: registerUsername.value.trim(),
          password: registerPassword.value,
          email: document.getElementById("register-email").value.trim() || null
        })
      });
      registerFeedback.style.color = "var(--green-dark)";
      registerFeedback.textContent = "Compte créé. Vous pouvez maintenant vous connecter.";
    } catch (error) {
      registerFeedback.style.color = "var(--red-dark)";
      registerFeedback.textContent = "Impossible de créer ce compte (identifiant déjà pris ?).";
    }
  });

  forgotToggle.addEventListener("click", function () {
    forgotPanel.hidden = !forgotPanel.hidden;
    if (!forgotPanel.hidden) forgotUsername.focus();
  });

  forgotSubmit.addEventListener("click", async function () {
    forgotFeedback.textContent = "";
    try {
      const response = await apiFetchJson("/accounts/password-reset/", {
        method: "POST",
        body: JSON.stringify({ username: forgotUsername.value.trim() })
      });
      forgotFeedback.textContent = response.detail;
    } catch (error) {
      forgotFeedback.textContent = "Le lien n'a pas pu être envoyé. Réessayez plus tard.";
    }
  });
})();
