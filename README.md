# Skycast: Weather Planner

Skycast is a web app that helps people plan their week around the weather. A user searches for a city and gets the current conditions plus a 7-day forecast, which they can sort and filter to find the best or worst days, for example to plan farming work, travel, or outdoor events.

- **Live site (through the load balancer):** https://joshuahotay.tech
- **Demo video (under 2 minutes):** https://youtu.be/edxplwYqkNE?si=R8vMFsLiPwHYZV4R
- **Repository:** https://github.com/hotay11/Playing_around_with_APIS

> Use the domain above, not the raw load balancer IP (13.40.24.204). The HTTPS certificate is issued for `joshuahotay.tech`, so opening the IP directly shows a browser certificate warning.

## Credentials for grading

The app needs **no API key and no login**. Open-Meteo is free and keyless, so there are no secrets anywhere in this repository and nothing to enter.

## Features

- Search any city by name (for example Dodoma or Arusha). Kigali loads by default.
- Current weather: temperature, feels-like, humidity, wind speed and today's rain chance.
- 7-day forecast shown as cards (high/low in °C and rainfall in mm).
- **Sort** the forecast by date, hottest first, coolest first, or most rain first.
- **Filter** to show rainy days only.
- The Search button is disabled while a request is running, and a "Loading forecast..." message is shown.
- Error messages for an empty search, a city that is not found, and an API or network failure.

## Error handling

| Situation | What the user sees |
|---|---|
| Empty search box | "Enter a city name to search." |
| City not found by the geocoding API | "No city found for ... Check the spelling and try again." The old results are hidden. |
| Network failure, API downtime or an HTTP error from Open-Meteo | "Could not reach the weather service. Check your connection and try again." The old results are hidden. |
| API replies without the expected weather data | Same message as above. |
| Request in progress | A loading message is shown and the Search button is disabled. It is re-enabled whether the request succeeds or fails. |

## API used

**Open-Meteo** provides the weather data through two endpoints:

1. **Geocoding API**: converts the city name to latitude and longitude.
2. **Forecast API**: returns current conditions and the daily forecast for those coordinates.

- Website: https://open-meteo.com/
- Forecast API docs: https://open-meteo.com/en/docs
- Geocoding API docs: https://open-meteo.com/en/docs/geocoding-api

Credit goes to the Open-Meteo developers. Open-Meteo data is offered under CC BY 4.0, and an attribution link is shown in the page footer.

## Tech stack

Plain HTML, CSS and JavaScript (no frameworks, no build step, no server-side code).

- `index.html`: page structure
- `styles.css`: styling
- `app.js`: API calls, sorting, filtering and error handling

## How the system works

```
Browser --HTTPS--> Lb01 (HAProxy, 13.40.24.204) --round-robin--> Web01 (nginx, 18.134.228.22)
                                                             \--> Web02 (nginx, 18.170.29.61)
Browser --HTTPS--> Open-Meteo APIs (called directly from the browser by app.js)
```

- The two web servers only serve three static files (`index.html`, `app.js`, `styles.css`). There is no backend, database or session state, so either server can answer any request and the load balancer needs no sticky sessions.
- The weather requests are made by the visitor's browser straight to Open-Meteo, not through the servers. Because the API needs no key, nothing secret is stored on any server.
- HAProxy alternates requests between Web01 and Web02. Its `check` option health-checks each server and stops sending traffic to one that is down.
- Each web server adds an `X-Served-By` response header (`web01` or `web02`), which makes it possible to see which server answered.

## Run it locally

1. Clone the repository:
   ```
   git clone https://github.com/hotay11/Playing_around_with_APIS.git
   cd Playing_around_with_APIS
   ```
2. Open `index.html` in a browser. You need an internet connection because the app calls Open-Meteo. Optionally, serve it instead with `python3 -m http.server 8000` and open http://localhost:8000.
3. Type a city name and press **Search**.

## Deployment

The app is a static site served by nginx on two web servers (Ubuntu 20.04, nginx 1.18), with HAProxy on a third server balancing traffic between them.

| Server | Role | IP |
|---|---|---|
| 7281-web-01 | Web server (nginx) | 18.134.228.22 |
| 7281-web-02 | Web server (nginx) | 18.170.29.61 |
| 7281-lb-01 | Load balancer (HAProxy) | 13.40.24.204 |

### Web01 and Web02 (the same steps on both)

1. Connect with SSH: `ssh ubuntu@<server-ip>`
2. Install the tools: `sudo apt update && sudo apt install git nginx nano -y`
3. Clone the repository: `git clone https://github.com/hotay11/Playing_around_with_APIS.git`
4. Start nginx: `sudo service nginx start`
5. Copy only the three site files to the web root: `sudo cp ~/Playing_around_with_APIS/index.html ~/Playing_around_with_APIS/app.js ~/Playing_around_with_APIS/styles.css /var/www/html/`
6. Add a header that shows which server answered. In `/etc/nginx/sites-enabled/default`, inside the `server { ... }` block, add `add_header X-Served-By web01;` (use `web02` on Web02).
7. Test and reload: `sudo nginx -t && sudo service nginx reload`
8. Confirm with `curl -I localhost`, which should show the `X-Served-By` header.

