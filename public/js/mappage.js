/* =========================================================
   صفحة الخريطة (GIS)
   - كل العقارات على خريطة بورسعيد بعلامات فيها السعر
   - القلم: ارسم حوالين أي منطقة → تظهر العقارات اللي جواها بس
   - الدايرة: اسحب دايرة من المركز → نفس الفكرة
   - فلاتر: بيع / إيجار / نوع العقار
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const focusId = params.get("focus");

  document.querySelectorAll("[data-ico]").forEach((el) => { el.outerHTML = ICONS[el.dataset.ico]; });
  document.querySelector(".circle-ico").outerHTML = ICONS.circle;
  $("typeSel").innerHTML = `<option value="">${esc(t("any_type"))}</option>` +
    Object.keys(TYPES).map((k) => `<option value="${k}">${esc(typeName(k))}</option>`).join("");

  const state = { purpose: "", type: "", shape: null, tool: null, activeId: focusId || null };
  let map = null;
  let drawing = null;
  const markers = new Map(); // id → { marker, el }

  /* --- Data --- */
  function filtered() {
    return Listings.all().filter((l) => {
      if (!listingCoords(l)) return false;
      if (state.purpose && l.purpose !== state.purpose) return false;
      if (state.type && l.type !== state.type) return false;
      return true;
    });
  }
  const inside = (l) => shapeContains(state.shape, listingCoords(l));

  /* --- Markers --- */
  function renderMarkers() {
    markers.forEach(({ marker }) => marker.remove());
    markers.clear();
    filtered().forEach((l) => {
      const [lat, lng] = listingCoords(l);
      const el = document.createElement("button");
      el.type = "button";
      el.className = `map-price ${l.purpose}`;
      el.innerHTML = `${ICONS[TYPE_ICON[l.type]] || ICONS.house}<span>${esc(fmtShortPrice(l.price))}</span>`;
      el.title = `${loc(l.title)} — ${fmtShortPrice(l.price)}`;
      if (state.shape && !inside(l)) el.classList.add("dim");
      const marker = map.addMarker(lat, lng, el, () => selectListing(l.id, true));
      markers.set(l.id, { marker, el });
    });
    highlight(state.activeId);
    updateCompact();
  }

  // عقارات كتير والخريطة بعيدة → نقط صغيرة بدل الأسعار (عشان ميركبوش على بعض)
  function updateCompact() {
    if (!map) return;
    $("map").classList.toggle("map-compact", map.getZoom() < 16 && markers.size > 30);
  }

  function highlight(id) {
    markers.forEach(({ marker, el }, key) => {
      const on = key === id;
      el.classList.toggle("active", on);
      marker.setOnTop(on);
    });
    document.querySelectorAll(".map-card").forEach((c) => c.classList.toggle("active", c.dataset.propId === id));
  }

  function selectListing(id, scrollList) {
    state.activeId = id;
    highlight(id);
    if (scrollList) {
      const card = document.querySelector(`.map-card[data-prop-id="${CSS.escape(id)}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* --- Results list --- */
  function renderList() {
    const all = filtered();
    const list = (state.shape ? all.filter(inside) : all)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    $("resultTitle").textContent = t(state.shape ? "in_area" : "on_map", { n: fmtNum(list.length) });
    $("resultSub").textContent = state.shape && state.shape.type === "circle"
      ? t("radius_km", { v: (state.shape.radius / 1000).toFixed(1) }) : "";

    $("results").innerHTML = list.length ? list.map((l) => `
      <article class="map-card" data-prop-id="${esc(l.id)}" tabindex="0">
        <span class="mini-thumb">${l.images && l.images[0]
          ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" onerror="imgFail(this)">`
          : `<span class="img-fallback">${ICONS.house}</span>`}</span>
        <div>
          <div class="map-card-price">${priceHTML(l)}</div>
          <strong>${esc(loc(l.title))}</strong>
          <small>${ICONS[TYPE_ICON[l.type]]} ${esc(typeName(l.type))} · ${esc(cityName(l.city))}</small>
        </div>
        <span class="prop-tag ${l.purpose === "rent" ? "rent" : ""}">${esc(t(l.purpose === "rent" ? "for_rent" : "for_sale"))}</span>
      </article>`).join("")
      : `<div class="empty">${ICONS.search}<div>${esc(t(state.shape ? "no_in_area" : "no_results"))}</div></div>`;

    document.querySelectorAll(".map-card").forEach((card) => {
      card.addEventListener("mouseenter", () => selectListing(card.dataset.propId, false));
    });
    highlight(state.activeId);
  }

  function renderAll() {
    renderMarkers();
    renderList();
  }

  /* --- Drawing tools --- */
  function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll("[data-tool]").forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
    $("mapHint").textContent = t(tool === "pen" ? "hint_pen" : tool === "circle" ? "hint_circle" : "hint_idle");
  }

  function startTool(tool) {
    if (!map) return;
    if (drawing) { drawing.cancel(); drawing = null; }
    if (state.tool === tool) { setTool(null); return; } // الضغط تاني = إلغاء
    setTool(tool);
    drawing = GeoMap.startDrawing(map, tool, (result) => {
      drawing = null;
      setTool(null);
      if (!result) { toast(t("hint_small")); return; }
      if (state.shape) state.shape.shape.remove();
      state.shape = result;
      $("mapHint").textContent = t("hint_idle");
      document.querySelector('[data-tool="clear"]').disabled = false;
      renderAll();
    });
  }

  function clearShape() {
    if (state.shape) state.shape.shape.remove();
    state.shape = null;
    document.querySelector('[data-tool="clear"]').disabled = true;
    renderAll();
  }

  document.querySelector(".map-tools").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (!b || b.disabled) return;
    if (b.dataset.tool === "clear") clearShape(); else startTool(b.dataset.tool);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawing) { drawing.cancel(); drawing = null; setTool(null); }
  });

  /* --- Filters --- */
  $("purposeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-purpose]");
    if (!b) return;
    state.purpose = b.dataset.purpose;
    document.querySelectorAll("#purposeSeg [data-purpose]").forEach((x) => x.classList.toggle("active", x === b));
    renderAll();
  });
  $("typeSel").addEventListener("change", (e) => { state.type = e.target.value; renderAll(); });

  // إعلانات جديدة وصلت من السيرفر
  document.addEventListener("listings:changed", () => { if (map) renderAll(); else renderList(); });

  /* --- Init --- */
  renderList();
  GeoMap.create($("map"), { center: MAP_CENTER, zoom: MAP_ZOOM, gestures: "greedy" })
    .then((m) => {
      map = m;
      $("map").querySelector(".map-loading")?.remove();
      $("osmNote").classList.toggle("hidden", m.engine !== "osm");
      renderAll();
      map.onZoom(updateCompact);
      const focus = focusId && Listings.get(focusId);
      if (focus && listingCoords(focus)) {
        map.setView(listingCoords(focus), 16);
        selectListing(focus.id, true);
      } else {
        map.fitPoints(filtered().map(listingCoords), 15);
      }
    })
    .catch(() => {
      $("map").innerHTML = `<div class="map-loading">${esc(t("map_error"))}</div>`;
    });
})();
