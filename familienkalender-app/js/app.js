// Einstiegspunkt: Uhrzeit, Sidebar-Navigation, View-Switching.

const VIEWS = {
  heute: { label: "Heute", icon: "☀️" },
  kalender: { label: "Kalender", icon: "📅" },
  einkaufen: { label: "Einkaufen", icon: "🛒" },
  todos: { label: "To-Dos", icon: "✅" },
  projekte: { label: "Projekte", icon: "🛠️" },
  hellofresh: { label: "HelloFresh", icon: "🍽️" },
};

// Uhrzeit steht an zwei Stellen: in der Kopfzeile und - wenn "Heute" offen ist - in der
// Datumszeile dieser Ansicht. Dort ist die Kopfzeile ausgeblendet, damit das Datum nicht
// doppelt erscheint.
function updateClock() {
  const now = new Date();
  const zeit = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  document.getElementById("clock").textContent = zeit;
  document.getElementById("today-date").textContent = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const heuteUhr = document.getElementById("today-clock");
  if (heuteUhr) heuteUhr.textContent = zeit;
}

const WEATHER_ICONS = {
  "clear-night": "🌙",
  cloudy: "☁️",
  fog: "🌫️",
  hail: "🧊",
  lightning: "⛈️",
  "lightning-rainy": "⛈️",
  partlycloudy: "⛅",
  pouring: "🌧️",
  rainy: "🌦️",
  snowy: "❄️",
  "snowy-rainy": "🌨️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "💨",
  exceptional: "⚠️",
};

async function updateWeather() {
  if (!CONFIG.weatherEntity) return;
  try {
    const res = await fetch(`${CONFIG.haUrl}/api/states/${CONFIG.weatherEntity}`, {
      headers: { Authorization: `Bearer ${CONFIG.haToken}` },
    });
    if (!res.ok) return;
    const state = await res.json();
    const temp = state.attributes?.temperature;
    if (temp === undefined) return;

    const inhalt = `
      <span class="weather-icon">${WEATHER_ICONS[state.state] || "🌡️"}</span>
      <span class="weather-temp">${Math.round(temp)}°</span>`;

    // Kopfzeile und - falls offen - die Datumszeile der Heute-Ansicht
    ["weather", "today-weather"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = inhalt;
      el.classList.add("clickable");
      el.onclick = () => WeatherModal.open();
    });
  } catch (err) {
    console.warn("Wetter konnte nicht geladen werden:", err);
  }
}

// Roter Zähler am Sidebar-Eintrag. Nutzen HelloFresh (offene Vorauswahlen) und
// Einkaufen (offene Artikel) gemeinsam - vorher stand das nur in hellofresh-view.js.
function setNavBadge(viewKey, count) {
  const navItem = document.querySelector(`.nav-item[data-view="${viewKey}"]`);
  if (!navItem) return;

  navItem.querySelector(".nav-badge")?.remove();
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "nav-badge";
    badge.textContent = count;
    navItem.appendChild(badge);
  }
}

function buildSidebar() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = Object.entries(VIEWS)
    .map(
      ([key, view]) => `
      <button class="nav-item" data-view="${key}">
        <span class="nav-icon">${view.icon}</span>
        <span class="nav-label">${view.label}</span>
      </button>`
    )
    .join("");

  nav.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function switchView(viewKey) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewKey);
  });

  const main = document.getElementById("main-content");

  // "Heute" trägt Datum, Uhrzeit und Wetter selbst - die Kopfzeile würde beides doppeln.
  document.querySelector(".top-header").hidden = viewKey === "heute";

  if (viewKey === "heute") {
    main.innerHTML = `<div id="today-container" class="today-container"></div>`;
    TodayView.init(document.getElementById("today-container"));
  } else if (viewKey === "kalender") {
    main.innerHTML = `<div id="calendar-container" class="calendar-container"></div>`;
    CalendarView.init(document.getElementById("calendar-container"));
  } else if (viewKey === "einkaufen") {
    main.innerHTML = `<div id="shopping-container" class="shopping-container"></div>`;
    ShoppingView.init(document.getElementById("shopping-container"));
  } else if (viewKey === "todos") {
    main.innerHTML = `<div id="todo-container" class="todo-container"></div>`;
    TodoView.init(document.getElementById("todo-container"));
  } else if (viewKey === "projekte") {
    main.innerHTML = `<div id="projekte-container" class="projekte-container"></div>`;
    ProjekteView.init(document.getElementById("projekte-container"));
  } else if (viewKey === "hellofresh") {
    main.innerHTML = `<div id="hf-container" class="hf-container"></div>`;
    HelloFreshView.init(document.getElementById("hf-container"));
  } else {
    main.innerHTML = `
      <div class="empty empty--gross">
        <div class="empty-icon">${VIEWS[viewKey].icon}</div>
        <div class="empty-text">${VIEWS[viewKey].label} — folgt als Nächstes</div>
      </div>`;
  }
}

function init() {
  buildSidebar();
  updateClock();
  setInterval(updateClock, 1000 * 30);
  updateWeather();
  setInterval(updateWeather, 15 * 60 * 1000);
  switchView("heute");

  // Hinweis auf unbestätigte HelloFresh-Vorauswahl soll auch ohne offene Ansicht
  // sichtbar sein, und auf dem Wand-Display über Tage aktuell bleiben.
  HelloFreshView.initBadge();
  setInterval(() => HelloFreshView.initBadge(), HF_CACHE_TTL_MS);

  // Offene Artikel der Einkaufslisten - auch sichtbar, wenn die Ansicht zu ist.
  ShoppingView.updateNavBadge();
  setInterval(() => ShoppingView.updateNavBadge(), 5 * 60 * 1000);
}

document.addEventListener("DOMContentLoaded", init);
