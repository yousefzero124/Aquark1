/* =========================================================
   لوحة المستخدم — كل نوع حساب ليه لوحة:
   - المشتري:  مفضلته، اللي نزل سعره، بحثه المحفوظ، رسايله، المرشّح ليه
   - البروكر:  عقاراته (حفظ / رسايل / حالة / تعديل)، آخر رسايل المشترين
   - المستثمر: عقاراته + أعلى عائد في السوق + سعر المتر في كل حي + مفضلته
   (الأدمن ليه لوحة التحكم admin.html)
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const me = Auth.current();
  if (!me) return;
  if (me.role === "admin") { location.replace("admin.html"); return; }

  const role = me.role;
  const owns = role === "broker" || role === "investor"; // ليهم "عقاراتي"
  let stats = {};      // { listingId: { favorites, chats, unread } }
  let searches = [];
  let chats = [];

  /* --- الراس --- */
  $("dashRole").textContent = roleName(role);
  $("dashHello").textContent = t("dash_hello", { name: me.name.split(" ")[0] });
  $("dashSub").textContent = t(`dash_sub_${role}`);
  $("dashActions").innerHTML = owns
    ? `<a class="btn btn-primary" href="sell.html">${ICONS.plus}<span>${esc(t("dash_add"))}</span></a>
       <a class="btn btn-outline" href="messages.html">${ICONS.message}<span>${esc(t("messages"))}</span></a>`
    : `<a class="btn btn-primary" href="properties.html?mode=buy">${ICONS.search}<span>${esc(t("browse_props"))}</span></a>
       <a class="btn btn-outline" href="messages.html">${ICONS.message}<span>${esc(t("messages"))}</span></a>`;

  /* --- مساعدات --- */
  const locale = Lang.get() === "ar" ? "ar-EG-u-nu-latn" : "en-US";
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");
  const thumb = (l) => `<span class="mini-thumb">${l.images && l.images[0]
    ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" onerror="imgFail(this)">`
    : `<span class="img-fallback">${ICONS.house}</span>`}</span>`;
  const section = (id, icon, title, body, link = "") => `
    <section class="card dash-sec" id="sec-${id}">
      <div class="dash-sec-head"><h2>${icon}<span>${esc(title)}</span></h2>${link}</div>
      ${body}
    </section>`;
  const empty = (text, action = "") => `<div class="dash-empty"><p>${esc(text)}</p>${action}</div>`;
  const kpi = (icon, value, label) => `<div class="stat"><span class="ico">${icon}</span><div><strong>${value}</strong><span>${esc(label)}</span></div></div>`;

  // نفس شروط البحث في صفحة العقارات
  function matches(l, c) {
    if (l.purpose !== (c.mode === "rent" ? "rent" : "sale")) return false;
    if (c.city && l.city !== c.city) return false;
    if (c.type && l.type !== c.type) return false;
    if (c.min && l.price < c.min) return false;
    if (c.max && l.price > c.max) return false;
    if (c.beds && (l.beds || 0) < c.beds) return false;
    if (c.pano && !l.pano) return false;
    if (c.q) {
      const hay = [loc(l.title), l.title && l.title.en, loc(l.address), cityName(l.city), typeName(l.type)]
        .filter((x) => typeof x === "string").join(" ").toLowerCase();
      if (!hay.includes(String(c.q).toLowerCase())) return false;
    }
    return true;
  }
  function searchUrl(c) {
    const p = new URLSearchParams({ mode: c.mode === "rent" ? "rent" : "buy" });
    ["city", "type", "min", "max", "beds", "q"].forEach((k) => { if (c[k]) p.set(k, c[k]); });
    if (c.pano) p.set("pano", "1");
    return `properties.html?${p}`;
  }
  // آخر تغيير في السعر كان نزول؟
  function lastDrop(l) {
    const h = l.priceHistory || [];
    if (h.length < 2) return null;
    const a = h[h.length - 2].price;
    const b = h[h.length - 1].price;
    return b < a ? { old: a, now: b, at: h[h.length - 1].at } : null;
  }

  /* --- الأجزاء --- */
  function favoritesSection(limit) {
    const visible = new Set(Listings.all().map((l) => l.id));
    const favs = Favs.list().filter((id) => visible.has(id)).map((id) => Listings.get(id)).filter(Boolean).reverse();
    const body = favs.length
      ? `<div class="prop-grid dash-grid-3">${favs.slice(0, limit).map(propCard).join("")}</div>`
      : empty(t("dash_empty_favs"), `<a class="btn btn-outline btn-sm" href="properties.html?mode=buy">${esc(t("browse_props"))}</a>`);
    return section("favs", ICONS.heart, t("dash_favs"), body,
      favs.length > limit ? `<a class="dash-link" href="properties.html?favs=1">${esc(t("dash_all_favs"))}</a>` : "");
  }

  function dropsSection() {
    const drops = Favs.list().map((id) => Listings.get(id)).filter(Boolean)
      .map((l) => ({ l, d: lastDrop(l) })).filter((x) => x.d)
      .sort((a, b) => String(b.d.at).localeCompare(String(a.d.at)));
    const body = drops.length
      ? `<div class="mini-list">${drops.slice(0, 5).map(({ l, d }) => `
          <button type="button" class="mini-item" data-prop-id="${esc(l.id)}">
            ${thumb(l)}
            <span><strong>${esc(loc(l.title))}</strong>
              <small><s>${esc(fmtNum(d.old))}</s> → <b class="drop-new">${esc(fmtPrice(d.now))}</b> · ${esc(fmtDate(d.at))}</small></span>
          </button>`).join("")}</div>`
      : empty(t("dash_no_drops"));
    return section("drops", ICONS.priceDown, t("dash_price_drops"), body);
  }

  function searchesSection() {
    const all = Listings.all();
    const body = searches.length
      ? `<div class="mini-list">${searches.map((s) => {
          const n = all.filter((l) => matches(l, s.criteria || {})).length;
          return `<a class="mini-item" href="${esc(searchUrl(s.criteria || {}))}">
            <span class="mini-ico">${ICONS.bellRing}</span>
            <span><strong>${esc(s.name)}</strong><small>${esc(t("dash_matches", { n: fmtNum(n) }))}</small></span>
            <span class="dash-go">${esc(t("dash_open"))}</span>
          </a>`;
        }).join("")}</div>`
      : empty(t("ss_empty"));
    return section("searches", ICONS.bellRing, t("dash_searches"), body,
      `<a class="dash-link" href="properties.html?mode=buy">${esc(t("dash_manage_searches"))}</a>`);
  }

  function chatsSection() {
    const body = chats.length
      ? `<div class="mini-list">${chats.slice(0, 4).map((c) => `
          <a class="mini-item${c.unread ? " unread" : ""}" href="messages.html?c=${encodeURIComponent(c.id)}">
            <span class="avatar">${esc((c.other.name || "?").charAt(0).toUpperCase())}</span>
            <span><strong>${esc(c.other.name || "—")}${c.unread ? ` <span class="chat-dot-inline"></span>` : ""}</strong>
              <small>${esc(loc(c.listingTitle) || "")} · ${c.lastBody ? esc(c.lastBody) : esc(t("chat_no_msgs"))}</small></span>
            <time>${c.lastBody ? esc(timeAgo(c.lastAt)) : ""}</time>
          </a>`).join("")}</div>`
      : empty(t(owns ? "chat_pick_sub" : "chat_none_sub"));
    return section("chats", ICONS.message, t("dash_chats"), body,
      `<a class="dash-link" href="messages.html">${esc(t("dash_all_chats"))}</a>`);
  }

  function recsSection() {
    if (!hasPrefs(me)) {
      return section("recs", ICONS.star, t("dash_recs"), `
        <div class="prefs-cta">
          <span class="ico">${ICONS.sliders}</span>
          <div><h3>${esc(t("prefs_cta_title"))}</h3><p>${esc(t("prefs_cta_sub"))}</p></div>
          <a class="btn btn-primary" href="preferences.html">${esc(t("prefs_cta_btn"))}</a>
        </div>`);
    }
    const recs = Listings.all().map((l) => ({ l, s: matchScore(l, me.prefs) })).filter((x) => x.s >= 0.5)
      .sort((a, b) => b.s - a.s || String(b.l.createdAt).localeCompare(String(a.l.createdAt))).slice(0, 3);
    return section("recs", ICONS.star, t("dash_recs"), recs.length
      ? `<div class="prop-grid dash-grid-3">${recs.map((x) => propCard(x.l)).join("")}</div>`
      : empty(t("no_rec")));
  }

  // عقاراتي: جدول بكل إعلان + مرات الحفظ والرسايل والحالة والإجراءات
  function myListingsSection() {
    const mine = Listings.byOwner(me.id);
    const rows = mine.map((l) => {
      const s = stats[l.id] || { favorites: 0, chats: 0, unread: 0 };
      const hidden = Moderation.isHidden(l.id);
      return `<tr class="${hidden ? "is-hidden" : ""}">
        <td><div class="cell-listing" data-prop-id="${esc(l.id)}" style="cursor:pointer">${thumb(l)}
          <div><strong>${esc(loc(l.title))}</strong>
          <small>${esc(typeName(l.type))} · ${esc(cityName(l.city))} · ${esc(fmtDate(l.createdAt))}</small></div></div></td>
        <td class="nowrap">${esc(fmtPrice(l.price))}${l.purpose === "rent" ? ` <small class="muted">${esc(t("per_month"))}</small>` : ""}</td>
        <td class="nowrap"><span class="dash-count">${ICONS.heart}${fmtNum(s.favorites)}</span></td>
        <td class="nowrap"><a class="dash-count" href="messages.html">${ICONS.message}${fmtNum(s.chats)}${s.unread ? ` <span class="badge-new">${fmtNum(s.unread)}</span>` : ""}</a></td>
        <td><div class="chip-stack">
          <span class="status-chip ${hidden ? "off" : "on"}">${esc(t(hidden ? "st_hidden" : "st_visible"))}</span>
          ${Moderation.isVerified(l) ? `<span class="status-chip featured">${ICONS.verified}${esc(t("verified"))}</span>` : ""}
          ${Moderation.isFeatured(l) ? `<span class="status-chip featured">${ICONS.star}${esc(t("st_featured"))}</span>` : ""}
          ${l.pano ? `<span class="status-chip">360°</span>` : ""}
          ${l.video ? `<span class="status-chip">${ICONS.video}${esc(t("video_open"))}</span>` : ""}
        </div></td>
        <td><div class="row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-prop-id="${esc(l.id)}">${esc(t("view"))}</button>
          <a class="btn btn-outline btn-sm" href="sell.html?edit=${encodeURIComponent(l.id)}&next=dashboard.html%23listings">${ICONS.edit}<span>${esc(t("edit"))}</span></a>
          <button type="button" class="btn btn-outline btn-sm" data-price="${esc(l.id)}">${esc(t("edit_price"))}</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(l.id)}">${esc(t("delete"))}</button>
        </div></td>
      </tr>`;
    }).join("");
    const body = mine.length
      ? `<div class="table-wrap"><table class="data-table">
          <thead><tr>
            <th>${esc(t("col_property"))}</th><th>${esc(t("col_price"))}</th><th>${esc(t("col_saves"))}</th>
            <th>${esc(t("col_chats"))}</th><th>${esc(t("col_state"))}</th><th>${esc(t("col_actions"))}</th>
          </tr></thead><tbody>${rows}</tbody></table></div>`
      : empty(t("dash_empty_mine"), `<a class="btn btn-primary btn-sm" href="sell.html">${ICONS.plus}<span>${esc(t("dash_add"))}</span></a>`);
    return section("listings", ICONS.building, t("my_listings"), body,
      mine.length ? `<a class="dash-link" href="sell.html">${ICONS.plus}${esc(t("dash_add"))}</a>` : "");
  }

  // المستثمر: أعلى عائد في السوق
  function topYieldSection() {
    // من غير الأراضي (العائد فيها مضاربة مش إيجار)
    const top = Listings.all().filter((l) => l.purpose === "sale" && l.yield && l.type !== "land")
      .sort((a, b) => b.yield - a.yield).slice(0, 3);
    return section("yield", ICONS.chart, t("dash_top_yield"),
      `<div class="prop-grid dash-grid-3">${top.map(propCard).join("")}</div>`,
      `<a class="dash-link" href="properties.html?mode=buy&sort=yield">${esc(t("browse_props"))}</a>`);
  }
  // المستثمر: متوسط سعر المتر للبيع في كل حي
  function m2Section() {
    const rows = Object.keys(CITIES).map((k) => {
      const list = Listings.all().filter((l) => l.purpose === "sale" && l.city === k && l.type !== "land" && l.size > 0);
      const avg = list.length ? Math.round(list.reduce((s, l) => s + l.price / l.size, 0) / list.length / 100) * 100 : 0;
      return { label: cityName(k), value: avg };
    }).filter((r) => r.value).sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...rows.map((r) => r.value));
    return section("m2", ICONS.history, t("dash_m2"), `
      <div class="bars">${rows.map((r) => `
        <div class="bar-row" title="${esc(r.label)}: ${fmtNum(r.value)}">
          <span class="bar-label">${esc(r.label)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(r.value / max) * 100}%"></span></span>
          <span class="bar-val">${fmtNum(r.value)}</span>
        </div>`).join("")}</div>
      <p class="hint" style="margin:10px 0 0">${esc(t("dash_m2_note"))} (${esc(t("currency"))} / ${esc(t("sqm"))})</p>`);
  }

  /* --- الأرقام اللي فوق --- */
  function renderKpis() {
    const visible = new Set(Listings.all().map((l) => l.id));
    const favN = Favs.list().filter((id) => visible.has(id)).length;
    const chatsNew = chats.filter((c) => c.unread).length;
    let items;
    if (role === "buyer") {
      items = [
        kpi(ICONS.heart, fmtNum(favN), t("kpi_favs")),
        kpi(ICONS.bellRing, fmtNum(searches.length), t("kpi_searches")),
        kpi(ICONS.message, fmtNum(chatsNew), t("kpi_chats_new")),
        kpi(ICONS.bell, fmtNum(Notifs.unread()), t("kpi_notifs_new")),
      ];
    } else {
      const mine = Listings.byOwner(me.id);
      const saves = mine.reduce((s, l) => s + ((stats[l.id] && stats[l.id].favorites) || 0), 0);
      const hidden = mine.filter((l) => Moderation.isHidden(l.id)).length;
      items = [
        kpi(ICONS.building, fmtNum(mine.length - hidden), t("kpi_my_listings")),
        kpi(ICONS.heart, fmtNum(saves), t("kpi_saves")),
        kpi(ICONS.message, fmtNum(chatsNew), t("kpi_chats_new")),
      ];
      if (role === "investor") {
        const best = Listings.all().filter((l) => l.purpose === "sale" && l.yield && l.type !== "land").reduce((m, l) => Math.max(m, l.yield), 0);
        items.push(kpi(ICONS.chart, `${best}%`, t("kpi_best_yield")));
      } else {
        items.push(kpi(ICONS.eyeOff, fmtNum(hidden), t("kpi_hidden_mine")));
      }
    }
    $("dashKpis").innerHTML = items.join("");
  }

  /* --- الرسم --- */
  function render() {
    renderKpis();
    let html = "";
    if (role === "buyer") {
      html = favoritesSection(6)
        + `<div class="dash-cols">${dropsSection()}${searchesSection()}</div>`
        + `<div class="dash-cols">${chatsSection()}${recsSection()}</div>`;
    } else if (role === "broker") {
      html = myListingsSection() + `<div class="dash-cols">${chatsSection()}${searchesSection()}</div>`;
    } else { // investor
      html = myListingsSection()
        + topYieldSection()
        + `<div class="dash-cols">${m2Section()}${chatsSection()}</div>`
        + favoritesSection(3);
    }
    $("dashBody").innerHTML = html;
  }

  /* --- أحداث --- */
  $("dashBody").addEventListener("click", async (e) => {
    const priceBtn = e.target.closest("[data-price]");
    if (priceBtn) {
      e.stopPropagation();
      const l = Listings.get(priceBtn.dataset.price);
      if (l) openPriceEditor(l);
      return;
    }
    const del = e.target.closest("[data-delete]");
    if (del) {
      e.stopPropagation();
      if (!confirm(t("confirm_delete"))) return;
      del.disabled = true;
      try { await Listings.remove(del.dataset.delete); toast(t("deleted")); } catch (err) { del.disabled = false; toast(t(err.message), "error"); }
    }
  }, true);

  async function load() {
    const jobs = [
      Api.call("GET", "/api/searches").then((d) => { searches = d.searches; }).catch(() => {}),
      Api.call("GET", "/api/chats").then((d) => { chats = d.chats; }).catch(() => {}),
    ];
    if (owns) jobs.push(Api.call("GET", "/api/dashboard").then((d) => { stats = d.listings || {}; }).catch(() => {}));
    await Promise.all(jobs);
    render();
    if (location.hash === "#listings") setTimeout(() => { const s = $("sec-listings"); if (s) s.scrollIntoView({ block: "start" }); }, 60);
  }

  render(); // من النسخة المحفوظة على طول
  load();
  ["listings:changed", "favs:changed", "notifs:changed"].forEach((ev) => document.addEventListener(ev, render));
})();
