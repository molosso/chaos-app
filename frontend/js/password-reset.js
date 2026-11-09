(function () {
  const params = new URLSearchParams(window.location.search);
  const message = document.getElementById("reset-message");
  const button = document.getElementById("save-password");
  button.addEventListener("click", async function () {
    message.textContent = "";
    const password = document.getElementById("new-password").value;
    if (!params.has("uid") || !params.has("token")) {
      message.textContent = "Le lien de réinitialisation est incomplet.";
      return;
    }
    try {
      const result = await apiFetchJson("/accounts/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uid: params.get("uid"), token: params.get("token"), password: password })
      });
      message.textContent = result.detail + " ";
      const login = document.createElement("a");
      login.href = "login.html";
      login.textContent = "Se connecter";
      message.appendChild(login);
      button.disabled = true;
    } catch (error) {
      message.textContent = error.message || "Le lien est invalide ou expiré.";
    }
  });
})();
