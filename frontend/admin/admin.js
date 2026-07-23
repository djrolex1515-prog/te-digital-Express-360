(() => {
  const TOKEN_KEY = "td360_admin_token";
  const USER_KEY = "td360_admin_user";
  const REQUEST_STATUS = {
    recibida: "Recibida", validada: "Validada", en_impresion: "En Impresion",
    lista_retiro: "Lista para Retiro", requiere_revision: "Requiere Revision",
    en_espera: "En Espera", aprobada: "Aprobada", cerrada: "Cerrada", cancelada: "Cancelada",
  };
  const APPT_STATUS = { pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada", completada: "Completada" };

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
    if (r.status === 401) { clearAuth(); window.location.href = "login.html"; return null; }
    return r;
  }

  const adminApp = document.getElementById("adminApp");
  const pages = document.querySelectorAll(".admin-page");
  const links = document.querySelectorAll(".sidebar-link");
  let activePage = "bienvenida";
  let refreshTimer = null;

  function showApp() {
    adminApp.hidden = false;
    const user = getUser();
    const nameEl = document.getElementById("adminName");
    if (user && nameEl) nameEl.textContent = user.full_name || user.email || "";

    const welcomeEl = document.getElementById("welcomeTitle");
    if (welcomeEl && user) {
      const role = user.role;
      if (role === "superadmin") welcomeEl.textContent = "Bienvenido Superadmin";
      else if (role === "director") welcomeEl.textContent = "Bienvenido Director/a";
      else if (role === "soporte") welcomeEl.textContent = "Bienvenido Soporte";
      else welcomeEl.textContent = "Bienvenido";
    }

    links.forEach((link) => {
      const restricted = link.dataset.restricted;
      if (restricted && user && user.role !== "superadmin" && user.role !== "soporte" && user.role !== restricted) {
        link.style.display = "none";
      }
    });

    startAutoRefresh();
  }

  function refreshActivePage() {
    if (document.hidden) return;

    const refreshers = {
      usuarios: loadUsers,
      ciudadanos: loadCitizens,
    };

    const refresh = refreshers[activePage];
    if (refresh) refresh();
  }

  function startAutoRefresh() {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(refreshActivePage, 5000);
  }

  function stopAutoRefresh() {
    if (!refreshTimer) return;
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  /* ── Mobile Menu Toggle ── */
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const adminSidebar = document.getElementById("adminSidebar");
  if (mobileToggle && adminSidebar) {
    mobileToggle.addEventListener("click", () => {
      adminSidebar.classList.toggle("is-open");
      mobileToggle.classList.toggle("is-active");
    });
    adminSidebar.addEventListener("click", (e) => {
      if (e.target.closest(".sidebar-link") || e.target.closest(".sidebar-logout")) {
        adminSidebar.classList.remove("is-open");
        mobileToggle.classList.remove("is-active");
      }
    });
    document.addEventListener("click", (e) => {
      if (adminSidebar.classList.contains("is-open") &&
          !adminSidebar.contains(e.target) &&
          !mobileToggle.contains(e.target)) {
        adminSidebar.classList.remove("is-open");
        mobileToggle.classList.remove("is-active");
      }
    });
  }

  /* ── Navegacion SPA ── */
  function navigateTo(page) {
    activePage = page;
    links.forEach((l) => l.classList.toggle("active", l.dataset.page === page));
    pages.forEach((p) => p.hidden = p.id !== "page-" + page);
    if (page === "usuarios") loadUsers();
    if (page === "ciudadanos") loadCitizens();
    if (page === "solicitudes") loadRequests();
    if (page === "nueva-solicitud") loadNewRequestForm();
    if (page === "citas") loadAppointments();
    if (page === "documentos") loadDocuments();
    if (page === "portal-ciudadano") loadPortalConfig();
    if (page === "notificaciones") loadNotifications();
  }
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.classList.contains("sidebar-home")) return;
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  /* ── Logout ── */
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try { await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + getToken() } }); } finally { clearAuth(); window.location.href = "login.html"; }
  });

  /* ── Dashboard ── */
  async function loadUsers() {
    try {
      const r = await apiFetch("/api/admin/users");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderUsers(d.users || []);
    } catch {}
  }

  function renderUsers(users) {
    const tbody = document.getElementById("usersBody");
    const empty = document.getElementById("usersEmpty");
    if (!tbody) return;
    if (users.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="role-badge">${escapeHtml(u.role)}</span></td>
        <td><span class="status-badge ${u.is_active ? "active" : "inactive"}">${u.is_active ? "Activo" : "Inactivo"}</span></td>
        <td class="actions-cell">
          ${u.role === "superadmin" ? '<span style="color:var(--muted);font-size:12px;">Protegido</span>' :
            `<button class="btn-sm btn-edit" data-edit="${u.id}">Editar</button>
             <button class="btn-sm btn-delete" data-delete="${u.id}">Eliminar</button>`}
        </td>
      </tr>
    `).join("");
  }

  const userModal = document.getElementById("userModal");
  const userForm = document.getElementById("userForm");

  document.getElementById("btnNewUser")?.addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "Nuevo Usuario";
    userForm.reset();
    document.getElementById("userId").value = "";
    document.getElementById("userPassword").required = true;
    document.getElementById("userRole").value = "soporte";
    document.querySelector('input[name="userStatus"][value="activo"]').checked = true;
    userModal.hidden = false;
  });

  document.getElementById("btnCancelModal")?.addEventListener("click", () => { userModal.hidden = true; userModal.style.display = ""; });

  document.getElementById("usersBody")?.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      const id = editBtn.dataset.edit;
      editUser(id);
    }
    const deleteBtn = e.target.closest("[data-delete]");
    if (deleteBtn) {
      const id = deleteBtn.dataset.delete;
      if (confirm("Eliminar este usuario?")) deleteUser(id);
    }
  });

  async function editUser(id) {
    try {
      const r = await apiFetch("/api/admin/users");
      if (!r || !r.ok) return;
      const d = await r.json();
      const u = (d.users || []).find((x) => String(x.id) === String(id));
      if (!u) return;
      document.getElementById("modalTitle").textContent = "Editar Usuario";
      document.getElementById("userId").value = u.id;
      const parts = (u.full_name || "").split(" ");
      document.getElementById("userName").value = parts[0] || "";
      document.getElementById("userLastname").value = parts.slice(1).join(" ") || "";
      document.getElementById("userEmail").value = u.email || "";
      document.getElementById("userUsername").value = u.username || "";
      document.getElementById("userCedula").value = u.cedula || "";
      document.getElementById("userPassword").value = "";
      document.getElementById("userPassword").required = false;
      document.getElementById("userRole").value = u.role || "funcionario";
      const statusRadio = document.querySelector(`input[name="userStatus"][value="${u.is_active ? "activo" : "inactivo"}"]`);
      if (statusRadio) statusRadio.checked = true;
      userModal.hidden = false;
    } catch {}
  }

  async function deleteUser(id) {
    try {
      const r = await apiFetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (!r) return;
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Error al eliminar."); return; }
      loadUsers();
    } catch { alert("Error de conexión."); }
  }

  userForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("userId").value;
    const nombre = document.getElementById("userName").value.trim();
    const apellido = document.getElementById("userLastname").value.trim();
    const full_name = (nombre + " " + apellido).trim();
    const email = document.getElementById("userEmail").value.trim();
    const username = document.getElementById("userUsername").value.trim();
    const cedula = document.getElementById("userCedula").value.trim();
    const password = document.getElementById("userPassword").value;
    const role = document.getElementById("userRole").value;
    const is_active = document.querySelector('input[name="userStatus"]:checked')?.value === "activo";

    const body = { full_name, email, username, cedula, role, is_active };
    if (password) body.password = password;

    try {
      let r;
      if (id) {
        r = await apiFetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        r = await apiFetch("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      if (!r) return;
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Error al guardar."); return; }
      userModal.hidden = true;
      userModal.style.display = "";
      loadUsers();
    } catch { alert("Error de conexión."); }
  });

  /* ── Ciudadanos ── */
  async function loadCitizens() {
    try {
      const r = await apiFetch("/api/admin/citizens");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderCitizens(d.citizens || []);
    } catch {}
  }

  function renderCitizens(citizens) {
    const tbody = document.getElementById("citizensBody");
    const empty = document.getElementById("citizensEmpty");
    if (!tbody) return;
    if (citizens.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    tbody.innerHTML = citizens.map((c) => `
      <tr>
        <td>${escapeHtml(c.full_name)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.cedula)}</td>
        <td><span class="status-badge ${c.is_active ? "active" : "inactive"}">${c.is_active ? "Activo" : "Inactivo"}</span></td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-edit" data-edit-citizen="${c.id}">Editar</button>
          <button class="btn-sm btn-delete" data-delete-citizen="${c.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  const citizenModal = document.getElementById("citizenModal");
  let citizenPhotoData = "";

  document.getElementById("citizensBody")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-citizen]");
    if (editBtn) {
      const id = editBtn.dataset.editCitizen;
      const r = await apiFetch(`/api/admin/citizens/${id}`);
      if (!r || !r.ok) return;
      const c = await r.json();
      if (!c || c.error) return;
      document.getElementById("citizenEditId").value = c.id;
      document.getElementById("citizenEditName").value = c.full_name || "";
      document.getElementById("citizenEditEmail").value = c.email || "";
      document.getElementById("citizenEditCedula").value = c.cedula || "";
      citizenPhotoData = c.photo || "";
      const preview = document.getElementById("citizenPhotoPreview");
      if (citizenPhotoData) {
        preview.innerHTML = `<img src="${citizenPhotoData}" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        preview.innerHTML = '<span style="font-size:36px;color:var(--muted);">📷</span>';
      }
      citizenModal.hidden = false;
    }
    const deleteBtn = e.target.closest("[data-delete-citizen]");
    if (deleteBtn) {
      if (!confirm("Eliminar este ciudadano?")) return;
      const r = await apiFetch(`/api/admin/citizens/${deleteBtn.dataset.deleteCitizen}`, { method: "DELETE" });
      if (r && r.ok) loadCitizens();
    }
  });

  document.getElementById("btnUploadCitizenPhoto")?.addEventListener("click", () => {
    document.getElementById("citizenPhotoInput").click();
  });

  document.getElementById("citizenPhotoPreview")?.addEventListener("click", () => {
    document.getElementById("citizenPhotoInput").click();
  });

  document.getElementById("citizenPhotoInput")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("La imagen no puede superar 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      citizenPhotoData = reader.result;
      document.getElementById("citizenPhotoPreview").innerHTML = `<img src="${citizenPhotoData}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btnCancelCitizenModal")?.addEventListener("click", () => {
    citizenModal.hidden = true;
    citizenModal.style.display = "";
  });

  document.getElementById("citizenForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("citizenEditId").value;
    const full_name = document.getElementById("citizenEditName").value.trim();
    const email = document.getElementById("citizenEditEmail").value.trim();
    const cedula = document.getElementById("citizenEditCedula").value.trim();
    if (!full_name || !email) { alert("Nombre y correo son requeridos."); return; }
    const r = await apiFetch(`/api/admin/citizens/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ full_name, email, cedula }),
    });
    if (!r) return;
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Error al guardar."); return; }
    if (citizenPhotoData) {
      await apiFetch(`/api/admin/citizens/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ photo: citizenPhotoData }),
      });
    }
    citizenModal.hidden = true;
    citizenModal.style.display = "";
    loadCitizens();
  });

  /* ── Solicitudes ── */
  async function loadRequests() {
    try {
      const r = await apiFetch("/api/admin/requests");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderRequests(d.requests || []);
    } catch {}
  }

  function renderRequests(requests) {
    const tbody = document.getElementById("requestsBody");
    const empty = document.getElementById("requestsEmpty");
    if (!tbody) return;
    if (requests.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    tbody.innerHTML = requests.map((r) => `
      <tr>
        <td><code>${escapeHtml(r.tracking_code)}</code></td>
        <td>${escapeHtml(r.service_title || r.service_id)}</td>
        <td>${escapeHtml(r.request_type || "-")}</td>
        <td>${escapeHtml(r.citizen_name)}</td>
        <td>${escapeHtml(r.citizen_contact)}</td>
        <td><span class="status-badge status-${r.status}">${REQUEST_STATUS[r.status] || r.status}</span></td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td class="actions-cell">
          <select class="request-status-select" data-status-id="${r.id}">
            <option value="">Cambiar estado...</option>
            <option value="recibida">Recibida</option>
            <option value="validada">Validada</option>
            <option value="en_impresion">En Impresion</option>
            <option value="lista_retiro">Lista para Retiro</option>
            <option value="requiere_revision">Requiere Revision</option>
            <option value="en_espera">En Espera</option>
            <option value="aprobada">Aprobada</option>
            <option value="cerrada">Cerrada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <button class="btn-sm btn-delete" data-delete-request="${r.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  document.getElementById("requestsBody")?.addEventListener("change", async (e) => {
    const select = e.target.closest(".request-status-select");
    if (!select) return;
    const newStatus = select.value;
    if (!newStatus) return;
    if (!confirm(`Cambiar estado de la solicitud a "${REQUEST_STATUS[newStatus]}"?`)) { select.value = ""; return; }
    const r = await apiFetch("/api/admin/requests/status", {
      method: "POST",
      body: JSON.stringify({ request_id: select.dataset.statusId, status: newStatus }),
    });
    if (r && r.ok) loadRequests();
  });

  document.getElementById("requestsBody")?.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest("[data-delete-request]");
    if (!deleteBtn) return;
    if (!confirm("¿Eliminar esta solicitud permanentemente?")) return;
    const r = await apiFetch(`/api/admin/requests/${deleteBtn.dataset.deleteRequest}`, { method: "DELETE" });
    if (r && r.ok) loadRequests();
  });

  /* ── Citas ── */
  let allAppointments = [];

  async function loadAppointments() {
    try {
      const r = await apiFetch("/api/admin/appointments");
      if (!r || !r.ok) return;
      const d = await r.json();
      allAppointments = d.appointments || [];
      filterAppointments();
    } catch {}
  }

  function filterAppointments() {
    const filterDate = document.getElementById("apptFilterDate")?.value;
    let filtered = allAppointments;
    if (filterDate) filtered = filtered.filter((a) => a.appointment_date === filterDate);
    renderAppointments(filtered);
  }

  document.getElementById("apptFilterDate")?.addEventListener("change", filterAppointments);

  document.getElementById("btnPrintDaily")?.addEventListener("click", () => {
    const filterDate = document.getElementById("apptFilterDate")?.value || new Date().toISOString().slice(0, 10);
    const filtered = allAppointments.filter((a) => a.appointment_date === filterDate);
    const offices = {};
    filtered.forEach((a) => {
      if (!offices[a.office]) offices[a.office] = [];
      offices[a.office].push(a);
    });
    let tableRows = "";
    let totalCitas = filtered.length;
    let confirmadas = filtered.filter((a) => a.status === "confirmada").length;
    let pendientes = filtered.filter((a) => a.status === "pendiente").length;
    let completadas = filtered.filter((a) => a.status === "completada").length;
    let canceladas = filtered.filter((a) => a.status === "cancelada").length;

    for (const [office, appts] of Object.entries(offices)) {
      tableRows += `<tr><td colspan="6" style="background:#f0f4f8;font-weight:700;padding:10px 12px;">${escapeHtml(office)} (${appts.length} citas)</td></tr>`;
      appts.forEach((a) => {
        const hh = parseInt(a.appointment_time.split(":")[0]);
        const mm = a.appointment_time.split(":")[1];
        const ampm = hh >= 12 ? "p.m." : "a.m.";
        const h12 = hh > 12 ? hh - 12 : hh;
        tableRows += `<tr>
          <td style="padding:8px 12px;">${escapeHtml(a.appointment_time)}</td>
          <td style="padding:8px 12px;">${escapeHtml(a.citizen_name || "-")}</td>
          <td style="padding:8px 12px;">${escapeHtml(a.cedula || "-")}</td>
          <td style="padding:8px 12px;">${escapeHtml(a.service_type)}</td>
          <td style="padding:8px 12px;">${escapeHtml(a.contact_phone || "-")}</td>
          <td style="padding:8px 12px;">${APPT_STATUS[a.status] || a.status}</td>
        </tr>`;
      });
    }

    const dateObj = new Date(filterDate + "T12:00:00");
    const dateStr = dateObj.toLocaleDateString("es-PA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const printWin = window.open("", "_blank", "width=900,height=700");
    printWin.document.write(`<!DOCTYPE html>
<html><head><title>Reporte Diario de Citas</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #666; font-weight: normal; margin-top: 0; }
  .summary { display: flex; gap: 16px; margin: 16px 0; }
  .summary-item { background: #f5f7fa; border-radius: 8px; padding: 12px 18px; text-align: center; }
  .summary-item .num { font-size: 24px; font-weight: 700; }
  .summary-item .label { font-size: 12px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #16365f; color: #fff; padding: 10px 12px; text-align: left; font-size: 13px; }
  td { border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h1>TE Digital Express 360 — Reporte Diario de Citas</h1>
<h2>${dateStr}</h2>
<div class="summary">
  <div class="summary-item"><div class="num">${totalCitas}</div><div class="label">Total</div></div>
  <div class="summary-item"><div class="num" style="color:#059669;">${confirmadas}</div><div class="label">Confirmadas</div></div>
  <div class="summary-item"><div class="num" style="color:#d97706;">${pendientes}</div><div class="label">Pendientes</div></div>
  <div class="summary-item"><div class="num" style="color:#2563eb;">${completadas}</div><div class="label">Completadas</div></div>
  <div class="summary-item"><div class="num" style="color:#dc2626;">${canceladas}</div><div class="label">Canceladas</div></div>
</div>
<table>
  <thead><tr><th>Hora</th><th>Ciudadano</th><th>Cédula</th><th>Servicio</th><th>Teléfono</th><th>Estado</th></tr></thead>
  <tbody>${tableRows || '<tr><td colspan="6" style="text-align:center;padding:24px;">No hay citas para esta fecha.</td></tr>'}</tbody>
</table>
<div class="footer">Generado el ${new Date().toLocaleString("es-PA")} — TE Digital Express 360</div>
</body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 400);
  });

  function renderAppointments(appointments) {
    const tbody = document.getElementById("appointmentsBody");
    const empty = document.getElementById("appointmentsEmpty");
    if (!tbody) return;
    if (appointments.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    tbody.innerHTML = appointments.map((a) => `
      <tr>
        <td>${escapeHtml(a.citizen_name || "-")}</td>
        <td>${escapeHtml(a.service_type)}</td>
        <td>${escapeHtml(a.office)}</td>
        <td>${escapeHtml(a.appointment_date)}</td>
        <td>${escapeHtml(a.appointment_time)}</td>
        <td><span class="status-badge status-${a.status}">${APPT_STATUS[a.status] || a.status}</span></td>
        <td class="actions-cell">
          <select class="appt-status-select" data-appt-id="${a.id}">
            <option value="">Cambiar estado...</option>
            <option value="confirmada">Confirmada</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <button class="btn-sm btn-delete" data-delete-appt="${a.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  document.getElementById("appointmentsBody")?.addEventListener("change", async (e) => {
    const select = e.target.closest(".appt-status-select");
    if (select) {
      const newStatus = select.value;
      if (!newStatus) { select.value = ""; return; }
      const labels = APPT_STATUS;
      if (!confirm(`Cambiar estado de la cita a "${labels[newStatus]}"?`)) { select.value = ""; return; }
      const r = await apiFetch(`/api/admin/appointments/${select.dataset.apptId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (r && r.ok) loadAppointments();
    }
  });

  document.getElementById("appointmentsBody")?.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest("[data-delete-appt]");
    if (deleteBtn) {
      if (!confirm("¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer.")) return;
      const r = await apiFetch(`/api/admin/appointments/${deleteBtn.dataset.deleteAppt}`, { method: "DELETE" });
      if (r && r.ok) loadAppointments();
    }
  });

  /* ── Nueva Solicitud ── */
  async function loadNewRequestForm() {
    const select = document.getElementById("reqService");
    if (!select) return;
    try {
      const r = await apiFetch("/api/admin/services");
      if (!r || !r.ok) return;
      const d = await r.json();
      select.innerHTML = '<option value="">Seleccionar servicio...</option>';
      (d.services || []).forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.title + " (" + s.category + ")";
        select.appendChild(opt);
      });
    } catch {}
  }

  document.getElementById("newRequestForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const service_id = document.getElementById("reqService").value;
    const request_type = document.getElementById("reqType").value;
    const citizen_name = document.getElementById("reqCitizenName").value.trim();
    const citizen_contact = document.getElementById("reqCitizenContact").value.trim();
    const notes = document.getElementById("reqNotes").value.trim();

    const r = await apiFetch("/api/admin/requests/create", {
      method: "POST",
      body: JSON.stringify({ service_id, request_type, citizen_name, citizen_contact, notes }),
    });
    if (!r) return;
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Error al crear solicitud."); return; }
    alert("Solicitud creada. Código: " + d.tracking_code);
    document.getElementById("newRequestForm").reset();
    navigateTo("solicitudes");
  });

  document.getElementById("btnCancelRequest")?.addEventListener("click", () => {
    document.getElementById("newRequestForm").reset();
    navigateTo("solicitudes");
  });

  /* ── Documentos ── */
  async function loadDocuments() {
    try {
      const r = await apiFetch("/api/admin/documents");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderDocuments(d.documents || []);
    } catch {}
  }

  function renderDocuments(documents) {
    const tbody = document.getElementById("documentsBody");
    const empty = document.getElementById("documentsEmpty");
    if (!tbody) return;
    if (documents.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    const typeLabels = { comprobante: "Comprobante", recibo: "Recibo" };
    tbody.innerHTML = documents.map((doc) => `
      <tr>
        <td>${escapeHtml(doc.citizen_name || "-")}</td>
        <td><span class="status-badge status-recibida">${typeLabels[doc.doc_type] || doc.doc_type}</span></td>
        <td>${escapeHtml(doc.filename)}</td>
        <td>${escapeHtml(doc.related_tracking_code || "-")}</td>
        <td>${new Date(doc.created_at).toLocaleDateString()}</td>
      </tr>
    `).join("");
  }

  /* ── Nueva Cita ── */
  document.getElementById("btnNewAppointment")?.addEventListener("click", () => {
    const form = document.getElementById("newAppointmentForm");
    if (form) { form.hidden = false; form.scrollIntoView({ behavior: "smooth" }); }
    document.getElementById("apptTime").innerHTML = '<option value="">Selecciona oficina y fecha</option>';
    document.getElementById("apptSlotInfo").textContent = "";
  });

  document.getElementById("btnCancelAppt")?.addEventListener("click", () => {
    const form = document.getElementById("newAppointmentForm");
    if (form) { form.hidden = true; document.getElementById("appointmentForm")?.reset(); }
  });

  async function loadAdminApptSlots() {
    const office = document.getElementById("apptOffice").value;
    const date = document.getElementById("apptDate").value;
    const timeSelect = document.getElementById("apptTime");
    const info = document.getElementById("apptSlotInfo");
    if (!office || !date) { timeSelect.innerHTML = '<option value="">Selecciona oficina y fecha</option>'; info.textContent = ""; return; }
    try {
      const r = await apiFetch(`/api/appointments/slots?office=${encodeURIComponent(office)}&date=${encodeURIComponent(date)}`);
      if (!r || !r.ok) return;
      const d = await r.json();
      const slots = d.slots || [];
      timeSelect.innerHTML = '<option value="">Selecciona horario</option>';
      let available = 0;
      slots.forEach((s) => {
        const o = document.createElement("option");
        o.value = s.time;
        const hh = parseInt(s.time.split(":")[0]);
        const mm = s.time.split(":")[1];
        const ampm = hh >= 12 ? "p.m." : "a.m.";
        const h12 = hh > 12 ? hh - 12 : hh;
        if (s.remaining > 0) {
          o.textContent = `${h12}:${mm} ${ampm} — ${s.remaining} cupo${s.remaining > 1 ? "s" : ""}`;
          available++;
        } else {
          o.textContent = `${h12}:${mm} ${ampm} — lleno`;
          o.disabled = true;
        }
        timeSelect.appendChild(o);
      });
      info.textContent = `${available} horario${available !== 1 ? "s" : ""} disponible${available !== 1 ? "s" : ""}`;
    } catch {}
  }

  document.getElementById("apptOffice")?.addEventListener("change", loadAdminApptSlots);
  document.getElementById("apptDate")?.addEventListener("change", loadAdminApptSlots);

  document.getElementById("appointmentForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const citizen_name = document.getElementById("apptName").value.trim();
    const cedula = document.getElementById("apptCedula").value.trim();
    const service_type = document.getElementById("apptService").value;
    const office = document.getElementById("apptOffice").value.trim();
    const appointment_date = document.getElementById("apptDate").value;
    const appointment_time = document.getElementById("apptTime").value;
    const contact_phone = document.getElementById("apptPhone").value.trim();
    const notes = document.getElementById("apptNotes").value.trim();

    if (!citizen_name || !service_type || !office || !appointment_date || !appointment_time) {
      alert("Por favor complete todos los campos requeridos."); return;
    }

    const body = { citizen_name, service_type, office, appointment_date, appointment_time, contact_phone, notes };
    if (cedula) body.cedula = cedula;

    const r = await apiFetch("/api/admin/appointments/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r) return;
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Error al crear cita."); return; }
    alert("Cita creada para " + citizen_name + " el " + appointment_date + " a las " + appointment_time);
    document.getElementById("appointmentForm")?.reset();
    document.getElementById("newAppointmentForm").hidden = true;
    loadAppointments();
  });

  /* ── Portal Ciudadano Config ── */
  let portalSections = [];

  async function loadPortalConfig() {
    const r = await apiFetch("/api/admin/portal-config");
    if (!r) return;
    const d = await r.json();
    portalSections = d.sections || [];
    renderPortalSections();
  }

  function renderPortalSections() {
    const tbody = document.getElementById("portalSectionsBody");
    if (!tbody) return;
    if (!portalSections.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No hay secciones configuradas.</td></tr>';
      return;
    }
    tbody.innerHTML = portalSections.map((s) => `
      <tr data-key="${escapeHtml(s.section_key)}">
        <td><strong>${escapeHtml(s.section_name)}</strong></td>
        <td><code>${escapeHtml(s.section_key)}</code></td>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" class="portal-active-toggle" data-key="${escapeHtml(s.section_key)}" ${s.is_active ? "checked" : ""} />
            <span class="toggle-slider"></span>
          </label>
          <span class="status-badge ${s.is_active ? 'status-completada' : 'status-cancelada'}">${s.is_active ? 'Activa' : 'Inactiva'}</span>
        </td>
        <td>
          <input type="number" class="portal-order-input" data-key="${escapeHtml(s.section_key)}" value="${s.sort_order}" min="1" max="20" style="width:60px; padding:0.3rem; border:1px solid var(--border); border-radius:4px;" />
        </td>
        <td>
          <button class="btn-sm btn-outline portal-move-up" data-key="${escapeHtml(s.section_key)}" title="Subir">▲</button>
          <button class="btn-sm btn-outline portal-move-down" data-key="${escapeHtml(s.section_key)}" title="Bajar">▼</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".portal-active-toggle").forEach((toggle) => {
      toggle.addEventListener("change", () => {
        const key = toggle.dataset.key;
        const section = portalSections.find((s) => s.section_key === key);
        if (section) {
          section.is_active = toggle.checked ? 1 : 0;
          const badge = toggle.closest("td").querySelector(".status-badge");
          if (badge) {
            badge.className = "status-badge " + (section.is_active ? "status-completada" : "status-cancelada");
            badge.textContent = section.is_active ? "Activa" : "Inactiva";
          }
        }
      });
    });

    tbody.querySelectorAll(".portal-order-input").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.key;
        const section = portalSections.find((s) => s.section_key === key);
        if (section) section.sort_order = parseInt(input.value) || 1;
      });
    });

    tbody.querySelectorAll(".portal-move-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        const idx = portalSections.findIndex((s) => s.section_key === key);
        if (idx > 0) {
          const temp = portalSections[idx];
          portalSections[idx] = portalSections[idx - 1];
          portalSections[idx - 1] = temp;
          const tempOrder = portalSections[idx].sort_order;
          portalSections[idx].sort_order = portalSections[idx - 1].sort_order;
          portalSections[idx - 1].sort_order = tempOrder;
          renderPortalSections();
        }
      });
    });

    tbody.querySelectorAll(".portal-move-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        const idx = portalSections.findIndex((s) => s.section_key === key);
        if (idx < portalSections.length - 1) {
          const temp = portalSections[idx];
          portalSections[idx] = portalSections[idx + 1];
          portalSections[idx + 1] = temp;
          const tempOrder = portalSections[idx].sort_order;
          portalSections[idx].sort_order = portalSections[idx + 1].sort_order;
          portalSections[idx + 1].sort_order = tempOrder;
          renderPortalSections();
        }
      });
    });
  }

  document.getElementById("btnSavePortalConfig")?.addEventListener("click", async () => {
    const sections = portalSections.map((s) => ({
      section_key: s.section_key,
      is_active: s.is_active,
      sort_order: s.sort_order,
    }));
    const r = await apiFetch("/api/admin/portal-config", {
      method: "PATCH",
      body: JSON.stringify({ sections }),
    });
    if (!r) return;
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Error al guardar."); return; }
    portalSections = d.sections || [];
    renderPortalSections();
    alert("Configuración del portal guardada.");
  });

  document.getElementById("btnPreviewPortal")?.addEventListener("click", () => {
    window.open("../ciudadano.html", "_blank");
  });

  /* ── Profile Update ── */
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("profileStatus");
      const email = document.getElementById("profileEmail").value.trim();
      const password = document.getElementById("profilePassword").value.trim();
      const currentPassword = document.getElementById("profileCurrentPassword").value;

      if (!currentPassword) { status.className = "login-status error"; status.textContent = "Ingresa tu contraseña actual."; return; }
      if (!email && !password) { status.className = "login-status error"; status.textContent = "Ingresa un correo o contraseña nueva."; return; }

      status.className = "login-status";
      status.textContent = "Guardando...";

      const r = await apiFetch("/api/auth/update-profile", {
        method: "POST",
        body: JSON.stringify({ email, password, current_password: currentPassword }),
      });
      if (!r) return;
      const d = await r.json();
      if (!r.ok) { status.className = "login-status error"; status.textContent = d.error || "Error al guardar."; return; }

      if (d.user) {
        const currentUser = getUser();
        if (currentUser) {
          currentUser.email = d.user.email;
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        }
      }

      status.className = "login-status";
      status.textContent = "Perfil actualizado correctamente.";
      document.getElementById("profilePassword").value = "";
      document.getElementById("profileCurrentPassword").value = "";
    });
  }

  /* ── Notificaciones ── */
  async function loadNotifications() {
    try {
      const r = await apiFetch("/api/admin/notifications");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderNotifications(d.notifications || []);
    } catch {}
  }

  function renderNotifications(notifications) {
    const tbody = document.getElementById("notificationsBody");
    const empty = document.getElementById("notificationsEmpty");
    if (!tbody) return;
    if (notifications.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    const typeColors = { "Aviso": "status-recibida", "Información": "status-validada", "Actualización": "status-completada" };
    tbody.innerHTML = notifications.map((n) => `
      <tr>
        <td><strong>${escapeHtml(n.title)}</strong></td>
        <td><span class="status-badge ${typeColors[n.notif_type] || "status-recibida"}">${escapeHtml(n.notif_type)}</span></td>
        <td style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(n.message)}</td>
        <td><span class="status-badge ${n.is_active ? "active" : "inactive"}">${n.is_active ? "Activa" : "Inactiva"}</span></td>
        <td>${new Date(n.created_at).toLocaleDateString()}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-edit" data-edit-notif="${n.id}">Editar</button>
          <button class="btn-sm btn-delete" data-delete-notif="${n.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  const notifModal = document.getElementById("notifModal");
  const notifForm = document.getElementById("notifForm");

  document.getElementById("btnNewNotification")?.addEventListener("click", () => {
    document.getElementById("notifModalTitle").textContent = "Nueva Notificación";
    notifForm.reset();
    document.getElementById("notifEditId").value = "";
    notifModal.hidden = false;
  });

  document.getElementById("btnCancelNotifModal")?.addEventListener("click", () => { notifModal.hidden = true; notifModal.style.display = ""; });

  document.getElementById("notificationsBody")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-notif]");
    if (editBtn) {
      const id = editBtn.dataset.editNotif;
      const r = await apiFetch("/api/admin/notifications");
      if (!r || !r.ok) return;
      const d = await r.json();
      const n = (d.notifications || []).find((x) => String(x.id) === String(id));
      if (!n) return;
      document.getElementById("notifModalTitle").textContent = "Editar Notificación";
      document.getElementById("notifEditId").value = n.id;
      document.getElementById("notifTitle").value = n.title || "";
      document.getElementById("notifType").value = n.notif_type || "Aviso";
      document.getElementById("notifMessage").value = n.message || "";
      notifModal.hidden = false;
    }
    const deleteBtn = e.target.closest("[data-delete-notif]");
    if (deleteBtn) {
      if (!confirm("Eliminar esta notificación?")) return;
      const r = await apiFetch(`/api/admin/notifications/${deleteBtn.dataset.deleteNotif}`, { method: "DELETE" });
      if (r && r.ok) loadNotifications();
    }
  });

  notifForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("notifEditId").value;
    const title = document.getElementById("notifTitle").value.trim();
    const notif_type = document.getElementById("notifType").value;
    const message = document.getElementById("notifMessage").value.trim();
    if (!title || !message) { alert("Título y mensaje son requeridos."); return; }

    let r;
    if (id) {
      r = await apiFetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, notif_type, message }),
      });
    } else {
      r = await apiFetch("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ title, notif_type, message }),
      });
    }
    if (!r) return;
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Error al guardar."); return; }
    notifModal.hidden = true;
    notifModal.style.display = "";
    loadNotifications();
  });

  /* ── Init ── */
  async function init() {
    const token = getToken();
    if (!token) { window.location.href = "login.html"; return; }
    try {
      const r = await fetch("/api/admin/stats", {
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      });
      if (r.status === 401) { clearAuth(); window.location.href = "login.html"; return; }
      showApp();
    } catch { clearAuth(); window.location.href = "login.html"; }
  }
  init();
})();
