/* =========================================================
   صفحة الرسايل — محادثة مباشرة بين المشتري وصاحب الإعلان (بروكر)
   - المحادثة بتبدأ من زرار "ابعت رسالة" في صفحة العقار
   - الرسايل الجديدة بتظهر لوحدها (بنسأل السيرفر كل 3 ثواني والمحادثة مفتوحة)
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const me = Auth.current();
  if (!me) return;

  const params = new URLSearchParams(location.search);
  let chats = [];
  let activeId = params.get("c") || null;
  let messages = [];
  let lastAt = null;
  let threadTimer = null;
  let listTimer = null;
  let sending = false;

  const locale = () => (Lang.get() === "ar" ? "ar-EG-u-nu-latn" : "en-US");
  const titleOf = (c) => loc(c.listingTitle) || t("listing_removed");
  const initial = (name) => esc((name || "?").trim().charAt(0).toUpperCase());

  $("chatBack").innerHTML = ICONS.back;
  $("chatBack").setAttribute("aria-label", t("back"));
  $("chatSend").innerHTML = `${ICONS.send}<span>${esc(t("chat_send"))}</span>`;
  $("chatEmpty").innerHTML = `
    <span class="chat-empty-ico">${ICONS.message}</span>
    <strong>${esc(t("chat_pick"))}</strong>
    <small>${esc(t("chat_pick_sub"))}</small>`;

  /* --- قايمة المحادثات --- */
  function renderList() {
    $("chatItems").innerHTML = chats.length
      ? chats.map((c) => `
          <button type="button" class="chat-item${c.id === activeId ? " active" : ""}${c.unread ? " unread" : ""}" data-chat="${esc(c.id)}">
            <span class="avatar">${initial(c.other.name)}</span>
            <span class="chat-item-text">
              <span class="chat-item-row">
                <strong>${esc(c.other.name || "—")}</strong>
                <time>${c.lastBody ? esc(timeAgo(c.lastAt)) : ""}</time>
              </span>
              <small class="chat-item-listing">${ICONS.house}${esc(titleOf(c))}</small>
              <small class="chat-item-last">${c.lastBody ? `${c.lastMine ? `${esc(t("chat_you"))}: ` : ""}${esc(c.lastBody)}` : esc(t("chat_no_msgs"))}</small>
            </span>
            ${c.unread ? `<span class="chat-dot" aria-label="${esc(t("chat_new"))}"></span>` : ""}
          </button>`).join("")
      : `<div class="chat-list-empty">
          <span class="chat-empty-ico">${ICONS.message}</span>
          <strong>${esc(t("chat_none"))}</strong>
          <small>${esc(t("chat_none_sub"))}</small>
          <a class="btn btn-primary btn-sm" href="properties?mode=buy">${esc(t("browse_props"))}</a>
        </div>`;
  }
  async function loadList() {
    try {
      chats = (await Api.call("GET", "/api/chats")).chats;
      renderList();
      if (activeId && !chats.some((c) => c.id === activeId)) closeThread();
    } catch (e) { /* النت فاصل */ }
  }

  /* --- المحادثة المفتوحة --- */
  function msgTime(iso) {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today
      ? d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" })
      : d.toLocaleString(locale(), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  }
  function renderMsgs(scroll) {
    const box = $("chatMsgs");
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = messages.length
      ? messages.map((m) => `
          <div class="msg${m.mine ? " mine" : ""}${m.pending ? " pending" : ""}">
            <div class="msg-bubble">${esc(m.body)}</div>
            <time>${m.pending ? esc(t("chat_sending")) : esc(msgTime(m.createdAt))}</time>
          </div>`).join("")
      : `<div class="chat-start-note">${ICONS.message}<span>${esc(t("chat_start_note"))}</span></div>`;
    if (scroll || nearBottom) box.scrollTop = box.scrollHeight;
  }
  function renderHead(c) {
    $("chatAvatar").innerHTML = initial(c.other.name);
    $("chatName").textContent = c.other.name || "—";
    const exists = !!Listings.get(c.listingId);
    $("chatListing").innerHTML = `${ICONS.house}<span>${esc(titleOf(c))}</span>`;
    $("chatListing").disabled = !exists;
    $("chatListing").dataset.listing = c.listingId;
  }

  async function openThread(id) {
    activeId = id;
    history.replaceState(null, "", `messages?c=${encodeURIComponent(id)}`);
    $("chatShell").classList.add("thread-open");
    $("chatEmpty").classList.add("hidden");
    $("chatOpen").classList.remove("hidden");
    const c = chats.find((x) => x.id === id);
    if (c) { renderHead(c); c.unread = false; }
    renderList();
    messages = [];
    lastAt = null;
    $("chatMsgs").innerHTML = `<div class="chat-start-note">${esc(t("loading"))}</div>`;
    await pollThread(true);
    $("chatInput").focus();
    clearInterval(threadTimer);
    threadTimer = setInterval(() => { if (!document.hidden) pollThread(false); }, 3000);
  }
  function closeThread() {
    activeId = null;
    clearInterval(threadTimer);
    history.replaceState(null, "", "messages");
    $("chatShell").classList.remove("thread-open");
    $("chatEmpty").classList.remove("hidden");
    $("chatOpen").classList.add("hidden");
    renderList();
  }
  // رسايل جديدة بس (بعد آخر رسالة عندنا)
  async function pollThread(first) {
    const id = activeId;
    if (!id) return;
    try {
      const q = lastAt ? `?after=${encodeURIComponent(lastAt)}` : "";
      const data = await Api.call("GET", `/api/chats/${encodeURIComponent(id)}/messages${q}`);
      if (id !== activeId) return;
      const i = chats.findIndex((x) => x.id === id);
      if (i >= 0) chats[i] = data.chat; else chats.unshift(data.chat);
      renderHead(data.chat);
      const fresh = data.messages.filter((m) => !messages.some((x) => x.id === m.id));
      if (fresh.length || first) {
        messages = [...messages.filter((m) => !m.pending), ...fresh, ...messages.filter((m) => m.pending)];
        if (messages.length) lastAt = messages.filter((m) => !m.pending).slice(-1)[0]?.createdAt || lastAt;
        renderMsgs(first);
        if (fresh.length && !first) Notifs.sync();
      }
      if (first) { renderList(); Notifs.sync(); }
    } catch (err) {
      if (err.message === "err_not_found") { toast(t("err_not_found"), "error"); closeThread(); }
    }
  }

  /* --- إرسال --- */
  const input = $("chatInput");
  const grow = () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(140, input.scrollHeight)}px`;
    input.style.overflowY = input.scrollHeight > 140 ? "auto" : "hidden";
  };
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => {
    // Enter = إرسال، Shift+Enter = سطر جديد
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("chatForm").requestSubmit(); }
  });
  $("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body || !activeId || sending) return;
    sending = true;
    const temp = { id: `tmp_${Date.now()}`, body, mine: true, pending: true, createdAt: new Date().toISOString() };
    messages.push(temp);
    input.value = "";
    grow();
    renderMsgs(true);
    try {
      const { message } = await Api.call("POST", `/api/chats/${encodeURIComponent(activeId)}/messages`, { body });
      messages = messages.filter((m) => m.id !== temp.id && m.id !== message.id);
      messages.push(message);
      lastAt = message.createdAt;
      const c = chats.find((x) => x.id === activeId);
      if (c) { c.lastBody = body; c.lastAt = message.createdAt; c.lastMine = true; chats.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt))); }
      renderMsgs(true);
      renderList();
    } catch (err) {
      messages = messages.filter((m) => m.id !== temp.id);
      renderMsgs(true);
      input.value = body;
      grow();
      toast(t(err.message), "error");
    } finally {
      sending = false;
      input.focus();
    }
  });

  /* --- أحداث --- */
  $("chatItems").addEventListener("click", (e) => {
    const b = e.target.closest("[data-chat]");
    if (b && b.dataset.chat !== activeId) openThread(b.dataset.chat);
    else if (b) $("chatShell").classList.add("thread-open");
  });
  $("chatBack").addEventListener("click", closeThread);
  $("chatListing").addEventListener("click", () => {
    const id = $("chatListing").dataset.listing;
    if (id && Listings.get(id)) openDetails(id);
  });

  // أول ما الصفحة تفتح
  (async () => {
    $("chatItems").innerHTML = `<div class="chat-list-empty"><small>${esc(t("loading"))}</small></div>`;
    await loadList();
    if (activeId) openThread(activeId);
    listTimer = setInterval(() => { if (!document.hidden) loadList(); }, 10000);
  })();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { loadList(); pollThread(false); } });
  window.addEventListener("beforeunload", () => { clearInterval(threadTimer); clearInterval(listTimer); });
})();
