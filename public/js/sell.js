/* =========================================================
   صفحة "اعرض عقارك" — متاحة للبائع (والمدير)
   ========================================================= */
(function () {
  const user = Auth.current();
  const $ = (id) => document.getElementById(id);

  /* --- Gate: لازم يكون بائع --- */
  if (!user || !["broker", "admin"].includes(user.role)) {
    const gate = $("gate");
    gate.classList.remove("hidden");
    gate.innerHTML = !user
      ? `<div class="gate">
           <span class="ico">${ICONS.lock}</span>
           <h2>${esc(t("gate_login_title"))}</h2>
           <p>${esc(t("gate_login_text"))}</p>
           <div class="actions">
             <a class="btn btn-primary" href="auth.html?next=sell.html&role=broker#signup">${esc(t("signup"))}</a>
             <a class="btn btn-outline" href="auth.html?next=sell.html#login">${esc(t("login"))}</a>
           </div>
         </div>`
      : `<div class="gate">
           <span class="ico">${ICONS.tag}</span>
           <h2>${esc(t("gate_role_title"))}</h2>
           <p>${esc(t("gate_role_text", { role: roleName(user.role) }))}</p>
           <div class="actions">
             <a class="btn btn-primary" href="settings.html#profile">${esc(t("nav_settings"))}</a>
             <a class="btn btn-outline" href="properties.html?mode=buy">${esc(t("browse_props"))}</a>
           </div>
         </div>`;
    return;
  }

  $("sellArea").classList.remove("hidden");

  /* --- Form setup --- */
  let purpose = "sale";
  let images = []; // data URLs بعد الضغط
  const MAX_IMAGES = 5;

  $("sType").innerHTML = `<option value="">${esc(t("choose"))}</option>` +
    Object.keys(TYPES).map((k) => `<option value="${k}">${esc(typeName(k))}</option>`).join("");
  $("sCity").innerHTML = `<option value="">${esc(t("choose"))}</option>` +
    Object.keys(CITIES).map((k) => `<option value="${k}">${esc(cityName(k))}</option>`).join("");
  $("dzIcon").outerHTML = ICONS.upload;

  function setPurpose(p) {
    purpose = p;
    document.querySelectorAll("#purposeSeg [data-purpose]").forEach((b) => b.classList.toggle("active", b.dataset.purpose === p));
    $("priceLabel").textContent = t(p === "rent" ? "l_price_rent" : "l_price");
  }
  document.querySelectorAll("#purposeSeg [data-purpose]").forEach((b) => b.addEventListener("click", () => setPurpose(b.dataset.purpose)));
  setPurpose("sale");

  /* --- Location picker: البروكر بيضغط على الخريطة يحدد مكان العقار --- */
  let picked = null; // [lat, lng]
  let pickerMap = null;
  let pin = null;
  const pinEl = document.createElement("div");
  pinEl.className = "picker-pin";
  pinEl.innerHTML = ICONS.pin;

  function setPicked(ll) {
    picked = ll;
    if (!pickerMap) return;
    if (!ll) { if (pin) { pin.remove(); pin = null; } $("pickerStatus").textContent = ""; return; }
    if (pin) pin.setPosition(ll); else pin = pickerMap.addMarker(ll[0], ll[1], pinEl);
    $("pickerStatus").textContent = `${t("location_set")} (${ll[0].toFixed(5)}, ${ll[1].toFixed(5)})`;
  }
  GeoMap.create($("pickerMap"), { center: MAP_CENTER, zoom: MAP_ZOOM, gestures: "cooperative" })
    .then((m) => {
      pickerMap = m;
      $("pickerMap").querySelector(".map-loading")?.remove();
      m.onMapClick((ll) => setPicked(ll));
    })
    .catch(() => { $("pickerMap").innerHTML = `<div class="map-loading">${esc(t("map_error"))}</div>`; });
  // لما يختار الحي، الخريطة تروح عليه
  $("sCity").addEventListener("change", (e) => {
    const c = CITY_CENTERS[e.target.value];
    if (pickerMap && c && !picked) pickerMap.setView(c, 15);
  });

  /* --- Images: ضغط الصور قبل الحفظ عشان مساحة المتصفح --- */
  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    for (const f of files) {
      if (images.length >= MAX_IMAGES) { toast(t("images_max")); break; }
      try { images.push(await compressImage(f, 1000, 0.7)); } catch (e) { /* skip broken image */ }
    }
    renderThumbs();
  }

  function renderThumbs() {
    $("thumbs").innerHTML = images.map((src, i) =>
      `<div class="th"><img src="${src}" alt=""><button type="button" data-remove="${i}" aria-label="${esc(t("delete"))}">×</button></div>`).join("");
  }

  $("sImages").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
  $("thumbs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]");
    if (b) { images.splice(Number(b.dataset.remove), 1); renderThumbs(); }
  });
  const dz = $("dropzone");
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
  dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  /* --- Submit --- */
  const form = $("sellForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const errBox = form.querySelector("[data-error]");
    errBox.classList.add("hidden");
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));

    const required = ["sTitle", "sType", "sCity", "sAddress", "sPrice", "sSize", "sPhone"];
    const missing = required.filter((id) => !$(id).value.trim() || (["sPrice", "sSize"].includes(id) && Number($(id).value) <= 0));
    if (missing.length) {
      missing.forEach((id) => $(id).classList.add("invalid"));
      errBox.textContent = t("err_required");
      errBox.classList.remove("hidden");
      $(missing[0]).focus();
      return;
    }
    const phone = $("sPhone").value.replace(/[\s-]/g, "");
    if (!/^\+?\d{8,14}$/.test(phone)) {
      $("sPhone").classList.add("invalid");
      errBox.textContent = t("err_phone");
      errBox.classList.remove("hidden");
      $("sPhone").focus();
      return;
    }

    const listing = {
      id: uid("l"),
      purpose,
      type: $("sType").value,
      city: $("sCity").value,
      title: $("sTitle").value.trim(),
      address: $("sAddress").value.trim(),
      price: Number($("sPrice").value),
      size: Number($("sSize").value),
      beds: Math.max(0, Number($("sBeds").value) || 0),
      baths: Math.max(0, Number($("sBaths").value) || 0),
      desc: $("sDesc").value.trim(),
      phone,
      images: [...images],
      owner: user.name,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    };
    if (picked) { listing.lat = picked[0]; listing.lng = picked[1]; }

    try {
      Listings.add(listing);
    } catch (err) {
      toast(t("err_storage"), "error");
      return;
    }

    toast(t("listing_published"), "success");
    form.reset();
    images = [];
    renderThumbs();
    setPicked(null);
    setPurpose("sale");
    renderMine();
    $("mine").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* --- My listings --- */
  function renderMine() {
    const mine = Listings.byOwner(user.id);
    $("myList").innerHTML = mine.length
      ? mine.map((l) => `
          <div class="my-item">
            <div class="mi-img" data-prop-id="${esc(l.id)}" style="cursor:pointer">
              ${l.images[0] ? `<img src="${esc(l.images[0])}" alt="">` : `<div class="img-fallback">${ICONS.house}</div>`}
            </div>
            <div data-prop-id="${esc(l.id)}" style="cursor:pointer">
              <strong>${esc(l.title)}</strong>
              <small>${esc(t(l.purpose === "rent" ? "for_rent" : "for_sale"))} · ${esc(fmtPrice(l.price))}${Moderation.isHidden(l.id) ? ` · <span style="color:var(--danger)">${esc(t("st_hidden"))}</span>` : ""}</small>
            </div>
            <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(l.id)}">${esc(t("delete"))}</button>
          </div>`).join("")
      : `<p style="margin:0;color:var(--muted);font-weight:600">${esc(t("no_my_listings"))}</p>`;
  }
  $("myList").addEventListener("click", (e) => {
    const del = e.target.closest("[data-delete]");
    if (!del) return;
    e.stopPropagation();
    if (!confirm(t("confirm_delete"))) return;
    Listings.remove(del.dataset.delete);
    toast(t("deleted"));
    renderMine();
  });
  renderMine();
  if (location.hash === "#mine") setTimeout(() => $("mine").scrollIntoView({ block: "start" }), 50);
})();
