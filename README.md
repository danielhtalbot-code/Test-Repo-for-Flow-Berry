# Flow Berry demo site

A clickable mock of the Flow Berry platform for investors and partners. Plain HTML, CSS and JavaScript: no build step, no backend, nothing stored. Every pharmacy, grower, doctor, patient and product is fictional.

## Views

| View | Link | Shows |
|---|---|---|
| Overview | `#/` | What the platform does and how an order moves |
| Doctor | `#/doctor`, `#/product/p2` | Compare products, stock and pharmacy prices; select for a patient |
| Pharmacy | `#/pharmacy`, `#/growers/g1` | Order queue, own prices and listings, grower directory, trade prices and stock requests |
| Grower | `#/grower` | Switch between growers; stock requests, products (add, price, units, show or hide), stocking pharmacies, recalls, apply to join |
| Patient | `#/patient` | Choose a pharmacy, pay price + A$1.99 fee, track the order |
| Admin | `#/admin` | Month 12 figures from the pitch deck base case, verification, safety reports |

Clicks change data in memory only. Reload to reset. Edit the mock data in `assets/data.js`.

## Run locally

Open `index.html` in a browser, or run `python3 -m http.server` in this folder and go to http://localhost:8000.

## Host it

- **GitHub Pages:** push this folder to a repo, then Settings → Pages → Deploy from a branch → `main` / root. The site appears at `https://<user>.github.io/<repo>/`. On a free GitHub plan the repo must be public.
- **Netlify or Cloudflare Pages:** connect the repo (private repos work), no build command, publish directory `/`. Or drag the folder onto https://app.netlify.com/drop.

## Keep it private

Share the link only with investors and partners. The page tells search engines not to index it, but anyone with the link can open it. Real product information must only be shown to health professionals, so keep this demo on fictional data.
