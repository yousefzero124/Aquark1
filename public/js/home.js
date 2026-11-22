/* =========================================================
   الصفحة الرئيسية
   ========================================================= */
(function () {
  let all = Listings.all();

  /* --- Search box --- */
  let mode = "buy";
  const citySel = document.getElementById("hsCity");
  const typeSel = document.getElementById("hsType");
  citySel.innerHTML = `<option value="">${esc(t("any_city"))}</option>` +
    Object.keys(CITIES).map((k) => `<option value="${k}">${esc(cityName(k))}</option>`).join("");
  typeSel.innerHTML = `<option value="">${esc(t("any_type"))}</option>` +
    Object.keys(TYPES).map((k) => `<option value="${k}">${esc(typeName(k))}</option>`).join("");
  document.getElementById("hsSubmit").innerHTML = `${ICONS.search}<span>${esc(t("search_btn"))}</span>`;

  document.querySelectorAll(".search-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      document.querySelectorAll(".search-tabs button").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  document.getElementById("heroSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ mode });
    if (citySel.value) params.set("city", citySel.value);
    if (typeSel.value) params.set("type", typeSel.value);
    location.href = `properties.html?${params}`;
  });

  /* --- Hero video background --- */
  setupHeroVideo(document.getElementById("heroVideo"), document.getElementById("videoToggle"));

  /* --- Hero floating cards --- */
  document.getElementById("heroFloat1").innerHTML =
    `<span class="ico">${icon("shield", "font-size:18px")}</span>
     <div>${esc(t("float_verified"))}<small>${esc(t("float_verified_d"))}</small></div>`;
  document.getElementById("heroFloat2").innerHTML =
    `<span class="ico">${icon("bolt", "font-size:18px")}</span>
     <div>${esc(t("float_new"))}<small>${esc(t("float_new_d"))}</small></div>`;

  /* --- الأقسام اللي بتعتمد على الإعلانات (بتتعاد لما إعلانات جديدة توصل من السيرفر) --- */
  function renderListingSections() {
  all = Listings.all();
  /* --- Stats (محسوبة من البيانات الحقيقية) --- */
  const usedCities = new Set(all.map((l) => l.city)).size;
  const usedTypes = new Set(all.map((l) => l.type)).size;
  document.getElementById("stats").innerHTML = [
    [ICONS.building, all.length, t("stat_listings")],
    [ICONS.pin, usedCities, t("stat_cities")],
    [ICONS.tag, usedTypes, t("stat_types")],
  ].map(([icon, n, label]) => `
    <div class="stat"><span class="ico">${icon}</span><div><span class="lbl">${esc(label)}</span><strong>${fmtNum(n)}</strong></div></div>`).join("");

  /* --- Categories --- */
  document.getElementById("categories").innerHTML = Object.keys(TYPES).map((k) => {
    const n = all.filter((l) => l.type === k).length;
    return `<a class="cat-card" href="properties.html?mode=buy&type=${k}">
        <span class="ico">${ICONS[TYPE_ICON[k]]}</span>
        <strong>${esc(typeName(k))}</strong>
        <small>${esc(t("count_props", { n }))}</small>
      </a>`;
  }).join("");

  /* --- Recommended for you (لو المستخدم حدد تفضيلاته) --- */
  const me = Auth.current();
  if (me) {
    const recSection = document.getElementById("recSection");
    const recHost = document.getElementById("recommended");
    recSection.classList.remove("hidden");
    if (hasPrefs(me)) {
      const recs = all
        .map((l) => ({ l, s: matchScore(l, me.prefs) }))
        .filter((x) => x.s >= 0.5)
        .sort((a, b) => b.s - a.s || String(b.l.createdAt).localeCompare(String(a.l.createdAt)))
        .slice(0, 6);
      recHost.innerHTML = recs.length
        ? recs.map((x) => propCard(x.l)).join("")
        : `<div class="empty" style="grid-column:1/-1">${ICONS.search}<div>${esc(t("no_rec"))}</div></div>`;
    } else if (recHost) {
      // لسه محددش تفضيلات → دعوة يحددها
      recSection.querySelector(".section-head").classList.add("hidden");
      recHost.outerHTML = `
        <div class="prefs-cta">
          <span class="ico">${ICONS.sliders}</span>
          <div><h3>${esc(t("prefs_cta_title"))}</h3><p>${esc(t("prefs_cta_sub"))}</p></div>
          <a class="btn btn-primary" href="preferences.html">${esc(t("prefs_cta_btn"))}</a>
        </div>`;
    }
  }

  /* --- Featured --- */
  const featured = [...all]
    .sort((a, b) => (Moderation.isFeatured(b) ? 1 : 0) - (Moderation.isFeatured(a) ? 1 : 0) || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 6);
  document.getElementById("featured").innerHTML = featured.map(propCard).join("");
  }
  renderListingSections();
  document.addEventListener("listings:changed", renderListingSections);

  /* --- Roles --- */
  const roles = [
    { key: "broker", icon: ICONS.tag, f: ["broker_f1", "broker_f2", "broker_f3"] },
    { key: "buyer", icon: ICONS.key, f: ["buyer_f1", "buyer_f2", "buyer_f3"] },
    { key: "investor", icon: ICONS.chart, f: ["investor_f1", "investor_f2", "investor_f3"] },
  ];
  document.getElementById("roles").innerHTML = roles.map((r) => `
    <div class="role-card">
      <span class="ico">${r.icon}</span>
      <h3>${esc(roleName(r.key))}</h3>
      <p>${esc(t(`role_${r.key}_long`))}</p>
      <ul>${r.f.map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>
      ${Auth.current() ? "" : `<a href="auth.html?role=${r.key}#signup" class="btn btn-outline btn-sm" style="margin-top:18px">${esc(t("start_as", { role: roleName(r.key) }))}</a>`}
    </div>`).join("");
})();
