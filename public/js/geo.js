/* =========================================================
   الخرايط (GIS)
   - لو فيه GOOGLE_MAPS_API_KEY في config.js → خرايط Google
   - لو مفيش → OpenStreetMap (Leaflet) مؤقتاً، بنفس الإمكانيات
   كل الصفحات بتتعامل مع واجهة واحدة (MapHandle) من غير ما يفرق معاها نوع الخريطة.
   ========================================================= */

/* ---------- Geometry helpers ---------- */
// المسافة بين نقطتين بالمتر
function geoDistance(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// هل النقطة جوه الشكل اللي اترسم بالقلم؟
function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if ((yi > p[0]) !== (yj > p[0]) && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function shapeContains(shape, point) {
  if (!shape) return true;
  return shape.type === "circle" ? geoDistance(shape.center, point) <= shape.radius : pointInPolygon(point, shape.points);
}

// سعر مختصر للعلامة على الخريطة: 4.7 مليون / 32 ألف
function fmtShortPrice(n) {
  const ar = Lang.get() === "ar";
  const trim = (x) => String(Math.round(x * 10) / 10);
  if (n >= 1e6) return ar ? `${trim(n / 1e6)} مليون` : `${trim(n / 1e6)}M`;
  if (n >= 1e3) return ar ? `${trim(n / 1e3)} ألف` : `${trim(n / 1e3)}K`;
  return String(n);
}

const SHAPE_STYLE = { stroke: "#D99E00", fill: "#F5B800", fillOpacity: 0.16, weight: 2.5 };

/* ---------- Script loader ---------- */
function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
function loadCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

const GeoMap = {
  engine() {
    const key = ((window.AQARAK_CONFIG && AQARAK_CONFIG.GOOGLE_MAPS_API_KEY) || "").trim();
    return key && location.protocol.startsWith("http") ? "google" : "osm";
  },

  _googleReady: null,
  loadGoogle() {
    if (this._googleReady) return this._googleReady;
    const key = AQARAK_CONFIG.GOOGLE_MAPS_API_KEY.trim();
    this._googleReady = new Promise((resolve, reject) => {
      window.__aqarakMapsReady = resolve;
      const params = new URLSearchParams({
        key, v: "weekly", language: Lang.get(), region: "EG",
        libraries: "marker", loading: "async", callback: "__aqarakMapsReady",
      });
      loadScript(`https://maps.googleapis.com/maps/api/js?${params}`).catch(reject);
    });
    return this._googleReady;
  },

  _leafletReady: null,
  loadLeaflet() {
    if (this._leafletReady) return this._leafletReady;
    loadCss("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
    this._leafletReady = loadScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js");
    return this._leafletReady;
  },

  /**
   * بيعمل خريطة جوه العنصر ويرجّع MapHandle
   * @param {HTMLElement} el
   * @param {{center:[number,number], zoom:number, gestures?:'greedy'|'cooperative'}} opts
   */
  async create(el, opts) {
    el.setAttribute("dir", "ltr");
    try {
      if (this.engine() === "google") return await this._createGoogle(el, opts);
    } catch (e) {
      console.warn("Google Maps failed, falling back to OpenStreetMap", e);
    }
    return this._createLeaflet(el, opts);
  },

  /* ---------- Google Maps ---------- */
  async _createGoogle(el, opts) {
    await this.loadGoogle();
    const { Map: GMap } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const gestures = opts.gestures || "greedy";
    const map = new GMap(el, {
      center: { lat: opts.center[0], lng: opts.center[1] },
      zoom: opts.zoom,
      mapId: "DEMO_MAP_ID", // مطلوب للعلامات (Advanced Markers) — تقدر تعمل Map ID خاص بيك من Google Cloud
      gestureHandling: gestures,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    // عشان نحوّل مكان الماوس على الشاشة لإحداثيات
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => {};
    overlay.onRemove = () => {};
    overlay.setMap(map);
    await new Promise((r) => google.maps.event.addListenerOnce(map, "idle", r));

    const style = {
      strokeColor: SHAPE_STYLE.stroke, strokeWeight: SHAPE_STYLE.weight,
      fillColor: SHAPE_STYLE.fill, fillOpacity: SHAPE_STYLE.fillOpacity, clickable: false,
    };
    return {
      engine: "google",
      el,
      setView(center, zoom) { map.setCenter({ lat: center[0], lng: center[1] }); if (zoom) map.setZoom(zoom); },
      fitPoints(points, maxZoom = 14) {
        if (!points.length) return;
        if (points.length === 1) { this.setView(points[0], maxZoom); return; }
        const b = new google.maps.LatLngBounds();
        points.forEach((p) => b.extend({ lat: p[0], lng: p[1] }));
        map.fitBounds(b, 60);
        google.maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > maxZoom) map.setZoom(maxZoom); });
      },
      addMarker(lat, lng, content, onClick) {
        const m = new AdvancedMarkerElement({ map, position: { lat, lng }, content });
        if (onClick) content.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
        return { remove() { m.map = null; }, setOnTop(on) { m.zIndex = on ? 1000 : null; }, setPosition(p) { m.position = { lat: p[0], lng: p[1] }; } };
      },
      pixelToLatLng(x, y) {
        const ll = overlay.getProjection().fromContainerPixelToLatLng(new google.maps.Point(x, y));
        return [ll.lat(), ll.lng()];
      },
      setGestures(on) {
        map.setOptions({ gestureHandling: on ? gestures : "none", draggableCursor: on ? null : "crosshair", keyboardShortcuts: on });
      },
      drawCircle(center, radius) {
        const c = new google.maps.Circle({ ...style, map, center: { lat: center[0], lng: center[1] }, radius });
        return {
          radius,
          update(ctr, r) { this.radius = r; c.setCenter({ lat: ctr[0], lng: ctr[1] }); c.setRadius(r); },
          remove() { c.setMap(null); },
        };
      },
      drawPolygon(points) {
        const toPath = (pts) => pts.map((p) => ({ lat: p[0], lng: p[1] }));
        const poly = new google.maps.Polygon({ ...style, map, paths: toPath(points) });
        return { update(pts) { poly.setPath(toPath(pts)); }, remove() { poly.setMap(null); } };
      },
      onMapClick(cb) { map.addListener("click", (e) => cb([e.latLng.lat(), e.latLng.lng()])); },
      getZoom() { return map.getZoom(); },
      onZoom(cb) { map.addListener("zoom_changed", () => cb(map.getZoom())); },
      resize() { google.maps.event.trigger(map, "resize"); },
    };
  },

  /* ---------- OpenStreetMap (Leaflet) ---------- */
  async _createLeaflet(el, opts) {
    await this.loadLeaflet();
    const map = L.map(el, { zoomControl: true, fadeAnimation: false, scrollWheelZoom: opts.gestures !== "cooperative" }).setView(opts.center, opts.zoom);
    // خريطة OpenStreetMap المجانية (للتجربة — للاستخدام الكبير استخدم Google أو مزود خرايط مدفوع)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const style = {
      color: SHAPE_STYLE.stroke, weight: SHAPE_STYLE.weight,
      fillColor: SHAPE_STYLE.fill, fillOpacity: SHAPE_STYLE.fillOpacity, interactive: false,
    };
    return {
      engine: "osm",
      el,
      setView(center, zoom) { map.invalidateSize(); map.setView(center, zoom || map.getZoom()); },
      fitPoints(points, maxZoom = 14) {
        if (!points.length) return;
        map.invalidateSize(); // عشان لو حجم الخريطة اتغير بعد ما اتعملت
        if (points.length === 1) { map.setView(points[0], maxZoom); return; }
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom });
      },
      addMarker(lat, lng, content, onClick) {
        const m = L.marker([lat, lng], { icon: L.divIcon({ html: content, className: "leaflet-html-pin", iconSize: null }) }).addTo(map);
        if (onClick) m.on("click", onClick);
        return { remove() { m.remove(); }, setOnTop(on) { m.setZIndexOffset(on ? 1000 : 0); }, setPosition(p) { m.setLatLng(p); } };
      },
      pixelToLatLng(x, y) { const ll = map.containerPointToLatLng([x, y]); return [ll.lat, ll.lng]; },
      setGestures(on) {
        ["dragging", "touchZoom", "doubleClickZoom", "boxZoom", "keyboard"].forEach((h) => (on ? map[h].enable() : map[h].disable()));
        el.style.cursor = on ? "" : "crosshair";
      },
      drawCircle(center, radius) {
        const c = L.circle(center, { ...style, radius }).addTo(map);
        return {
          radius,
          update(ctr, r) { this.radius = r; c.setLatLng(ctr); c.setRadius(r); },
          remove() { c.remove(); },
        };
      },
      drawPolygon(points) {
        const poly = L.polygon(points, style).addTo(map);
        return { update(pts) { poly.setLatLngs(pts); }, remove() { poly.remove(); } };
      },
      onMapClick(cb) { map.on("click", (e) => cb([e.latlng.lat, e.latlng.lng])); },
      getZoom() { return map.getZoom(); },
      onZoom(cb) { map.on("zoomend", () => cb(map.getZoom())); },
      resize() { map.invalidateSize(); },
    };
  },

  /**
   * الرسم على الخريطة بالماوس أو بالصباع
   * mode: "pen" (رسم حر) أو "circle" (دايرة بالسحب)
   * onDone({type, center, radius, points, shape}) أو onDone(null) لو الرسمة صغيرة جداً
   */
  startDrawing(handle, mode, onDone) {
    const el = handle.el;
    let active = false;
    let shape = null;
    let center = null;
    let points = [];
    let lastPx = null;
    const rect = () => el.getBoundingClientRect();
    const local = (e) => { const r = rect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const block = (e) => { e.preventDefault(); e.stopPropagation(); };

    handle.setGestures(false);
    el.style.touchAction = "none";
    el.classList.add("is-drawing");

    function down(e) {
      if (e.button > 0) return;
      block(e);
      active = true;
      const px = local(e);
      const ll = handle.pixelToLatLng(...px);
      lastPx = px;
      if (mode === "circle") { center = ll; shape = handle.drawCircle(ll, 1); }
      else { points = [ll]; shape = handle.drawPolygon(points); }
    }
    function move(e) {
      if (!active) return;
      block(e);
      const px = local(e);
      const ll = handle.pixelToLatLng(...px);
      if (mode === "circle") { shape.update(center, geoDistance(center, ll)); return; }
      if (Math.hypot(px[0] - lastPx[0], px[1] - lastPx[1]) < 4) return;
      lastPx = px;
      points.push(ll);
      shape.update(points);
    }
    function up(e) {
      if (!active) return;
      block(e);
      active = false;
      stop();
      if (mode === "circle") {
        if (shape.radius < 80) { shape.remove(); onDone(null); return; }
        onDone({ type: "circle", center, radius: shape.radius, shape });
      } else {
        if (points.length < 4) { shape.remove(); onDone(null); return; }
        onDone({ type: "polygon", points, shape });
      }
    }
    function stop() {
      el.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      handle.setGestures(true);
      el.style.touchAction = "";
      el.classList.remove("is-drawing");
    }
    el.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    return { cancel() { stop(); if (shape && active) shape.remove(); } };
  },
};
