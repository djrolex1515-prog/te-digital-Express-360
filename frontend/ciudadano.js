(() => {
  /* ── DOM ── */
  const sidebar = document.getElementById("portalSidebar");
  const toggle = document.getElementById("sidebarToggle");
  const links = document.querySelectorAll(".sidebar-link");
  const sections = document.querySelectorAll(".portal-section");

  if (!localStorage.getItem("td360_citizen_token")) {
    window.location.href = "principal.html";
    return;
  }

  document.getElementById("bodyRoot").style.display = "";

  /* ── State ── */
  let allServices = [];
  let serviceData = null;
  let citizenData = null;
  let toastTimer = null;

  function showToast(message) {
    let toast = document.querySelector(".td360-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "td360-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  /* ── Sidebar ── */
  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
    toggle.classList.toggle("is-active");
  });

  /* Cerrar sidebar al hacer click en un link */
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar-link")) {
      sidebar.classList.remove("is-open");
      toggle.classList.remove("is-active");
    }
  });

  /* Cerrar sidebar al hacer click fuera */
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("is-open") &&
        !sidebar.contains(e.target) &&
        !toggle.contains(e.target)) {
      sidebar.classList.remove("is-open");
      toggle.classList.remove("is-active");
    }
  });

  /* ── Portal Config: ocultar/mostrar secciones según admin ── */
  async function loadPortalVisibility() {
    try {
      const r = await fetch("/api/portal-config");
      if (!r.ok) return;
      const d = await r.json();
      const sections = d.sections || [];
      const activeKeys = sections.filter((s) => s.is_active).map((s) => s.section_key);
      const orderedKeys = sections.sort((a, b) => a.sort_order - b.sort_order).map((s) => s.section_key);

      links.forEach((link) => {
        const key = link.dataset.section;
        if (key && !activeKeys.includes(key)) {
          link.style.display = "none";
        } else {
          link.style.display = "";
        }
      });

      document.querySelectorAll(".portal-section").forEach((sec) => {
        const id = sec.id.replace("section-", "");
        if (id && !activeKeys.includes(id)) {
          sec.style.display = "none";
        } else {
          sec.style.display = "";
        }
      });

      const sidebarNav = sidebar.querySelector(".sidebar-nav") || sidebar;
      const linkArr = Array.from(links);
      orderedKeys.forEach((key) => {
        const link = linkArr.find((l) => l.dataset.section === key);
        if (link) sidebarNav.appendChild(link);
      });

      const visibleLinks = Array.from(links).filter((l) => l.style.display !== "none");
      if (visibleLinks.length && !visibleLinks.some((l) => l.classList.contains("is-active"))) {
        switchSection(visibleLinks[0].dataset.section);
      }
    } catch {}
  }
  loadPortalVisibility();

  /* ── Navegación ── */
  window.switchSection = function (sectionId) {
    links.forEach((l) => l.classList.toggle("is-active", l.dataset.section === sectionId));
    sections.forEach((s) => s.classList.toggle("is-visible", s.id === "section-" + sectionId));
    sidebar.classList.remove("is-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (sectionId === "solicitar") goToStep(1);
    if (sectionId === "mis-tramites") loadMyRequests();
    if (sectionId === "citas") loadAppointments();
    if (sectionId === "mi-perfil") loadProfile();
  };

  links.forEach((link) => link.addEventListener("click", () => switchSection(link.dataset.section)));

  function preselectService(subtype) {
    serviceData = allServices.find((s) => s.id === "cedula") || { id: "cedula", title: "Cédula", summary: "", requirements: [], steps: [], details: [] };
    if (subtype === "reportar_perdida") {
      serviceData = { ...REPORTAR_PERDIDA_DATA, _subtype: "reportar_perdida" };
    } else {
      serviceData._subtype = subtype;
    }
    renderServiceInfo(serviceData);
    const prev = document.getElementById("subtypeLabel");
    if (prev) prev.remove();
    const lbl = document.createElement("p");
    lbl.id = "subtypeLabel";
    lbl.style.cssText = "color:var(--teal);font-weight:700;font-size:15px;margin:0 0 12px;";
    lbl.textContent = "Trámite: " + (SERVICES_MAP.find((s) => s.subtype === subtype)?.title || subtype);
    document.getElementById("serviceInfo")?.prepend(lbl);
    goToStep(2);
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-section]");
    if (trigger) {
      e.preventDefault();
      const sectionId = trigger.dataset.section;
      const sectionEl = document.getElementById("section-" + sectionId);
      if (sectionEl && sectionEl.style.display === "none") {
        showToast("Esta opción no está disponible en estos momentos.");
        return;
      }
      const subtype = trigger.getAttribute("data-subtype") || "";
      switchSection(sectionId);
      if (sectionId === "solicitar" && subtype) preselectService(subtype);
    }
  });

  function navigateToHash() {
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById("section-" + hash)) switchSection(hash);
  }
  navigateToHash();
  window.addEventListener("hashchange", navigateToHash);

  /* ── Constantes ── */
  const TRAMITE_MONTO_MAP = {
    cedula_renovacion: { label: "Renovación de cédula", monto: "B/. 25.00" },
    cedula_duplicado: { label: "Duplicado de cédula", monto: "B/. 35.00" },
    cedula_primera_vez: { label: "Primera vez", monto: "B/. 20.00" },
    cedula_reportar_perdida: { label: "Reportar pérdida o robo", monto: "B/. 10.00" },
  };

  const SERVICES_MAP = [
    { id: "cedula", subtype: "renovacion", icon: "🪪", title: "Renovar cédula", desc: "Solicita la renovación de tu cédula de identidad por vencimiento." },
    { id: "cedula", subtype: "duplicado", icon: "🆔", title: "Duplicado de cédula", desc: "Solicita un duplicado por pérdida, robo o extravío." },
    { id: "cedula", subtype: "reemplazo", icon: "🔁", title: "Reemplazo por deterioro", desc: "Solicita el reemplazo de tu cédula por daño o desgaste." },
    { id: "cedula", subtype: "primera_vez", icon: "✨", title: "Primera vez", desc: "Obtén tu cédula de identidad por primera vez." },
    { id: "cedula", subtype: "reportar_perdida", icon: "⚠️", title: "Reportar pérdida o robo", desc: "Reporta la pérdida o robo de tu cédula de identidad." },
  ];

  const PORTAL_LINKS = [
    { icon: "📄", title: "Pedir certificado", desc: "Certificados de nacimiento, matrimonio, defunción y más.", href: "#certificados" },
    { icon: "📍", title: "Agendar cita", desc: "Ubica oficinas, horarios y reserva un turno de atención.", href: "#citas" },
    { icon: "🗳️", title: "Centro de votación", desc: "Consulta tu centro de votación y residencia electoral.", href: "#servicios-electorales" },
    { icon: "📂", title: "Mis trámites", desc: "Consulta el estado y seguimiento de tus solicitudes.", href: "#mis-tramites" },
  ];

  const REPORTAR_PERDIDA_DATA = {
    id: "cedula", title: "Reportar pérdida o robo",
    summary: "La cédula es un documento físico que solo se entrega en oficinas del Tribunal Electoral. Este trámite requiere que acudas personalmente a una oficina.",
    requirements: [
      "Denuncia policial o declaración jurada ante el Tribunal Electoral.",
      "Cédula anterior (si aún la conservas) o datos personales completos.",
      "Captura de foto, firma y biometría en la oficina.",
    ],
    steps: [
      "Realiza la denuncia policial por pérdida o robo.",
      "Acude a la oficina del Tribunal Electoral más cercana con la denuncia.",
      "Allí inhabilitarán tu cédula anterior y tramitarán el duplicado.",
      "Te indicarán la fecha de entrega del nuevo documento.",
    ],
    details: [{
      title: "Oficinas disponibles",
      items: [
        { place: "Oficina Central", address: "Vía España, Ciudad de Panamá" },
        { place: "Dirección Regional de Panamá Oeste", address: "La Chorrera" },
        { place: "Dirección Regional de Colón", address: "Calle 12, Colón" },
        { place: "Dirección Regional de Chiriquí", address: "David, Chiriquí" },
      ],
    }],
  };

  /* ── Utilidades ── */
  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function getToken() {
    return localStorage.getItem("td360_citizen_token") || "";
  }

  function loadCitizenData() {
    try { return JSON.parse(localStorage.getItem("td360_citizen_user")) || null; }
    catch { return null; }
  }

  /* ── UI toggles ── */
  function showCitaPanel(panelId) {
    ["citaListPanel", "citaFormPanel", "citaReprogramarPanel", "citaCancelarPanel"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = id !== panelId;
    });
  }

  function closeConfirmModal() {
    document.getElementById("citaConfirmModal")?.classList.remove("is-visible");
    document.getElementById("citaConfirmTitle").textContent = "Cita agendada";
  }

  /* ── Wizard: pasos ── */
  function goToStep(num) {
    document.querySelectorAll("#section-solicitar .step-panel").forEach((p) => p.classList.remove("is-visible"));
    const panel = document.getElementById("step" + num);
    if (panel) panel.classList.add("is-visible");
    document.querySelectorAll("#section-solicitar .step-tab").forEach((t) => {
      const s = parseInt(t.dataset.step, 10);
      t.classList.toggle("is-active", s === num);
      t.classList.toggle("is-done", s < num);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Wizard: grilla de servicios ── */
  function renderServiceGrid() {
    const grid = document.getElementById("serviceGrid");
    if (!grid) return;
    const cedulaCards = SERVICES_MAP.map((s) =>
      `<button type="button" class="wizard-service-card" data-service="${s.id}" data-subtype="${s.subtype}">
        <div class="card-icon">${s.icon}</div>
        <h4>${escapeHtml(s.title)}</h4>
        <p>${escapeHtml(s.desc)}</p>
      </button>`
    ).join("");
    const portalCards = PORTAL_LINKS.map((s) =>
      `<button type="button" class="wizard-service-card" data-section="${s.href.replace('#', '')}" style="text-decoration:none;text-align:left;width:100%;">
        <div class="card-icon">${s.icon}</div>
        <h4>${escapeHtml(s.title)}</h4>
        <p>${escapeHtml(s.desc)}</p>
      </button>`
    ).join("");
    grid.innerHTML = `
      <div style="grid-column:1/-1"><h4 style="margin:0 0 4px;color:var(--teal)">📋 Trámites de cédula</h4>
      <p style="margin:0 0 12px;color:var(--muted);font-size:13px;">Selecciona el tipo de trámite que deseas realizar.</p></div>
      ${cedulaCards}
      <div style="grid-column:1/-1;border-top:1px solid var(--line);margin-top:12px;padding-top:16px;">
      <h4 style="margin:0 0 4px;color:var(--muted)">🔗 Otros servicios</h4>
      <p style="margin:0 0 12px;color:var(--muted);font-size:13px;">Estos trámites se realizan desde el Portal Ciudadano.</p></div>
      ${portalCards}`;
  }

  /* ── Wizard: info del servicio ── */
  function renderServiceInfo(service) {
    const el = document.getElementById("serviceInfo");
    if (!el) return;
    const reqs = service.requirements || [];
    const steps = service.steps || [];
    let html = `<h3>${escapeHtml(service.title)}</h3>
      <p style="color:var(--muted);font-size:14px;margin:0 0 16px;">${escapeHtml(service.summary)}</p>`;
    if (reqs.length) {
      html += `<div class="detail-section"><h4>📋 Requisitos necesarios</h4><ul>
        ${reqs.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`;
    }
    if (steps.length) {
      html += `<div class="detail-section"><h4>📌 Pasos a seguir</h4><ul>
        ${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>`;
    }
    el.innerHTML = html;
  }

  /* ── Wizard: cargar datos del ciudadano ── */
  function fillCitizenData() {
    const nameInput = document.getElementById("wizName");
    const emailInput = document.getElementById("wizEmail");
    const token = getToken();
    if (!token) return;
    fetch("/api/citizens/me", { headers: { Authorization: "Bearer " + token } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { citizenData = d; if (nameInput) nameInput.value = d.full_name || ""; if (emailInput) emailInput.value = d.email || ""; })
      .catch(() => {});
  }

  /* ── Wizard: construir resumen de confirmación ── */
  function buildConfirmDetails() {
    const el = document.getElementById("confirmDetails");
    if (!el || !serviceData) return;
    const name = document.getElementById("wizName").value.trim();
    const email = document.getElementById("wizEmail").value.trim();
    const phone = document.getElementById("wizPhone").value.trim();
    const label = SERVICES_MAP.find((s) => s.subtype === serviceData._subtype)?.title || "Solicitud de cédula";
    const row = (l, v) => `<div style="display:grid;grid-template-columns:140px 1fr;gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px;">
      <strong style="color:var(--muted)">${l}:</strong><span>${escapeHtml(v)}</span></div>`;
    el.innerHTML = row("Trámite", label) + row("Nombre", name) + row("Contacto", email) + (phone ? row("Teléfono", phone) : "");
  }

  /* ══════════════════════════════════════════
     API: Carga de datos
     ══════════════════════════════════════════ */

  async function loadServices() {
    try { const r = await fetch("/api/services"); const d = await r.json(); allServices = d.services || []; }
    catch { allServices = []; }
  }

  async function loadProfile() {
    const token = getToken();
    if (!token) return;
    try {
      const r = await fetch("/api/citizens/me", { headers: { Authorization: "Bearer " + token } });
      if (!r.ok) return;
      const d = await r.json();
      citizenData = d;
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "\u2014"; };
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
      const initials = (d.full_name || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      set("profileAvatarText", initials);
      set("profileFullName", d.full_name);
      set("profileEmail", d.email);
      set("profileCedula", d.cedula);
      set("profileNameInfo", d.full_name);
      set("profileEmailInfo", d.email);
      setVal("profileName", d.full_name);
      setVal("profileCedulaInput", d.cedula);
      setVal("profileEmailInput", d.email);
      set("idCedula", d.cedula);
      set("idName", d.full_name);
      set("idEmail", d.email);
      if (d.photo) {
        const photoEl = document.getElementById("idPhoto");
        if (photoEl) photoEl.innerHTML = `<img src="${d.photo}" style="width:100%;height:100%;object-fit:cover;">`;
      }
      if (d.created_at) {
        const dt = new Date(d.created_at);
        set("profileMemberSince", dt.toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" }));
        set("idIssued", dt.toLocaleDateString("es-PA"));
        const expiry = new Date(dt.getFullYear() + 10, dt.getMonth(), dt.getDate());
        set("idExpiry", expiry.toLocaleDateString("es-PA"));
      }
    } catch {}
  }

  async function loadMyRequests() {
    const list = document.getElementById("tramiteListContainer");
    if (!list) return;
    list.innerHTML = "";
    try {
      const r = await fetch("/api/my-requests", { headers: { Authorization: "Bearer " + getToken() } });
      const d = await r.json();
      const reqs = d.requests || [];
      if (!reqs.length) {
        list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px 0;">No tienes solicitudes registradas.</p>';
        return;
      }
      reqs.forEach((r) => {
        const cls = (r.status === "lista_retiro" || r.status === "cerrada") ? "success" : r.status === "requiere_revision" ? "red" : r.status === "cancelada" ? "red" : "pending";
        const pct = r.progress || 0;
        const canCancel = r.status === "recibida" || r.status === "requiere_revision";
        const card = document.createElement("div");
        card.style.cssText = "border:1px solid var(--line);border-radius:8px;background:var(--white);padding:18px;margin-bottom:12px;";
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div>
              <strong style="font-size:15px;">${escapeHtml(r.service_title || r.service_id)}</strong>
              ${r.request_type ? `<div style="font-size:13px;color:var(--teal);font-weight:600;margin-top:2px;">${escapeHtml(r.request_type)}</div>` : ""}
              <div style="font-size:13px;color:var(--muted);margin-top:2px;">Código: <span style="font-family:monospace;font-weight:700;color:var(--teal);">${escapeHtml(r.tracking_code)}</span></div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="status-badge ${cls}">${escapeHtml(r.statusLabel || r.status)}</span>
              ${canCancel ? `<button class="btn-sm btn-delete" data-cancel-request="${r.id}" style="font-size:12px;padding:4px 10px;">Cancelar</button>` : ""}
            </div>
          </div>
          <div style="background:var(--soft);border-radius:6px;height:6px;margin-bottom:10px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:var(--teal);border-radius:6px;transition:width 0.3s;"></div>
          </div>
          <div style="display:flex;gap:16px;font-size:12px;color:var(--muted);flex-wrap:wrap;">
            <span>Creada: ${escapeHtml(r.created_at || "—")}</span>
            ${r.nextStep ? `<span>Siguiente: ${escapeHtml(r.nextStep)}</span>` : ""}
          </div>`;
        list.appendChild(card);
      });
    } catch { list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:16px;">Error al cargar solicitudes.</p>'; }
  }

  async function loadAppointments() {
    const list = document.getElementById("citaList");
    const empty = document.getElementById("citaListEmpty");
    if (!list) return;
    try {
      const r = await fetch("/api/appointments", { headers: { Authorization: "Bearer " + getToken() } });
      const d = await r.json();
      const upcoming = (d.appointments || []).filter((a) => a.status !== "cancelada");
      document.querySelectorAll(".appointment-item").forEach((e) => e.remove());
      if (empty) empty.hidden = upcoming.length > 0;
      upcoming.forEach((a) => {
        const el = document.createElement("article");
        el.className = "appointment-item";
        const dt = new Date(a.appointment_date + "T12:00:00");
        const sm = { pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada" };
        const sc = a.status === "cancelada" ? "red" : a.status === "confirmada" ? "success" : "pending";
        el.innerHTML = `
          <div class="appt-date"><strong>${dt.getDate()}</strong><small>${dt.toLocaleDateString("es", { month: "short" })}</small></div>
          <div class="appt-info"><strong>${escapeHtml(a.service_type)}</strong><small>${escapeHtml(a.office)}, ${escapeHtml(a.appointment_time)}</small></div>
          <span class="status-badge ${sc}">${sm[a.status] || a.status}</span>`;
        list.appendChild(el);
      });
    } catch {}
  }

  async function loadDocuments() {
    const list = document.getElementById("documentosList");
    const empty = document.getElementById("docsEmpty");
    if (!list) return;
    try {
      const r = await fetch("/api/documents", { headers: { Authorization: "Bearer " + getToken() } });
      const d = await r.json();
      const docs = d.documents || [];
      document.querySelectorAll(".doc-row").forEach((e) => e.remove());
      if (empty) empty.hidden = docs.length > 0;
      const tm = { comprobante: "🧾 Comprobante", recibo: "📋 Recibo de solicitud" };
      docs.forEach((doc) => {
        const row = document.createElement("div");
        row.className = "doc-row";
        row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--line);border-radius:8px;";
        row.innerHTML = `<div><strong>${tm[doc.doc_type] || doc.doc_type}</strong><br><small style="color:var(--muted)">${escapeHtml(doc.filename)} · ${escapeHtml(doc.created_at)}</small></div>
          <button class="secondary-action" type="button" data-doc-download="${doc.id}">Descargar</button>`;
        list.appendChild(row);
      });
    } catch {}
  }

  /* ══════════════════════════════════════════
     EVENT LISTENERS
     ══════════════════════════════════════════ */

  /* ── Wizard: clic en tarjeta de servicio ── */
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-service]");
    if (card) {
      e.preventDefault();
      const id = card.getAttribute("data-service");
      const subtype = card.getAttribute("data-subtype") || "";
      serviceData = allServices.find((s) => s.id === id) || { id, title: id, summary: "", requirements: [], steps: [], details: [] };
      if (subtype === "reportar_perdida") serviceData = { ...REPORTAR_PERDIDA_DATA };
      serviceData._subtype = subtype;
      renderServiceInfo(serviceData);
      const prev = document.getElementById("subtypeLabel");
      if (prev) prev.remove();
      const lbl = document.createElement("p");
      lbl.id = "subtypeLabel";
      lbl.style.cssText = "color:var(--teal);font-weight:700;font-size:15px;margin:0 0 12px;";
      lbl.textContent = "Trámite: " + (SERVICES_MAP.find((s) => s.subtype === subtype)?.title || subtype);
      document.getElementById("serviceInfo")?.prepend(lbl);
      goToStep(2);
      return;
    }

    const gotoBtn = e.target.closest("[data-goto]");
    if (gotoBtn) {
      const step = parseInt(gotoBtn.getAttribute("data-goto"), 10);
      if (step === 3) { fillCitizenData(); goToStep(3); return; }
      if (step === 4) {
        const name = document.getElementById("wizName").value.trim();
        const email = document.getElementById("wizEmail").value.trim();
        if (!name || !email) { alert("Completa nombre y correo."); return; }
        buildConfirmDetails();
      }
      goToStep(step);
      return;
    }
  });

  /* ── Wizard: enviar solicitud (step 4 → 5) ── */
  document.getElementById("wizSubmit")?.addEventListener("click", async () => {
    const name = document.getElementById("wizName").value.trim();
    const email = document.getElementById("wizEmail").value.trim();
    const btn = document.getElementById("wizSubmit");
    if (!name || !email || !serviceData) return;
    btn.disabled = true;
    btn.textContent = "Enviando...";
    try {
      const tramiteLabel = SERVICES_MAP.find((s) => s.subtype === serviceData._subtype)?.title || "Solicitud de cédula";
      const r = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify({ service_id: "cedula", citizen_name: name, citizen_contact: email, request_type: tramiteLabel, notes: "Trámite: " + tramiteLabel }),
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Error al crear solicitud."); btn.disabled = false; btn.textContent = "Enviar solicitud"; return; }
      const subtype = serviceData?._subtype || "";
      const monto = TRAMITE_MONTO_MAP["cedula_" + subtype]?.monto || "B/. 25.00";
      document.getElementById("trackingCode").textContent = d.tracking_code || "—";
      const mc = document.getElementById("successMontoStep5");
      const mv = document.getElementById("montoValueStep5");
      if (mc && mv) { mc.hidden = false; mv.textContent = monto; }
      goToStep(5);
    } catch { alert("Error de conexión."); }
    btn.disabled = false;
    btn.textContent = "Enviar solicitud";
  });

  /* ── Cancelar solicitud ── */
  document.addEventListener("click", async (e) => {
    const cancelBtn = e.target.closest("[data-cancel-request]");
    if (!cancelBtn) return;
    const requestId = cancelBtn.dataset.cancelRequest;
    if (!confirm("¿Estás seguro de cancelar esta solicitud?")) return;
    cancelBtn.disabled = true;
    cancelBtn.textContent = "Cancelando...";
    try {
      const r = await fetch("/api/requests/" + requestId + "/cancel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Error al cancelar."); cancelBtn.disabled = false; cancelBtn.textContent = "Cancelar"; return; }
      loadMyRequests();
    } catch { alert("Error de conexión."); cancelBtn.disabled = false; cancelBtn.textContent = "Cancelar"; }
  });

  /* ── Citas: agendar ── */
  document.getElementById("btnAgendarCita")?.addEventListener("click", () => {
    document.getElementById("citaFormTitle").textContent = "Agendar nueva cita";
    document.getElementById("btnGuardarCita").textContent = "Agendar cita";
    document.getElementById("citaEditId").value = "";
    document.getElementById("citaForm").reset();
    document.getElementById("citaTime").innerHTML = '<option value="">Selecciona oficina y fecha</option>';
    document.getElementById("citaSlotInfo").textContent = "";
    showCitaPanel("citaFormPanel");
  });

  async function loadCitaSlots() {
    const office = document.getElementById("citaOffice").value;
    const date = document.getElementById("citaDate").value;
    const timeSelect = document.getElementById("citaTime");
    const info = document.getElementById("citaSlotInfo");
    if (!office || !date) { timeSelect.innerHTML = '<option value="">Selecciona oficina y fecha</option>'; info.textContent = ""; return; }
    try {
      const r = await fetch(`/api/appointments/slots?office=${encodeURIComponent(office)}&date=${encodeURIComponent(date)}`);
      if (!r.ok) return;
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

  document.getElementById("citaOffice")?.addEventListener("change", loadCitaSlots);
  document.getElementById("citaDate")?.addEventListener("change", loadCitaSlots);

  document.getElementById("btnCerrarFormCita")?.addEventListener("click", () => showCitaPanel("citaListPanel"));
  document.getElementById("btnCancelarFormCita")?.addEventListener("click", () => showCitaPanel("citaListPanel"));
  document.getElementById("btnCerrarConfirmacion")?.addEventListener("click", closeConfirmModal);
  document.getElementById("citaConfirmModal")?.addEventListener("click", (e) => { if (e.target.id === "citaConfirmModal") closeConfirmModal(); });

  document.getElementById("citaForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      service_type: document.getElementById("citaServiceType").value,
      office: document.getElementById("citaOffice").value,
      appointment_date: document.getElementById("citaDate").value,
      appointment_time: document.getElementById("citaTime").value,
      contact_phone: document.getElementById("citaPhone").value,
      notes: document.getElementById("citaNotes").value,
    };
    if (!payload.service_type || !payload.office || !payload.appointment_date || !payload.appointment_time) { showToast("Completa todos los campos requeridos."); return; }
    try {
      const r = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json(); showToast(e.error || "Error al agendar."); return; }
      const a = await r.json();
      document.getElementById("citaConfirmBody").innerHTML = `<p>Tu cita ha sido agendada exitosamente.</p>
        <div class="modal-detail">${escapeHtml(a.service_type)}</div><p>${escapeHtml(a.office)}</p>
        <p>${escapeHtml(a.appointment_date)} — ${escapeHtml(a.appointment_time)}</p>
        <p style="margin-top:8px;font-size:13px;color:var(--muted);">Estado: <strong>${escapeHtml(a.status)}</strong></p>`;
      document.getElementById("citaConfirmModal").classList.add("is-visible");
      showCitaPanel("citaListPanel");
      loadAppointments();
    } catch { showToast("Error de conexión."); }
  });

  /* ── Citas: reprogramar ── */
  let repSelectedOffice = "";
  document.getElementById("btnReprogramarCita")?.addEventListener("click", async () => {
    showCitaPanel("citaReprogramarPanel");
    document.getElementById("repTime").innerHTML = '<option value="">Selecciona fecha</option>';
    document.getElementById("repSlotInfo").textContent = "";
    repSelectedOffice = "";
    const sel = document.getElementById("repSelect");
    sel.innerHTML = '<option value="">Selecciona una cita</option>';
    try {
      const r = await fetch("/api/appointments", { headers: { Authorization: "Bearer " + getToken() } });
      const d = await r.json();
      (d.appointments || []).filter((a) => a.status !== "cancelada").forEach((a) => {
        const o = document.createElement("option"); o.value = a.id;
        o.textContent = `${a.service_type} — ${a.appointment_date} ${a.appointment_time} (${a.office})`;
        o.dataset.office = a.office;
        sel.appendChild(o);
      });
    } catch {}
  });

  document.getElementById("repSelect")?.addEventListener("change", (e) => {
    const opt = e.target.selectedOptions[0];
    repSelectedOffice = opt?.dataset?.office || "";
    document.getElementById("repTime").innerHTML = '<option value="">Selecciona fecha</option>';
    document.getElementById("repSlotInfo").textContent = "";
  });

  async function loadRepSlots() {
    const date = document.getElementById("repDate").value;
    const timeSelect = document.getElementById("repTime");
    const info = document.getElementById("repSlotInfo");
    if (!repSelectedOffice || !date) { timeSelect.innerHTML = '<option value="">Selecciona fecha</option>'; info.textContent = ""; return; }
    try {
      const r = await fetch(`/api/appointments/slots?office=${encodeURIComponent(repSelectedOffice)}&date=${encodeURIComponent(date)}`);
      if (!r.ok) return;
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

  document.getElementById("repDate")?.addEventListener("change", loadRepSlots);

  document.getElementById("btnCerrarReprogramar")?.addEventListener("click", () => showCitaPanel("citaListPanel"));
  document.getElementById("btnCancelarReprogramar")?.addEventListener("click", () => showCitaPanel("citaListPanel"));

  document.getElementById("repForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("repSelect").value;
    const date = document.getElementById("repDate").value;
    const time = document.getElementById("repTime").value;
    if (!id || !date || !time) { showToast("Selecciona una cita, nueva fecha y horario."); return; }
    try {
      const r = await fetch("/api/appointments/" + id, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() }, body: JSON.stringify({ action: "reschedule", appointment_date: date, appointment_time: time }) });
      if (!r.ok) { const e = await r.json(); showToast(e.error || "Error al reprogramar."); return; }
      const rep = await r.json();
      document.getElementById("citaConfirmBody").innerHTML = `<p>Cita reprogramada exitosamente.</p>
        <div class="modal-detail">${escapeHtml(rep.service_type)}</div><p>${escapeHtml(rep.office)}</p>
        <p>${escapeHtml(rep.appointment_date)} — ${escapeHtml(rep.appointment_time)}</p>
        <p style="margin-top:8px;font-size:13px;color:var(--muted);">Estado: <strong>${escapeHtml(rep.status)}</strong></p>`;
      document.getElementById("citaConfirmModal").classList.add("is-visible");
      showCitaPanel("citaListPanel");
      loadAppointments();
    } catch { showToast("Error de conexión."); }
  });

  /* ── Citas: cancelar ── */
  document.getElementById("btnCancelarCita")?.addEventListener("click", async () => {
    showCitaPanel("citaCancelarPanel");
    const sel = document.getElementById("cancelSelect");
    sel.innerHTML = '<option value="">Selecciona una cita</option>';
    try {
      const r = await fetch("/api/appointments", { headers: { Authorization: "Bearer " + getToken() } });
      const d = await r.json();
      (d.appointments || []).filter((a) => a.status !== "cancelada").forEach((a) => {
        const o = document.createElement("option"); o.value = a.id;
        o.textContent = `${a.service_type} — ${a.appointment_date} ${a.appointment_time} (${a.office})`;
        sel.appendChild(o);
      });
    } catch {}
  });

  document.getElementById("btnCerrarCancelar")?.addEventListener("click", () => showCitaPanel("citaListPanel"));
  document.getElementById("btnCancelarCancelar")?.addEventListener("click", () => showCitaPanel("citaListPanel"));

  document.getElementById("cancelForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("cancelSelect").value;
    if (!id) { showToast("Selecciona una cita."); return; }
    try {
      const r = await fetch("/api/appointments/" + id, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() }, body: JSON.stringify({ action: "cancel" }) });
      if (!r.ok) { const e = await r.json(); showToast(e.error || "Error al cancelar."); return; }
      const c = await r.json();
      document.getElementById("citaConfirmBody").innerHTML = `<p>Cita cancelada.</p>
        <div class="modal-detail">${escapeHtml(c.service_type)}</div><p>${escapeHtml(c.office)} — ${escapeHtml(c.appointment_date)} ${escapeHtml(c.appointment_time)}</p>
        <p style="margin-top:8px;font-size:13px;color:var(--muted);">Estado: <strong>cancelada</strong></p>`;
      document.getElementById("citaConfirmModal").classList.add("is-visible");
      showCitaPanel("citaListPanel");
      loadAppointments();
    } catch { showToast("Error de conexión."); }
  });

  /* ── Mi Perfil ── */
  document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("profileEmailInput").value.trim();
    if (!email) { showToast("El correo es obligatorio."); return; }
    const btn = document.getElementById("btnSaveProfile");
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      const r = await fetch("/api/citizens/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) { const d = await r.json(); showToast(d.error || "Error al guardar."); return; }
      const status = document.getElementById("profileSaveStatus");
      status.hidden = false;
      setTimeout(() => { status.hidden = true; }, 3000);
      showToast("Perfil actualizado.");
      loadProfile();
    } catch { showToast("Error de conexión."); }
    btn.disabled = false;
    btn.textContent = "Guardar cambios";
  });

  document.getElementById("btnChangePassword")?.addEventListener("click", () => {
    const form = document.getElementById("passwordForm");
    form.hidden = !form.hidden;
  });

  document.getElementById("btnCancelPassword")?.addEventListener("click", () => {
    document.getElementById("passwordForm").hidden = true;
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  });

  document.getElementById("btnSavePassword")?.addEventListener("click", async () => {
    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    if (!current || !newPass) { showToast("Completa todos los campos."); return; }
    if (newPass !== confirm) { showToast("Las contraseñas no coinciden."); return; }
    if (newPass.length < 8) { showToast("La contraseña debe tener al menos 8 caracteres."); return; }
    try {
      const r = await fetch("/api/citizens/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify({ current_password: current, new_password: newPass }),
      });
      if (!r.ok) { const d = await r.json(); showToast(d.error || "Error al cambiar contraseña."); return; }
      showToast("Contraseña actualizada.");
      document.getElementById("passwordForm").hidden = true;
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    } catch { showToast("Error de conexión."); }
  });

  /* ── Certificados: Pedir ── */
  const CERT_LABELS = {
    certificado_nacimiento: "Certificado de nacimiento",
    certificado_matrimonio: "Certificado de matrimonio",
    certificado_defuncion: "Certificado de defunción",
    certificado: "Certificación del Registro Civil",
  };

  async function solicitarCertificado(tipo) {
    if (!getToken()) { showToast("Inicia sesión para continuar."); return; }
    const btn = document.querySelector(`.cert-pedir-btn[data-tipo="${tipo}"]`);
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "Enviando...";
    try {
      const r = await fetch("/api/certificados/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify({ tipo }),
      });
      if (!r.ok) {
        const d = await r.json();
        showToast(d.error || "Error al solicitar certificado.");
        btn.disabled = false;
        btn.textContent = "Pedir";
        return;
      }
      btn.textContent = "En espera";
      btn.classList.add("cert-pendiente");
      showToast(CERT_LABELS[tipo] + ": solicitud enviada. En espera de aprobación.");
    } catch {
      showToast("Error de conexión.");
      btn.disabled = false;
      btn.textContent = "Pedir";
    }
  }

  function bindCertificadosButtons() {
    document.querySelectorAll(".cert-pedir-btn").forEach((btn) => {
      btn.addEventListener("click", () => solicitarCertificado(btn.dataset.tipo));
    });
  }

  /* ── Noticias y avisos (dynamic from API) ── */
  function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "Hace un momento";
    if (diff < 3600) return "Hace " + Math.floor(diff / 60) + " min";
    if (diff < 86400) return "Hace " + Math.floor(diff / 3600) + " h";
    if (diff < 604800) return "Hace " + Math.floor(diff / 86400) + " días";
    return "Hace " + Math.floor(diff / 604800) + " semana" + (Math.floor(diff / 604800) > 1 ? "s" : "");
  }

  async function loadPortalNotifications() {
    const newsList = document.querySelector("#section-inicio .news-list");
    if (!newsList) return;
    try {
      const r = await fetch("/api/notifications");
      if (!r.ok) return;
      const d = await r.json();
      const notifs = d.notifications || [];
      if (notifs.length === 0) return;
      const tagClass = { "Aviso": "", "Información": " info", "Actualización": " success" };
      newsList.innerHTML = notifs.map((n) => `
        <article class="news-item">
          <span class="news-tag${tagClass[n.notif_type] || ""}">${escapeHtml(n.notif_type)}</span>
          <p>${escapeHtml(n.message)}</p>
          <small>${timeAgo(n.created_at)}</small>
        </article>
      `).join("");
    } catch {}
  }

  /* ══════════════════════════════════════════
     INICIALIZACION
     ══════════════════════════════════════════ */

  renderServiceGrid();
  loadServices();
  loadProfile();
  loadPortalNotifications();

  bindCertificadosButtons();

  /* ── Preseleccion desde URL ── */
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get("service");
  const preselectSubtype = params.get("subtype") || "";
  if (preselect === "cedula" && preselectSubtype) {
    preselectService(preselectSubtype);
    switchSection("solicitar");
    history.replaceState(null, "", window.location.pathname);
  }

  /* ── Auto-refresh: polling cada 10s ── */
  function getActiveSection() {
    const active = document.querySelector(".portal-section.is-visible");
    return active ? active.id.replace("section-", "") : null;
  }

  setInterval(() => {
    const section = getActiveSection();
    if (!section) return;
    if (section === "mis-tramites") loadMyRequests();
    else if (section === "citas") loadAppointments();
    else if (section === "mi-perfil") loadProfile();
    else if (section === "notificaciones") loadPortalNotifications();
    else if (section === "inicio") loadPortalNotifications();
    else if (section === "mi-identidad") loadProfile();
  }, 30000);
})();
