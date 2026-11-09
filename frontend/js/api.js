/* ------------------------------------------------------------
   Chaos Français - api.js
   Petit client HTTP partagé par toutes les pages : ajoute le jeton
   JWT aux requêtes et gère le rafraîchissement automatique.
   Changez CHAOS_API_BASE pour pointer vers le backend en production.
------------------------------------------------------------ */

const CHAOS_API_BASE = window.CHAOS_API_BASE || "http://localhost:8000/api";

const ChaosAuthStorage = {
  KEY: "chaos_tokens",

  get() {
    try {
      const raw = window.localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  },

  set(tokens) {
    window.localStorage.setItem(this.KEY, JSON.stringify(tokens));
  },

  clear() {
    window.localStorage.removeItem(this.KEY);
  }
};

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch (error) {
    return null;
  }
}

function getCurrentUser() {
  const tokens = ChaosAuthStorage.get();
  if (!tokens || !tokens.access) {
    return null;
  }
  const payload = decodeJwtPayload(tokens.access);
  if (!payload) {
    return null;
  }
  return { username: payload.username, role: payload.role, exp: payload.exp };
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

async function refreshAccessToken() {
  const tokens = ChaosAuthStorage.get();
  if (!tokens || !tokens.refresh) {
    return false;
  }
  const response = await fetch(CHAOS_API_BASE + "/accounts/login/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh })
  });
  if (!response.ok) {
    ChaosAuthStorage.clear();
    return false;
  }
  const data = await response.json();
  ChaosAuthStorage.set({ access: data.access, refresh: data.refresh || tokens.refresh });
  return true;
}

/**
 * Appelle l'API avec le jeton d'accès courant. Si le jeton a expiré (401),
 * tente un rafraîchissement puis rejoue la requête une seule fois.
 */
async function apiFetch(path, options) {
  options = options || {};
  const tokens = ChaosAuthStorage.get();
  const headers = Object.assign({}, options.headers || {});
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (tokens && tokens.access) {
    headers["Authorization"] = "Bearer " + tokens.access;
  }

  let response = await fetch(CHAOS_API_BASE + path, Object.assign({}, options, { headers }));

  if (response.status === 401 && tokens && tokens.refresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newTokens = ChaosAuthStorage.get();
      headers["Authorization"] = "Bearer " + newTokens.access;
      response = await fetch(CHAOS_API_BASE + path, Object.assign({}, options, { headers }));
    }
  }

  return response;
}

async function apiFetchJson(path, options) {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    let detail = "Une erreur est survenue.";
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch (error) {
      // réponse non JSON, on garde le message par défaut
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}
