/* =========================================================
   مقارنة العقارات — لحد 4 عقارات جنب بعض
   - كل صف فيه علامة "الأفضل" على أحسن قيمة
   - تقييم من 100 لكل عقار (سعر المتر، السعر، المساحة، الغرف، التوثيق،
     الصور والجولات، نزول السعر، ومدى مناسبته لتفضيلات المستخدم)
   - "الأنسب في المقارنة دي" + أسباب الاختيار
   - المستثمر: مجموعة "الاستثمار" (العائد الإجمالي والصافي، الاسترداد، ROI) من Invest في main.js
   - اللينك ينفع يتبعت: compare?ids=a,b,c
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const me = Auth.current();
  if (!me) return;
  if (!canCompare(me)) { location.replace("/"); return; } // المقارنة للمشتري والمستثمر بس

  // لينك مقارنة متبعت من حد → نحطه في قايمة المقارنة
  const urlIds = (new URLSearchParams(location.search).get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (urlIds.length) {
    try { Store.set(Compare.KEY, urlIds.slice(0, Compare.MAX)); } catch (e) { /* ignore */ }
    history.replaceState(null, "", "compare");
  }

  const locale = Lang.get() === "ar" ? "ar-EG-u-nu-latn" : "en-US";
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");
  const yesNo = (v) => (v ? `<span class="cmp-yes">${ICONS.check}${esc(t("cmp_yes"))}</span>` : `<span class="cmp-no">${esc(t("cmp_no"))}</span>`);
  const per = (l) => (l.purpose === "rent" ? ` <small>${esc(t("per_month"))}</small>` : "");

  // حسابات الاستثمار (للمستثمر بس) — محفوظة لكل عقار عشان متتحسبش كذا مرة
  const investor = canInvest(me);
  const invCache = new Map();
  function inv(l, key) {
    if (!investor) return null;
    if (!invCache.has(l.id)) invCache.set(l.id, Invest.quick(l));
    const q = invCache.get(l.id);
    return q ? q[key] : null;
  }

  // نسبة تغيّر السعر من أول سعر (سالب = نزل، وده أحسن للمشتري)
  function trend(l) {
    const h = l.priceHistory || [];
    if (h.length < 2 || !h[0].price) return 0;
    return Math.round(((h[h.length - 1].price - h[0].price) / h[0].price) * 1000) / 10;
  }

  /* --- المقاييس ---
     better: "low" (الأقل أحسن) / "high" (الأكبر أحسن) / "bool" (أيوه أحسن) / بدون = معلومة بس
     weight: وزنه في التقييم */
  const METRICS = [
    { group: "price", key: "price", label: "cmp_price", better: "low", weight: 15, why: "why_price",
      get: (l) => l.price, show: (v, l) => `${esc(fmtPrice(v))}${per(l)}` },
    { group: "price", key: "ppm", label: "cmp_ppm", better: "low", weight: 30, why: "why_ppm",
      get: (l) => (l.size ? l.price / l.size : null), show: (v) => `${esc(fmtNum(Math.round(v)))} <small>${esc(t("currency"))} / ${esc(t("sqm"))}</small>` },
    // المشتري: العائد المكتوب في الإعلان بس. المستثمر عنده مجموعة "الاستثمار" كاملة تحت
    { group: "price", key: "yield", label: "cmp_yield", better: "high", weight: 6, why: "why_yield",
      get: (l) => (!investor && l.purpose === "sale" && l.yield ? l.yield : null), show: (v) => `${esc(v)}%` },
    // للمستثمر بس — نفس معادلات حاسبة الاستثمار وبنفس الافتراضات
    { group: "invest", key: "inv_rent", label: "inv_rent_month",
      get: (l) => inv(l, "rent"), show: (v) => esc(fmtPrice(v)) },
    { group: "invest", key: "inv_gross", label: "inv_gross", better: "high", weight: 4,
      get: (l) => inv(l, "gross"), show: (v) => esc(Invest.fmtPct(v)) },
    { group: "invest", key: "inv_net", label: "inv_net", better: "high", weight: 12, why: "why_net",
      get: (l) => inv(l, "net"), show: (v) => esc(Invest.fmtPct(v)) },
    { group: "invest", key: "inv_payback", label: "inv_payback", better: "low", weight: 8, why: "why_payback",
      get: (l) => inv(l, "payback"), show: (v) => esc(Invest.fmtYears(v)) },
    { group: "invest", key: "inv_roi", label: "inv_roi_n", better: "high", weight: 10, why: "why_roi",
      get: (l) => inv(l, "roi"), show: (v) => esc(Invest.fmtPct(v)) },
    { group: "price", key: "trend", label: "cmp_trend", better: "low", weight: 4, why: "why_trend",
      get: (l) => trend(l),
      show: (v) => (v === 0 ? `<span class="cmp-muted">${esc(t("cmp_unchanged"))}</span>`
        : `<span class="${v < 0 ? "cmp-down" : "cmp-up"}">${v < 0 ? ICONS.priceDown : ICONS.chart} ${esc(Math.abs(v))}%</span>`) },
    { group: "space", key: "size", label: "cmp_size", better: "high", weight: 15, why: "why_size",
      get: (l) => l.size, show: (v) => `${esc(fmtNum(v))} ${esc(t("sqm"))}` },
    { group: "space", key: "beds", label: "cmp_beds", better: "high", weight: 10, why: "why_beds",
      get: (l) => l.beds || 0, show: (v) => (v ? esc(v) : "—") },
    { group: "space", key: "baths", label: "cmp_baths", better: "high", weight: 5, why: "why_baths",
      get: (l) => l.baths || 0, show: (v) => (v ? esc(v) : "—") },
    { group: "space", key: "type", label: "cmp_type", get: (l) => typeName(l.type), show: (v) => esc(v) },
    { group: "place", key: "city", label: "cmp_city", get: (l) => cityName(l.city), show: (v) => esc(v) },
    { group: "place", key: "address", label: "cmp_address", get: (l) => loc(l.address) || "—", show: (v) => esc(v) },
    { group: "trust", key: "verified", label: "cmp_verified", better: "bool", weight: 8, why: "why_verified",
      get: (l) => Moderation.isVerified(l), show: yesNo },
    { group: "trust", key: "pano", label: "cmp_pano", better: "bool", weight: 3, why: "why_media",
      get: (l) => !!l.pano, show: yesNo },
    { group: "trust", key: "video", label: "cmp_video", better: "bool", weight: 2, why: "why_media",
      get: (l) => !!l.video, show: yesNo },
    { group: "trust", key: "photos", label: "cmp_photos", better: "high", weight: 2,
      get: (l) => (l.images || []).length, show: (v) => esc(v) },
    { group: "you", key: "match", label: "cmp_match", better: "high", weight: 8, why: "why_match",
      get: (l) => (hasPrefs(me) ? Math.round(matchScore(l, me.prefs) * 100) : null), show: (v) => `${esc(v)}%` },
    { group: "you", key: "listed", label: "cmp_listed", get: (l) => l.createdAt, show: (v) => esc(fmtDate(v)) },
  ];
  const GROUPS = [["price", "cmp_group_price"], ["invest", "cmp_group_invest"], ["space", "cmp_group_space"], ["place", "cmp_group_place"], ["trust", "cmp_group_trust"], ["you", "cmp_group_you"]];

  /* --- الحساب: لكل مقياس، مين الأفضل، ودرجة كل عقار من 0 لـ 1 --- */
  function analyze(list) {
    const rows = [];
    const scores = list.map(() => ({ sum: 0, weight: 0 }));
    const wins = list.map(() => []);
    METRICS.forEach((m) => {
      const vals = list.map((l) => m.get(l));
      if (vals.every((v) => v == null)) return; // المقياس ده مش موجود في أي عقار (زي العائد في الإيجار)
      const row = { m, vals, best: list.map(() => false) };
      if (m.better) {
        const nums = vals.map((v) => (m.better === "bool" ? (v ? 1 : 0) : v));
        const known = nums.filter((v) => v != null);
        const max = Math.max(...known);
        const min = Math.min(...known);
        const tie = max === min;
        nums.forEach((v, i) => {
          let norm;
          if (v == null) norm = 0;
          else if (tie) norm = 1;
          else norm = m.better === "low" ? (max - v) / (max - min) : (v - min) / (max - min);
          scores[i].sum += norm * m.weight;
          scores[i].weight += m.weight;
          const isBest = !tie && v != null && v === (m.better === "low" ? min : max);
          row.best[i] = isBest;
          if (isBest && m.why) wins[i].push(m);
        });
      }
      rows.push(row);
    });
    const pct = scores.map((s) => (s.weight ? Math.round((s.sum / s.weight) * 100) : 0));
    const top = Math.max(...pct);
    const winner = pct.filter((p) => p === top).length === 1 ? pct.indexOf(top) : -1; // تعادل = مفيش فايز
    return { rows, pct, winner, wins };
  }

  /* --- الرسم --- */
  function render() {
    invCache.clear(); // السعر ممكن يكون اتغيّر
    const list = Compare.ids().map((id) => Listings.get(id)).filter(Boolean);
    const purpose = list[0] ? list[0].purpose : "sale";
    $("cmpActions").innerHTML = list.length
      ? `<a class="btn btn-outline" href="properties?mode=${purpose === "rent" ? "rent" : "buy"}">${ICONS.plus}<span>${esc(t("compare_more"))}</span></a>
         ${list.length > 1 ? `<button type="button" class="btn btn-outline" data-cmp-share>${ICONS.share}<span>${esc(t("compare_share"))}</span></button>` : ""}
         <button type="button" class="btn btn-ghost" data-cmp-clear>${esc(t("compare_clear"))}</button>`
      : "";

    if (list.length < 2) {
      $("cmpBody").innerHTML = `
        <div class="card cmp-empty">
          <span class="cmp-empty-ico">${ICONS.compare}</span>
          <h2>${esc(t("compare_empty_title"))}</h2>
          <p>${esc(t("compare_empty_sub"))}</p>
          ${list.length === 1 ? `<div class="cmp-empty-one">${propCard(list[0])}</div>` : ""}
          <a class="btn btn-primary" href="properties?mode=${purpose === "rent" ? "rent" : "buy"}">${ICONS.search}<span>${esc(t("browse_props"))}</span></a>
        </div>`;
      return;
    }

    const { rows, pct, winner, wins } = analyze(list);

    // الفايز + أسباب الاختيار
    let winnerHTML = "";
    if (winner >= 0) {
      const w = list[winner];
      const reasons = [...new Map(wins[winner].sort((a, b) => b.weight - a.weight).map((m) => [m.why, m])).values()].slice(0, 4);
      winnerHTML = `
        <section class="card cmp-winner">
          <div class="cmp-winner-media" data-prop-id="${esc(w.id)}">
            ${w.images && w.images[0] ? `<img src="${esc(w.images[0])}" alt="" onerror="imgFail(this)">` : `<span class="img-fallback">${ICONS.house}</span>`}
          </div>
          <div class="cmp-winner-text">
            <span class="cmp-winner-tag">${ICONS.trophy}${esc(t("compare_winner"))}</span>
            <h2 data-prop-id="${esc(w.id)}">${esc(loc(w.title))}</h2>
            <div class="cmp-winner-price">${priceHTML(w)}</div>
            ${reasons.length ? `<div class="cmp-why"><span>${esc(t("compare_why"))}</span>${reasons.map((m) => `<span class="cmp-why-chip">${ICONS.check}${esc(t(m.why))}</span>`).join("")}</div>` : ""}
          </div>
          <div class="cmp-winner-score">
            <strong>${pct[winner]}</strong><small>/100</small>
            <span>${esc(t("compare_score"))}</span>
          </div>
        </section>`;
    } else {
      winnerHTML = `<section class="card cmp-tie">${ICONS.compare}<span>${esc(t("compare_tie"))}</span></section>`;
    }

    const head = list.map((l, i) => `
      <th class="cmp-col${i === winner ? " is-winner" : ""}" scope="col">
        <div class="cmp-head">
          <button type="button" class="cmp-x" data-cmp-remove="${esc(l.id)}" aria-label="${esc(t("compare_remove"))}">${ICONS.close}</button>
          <div class="cmp-head-img" data-prop-id="${esc(l.id)}">
            ${l.images && l.images[0] ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" onerror="imgFail(this)">` : `<span class="img-fallback">${ICONS.house}</span>`}
            ${i === winner ? `<span class="cmp-badge">${ICONS.trophy}${esc(t("compare_best_overall"))}</span>` : ""}
          </div>
          <strong class="cmp-head-title" data-prop-id="${esc(l.id)}">${esc(loc(l.title))}</strong>
          <div class="cmp-meter" title="${esc(t("compare_score"))}: ${pct[i]}/100">
            <span class="cmp-meter-bar"><span style="width:${pct[i]}%"></span></span>
            <b>${pct[i]}</b>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-prop-id="${esc(l.id)}">${esc(t("view"))}</button>
        </div>
      </th>`).join("");

    const body = GROUPS.map(([g, label]) => {
      const groupRows = rows.filter((r) => r.m.group === g);
      if (!groupRows.length) return "";
      return `<tr class="cmp-group"><th colspan="${list.length + 1}" scope="colgroup">${esc(t(label))}</th></tr>`
        + groupRows.map((r) => `
          <tr>
            <th scope="row">${esc(t(r.m.label))}</th>
            ${r.vals.map((v, i) => `<td class="${r.best[i] ? "best" : ""}${i === winner ? " is-winner" : ""}">
              ${v == null ? `<span class="cmp-muted">—</span>` : r.m.show(v, list[i])}
              ${r.best[i] ? `<span class="cmp-best">${esc(t("compare_best"))}</span>` : ""}
            </td>`).join("")}
          </tr>`).join("");
    }).join("");

    $("cmpBody").innerHTML = `
      ${winnerHTML}
      <section class="card cmp-card">
        <div class="cmp-table-wrap">
          <table class="cmp-table" style="--cols:${list.length}">
            <thead><tr><th class="cmp-corner" scope="col">
              <div class="cmp-legend">
                <span class="cmp-legend-title">${ICONS.compare}${esc(t("compare_count", { n: list.length }))}</span>
                <span class="cmp-legend-row"><span class="cmp-best">${esc(t("compare_best"))}</span>${esc(t("cmp_legend_best"))}</span>
                <span class="cmp-legend-row"><span class="cmp-legend-meter"><span></span></span>${esc(t("cmp_legend_score"))}</span>
                <span class="cmp-legend-row"><span class="cmp-legend-win">${ICONS.trophy}</span>${esc(t("cmp_legend_win"))}</span>
              </div>
            </th>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <p class="hint cmp-note">${esc(t("compare_note"))}${investor && purpose === "sale" ? ` ${esc(t("cmp_note_invest", { y: Invest.DEFAULTS.years }))}` : ""}${hasPrefs(me) ? "" : ` <a href="preferences">${esc(t("compare_prefs_tip"))}</a>`}</p>
      </section>`;
  }

  /* --- أحداث --- */
  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-cmp-share]")) {
      const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}compare?ids=${encodeURIComponent(Compare.ids().join(","))}`;
      try { await navigator.clipboard.writeText(url); toast(t("compare_copied"), "success"); }
      catch (err) { prompt(t("compare_share"), url); }
    }
  });
  ["compare:changed", "listings:changed", "favs:changed"].forEach((ev) => document.addEventListener(ev, render));
  render();
})();
