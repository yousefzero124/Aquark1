/* =========================================================
   invest.html = حاسبة الاستثمار — للمستثمر بس
   - تختار عقار من مفضلتك / المقارنة (أو تفتحها من نافذة العقار ?id=)
     أو تكتب أرقامك بنفسك
   - بتحسب: ROI، العائد الإجمالي، العائد الصافي، فترة الاسترداد
   - المعادلات نفسها في Invest (main.js) — نفس الأرقام في النافذة والمقارنة
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const me = Auth.current();
  if (!me) return;
  if (!canInvest(me)) { location.replace("index.html"); return; }

  const FIELDS = [
    // [المفتاح، اللابل، الوحدة، أقل، أكبر، الخطوة]
    { key: "price", label: "inv_f_price", unit: "currency", min: 0, step: 10000, group: "buy" },
    { key: "costsPct", label: "inv_f_costs", unit: "%", min: 0, max: 100, step: 0.5, group: "buy", hint: "inv_h_costs" },
    { key: "rent", label: "inv_f_rent", unit: "currency", min: 0, step: 500, group: "rent" },
    { key: "vacancyMonths", label: "inv_f_vacancy", unit: "inv_u_months", min: 0, max: 12, step: 1, group: "rent", hint: "inv_h_vacancy" },
    { key: "expensesPct", label: "inv_f_expenses", unit: "%", min: 0, max: 100, step: 1, group: "rent", hint: "inv_h_expenses" },
    { key: "years", label: "inv_f_years", unit: "inv_u_years", min: 1, max: 50, step: 1, group: "time" },
    { key: "growthPct", label: "inv_f_growth", unit: "%", min: -50, max: 100, step: 0.5, group: "time", hint: "inv_h_growth" },
  ];
  const GROUPS = [["buy", "inv_g_buy", "wallet"], ["rent", "inv_g_rent", "key"], ["time", "inv_g_time", "chart"]];

  // العقارات اللي ينفع تختار منها: اللي فاتحها + مفضلتك + المقارنة (للبيع بس)
  const params = new URLSearchParams(location.search);
  const startId = params.get("id");
  function pickable() {
    const ids = [...new Set([startId, ...Compare.ids(), ...Favs.list()].filter(Boolean))];
    return ids.map((id) => Listings.get(id)).filter((l) => l && l.purpose === "sale" && l.price);
  }

  let listing = null;
  let values = { price: "", rent: "", ...Invest.DEFAULTS };
  let rentSource = null;

  function useListing(l) {
    listing = l || null;
    if (listing) {
      const inp = Invest.inputsFor(listing);
      rentSource = inp.rentSource;
      values = { price: inp.price, rent: inp.rent, ...Invest.DEFAULTS };
    } else {
      rentSource = null;
      values = { price: "", rent: "", ...Invest.DEFAULTS };
    }
    history.replaceState(null, "", listing ? `invest.html?id=${encodeURIComponent(listing.id)}` : "invest.html");
  }

  const unitText = (u) => (u === "currency" ? t("currency") : u === "%" ? "%" : t(u));

  /* --- الفورم --- */
  function renderForm() {
    const list = pickable();
    const opts = [`<option value="" data-icon="pen">${esc(t("inv_manual"))}</option>`]
      .concat(list.map((l) => `<option value="${esc(l.id)}" data-icon="${esc(TYPE_ICON[l.type] || "house")}" ${listing && listing.id === l.id ? "selected" : ""}>${esc(loc(l.title))} — ${esc(fmtPrice(l.price))}</option>`));

    const field = (f) => `
      <div class="form-group">
        <label for="inv_${f.key}">${esc(t(f.label))}</label>
        <div class="inv-input">
          <input class="input" id="inv_${f.key}" data-key="${f.key}" type="number" inputmode="decimal" dir="ltr"
            min="${f.min}" ${f.max != null ? `max="${f.max}"` : ""} step="${f.step}" value="${esc(values[f.key])}">
          <span class="inv-unit">${esc(unitText(f.unit))}</span>
        </div>
        <small class="hint" id="inv_hint_${f.key}"></small>
      </div>`;

    $("invForm").innerHTML = `
      <div class="form-group">
        <label for="invPick">${esc(t("inv_pick"))}</label>
        <select class="input" id="invPick">${opts.join("")}</select>
        <small class="hint">${esc(t(list.length ? "inv_pick_hint" : "inv_pick_empty"))}</small>
      </div>
      ${listing ? `
        <div class="inv-listing" data-prop-id="${esc(listing.id)}">
          <span class="mini-thumb">${listing.images && listing.images[0] ? `<img src="${esc(listing.images[0])}" alt="" onerror="imgFail(this)">` : `<span class="img-fallback">${ICONS.house}</span>`}</span>
          <div><strong>${esc(loc(listing.title))}</strong>
            <small>${esc(typeName(listing.type))} · ${esc(cityName(listing.city))} · ${esc(fmtNum(listing.size))} ${esc(t("sqm"))}</small></div>
          <span class="inv-listing-go">${ICONS.eye}</span>
        </div>` : ""}
      ${GROUPS.map(([g, label, ic]) => `
        <fieldset class="inv-group">
          <legend>${ICONS[ic]}<span>${esc(t(label))}</span></legend>
          ${g === "time" ? `<div class="row-2">${FIELDS.filter((f) => f.group === g).map(field).join("")}</div>` : FIELDS.filter((f) => f.group === g).map(field).join("")}
        </fieldset>`).join("")}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="invReset">${ICONS.eraser}<span>${esc(t(listing ? "inv_reset_listing" : "inv_reset"))}</span></button>
      </div>`;

    $("invPick").addEventListener("change", (e) => {
      useListing(Listings.get(e.target.value));
      renderForm();
      update();
    });
    $("invReset").addEventListener("click", () => {
      useListing(listing);
      renderForm();
      update();
    });
    $("invForm").querySelectorAll("input[data-key]").forEach((inp) => {
      inp.addEventListener("input", () => {
        values[inp.dataset.key] = inp.value;
        if (inp.dataset.key === "rent") rentSource = "manual";
        update();
      });
    });
  }

  /* --- النتايج --- */
  const money = (v) => fmtPrice(Math.round(v));
  const signed = (v) => `${v < 0 ? "−" : ""}${money(Math.abs(v))}`;

  function hints(r) {
    const set = (k, txt) => { const el = $(`inv_hint_${k}`); if (el) el.textContent = txt; };
    set("costsPct", r.price ? `${t("inv_h_costs")} — ${money(r.costs)}` : t("inv_h_costs"));
    set("rent", rentSource && rentSource !== "manual" ? t(`inv_src_${rentSource}`) : t("inv_h_rent"));
    set("vacancyMonths", t("inv_h_vacancy"));
    set("expensesPct", r.annualRent ? `${t("inv_h_expenses")} — ${money(r.expenses)} / ${t("inv_u_year")}` : t("inv_h_expenses"));
    set("growthPct", r.price ? `${t("inv_h_growth")} — ${t("inv_h_value", { y: r.years, v: money(r.saleValue) })}` : t("inv_h_growth"));
  }

  function update() {
    const r = Invest.calc(values);
    hints(r);

    if (!r.price) {
      $("invResults").innerHTML = `
        <div class="card inv-empty">
          <span class="cmp-empty-ico">${ICONS.calc}</span>
          <h2>${esc(t("inv_empty_title"))}</h2>
          <p>${esc(t("inv_empty_sub"))}</p>
        </div>`;
      $("invFormulas").innerHTML = formulasHTML(null);
      return;
    }

    const grade = Invest.grade(r.net);
    const tile = (key, label, value, sub, extra = "") => `
      <div class="inv-big ${extra}">
        <small>${esc(t(label))}</small>
        <strong dir="auto">${esc(value)}</strong>
        <span>${sub}</span>
      </div>`;
    const covered = r.cost > 0 ? Math.max(0, Math.min(100, (r.rentTotal / r.cost) * 100)) : 0;

    $("invResults").innerHTML = `
      <div class="card inv-sum">
        <div class="inv-sum-head">
          <h2>${ICONS.chart}<span>${esc(t("inv_results"))}</span></h2>
          ${grade ? `<span class="inv-grade g-${grade}" title="${esc(t("inv_grade_tip"))}">${esc(t(`inv_grade_${grade}`))}</span>` : ""}
        </div>
        <div class="inv-bigs">
          ${tile("roi", "inv_roi_y", Invest.fmtPct(r.roi), esc(t("inv_roi_sub", { y: r.years, v: Invest.fmtPct(r.roiYear) })), "is-main")}
          ${tile("net", "inv_net", Invest.fmtPct(r.net), esc(t("inv_net_sub", { v: money(r.annualNet) })))}
          ${tile("gross", "inv_gross", Invest.fmtPct(r.gross), esc(t("inv_gross_sub", { v: money(r.annualRent) })))}
          ${tile("payback", "inv_payback", Invest.fmtYears(r.payback), esc(r.payback == null ? t("inv_payback_never") : t("inv_payback_sub")))}
        </div>
        <div class="inv-cover">
          <div class="inv-cover-text"><span>${esc(t("inv_cover", { y: r.years }))}</span><b dir="ltr">${esc(Invest.fmtPct(covered))}</b></div>
          <span class="inv-cover-bar"><span style="width:${covered}%"></span></span>
        </div>
      </div>
      <div class="card inv-break">
        <h3>${esc(t("inv_breakdown"))}</h3>
        <dl>
          <div><dt>${esc(t("inv_b_price"))}</dt><dd>${esc(money(r.price))}</dd></div>
          <div><dt>${esc(t("inv_b_costs"))}</dt><dd>${esc(money(r.costs))}</dd></div>
          <div class="is-total"><dt>${esc(t("inv_b_cost"))}</dt><dd>${esc(money(r.cost))}</dd></div>
          <div><dt>${esc(t("inv_b_annual_rent"))}</dt><dd>${esc(money(r.annualRent))}</dd></div>
          <div><dt>${esc(t("inv_b_vacancy"))}</dt><dd class="neg">${esc(signed(-(r.annualRent - r.collected)))}</dd></div>
          <div><dt>${esc(t("inv_b_expenses"))}</dt><dd class="neg">${esc(signed(-r.expenses))}</dd></div>
          <div class="is-total"><dt>${esc(t("inv_b_net"))}</dt><dd>${esc(signed(r.annualNet))}</dd></div>
          <div><dt>${esc(t("inv_b_rent_total", { y: r.years }))}</dt><dd>${esc(signed(r.rentTotal))}</dd></div>
          <div><dt>${esc(t("inv_b_sale", { y: r.years }))}</dt><dd>${esc(money(r.saleValue))}</dd></div>
          <div><dt>${esc(t("inv_b_gain"))}</dt><dd class="${r.capitalGain < 0 ? "neg" : ""}">${esc(signed(r.capitalGain))}</dd></div>
          <div class="is-total is-profit"><dt>${esc(t("inv_b_profit"))}</dt><dd class="${r.profit < 0 ? "neg" : ""}">${esc(signed(r.profit))}</dd></div>
        </dl>
        <p class="hint">${esc(t("inv_disclaimer"))}</p>
      </div>`;
    $("invFormulas").innerHTML = formulasHTML(r);
  }

  /* --- المعادلات بالأرقام --- */
  function formulasHTML(r) {
    const row = (name, formula, calc, result) => `
      <div class="inv-f">
        <strong>${esc(t(name))}</strong>
        <code>${esc(t(formula))}</code>
        ${r ? `<span class="inv-f-calc" dir="ltr">${esc(calc)} = <b>${esc(result)}</b></span>` : ""}
      </div>`;
    const n = (v) => fmtNum(Math.round(v));
    return `
      <h3>${ICONS.info}<span>${esc(t("inv_formulas"))}</span></h3>
      <div class="inv-fs">
        ${row("inv_roi", "inv_fx_roi", r && `(${n(r.profit)} ÷ ${n(r.cost)}) × 100`, r && Invest.fmtPct(r.roi))}
        ${row("inv_gross", "inv_fx_gross", r && `(${n(r.annualRent)} ÷ ${n(r.price)}) × 100`, r && Invest.fmtPct(r.gross))}
        ${row("inv_net", "inv_fx_net", r && `(${n(r.annualNet)} ÷ ${n(r.price)}) × 100`, r && Invest.fmtPct(r.net))}
        ${row("inv_payback", "inv_fx_payback", r && `${n(r.cost)} ÷ ${n(r.annualNet)}`, r && Invest.fmtYears(r.payback))}
      </div>
      <p class="hint">${esc(t("inv_fx_note"))}</p>`;
  }

  /* --- البداية --- */
  document.title = `${t("brand")} | ${t("page_invest")}`;
  async function start() {
    let l = startId ? Listings.get(startId) : null;
    if (startId && !l) { await Listings.sync(); l = Listings.get(startId); } // عقار حقيقي لسه مش في النسخة المحفوظة
    useListing(l && l.purpose === "sale" ? l : null);
    renderForm();
    update();
  }
  // المفضلة اتحمّلت من السيرفر → حدّث قايمة الاختيار من غير ما تمسح أرقامك
  document.addEventListener("favs:changed", () => {
    const active = document.activeElement;
    if (!$("invPick") || (active && active.tagName === "INPUT" && $("invForm").contains(active))) return; // بيكتب دلوقتي
    renderForm(); // الفورم بيترسم بالأرقام الحالية
    update();
  });
  start();
})();
