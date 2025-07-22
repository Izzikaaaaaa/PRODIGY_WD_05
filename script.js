/* ================= CONFIG ================= */
const API_KEY = "ef4331627d03229005c2bf424964567a";
const ENABLE_ONECALL = true;   // UV
const ENABLE_AQI = true;       // Air quality

/* ================= ELEMENTS ================= */
const els = {
  cityInput: document.getElementById("cityInput"),
  btnSearch: document.getElementById("btnSearch"),
  btnLocate: document.getElementById("btnLocate"),
  status: document.getElementById("status"),
  weatherCard: document.getElementById("weatherCard"),
  forecastSection: document.getElementById("forecastSection"),
  location: document.getElementById("location"),
  temp: document.getElementById("temp"),
  condition: document.getElementById("condition"),
  details: document.getElementById("details"),
  extra: document.getElementById("extra"),
  forecastCards: document.getElementById("forecastCards"),
  emojiFallback: document.getElementById("emojiFallback"),
  weatherAnimation: document.getElementById("weatherAnimation"),
  smartSection: document.getElementById("smartSection"),
  smartBadges: document.getElementById("smartBadges"),
  outfitTip: document.getElementById("outfitTip"),
  activityTip: document.getElementById("activityTip"),
  healthTip: document.getElementById("healthTip"),
  themeToggle: document.getElementById("themeToggle")
};

let lottieInstance = null;

/* ================= THEME ================= */
(function initTheme(){
  const saved = localStorage.getItem("weathery-theme");
  if(saved === "dark") document.body.classList.add("dark");
  updateThemeToggleIcon();
})();
function updateThemeToggleIcon(){
  els.themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}
els.themeToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("weathery-theme",
    document.body.classList.contains("dark") ? "dark" : "light");
  updateThemeToggleIcon();
});

/* ================= STATUS HELPERS ================= */
function setStatus(msg,isError=false){
  els.status.textContent = msg;
  els.status.style.color = isError ? "var(--warn)" : "";
}
function clearStatus(delay=0){
  if(delay) setTimeout(()=>{ if(els.status.textContent) els.status.textContent=""; },delay);
  else els.status.textContent="";
}
function showError(msg){
  setStatus(msg,true);
  els.weatherCard.hidden = true;
  els.forecastSection.hidden = true;
  els.smartSection.hidden = true;
}

/* ================= EMOJI / ANIMATION ================= */
const emojiMap = [
  ["thunder","⛈"],["storm","⛈"],["snow","❄️"],["sleet","🌨"],
  ["hail","🧊"],["rain","🌧"],["drizzle","🌦"],["shower","🌦"],
  ["cloud","☁️"],["mist","🌫"],["fog","🌫"],["haze","🌫"],
  ["smoke","🌫"],["dust","🌫"],["clear","☀️"]
];
const lottieURLs = {
  thunder:"https://lottie.host/7dbb5b9c-0b8e-4e24-9a47-872afbf7f819/Thndr.json",
  snow:"https://lottie.host/6dd5ffc1-6fda-4fde-8f83-97f6c9ab0c72/Snow.json",
  rain:"https://lottie.host/0c1f85f7-74a1-40a8-a8da-7db902349e31/Rain.json",
  drizzle:"https://lottie.host/0c1f85f7-74a1-40a8-a8da-7db902349e31/Rain.json",
  cloud:"https://lottie.host/3b1c743f-4b22-476b-9b67-995f7d84e405/Cloudy.json",
  fog:"https://lottie.host/2b21ec07-b648-45e4-9ae8-3bd273173226/Fog.json",
  clear:"https://lottie.host/3c329565-2b4f-4c47-ae60-b5f52bb6bc52/Sun.json",
  default:"https://lottie.host/3c329565-2b4f-4c47-ae60-b5f52bb6bc52/Sun.json"
};
function pickEmoji(text){
  const lower=text.toLowerCase();
  for(const [k,e] of emojiMap){ if(lower.includes(k)) return e; }
  return "🌤";
}
function lottieURLFor(c){
  if(c.includes("thunder")||c.includes("storm")) return lottieURLs.thunder;
  if(c.includes("snow")) return lottieURLs.snow;
  if(c.includes("rain")) return lottieURLs.rain;
  if(c.includes("drizzle")||c.includes("shower")) return lottieURLs.drizzle;
  if(c.includes("cloud")) return lottieURLs.cloud;
  if(c.match(/mist|fog|haze|smoke|dust/)) return lottieURLs.fog;
  if(c.includes("clear")) return lottieURLs.clear;
  return lottieURLs.default;
}
function backgroundFor(c){
  if(c.includes("cloud")) return "var(--grad-cloud)";
  if(c.includes("rain")||c.includes("drizzle")) return "var(--grad-rain)";
  if(c.includes("snow")) return "var(--grad-snow)";
  if(c.includes("clear")) return "var(--grad-clear)";
  return "var(--grad-misc)";
}
function loadLottie(condition){
  const url = lottieURLFor(condition);
  fetch(url)
    .then(r=>{ if(!r.ok) throw new Error("anim fetch fail"); return r.json(); })
    .then(json=>{
      if(lottieInstance) lottieInstance.destroy();
      lottieInstance = lottie.loadAnimation({
        container: els.weatherAnimation,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: json
      });
      setTimeout(()=>{ els.emojiFallback.style.opacity="0"; }, 250);
    })
    .catch(()=> { els.emojiFallback.style.opacity="1"; });
}

