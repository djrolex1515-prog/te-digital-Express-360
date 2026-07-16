(() => {
  const TOKEN_KEY = "td360_func_token";
  const USER_KEY = "td360_func_user";

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
  function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const apiHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken(),
  });

  async function apiFetch(url, opts = {}) {
    const r = await fetch(url, { headers: apiHeaders(), ...opts });
    if (r.status === 401) { clearAuth(); showLogin(); return null; }
    return r;
  }

  const loginView = document.getElementById("loginView");
  const funcApp = document.getElementById("funcApp");
  const pages = document.querySelectorAll(".admin-page");
  const links = document.querySelectorAll(".sidebar-link");

  function showApp() {
    document.getElementById("bodyRoot").style.display = "";
    loginView.hidden = true;
    funcApp.hidden = false;
    const user = getUser();
    const nameEl = document.getElementById("funcName");
    if (user && nameEl) nameEl.textContent = user.full_name || user.email || "";
    loadDashboard();
  }

  function showLogin() {
    document.getElementById("bodyRoot").style.display = "none";
    loginView.hidden = false;
    funcApp.hidden = true;
  }

  /* ── Navegacion SPA ── */
  function navigateTo(page) {
    links.forEach((l) => l.classList.toggle("active", l.dataset.page === page));
    pages.forEach((p) => p.hidden = p.id !== "page-" + page);
    if (page === "dashboard") loadDashboard();
    if (page === "solicitudes") loadRequests();
    if (page === "citas") loadAppointments();
    if (page === "documentos") loadDocuments();
  }
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.classList.contains("sidebar-home")) return;
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  /* ── Login ── */
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("loginStatus");
      const btn = loginForm.querySelector("button[type=submit]");
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      if (!email || !password) { status.className = "login-status error"; status.textContent = "Completa todos los campos."; return; }
      status.className = "login-status";
      status.textContent = "Validando...";
      btn.disabled = true;
      btn.textContent = "Entrando...";
      try {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const d = await r.json();
        if (!r.ok) { status.className = "login-status error"; status.textContent = d.error || "Credenciales invalidas."; btn.disabled = false; btn.textContent = "Entrar"; return; }
        if (d.user && d.user.role !== "funcionario" && d.user.role !== "director" && d.user.role !== "superadmin") {
          status.className = "login-status error";
          status.textContent = "No tienes permisos de funcionario.";
          btn.disabled = false;
          btn.textContent = "Entrar";
          return;
        }
        setAuth(d.token, d.user);
        showApp();
      } catch {
        status.className = "login-status error";
        status.textContent = "Error de conexion.";
        btn.disabled = false;
        btn.textContent = "Entrar";
      }
    });
  }

  /* ── Logout ── */
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try { await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + getToken() } }); } finally { clearAuth(); showLogin(); }
  });

  /* ── Dashboard ── */
  async function loadDashboard() {
    const r = await apiFetch("/api/admin/stats");
    if (!r) return;
    const d = await r.json();
    setText("metricMyRequests", d.requests ?? 0);
    setText("metricMyAppointments", d.appointments ?? 0);
    setText("metricDocsProcessed", d.documents ?? 0);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Solicitudes ── */
  async function loadRequests() {
    const r = await apiFetch("/api/admin/requests");
    if (!r) return;
    const d = await r.json();
    const requests = d.requests || [];
    const tbody = document.getElementById("requestsBody");
    const empty = document.getElementById("requestsEmpty");
    if (!requests.length) { tbody.innerHTML = ""; empty.hidden = false; return; }
    empty.hidden = true;
    tbody.innerHTML = requests.map((req) => `
      <tr>
        <td><code>${escapeHtml(req.tracking_code)}</code></td>
        <td>${escapeHtml(req.service_id)}</td>
        <td>${escapeHtml(req.citizen_name)}</td>
        <td>${escapeHtml(req.citizen_contact)}</td>
        <td><span class="status-badge status-${escapeHtml(req.status)}">${escapeHtml(req.status)}</span></td>
        <td>${escapeHtml(req.created_at?.split("T")[0] || "")}</td>
        <td>
          <select class="status-select" data-id="${req.id}" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;">
            <option value="recibida" ${req.status === "recibida" ? "selected" : ""}>Recibida</option>
            <option value="validada" ${req.status === "validada" ? "selected" : ""}>Validada</option>
            <option value="en_impresion" ${req.status === "en_impresion" ? "selected" : ""}>En impresion</option>
            <option value="lista_retiro" ${req.status === "lista_retiro" ? "selected" : ""}>Lista para retiro</option>
            <option value="requiere_revision" ${req.status === "requiere_revision" ? "selected" : ""}>Requiere revision</option>
            <option value="en_espera" ${req.status === "en_espera" ? "selected" : ""}>En espera</option>
            <option value="aprobada" ${req.status === "aprobada" ? "selected" : ""}>Aprobada</option>
            <option value="cerrada" ${req.status === "cerrada" ? "selected" : ""}>Cerrada</option>
          </select>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.dataset.id;
        const newStatus = sel.value;
        const r = await apiFetch("/api/admin/requests/" + id + "/status", {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
        if (r && r.ok) loadRequests();
      });
    });
  }

  /* ── Citas ── */
  async function loadAppointments() {
    const r = await apiFetch("/api/admin/appointments");
    if (!r) return;
    const d = await r.json();
    const appointments = d.appointments || [];
    const tbody = document.getElementById("appointmentsBody");
    const empty = document.getElementById("appointmentsEmpty");
    if (!appointments.length) { tbody.innerHTML = ""; empty.hidden = false; return; }
    empty.hidden = true;
    tbody.innerHTML = appointments.map((a) => `
      <tr>
        <td>${escapeHtml(a.citizen_name || "Sin asignar")}</td>
        <td>${escapeHtml(a.service_type)}</td>
        <td>${escapeHtml(a.office)}</td>
        <td>${escapeHtml(a.appointment_date)}</td>
        <td>${escapeHtml(a.appointment_time)}</td>
        <td><span class="status-badge status-${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
        <td>
          <select class="appt-status-select" data-id="${a.id}">
            <option value="">Cambiar estado...</option>
            <option value="pendiente" ${a.status === "pendiente" ? "selected" : ""}>Pendiente</option>
            <option value="confirmada" ${a.status === "confirmada" ? "selected" : ""}>Confirmada</option>
            <option value="completada" ${a.status === "completada" ? "selected" : ""}>Completada</option>
            <option value="cancelada" ${a.status === "cancelada" ? "selected" : ""}>Cancelada</option>
          </select>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".appt-status-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.dataset.id;
        const newStatus = sel.value;
        if (!newStatus) return;
        const labels = { pendiente: "Pendiente", confirmada: "Confirmada", completada: "Completada", cancelada: "Cancelada" };
        if (!confirm(`Cambiar estado de la cita a "${labels[newStatus]}"?`)) { sel.value = ""; return; }
        const r = await apiFetch("/api/admin/appointments/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
        if (r && r.ok) loadAppointments();
      });
    });
  }

  /* ── Ciudadanos (solo lectura) ── */
  /* ── Documentos (solo lectura) ── */
  async function loadDocuments() {
    const r = await apiFetch("/api/admin/documents");
    if (!r) return;
    const d = await r.json();
    const docs = d.documents || [];
    const tbody = document.getElementById("documentsBody");
    const empty = document.getElementById("documentsEmpty");
    if (!docs.length) { tbody.innerHTML = ""; empty.hidden = false; return; }
    empty.hidden = true;
    tbody.innerHTML = docs.map((doc) => `
      <tr>
        <td>${escapeHtml(doc.citizen_name || "N/A")}</td>
        <td>${escapeHtml(doc.doc_type)}</td>
        <td>${escapeHtml(doc.filename)}</td>
        <td>${escapeHtml(doc.related_tracking_code || "N/A")}</td>
        <td>${escapeHtml(doc.created_at?.split("T")[0] || "")}</td>
      </tr>
    `).join("");
  }

  /* ── Init ── */
  async function init() {
    const token = getToken();
    if (!token) { showLogin(); return; }
    try {
      const r = await fetch("/api/admin/stats", {
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      });
      if (r.status === 401) { clearAuth(); showLogin(); return; }
      showApp();
    } catch { clearAuth(); showLogin(); }
  }
  init();
})();
