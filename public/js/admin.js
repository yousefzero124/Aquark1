/* =========================================================
   لوحة تحكم الأدمن
   - نظرة عامة: أرقام + رسوم بسيطة + أحدث المستخدمين والإعلانات
   - المستخدمين: بحث، فلترة بالنوع، تغيير نوع الحساب، عرض، حذف
   - الإعلانات: بحث، فلترة بالحالة، عرض، تمييز، إخفاء/إظهار، حذف
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const me = Auth.current();

  /* --- Gate: للأدمن بس --- */
  if (!me || me.role !== "admin") {
    const gate = $("gate");
    gate.classList.remove("hidden");
    gate.innerHTML = `<div class="gate">
        <span class="ico">${ICONS.admin}</span>
        <h2>${esc(t("admin_only_title"))}</h2>
        <p>${esc(t("admin_only_text"))}</p>
        <div class="actions">
          ${me ? `<a class="btn btn-primary" href="index.html">${esc(t("nav_home"))}</a>`
               : `<a class="btn btn-primary" href="auth.html?next=admin.html#login">${esc(t("login"))}</a>`}
        </div>
      </div>`;
    return;
  }
  $("adminArea").classList.remove("hidden");
  $("adminTabs").classList.remove("hidden");
  document.querySelectorAll("[data-ico]").forEach((el) => { el.outerHTML = ICONS[el.dataset.ico]; });

  const ROLES = ["buyer", "investor", "broker", "admin"];
  const locale = Lang.get() === "ar" ? "ar-EG" : "en-US";
  const SEP = Lang.get() === "ar" ? "، " : ", ";
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");
  const avatarHTML = (u) => `<span class="avatar">${u.picture
    ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">`
    : esc((u.name || "?").trim().charAt(0).toUpperCase())}</span>`;
  const ownerName = (l) => {
    if (l.ownerId) { const u = Auth.users().find((x) => x.id === l.ownerId); return u ? u.name : (l.owner || "—"); }
    return l.owner || "—";
  };

  /* --- Tabs --- */
  const TABS = ["overview", "users", "listings"];
  function showTab(tab) {
    if (!TABS.includes(tab)) tab = "overview";
    TABS.forEach((name) => $(`panel-${name}`).classList.toggle("hidden", name !== tab));
    document.querySelectorAll("#adminTabs [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  }
  $("adminTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    history.replaceState(null, "", `#${b.dataset.tab}`);
    showTab(b.dataset.tab);
  });
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  /* =======================================================
     Overview
     ======================================================= */
  // رسم أعمدة أفقية بلون واحد مع القيمة مكتوبة جنب كل عمود
  function bars(host, rows) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    if (!rows.some((r) => r.value)) { host.innerHTML = `<p class="hint">${esc(t("no_data"))}</p>`; return; }
    host.innerHTML = rows.map((r) => `
      <div class="bar-row" title="${esc(r.label)}: ${fmtNum(r.value)}">
        <span class="bar-label">${esc(r.label)}</span>
        <span class="bar-track">${r.value ? `<span class="bar-fill" style="width:${(r.value / max) * 100}%"></span>` : ""}</span>
        <span class="bar-val">${fmtNum(r.value)}</span>
      </div>`).join("");
  }
  function countBy(list, key, keys, nameFn) {
    return keys.map((k) => ({ label: nameFn(k), value: list.filter((x) => x[key] === k).length }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  function renderOverview() {
    const users = Auth.users();
    const visible = Listings.all();
    const hiddenCount = Listings.everything().length - visible.length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newUsers = users.filter((u) => new Date(u.createdAt).getTime() >= weekAgo).length;

    $("kpis").innerHTML = [
      [ICONS.user, users.length, "kpi_users"],
      [ICONS.star, newUsers, "kpi_new_users"],
      [ICONS.building, visible.length, "kpi_listings"],
      [ICONS.eye, hiddenCount, "kpi_hidden"],
    ].map(([icon, n, key]) => `
      <div class="stat"><span class="ico">${icon}</span><div><strong>${fmtNum(n)}</strong><span>${esc(t(key))}</span></div></div>`).join("");

    bars($("chartRoles"), ROLES.map((r) => ({ label: roleName(r), value: users.filter((u) => u.role === r).length })));
    bars($("chartPurpose"), [
      { label: t("for_sale"), value: visible.filter((l) => l.purpose === "sale").length },
      { label: t("for_rent"), value: visible.filter((l) => l.purpose === "rent").length },
    ]);
    bars($("chartCities"), countBy(visible, "city", Object.keys(CITIES), cityName));
    bars($("chartTypes"), countBy(visible, "type", Object.keys(TYPES), typeName));

    const recentU = [...users].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
    $("recentUsers").innerHTML = recentU.length
      ? recentU.map((u) => `
          <button type="button" class="mini-item" data-view-user="${esc(u.id)}">
            ${avatarHTML(u)}
            <span><strong>${esc(u.name)}</strong><small>${esc(roleName(u.role))} · ${esc(fmtDate(u.createdAt))}</small></span>
          </button>`).join("")
      : `<p class="hint">${esc(t("no_users"))}</p>`;

    const recentL = [...Listings.everything()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
    $("recentListings").innerHTML = recentL.map((l) => `
      <button type="button" class="mini-item" data-prop-id="${esc(l.id)}">
        <span class="mini-thumb">${l.images && l.images[0] ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" onerror="imgFail(this)">` : `<span class="img-fallback">${ICONS.house}</span>`}</span>
        <span><strong>${esc(loc(l.title))}</strong><small>${esc(fmtPrice(l.price))} · ${esc(fmtDate(l.createdAt))}</small></span>
      </button>`).join("");
  }

  /* =======================================================
     Users
     ======================================================= */
  let userQuery = "";
  let roleFilter = "";
  $("roleFilter").innerHTML = [["", t("st_all")], ...ROLES.map((r) => [r, roleName(r)])]
    .map(([v, label]) => `<button type="button" data-role="${v}">${esc(label)}</button>`).join("");

  function renderUsers() {
    const q = userQuery.trim().toLowerCase();
    const list = Auth.users()
      .filter((u) => !roleFilter || u.role === roleFilter)
      .filter((u) => !q || [u.name, u.email, u.phone].join(" ").toLowerCase().includes(q))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    document.querySelectorAll("#roleFilter [data-role]").forEach((b) => b.classList.toggle("active", b.dataset.role === roleFilter));
    $("userCount").textContent = t("count_users", { n: fmtNum(list.length) });
    $("usersBody").innerHTML = list.length ? list.map((u) => {
      const self = u.id === me.id;
      return `<tr>
        <td><div class="cell-user">${avatarHTML(u)}<div>
          <strong>${esc(u.name)}</strong>${self ? ` <span class="role-chip">${esc(t("you"))}</span>` : ""}
          <small dir="ltr">${esc(u.email)}</small></div></div></td>
        <td><select class="input input-sm" data-role-for="${esc(u.id)}" ${self ? "disabled" : ""} aria-label="${esc(t("col_role"))}">
          ${ROLES.map((r) => `<option value="${r}" ${u.role === r ? "selected" : ""}>${esc(roleName(r))}</option>`).join("")}
        </select></td>
        <td dir="ltr" class="nowrap">${esc(u.phone || "—")}</td>
        <td class="nowrap">${esc(u.city ? cityName(u.city) : "—")}</td>
        <td class="nowrap">${esc(fmtDate(u.createdAt))}</td>
        <td><div class="row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-view-user="${esc(u.id)}">${esc(t("view"))}</button>
          ${self ? "" : `<button type="button" class="btn btn-danger btn-sm" data-del-user="${esc(u.id)}">${esc(t("delete"))}</button>`}
        </div></td>
      </tr>`;
    }).join("") : `<tr><td colspan="6" class="empty-cell">${esc(t("no_users"))}</td></tr>`;
  }

  function prefsSummary(p) {
    if (!p) return `<span class="hint" style="margin:0">${esc(t("prefs_none"))}</span>`;
    const purpose = { buy: t("p_buy"), rent: t("p_rent"), both: t("p_both") }[p.purpose] || "—";
    const budget = p.budgetMin || p.budgetMax
      ? `${p.budgetMin ? fmtPrice(p.budgetMin) : "0"} – ${p.budgetMax ? fmtPrice(p.budgetMax) : "∞"}` : "—";
    return `<dl class="kv">
      <dt>${esc(t("q_purpose"))}</dt><dd>${esc(purpose)}</dd>
      <dt>${esc(t("q_types"))}</dt><dd>${esc((p.types || []).map(typeName).join(SEP) || "—")}</dd>
      <dt>${esc(t("q_cities"))}</dt><dd>${esc((p.cities || []).map(cityName).join(SEP) || "—")}</dd>
      <dt>${esc(t("q_budget"))}</dt><dd>${esc(budget)}</dd>
      <dt>${esc(t("q_beds"))}</dt><dd>${p.beds ? `${p.beds}+` : esc(t("any_beds"))}</dd>
    </dl>`;
  }

  function viewUser(id) {
    const u = Auth.users().find((x) => x.id === id);
    if (!u) return;
    const gender = u.gender ? t(u.gender) : "—";
    openModal(`
      <div class="modal-pad">
        <div class="cell-user" style="margin-bottom:18px">
          <span class="avatar avatar-md">${u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc((u.name || "?").charAt(0).toUpperCase())}</span>
          <div><h2 style="margin:0;font-size:22px">${esc(u.name)}</h2><span class="role-chip">${esc(roleName(u.role))}</span></div>
        </div>
        <h3 style="margin:0 0 8px;font-size:16px">${esc(t("user_details"))}</h3>
        <dl class="kv">
          <dt>${esc(t("l_email"))}</dt><dd dir="ltr">${esc(u.email)}</dd>
          <dt>${esc(t("l_mobile"))}</dt><dd dir="ltr">${esc(u.phone || "—")}</dd>
          <dt>${esc(t("l_age"))}</dt><dd>${esc(u.age || "—")}</dd>
          <dt>${esc(t("l_gender"))}</dt><dd>${esc(gender)}</dd>
          <dt>${esc(t("l_user_city"))}</dt><dd>${esc(u.city ? cityName(u.city) : "—")}</dd>
          <dt>${esc(t("l_user_address"))}</dt><dd>${esc(u.address || "—")}</dd>
          <dt>${esc(t("col_joined"))}</dt><dd>${esc(fmtDate(u.createdAt))}${u.provider === "google" ? " · Google" : ""}</dd>
          <dt>${esc(t("listings_count"))}</dt><dd>${fmtNum(Listings.byOwner(u.id).length)}</dd>
        </dl>
        <h3 style="margin:18px 0 8px;font-size:16px">${esc(t("tab_prefs"))}</h3>
        ${prefsSummary(u.prefs)}
      </div>`, { size: "sm" });
  }

  $("userQuery").addEventListener("input", (e) => { userQuery = e.target.value; renderUsers(); });
  $("roleFilter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-role]");
    if (b) { roleFilter = b.dataset.role; renderUsers(); }
  });
  $("usersBody").addEventListener("change", (e) => {
    const sel = e.target.closest("[data-role-for]");
    if (!sel || sel.dataset.roleFor === me.id || !ROLES.includes(sel.value)) return;
    Auth.updateUser(sel.dataset.roleFor, { role: sel.value });
    Notifs.push(sel.dataset.roleFor, "role", { role: sel.value });
    toast(t("role_changed"), "success");
    renderAll();
  });
  $("usersBody").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del-user]");
    if (!del || del.dataset.delUser === me.id) return;
    const u = Auth.users().find((x) => x.id === del.dataset.delUser);
    if (!u || !confirm(t("confirm_delete_user", { name: u.name }))) return;
    Auth.removeUser(u.id);
    toast(t("user_deleted"));
    renderAll();
  });
  // عرض المستخدم من أي مكان في الصفحة (الجدول أو أحدث المستخدمين)
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-view-user]");
    if (v) viewUser(v.dataset.viewUser);
  });

  /* =======================================================
     Listings
     ======================================================= */
  let listingQuery = "";
  let statusFilter = "";
  $("statusFilter").innerHTML = [["", "st_all"], ["visible", "st_visible"], ["hidden", "st_hidden"], ["featured", "st_featured"]]
    .map(([v, key]) => `<button type="button" data-status="${v}">${esc(t(key))}</button>`).join("");

  function renderListings() {
    const q = listingQuery.trim().toLowerCase();
    const list = Listings.everything()
      .filter((l) => {
        const hidden = Moderation.isHidden(l.id);
        if (statusFilter === "visible" && hidden) return false;
        if (statusFilter === "hidden" && !hidden) return false;
        if (statusFilter === "featured" && !Moderation.isFeatured(l)) return false;
        if (!q) return true;
        const hay = [loc(l.title), l.title?.en, loc(l.address), l.address?.en, cityName(l.city), ownerName(l)]
          .filter((x) => typeof x === "string").join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    document.querySelectorAll("#statusFilter [data-status]").forEach((b) => b.classList.toggle("active", b.dataset.status === statusFilter));
    $("listingCount").textContent = t("count_listings", { n: fmtNum(list.length) });
    $("listingsBody").innerHTML = list.length ? list.map((l) => {
      const hidden = Moderation.isHidden(l.id);
      const featured = Moderation.isFeatured(l);
      const verified = Moderation.isVerified(l);
      const seed = Listings.isSeed(l.id);
      return `<tr class="${hidden ? "is-hidden" : ""}">
        <td><div class="cell-listing">
          <span class="mini-thumb">${l.images && l.images[0] ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" onerror="imgFail(this)">` : `<span class="img-fallback">${ICONS.house}</span>`}</span>
          <div><strong>${esc(loc(l.title))}</strong>
          <small>${esc(typeName(l.type))} · ${esc(cityName(l.city))} · ${esc(t(l.purpose === "rent" ? "for_rent" : "for_sale"))}</small></div>
        </div></td>
        <td class="nowrap">${esc(fmtPrice(l.price))}${l.purpose === "rent" ? ` <small class="muted">${esc(t("per_month"))}</small>` : ""}</td>
        <td>${esc(ownerName(l))}${seed ? ` <span class="status-chip demo">${esc(t("st_demo"))}</span>` : ""}</td>
        <td><div class="chip-stack">
          <span class="status-chip ${hidden ? "off" : "on"}">${esc(t(hidden ? "st_hidden" : "st_visible"))}</span>
          ${featured ? `<span class="status-chip featured">${ICONS.star}${esc(t("st_featured"))}</span>` : ""}
          ${verified ? `<span class="status-chip featured">${ICONS.verified}${esc(t("verified"))}</span>` : ""}
        </div></td>
        <td><div class="row-actions">
          <button type="button" class="btn btn-outline btn-sm" data-prop-id="${esc(l.id)}">${esc(t("view"))}</button>
          <button type="button" class="btn btn-outline btn-sm" data-verify="${esc(l.id)}">${esc(t(verified ? "unverify" : "verify"))}</button>
          <button type="button" class="btn btn-outline btn-sm" data-feature="${esc(l.id)}">${esc(t(featured ? "unfeature" : "feature"))}</button>
          <button type="button" class="btn btn-outline btn-sm" data-hide="${esc(l.id)}">${esc(t(hidden ? "show" : "hide"))}</button>
          ${seed ? "" : `<button type="button" class="btn btn-danger btn-sm" data-del-listing="${esc(l.id)}">${esc(t("delete"))}</button>`}
        </div></td>
      </tr>`;
    }).join("") : `<tr><td colspan="5" class="empty-cell">${esc(t("no_results"))}</td></tr>`;
  }

  $("listingQuery").addEventListener("input", (e) => { listingQuery = e.target.value; renderListings(); });
  $("statusFilter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-status]");
    if (b) { statusFilter = b.dataset.status; renderListings(); }
  });
  $("listingsBody").addEventListener("click", (e) => {
    const f = e.target.closest("[data-feature]");
    const h = e.target.closest("[data-hide]");
    const d = e.target.closest("[data-del-listing]");
    const v = e.target.closest("[data-verify]");
    if (v) {
      const l = Listings.get(v.dataset.verify);
      const on = !Moderation.isVerified(l);
      Moderation.setVerified(l.id, on);
      toast(t(on ? "listing_verified" : "listing_unverified"), "success");
    } else if (f) {
      const l = Listings.get(f.dataset.feature);
      const on = !Moderation.isFeatured(l);
      Moderation.setFeatured(l.id, on);
      toast(t(on ? "listing_featured" : "listing_unfeatured"), "success");
    } else if (h) {
      const on = !Moderation.isHidden(h.dataset.hide);
      Moderation.setHidden(h.dataset.hide, on);
      toast(t(on ? "listing_hidden" : "listing_shown"), "success");
    } else if (d) {
      if (Listings.isSeed(d.dataset.delListing) || !confirm(t("confirm_delete"))) return;
      Listings.remove(d.dataset.delListing);
      toast(t("deleted"));
    } else return;
    renderAll();
  });

  /* --- Render --- */
  function renderAll() {
    renderOverview();
    renderUsers();
    renderListings();
  }
  renderAll();
  showTab(location.hash.slice(1));
})();
