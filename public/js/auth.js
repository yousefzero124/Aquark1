/* =========================================================
   صفحة تسجيل الدخول / إنشاء حساب / نسيت كلمة المرور
   إنشاء الحساب على 3 خطوات:
     1) نوع الحساب (أدمن / مستثمر / بروكر / مشتري)
     2) البيانات الشخصية
     3) التفضيلات (في صفحة preferences.html)
   + تسجيل الدخول بـ Google
   ========================================================= */
(function () {
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get("next"));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const $ = (id) => document.getElementById(id);

  // لو مسجل دخول بالفعل → رجّعه
  if (Auth.current()) {
    sessionStorage.setItem("aqarak_flash", t("already_logged"));
    location.replace(next);
    return;
  }

  /* --- إيد بتسلّم جنب "أهلاً بيك تاني" --- */
  document.querySelector("#loginForm h1").insertAdjacentHTML("beforeend", waveIcon());

  /* --- فيديو الخلفية في الجانب --- */
  if (matchMedia("(min-width: 901px)").matches) setupHeroVideo($("authVideo"), $("authVideoToggle"));

  /* --- Side list --- */
  $("authSideList").innerHTML = [
    [ICONS.bolt, "auth_side_1"], [ICONS.star, "auth_side_2"], [ICONS.shield, "auth_side_3"],
  ].map(([icon, key]) => `<li><span>${icon}</span>${esc(t(key))}</li>`).join("");

  /* --- Role picker (4 أنواع) --- */
  const ROLES = [
    { key: "buyer", icon: ICONS.key },
    { key: "investor", icon: ICONS.chart },
    { key: "broker", icon: ICONS.tag },
    { key: "admin", icon: ICONS.admin },
  ];
  const presetRole = Auth.ROLES.includes(params.get("role")) ? params.get("role") : "";
  $("rolePicker").innerHTML = ROLES.map((r) => `
    <div class="role-option">
      <input type="radio" name="role" id="role_${r.key}" value="${r.key}" ${presetRole === r.key ? "checked" : ""}>
      <label for="role_${r.key}">
        <span class="ico">${r.icon}</span>
        <span><strong>${esc(roleName(r.key))}</strong><small>${esc(t(`role_${r.key}_d`))}</small></span>
      </label>
    </div>`).join("");
  const selectedRole = () => (document.querySelector('input[name="role"]:checked') || {}).value || "";
  const syncAdminField = () => $("adminCodeGroup").classList.toggle("hidden", selectedRole() !== "admin");
  $("rolePicker").addEventListener("change", syncAdminField);
  syncAdminField();

  /* --- الحي (أحياء بورسعيد + خارج بورسعيد) --- */
  $("suCity").innerHTML = `<option value="">${esc(t("choose"))}</option>` +
    Object.keys(USER_AREAS).map((k) => `<option value="${k}">${esc(cityName(k))}</option>`).join("");

  /* --- Password show/hide --- */
  document.querySelectorAll("[data-toggle-pass]").forEach((btn) => {
    btn.innerHTML = ICONS.eye;
    btn.setAttribute("aria-label", t("l_password"));
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  /* --- Views & tabs --- */
  const viewMain = $("viewMain");
  const viewForgot = $("viewForgot");
  const loginForm = $("loginForm");
  const signupForm = $("signupForm");

  function show(view) {
    const isForgot = view === "forgot";
    viewMain.classList.toggle("hidden", isForgot);
    viewForgot.classList.toggle("hidden", !isForgot);
    if (!isForgot) {
      const signup = view === "signup";
      loginForm.classList.toggle("hidden", signup);
      signupForm.classList.toggle("hidden", !signup);
      document.querySelectorAll(".auth-tabs [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === view));
    }
    document.querySelectorAll("[data-error]").forEach((el) => el.classList.add("hidden"));
  }
  function go(view) {
    history.replaceState(null, "", `${location.pathname}${location.search}#${view}`);
    show(view);
  }
  function fromHash() {
    const h = location.hash.replace("#", "");
    show(["login", "signup", "forgot"].includes(h) ? h : "login");
  }
  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab], [data-go]");
    if (tab) { e.preventDefault(); go(tab.dataset.tab || tab.dataset.go); }
  });
  window.addEventListener("hashchange", fromHash);
  fromHash();

  /* --- Helpers --- */
  function showError(form, key) {
    const box = form.querySelector("[data-error]");
    box.textContent = t(key);
    box.classList.remove("hidden");
    box.scrollIntoView({ block: "nearest" });
  }
  function clearError(form) {
    form.querySelector("[data-error]").classList.add("hidden");
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  }
  function mark(input) { input.classList.add("invalid"); input.focus(); }
  function finish(user, msgKey) {
    sessionStorage.setItem("aqarak_flash", t(msgKey, { name: user.name.split(" ")[0] }));
    location.href = next;
  }

  /* --- Login --- */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(loginForm);
    const email = $("liEmail");
    const pass = $("liPass");
    if (!EMAIL_RE.test(email.value.trim())) { mark(email); return showError(loginForm, "err_email"); }
    if (!pass.value) { mark(pass); return showError(loginForm, "err_login"); }
    try {
      const user = await Auth.login(email.value, pass.value);
      finish(user, "welcome_back");
    } catch (err) {
      showError(loginForm, err.message);
    }
  });

  /* =======================================================
     Signup (خطوتين هنا + التفضيلات في صفحة لوحدها)
     ======================================================= */
  let step = 1;
  let googleProfile = null; // لو جاي من Google

  function setStep(n) {
    step = n;
    $("suStep1").classList.toggle("hidden", n !== 1);
    $("suStep2").classList.toggle("hidden", n !== 2);
    document.querySelectorAll("#stepper li").forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle("active", s === n);
      li.classList.toggle("done", s < n);
    });
    clearError(signupForm);
    signupForm.scrollIntoView({ block: "start" });
  }

  function validateStep1() {
    const role = selectedRole();
    if (!role) { showError(signupForm, "err_role"); return false; }
    if (role === "admin" && !Auth.checkAdminCode($("suAdminCode").value)) {
      mark($("suAdminCode"));
      showError(signupForm, "err_admin_code");
      return false;
    }
    return true;
  }

  $("suNext").addEventListener("click", () => {
    clearError(signupForm);
    if (validateStep1()) setStep(2);
  });
  $("suBack").addEventListener("click", () => setStep(1));

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(signupForm);
    // Enter في الخطوة الأولى = التالي
    if (step === 1) { if (validateStep1()) setStep(2); return; }

    const name = $("suName");
    const email = $("suEmail");
    const pass = $("suPass");
    const pass2 = $("suPass2");
    const phone = $("suPhone");
    const age = $("suAge");
    const gender = document.querySelector('input[name="gender"]:checked');
    const city = $("suCity");
    const address = $("suAddress");

    if (name.value.trim().length < 2) { mark(name); return showError(signupForm, "err_name"); }
    if (!googleProfile) {
      if (!EMAIL_RE.test(email.value.trim())) { mark(email); return showError(signupForm, "err_email"); }
      if (pass.value.length < 6) { mark(pass); return showError(signupForm, "err_pass_len"); }
      if (pass.value !== pass2.value) { mark(pass2); return showError(signupForm, "err_pass_match"); }
    }
    if (!MOBILE_RE.test(normalizeMobile(phone.value))) { mark(phone); return showError(signupForm, "err_mobile"); }
    const ageNum = Number(age.value);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) { mark(age); return showError(signupForm, "err_age"); }
    if (!gender) return showError(signupForm, "err_gender");
    if (!city.value) { mark(city); return showError(signupForm, "err_city"); }
    if (address.value.trim().length < 3) { mark(address); return showError(signupForm, "err_address"); }

    try {
      const user = await Auth.register({
        name: name.value,
        email: googleProfile ? googleProfile.email : email.value,
        password: googleProfile ? null : pass.value,
        role: selectedRole(),
        adminCode: $("suAdminCode").value,
        provider: googleProfile ? "google" : "password",
        picture: googleProfile ? googleProfile.picture || "" : "",
        profile: {
          phone: normalizeMobile(phone.value),
          age: ageNum,
          gender: gender.value,
          city: city.value,
          address: address.value.trim(),
        },
      });
      // الخطوة 3: التفضيلات
      sessionStorage.setItem("aqarak_flash", t("account_created"));
      location.href = `preferences.html?welcome=1&next=${encodeURIComponent(next)}`;
    } catch (err) {
      if (err.message === "err_exists") { setStep(2); mark(email); }
      if (err.message === "err_admin_code") setStep(1);
      showError(signupForm, err.message);
    }
  });

  setStep(1);

  /* --- Forgot password (نسخة تجريبية: الكود بيظهر على الشاشة) --- */
  const forgotForm = $("forgotForm");
  let resetEmail = "";
  let resetCode = "";
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(forgotForm);
    const step1 = $("fpStep1");
    const step2 = $("fpStep2");

    if (!step1.classList.contains("hidden")) {
      const email = $("fpEmail");
      if (!EMAIL_RE.test(email.value.trim())) { mark(email); return showError(forgotForm, "err_email"); }
      if (!Auth.findByEmail(email.value)) { mark(email); return showError(forgotForm, "err_no_user"); }
      resetEmail = email.value.trim().toLowerCase();
      resetCode = String(Math.floor(100000 + Math.random() * 900000));
      const note = $("demoNote");
      note.textContent = t("demo_code", { code: resetCode });
      note.classList.remove("hidden");
      step1.classList.add("hidden");
      step2.classList.remove("hidden");
      $("fpCode").focus();
      return;
    }

    const code = $("fpCode");
    const pass = $("fpPass");
    if (code.value.trim() !== resetCode) { mark(code); return showError(forgotForm, "err_code"); }
    if (pass.value.length < 6) { mark(pass); return showError(forgotForm, "err_pass_len"); }
    await Auth.resetPassword(resetEmail, pass.value);
    toast(t("reset_done"), "success");
    $("liEmail").value = resetEmail;
    forgotForm.reset();
    $("demoNote").classList.add("hidden");
    step2.classList.add("hidden");
    step1.classList.remove("hidden");
    go("login");
  });

  /* =======================================================
     Google Sign-In
     ======================================================= */
  const clientId = ((window.AQARAK_CONFIG && AQARAK_CONFIG.GOOGLE_CLIENT_ID) || "").trim();
  const hosts = document.querySelectorAll(".google-host");
  const canUseGoogle = clientId && location.protocol.startsWith("http");

  function fallbackButtons() {
    hosts.forEach((host) => {
      host.innerHTML = `<button type="button" class="google-btn">${ICONS.google}<span>${esc(t("google_btn"))}</span></button>`;
      host.querySelector("button").addEventListener("click", () => {
        toast(t(clientId ? "google_needs_server" : "google_not_configured"), "info-long");
      });
    });
  }

  function decodeJwt(token) {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(part).split("").map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""));
    return JSON.parse(json);
  }

  // مستخدم جديد من Google → يكمّل نفس خطوات التسجيل (من غير إيميل وباسورد)
  function startGoogleSignup(profile) {
    googleProfile = profile;
    go("signup");
    $("suGoogleArea").classList.add("hidden");
    $("suPassRow").classList.add("hidden");
    $("suEmail").value = profile.email;
    $("suEmail").readOnly = true;
    $("suName").value = profile.name || "";
    $("suStep2Title").textContent = t("complete_profile_title");
    $("suStep2Sub").textContent = t("complete_profile_sub");
    const h1 = document.querySelector("#suStep1 h1");
    h1.textContent = t("google_role_sub", { name: profile.given_name || profile.name || "" });
    h1.insertAdjacentHTML("beforeend", waveIcon());
    setStep(1);
  }

  function onGoogleCredential(response) {
    let profile;
    try { profile = decodeJwt(response.credential); } catch (e) { return; }
    if (!profile.email) return;
    const existing = Auth.findByEmail(profile.email);
    if (existing) {
      Auth.updateUser(existing.id, { picture: existing.picture || profile.picture || "", googleLinked: true });
      Auth.startSession(existing);
      return finish(existing, "welcome_back");
    }
    startGoogleSignup(profile);
  }

  if (!canUseGoogle) {
    fallbackButtons();
  } else {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onerror = fallbackButtons;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: clientId, callback: onGoogleCredential });
      hosts.forEach((host) => {
        google.accounts.id.renderButton(host, {
          theme: "outline", size: "large", shape: "pill", text: "continue_with",
          width: 360, locale: Lang.get(),
        });
      });
    };
    document.head.appendChild(s);
  }
})();
