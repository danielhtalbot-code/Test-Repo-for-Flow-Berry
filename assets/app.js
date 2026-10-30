/* Flow Berry demo. Plain JavaScript with no build step and no network calls.
   Clicks change data in memory only. Reloading the page resets everything. */
(function () {
  "use strict";

  const M = window.MOCK;
  const app = document.getElementById("app");
  const modal = document.getElementById("modal");
  const toastEl = document.getElementById("toast");

  const HOME_PHARMACY = "ph1"; // the signed-in pharmacy in the demo
  const HOME_GROWER = "g1"; // the grower shown first in the grower view
  const PATIENT_PRODUCT = "p2"; // the demo patient's prescription
  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.5c1.6 2.4 1.6 4.6 0 7" stroke="#1F6F6B" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="10.8" cy="15" r="5.6" fill="#C24A7A"/><circle cx="21.2" cy="15" r="5.6" fill="#A83A66"/><circle cx="16" cy="23.2" r="5.6" fill="#8E2D52"/></svg>';

  /* ---------- Helpers ---------- */
  const byId = (list, id) => list.find((x) => x.id === id);
  const product = (id) => byId(M.products, id);
  const pharmacy = (id) => byId(M.pharmacies, id);
  const grower = (id) => byId(M.growers, id);
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const aud = (n, cents) => "A$" + Number(n).toLocaleString("en-AU", cents || !Number.isInteger(n) ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {});
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const listed = (pid) => M.availability[pid].filter((r) => r.listed !== false);
  const listing = (pid, ph) => M.availability[pid].find((r) => r.ph === ph);
  const growerProducts = (gid) => M.products.filter((p) => p.grower === gid);
  const shownProducts = (gid) => growerProducts(gid).filter((p) => p.shown !== false);
  const stockists = (gid) => [...new Set(growerProducts(gid).flatMap((p) => M.availability[p.id].map((r) => r.ph)))];

  const CATEGORY = {
    1: ["CBD product", "CBD 98% or more of cannabinoids"],
    2: ["CBD dominant", "CBD 60–98% of cannabinoids"],
    3: ["Balanced", "CBD 40–60% of cannabinoids"],
    4: ["THC dominant", "CBD 2–40% of cannabinoids"],
    5: ["THC product", "THC over 98% of cannabinoids"]
  };
  const SCHEDULE = { S4: "Schedule 4, prescription only", S8: "Schedule 8, controlled drug" };
  const FORMS = ["Dried flower", "Oral oil", "Pastille", "Capsule"];
  const PILL = {
    "In stock": "ok", "Low stock": "warn", "Out of stock": "out", "Ships in 2 days": "info",
    Requested: "new", Confirmed: "info", Dispatched: "ok",
    Checking: "info", "Needs documents": "warn", Approved: "ok",
    Open: "new", "With grower": "warn", Closed: "ok",
    Verified: "ok", "Documents due": "warn"
  };
  const pill = (s) => `<span class="pill ${PILL[s] || ""}">${esc(s)}</span>`;
  const sched = (s) => `<span class="sched${s === "S4" ? " s4" : ""}" title="${SCHEDULE[s]}">${s}</span>`;
  const unitsPill = (u) => `<span class="pill ${u === 0 ? "out" : u < 30 ? "warn" : "ok"}">${u === 0 ? "Out of stock" : `${u} units`}</span>`;

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  // Opens a dialog. The confirm button runs onOk with the form data. Cancel and Escape do nothing.
  function openModal(html, okLabel, onOk) {
    modal.innerHTML = `<form method="dialog" class="dlg">${html}
      <div class="actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="ok">${esc(okLabel)}</button></div></form>`;
    modal.returnValue = "";
    modal.onclose = () => { if (modal.returnValue === "ok") onOk(new FormData(modal.querySelector("form"))); };
    modal.showModal();
  }

  // Re-render helpers move focus back to the control the person was using.
  function refocus(sel) {
    const el = sel && app.querySelector(sel);
    if (el) el.focus();
  }

  // Tabs: click or arrow keys switch; go(key) re-renders the page.
  const tabsHtml = (tabs, current, label) => `<div class="tabs" role="tablist" aria-label="${label}">${tabs.map(([k, text]) => `<button type="button" role="tab" id="tab-${k}" aria-controls="panel" aria-selected="${k === current}" tabindex="${k === current ? 0 : -1}" data-tab="${k}">${text}</button>`).join("")}</div>`;
  function wireTabs(go) {
    const els = [...app.querySelectorAll('[role="tab"]')];
    els.forEach((el, i) => {
      el.addEventListener("click", () => go(el.dataset.tab));
      el.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        go(els[(i + step + els.length) % els.length].dataset.tab);
      });
    });
  }

  /* ---------- Overview ---------- */
  const STEPS = [
    ["Pharmacies list products", "Each pharmacy lists what it can dispense and sets its own prices."],
    ["Doctors compare and select", "Doctors compare stock and prices across pharmacies, then prescribe in their usual software."],
    ["Patients choose and pay", `Patients open their own prescription, choose a pharmacy and pay its price plus a ${aud(M.fee)} fee.`],
    ["Pharmacists dispense", "The pharmacist checks the eScript, dispenses, then hands over or sends the order."],
    ["Pharmacies restock", "Pharmacies order more stock from licensed growers in the same place."]
  ];
  const ROLES = [
    ["Doctors", "Compare products, stock and prices. Free prescriber course from an independent provider.", "#/doctor", "Open the doctor view"],
    ["Pharmacies", "List products, set prices, work the order queue and order stock from growers.", "#/pharmacy", "Open the pharmacy view"],
    ["Licensed growers", "List products and trade prices, fill stock orders, see which pharmacies stock them and run recalls. Patients never see grower listings.", "#/grower", "Open the grower view"],
    ["Patients", "See only their own prescription, choose a pharmacy, pay and track the order.", "#/patient", "Open patient checkout"],
    ["Flow Berry team", "Verify every professional, route safety reports and track growth.", "#/admin", "Open the admin view"]
  ];
  const RULES = [
    "Product details are shown only to verified doctors and pharmacists.",
    "Patients see only their own prescription and always choose the pharmacy.",
    "No reviews, ratings or claims about what a product treats.",
    "No payments to prescribers and no paid placement in results."
  ];
  const ORDER_STATUS = {
    new: ["Paid, waiting for the pharmacist", "new"],
    checking: ["Pharmacist checking the eScript", "info"],
    ready: ["Ready to collect or send", "ok"],
    done: ["Collected or sent", "ok"]
  };

  function home() {
    const o = M.orders.find((x) => x.id === "FB-10431");
    const p = product(o.product);
    const ph = pharmacy(HOME_PHARMACY);
    const [statusText, statusPill] = ORDER_STATUS[o.status];
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>From prescriber to pharmacy, in one workflow</h1>
          <p class="lede">Flow Berry is a professional platform for medicinal cannabis in NSW. Doctors compare products and pharmacy prices, patients pay for their own prescription, and pharmacies dispense and restock from licensed growers.</p>
          <div class="actions"><a class="btn" href="#/doctor">Open the doctor view</a><a class="btn ghost" href="#/patient">See patient checkout</a></div>
        </div>
        <article class="label hero-label print" aria-label="Example order ${o.id}">
          <header><div><div class="name">${esc(ph.name)}</div><div class="muted small">${esc(ph.suburb)} NSW</div></div><span class="muted small">${o.id}</span></header>
          <div class="label-main"><span class="rx" aria-hidden="true">Rx</span><div><div class="name big-name">${esc(p.name)}</div><div class="muted small">${esc(p.form)}, ${esc(p.pack)}</div></div>${sched(p.schedule)}</div>
          <dl class="fields">
            <dt>Prescriber</dt><dd>Dr Priya Nair</dd>
            <dt>Patient</dt><dd>${esc(o.ref)}</dd>
            <dt>eScript</dt><dd>Token received</dd>
            <dt>Paid</dt><dd>${aud(listing(p.id, ph.id).price, true)} + ${aud(M.fee)} service fee</dd>
            <dt>Status</dt><dd><span class="pill ${statusPill}">${statusText}</span></dd>
          </dl>
          <footer>Keep out of reach of children</footer>
        </article>
      </section>
      <section class="band" aria-labelledby="h-flow">
        <h2 id="h-flow">How an order moves</h2>
        <ol class="steps">${STEPS.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join("")}</ol>
      </section>
      <section class="band" aria-labelledby="h-roles">
        <h2 id="h-roles">Who uses it</h2>
        <ul class="role-rows">${ROLES.map(([t, d, href, cta]) => `<li><div><h3>${t}</h3><p>${d}</p></div><a href="${href}">${cta}</a></li>`).join("")}</ul>
      </section>
      <section class="band" aria-labelledby="h-rules">
        <h2 id="h-rules">Rules built in</h2>
        <ul class="rules">${RULES.map((r) => `<li>${r}</li>`).join("")}</ul>
      </section>`;
  }

  /* ---------- Doctor: compare products ---------- */
  const filters = { q: "", forms: [], schedule: "", category: "" };

  function productCard(p) {
    const rows = listed(p.id);
    const from = Math.min(...rows.map((r) => r.price));
    return `<a class="label" href="#/product/${p.id}">
      <header><div><div class="name">${esc(p.name)}</div><div class="muted small">${esc(grower(p.grower).name)}</div></div>${sched(p.schedule)}</header>
      <dl class="fields">
        <dt>Form</dt><dd>${esc(p.form)}, ${esc(p.pack)}</dd>
        <dt>Strength</dt><dd>${esc(p.strength)}</dd>
        <dt>Category</dt><dd>${p.category}, ${CATEGORY[p.category][0]}</dd>
      </dl>
      <footer>${plural(rows.length, "pharmacy", "pharmacies")} from ${aud(from)}</footer>
    </a>`;
  }

  function doctorPage() {
    // Doctors only see products that at least one pharmacy lists.
    const pool = M.products.filter((p) => listed(p.id).length);
    const forms = [...new Set(pool.map((p) => p.form))];
    app.innerHTML = `
      <div class="page-head">
        <div><h1>Compare products</h1><p class="muted">Signed in as Dr Priya Nair, Surry Hills. Compare products, stock and prices across NSW pharmacies, then prescribe in your usual software.</p></div>
        <aside class="note"><p><b>Free prescriber course</b></p><p>Run by an independent education provider. Flow Berry doesn't pay or reward prescribers.</p><button class="textlink" type="button" data-demo="The course is run by a third party and isn't part of the demo">Open the course</button></aside>
      </div>
      <div class="split">
        <form class="filters" role="search" aria-label="Filter products">
          <label class="field-label" for="q">Search</label>
          <input id="q" name="q" type="search" placeholder="Name or grower" value="${esc(filters.q)}">
          <fieldset><legend>Form</legend><div class="chips">${forms.map((f) => `<label class="chip"><input type="checkbox" name="form" value="${esc(f)}"${filters.forms.includes(f) ? " checked" : ""}><span>${esc(f)}</span></label>`).join("")}</div></fieldset>
          <fieldset><legend>Schedule</legend><div class="chips">${[["", "Any"], ["S4", "S4"], ["S8", "S8"]].map(([v, t]) => `<label class="chip"><input type="radio" name="schedule" value="${v}"${filters.schedule === v ? " checked" : ""}><span>${t}</span></label>`).join("")}</div></fieldset>
          <div class="filter-group"><label class="field-label" for="cat">TGA category</label>
            <select id="cat" name="category"><option value="">Any category</option>${Object.entries(CATEGORY).map(([k, [n]]) => `<option value="${k}"${filters.category === k ? " selected" : ""}>${k}, ${n}</option>`).join("")}</select></div>
        </form>
        <section aria-label="Products">
          <p class="count" aria-live="polite"></p>
          <div class="products"></div>
        </section>
      </div>`;

    const form = app.querySelector(".filters");
    const grid = app.querySelector(".products");
    const count = app.querySelector(".count");
    const draw = () => {
      const q = filters.q.trim().toLowerCase();
      const items = pool.filter((p) =>
        (!q || [p.name, grower(p.grower).name, p.strength, p.form].join(" ").toLowerCase().includes(q)) &&
        (!filters.forms.length || filters.forms.includes(p.form)) &&
        (!filters.schedule || p.schedule === filters.schedule) &&
        (!filters.category || String(p.category) === filters.category));
      count.textContent = `Showing ${items.length} of ${pool.length} products`;
      grid.innerHTML = items.length
        ? items.map(productCard).join("")
        : `<div class="empty"><p><b>No products match these filters.</b></p><button class="btn ghost small" type="button" data-clear>Clear filters</button></div>`;
    };
    const read = () => {
      const fd = new FormData(form);
      filters.q = fd.get("q") || "";
      filters.forms = fd.getAll("form");
      filters.schedule = fd.get("schedule") || "";
      filters.category = fd.get("category") || "";
      draw();
    };
    form.addEventListener("submit", (e) => e.preventDefault());
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    grid.addEventListener("click", (e) => {
      if (!e.target.closest("[data-clear]")) return;
      Object.assign(filters, { q: "", forms: [], schedule: "", category: "" });
      doctorPage();
      refocus("#q");
    });
    draw();
  }

  /* ---------- Doctor: one product ---------- */
  function productPage(id) {
    const p = product(id);
    if (!p) {
      app.innerHTML = `<div class="empty"><p><b>That product isn't in the demo.</b></p><a class="btn" href="#/doctor">Back to products</a></div>`;
      return;
    }
    const g = grower(p.grower);
    const rows = listed(p.id).slice().sort((a, b) => a.price - b.price);
    const [catName, catRule] = CATEGORY[p.category];
    const docBtn = (t) => `<li><button class="textlink" type="button" data-demo="Documents aren't included in the demo">${t}</button></li>`;
    app.innerHTML = `
      <a class="back" href="#/doctor">Back to products</a>
      <div class="product-layout">
        <article class="label big">
          <header><div><h1>${esc(p.name)}</h1><div class="muted">${esc(g.name)}, ${esc(g.region)}</div></div>${sched(p.schedule)}</header>
          <dl class="fields">
            <dt>Form</dt><dd>${esc(p.form)}, ${esc(p.pack)}</dd>
            <dt>Composition</dt><dd>${esc(p.strength)}</dd>
            <dt>TGA category</dt><dd>${p.category}, ${catName} (${catRule})</dd>
            <dt>Schedule</dt><dd>${SCHEDULE[p.schedule]}</dd>
            <dt>Access</dt><dd>Unapproved product. Prescribe under SAS-B or as an Authorised Prescriber.</dd>
            <dt>Grower licence</dt><dd>${esc(g.licence)}</dd>
          </dl>
          <div class="docs"><h2>Documents</h2><ul>${docBtn("Certificate of analysis")}${docBtn("Product information sheet")}${docBtn("Storage and handling")}</ul></div>
        </article>
        <section aria-labelledby="h-av">
          <h2 id="h-av">${rows.length ? `Listed by ${plural(rows.length, "pharmacy", "pharmacies")}` : "No pharmacy lists this right now"}</h2>
          ${rows.length ? `<div class="table-wrap"><table class="tbl">
            <thead><tr><th scope="col">Pharmacy</th><th scope="col">Supply</th><th scope="col">Stock</th><th scope="col" class="num">Price</th></tr></thead>
            <tbody>${rows.map((r) => {
              const ph = pharmacy(r.ph);
              return `<tr><td><b>${esc(ph.name)}</b><span class="cell-sub">${esc(ph.suburb)}</span></td><td>${esc(ph.mode)}</td><td>${pill(r.stock)}</td><td class="num">${aud(r.price)}</td></tr>`;
            }).join("")}</tbody>
          </table></div>` : ""}
          <p class="muted small">Each pharmacy sets its own price. Patients pay that price plus a ${aud(M.fee)} service fee.</p>
          <div class="select-panel">
            <h2>Prescribing this?</h2>
            <p>Select it for your patient, then write the eScript in your usual prescribing software. Your patient gets a link to view the prescription and choose a pharmacy.</p>
            <button class="btn" type="button" id="select">Select for a patient</button>
          </div>
        </section>
      </div>`;

    app.querySelector("#select").addEventListener("click", () => openModal(`
      <h2>Select for a patient</h2>
      <p class="muted">${esc(p.name)}. Your patient gets a link to view this prescription and choose a pharmacy.</p>
      <label for="m-contact">Patient mobile or email</label>
      <input id="m-contact" name="contact" type="text" required autocomplete="off" placeholder="0400 000 000">
      <label for="m-ph">Pharmacy with stock (optional)</label>
      <select id="m-ph" name="ph"><option value="">None. The patient chooses.</option>${rows.map((r) => `<option value="${r.ph}">${esc(pharmacy(r.ph).name)}, ${aud(r.price)}</option>`).join("")}</select>
      <p class="muted small">Patients can always choose a different pharmacy.</p>`,
      "Send link", () => toast("Link sent to your patient (demo)")));
  }

  /* ---------- Pharmacy ---------- */
  const pharmacyState = { tab: "orders" };
  let nextPo = 2215;
  const COLUMNS = [
    { key: "new", title: "New", next: "checking", action: () => "Start eScript check", done: (o) => `eScript check started for ${o.id}` },
    { key: "checking", title: "Checking eScript", next: "ready", action: () => "Mark ready", done: (o) => `${o.id} marked ready. Patient notified.` },
    { key: "ready", title: "Ready", next: "done", action: (o) => (o.mode === "Pickup" ? "Mark collected" : "Mark sent"), done: (o) => `${o.id} marked ${o.mode === "Pickup" ? "collected" : "sent"}` },
    { key: "done", title: "Collected or sent" }
  ];

  function ticket(o, col) {
    const p = product(o.product);
    return `<div class="ticket">
      <div class="row"><b>${o.id}</b><span class="muted">${esc(o.time)}</span></div>
      <div class="prod">${esc(p.name)} ${sched(p.schedule)}</div>
      <div class="row muted"><span>${esc(o.ref)}</span><span>${esc(o.mode)}</span></div>
      ${col.next ? `<button class="btn small" type="button" data-advance="${o.id}">${col.action(o)}</button>` : ""}
    </div>`;
  }

  function ordersPanel() {
    return `<div class="board">${COLUMNS.map((c) => {
      const items = M.orders.filter((o) => o.status === c.key);
      return `<section class="col" aria-labelledby="col-${c.key}"><h2 id="col-${c.key}">${c.title} <span class="muted">${items.length}</span></h2>${items.map((o) => ticket(o, c)).join("") || `<p class="muted small">Nothing here.</p>`}</section>`;
    }).join("")}</div>`;
  }

  function listingsPanel(mine) {
    const stockOptions = ["In stock", "Low stock", "Out of stock", "Ships in 2 days"];
    return `<p class="muted">Set your own prices. Prescribers see every product you show, with your price and stock.</p>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th scope="col">Product</th><th scope="col">Schedule</th><th scope="col">Your price</th><th scope="col">Stock</th><th scope="col">Shown to prescribers</th></tr></thead>
        <tbody>${mine.map((pid) => {
          const p = product(pid), r = listing(pid, HOME_PHARMACY), on = r.listed !== false;
          return `<tr data-pid="${pid}">
            <td><b>${esc(p.name)}</b><span class="cell-sub">${esc(grower(p.grower).name)}</span></td>
            <td>${sched(p.schedule)}</td>
            <td><label class="sr-only" for="price-${pid}">Price for ${esc(p.name)}</label><span class="money">A$<input class="price-input" id="price-${pid}" type="number" min="1" step="1" value="${r.price}" data-field="price"></span></td>
            <td><label class="sr-only" for="stock-${pid}">Stock for ${esc(p.name)}</label><select id="stock-${pid}" data-field="stock">${stockOptions.map((s) => `<option${s === r.stock ? " selected" : ""}>${s}</option>`).join("")}</select></td>
            <td><label class="switch"><input type="checkbox" id="listed-${pid}" data-field="listed"${on ? " checked" : ""}><span>${on ? "Shown" : "Hidden"}</span></label></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>`;
  }

  function growerCard(g) {
    return `<a class="label" href="#/growers/${g.id}">
      <header><div><div class="name">${esc(g.name)}</div><div class="muted small">${esc(g.region)}</div></div>${pill(g.status)}</header>
      <dl class="fields">
        <dt>Licence</dt><dd>${esc(g.licence)}</dd>
        <dt>Products</dt><dd>${shownProducts(g.id).length} listed</dd>
        <dt>Dispatch</dt><dd>${esc(g.leadTime)}</dd>
        <dt>Minimum order</dt><dd>${g.minOrder} units</dd>
        <dt>Delivers to</dt><dd>${esc(g.delivers)}</dd>
      </dl>
      <footer>View products and trade prices</footer>
    </a>`;
  }

  function growersPanel(myOrders) {
    return `<div class="stack">
      <section aria-labelledby="h-growers">
        <h2 id="h-growers">Licensed growers</h2>
        <p class="muted">Order stock straight from licensed growers and sponsors. Trade prices exclude GST.</p>
        <div class="cards">${M.growers.map(growerCard).join("")}</div>
      </section>
      <section aria-labelledby="h-pos">
        <h2 id="h-pos">Your stock orders</h2>
        ${myOrders.length ? `<div class="table-wrap"><table class="tbl">
          <thead><tr><th scope="col">Order</th><th scope="col">Product</th><th scope="col" class="num">Quantity</th><th scope="col" class="num">Value, ex GST</th><th scope="col">Status</th></tr></thead>
          <tbody>${myOrders.map((s) => {
            const p = product(s.product);
            return `<tr><td>${s.po}</td><td><b>${esc(p.name)}</b><span class="cell-sub">${esc(grower(p.grower).name)}</span></td><td class="num">${s.qty}</td><td class="num">${aud(s.qty * (s.trade || p.trade))}</td><td>${pill(s.status)}</td></tr>`;
          }).join("")}</tbody>
        </table></div>` : `<p class="muted">No stock orders yet.</p>`}
      </section>
    </div>`;
  }

  function pharmacyPage(focusSel) {
    const ph = pharmacy(HOME_PHARMACY);
    const mine = Object.keys(M.availability).filter((pid) => listing(pid, ph.id));
    const shown = () => mine.filter((pid) => listing(pid, ph.id).listed !== false).length;
    const myOrders = M.stockOrders.filter((s) => s.ph === ph.id);
    const t = pharmacyState.tab;
    const tabs = [["orders", "Orders"], ["listings", "Products and prices"], ["growers", "Growers"]];
    const panels = { orders: ordersPanel, listings: () => listingsPanel(mine), growers: () => growersPanel(myOrders) };
    app.innerHTML = `
      <div class="page-head">
        <div><h1>${esc(ph.name)}</h1><p class="muted">${esc(ph.suburb)} NSW. ${esc(ph.mode)}.</p></div>
        <div class="stats">
          <div class="stat"><b>${M.orders.filter((o) => o.status !== "done").length}</b><span>open orders</span></div>
          <div class="stat"><b data-stat="shown">${shown()}</b><span>products shown</span></div>
          <div class="stat"><b>${myOrders.filter((s) => s.status !== "Dispatched").length}</b><span>stock orders open</span></div>
        </div>
      </div>
      ${tabsHtml(tabs, t, "Pharmacy sections")}
      <div id="panel" role="tabpanel" tabindex="-1" aria-labelledby="tab-${t}">${panels[t]()}</div>`;

    wireTabs((k) => { pharmacyState.tab = k; pharmacyPage(`#tab-${k}`); });
    const panel = app.querySelector("#panel");
    panel.addEventListener("click", (e) => {
      const adv = e.target.closest("[data-advance]");
      if (!adv) return;
      const o = M.orders.find((x) => x.id === adv.dataset.advance);
      const col = COLUMNS.find((c) => c.key === o.status);
      o.status = col.next;
      pharmacyPage(`[data-advance="${o.id}"]`);
      toast(col.done(o));
    });
    panel.addEventListener("change", (e) => {
      const el = e.target, tr = el.closest("tr[data-pid]");
      if (!tr) return;
      const p = product(tr.dataset.pid), r = listing(p.id, HOME_PHARMACY);
      if (el.dataset.field === "price") {
        const v = Math.round(Number(el.value));
        if (el.value === "" || !(v >= 1)) { el.value = r.price; toast("Enter a price of A$1 or more"); return; }
        r.price = v;
        el.value = v;
        toast(`Price saved for ${p.name}`);
      } else if (el.dataset.field === "stock") {
        r.stock = el.value;
        toast(`Stock updated for ${p.name}`);
      } else if (el.dataset.field === "listed") {
        r.listed = el.checked;
        el.nextElementSibling.textContent = el.checked ? "Shown" : "Hidden";
        app.querySelector('[data-stat="shown"]').textContent = shown();
        toast(`${p.name} ${el.checked ? "shown to" : "hidden from"} prescribers`);
      }
    });
    refocus(focusSel);
  }

  /* ---------- Pharmacy: one grower's products and trade prices ---------- */
  function requestStock(p, after) {
    const g = grower(p.grower);
    const max = Math.max(g.minOrder, p.units);
    openModal(`<h2>Request stock</h2>
      <p class="muted">${esc(p.name)} from ${esc(g.name)}. ${aud(p.trade)} a unit, ex GST. Minimum order ${g.minOrder} units.</p>
      <label for="m-qty">Quantity</label><input id="m-qty" name="qty" type="number" min="${g.minOrder}" max="${max}" value="${Math.min(Math.max(g.minOrder, 10), max)}" required>
      <label for="m-note">Delivery note (optional)</label><input id="m-note" name="note" type="text" autocomplete="off">`,
      "Send request", (fd) => {
        M.stockOrders.unshift({ po: `PO-${nextPo++}`, ph: HOME_PHARMACY, product: p.id, qty: Number(fd.get("qty")), trade: p.trade, status: "Requested" });
        after();
        toast(`Stock request sent to ${g.name} (demo)`);
      });
  }

  function supplierPage(gid) {
    pharmacyState.tab = "growers";
    if (!gid) { pharmacyPage(); return; }
    const g = grower(gid);
    if (!g) {
      app.innerHTML = `<div class="empty"><p><b>That grower isn't in the demo.</b></p><a class="btn" href="#/pharmacy">Back to growers</a></div>`;
      return;
    }
    const prods = shownProducts(g.id);
    app.innerHTML = `
      <a class="back" href="#/pharmacy">Back to growers</a>
      <div class="page-head start">
        <div><h1>${esc(g.name)}</h1><p class="muted">${esc(g.about)}</p><p class="muted small">Ordering as ${esc(pharmacy(HOME_PHARMACY).name)}. Trade prices exclude GST.</p></div>
        <article class="label terms" aria-labelledby="h-terms">
          <header><div class="name" id="h-terms">Trading terms</div>${pill(g.status)}</header>
          <dl class="fields">
            <dt>Licence</dt><dd>${esc(g.licence)}</dd>
            <dt>Based in</dt><dd>${esc(g.region)}</dd>
            <dt>Dispatch</dt><dd>${esc(g.leadTime)}</dd>
            <dt>Minimum order</dt><dd>${g.minOrder} units</dd>
            <dt>Delivers to</dt><dd>${esc(g.delivers)}</dd>
          </dl>
        </article>
      </div>
      <h2>Products</h2>
      ${prods.length ? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th scope="col">Product</th><th scope="col">Composition</th><th scope="col">Schedule</th><th scope="col">Available</th><th scope="col" class="num">Trade price</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead>
        <tbody>${prods.map((p) => `<tr><td><b>${esc(p.name)}</b><span class="cell-sub">${esc(p.form)}, ${esc(p.pack)}</span></td><td>${esc(p.strength)}</td><td>${sched(p.schedule)}</td><td>${unitsPill(p.units)}</td><td class="num">${aud(p.trade)}</td><td><button class="btn small ghost" type="button" data-request="${p.id}"${p.units ? "" : " disabled"}>Request stock</button></td></tr>`).join("")}</tbody>
      </table></div>` : `<p class="muted">This grower isn't showing any products right now.</p>`}`;

    app.querySelectorAll("[data-request]").forEach((b) => b.addEventListener("click", () => {
      const pid = b.dataset.request;
      requestStock(product(pid), () => { supplierPage(g.id); refocus(`[data-request="${pid}"]`); });
    }));
  }

  /* ---------- Grower ---------- */
  const growerState = { id: HOME_GROWER, tab: "requests" };
  let nextProduct = M.products.length + 1;
  const PO_NEXT = {
    Requested: ["Confirm", "Confirmed", (s) => `${s.po} confirmed`],
    Confirmed: ["Mark dispatched", "Dispatched", (s) => `${s.po} marked dispatched`]
  };

  function requestsPanel(reqs) {
    if (!reqs.length) return `<p class="muted">No stock requests yet. Pharmacies can request any product you show.</p>`;
    return `<div class="table-wrap"><table class="tbl">
      <thead><tr><th scope="col">Order</th><th scope="col">Pharmacy</th><th scope="col">Product</th><th scope="col" class="num">Quantity</th><th scope="col" class="num">Value, ex GST</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead>
      <tbody>${reqs.map((s) => {
        const ph = pharmacy(s.ph), p = product(s.product), next = PO_NEXT[s.status];
        return `<tr><td>${s.po}</td><td><b>${esc(ph.name)}</b><span class="cell-sub">${esc(ph.suburb)}</span></td><td>${esc(p.name)}</td><td class="num">${s.qty}</td><td class="num">${aud(s.qty * (s.trade || p.trade))}</td><td>${pill(s.status)}</td><td>${next ? `<button class="btn small" type="button" data-po="${s.po}">${next[0]}</button>` : ""}</td></tr>`;
      }).join("")}</tbody>
    </table></div>`;
  }

  function growerProductsPanel(prods) {
    return `<div class="section-head"><p class="muted">Pharmacies see your trade prices and units available. Changes apply straight away.</p><button class="btn small" type="button" id="add-product">Add a product</button></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th scope="col">Product</th><th scope="col">Schedule</th><th scope="col">Trade price, ex GST</th><th scope="col">Units on hand</th><th scope="col">Current batch</th><th scope="col">Shown to pharmacies</th></tr></thead>
        <tbody>${prods.map((p) => {
          const on = p.shown !== false;
          return `<tr data-pid="${p.id}">
            <td><b>${esc(p.name)}</b><span class="cell-sub">${esc(p.form)}, ${esc(p.pack)}. ${esc(p.strength)}</span></td>
            <td>${sched(p.schedule)}</td>
            <td><label class="sr-only" for="trade-${p.id}">Trade price for ${esc(p.name)}</label><span class="money">A$<input class="price-input" id="trade-${p.id}" type="number" min="1" step="1" value="${p.trade}" data-field="trade"></span></td>
            <td><label class="sr-only" for="units-${p.id}">Units on hand for ${esc(p.name)}</label><input class="price-input" id="units-${p.id}" type="number" min="0" step="1" value="${p.units}" data-field="units"></td>
            <td>${p.batch ? `${esc(p.batch)}<span class="cell-sub">Expires ${esc(p.expiry)}. <button class="textlink" type="button" data-demo="Certificates aren't included in the demo">Certificate of analysis</button></span>` : `<span class="muted">No batch yet. <button class="textlink" type="button" data-demo="Uploads aren't included in the demo">Add a batch</button></span>`}</td>
            <td><label class="switch"><input type="checkbox" id="shown-${p.id}" data-field="shown"${on ? " checked" : ""}><span>${on ? "Shown" : "Hidden"}</span></label></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>`;
  }

  function stockistsPanel(g, phs) {
    if (!phs.length) return `<p class="muted">No pharmacies stock your products yet. Pharmacies can order anything you show.</p>`;
    return `<div class="table-wrap"><table class="tbl">
      <thead><tr><th scope="col">Pharmacy</th><th scope="col">Your products they list</th><th scope="col">Latest stock order</th></tr></thead>
      <tbody>${phs.map((id) => {
        const ph = pharmacy(id);
        const names = growerProducts(g.id).filter((p) => listing(p.id, id)).map((p) => esc(p.name)).join(", ");
        const last = M.stockOrders.find((s) => s.ph === id && product(s.product).grower === g.id);
        return `<tr><td><b>${esc(ph.name)}</b><span class="cell-sub">${esc(ph.suburb)}</span></td><td>${names}</td><td>${last ? `${last.po} ${pill(last.status)}` : `<span class="muted">None yet</span>`}</td></tr>`;
      }).join("")}</tbody>
    </table></div>`;
  }

  function recallsPanel(recalls) {
    return `<div class="section-head"><p class="muted">Every pharmacy that stocks a recalled batch is notified at once, along with prescribers who selected it.</p><button class="btn danger small" type="button" id="recall">Issue a recall</button></div>
      ${recalls.length ? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th scope="col">Product</th><th scope="col">Batch</th><th scope="col">Reason</th><th scope="col">Notified</th><th scope="col">Status</th></tr></thead>
        <tbody>${recalls.map((r) => `<tr><td><b>${esc(product(r.product).name)}</b></td><td>${esc(r.batch || "")}</td><td>${esc(r.reason || "")}</td><td>${esc(r.route)}</td><td>${pill(r.status)}</td></tr>`).join("")}</tbody>
      </table></div>` : `<p class="muted">No recalls.</p>`}`;
  }

  function addProduct(g) {
    openModal(`<h2>Add a product</h2>
      <p class="muted">Pharmacies can order it as soon as you add it. Doctors see it once a pharmacy lists it.</p>
      <label for="m-name">Product name</label><input id="m-name" name="name" type="text" required autocomplete="off">
      <label for="m-form">Form</label><select id="m-form" name="form">${FORMS.map((f) => `<option>${f}</option>`).join("")}</select>
      <label for="m-pack">Pack size</label><input id="m-pack" name="pack" type="text" required autocomplete="off" placeholder="10 g">
      <label for="m-str">Composition</label><input id="m-str" name="strength" type="text" required autocomplete="off" placeholder="THC 20%, CBD under 0.3%">
      <label for="m-cat">TGA category</label><select id="m-cat" name="category">${Object.entries(CATEGORY).map(([k, [n]]) => `<option value="${k}">${k}, ${n}</option>`).join("")}</select>
      <label for="m-sch">Schedule</label><select id="m-sch" name="schedule"><option value="S8">S8, controlled drug</option><option value="S4">S4, prescription only</option></select>
      <label for="m-trade">Trade price, ex GST (A$)</label><input id="m-trade" name="trade" type="number" min="1" step="1" required>
      <label for="m-units">Units on hand</label><input id="m-units" name="units" type="number" min="0" step="1" required>`,
      "Add product", (fd) => {
        const id = `p${nextProduct++}`;
        const name = String(fd.get("name")).trim();
        M.products.push({ id, name, grower: g.id, form: fd.get("form"), pack: String(fd.get("pack")).trim(), strength: String(fd.get("strength")).trim(), category: Number(fd.get("category")), schedule: fd.get("schedule"), trade: Math.round(Number(fd.get("trade"))), units: Math.round(Number(fd.get("units"))), batch: "", expiry: "" });
        M.availability[id] = [];
        growerState.tab = "products";
        growerPage("#add-product");
        toast(`${name} added. Pharmacies can now order it.`);
      });
  }

  function issueRecall(prods) {
    const withBatch = prods.filter((p) => p.batch);
    if (!withBatch.length) { toast("Add a batch before issuing a recall"); return; }
    openModal(`<h2>Issue a recall</h2>
      <p class="muted">Every pharmacy that stocks the product is notified at once, along with prescribers who selected it.</p>
      <label for="m-prod">Product</label><select id="m-prod" name="product">${withBatch.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
      <label for="m-batch">Batch number</label><input id="m-batch" name="batch" type="text" required autocomplete="off" value="${esc(withBatch[0].batch)}">
      <label for="m-reason">Reason</label><select id="m-reason" name="reason"><option>Quality defect</option><option>Labelling error</option><option>Possible contamination</option><option>Other</option></select>`,
      "Send recall", (fd) => {
        const p = product(fd.get("product"));
        const n = plural(M.availability[p.id].length, "pharmacy", "pharmacies");
        M.safety.unshift({ type: "Recall", product: p.id, batch: String(fd.get("batch")).trim(), reason: fd.get("reason"), route: `${n} and their prescribers notified`, status: "Open" });
        growerState.tab = "recalls";
        growerPage("#recall");
        toast(`Recall sent for ${p.name} to ${n} (demo)`);
      });
    const sel = modal.querySelector("#m-prod"), batch = modal.querySelector("#m-batch");
    sel.addEventListener("change", () => { batch.value = product(sel.value).batch; });
  }

  function applyToJoin() {
    openModal(`<h2>Apply to join as a grower</h2>
      <p class="muted">The Flow Berry team checks your licence before your products go live.</p>
      <label for="m-biz">Business name</label><input id="m-biz" name="name" type="text" required autocomplete="organization">
      <label for="m-lic">ODC licence number</label><input id="m-lic" name="licence" type="text" required autocomplete="off">
      <label for="m-role">How you supply</label><select id="m-role" name="role"><option>Licensed grower and sponsor</option><option>Licensed grower, supplying through a sponsor</option><option>Sponsor or importer</option></select>
      <label for="m-email">Contact email</label><input id="m-email" name="email" type="email" required autocomplete="email">`,
      "Send application", (fd) => {
        M.verification.unshift({ name: String(fd.get("name")).trim(), type: "Grower", check: "ODC licence and sponsor documents", status: "Checking" });
        toast("Application sent (demo). It's now in the admin verification queue.");
      });
  }

  function growerPage(focusSel) {
    const g = grower(growerState.id);
    const prods = growerProducts(g.id);
    const reqs = M.stockOrders.filter((s) => product(s.product).grower === g.id);
    const recalls = M.safety.filter((s) => s.type === "Recall" && product(s.product).grower === g.id);
    const phs = stockists(g.id);
    const t = growerState.tab;
    const tabs = [["requests", "Stock requests"], ["products", "Products"], ["pharmacies", "Pharmacies"], ["recalls", "Recalls"]];
    const panels = { requests: () => requestsPanel(reqs), products: () => growerProductsPanel(prods), pharmacies: () => stockistsPanel(g, phs), recalls: () => recallsPanel(recalls) };
    app.innerHTML = `
      <div class="page-head">
        <div><h1>${esc(g.name)}</h1><p class="muted">Licence ${esc(g.licence)}, ${esc(g.region)}. ${pill(g.status)}</p><p class="muted small">You sell to pharmacies. Patients never see grower listings.</p></div>
        <div class="viewas">
          <label for="viewas">Viewing as</label>
          <select id="viewas">${M.growers.map((x) => `<option value="${x.id}"${x.id === g.id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
          <button class="textlink" type="button" id="apply">New grower? Apply to join</button>
        </div>
      </div>
      <div class="stats below">
        <div class="stat"><b data-stat="shown">${shownProducts(g.id).length}</b><span>products shown</span></div>
        <div class="stat"><b>${phs.length}</b><span>pharmacies stocking</span></div>
        <div class="stat"><b>${reqs.filter((s) => s.status === "Requested").length}</b><span>requests waiting</span></div>
        <div class="stat"><b data-stat="units">${prods.reduce((n, p) => n + p.units, 0)}</b><span>units on hand</span></div>
      </div>
      ${tabsHtml(tabs, t, "Grower sections")}
      <div id="panel" role="tabpanel" tabindex="-1" aria-labelledby="tab-${t}">${panels[t]()}</div>`;

    wireTabs((k) => { growerState.tab = k; growerPage(`#tab-${k}`); });
    app.querySelector("#viewas").addEventListener("change", (e) => { growerState.id = e.target.value; growerPage("#viewas"); });
    app.querySelector("#apply").addEventListener("click", applyToJoin);

    const panel = app.querySelector("#panel");
    panel.addEventListener("click", (e) => {
      const po = e.target.closest("[data-po]");
      if (po) {
        const s = M.stockOrders.find((x) => x.po === po.dataset.po);
        const [, status, msg] = PO_NEXT[s.status];
        s.status = status;
        if (status === "Dispatched") {
          const p = product(s.product);
          p.units = Math.max(0, p.units - s.qty);
        }
        growerPage(`[data-po="${s.po}"]`);
        toast(msg(s));
      } else if (e.target.closest("#add-product")) {
        addProduct(g);
      } else if (e.target.closest("#recall")) {
        issueRecall(prods);
      }
    });
    panel.addEventListener("change", (e) => {
      const el = e.target, tr = el.closest("tr[data-pid]");
      if (!tr) return;
      const p = product(tr.dataset.pid), field = el.dataset.field;
      if (field === "trade" || field === "units") {
        const v = Math.round(Number(el.value)), min = field === "trade" ? 1 : 0;
        if (el.value === "" || !(v >= min)) {
          el.value = p[field];
          toast(field === "trade" ? "Enter a trade price of A$1 or more" : "Enter 0 or more units");
          return;
        }
        p[field] = v;
        el.value = v;
        app.querySelector('[data-stat="units"]').textContent = prods.reduce((n, x) => n + x.units, 0);
        toast(field === "trade" ? `Trade price saved for ${p.name}` : `Units updated for ${p.name}`);
      } else if (field === "shown") {
        p.shown = el.checked;
        el.nextElementSibling.textContent = el.checked ? "Shown" : "Hidden";
        app.querySelector('[data-stat="shown"]').textContent = shownProducts(g.id).length;
        toast(`${p.name} ${el.checked ? "shown to" : "hidden from"} pharmacies`);
      }
    });
    refocus(focusSel);
  }

  /* ---------- Patient ---------- */
  const patient = { ph: HOME_PHARMACY, paid: false, order: null };
  let nextOrder = 10432;

  function checkoutView(p, rows) {
    const r = rows.find((x) => x.ph === patient.ph);
    const total = r.price + M.fee;
    return `<div class="phone-head">${LOGO}<span>Flow Berry</span></div>
      <ol class="checkout">
        <li><h2>Your prescription</h2>
          <div class="label"><header><div><div class="name">${esc(p.name)}</div><div class="muted small">${esc(p.form)}, ${esc(p.pack)}</div></div>${sched(p.schedule)}</header>
            <dl class="fields"><dt>Prescriber</dt><dd>Dr Priya Nair</dd><dt>eScript</dt><dd>Token added</dd><dt>Repeats</dt><dd>2 left</dd></dl></div>
        </li>
        <li><h2 id="h-choose">Choose a pharmacy</h2>
          <div role="radiogroup" aria-labelledby="h-choose">${rows.map((x) => {
            const ph = pharmacy(x.ph);
            return `<label class="pharm-opt"><input type="radio" name="ph" value="${x.ph}"${x.ph === patient.ph ? " checked" : ""}><span><b>${esc(ph.name)}</b>${x.ph === HOME_PHARMACY ? '<span class="tag">Noted by your doctor</span>' : ""}<span class="cell-sub">${esc(ph.suburb)}. ${esc(ph.mode)}</span></span><span class="price">${aud(x.price)}</span></label>`;
          }).join("")}</div>
        </li>
        <li><h2>Pay</h2>
          <table class="sum"><caption class="sr-only">Order total</caption><tbody>
            <tr><td>Medicine, priced by the pharmacy</td><td>${aud(r.price, true)}</td></tr>
            <tr><td>Flow Berry service fee</td><td>${aud(M.fee)}</td></tr>
            <tr class="total"><td>Total</td><td>${aud(total, true)}</td></tr>
          </tbody></table>
          <button class="btn" type="button" id="pay">Pay ${aud(total, true)}</button>
          <p class="fine">Payment goes through our payment partner. The pharmacist checks your eScript before dispensing. If they can't dispense it, the pharmacy refunds the medicine price.</p>
        </li>
      </ol>`;
  }

  function trackingView(p) {
    const o = patient.order, ph = pharmacy(o.ph);
    return `<div class="phone-head">${LOGO}<span>Flow Berry</span></div>
      <h2 id="paid-h" tabindex="-1">Paid. Order ${o.id}</h2>
      <p class="muted">${esc(p.name)} from ${esc(ph.name)}, ${esc(ph.suburb)}.</p>
      <ol class="timeline">
        <li class="done"><b>Paid</b><span class="cell-sub">${aud(o.total, true)}, including the ${aud(M.fee)} service fee</span></li>
        <li class="now"><b>Pharmacist checking your eScript</b><span class="cell-sub">We'll message you when it's ready.</span></li>
        <li><b>Ready to collect, or on its way</b></li>
        <li><b>With you</b></li>
      </ol>
      <div class="actions">
        <button class="btn ghost small" type="button" data-demo="Messaging isn't included in the demo">Message the pharmacy</button>
        <button class="btn ghost small" type="button" data-demo="Side effect reports go to the pharmacy and prescriber. Not included in the demo.">Report a side effect</button>
      </div>
      <p class="fine"><button class="textlink" type="button" id="restart">Start the checkout again</button></p>`;
  }

  function patientPage(focusSel) {
    const p = product(PATIENT_PRODUCT);
    const rows = listed(p.id);
    if (!rows.some((r) => r.ph === patient.ph) && rows.length) patient.ph = rows[0].ph;
    app.innerHTML = `
      <div class="page-head"><div><h1>Patient checkout</h1><p class="muted">What a patient sees on their phone after their doctor issues the eScript.</p></div></div>
      <div class="phone">${patient.paid ? trackingView(p) : checkoutView(p, rows)}</div>`;

    const phone = app.querySelector(".phone");
    phone.addEventListener("change", (e) => {
      if (e.target.name !== "ph") return;
      patient.ph = e.target.value;
      patientPage(`input[name="ph"][value="${patient.ph}"]`);
    });
    phone.addEventListener("click", (e) => {
      if (e.target.closest("#pay")) {
        const r = listing(p.id, patient.ph);
        patient.order = { id: `FB-${nextOrder++}`, ph: patient.ph, total: r.price + M.fee };
        patient.paid = true;
        if (patient.ph === HOME_PHARMACY) {
          M.orders.unshift({ id: patient.order.id, ref: "Patient 6043", product: p.id, time: "Just now", mode: "Same-day courier", status: "new" });
        }
        patientPage("#paid-h");
        toast(`Paid. Order ${patient.order.id} sent to ${pharmacy(patient.ph).name}.`);
      } else if (e.target.closest("#restart")) {
        patient.paid = false;
        patientPage("#pay");
      }
    });
    refocus(focusSel);
  }

  /* ---------- Admin ---------- */
  function drawChart(fig) {
    const plot = fig.querySelector(".plot");
    const d = M.trend;
    const last = d.length - 1;
    const W = Math.max(280, Math.floor(plot.clientWidth)), H = 260;
    const L = 36, R = 12, T = 30, B = 44, max = 110;
    const x = (i) => L + (i * (W - L - R)) / last;
    const y = (v) => T + (1 - v / max) * (H - T - B);
    plot.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Paid orders a day rise from ${d[0]} in month 1 to ${d[last]} in month 12. The goal is 100 a day.">
      ${[0, 25, 50, 75, 100].map((v) => `${v > 0 && v < 100 ? `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>` : ""}<text class="axis" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      <line class="base" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
      <line class="goal" x1="${L}" x2="${W - R}" y1="${y(100)}" y2="${y(100)}"/>
      <text class="note-text" x="${W - R}" y="${y(100) - 8}" text-anchor="end">Goal: 100 a day</text>
      ${d.map((_, i) => `<text class="axis" x="${x(i)}" y="${H - B + 20}" text-anchor="middle">${i + 1}</text>`).join("")}
      <text class="axis" x="${L + (W - L - R) / 2}" y="${H - 4}" text-anchor="middle">Month after launch</text>
      <polyline class="line" points="${d.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/>
      <circle class="dot" cx="${x(last)}" cy="${y(d[last])}" r="5"/>
      <text class="note-text" x="${x(last) - 10}" y="${y(d[last]) - 10}" text-anchor="end">${d[last]} a day</text>
      <g class="hover" visibility="hidden"><line class="cross" y1="${T}" y2="${H - B}"/><circle class="dot" r="5"/></g>
      <rect class="hit" x="${L - 10}" y="${T}" width="${W - L - R + 20}" height="${H - T - B}" fill="transparent"/>
    </svg><div class="tip" hidden></div>`;

    const svg = plot.querySelector("svg"), hover = svg.querySelector(".hover"), tip = plot.querySelector(".tip");
    const cross = hover.querySelector("line"), dot = hover.querySelector("circle");
    const show = (clientX) => {
      const box = svg.getBoundingClientRect();
      const sx = (clientX - box.left) * (W / box.width);
      const i = Math.max(0, Math.min(last, Math.round((sx - L) / ((W - L - R) / last))));
      cross.setAttribute("x1", x(i));
      cross.setAttribute("x2", x(i));
      dot.setAttribute("cx", x(i));
      dot.setAttribute("cy", y(d[i]));
      hover.setAttribute("visibility", "visible");
      tip.innerHTML = `<b>Month ${i + 1}</b>: ${d[i].toFixed(1)} paid orders a day`;
      tip.hidden = false;
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.min(Math.max((x(i) / W) * box.width, tw / 2), box.width - tw / 2)}px`;
      tip.style.top = `${(y(d[i]) / H) * box.height}px`;
    };
    const hide = () => { hover.setAttribute("visibility", "hidden"); tip.hidden = true; };
    const hit = svg.querySelector(".hit");
    hit.addEventListener("pointermove", (e) => show(e.clientX));
    hit.addEventListener("pointerdown", (e) => show(e.clientX));
    hit.addEventListener("pointerleave", hide);
  }

  function adminPage(focusSel) {
    const k = M.kpi;
    app.innerHTML = `
      <div class="page-head"><div><h1>Platform overview</h1><p class="muted">Shown at month 12 of the pitch deck's base case. Illustrative figures, not results.</p></div></div>
      <div class="kpis">
        <div class="kpi"><b>${k.paidPerDay}</b><span>paid orders a day</span></div>
        <div class="kpi"><b>${k.livePharmacies}</b><span>pharmacies live</span></div>
        <div class="kpi"><b>${k.activeDoctors}</b><span>doctors active</span></div>
        <div class="kpi"><b>${aud(k.feesMonth)}</b><span>service fees this month, ex GST</span></div>
      </div>
      <figure class="chart">
        <figcaption><h2>Paid orders a day</h2><p class="muted small">Base case, months 1 to 12 after launch. The model reaches 100 a day in month 17.</p></figcaption>
        <div class="plot"></div>
        <details><summary>Show the numbers</summary><div class="table-wrap"><table class="tbl"><thead><tr><th scope="col">Month</th><th scope="col" class="num">Paid orders a day</th></tr></thead><tbody>${M.trend.map((v, i) => `<tr><td>${i + 1}</td><td class="num">${v.toFixed(1)}</td></tr>`).join("")}</tbody></table></div></details>
      </figure>
      <div class="stack">
        <section aria-labelledby="h-ver">
          <h2 id="h-ver" tabindex="-1">Verification queue</h2>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th scope="col">Applicant</th><th scope="col">Check</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead>
            <tbody>${M.verification.map((v, i) => `<tr><td><b>${esc(v.name)}</b><span class="cell-sub">${esc(v.type)}</span></td><td>${esc(v.check)}</td><td>${pill(v.status)}</td><td>${
              v.status === "Checking" ? `<button class="btn small" type="button" data-approve="${i}">Approve</button>`
              : v.status === "Needs documents" ? `<button class="btn small ghost" type="button" data-remind="${i}">Send reminder</button>` : ""
            }</td></tr>`).join("")}</tbody>
          </table></div>
        </section>
        <section aria-labelledby="h-saf">
          <h2 id="h-saf">Safety reports</h2>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th scope="col">Report</th><th scope="col">Routed to</th><th scope="col">Status</th></tr></thead>
            <tbody>${M.safety.map((s) => `<tr><td><b>${esc(s.type)}</b><span class="cell-sub">${esc(product(s.product).name)}</span></td><td>${esc(s.route)}</td><td>${pill(s.status)}</td></tr>`).join("")}</tbody>
          </table></div>
        </section>
      </div>`;

    drawChart(app.querySelector(".chart"));
    app.querySelector(".stack").addEventListener("click", (e) => {
      const ap = e.target.closest("[data-approve]");
      const rm = e.target.closest("[data-remind]");
      if (ap) {
        const v = M.verification[ap.dataset.approve];
        v.status = "Approved";
        adminPage();
        refocus(app.querySelector("[data-approve]") ? "[data-approve]" : "#h-ver");
        toast(`${v.name} approved`);
      } else if (rm) {
        toast(`Reminder sent to ${M.verification[rm.dataset.remind].name} (demo)`);
      }
    });
    refocus(focusSel);
  }

  /* ---------- Router ---------- */
  const views = { "": home, doctor: doctorPage, product: productPage, pharmacy: pharmacyPage, growers: supplierPage, grower: growerPage, patient: patientPage, admin: adminPage };
  const titles = { "": "Overview", doctor: "Doctor", product: "Product", pharmacy: "Pharmacy", growers: "Grower profile", grower: "Grower", patient: "Patient", admin: "Admin" };
  const NAV_PARENT = { product: "doctor", growers: "pharmacy" }; // sub-pages highlight their parent tab
  const WITH_PARAM = ["product", "growers"];

  function route() {
    const [key = "", param] = location.hash.replace(/^#\/?/, "").split("/");
    const name = Object.prototype.hasOwnProperty.call(views, key) ? key : "";
    views[name](WITH_PARAM.includes(name) ? param : undefined);
    const navName = NAV_PARENT[name] || name;
    document.querySelectorAll(".roles a").forEach((a) => {
      if (a.dataset.route === navName) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.title = `${titles[name]} | Flow Berry demo`;
  }

  window.addEventListener("hashchange", () => {
    toastEl.classList.remove("show");
    route();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".skip")) {
      e.preventDefault();
      app.focus();
      return;
    }
    const demo = e.target.closest("[data-demo]");
    if (demo) {
      e.preventDefault();
      toast(demo.dataset.demo || "Not included in the demo");
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const fig = app.querySelector(".chart");
      if (fig) drawChart(fig);
    }, 150);
  });

  route();
})();
