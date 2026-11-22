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
  let pano = null; // صورة 360° (data URL) — اختياري
  const MAX_IMAGES = 6;

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

  /* --- صورة 360°: لازم تكون بانوراما كاملة (العرض = ضعف الطول) --- */
  $("panoIco").outerHTML = ICONS.pano;
  $("panoZoneIco").outerHTML = ICONS.upload;
  $("panoPreview").innerHTML = `${ICONS.eye}<span>${esc(t("pano_preview"))}</span>`;
  $("panoRemove").innerHTML = `${ICONS.trash}<span>${esc(t("delete"))}</span>`;
  const MAX_PANO_CHARS = 2600 * 1024; // نفس حد السيرفر تقريباً

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => resolve({ im, url });
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("err_generic")); };
      im.src = url;
    });
  }
  // بنصغّرها لحد ما تبقى أقل من 2 ميجا تقريباً
  async function compressPano(file) {
    const { im, url } = await readImage(file);
    try {
      const ratio = im.width / im.height;
      if (ratio < 1.85 || ratio > 2.15) throw new Error("err_pano_ratio");
      for (const [w, q] of [[4096, 0.72], [3584, 0.66], [3072, 0.62], [2560, 0.6], [2048, 0.6]]) {
        const width = Math.min(w, im.width);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.round(width / 2);
        canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", q);
        if (data.length <= MAX_PANO_CHARS) return data;
      }
      throw new Error("err_image_big");
    } finally { URL.revokeObjectURL(url); }
  }
  function renderPano() {
    $("panoPicked").classList.toggle("hidden", !pano);
    $("panoZone").classList.toggle("hidden", !!pano);
    if (pano) $("panoThumb").src = pano;
  }
  $("sPano").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    $("panoZone").classList.add("busy");
    try { pano = await compressPano(file); renderPano(); }
    catch (err) { toast(t(err.message), "error"); }
    finally { $("panoZone").classList.remove("busy"); }
  });
  $("panoRemove").addEventListener("click", () => { pano = null; renderPano(); });
  $("panoPreview").addEventListener("click", () => { if (pano) openPano(pano, $("sTitle").value.trim()); });

  /* --- Submit --- */
  const form = $("sellForm");
  form.addEventListener("submit", async (e) => {
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

    const payload = {
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
      pano,
    };
    if (picked) { payload.lat = picked[0]; payload.lng = picked[1]; }
    // حد Vercel لحجم الطلب (4.5 ميجا)
    if (JSON.stringify(payload).length > 4.3 * 1024 * 1024) {
      errBox.textContent = t("err_upload_big");
      errBox.classList.remove("hidden");
      return;
    }

    const btn = $("submitBtn");
    btn.disabled = true;
    btn.textContent = t("publishing");
    try {
      await Listings.add(payload); // السيرفر بيبلّغ اللي عندهم بحث محفوظ أو تفضيلات مطابقة
    } catch (err) {
      errBox.textContent = t(err.message);
      errBox.classList.remove("hidden");
      return;
    } finally {
      btn.disabled = false;
      btn.textContent = t("submit_listing");
    }

    toast(t("listing_published"), "success");
    form.reset();
    images = [];
    pano = null;
    renderThumbs();
    renderPano();
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
              <small>${esc(t(l.purpose === "rent" ? "for_rent" : "for_sale"))} · ${esc(fmtPrice(l.price))}${l.pano ? " · 360°" : ""}${Moderation.isHidden(l.id) ? ` · <span style="color:var(--danger)">${esc(t("st_hidden"))}</span>` : ""}</small>
            </div>
            <div class="mi-actions">
              <button type="button" class="btn btn-outline btn-sm" data-price="${esc(l.id)}" title="${esc(t("edit_price"))}">${ICONS.edit}<span>${esc(t("edit_price"))}</span></button>
              <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(l.id)}">${esc(t("delete"))}</button>
            </div>
          </div>`).join("")
      : `<p style="margin:0;color:var(--muted);font-weight:600">${esc(t("no_my_listings"))}</p>`;
  }

  // تعديل السعر → بيتسجل في "سجل السعر"، ولو نزل اللي حافظينه في المفضلة بيجيلهم إشعار
  function editPrice(l) {
    const { el, close } = openModal(`
      <form class="modal-pad" novalidate>
        <h2 style="margin:0 0 6px;font-size:22px">${ICONS.edit} ${esc(t("edit_price"))}</h2>
        <p class="hint" style="margin:0 0 14px">${esc(l.title)}</p>
        <div class="form-group">
          <label for="newPrice">${esc(t(l.purpose === "rent" ? "l_price_rent" : "l_price"))}</label>
          <input class="input" id="newPrice" type="number" min="1" step="1000" dir="ltr" value="${esc(l.price)}">
          <small class="hint">${esc(t("edit_price_hint"))}</small>
        </div>
        <div class="alert alert-error hidden" data-error></div>
        <div class="btn-row" style="justify-content:flex-end">
          <button type="button" class="btn btn-ghost" data-cancel>${esc(t("cancel"))}</button>
          <button type="submit" class="btn btn-primary">${esc(t("save"))}</button>
        </div>
      </form>`, { size: "sm" });
    const f = el.querySelector("form");
    el.querySelector("[data-cancel]").addEventListener("click", close);
    const input = el.querySelector("#newPrice");
    input.select();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const price = Number(input.value);
      const box = f.querySelector("[data-error]");
      if (!(price > 0)) { box.textContent = t("err_required"); box.classList.remove("hidden"); return; }
      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await Listings.setPrice(l.id, price);
        close();
        toast(t("price_updated"), "success");
      } catch (err) {
        btn.disabled = false;
        box.textContent = t(err.message);
        box.classList.remove("hidden");
      }
    });
  }

  $("myList").addEventListener("click", async (e) => {
    const priceBtn = e.target.closest("[data-price]");
    if (priceBtn) {
      e.stopPropagation();
      const l = Listings.get(priceBtn.dataset.price);
      if (l) editPrice(l);
      return;
    }
    const del = e.target.closest("[data-delete]");
    if (!del) return;
    e.stopPropagation();
    if (!confirm(t("confirm_delete"))) return;
    del.disabled = true;
    try {
      await Listings.remove(del.dataset.delete);
      toast(t("deleted"));
    } catch (err) {
      del.disabled = false;
      toast(t(err.message), "error");
    }
  });
  document.addEventListener("listings:changed", renderMine);
  renderMine();
  if (location.hash === "#mine") setTimeout(() => $("mine").scrollIntoView({ block: "start" }), 50);
})();
