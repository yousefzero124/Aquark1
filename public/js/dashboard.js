/* =========================================================
   dashboard.html = "عقاراتي" — للبروكر والمستثمر بس
   العقارات اللي نزلها: مرات الحفظ، الرسايل، الحالة، تعديل / سعر / حذف
   (الأدمن ليه "الداشبورد" في admin.html، والمشتري مالوش الصفحة دي)
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const me = Auth.current();
  if (!me) return;
  if (me.role === "admin") { location.replace("admin.html"); return; }
  if (!["broker", "investor"].includes(me.role)) { location.replace("index.html"); return; }

  let stats = {}; // { listingId: { favorites, chats, unread } }

  /* --- الراس --- */
  document.title = `${t("brand")} | ${t("page_my_listings")}`;
  $("dashRole").textContent = roleName(me.role);
  $("dashHello").textContent = t("page_my_listings");
  $("dashSub").textContent = t("dash_sub_mine");
  $("dashKpis").classList.add("hidden");
  $("dashActions").innerHTML = `
    <a class="btn btn-primary" href="sell.html">${ICONS.plus}<span>${esc(t("dash_add"))}</span></a>
    <a class="btn btn-outline" href="messages.html">${ICONS.message}<span>${esc(t("messages"))}</span></a>`;

  /* --- مساعدات --- */
  const locale = Lang.get() === "ar" ? "ar-EG-u-nu-latn" : "en-US";
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");
  const thumb = (l) => `<span class="mini-thumb">${l.images && l.images[0]
    ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" onerror="imgFail(this)">`
    : `<span class="img-fallback">${ICONS.house}</span>`}</span>`;

  // عقاراتي: جدول بكل إعلان + مرات الحفظ والرسايل والحالة والإجراءات
  function render() {
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
          <a class="btn btn-outline btn-sm" href="sell.html?edit=${encodeURIComponent(l.id)}&next=dashboard.html">${ICONS.edit}<span>${esc(t("edit"))}</span></a>
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
      : `<div class="dash-empty"><p>${esc(t("dash_empty_mine"))}</p>
          <a class="btn btn-primary btn-sm" href="sell.html">${ICONS.plus}<span>${esc(t("dash_add"))}</span></a></div>`;
    $("dashBody").innerHTML = `
      <section class="card dash-sec" id="sec-listings">
        <div class="dash-sec-head"><h2>${ICONS.building}<span>${esc(`${t("my_listings")} (${fmtNum(mine.length)})`)}</span></h2></div>
        ${body}
      </section>`;
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

  render(); // من النسخة المحفوظة على طول
  Api.call("GET", "/api/dashboard").then((d) => { stats = d.listings || {}; render(); }).catch(() => {});
  document.addEventListener("listings:changed", render);
})();
