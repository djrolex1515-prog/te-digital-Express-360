(() => {
  const TOKEN_KEY = "td360_admin_token";
  const USER_KEY = "td360_admin_user";

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
      else welcomeEl.textContent = "Bienvenido";
    }

    links.forEach((link) => {
      const restricted = link.dataset.restricted;
      if (restricted && user && user.role !== "superadmin" && user.role !== restricted) {
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
      servicios: loadServices,
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
    if (page === "servicios") loadServices();
    if (page === "solicitudes") loadRequests();
    if (page === "nueva-solicitud") loadNewRequestForm();
    if (page === "citas") loadAppointments();
    if (page === "documentos") loadDocuments();
    if (page === "portal-ciudadano") loadPortalConfig();
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
    document.getElementById("userRole").value = "funcionario";
    document.querySelector('input[name="userStatus"][value="activo"]').checked = true;
    userModal.hidden = false;
  });

  document.getElementById("btnCancelModal")?.addEventListener("click", () => { userModal.hidden = true; userModal.style.display = "none"; });

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
    } catch { alert("Error de conexion."); }
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
      loadUsers();
    } catch { alert("Error de conexion."); }
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

  document.getElementById("citizensBody")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-citizen]");
    if (editBtn) {
      const id = editBtn.dataset.editCitizen;
      const r = await apiFetch("/api/admin/citizens");
      if (!r || !r.ok) return;
      const d = await r.json();
      const c = (d.citizens || []).find((x) => String(x.id) === id);
      if (!c) return;
      const newName = prompt("Nombre completo:", c.full_name);
      if (newName === null) return;
      const newEmail = prompt("Correo:", c.email);
      if (newEmail === null) return;
      const newCedula = prompt("Cedula:", c.cedula || "");
      if (newCedula === null) return;
      const patchR = await apiFetch(`/api/admin/citizens/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ full_name: newName, email: newEmail, cedula: newCedula }),
      });
      if (patchR && patchR.ok) loadCitizens();
    }
    const deleteBtn = e.target.closest("[data-delete-citizen]");
    if (deleteBtn) {
      if (!confirm("Eliminar este ciudadano?")) return;
      const r = await apiFetch(`/api/admin/citizens/${deleteBtn.dataset.deleteCitizen}`, { method: "DELETE" });
      if (r && r.ok) loadCitizens();
    }
  });

  /* ── Servicios ── */
  async function loadServices() {
    try {
      const r = await apiFetch("/api/admin/services");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderServices(d.services || []);
    } catch {}
  }

  function renderServices(services) {
    const tbody = document.getElementById("servicesBody");
    const empty = document.getElementById("servicesEmpty");
    if (!tbody) return;
    if (services.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    tbody.innerHTML = services.map((s) => `
      <tr>
        <td><code>${escapeHtml(s.id)}</code></td>
        <td>${escapeHtml(s.title)}</td>
        <td>${escapeHtml(s.category)}</td>
        <td><span class="status-badge ${s.is_active ? "active" : "inactive"}">${s.is_active ? "Activo" : "Inactivo"}</span></td>
        <td class="actions-cell">
          <button class="btn-sm btn-edit" data-edit-service="${escapeHtml(s.id)}">Editar</button>
          <button class="btn-sm btn-delete" data-delete-service="${escapeHtml(s.id)}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  document.getElementById("btnNewService")?.addEventListener("click", async () => {
    const id = prompt("ID del servicio (ej: cedula_nueva):");
    if (!id) return;
    const title = prompt("Titulo:");
    if (!title) return;
    const category = prompt("Categoria:");
    if (!category) return;
    const summary = prompt("Resumen:") || "";
    const r = await apiFetch("/api/admin/services", {
      method: "POST",
      body: JSON.stringify({ id, title, category, summary }),
    });
    if (r && r.ok) loadServices();
  });

  document.getElementById("servicesBody")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-service]");
    if (editBtn) {
      const sid = editBtn.dataset.editService;
      const r = await apiFetch("/api/admin/services");
      if (!r || !r.ok) return;
      const d = await r.json();
      const s = (d.services || []).find((x) => x.id === sid);
      if (!s) return;
      const newTitle = prompt("Titulo:", s.title);
      if (newTitle === null) return;
      const newCategory = prompt("Categoria:", s.category);
      if (newCategory === null) return;
      const newSummary = prompt("Resumen:", s.summary);
      if (newSummary === null) return;
      const patchR = await apiFetch(`/api/admin/services/${sid}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle, category: newCategory, summary: newSummary }),
      });
      if (patchR && patchR.ok) loadServices();
    }
    const deleteBtn = e.target.closest("[data-delete-service]");
    if (deleteBtn) {
      if (!confirm("Eliminar este servicio?")) return;
      const r = await apiFetch(`/api/admin/services/${deleteBtn.dataset.deleteService}`, { method: "DELETE" });
      if (r && r.ok) loadServices();
    }
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
    const statusLabels = {
      recibida: "Recibida", validada: "Validada", en_impresion: "En Impresion",
      lista_retiro: "Lista para Retiro", requiere_revision: "Requiere Revision",
      en_espera: "En Espera", aprobada: "Aprobada", cerrada: "Cerrada",
    };
    tbody.innerHTML = requests.map((r) => `
      <tr>
        <td><code>${escapeHtml(r.tracking_code)}</code></td>
        <td>${escapeHtml(r.service_title || r.service_id)}</td>
        <td>${escapeHtml(r.request_type || "-")}</td>
        <td>${escapeHtml(r.citizen_name)}</td>
        <td>${escapeHtml(r.citizen_contact)}</td>
        <td><span class="status-badge status-${r.status}">${statusLabels[r.status] || r.status}</span></td>
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
          </select>
        </td>
      </tr>
    `).join("");
  }

  document.getElementById("requestsBody")?.addEventListener("change", async (e) => {
    const select = e.target.closest(".request-status-select");
    if (!select) return;
    const newStatus = select.value;
    if (!newStatus) return;
    const statusLabels = {
      recibida: "Recibida", validada: "Validada", en_impresion: "En Impresion",
      lista_retiro: "Lista para Retiro", requiere_revision: "Requiere Revision",
      en_espera: "En Espera", aprobada: "Aprobada", cerrada: "Cerrada"
    };
    if (!confirm(`Cambiar estado de la solicitud a "${statusLabels[newStatus]}"?`)) { select.value = ""; return; }
    const r = await apiFetch("/api/admin/requests/status", {
      method: "POST",
      body: JSON.stringify({ request_id: select.dataset.statusId, status: newStatus }),
    });
    if (r && r.ok) loadRequests();
  });

  /* ── Citas ── */
  async function loadAppointments() {
    try {
      const r = await apiFetch("/api/admin/appointments");
      if (!r || !r.ok) return;
      const d = await r.json();
      renderAppointments(d.appointments || []);
    } catch {}
  }

  function renderAppointments(appointments) {
    const tbody = document.getElementById("appointmentsBody");
    const empty = document.getElementById("appointmentsEmpty");
    if (!tbody) return;
    if (appointments.length === 0) { empty.hidden = false; tbody.innerHTML = ""; return; }
    empty.hidden = true;
    const statusLabels = { pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada", completada: "Completada" };
    tbody.innerHTML = appointments.map((a) => `
      <tr>
        <td>${escapeHtml(a.citizen_name || "-")}</td>
        <td>${escapeHtml(a.service_type)}</td>
        <td>${escapeHtml(a.office)}</td>
        <td>${escapeHtml(a.appointment_date)}</td>
        <td>${escapeHtml(a.appointment_time)}</td>
        <td><span class="status-badge status-${a.status}">${statusLabels[a.status] || a.status}</span></td>
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
      const labels = { confirmada: "Confirmada", completada: "Completada", cancelada: "Cancelada" };
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
      if (!confirm("Estas seguro de eliminar esta cita? Esta accion no se puede deshacer.")) return;
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
    alert("Solicitud creada. Codigo: " + d.tracking_code);
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
  });

  document.getElementById("btnCancelAppt")?.addEventListener("click", () => {
    const form = document.getElementById("newAppointmentForm");
    if (form) { form.hidden = true; document.getElementById("appointmentForm")?.reset(); }
  });

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
    alert("Configuracion del portal guardada.");
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

      if (!currentPassword) { status.className = "login-status error"; status.textContent = "Ingresa tu contrasena actual."; return; }
      if (!email && !password) { status.className = "login-status error"; status.textContent = "Ingresa un correo o contrasena nueva."; return; }

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
