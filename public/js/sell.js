/* =========================================================
   صفحة "اعرض عقارك" — للبروكر والمستثمر والأدمن
   - إعلان جديد: صور + صورة 360° + فيديو (اختياريين)
   - تعديل إعلان: sell.html?edit=<id> (لصاحب الإعلان أو الأدمن)
   ========================================================= */
(function () {
  const user = Auth.current();
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const editId = params.get("edit");
  const back = safeNext(params.get("next") || (user && user.role === "admin" ? "admin.html#listings" : "dashboard.html#listings"));

  /* --- Gate: بروكر أو مستثمر أو أدمن --- */
  if (!user || !canPost(user)) {
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
  // الصور: { src, data } لصورة جديدة (data URL) أو { src, keep: "keep:2" } لصورة موجودة (في التعديل)
  let images = [];
  let pano = null;  // { src, data } جديدة أو { src, keep: true } موجودة
  let video = null; // { value: "youtube:<id>" أو لينك الملف, preview }
  let videoUploading = false;
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

  /* --- Location picker: بيضغط على الخريطة يحدد مكان العقار --- */
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
  const mapReady = GeoMap.create($("pickerMap"), { center: MAP_CENTER, zoom: MAP_ZOOM, gestures: "cooperative" })
    .then((m) => {
      pickerMap = m;
      $("pickerMap").querySelector(".map-loading")?.remove();
      m.onMapClick((ll) => setPicked(ll));
      if (picked) { setPicked(picked); m.setView(picked, 16); }
    })
    .catch(() => { $("pickerMap").innerHTML = `<div class="map-loading">${esc(t("map_error"))}</div>`; });
  // لما يختار الحي، الخريطة تروح عليه
  $("sCity").addEventListener("change", (e) => {
    const c = CITY_CENTERS[e.target.value];
    if (pickerMap && c && !picked) pickerMap.setView(c, 15);
  });

  /* --- Images: ضغط الصور قبل الرفع --- */
  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    for (const f of files) {
      if (images.length >= MAX_IMAGES) { toast(t("images_max")); break; }
      try { const data = await compressImage(f, 1000, 0.7); images.push({ src: data, data }); } catch (e) { /* skip broken image */ }
    }
    renderThumbs();
  }
  function renderThumbs() {
    $("thumbs").innerHTML = images.map((img, i) =>
      `<div class="th"><img src="${esc(img.src)}" alt=""><button type="button" data-remove="${i}" aria-label="${esc(t("delete"))}">×</button></div>`).join("");
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
    if (pano) $("panoThumb").src = pano.src;
  }
  $("sPano").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    $("panoZone").classList.add("busy");
    try { const data = await compressPano(file); pano = { src: data, data }; renderPano(); }
    catch (err) { toast(t(err.message), "error"); }
    finally { $("panoZone").classList.remove("busy"); }
  });
  $("panoRemove").addEventListener("click", () => { pano = null; renderPano(); });
  $("panoPreview").addEventListener("click", () => { if (pano) openPano(pano.src, $("sTitle").value.trim()); });

  /* --- فيديو: رفع ملف (Vercel Blob على الموقع / ملف على الجهاز) أو لينك يوتيوب --- */
  $("videoIco").outerHTML = ICONS.video;
  $("videoZoneIco").outerHTML = ICONS.upload;
  $("videoRemove").innerHTML = `${ICONS.trash}<span>${esc(t("video_remove"))}</span>`;
  let uploadCfg = { video: "local", maxMB: 50, types: ["video/mp4", "video/webm", "video/quicktime"] };
  // الفيديو من جهاز المستخدم بس. لو التخزين لسه متفعّلش على الموقع بتظهر ملحوظة
  Api.call("GET", "/api/uploads/config").then((cfg) => {
    uploadCfg = cfg;
    $("videoOff").classList.toggle("hidden", cfg.video !== "off");
  }).catch(() => {});

  function renderVideo() {
    $("videoPick").classList.toggle("hidden", !!video);
    $("videoPicked").classList.toggle("hidden", !video);
    $("videoPreview").innerHTML = video ? videoPlayerHTML(video.preview).replace("autoplay=1", "autoplay=0").replace(" autoplay ", " ") : "";
  }
  function setProgress(p) {
    $("videoProgress").classList.toggle("hidden", p == null);
    if (p == null) return;
    $("videoBar").style.width = `${p}%`;
    $("videoPct").textContent = t("video_uploading", { p: Math.round(p) });
  }
  // على الجهاز: الملف بيتبعت للسيرفر بتاعنا (بـ XHR عشان نعرض نسبة الرفع)
  function uploadLocal(file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/uploads/video");
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress((e.loaded / e.total) * 100); };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (e) { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
        else reject(new Error(data.error || "err_server"));
      };
      xhr.onerror = () => reject(new Error("err_network"));
      xhr.send(file);
    });
  }
  // على الموقع: المتصفح بيرفع لـ Vercel Blob على طول (السيرفر بيدي تصريح بس)
  async function uploadBlob(file) {
    const { upload } = await import("https://esm.sh/@vercel/blob@2.8.2/client");
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const blob = await upload(`videos/${user.id}.${ext}`, file, {
      access: "public",
      handleUploadUrl: "/api/uploads/blob",
      contentType: file.type,
      multipart: file.size > 10 * 1024 * 1024,
      onUploadProgress: (e) => setProgress(e.percentage),
    });
    return blob.url;
  }
  $("sVideo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!uploadCfg.types.includes(file.type)) return toast(t("err_video_type"), "error");
    if (file.size > uploadCfg.maxMB * 1024 * 1024) return toast(t("err_video_big"), "error");
    if (uploadCfg.video === "off") return toast(t("err_video_unavailable"), "error");
    videoUploading = true;
    $("videoZone").classList.add("busy");
    setProgress(0);
    try {
      const url = uploadCfg.video === "blob" ? await uploadBlob(file) : await uploadLocal(file);
      video = { value: url, preview: { type: "file", url } };
      renderVideo();
    } catch (err) {
      toast(t(/^err_/.test(err.message) ? err.message : "err_video"), "error");
    } finally {
      videoUploading = false;
      setProgress(null);
      $("videoZone").classList.remove("busy");
    }
  });
  $("videoRemove").addEventListener("click", () => { video = null; renderVideo(); });

  /* --- وضع التعديل: نملا الفورم من الإعلان --- */
  let editing = null;
  async function initEdit() {
    let l = Listings.get(editId);
    if (!l && !Listings.isSeed(editId)) { await Listings.sync(); l = Listings.get(editId); } // لسه موصلش من السيرفر
    if (!l || Listings.isSeed(editId)) {
      toast(t(l ? "err_edit_demo" : "err_not_found"), "error");
      setTimeout(() => { location.href = back; }, 1200);
      return;
    }
    if (!canEditListing(l, user)) {
      toast(t("err_forbidden"), "error");
      setTimeout(() => { location.href = back; }, 1200);
      return;
    }
    editing = l;
    document.title = `${t("brand")} | ${t("edit_listing")}`;
    $("sellTitle").textContent = t("edit_listing");
    $("sellSub").textContent = t("edit_listing_sub");
    $("submitBtn").textContent = t("save_listing");
    $("cancelEdit").href = back;
    $("cancelEdit").classList.remove("hidden");
    setPurpose(l.purpose);
    $("sTitle").value = loc(l.title);
    $("sType").value = l.type;
    $("sCity").value = l.city;
    $("sAddress").value = loc(l.address);
    $("sPrice").value = l.price;
    $("sSize").value = l.size;
    $("sBeds").value = l.beds || 0;
    $("sBaths").value = l.baths || 0;
    $("sDesc").value = loc(l.desc);
    $("sPhone").value = l.phone || "";
    images = (l.images || []).map((src, i) => ({ src, keep: `keep:${i}` }));
    renderThumbs();
    if (l.pano) { pano = { src: l.pano, keep: true }; renderPano(); }
    if (l.video) { video = { value: "keep", preview: l.video }; renderVideo(); }
    if (hasCoords(l)) picked = [l.lat, l.lng];
    mapReady.then(() => { if (picked && pickerMap) { setPicked(picked); pickerMap.setView(picked, 16); } });
  }
  if (editId) {
    $("submitBtn").disabled = true;
    initEdit().finally(() => { $("submitBtn").disabled = false; });
  }

  /* --- Submit --- */
  const form = $("sellForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errBox = form.querySelector("[data-error]");
    errBox.classList.add("hidden");
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
    const showErr = (key) => { errBox.textContent = t(key); errBox.classList.remove("hidden"); errBox.scrollIntoView({ block: "center" }); };

    const required = ["sTitle", "sType", "sCity", "sAddress", "sPrice", "sSize", "sPhone"];
    const missing = required.filter((id) => !$(id).value.trim() || (["sPrice", "sSize"].includes(id) && Number($(id).value) <= 0));
    if (missing.length) {
      missing.forEach((id) => $(id).classList.add("invalid"));
      showErr("err_required");
      $(missing[0]).focus();
      return;
    }
    const phone = $("sPhone").value.replace(/[\s-]/g, "");
    if (!/^\+?\d{8,14}$/.test(phone)) {
      $("sPhone").classList.add("invalid");
      showErr("err_phone");
      $("sPhone").focus();
      return;
    }
    if (videoUploading) return showErr("err_video_wait");

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
    };
    if (picked) { payload.lat = picked[0]; payload.lng = picked[1]; }
    if (editing) {
      payload.images = images.map((img) => img.keep || img.data);
      payload.pano = pano ? (pano.keep ? "keep" : pano.data) : null;
      payload.video = video ? video.value : null; // "keep" = زي ما هو
    } else {
      payload.images = images.map((img) => img.data);
      payload.pano = pano ? pano.data : null;
      payload.video = video ? video.value : null;
    }
    // حد Vercel لحجم الطلب (4.5 ميجا)
    if (JSON.stringify(payload).length > 4.3 * 1024 * 1024) return showErr("err_upload_big");

    const btn = $("submitBtn");
    btn.disabled = true;
    btn.textContent = t("publishing");
    try {
      if (editing) await Listings.update(editing.id, payload);
      else await Listings.add(payload); // السيرفر بيبلّغ اللي عندهم بحث محفوظ أو تفضيلات مطابقة
    } catch (err) {
      showErr(err.message);
      btn.disabled = false;
      btn.textContent = t(editing ? "save_listing" : "submit_listing");
      return;
    }

    if (editing) {
      sessionStorage.setItem("aqarak_flash", t("listing_saved"));
      location.href = back;
      return;
    }
    btn.disabled = false;
    btn.textContent = t("submit_listing");
    toast(t("listing_published"), "success");
    form.reset();
    images = [];
    pano = null;
    video = null;
    renderThumbs();
    renderPano();
    renderVideo();
    setPicked(null);
    setPurpose("sale");
    renderMine();
    $("mine").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* --- عقاراتي (البروكر والمستثمر) — الأدمن بيدير كل الإعلانات من لوحة التحكم --- */
  const mineCard = $("mine");
  if (user.role === "admin") {
    mineCard.innerHTML = `<h3>${esc(t("manage_listings"))}</h3>
      <a class="btn btn-outline btn-block" href="admin.html#listings">${ICONS.list}<span>${esc(t("manage_listings"))}</span></a>`;
  }
  function renderMine() {
    if (user.role === "admin") return;
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
              <a class="btn btn-outline btn-sm" href="sell.html?edit=${encodeURIComponent(l.id)}&next=sell.html%23mine" title="${esc(t("edit_listing"))}">${ICONS.edit}</a>
              <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(l.id)}" title="${esc(t("delete"))}">${ICONS.trash}</button>
            </div>
          </div>`).join("")
      : `<p style="margin:0;color:var(--muted);font-weight:600">${esc(t("no_my_listings"))}</p>`;
  }
  $("myList")?.addEventListener("click", async (e) => {
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
  if (location.hash === "#mine") setTimeout(() => mineCard.scrollIntoView({ block: "start" }), 50);
})();
