const $ = id => document.getElementById(id);
let days = [];

const info = c => c === 0 ? ["Clear sky"] : c <= 2 ? ["Partly Cloudy"] : c === 3 ? ["Overcast"]
: c <= 48 ? ["Foggy"] : c <= 57 ? ["Drizzle"] : (c <= 67 || (c >= 80 && c <= 82)) ? ["Rain"]
: c <= 86 ? ["Snow"] : ["Thunderstorm"];

const say = (t, isInfo) => { $("msg").textContent = t; $("msg").className = isInfo ? "info" : ""; $("msg").hidden = false; };
const get = async u => {const r = await fetch(u); if (!r.ok) throw Error(r.status); return r.json(); };

async function search(city) {
    city = city.trim();
    if (!city) return say("Enter a city name to search.");
    $("form").querySelector("button").disabled = true;
    say("loading forecast...", true);
    try{
        const g = await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        if (!g.results) { $("out").hidden = true; return say(`No city found for "${city}". Check the spelling and try again.`);}
        const {latitude: la, longitude: lo, name, country } = g.results[0];
        const w = await get(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto');
        const c = w.current, d= w.daily;
        if (!c || !d) throw Error("bad response");
    
        [$("nowIco").textContent, $("nowC").textContent] = info(c.weather_code);
        $("place").textContent = country? `${name}, ${country}` : name;
        $("date").textContent = new Date(c.time).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short"});
        $("nowT").textContent = Math.round(c.temperature_2m) + "°C";
        $("feel").textContent = Math.round(c.apparent_temperature) + "°C";
        $("hum").textContent = c.relative_humidity_2m + "%";
        $("wind").textContent = Math.round(c.wind_speed_10m) + " km/h";
        $("chance").textContent = (d.precipitation_probability_max?.[0] ?? 0) + "%";

days = d.time.map((date, i) => ({ date, hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]),
    rain: d.precipitation_sum[i] ?? 0,code: d.weather_code[i] }));
$("msg").hidden = true; $("out").hidden = false;
render();
 }
catch(e) {
    console.error(e); $("out").hidden = true;
    say("Could not reach the weather service. Check your connection and try again.");}
finally { $("form").querySelector("button").disabled = false; }
}

function render() {
    const sorts = {date: (a, b) => a.date.localeCompare(b.date), hot: (a,b) => b.hi -a.hi, cool: (a,b) => a.hi -b.hi, rain: (a,b) => b.rain - a.rain};
    const list = days.filter(d => !$("rainOnly").checked || d.rain > 0).sort(sorts[$("sort").value]);

    $("cards").innerHTML = list.map(d => `<div class="card${d.rain > 0 ? " rain" : ""}">
        <b>${new Date(d.date + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric"})}</b>
        <div class="ico">${info(d.code)[0]}</div>${d.hi} / ${d.lo} <small>${d.rain} mm rain </small></div>`).join("")
        || "<p> No rainy days in this forecast.</p>";
    }
$("form").onsubmit = e => {e.preventDefault(); search($("city").value);};
$("sort").onchange = $("rainOnly").onchange = render;
$("city").value ="Kigali"; search("Kigali");
