(() => {
  let assistantMessages = null;
  let assistantInput = null;
  let assistantPanel = null;
  let assistantToggle = null;
  let assistantHistory = [];
  const historyKey = "td360_chat_history";

  function saveChatHistory() {
    try { localStorage.setItem(historyKey, JSON.stringify(assistantHistory)); } catch {}
  }

  function loadChatHistory() {
    try { const s = localStorage.getItem(historyKey); return s ? JSON.parse(s) : []; } catch { return []; }
  }

  const knowledgeBase = [
    { keywords: ["hola", "buenos días", "buenas tardes", "ayuda", "qué haces", "quién eres", "saludos"],
      answer: "¡Hola! Soy el asistente virtual del Tribunal Electoral de Panamá. Puedo ayudarte con información sobre: cédula y BioCed, Registro Civil, certificados, centro de votación, citas, oficinas, trámites y más. ¿En qué puedo orientarte hoy?" },
    { keywords: ["cédula", "cedula", "bioced", "bio ced", "renovar", "renovación", "vencimiento", "duplicado", "reposición", "reponer", "pérdida", "robo", "hurto", "extravi"],
      answer: "La cédula de identidad es el documento principal del ciudadano panameño. Puedes realizar los siguientes trámites desde el Portal Ciudadano:\n\n• Renovación por vencimiento\n• Reposición por pérdida o robo\n• Primera vez\n• Consultar estado\n\nIngresa a \"Mi Identidad\" en el Portal Ciudadano para iniciar cualquiera de estos trámites." },
    { keywords: ["registro civil", "nacimiento", "matrimonio", "defunción", "acta", "inscripción", "reconocimiento", "hijo", "hijos", "nombre", "cambio de nombre", "corrección"],
      answer: "El Registro Civil agrupa servicios como: inscripción de nacimiento, registro de matrimonio, defunción, reconocimiento de hijos, corrección de datos y cambio de nombre. Todos disponibles en \"Registro Civil\" del Portal Ciudadano." },
    { keywords: ["certificado", "certificados", "solicitar", "pedir", "qr", "código qr", "digital", "documento digital"],
      answer: "Puedes solicitar certificados digitales oficiales con código QR: de nacimiento, matrimonio, defunción y certificaciones del Registro Civil. Ingresa a \"Certificados\" en tu Portal Ciudadano." },
    { keywords: ["centro de votación", "votación", "votar", "voto", "donde voto", "mesa", "padrón", "padron", "electoral", "electorales", "residencia", "cambio de residencia"],
      answer: "Servicios Electorales: centro de votación, padrón electoral, cambio de residencia, habilitación y resultados. Todo en \"Servicios Electorales\" del Portal Ciudadano." },
    { keywords: ["cita", "citas", "agendar", "reprogramar", "cancelar", "turno", "turno digital"],
      answer: "Gestiona tus citas: agendar, reprogramar, cancelar y consultar. Ingresa a \"Citas\" en el Portal Ciudadano." },
    { keywords: ["oficina", "oficinas", "quiosco", "quioscos", "kiosco", "ubicación", "dirección", "sucursal", "dónde queda", "atencion"],
      answer: "El TE cuenta con 15 oficinas regionales a nivel nacional y quioscos de autoservicio en centros comerciales. Ver ubicaciones y horarios en \"Oficinas\" del Portal." },
    { keywords: ["mis trámites", "trámite", "tramite", "trámites", "tramites", "seguimiento", "estado", "solicitud", "solicitudes", "expediente"],
      answer: "En \"Mis Trámites\" puedes dar seguimiento a tus solicitudes: estado actual, línea de tiempo, código de seguimiento, funcionario asignado y fechas clave." },
    { keywords: ["perfil", "mi perfil", "datos personales", "correo", "teléfono", "contraseña", "password"],
      answer: "En \"Mi Perfil\" puedes administrar: nombre, correo, teléfono, dirección, contraseña y preferencias de notificación." },
    { keywords: ["notificación", "notificaciones", "notificacion", "alerta", "aviso", "documento aprobado", "cita confirmada"],
      answer: "Las notificaciones te mantienen al día: documento aprobado, falta requisito, cita confirmada, documento listo para retirar. Revisa \"Notificaciones\" en el Portal." },
    { keywords: ["solicitud", "solicitar", "registrar", "iniciar", "pedir", "requisito", "requisitos", "formulario"],
      answer: "Para iniciar un trámite ve a \"Solicitudes\". Selecciona el servicio, revisa requisitos, llena el formulario y recibe tu código de seguimiento." },
    { keywords: ["seguimiento", "rastrear", "código", "codigo", "tracking", "TE-", "te-"],
      answer: "Rastrea tu trámite con el código de seguimiento (ej: TE-2026-0842) en Mis Trámites. Verás estado en tiempo real, línea de tiempo y documentos asociados." },
    { keywords: ["horario", "horarios", "horas", "abierto", "cierre", "atención", "lunes", "viernes", "sábado"],
      answer: "Las oficinas atienden de lunes a viernes de 8:00 a.m. a 4:00 p.m. Los quioscos están disponibles 24 horas en centros comerciales seleccionados." },
    { keywords: ["tribunal electoral", "te", "qué es", "quienes son", "funciones", "institución"],
      answer: "El Tribunal Electoral es el organismo constitucional autónomo que organiza los procesos electorales en Panamá. Administra el Registro Civil, cédula de identidad, padrón electoral y servicios digitales a través de TE Digital Express 360." },
    { keywords: ["gracias", "ok", "vale", "listo", "entendido", "perfecto", "claro", "resuelto"],
      answer: "¡Con gusto! Si tienes más preguntas, aquí estoy para ayudarte. ¡Que tengas un buen día!" },
  ];

  const quickQuestions = [
    ["Renovar cédula", "renovar cédula"],
    ["Pedir certificado", "certificado"],
    ["Centro de votación", "centro de votación"],
    ["Agendar cita", "cita"],
    ["Oficinas y Quioscos", "oficinas"],
    ["Mis trámites", "mis trámites"],
    ["Requisitos", "requisitos"],
    ["Horarios", "horario"],
  ];

  function findBestAnswer(question) {
    const q = question.toLowerCase().trim();
    for (const entry of knowledgeBase) {
      for (const kw of entry.keywords) {
        if (q.includes(kw.toLowerCase())) return entry.answer;
      }
    }
    const words = q.split(/\s+/);
    let bestScore = 0, bestAnswer = null;
    for (const entry of knowledgeBase) {
      let score = 0;
      for (const kw of entry.keywords) {
        const kwWords = kw.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (w.length > 3 && kwWords.some(kww => kww.includes(w) || w.includes(kww))) score++;
        }
      }
      if (score > bestScore) { bestScore = score; bestAnswer = entry.answer; }
    }
    return bestScore >= 2 ? bestAnswer : null;
  }

  function addAssistantMessage(text, type, isHTML) {
    if (!assistantMessages) return;
    const message = document.createElement("p");
    message.className = type;
    if (isHTML) message.innerHTML = text; else message.textContent = text;
    assistantMessages.appendChild(message);
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
    assistantHistory.push({ type, text, isHTML: !!isHTML });
    saveChatHistory();
    return message;
  }

  function setAssistantOpen(isOpen) {
    const root = document.querySelector(".floating-assistant");
    if (!root || !assistantPanel || !assistantToggle) return;
    root.classList.toggle("is-open", isOpen);
    assistantPanel.hidden = !isOpen;
    assistantToggle.setAttribute("aria-expanded", String(isOpen));
    localStorage.setItem("td360_assistant_open", isOpen ? "1" : "0");
    if (isOpen) window.setTimeout(() => assistantInput?.focus(), 80);
  }

  async function askFloatingAssistant(question) {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) return;
    setAssistantOpen(true);
    addAssistantMessage(cleanQuestion, "user");
    const typingMsg = addAssistantMessage('Escribiendo<span class="typing-dots"><span></span><span></span><span></span></span>', "bot", true);
    typingMsg.classList.add("typing");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const answer = findBestAnswer(cleanQuestion);
    typingMsg.classList.remove("typing");
    if (answer) { typingMsg.textContent = answer; }
    else { typingMsg.textContent = 'No tengo una respuesta específica para esa consulta. ¿Podrías ser más específico? Puedo ayudarte con: cédula, certificados, Registro Civil, centro de votación, citas, oficinas, trámites, perfil y notificaciones del Tribunal Electoral.'; }
    assistantHistory[assistantHistory.length - 1].text = typingMsg.textContent;
    saveChatHistory();
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
  }

  function createFloatingAssistant() {
    if (document.querySelector(".floating-assistant")) return;
    const root = document.createElement("aside");
    root.className = "floating-assistant";
    root.setAttribute("aria-label", "Asistente TE Digital Express 360");
    root.innerHTML = `
      <button class="assistant-toggle" type="button" aria-expanded="false" aria-label="Abrir asistente de ayuda">
        <span>TE</span><strong>Ayuda</strong>
      </button>
      <section class="floating-chat" role="dialog" aria-label="Asistente ciudadano" hidden>
        <div class="floating-chat-head">
          <span class="icon-pill teal">TE</span>
          <div><strong>Asistente TE Digital Express</strong><small>Disponible en todo el proceso</small></div>
          <button class="assistant-minimize" type="button" aria-label="Minimizar asistente">-</button>
          <button class="chat-clear" type="button" data-clear-chat aria-label="Borrar historial">Borrar historial</button>
        </div>
        <div class="floating-quick-questions">
          ${quickQuestions.map(([label, question]) => `<button type="button" data-assistant-question="${question}">${label}</button>`).join("")}
        </div>
        <div class="chat-body floating-chat-body" data-assistant-messages></div>
        <form class="chat-form floating-chat-form" data-assistant-form>
          <input name="question" placeholder="Escribe tu consulta..." autocomplete="off" aria-label="Pregunta para el asistente" />
          <button type="submit">Enviar</button>
        </form>
      </section>`;
    document.body.appendChild(root);
    assistantPanel = root.querySelector(".floating-chat");
    assistantToggle = root.querySelector(".assistant-toggle");
    assistantMessages = root.querySelector("[data-assistant-messages]");
    assistantInput = root.querySelector("[name='question']");
    const savedHistory = loadChatHistory();
    if (savedHistory.length > 0) {
      assistantHistory = savedHistory;
      for (const msg of savedHistory) {
        const el = document.createElement("p");
        el.className = msg.type;
        if (msg.isHTML) el.innerHTML = msg.text; else el.textContent = msg.text;
        assistantMessages.appendChild(el);
      }
      assistantMessages.scrollTop = assistantMessages.scrollHeight;
    } else {
      const welcome = document.createElement("p");
      welcome.className = "bot";
      welcome.textContent = "Hola. Soy el asistente del Tribunal Electoral. Puedo orientarte sobre cédula, BioCed, certificados, Registro Civil, centro de votación, citas, oficinas, trámites, perfil y notificaciones. ¿En qué puedo ayudarte?";
      assistantMessages.appendChild(welcome);
      assistantHistory.push({ type: "bot", text: welcome.textContent, isHTML: false });
      saveChatHistory();
    }
    assistantToggle.addEventListener("click", () => setAssistantOpen(true));
    root.querySelector(".assistant-minimize").addEventListener("click", () => setAssistantOpen(false));
    const clearBtn = root.querySelector("[data-clear-chat]");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!assistantMessages) return;
        assistantMessages.innerHTML = "";
        assistantHistory = [];
        saveChatHistory();
        const welcome = document.createElement("p");
        welcome.className = "bot";
        welcome.textContent = "Hola. Soy el asistente del Tribunal Electoral. Puedo orientarte sobre cédula, BioCed, certificados, Registro Civil, centro de votación, citas, oficinas, trámites, perfil y notificaciones. ¿En qué puedo ayudarte?";
        assistantMessages.appendChild(welcome);
        assistantHistory.push({ type: "bot", text: welcome.textContent, isHTML: false });
        saveChatHistory();
      });
    }
    root.querySelector("[data-assistant-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const question = assistantInput.value.trim();
      if (!question) return;
      assistantInput.value = "";
      askFloatingAssistant(question);
    });
    if (localStorage.getItem("td360_assistant_open") === "1") setAssistantOpen(true);
  }

  document.addEventListener("click", (event) => {
    const q = event.target.closest("[data-assistant-question]");
    if (q) { askFloatingAssistant(q.getAttribute("data-assistant-question")); return; }
    const o = event.target.closest("[data-assistant-open]");
    if (o) { setAssistantOpen(true); }
  });

  createFloatingAssistant();
})();
