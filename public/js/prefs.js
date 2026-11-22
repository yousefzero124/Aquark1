/* =========================================================
   فورم التفضيلات — مستخدم في مكانين:
   - wizard: سؤال سؤال بعد إنشاء الحساب (preferences.html)
   - form: كل الأسئلة في صفحة واحدة (الإعدادات)
   التفضيلات بتتحفظ في user.prefs وبتستخدم في ترشيح العقارات.
   ========================================================= */

const PrefsForm = {
  questions() {
    return [
      {
        key: "purpose", q: "q_purpose", kind: "single",
        options: [["buy", t("p_buy"), ICONS.key], ["rent", t("p_rent"), ICONS.house], ["both", t("p_both"), ICONS.building]],
      },
      {
        key: "types", q: "q_types", kind: "multi", hint: "hint_multi",
        options: Object.keys(TYPES).map((k) => [k, typeName(k), ICONS[TYPE_ICON[k]]]),
      },
      {
        key: "cities", q: "q_cities", kind: "multi", hint: "hint_multi",
        options: Object.keys(CITIES).map((k) => [k, cityName(k), ICONS.pin]),
      },
      { key: "budget", q: "q_budget", kind: "budget" },
      {
        key: "beds", q: "q_beds", kind: "single",
        options: [[0, t("any_beds")], [1, "1+"], [2, "2+"], [3, "3+"], [4, "4+"]],
      },
    ];
  },

  /**
   * @param {HTMLElement} host
   * @param {{mode:'wizard'|'form', initial?:object, role?:string, onSave:Function, onSkip?:Function}} opts
   */
  mount(host, opts) {
    const questions = this.questions();
    const init = opts.initial || {};
    const state = {
      purpose: init.purpose || (opts.role === "investor" ? "buy" : ""),
      types: [...(init.types || [])],
      cities: [...(init.cities || [])],
      budgetMin: init.budgetMin || "",
      budgetMax: init.budgetMax || "",
      beds: init.beds || 0,
    };
    let index = 0;

    const budgetHint = () => t(state.purpose === "rent" ? "budget_hint_rent" : state.purpose === "both" ? "budget_hint_both" : "budget_hint_buy");

    function questionHTML(q) {
      if (q.kind === "budget") {
        return `
          <div class="row-2 budget-row">
            <div class="form-group"><label>${esc(t("f_min"))}</label>
              <input class="input" type="number" min="0" step="1000" dir="ltr" data-budget="budgetMin" value="${esc(state.budgetMin)}"></div>
            <div class="form-group"><label>${esc(t("f_max"))}</label>
              <input class="input" type="number" min="0" step="1000" dir="ltr" data-budget="budgetMax" value="${esc(state.budgetMax)}"></div>
          </div>
          <small class="hint" data-budget-hint>${esc(budgetHint())}</small>`;
      }
      const isOn = (v) => (q.kind === "multi" ? state[q.key].includes(v) : String(state[q.key]) === String(v));
      return `
        ${q.hint ? `<small class="hint" style="margin:-6px 0 12px">${esc(t(q.hint))}</small>` : ""}
        <div class="opt-grid ${q.options.length <= 5 && !q.options[0][2] ? "opt-compact" : ""}">
          ${q.options.map(([v, label, icon]) => `
            <button type="button" class="opt ${isOn(v) ? "active" : ""}" data-q="${q.key}" data-v="${esc(v)}" aria-pressed="${isOn(v)}">
              ${icon ? `<span class="ico">${icon}</span>` : ""}<span>${esc(label)}</span>
              <span class="tick">${ICONS.check}</span>
            </button>`).join("")}
        </div>`;
    }

    function collect() {
      return {
        purpose: state.purpose || "both",
        types: state.types,
        cities: state.cities,
        budgetMin: Number(state.budgetMin) || 0,
        budgetMax: Number(state.budgetMax) || 0,
        beds: Number(state.beds) || 0,
        updatedAt: new Date().toISOString(),
      };
    }

    function render() {
      if (opts.mode === "wizard") {
        const q = questions[index];
        const last = index === questions.length - 1;
        host.innerHTML = `
          <div class="wizard">
            <div class="wiz-top">
              <span class="step-count">${esc(t("step_of", { n: index + 1, total: questions.length }))}</span>
              ${opts.onSkip ? `<button type="button" class="link" data-skip>${esc(t("skip"))}</button>` : ""}
            </div>
            <div class="progress"><span style="width:${((index + 1) / questions.length) * 100}%"></span></div>
            <h2 class="wiz-q">${esc(t(q.q))}</h2>
            ${questionHTML(q)}
            <div class="btn-row" style="margin-top:24px">
              ${index > 0 ? `<button type="button" class="btn btn-outline btn-lg" data-prev>${esc(t("back"))}</button>` : ""}
              <button type="button" class="btn btn-primary btn-lg" style="flex:1" data-next>${esc(t(last ? "finish" : "next"))}</button>
            </div>
          </div>`;
      } else {
        host.innerHTML = `
          ${questions.map((q) => `
            <div class="pref-section">
              <h4>${esc(t(q.q))}</h4>
              ${questionHTML(q)}
            </div>`).join("")}
          <button type="button" class="btn btn-primary btn-lg" data-save>${esc(t("save"))}</button>`;
      }
    }

    host.addEventListener("click", (e) => {
      const opt = e.target.closest(".opt");
      if (opt) {
        const q = questions.find((x) => x.key === opt.dataset.q);
        const v = q.key === "beds" ? Number(opt.dataset.v) : opt.dataset.v;
        if (q.kind === "multi") {
          state[q.key] = state[q.key].includes(v) ? state[q.key].filter((x) => x !== v) : [...state[q.key], v];
          opt.classList.toggle("active");
          opt.setAttribute("aria-pressed", opt.classList.contains("active"));
        } else {
          state[q.key] = v;
          host.querySelectorAll(`.opt[data-q="${q.key}"]`).forEach((b) => {
            b.classList.toggle("active", b === opt);
            b.setAttribute("aria-pressed", b === opt);
          });
          const hint = host.querySelector("[data-budget-hint]");
          if (hint) hint.textContent = budgetHint();
          // في الـ wizard: اختيار واحد → روح للسؤال اللي بعده تلقائياً
          if (opts.mode === "wizard" && index < questions.length - 1) setTimeout(() => { index++; render(); }, 220);
        }
        return;
      }
      if (e.target.closest("[data-next]")) {
        if (index < questions.length - 1) { index++; render(); } else opts.onSave(collect());
      }
      if (e.target.closest("[data-prev]")) { index--; render(); }
      if (e.target.closest("[data-skip]")) opts.onSkip();
      if (e.target.closest("[data-save]")) opts.onSave(collect());
    });
    host.addEventListener("input", (e) => {
      const key = e.target.dataset && e.target.dataset.budget;
      if (key) state[key] = e.target.value;
    });

    render();
  },
};
