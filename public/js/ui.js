/* =========================================================
   قوائم الاختيار (Dropdowns) بشكل الموقع بدل شكل المتصفح
   ---------------------------------------------------------
   أي <select> في الموقع بيتحول تلقائياً لقائمة شيك:
   - أيقونة جنب كل اختيار (الحي 📍، نوع العقار، نوع الحساب)
   - علامة ✓ على الاختيار الحالي
   - بتشتغل بالكيبورد (الأسهم، Enter، Esc، أول حرف)
   - على الموبايل بتطلع من تحت الشاشة (Bottom sheet)
   الـ <select> الأصلي بيفضل موجود ومخفي، فكل الكود القديم
   (value و change) شغال زي ما هو من غير تعديل.
   ========================================================= */

const UISelect = (() => {
  const ROLE_ICON = { buyer: "key", investor: "chart", broker: "tag", admin: "admin" };
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  let current = null; // القائمة المفتوحة حالياً

  // أيقونة الاختيار حسب قيمته
  function iconFor(o) {
    if (o.dataset.icon) return o.dataset.icon;
    const v = o.value;
    if (TYPES[v]) return TYPE_ICON[v];
    if (v === "outside") return "globe";
    if (CITIES[v]) return "pin";
    if (ROLE_ICON[v]) return ROLE_ICON[v];
    if (v === "" && !isPlaceholder(o)) return "list";
    return null;
  }
  function isPlaceholder(o) {
    return !!o && o.value === "" && (o.hasAttribute("data-placeholder") || o.text === t("choose"));
  }
  const chevron = '<i class="ic icon-chevron-down ui-chevron" aria-hidden="true"></i>';

  function labelFor(select) {
    if (select.id) {
      const l = document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
      if (l) return l;
    }
    return null;
  }

  function enhance(select) {
    if (select.dataset.uiEnhanced || select.multiple || select.size > 1) return;
    select.dataset.uiEnhanced = "1";

    const wrap = document.createElement("div");
    wrap.className = "ui-select";
    const inlineStyle = select.getAttribute("style");
    if (inlineStyle) wrap.setAttribute("style", inlineStyle);
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "combobox");
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    wrap.appendChild(btn);

    // الـ label بتاع الـ select يشاور على الزرار الجديد
    const label = labelFor(select);
    if (label) {
      if (!label.id) label.id = `${select.id}__label`;
      btn.setAttribute("aria-labelledby", label.id);
      label.addEventListener("click", (e) => { e.preventDefault(); btn.focus(); open(select, btn); });
    } else if (select.getAttribute("aria-label")) {
      btn.setAttribute("aria-label", select.getAttribute("aria-label"));
    }

    select.classList.add("ui-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    function render() {
      const o = select.options[select.selectedIndex];
      const cls = [...select.classList].filter((c) => c !== "ui-native");
      btn.className = ["ui-select-trigger", ...cls].join(" ");
      btn.classList.toggle("is-placeholder", isPlaceholder(o));
      btn.disabled = select.disabled;
      const ic = o && iconFor(o);
      btn.innerHTML = `${ic && ICONS[ic] ? `<span class="ui-trigger-ico">${ICONS[ic]}</span>` : ""}
        <span class="ui-trigger-label">${esc(o ? o.text : "")}</span>${chevron}`;
      if (current && current.select === select) build();
    }

    // لو الكود غيّر القيمة (select.value = ...) الزرار يتحدّث
    Object.defineProperty(select, "value", {
      configurable: true,
      get() { return valueDesc.get.call(this); },
      set(v) { valueDesc.set.call(this, v); render(); },
    });
    select.addEventListener("change", render);
    new MutationObserver(render).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled"] });
    // focus() على الـ select (زي لما فيه خطأ في الفورم) يروح للزرار
    select.focus = () => btn.focus();

    btn.addEventListener("click", () => (current && current.select === select ? close() : open(select, btn)));
    btn.addEventListener("keydown", (e) => onKey(e, select, btn));
    select._uiRender = render;
    render();
  }

  /* ---------- القائمة نفسها ---------- */
  function build() {
    const { select, menu } = current;
    const opts = [...select.options];
    menu.querySelector(".ui-options").innerHTML = opts.map((o, i) => {
      const ic = iconFor(o);
      return `<div class="ui-option${o.selected ? " selected" : ""}${o.disabled ? " disabled" : ""}${isPlaceholder(o) ? " placeholder" : ""}"
          role="option" id="ui-opt-${i}" data-i="${i}" aria-selected="${o.selected}">
        ${ic && ICONS[ic] ? `<span class="ui-opt-ico">${ICONS[ic]}</span>` : ""}
        <span class="ui-opt-label">${esc(o.text)}</span>
        <span class="ui-opt-check">${ICONS.check}</span>
      </div>`;
    }).join("");
    setActive(current.active);
  }

  function setActive(i) {
    if (!current) return;
    const items = [...current.menu.querySelectorAll(".ui-option")];
    if (!items.length) return;
    i = Math.max(0, Math.min(items.length - 1, i));
    current.active = i;
    items.forEach((el, k) => el.classList.toggle("active", k === i));
    current.btn.setAttribute("aria-activedescendant", `ui-opt-${i}`);
    items[i].scrollIntoView({ block: "nearest" });
  }

  function isSheet() { return window.innerWidth <= 640; }

  function position() {
    if (!current || current.sheet) return;
    const { btn, menu } = current;
    const r = btn.getBoundingClientRect();
    menu.style.minWidth = `${Math.max(r.width, 180)}px`;
    menu.style.maxHeight = "";
    // كل القوايم بتفتح لتحت دايماً، وأقصى ارتفاع 220px (على قد المساحة اللي تحت)
    const full = Math.min(menu.scrollHeight, 220);
    const below = window.innerHeight - r.bottom - 16;
    const h = Math.max(120, Math.min(full, below));
    menu.style.maxHeight = `${h}px`;
    menu.style.top = `${r.bottom + 6}px`;
    const w = menu.offsetWidth;
    const rtl = document.documentElement.dir === "rtl";
    let left = rtl ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    menu.style.left = `${left}px`;
  }

  function open(select, btn) {
    if (select.disabled) return;
    close();
    const sheet = isSheet();
    const inSearch = true; // كل القوايم بنفس الشكل الغامق اللي بيفتح لتحت
    // لو مفيش مكان كفاية تحت الحقل، الصفحة بتنزل شوية عشان القايمة تفتح لتحت
    if (!sheet) {
      const r = btn.getBoundingClientRect();
      const need = Math.min(select.options.length * 46 + 16, 220) + 24;
      const below = window.innerHeight - r.bottom;
      if (below < need) window.scrollBy({ top: need - below, behavior: "instant" });
    }
    const menu = document.createElement("div");
    menu.className = `ui-select-menu${sheet ? " sheet" : ""}${inSearch && !sheet ? " in-search" : ""}`;
    menu.dir = document.documentElement.dir;
    const label = labelFor(select);
    const title = label ? label.textContent.replace(/\*/g, "").trim() : (select.getAttribute("aria-label") || "");
    menu.innerHTML = `${sheet ? `<div class="ui-sheet-head"><span class="ui-sheet-grip"></span><strong>${esc(title)}</strong></div>` : ""}
      <div class="ui-options" role="listbox" ${title ? `aria-label="${esc(title)}"` : ""}></div>`;
    let backdrop = null;
    if (sheet) {
      backdrop = document.createElement("div");
      backdrop.className = "ui-sheet-backdrop";
      backdrop.addEventListener("click", close);
      document.body.appendChild(backdrop);
    }
    document.body.appendChild(menu);
    current = { select, btn, menu, backdrop, sheet, inSearch: inSearch && !sheet, active: Math.max(0, select.selectedIndex) };
    build();
    position();
    btn.setAttribute("aria-expanded", "true");
    btn.closest(".ui-select").classList.add("open");

    menu.addEventListener("mousedown", (e) => e.preventDefault()); // الفوكس يفضل على الزرار
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".ui-option");
      if (item && !item.classList.contains("disabled")) choose(Number(item.dataset.i));
    });
    menu.addEventListener("mousemove", (e) => {
      const item = e.target.closest(".ui-option");
      if (item && Number(item.dataset.i) !== current.active) setActive(Number(item.dataset.i));
    });
  }

  function close() {
    if (!current) return;
    const { menu, btn, backdrop, inSearch } = current;
    if (inSearch) {
      // إقفال بحركة ناعمة (0.15s)
      menu.classList.add("closing");
      menu.style.pointerEvents = "none";
      setTimeout(() => menu.remove(), 150);
    } else {
      menu.remove();
    }
    if (backdrop) backdrop.remove();
    btn.setAttribute("aria-expanded", "false");
    btn.removeAttribute("aria-activedescendant");
    const w = btn.closest(".ui-select");
    if (w) w.classList.remove("open");
    current = null;
  }

  function choose(i) {
    const { select, btn } = current;
    if (select.options[i] && !select.options[i].disabled && select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
    btn.focus();
  }

  let typed = "";
  let typedTimer = null;
  function onKey(e, select, btn) {
    const isOpen = current && current.select === select;
    const k = e.key;
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) { e.preventDefault(); open(select, btn); }
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); setActive(current.active + 1); }
    else if (k === "ArrowUp") { e.preventDefault(); setActive(current.active - 1); }
    else if (k === "Home") { e.preventDefault(); setActive(0); }
    else if (k === "End") { e.preventDefault(); setActive(select.options.length - 1); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); choose(current.active); }
    else if (k === "Escape") { e.preventDefault(); close(); }
    else if (k === "Tab") { close(); }
    else if (k.length === 1) {
      // اكتب أول حرف عشان تروح للاختيار
      typed += k.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => { typed = ""; }, 600);
      const idx = [...select.options].findIndex((o) => o.text.toLowerCase().replace(/^حي\s+/, "").startsWith(typed));
      if (idx >= 0) setActive(idx);
    }
  }

  // إقفال لما تضغط برة أو الصفحة تتحرك
  document.addEventListener("mousedown", (e) => {
    if (current && !current.menu.contains(e.target) && !current.btn.contains(e.target)) close();
  }, true);
  window.addEventListener("resize", () => { if (current && current.sheet !== isSheet()) close(); else position(); });
  window.addEventListener("scroll", (e) => {
    if (!current || current.sheet) return;
    if (current.menu.contains(e.target)) return;
    position();
  }, true);

  function enhanceAll(root = document) {
    root.querySelectorAll("select").forEach(enhance);
  }

  return { enhance, enhanceAll, close };
})();

