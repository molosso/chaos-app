(function () {
  const user = getCurrentUser();
  const action = document.getElementById("landing-cta");
  if (!action || !user) return;
  if (user.role === "admin") {
    action.href = "admin.html";
    action.textContent = "Ouvrir le tableau de bord";
  } else if (user.role === "teacher") {
    action.href = "classe.html";
    action.textContent = "Accéder à mon espace professeur";
  } else {
    action.href = "ateliers.html";
    action.textContent = "Lancer le chaos";
  }
})();