/* ================= FETCH HELPERS ================= */
async function fetchJSON(url){
  const res = await fetch(url);
  const data = await res.json();
  if(!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/* ================= MAIN WEATHER ================= */
async function getWeatherByCity(city){
  if(!city) return;
  setStatus("Loading current weather…");
  try{
    const data = await fetchJSON(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
    updateCurrent(data);
    await Promise.all([
      getForecast(data.name),
      fetchSupplementaryData(data)
    ]);
    setStatus("");
    clearStatus(1500);
    localStorage.setItem("weathery-last-city", data.name);
  }catch(e){ showError(e.message); }
}

async function getWeatherByLocation(){
  if(!navigator.geolocation) return showError("Geolocation not supported");
  setStatus("Getting location…");
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const {latitude,longitude} = pos.coords;
      const data = await fetchJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
      updateCurrent(data);
      await Promise.all([
        getForecast(data.name),
        fetchSupplementaryData(data)
      ]);
      setStatus("");
      clearStatus(1500);
      localStorage.setItem("weathery-last-city", data.name);
    }catch(e){ showError(e.message); }
  },()=>showError("Location permission denied."));
}

async function getForecast(city){
  setStatus("Fetching forecast…");
  try{
    const data = await fetchJSON(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
    renderForecastMidday(data.list);
    els.forecastSection.hidden = false;
  }catch(e){
    els.forecastCards.innerHTML = '<div class="forecast-card">No forecast 😢</div>';
  }
}

function updateCurrent(data){
  els.weatherCard.hidden = false;
  const desc = data.weather?.[0]?.description || "";
  const conditionText = desc.toLowerCase();

  els.location.textContent = `${data.name}, ${data.sys?.country || ""}`.trim();
  els.temp.textContent = `${data.main.temp.toFixed(1)} °C`;
  els.condition.textContent = desc;
  els.details.textContent = `Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} km/h`;
  const sunriseLocal = timeFromUTC(data.sys.sunrise, data.timezone);
  const sunsetLocal  = timeFromUTC(data.sys.sunset,  data.timezone);
  els.extra.textContent = `Feels like: ${data.main.feels_like.toFixed(1)}°C • Pressure: ${data.main.pressure} hPa • Sunrise: ${sunriseLocal} • Sunset: ${sunsetLocal}`;

  els.emojiFallback.textContent = pickEmoji(conditionText);
  document.body.style.background = backgroundFor(conditionText);
  loadLottie(conditionText);
}

/* ================= FORECAST MIDDAY ================= */
function renderForecastMidday(list){
  const byDate = {};
  list.forEach(item=>{
    const key = item.dt_txt.slice(0,10);
    (byDate[key] ||= []).push(item);
  });

  const todayKey = new Date().toISOString().slice(0,10);
  const sortedDates = Object.keys(byDate).sort().filter(d=>d>=todayKey);

  const picked=[];
  for(const d of sortedDates){
    const entries = byDate[d];
    let best=null, bestDiff=1e9;
    entries.forEach(en=>{
      const hour = new Date(en.dt_txt).getHours();
      const diff = Math.abs(hour - 12);
      if(diff < bestDiff){ bestDiff=diff; best=en; }
    });
    if(best) picked.push(best);
    if(picked.length===4) break;
  }

  els.forecastCards.innerHTML = picked.map(en=>{
    const date = new Date(en.dt_txt);
    const dayName = date.toLocaleDateString(undefined,{ weekday:"short" });
    const condMain = en.weather[0].main;
    return `<div class="forecast-card fade-in">
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-emoji">${pickEmoji(condMain)}</div>
      <div class="forecast-temp">${Math.round(en.main.temp)}°C</div>
      <div class="forecast-desc">${condMain}</div>
    </div>`;
  }).join("");
}

/* ================= SMART TIPS ================= */
async function fetchSupplementaryData(currentData){
  els.smartSection.hidden = false;
  const { coord } = currentData;
  if(!coord){ updateSmartTips({current:currentData}); return; }

  const {lat,lon} = coord;
  let oneCall=null, air=null;

  if(ENABLE_ONECALL){
    try {
      oneCall = await fetchJSON(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&exclude=minutely,hourly,alerts`);
    } catch {
      try {
        oneCall = await fetchJSON(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&exclude=minutely,hourly,alerts`);
      } catch { oneCall=null; }
    }
  }
  if(ENABLE_AQI){
    try { air = await fetchJSON(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`); }
    catch { air=null; }
  }
  updateSmartTips({ current: currentData, oneCall, air });
}

function updateSmartTips({current, oneCall, air}){
  const temp = current.main?.temp;
  const feels = current.main?.feels_like ?? temp;
  const humidity = current.main?.humidity;
  const wind = current.wind?.speed;
  const condition = (current.weather?.[0]?.main || "").toLowerCase();

  const uv = oneCall?.current?.uvi ?? null;
  const aqiIndex = air?.list?.[0]?.main?.aqi ?? null;
  const aqiCategory = mapAQI(aqiIndex);

  const outfit = buildOutfitSuggestion(temp, feels, wind, condition, humidity);
  const activity = buildActivitySuggestion(temp, condition, wind, humidity, uv);
  const health = buildHealthTips({ temp, feels, humidity, wind, uv, aqiCategory, condition });

  els.outfitTip.textContent = outfit;
  els.activityTip.textContent = activity;
  els.healthTip.innerHTML = health;

  const badges=[];
  if(uv != null) badges.push(badgeHTML("UV "+uv.toFixed(1), uvColor(uv)));
  if(aqiCategory) badges.push(badgeHTML("AQI "+aqiCategory.short, aqiCategory.color));
  if(feels!=null) badges.push(badgeHTML("Feels "+Math.round(feels)+"°C"));
  if(wind!=null) badges.push(badgeHTML("Wind "+wind.toFixed(1)+" m/s"));
  if(humidity!=null) badges.push(badgeHTML("Hum "+humidity+"%"));
  els.smartBadges.innerHTML = badges.join("");
}

function buildOutfitSuggestion(temp, feels, wind, condition, humidity){
  if(temp==null) return "No data.";
  const t = feels ?? temp;
  const parts=[];
  if(t < 0) parts.push("Heavy coat, gloves 🧥🧤");
  else if(t < 8) parts.push("Warm jacket & layers 🧣");
  else if(t < 15) parts.push("Light jacket/hoodie 🧥");
  else if(t < 24) parts.push("T‑shirt & jeans 👕");
  else if(t < 30) parts.push("Light breathable clothes 🩳");
  else parts.push("Ultra‑light & airy 🕶️");
  if(condition.includes("rain")||condition.includes("drizzle")) parts.push("Umbrella ☂️");
  if(condition.includes("snow")) parts.push("Waterproof boots 🥾");
  if(wind>8) parts.push("Windbreaker 💨");
  if(humidity>75 && t>26) parts.push("Moisture‑wicking fabric 💧");
  return parts.join(" • ");
}
function buildActivitySuggestion(temp, condition, wind, humidity, uv){
  if(temp==null) return "—";
  const t=temp;
  if(condition.includes("thunder")) return "Stay indoors ⛈";
  if(condition.includes("snow")) return t < -5 ? "Indoor warm time ☕" : "Snow walk ❄️";
  if(condition.includes("rain")||condition.includes("drizzle"))
    return wind>6? "Cozy indoor reading ☂️":"Light walk w/ umbrella ☂️";
  if(t >= 18 && t <= 28) return "Great for jog/cycle 🚴";
  if(t >= 10 && t < 18) return "Brisk walk 🚶";
  if(t > 30) return uv && uv>7 ? "Early/late outdoor; hydrate 💧":"Short shaded walks 🌿";
  if(t < 5) return "Indoor workout 🏋️";
  return "Moderate outdoor OK ✅";
}
function buildHealthTips({temp, feels, humidity, wind, uv, aqiCategory, condition}){
  const tips=[];
  const t=feels??temp;
  if(uv!=null){
    if(uv<3) tips.push(`Low UV (${uv.toFixed(1)}) 😎`);
    else if(uv<6) tips.push(`Moderate UV (${uv.toFixed(1)}) SPF 30 🧴`);
    else if(uv<8) tips.push(`High UV (${uv.toFixed(1)}) SPF 50 & hat 🧢`);
    else tips.push(`Very high UV (${uv.toFixed(1)}) limit midday sun ⛱️`);
  }
  if(aqiCategory){
    tips.push(aqiCategory.label==="Good"
      ? "Air quality good 😊"
      : `Air ${aqiCategory.label} – ${aqiCategory.advice}`);
  }
  if(t!=null){
    if(t>=32) tips.push("Heat stress risk – hydrate 💧");
    else if(t>=27 && humidity>70) tips.push("Humid heat – rest & shade 🌿");
    else if(t<=5) tips.push("Layer up vs chill 🧥");
    else if(t<0) tips.push("Frostbite risk if long exposure 🥶");
  }
  if(wind && t<10 && wind>6) tips.push("Wind chill caution 💨");
  if(condition.includes("fog")||condition.includes("mist")) tips.push("Low visibility – reflective gear 👟");
  if(condition.includes("dust")||condition.includes("smoke")) tips.push("Mask if sensitive 😷");
  if(!tips.length) tips.push("All clear – enjoy the day! 🌈");
  return tips.map(t=>`<span class="hl-tip">${t}</span>`).join("<br>");
}

/* AQI mapping */
function mapAQI(i){
  if(!i) return null;
  const m={
    1:{short:"1",label:"Good",color:"#6bc46d",advice:"Enjoy outdoors"},
    2:{short:"2",label:"Fair",color:"#b1d55e",advice:"Sensitive watch symptoms"},
    3:{short:"3",label:"Moderate",color:"#f3d162",advice:"Limit intense exertion if sensitive"},
    4:{short:"4",label:"Poor",color:"#f59b42",advice:"Reduce outdoor time"},
    5:{short:"5",label:"Very Poor",color:"#e44f4f",advice:"Avoid outdoor activity"}
  };
  return m[i]||null;
}
function uvColor(uv){
  if(uv<3) return "#58b368";
  if(uv<6) return "#f2c84b";
  if(uv<8) return "#f58b2e";
  if(uv<11) return "#e65050";
  return "#9d4de1";
}
function badgeHTML(text,bg){
  const style=bg?`style="background:${bg};color:#fff;border-color:${bg};"`:"";
  return `<span class="badge" ${style}>${text}</span>`;
}

/* ================= UTILITIES ================= */
function timeFromUTC(utcSeconds, tzOffset){
  const local = new Date((utcSeconds + tzOffset) * 1000);
  return local.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

/* ================= EVENTS ================= */
els.btnSearch.addEventListener("click", ()=> getWeatherByCity(els.cityInput.value.trim()));
els.cityInput.addEventListener("keyup", e => { if(e.key==="Enter") getWeatherByCity(els.cityInput.value.trim()); });
els.btnLocate.addEventListener("click", ()=> getWeatherByLocation());

/* ================= AUTO-LOAD LAST CITY ================= */
const lastCity = localStorage.getItem("weathery-last-city");
if(lastCity){
  els.cityInput.value = lastCity;
  getWeatherByCity(lastCity);
}