/* =========================================================
   حركة الأزرار (Transitions)
   1) مجموعات التابات (شراء/إيجار، دخول/حساب جديد، تابات الإعدادات...)
      الخلفية بتتزحلق من الزرار القديم للجديد بدل ما تنط.
   2) تأثير "موجة" (Ripple) خفيف مكان الضغطة على الأزرار.
   ========================================================= */
const SegIndicator = (() => {
  const SELECTOR = ".seg, .search-tabs, .auth-tabs, .settings-tabs";

  function attach(container) {
    if (container.dataset.segInit) return;
    container.dataset.segInit = "1";
    container.classList.add("has-indicator");
    const ind = document.createElement("span");
    ind.className = "seg-indicator";
    ind.setAttribute("aria-hidden", "true");
    container.prepend(ind);

    function update(animate = true) {
      const act = [...container.children].find((c) => c !== ind && c.classList.contains("active"));
      if (!act || !act.offsetWidth) { ind.style.opacity = "0"; return; }
      if (!animate || ind.style.opacity === "0") ind.classList.add("no-anim");
      ind.style.opacity = "1";
      ind.style.width = `${act.offsetWidth}px`;
      ind.style.height = `${act.offsetHeight}px`;
      ind.style.transform = `translate(${act.offsetLeft}px, ${act.offsetTop}px)`;
      if (ind.classList.contains("no-anim")) {
        void ind.offsetWidth; // يطبّق المكان الأول من غير حركة
        ind.classList.remove("no-anim");
      }
    }
    new MutationObserver((muts) => {
      if (muts.some((m) => m.target !== ind)) update(true);
    }).observe(container, { subtree: true, attributes: true, attributeFilter: ["class"] });
    if (window.ResizeObserver) new ResizeObserver(() => update(false)).observe(container);
    window.addEventListener("resize", () => update(false));
    document.fonts && document.fonts.ready.then(() => update(false));
    update(false);
  }

  function attachAll(root = document) {
    if (root.matches && root.matches(SELECTOR)) attach(root);
    root.querySelectorAll && root.querySelectorAll(SELECTOR).forEach(attach);
  }
  return { attach, attachAll };
})();

