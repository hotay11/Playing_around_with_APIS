# Skycast: Weather Planner

Skycast is a web app that helps people plan their week around the weather. A user searches for a city and gets the current conditions plus a 7-day forecast, which they can sort and filter to find the best or worst days, for example to plan farming work, travel, or outdoor events.

- **Live site (load balancer):** https://joshuahotay.tech
- **Load balancer IP:** http://13.40.24.204
- **Demo video:** `PASTE YOUR VIDEO LINK HERE` (under 2 minutes)
- **Repository:** https://github.com/hotay11/Playing_around_with_APIS

## Features

- Search any city by name (for example Dodoma or Arusha).
- Current weather: temperature, feels-like, humidity, wind speed and rain chance.
- 7-day forecast shown as cards.
- **Sort** the forecast by date, hottest first, coolest first, or most rain first.
- **Filter** to show rainy days only.
- Error messages for an empty search, a city that is not found, and an API or network failure.

## API used

**Open-Meteo** provides the weather data. It is free and needs no API key, so there are no secrets in this repository.

- Website: https://open-meteo.com/
- Forecast API docs: https://open-meteo.com/en/docs
- Geocoding API docs: https://open-meteo.com/en/docs/geocoding-api

Credit goes to the Open-Meteo developers. Open-Meteo data is offered under CC BY 4.0.

## Credentials

The app needs no API key and has no login, so there are no credentials to enter.

## Tech stack

Plain HTML, CSS and JavaScript (no frameworks, no build step).

- `index.html`: page structure
- `styles.css`: styling
- `app.js`: API calls, sorting, filtering and error handling

## Run it locally

1. Clone the repository:
   ```
   git clone https://github.com/hotay11/Playing_around_with_APIS.git
   cd Playing_around_with_APIS
   ```
2. Open `index.html` in a browser. You need an internet connection because the app calls Open-Meteo.
3. Type a city name and press **Search**.

## Deployment

The app is a static site served by nginx on two web servers, with HAProxy on a third server balancing traffic between them.

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
5. Copy the app to the web root: `sudo cp -r ~/Playing_around_with_APIS/* /var/www/html/`
6. Add a header that shows which server answered. In `/etc/nginx/sites-enabled/default`, inside the `server { ... }` block, add `add_header X-Served-By web01;` (use `web02` on Web02).
7. Test and reload: `sudo nginx -t && sudo service nginx reload`
8. Confirm with `curl -I localhost`, which should show the `X-Served-By` header.

To update after a code change: run `git pull` on both servers, then repeat the copy command in step 5.

### Load balancer (Lb01)

1. Connect with SSH and install HAProxy: `sudo apt install haproxy -y`
2. In `/etc/haproxy/haproxy.cfg`, the backend lists both web servers and uses round-robin:
   ```
   backend web_servers
       balance roundrobin
       server 7281-web-01 18.134.228.22:80 check
       server 7281-web-02 18.170.29.61:80 check
   ```
3. The frontend on port 80 redirects to HTTPS, and the HTTPS frontend (port 443, with the certificate for joshuahotay.tech) sends traffic to `web_servers`.
4. Check the config and restart: `sudo haproxy -c -f /etc/haproxy/haproxy.cfg && sudo service haproxy restart`

The `check` option makes HAProxy health-check each server and stop sending traffic to one that is down.

### Testing that traffic is balanced

Running this on Lb01 several times:

```
curl -skI https://localhost
```

returned `x-served-by: web01`, then `web02`, then `web01`. This shows the load balancer alternates between the two servers, and the app loads normally whichever one answers.

## Challenges and how I solved them

- **Git inside OneDrive.** My first clone failed because OneDrive locked files in the `.git` folder. I moved my work out of OneDrive-synced problem paths and re-did the repository setup.
- **Wrong repository structure.** My first push put `index.html` inside a subfolder because git had been started in the parent folder. I removed the extra `.git`, ran `git init` inside the project folder, and force-pushed so the repo root contains only the project files.
- **Missing tools on the servers.** Web01 had no `git`, and neither server had `nano`. I installed them with `apt`.
- **Duplicate HAProxy backend.** HAProxy refused to start because `backend web_servers` was defined twice, once in the existing config and once in mine. I read the file with `cat -n`, deleted my duplicate block, and the config check passed.
- **Testing through HTTPS.** The load balancer redirects port 80 to HTTPS, so I tested with `curl -skI https://localhost` instead of plain HTTP.

## Credits

- **Open-Meteo** for the weather and geocoding data: https://open-meteo.com/
- **Google Fonts** for the Inter typeface: https://fonts.google.com/specimen/Inter
- **nginx** (https://nginx.org/) and **HAProxy** (https://www.haproxy.org/) for serving and load balancing.

## Author

Joshua Stanley Hotay
