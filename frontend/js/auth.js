/* ------------------------------------------------------------
   Chaos Français - auth.js
   Connexion, déconnexion, et protection des pages réservées
   aux enseignants ou à l'administrateur.
------------------------------------------------------------ */

async function chaosLogin(username, password) {
  const response = await fetch(CHAOS_API_BASE + "/accounts/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password })
  });
  if (!response.ok) {
    throw new Error("Identifiant ou mot de passe incorrect.");
  }
  const data = await response.json();
  ChaosAuthStorage.set({ access: data.access, refresh: data.refresh });
  return getCurrentUser();
}

async function chaosLogout() {
  const tokens = ChaosAuthStorage.get();
  if (tokens && tokens.refresh) {
    try {
      await fetch(CHAOS_API_BASE + "/accounts/logout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: tokens.refresh })
      });
    } catch (error) {
      // Les jetons locaux sont supprimés même si l'API est indisponible.
    }
  }
  ChaosAuthStorage.clear();
  window.location.href = "login.html";
}

/**
 * À appeler en haut d'une page réservée (ex. le tirage au sort).
 * Redirige vers la connexion si la personne n'a pas le rôle requis.
 */
function requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

/**
 * Met à jour la zone de navigation pour afficher "Connexion" ou le nom
 * de la personne connectée avec un lien de déconnexion.
 */
function renderAuthStatus() {
  const slot = document.getElementById("auth-status");
  if (!slot) {
    return;
  }
  const user = getCurrentUser();
  slot.innerHTML = "";
  const privateWorkshopLinks = ["eloquence.html", "histoires.html", "memes.html", "fake-news.html", "image-histoire.html", "improvisation.html"];
  if (user) {
    document.querySelectorAll(".nav a").forEach(function (link) {
      if (privateWorkshopLinks.includes(link.getAttribute("href"))) link.hidden = true;
      if (link.getAttribute("href") === "login.html") link.hidden = true;
      if (link.getAttribute("href") === "classe.html") link.hidden = user.role === "student";
      if (link.getAttribute("href") === "admin.html") link.hidden = user.role !== "admin";
    });
  }
  if (!user) {
    // Several pages already include a static Connexion link in their menu.
    // Add the fallback only when the page has no such link, avoiding duplicates.
    if (!document.querySelector('.nav a[href="login.html"]')) {
      const link = document.createElement("a");
      link.href = "login.html";
      link.textContent = "Connexion";
      slot.appendChild(link);
    }
    return;
  }
  if (user.role === "admin" && !document.querySelector('a[href="admin.html"]')) {
    const adminLink = document.createElement("a");
    adminLink.href = "admin.html";
    adminLink.textContent = "Administration";
    slot.appendChild(adminLink);
  }
  if (!document.querySelector('a[href="ateliers.html"]')) {
    const workspaceLink = document.createElement("a");
    workspaceLink.href = "ateliers.html";
    workspaceLink.textContent = "Mes activités";
    slot.appendChild(workspaceLink);
  }
  const profileLink = document.createElement("a");
  profileLink.href = "profile.html";
  profileLink.textContent = "Mon profil";
  slot.appendChild(profileLink);
  if (user.role === "student") {
    const productionsLink = document.createElement("a");
    productionsLink.href = "productions.html";
    productionsLink.textContent = "Mes productions";
    slot.appendChild(productionsLink);
  }
  const span = document.createElement("span");
  span.className = "mono";
  span.textContent = user.username + " (" + user.role + ")";
  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className = "btn btn-secondary";
  logoutBtn.style.marginLeft = "10px";
  logoutBtn.style.padding = "6px 10px";
  logoutBtn.textContent = "Déconnexion";
  logoutBtn.addEventListener("click", chaosLogout);
  slot.appendChild(span);
  slot.appendChild(logoutBtn);
}

document.addEventListener("DOMContentLoaded", renderAuthStatus);