// Ripple: دايرة خفيفة بتتمد من مكان الضغطة
const RIPPLE_SELECTOR = ".btn, .tool-btn, .lang-btn, .user-btn, .google-btn, .seg > button, .seg > a, .search-tabs > button, .auth-tabs > button, .settings-tabs > button, .chips button, .type-chips button, .opt, .role-option label, .gender-picker label, .menu-toggle";
document.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  const el = e.target.closest(RIPPLE_SELECTOR);
  if (!el || el.disabled) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - r.left - size / 2}px`;
  ripple.style.top = `${e.clientY - r.top - size / 2}px`;
  el.classList.add("has-ripple");
  el.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
});

/* =========================================================
   ظهور الكتابة بنعومة (Motion blur)
   - العناوين: كل كلمة بتظهر ورا التانية من ضبابية لواضحة مع حركة خفيفة
   - الوصف تحت العنوان: بيظهر كله مرة واحدة بنفس الإحساس
   - بيشتغل لما الكلام يظهر قدامك (وانت بتنزل، أو لما تبدّل تاب)
   ========================================================= */
const TextFX = (() => {
  // نفس القايمة دي موجودة في style.css (عشان الكلام مايبانش قبل الحركة)
  const WORDS = ".hero-video h1, .section-head h2, .page-head h1, .auth-card h1, .auth-side h2, .prefs-card h1, .cta h2, .map-side-head h1, .wiz-q, .gate h2";
  const BLOCKS = ".hero-video .lead, .hero-video .badge, .section-head p, .page-head p, .auth-card .sub, .auth-side p, .auth-side .badge, .prefs-card > .sub, .cta p, .map-side-head p";

  // الكلام اللي لسه مستني يظهر — بنشوف هل بقى قدام المستخدم (على الشاشة ومش مخفي)
  const pending = new Set();
  let timer = null;
  function onScreen(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight * 0.95 && r.bottom > 0;
  }
  function check() {
    pending.forEach((el) => {
      if (!el.isConnected) { pending.delete(el); return; }
      if (onScreen(el)) { el.classList.add("fx-on"); pending.delete(el); }
    });
    if (!pending.size && timer) { clearInterval(timer); timer = null; }
  }
  function watch(el) {
    pending.add(el);
    // فريمين عشان الحالة الأولى (ضبابي) تترسم الأول وبعدين الحركة تبدأ
    requestAnimationFrame(() => requestAnimationFrame(check));
    if (!timer) timer = setInterval(check, 250); // بيلقط التابات اللي بتظهر بعدين
  }
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check);

  // تقسيم العنوان لكلمات (الكلمة العربي بتفضل كاملة فالحروف بتفضل متشبكة)
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement("span");
            s.className = "fx-word";
            s.style.setProperty("--i", i++);
            s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          if (ch.matches("i, svg, img, .wave-ico")) { ch.classList.add("fx-unit"); ch.style.setProperty("--i", i++); }
          else walk(ch);
        }
      });
    };
    walk(el);
  }

  function prepare(el, kind) {
    if (el.dataset.fx) return;
    el.dataset.fx = kind;
    if (kind === "words") { el.classList.add("fx-text"); splitWords(el); }
    else el.classList.add("fx-block");
    watch(el);
  }

  function scan(root = document) {
    if (!root.querySelectorAll) return;
    const pick = (sel, kind) => {
      if (root.matches && root.matches(sel)) prepare(root, kind);
      root.querySelectorAll(sel).forEach((el) => prepare(el, kind));
    };
    pick(WORDS, "words");
    pick(BLOCKS, "block");
  }
  return { scan };
})();

// تحويل كل القوائم والتابات بعد ما الصفحة تجهز، وأي حاجة جديدة تتضاف بعد كده (زي جدول الأدمن)
document.addEventListener("DOMContentLoaded", () => {
  UISelect.enhanceAll();
  SegIndicator.attachAll();
  TextFX.scan();
  document.documentElement.classList.add("fx-init");
  new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1 || n.classList.contains("ripple") || n.classList.contains("seg-indicator")) return;
      if (n.tagName === "SELECT") UISelect.enhance(n);
      else if (n.querySelectorAll) UISelect.enhanceAll(n);
      SegIndicator.attachAll(n);
      if (!n.classList.contains("fx-word")) TextFX.scan(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });
});
