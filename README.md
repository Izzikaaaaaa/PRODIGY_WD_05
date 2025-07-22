# 🌈 Weathery

*A lightweight, animated, responsive weather web app with smart daily tips.*

Weathery lets users quickly check the current weather, a 4‑day midday forecast, UV & air‑quality badges, and auto‑generated **Outfit**, **Activity**, and **Health** suggestions — all wrapped in a polished glass‑UI with light/dark theme support and optional compact mode. Results can be fetched by **city search** or **current geolocation**.

---

## ✨ Features

**Search by City** – Type a city name (e.g., *Delhi*) and fetch live weather using the OpenWeather API.

**Use My Location** – Geolocation support (with permission) for on‑the‑go weather.

**Current Conditions Card** – Temperature, condition text, humidity, wind, feels‑like, pressure, sunrise & sunset (localized).

**Animated Weather Icons** – Lottie SVG animations w/ emoji fallback for reliability.

**4‑Day Midday Forecast** – Picks the list entry closest to 12:00 local time for each upcoming day for a quick “at a glance” view.

**Smart Tips Panel** – Automatically generates:

- 👕 **Outfit suggestions** (temperature, wind, humidity, precipitation)
- 🎯 **Activity recs** (good outdoor vs indoor, heat/fog/thunder logic)
- 🩺 **Health tips** (UV index, AQI category, heat stress, cold, wind chill)

**Dynamic Smart Badges** – UV, AQI, Feels‑like, Wind, Humidity badges with color coding.

**Dark / Light Theme Toggle** – One‑click toggle; preference saved in `localStorage`.

**Responsive Layout** – Mobile‑first card layout that becomes a multi‑column desktop grid at ≥880px.

**Compact Mode** – Add `compact` class to `<body>` to shrink spacing for embed or kiosk layouts.

---

## 📂 Project Structure

```
weathery/
├─ index.html        # Main app shell – loads fonts, CSS, and JS
├─ style.css         # Glassmorphic, responsive, theme‑aware styles
├─ script.js         # App logic: fetch weather, forecast, tips, theme, badges
└─ assets/           # (Optional) screenshots, icons, readme images
```

> **Note:** If you renamed `script.js` (e.g., to `weathery.js`), update the `<script src="...">` path in `index.html` accordingly.

---

## 🔑 API Setup (OpenWeather)

Weathery uses the **OpenWeather** APIs:

- `/data/2.5/weather` – current conditions
- `/data/2.5/forecast` – 3‑hourly multi‑day forecast (used to build 4‑day midday cards)
- `/data/3.0/onecall` *(fallback to ****`/2.5/onecall`****)* – UV & daily metrics
- `/data/2.5/air_pollution` – Air Quality Index (AQI)



> **Security Tip:** For public repos, don’t hardcode your real key. Use a lightweight proxy or environment variable injection during build.
---

## 🧠 How It Works

### Fetch Flow (City Search)

1. User enters city → `/weather` call → update current card.
2. In parallel:
   - `/forecast` call → build 4‑day midday forecast cards.
   - `fetchSupplementaryData()` → One Call (UV) + Air Pollution (AQI) → Smart Tips.
3. Background gradient + Lottie animation update based on condition keywords.
4. Last successful city stored in `localStorage` and auto‑loaded on next visit.

### Forecast Logic (Midday Picker)

The 3‑hour forecast feed is grouped by date and the entry whose timestamp is **closest to 12:00** local time is selected for presentation. Up to the next **4 days** are shown.

### Smart Tips Engine

The heuristics combine: temp, feels‑like, humidity, wind speed, condition keywords, UV index, and AQI category to produce simple natural‑language guidance. Logic lives in:

- `buildOutfitSuggestion()`
- `buildActivitySuggestion()`
- `buildHealthTips()`

---

## 🎨 Theming & Customization

### Theme Toggle

Handled in JS. Preference persisted in `localStorage` as `weathery-theme` (`dark` or `light`). The button icon flips between 🌙 and ☀️.

### CSS Custom Properties

A strong variable system is defined in `:root` and overridden in `.dark` body mode:

```css
:root {
  --grad-clear: linear-gradient(135deg,#fbc2eb,#a6c1ee);
  --grad-cloud: linear-gradient(135deg,#d7d2cc,#304352);
  --card-glass: rgba(255,255,255,0.78);
  --warn: #ff5e78; /* used for errors */
  /* ... */
}
```

Change these to instantly reskin the app.

### Compact Mode

Add `compact` to `<body>` (manually or via JS) to scale down controls and spacing for small embeds:

```html
<body class="compact">
```

---

## ♿ Accessibility Notes

- **ARIA Live Region:** Status messages use `aria-live="polite"` to announce loading and errors.
- **Keyboard Input:** City text field supports Enter to search.
- **Fallback Emoji:** If Lottie animation fails to load, a weather emoji remains visible.
- **Color Contrast:** Dark/light themes adjust text variables for readability; test your gradients if customizing.

---

## 🌐 Internationalization / Localization

- Times (sunrise/sunset) are displayed using the API’s timezone offset and `toLocaleTimeString()`.
- Forecast weekday names use the browser locale.
- Temperatures are metric (°C). To switch to imperial, change `&units=metric` to `imperial` in fetch URLs and update labels.

---


---

## ⚠ Troubleshooting

**"Nothing shows" / blank cards** – Check console for CORS or invalid API key.

**"city not found"** – OpenWeather may require the correct spelling or country code (e.g., `Delhi,IN`).

**AQI always missing** – Air Pollution API not enabled for your account or quota exceeded.

**Geolocation denied** – User blocked location; fall back to manual city search.

**Rate limiting** – Free tier keys can be throttled; consider caching responses in a small server.

