/* =========================================================
   صفحة الإعدادات: الملف الشخصي والصورة، التفضيلات،
   كلمة المرور، وتبديل/حذف الحساب
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  let user = Auth.current();

  if (!user) {
    const gate = $("gate");
    gate.classList.remove("hidden");
    gate.innerHTML = `<div class="gate">
        <span class="ico">${ICONS.lock}</span>
        <h2>${esc(t("gate_login_title"))}</h2>
        <p>${esc(t("settings_login"))}</p>
        <div class="actions"><a class="btn btn-primary" href="auth.html?next=settings.html#login">${esc(t("login"))}</a></div>
      </div>`;
    return;
  }
  $("settingsArea").classList.remove("hidden");

  /* --- Icons in tabs --- */
  document.querySelectorAll("[data-ico]").forEach((el) => { el.outerHTML = ICONS[el.dataset.ico]; });

  /* --- Sidebar mini profile --- */
  function avatarInner(u) {
    return u.picture
      ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">`
      : esc((u.name || "?").trim().charAt(0).toUpperCase());
  }
  function renderMini() {
    const since = new Date(user.createdAt).toLocaleDateString(Lang.get() === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long" });
    $("profileMini").innerHTML = `
      <div class="avatar avatar-md">${avatarInner(user)}</div>
      <div>
        <strong>${esc(user.name)}</strong>
        <span class="role-chip">${esc(roleName(user.role))}</span>
        <small>${esc(t("member_since", { date: since }))}</small>
      </div>`;
  }
  renderMini();

  /* --- Tabs --- */
  const TABS = ["profile", "prefs", "security", "account"];
  function showTab(tab) {
    if (!TABS.includes(tab)) tab = "profile";
    TABS.forEach((name) => $(`panel-${name}`).classList.toggle("hidden", name !== tab));
    document.querySelectorAll("#settingsTabs [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  }
  $("settingsTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    history.replaceState(null, "", `#${b.dataset.tab}`);
    showTab(b.dataset.tab);
  });
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1));

  /* --- Helpers --- */
  function showError(form, key) {
    const box = form.querySelector("[data-error]");
    box.textContent = t(key);
    box.classList.remove("hidden");
  }
  function clearError(form) {
    form.querySelector("[data-error]").classList.add("hidden");
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  }
  function mark(input) { input.classList.add("invalid"); input.focus(); }
  function savedAndReload(tab) {
    sessionStorage.setItem("aqarak_flash", t("saved"));
    location.hash = tab;
    location.reload();
  }

  /* =======================================================
     Profile
     ======================================================= */
  const profileForm = $("panel-profile");
  let picture = user.picture || "";

  $("pCity").innerHTML = `<option value="">${esc(t("choose"))}</option>` +
    Object.keys(USER_AREAS).map((k) => `<option value="${k}">${esc(cityName(k))}</option>`).join("");
  const roleOptions = user.role === "admin" ? ["admin"] : ["buyer", "investor", "broker"];
  $("pRole").innerHTML = roleOptions.map((r) => `<option value="${r}">${esc(roleName(r))}</option>`).join("");
  $("pRole").disabled = user.role === "admin";
  $("roleLocked").classList.toggle("hidden", user.role !== "admin");

  $("pName").value = user.name || "";
  $("pEmail").value = user.email;
  $("pPhone").value = user.phone || "";
  $("pRole").value = user.role;
  $("pAge").value = user.age || "";
  if (user.gender) { const g = document.querySelector(`input[name="pGender"][value="${user.gender}"]`); if (g) g.checked = true; }
  $("pCity").value = user.city || "";
  $("pAddress").value = user.address || "";

  function renderAvatar() {
    $("avatarPreview").innerHTML = picture
      ? `<img src="${esc(picture)}" alt="" referrerpolicy="no-referrer">`
      : esc((user.name || "?").trim().charAt(0).toUpperCase());
    $("avatarRemove").classList.toggle("hidden", !picture);
  }
  renderAvatar();

  $("avatarInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try { picture = await compressImage(file, 320, 0.8); renderAvatar(); } catch (err) { /* ignore */ }
  });
  $("avatarRemove").addEventListener("click", () => { picture = ""; renderAvatar(); });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(profileForm);
    const name = $("pName");
    const phone = $("pPhone");
    const age = $("pAge");
    const gender = document.querySelector('input[name="pGender"]:checked');
    const city = $("pCity");
    const address = $("pAddress");

    if (name.value.trim().length < 2) { mark(name); return showError(profileForm, "err_name"); }
    if (!MOBILE_RE.test(normalizeMobile(phone.value))) { mark(phone); return showError(profileForm, "err_mobile"); }
    const ageNum = Number(age.value);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) { mark(age); return showError(profileForm, "err_age"); }
    if (!gender) return showError(profileForm, "err_gender");
    if (!city.value) { mark(city); return showError(profileForm, "err_city"); }
    if (address.value.trim().length < 3) { mark(address); return showError(profileForm, "err_address"); }

    const patch = {
      name: name.value.trim(),
      phone: normalizeMobile(phone.value),
      age: ageNum,
      gender: gender.value,
      city: city.value,
      address: address.value.trim(),
      picture,
    };
    if (user.role !== "admin" && roleOptions.includes($("pRole").value)) patch.role = $("pRole").value;
    const btn = profileForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await Auth.updateMe(patch);
    } catch (err) {
      if (btn) btn.disabled = false;
      return showError(profileForm, err.message);
    }
    savedAndReload("profile");
  });

  /* =======================================================
     Preferences
     ======================================================= */
  PrefsForm.mount($("prefsHost"), {
    mode: "form",
    role: user.role,
    initial: user.prefs,
    async onSave(prefs) {
      try {
        user = await Auth.updateMe({ prefs });
        toast(t("prefs_saved"), "success");
      } catch (err) {
        toast(t(err.message));
      }
    },
  });

  /* =======================================================
     Security
     ======================================================= */
  const secForm = $("panel-security");
  const hasPassword = !!user.hasPassword;
  $("googleNote").classList.toggle("hidden", hasPassword);
  $("curPassGroup").classList.toggle("hidden", !hasPassword);

  secForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(secForm);
    const cur = $("sCur");
    const n1 = $("sNew");
    const n2 = $("sNew2");
    if (hasPassword && !cur.value) { mark(cur); return showError(secForm, "err_current_password"); }
    if (n1.value.length < 6) { mark(n1); return showError(secForm, "err_pass_len"); }
    if (n1.value !== n2.value) { mark(n2); return showError(secForm, "err_pass_match"); }
    try {
      user = await Auth.changePassword(hasPassword ? cur.value : "", n1.value);
    } catch (err) {
      if (err.message === "err_current_password") mark(cur);
      return showError(secForm, err.message);
    }
    secForm.reset();
    toast(t("password_changed"), "success");
    if (!hasPassword) setTimeout(() => location.reload(), 800);
  });

  /* =======================================================
     Account
     ======================================================= */
  $("switchAccount").addEventListener("click", async () => {
    await Auth.logout();
    location.href = "auth.html#login";
  });
  $("deleteAccount").addEventListener("click", async () => {
    if (!confirm(t("confirm_delete_account"))) return;
    try {
      await Auth.deleteMe();
    } catch (err) {
      return toast(t(err.message));
    }
    sessionStorage.setItem("aqarak_flash", t("account_deleted"));
    location.href = "index.html";
  });
})();
