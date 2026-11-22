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
    pano: params.get("pano") === "1",
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
  $("fPano").checked = state.pano;

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
      if (state.pano && !l.pano) return false;
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
    if (state.pano) p.set("pano", "1");
    if (state.sort !== "new" && state.sort !== "match") p.set("sort", state.sort);
    history.replaceState(null, "", `${location.pathname}?${p}`);
  }

  // العقارات بتظهر 24 ورا بعض، وزرار "عرض المزيد" يجيب الباقي
  const PAGE = 24;
  let limit = PAGE;
  $("results").insertAdjacentHTML("afterend", `<div class="more-wrap hidden" id="moreWrap"><button type="button" class="btn btn-outline" id="moreBtn"></button></div>`);
  $("moreBtn").addEventListener("click", () => { limit += PAGE; render(true); });

  function render(more) {
    if (more !== true) limit = PAGE; // أي تغيير في الفلاتر يرجّع لأول صفحة
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
      ? list.slice(0, limit).map(propCard).join("")
      : `<div class="empty" style="grid-column:1/-1">${ICONS.search}<div>${esc(t("no_results"))}</div></div>`;
    const left = list.length - limit;
    $("moreWrap").classList.toggle("hidden", left <= 0);
    if (left > 0) $("moreBtn").textContent = t("show_more", { n: fmtNum(left) });
    $("saveSearch").disabled = state.favs;
    syncUrl();
  }

  /* =======================================================
     البحث المحفوظ — بيجيلك إشعار لما ينزل عقار مطابق
     ======================================================= */
  let searches = [];
  $("ssIco").outerHTML = ICONS.bellRing;
  $("saveSearch").innerHTML = `${ICONS.bellPlus}<span>${esc(t("ss_save"))}</span>`;

  const criteriaNow = () => ({
    mode: state.mode, city: state.city, type: state.type,
    min: Number(state.min) || 0, max: Number(state.max) || 0, beds: Number(state.beds) || 0,
    q: state.q.trim(), pano: state.pano,
  });
  // وصف البحث بكلام: "شقة · حي الشرق · للبيع · لحد 3,000,000"
  function describe(c) {
    const parts = [c.type ? typeName(c.type) : t("any_type"), c.city ? cityName(c.city) : t("any_city"), t(c.mode === "rent" ? "for_rent" : "for_sale")];
    if (c.min && c.max) parts.push(`${fmtNum(c.min)} – ${fmtNum(c.max)}`);
    else if (c.max) parts.push(t("ss_upto", { v: fmtNum(c.max) }));
    else if (c.min) parts.push(t("ss_from", { v: fmtNum(c.min) }));
    if (c.beds) parts.push(`${c.beds}+ ${t("beds")}`);
    if (c.pano) parts.push("360°");
    if (c.q) parts.push(`"${c.q}"`);
    return parts.join(" · ");
  }
  function renderSearches() {
    $("ssList").innerHTML = searches.length
      ? searches.map((s) => `
          <div class="ss-item">
            <button type="button" class="ss-apply" data-ss-apply="${esc(s.id)}" title="${esc(t("ss_apply"))}">
              <strong>${esc(s.name)}</strong><small>${esc(describe(s.criteria))}</small>
            </button>
            <button type="button" class="ss-del" data-ss-del="${esc(s.id)}" aria-label="${esc(t("delete"))}">${ICONS.close}</button>
          </div>`).join("")
      : `<p class="ss-empty">${esc(t("ss_empty"))}</p>`;
  }
  async function loadSearches() {
    try { searches = (await Api.call("GET", "/api/searches")).searches; } catch (e) { /* ignore */ }
    renderSearches();
  }

  $("saveSearch").addEventListener("click", () => {
    const c = criteriaNow();
    const { el, close } = openModal(`
      <form class="modal-pad ss-form" novalidate>
        <h2 style="margin:0 0 6px;font-size:22px">${ICONS.bellPlus} ${esc(t("ss_save_title"))}</h2>
        <p class="hint" style="margin:0 0 14px">${esc(t("ss_save_sub"))}</p>
        <div class="ss-summary">${esc(describe(c))}</div>
        <div class="form-group">
          <label for="ssName">${esc(t("ss_name"))}</label>
          <input class="input" id="ssName" maxlength="60" value="${esc(describe(c).slice(0, 60))}">
        </div>
        <div class="alert alert-error hidden" data-error></div>
        <div class="btn-row" style="justify-content:flex-end">
          <button type="button" class="btn btn-ghost" data-cancel>${esc(t("cancel"))}</button>
          <button type="submit" class="btn btn-primary">${esc(t("ss_save"))}</button>
        </div>
      </form>`, { size: "sm" });
    const form = el.querySelector("form");
    el.querySelector("[data-cancel]").addEventListener("click", close);
    el.querySelector("#ssName").select();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const { search } = await Api.call("POST", "/api/searches", { name: el.querySelector("#ssName").value.trim() || describe(c), criteria: c });
        searches.unshift(search);
        renderSearches();
        close();
        toast(t("ss_saved"), "success");
      } catch (err) {
        btn.disabled = false;
        const box = form.querySelector("[data-error]");
        box.textContent = t(err.message);
        box.classList.remove("hidden");
      }
    });
  });

  $("ssList").addEventListener("click", async (e) => {
    const del = e.target.closest("[data-ss-del]");
    if (del) {
      const s = searches.find((x) => x.id === del.dataset.ssDel);
      if (!s || !confirm(t("ss_confirm_delete", { name: s.name }))) return;
      try {
        await Api.call("DELETE", `/api/searches/${encodeURIComponent(s.id)}`, {});
        searches = searches.filter((x) => x.id !== s.id);
        renderSearches();
        toast(t("deleted"));
      } catch (err) { toast(t(err.message), "error"); }
      return;
    }
    const apply = e.target.closest("[data-ss-apply]");
    if (!apply) return;
    const s = searches.find((x) => x.id === apply.dataset.ssApply);
    if (!s) return;
    const c = s.criteria;
    Object.assign(state, {
      mode: c.mode === "rent" ? "rent" : "buy", city: c.city || "", type: c.type || "",
      min: c.min ? String(c.min) : "", max: c.max ? String(c.max) : "", beds: c.beds ? String(c.beds) : "",
      q: c.q || "", pano: !!c.pano, favs: false,
    });
    $("fCity").value = state.city; $("fType").value = state.type;
    $("fMin").value = state.min; $("fMax").value = state.max; $("fQuery").value = state.q;
    $("fPano").checked = state.pano; $("fFavs").checked = false;
    filters.classList.remove("open");
    render();
    window.scrollTo({ top: $("results").getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
  });

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
  $("fPano").addEventListener("change", (e) => { state.pano = e.target.checked; render(); });
  $("resetFilters").addEventListener("click", () => {
    Object.assign(state, { city: "", type: "", min: "", max: "", beds: "", q: "", sort: "new", favs: false, pano: false });
    ["fCity", "fType", "fMin", "fMax", "fQuery"].forEach((id) => { $(id).value = ""; });
    $("fSort").value = "new";
    $("fFavs").checked = false;
    $("fPano").checked = false;
    render();
  });

  // فلاتر الموبايل
  const filters = $("filters");
  $("openFilters").addEventListener("click", () => filters.classList.add("open"));
  $("closeFilters").addEventListener("click", () => filters.classList.remove("open"));
  $("applyFilters").addEventListener("click", () => filters.classList.remove("open"));

  // لو المستخدم شال عقار من المفضلة وهو بيعرض المفضلة بس
  document.addEventListener("favs:changed", () => { if (state.favs) render(true); });
  // الإعلانات الجديدة وصلت من السيرفر → اعرضها (من غير ما نرجّع لأول الصفحة)
  document.addEventListener("listings:changed", () => render(true));

  render();
  loadSearches();
})();
