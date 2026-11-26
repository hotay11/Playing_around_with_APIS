// Sky-cast app Logic: looks up a city with open meteo, shows current weather
// and a 7 day forecst, and lets their user sort and filter their days
// APIS: Open-meteo geocoding(city coordinates and weather forecasst)
const $ = id => document.getElementById(id);
// holds the processed 7-day forecast so sort/filter can render withput a new API CALL
let days = [];

// Converts an open meteo weather code into an emoji or description
// The weather code determines which weather condition is displayed
const info = c => c === 0 ? ["\u2600\uFE0F", "Clear sky"] : c <= 2 ? ["\u26C5","Partly cloudy"] : c === 3 ? ["\u2601\uFE0F","Overcast"]
: c <= 48 ? ["\uD83C\uDF2B\uFE0F","Foggy"] : c <= 57 ? ["\uD83C\uDF26\uFE0F","Drizzle"] : (c <= 67 || (c >= 80 && c <= 82)) ? ["\u{1F327}","Rain"]
: c <= 86 ? ["\u2744\uFE0F","Snow"] : ["\u26C8\uFE0F","Thunderstorm"];

// Displays a message to the user
// t is the message text
// isinfo determn=ines wether the message use the infomrmation style
const say = (t, isInfo) => { $("msg").textContent = t; $("msg").className = isInfo ? "info" : ""; $("msg").hidden = false; };
const get = async u => {const r = await fetch(u); if (!r.ok) throw Error(r.status); return r.json(); };

// Searches a city and retrieves its weather forecast
async function search(city) {
    city = city.trim();
    if (!city) return say("Enter a city name to search.");
    $("form").querySelector("button").disabled = true;
    say("loading forecast...", true);
    
   // Request the city's geographicak coordinates from Open-Meteo
   // EncodeURLComponenet safely formats the city name for the URL 
    try{
        const g = await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    // If the API does not return a city results, hide the forecast
    // and s=display a message to the user    
        if (!g.results) { $("out").hidden = true; return say(`No city found for "${city}". Check the spelling and try again.`);}
    
        // Extract the latitude, longtude city name and country
        // from the first result returned by the  geocoding API  
        const {latitude: la, longitude: lo, name, country } = g.results[0];
       
    // Requests weather information using the city's coordinates
    // The current parameter requests current weather conditions.
    // Timezone=auto uses the location's local time zone. 
        const w = await get(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto');
    // Store the current weather data and s=daily forecast data
        const c = w.current, d= w.daily;
        if (!c || !d) throw Error("bad response");
    

    // display the current weather emoji and description.
    // Display the city and country
    // if the country is unavailabel display only the cuty name
    // Dispaly date ina readable format.
    // Diaplay the current temperature, feels like temoerature, humidity, windspeed and chances of rainfall.
    // Display the relatuve humidity as a percentage
    // Display the wind sapeed in limomters per hour
    // Dispaly the maximum percipitaion probality fo today.
    //if the value is missind, display 0%


        [$("nowIco").textContent, $("nowC").textContent] = info(c.weather_code);
        $("place").textContent = country? `${name}, ${country}` : name;
        $("date").textContent = new Date(c.time).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short"});
        $("nowT").textContent = Math.round(c.temperature_2m) + "°C";
        $("feel").textContent = Math.round(c.apparent_temperature) + "°C";
        $("hum").textContent = c.relative_humidity_2m + "%";
        $("wind").textContent = Math.round(c.wind_speed_10m) + " km/h";
        $("chance").textContent = (d.precipitation_probability_max?.[0] ?? 0) + "%";


// Convert the daily API data into an array of forecast objects.
// Each object contains the date maximum and minimum temperature.
// rainfall ammount and weather code for that day.
days = d.time.map((date, i) => ({ date, hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]),
    rain: d.precipitation_sum[i] ?? 0,code: d.weather_code[i] }));
$("msg").hidden = true; $("out").hidden = false;
render();
 }
catch(e) {
    console.error(e); $("out").hidden = true;
    say("Could not reach the weather service. Check your connection and try again.");}
finally { 
    // Re-enable the search button after the request finishes 
    //wether it succeds or fails
$("form").querySelector("button").disabled = false; }
}

function render() {
// sort functions for forecasti
// date sort by date, hot sorts by highest temperatire.
// cool sorts by temperature, and rain fall ammount.
    const sorts = {date: (a, b) => a.date.localeCompare(b.date), hot: (a,b) => b.hi -a.hi, cool: (a,b) => a.hi -b.hi, rain: (a,b) => b.rain - a.rain};

// filter the forecats if user selected rain mode only mode.
// Then sort the reamaining days using the selected sorting options.
    const list = days.filter(d => !$("rainOnly").checked || d.rain > 0).sort(sorts[$("sort").value]);


// Create the HTML for each forecast card and display it 
// Days wirh rainfall receive the "rain" CBS class.
// Each displays the date, weather emoji, temperature and rainfall.
    $("cards").innerHTML = list.map(d => `<div class="card${d.rain > 0 ? " rain" : ""}">
        <b>${new Date(d.date + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric"})}</b>
        <div class="ico">${info(d.code)[0]}</div>${d.hi}°C / ${d.lo}°C <small>${d.rain} mm rain </small></div>`).join("")
        || "<p> No rainy days in this forecast.</p>";
    }

// Handles the search form submussion.
// preventDefault stops the browser from reloading the page
$("form").onsubmit = e => {e.preventDefault(); search($("city").value);};

// Re-render the forecast whenever the sorting or rain filter chnages.
$("sort").onchange = $("rainOnly").onchange = render;

// Set the default city to kigali and automativ=cally search for its weather
$("city").value ="Kigali"; search("Kigali");
