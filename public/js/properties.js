/* =========================================================
   صفحة العقارات (شراء / إيجار) مع الفلاتر
   ========================================================= */
(function () {
  const params = new URLSearchParams(location.search);
  const user = Auth.current();
  const state = {
    mode: params.get("mode") === "rent" ? "rent" : "buy",
    city: params.get("city") || "",
    type: params.get("type") || "",
    min: params.get("min") || "",
    max: params.get("max") || "",
    beds: params.get("beds") || "",
    q: params.get("q") || "",
    sort: params.get("sort") || (hasPrefs(user) ? "match" : "new"),
    favs: params.get("favs") === "1" && !!user,
  };

  const $ = (id) => document.getElementById(id);

  /* --- Build controls --- */
  $("fCity").innerHTML = `<option value="">${esc(t("any_city"))}</option>` +
    Object.keys(CITIES).map((k) => `<option value="${k}">${esc(cityName(k))}</option>`).join("");
  $("fType").innerHTML = `<option value="">${esc(t("any_type"))}</option>` +
    Object.keys(TYPES).map((k) => `<option value="${k}">${esc(typeName(k))}</option>`).join("");
  $("fBeds").innerHTML = [["", t("f_any")], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]]
    .map(([v, label]) => `<button type="button" data-beds="${v}">${esc(label)}</button>`).join("");

  const sorts = [["new", "sort_new"], ["price_asc", "sort_price_asc"], ["price_desc", "sort_price_desc"], ["area", "sort_area"]];
  if (hasPrefs(user)) sorts.unshift(["match", "sort_match"]);

  // أزرار سريعة لنوع العقار (فيلا، شقة، ...)
  $("typeChips").innerHTML = [["", t("any_type"), ICONS.list], ...Object.keys(TYPES).map((k) => [k, typeName(k), ICONS[TYPE_ICON[k]]])]
    .map(([k, label, icon]) => `<button type="button" data-type="${k}">${icon}<span>${esc(label)}</span></button>`).join("");
  if (user && (user.role === "investor" || user.role === "admin")) sorts.push(["yield", "sort_yield"]);
  $("fSort").innerHTML = sorts.map(([v, k]) => `<option value="${v}">${esc(t(k))}</option>`).join("");
  if (!sorts.some(([v]) => v === state.sort)) state.sort = "new";

  $("searchIco").outerHTML = ICONS.search;
  $("openFilters").innerHTML = `${ICONS.filter}<span>${esc(t("filters"))}</span>`;
  $("closeFilters").innerHTML = ICONS.close;
  $("favsWrap").classList.toggle("hidden", !user);

  // قيم البداية من الرابط
  $("fCity").value = state.city;
  $("fType").value = state.type;
  $("fMin").value = state.min;
  $("fMax").value = state.max;
  $("fQuery").value = state.q;
  $("fSort").value = state.sort;
  $("fFavs").checked = state.favs;

  /* --- Filtering --- */
  function filtered() {
    const favList = state.favs ? Favs.list() : null;
    const q = state.q.trim().toLowerCase();
    const min = Number(state.min) || 0;
    const max = Number(state.max) || Infinity;
    const beds = Number(state.beds) || 0;

    let list = Listings.all().filter((l) => {
      if (favList) { if (!favList.includes(l.id)) return false; }
      else if (l.purpose !== (state.mode === "rent" ? "rent" : "sale")) return false;
      if (state.city && l.city !== state.city) return false;
      if (state.type && l.type !== state.type) return false;
      if (l.price < min || l.price > max) return false;
      if (beds && (l.beds || 0) < beds) return false;
      if (q) {
        const hay = [l.title?.ar, l.title?.en, l.title, l.address?.ar, l.address?.en, l.address,
          cityName(l.city), typeName(l.type)].filter((x) => typeof x === "string").join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const by = {
      new: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      area: (a, b) => b.size - a.size,
      yield: (a, b) => (b.yield || 0) - (a.yield || 0),
      match: (a, b) => matchScore(b, user.prefs) - matchScore(a, user.prefs) || String(b.createdAt).localeCompare(String(a.createdAt)),
    };
    return list.sort(by[state.sort] || by.new);
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.favs) p.set("favs", "1"); else p.set("mode", state.mode);
    ["city", "type", "min", "max", "beds", "q"].forEach((k) => { if (state[k]) p.set(k, state[k]); });
    if (state.sort !== "new" && state.sort !== "match") p.set("sort", state.sort);
    history.replaceState(null, "", `${location.pathname}?${p}`);
  }

  function render() {
    $("pageTitle").textContent = state.favs ? t("my_favs") : t(state.mode === "rent" ? "props_title_rent" : "props_title_buy");
    $("modeSeg").classList.toggle("hidden", state.favs);
    document.querySelectorAll("#modeSeg [data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
    document.querySelectorAll("#fBeds [data-beds]").forEach((b) => b.classList.toggle("active", b.dataset.beds === state.beds));
    document.querySelectorAll("#typeChips [data-type]").forEach((b) => b.classList.toggle("active", b.dataset.type === state.type));
    $("fType").value = state.type;
    document.querySelectorAll(".main-nav a").forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", !state.favs && href === `properties.html?mode=${state.mode}`);
    });

    const list = filtered();
    $("resultCount").textContent = t("results_count", { n: fmtNum(list.length) });
    $("results").innerHTML = list.length
      ? list.map(propCard).join("")
      : `<div class="empty" style="grid-column:1/-1">${ICONS.search}<div>${esc(t("no_results"))}</div></div>`;
    syncUrl();
  }

  /* --- Events --- */
  document.querySelectorAll("#modeSeg [data-mode]").forEach((b) => {
    b.addEventListener("click", () => { state.mode = b.dataset.mode; render(); });
  });
  $("typeChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-type]");
    if (b) { state.type = b.dataset.type; render(); }
  });
  $("fBeds").addEventListener("click", (e) => {
    const b = e.target.closest("[data-beds]");
    if (b) { state.beds = b.dataset.beds; render(); }
  });
  [["fCity", "city"], ["fType", "type"], ["fSort", "sort"]].forEach(([id, key]) => {
    $(id).addEventListener("change", (e) => { state[key] = e.target.value; render(); });
  });
  let timer;
  [["fMin", "min"], ["fMax", "max"], ["fQuery", "q"]].forEach(([id, key]) => {
    $(id).addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state[key] = e.target.value; render(); }, 250);
    });
  });
  $("fFavs").addEventListener("change", (e) => { state.favs = e.target.checked; render(); });
  $("resetFilters").addEventListener("click", () => {
    Object.assign(state, { city: "", type: "", min: "", max: "", beds: "", q: "", sort: "new", favs: false });
    ["fCity", "fType", "fMin", "fMax", "fQuery"].forEach((id) => { $(id).value = ""; });
    $("fSort").value = "new";
    $("fFavs").checked = false;
    render();
  });

  // فلاتر الموبايل
  const filters = $("filters");
  $("openFilters").addEventListener("click", () => filters.classList.add("open"));
  $("closeFilters").addEventListener("click", () => filters.classList.remove("open"));
  $("applyFilters").addEventListener("click", () => filters.classList.remove("open"));

  // لو المستخدم شال عقار من المفضلة وهو بيعرض المفضلة بس
  document.addEventListener("favs:changed", () => { if (state.favs) render(); });

  render();
})();