Only the three site files are copied to `/var/www/html/`, so the README and the `codevibe-reports/` folder are not publicly served.

### Updating after a code change (the same on both web servers)

```
ssh ubuntu@<server-ip>
cd ~/Playing_around_with_APIS && git pull
sudo cp index.html app.js styles.css /var/www/html/
exit
```

Then confirm both servers match the repository by comparing file hashes from any machine with a copy of the repository:

```
for f in index.html app.js styles.css; do
  echo "== $f"
  curl -s http://18.134.228.22/$f | md5sum
  curl -s http://18.170.29.61/$f | md5sum
  md5sum $f
done
```

All three hashes in each group must be identical. I ran this check after the final deployment and all three files matched on Web01, Web02 and the repository. Because a browser caches old files, hard refresh (Ctrl+Shift+R) the live site after an update.

### Load balancer (Lb01)

1. Connect with SSH and install HAProxy: `sudo apt install haproxy -y`
2. In `/etc/haproxy/haproxy.cfg`, the backend lists both web servers and uses round-robin:
   ```
   backend web_servers
       balance roundrobin
       server 7281-web-01 18.134.228.22:80 check
       server 7281-web-02 18.170.29.61:80 check
   ```
3. The frontend on port 80 redirects to HTTPS, and the HTTPS frontend (port 443, with the certificate for `joshuahotay.tech`) sends traffic to `web_servers`.
4. Check the config and restart: `sudo haproxy -c -f /etc/haproxy/haproxy.cfg && sudo service haproxy restart`

### Domain and HTTPS

- **DNS:** `joshuahotay.tech` has an A record pointing to the load balancer. `dig +short joshuahotay.tech` returns `13.40.24.204`.
- **Certificate:** a certificate for `joshuahotay.tech` is installed on the load balancer, valid from 10 Nov 2026 to 8 Feb 2027. It was checked with:
  ```
  echo | openssl s_client -connect joshuahotay.tech:443 -servername joshuahotay.tech 2>/dev/null | openssl x509 -noout -subject -dates
  ```
  which returned `subject=CN = joshuahotay.tech`, `notBefore=Nov 10 08:50:01 2026 GMT` and `notAfter=Feb  8 08:50:00 2027 GMT`.
- **HTTP to HTTPS redirect:** `curl -sI http://joshuahotay.tech` returns `301 Moved Permanently` with `location: https://joshuahotay.tech/`.

## Testing

### Traffic is balanced

Run from a separate machine against the public domain (27 Nov 2026):

```
for i in 1 2 3 4 5 6; do curl -sI https://joshuahotay.tech | grep -i x-served-by; done
```

Output:

```
x-served-by: web01
x-served-by: web02
x-served-by: web01
x-served-by: web02
x-served-by: web01
x-served-by: web02
```

Requests alternate strictly between the two servers, and the app loads normally whichever one answers.

### Both servers respond on their own

```
curl -sI http://18.134.228.22 | grep -i -e "HTTP/" -e x-served-by
curl -sI http://18.170.29.61  | grep -i -e "HTTP/" -e x-served-by
```

Both return `HTTP/1.1 200 OK`, with `X-Served-By: web01` and `web02` respectively.

### How to verify failover

1. On Web01, stop nginx: `sudo service nginx stop`.
2. Wait a few seconds for the HAProxy health check, then run the balance loop above. Every response should come from `web02` and the site should still load.
3. Start nginx again with `sudo service nginx start` and run the loop again. The responses should alternate between `web01` and `web02` again.

## Challenges and how I solved them

- **Git inside OneDrive.** My first clone failed because OneDrive locked files in the `.git` folder. I moved my work out of OneDrive-synced problem paths and re-did the repository setup.
- **Wrong repository structure.** My first push put `index.html` inside a subfolder because git had been started in the parent folder. I removed the extra `.git`, ran `git init` inside the project folder, and force-pushed so the repo root contains only the project files.
- **Missing tools on the servers.** Web01 had no `git`, and neither server had `nano`. I installed them with `apt`.
- **Duplicate HAProxy backend.** HAProxy refused to start because `backend web_servers` was defined twice, once in the existing config and once in mine. I read the file with `cat -n`, deleted my duplicate block, and the config check passed.
- **Testing through HTTPS.** The load balancer redirects port 80 to HTTPS, so I tested with `curl -skI https://localhost` instead of plain HTTP.
- **Private files served publicly.** My first deployment copied everything in the repository into `/var/www/html/`, which made the README and the CodeVibe report downloadable from the live site. I deleted them from the web root on both servers and changed the deploy step to copy only the three site files.

## Credits

- **Open-Meteo** for the weather and geocoding data: https://open-meteo.com/
- **Google Fonts** for the Inter typeface: https://fonts.google.com/specimen/Inter
- **nginx** (https://nginx.org/) and **HAProxy** (https://www.haproxy.org/) for serving and load balancing.

## Author

Joshua Stanley Hotay
