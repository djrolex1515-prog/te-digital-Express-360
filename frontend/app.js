(() => {
  const currentPage = window.location.pathname.split("/").pop() || "principal.html";
  const navPageMap = {
    "": "principal.html",
    "principal.html": "principal.html",
    "ciudadano.html": "ciudadano.html",
    "servicios.html": "servicios.html",
    "solicitud.html": "solicitud.html",
   
  };
  let toastTimer = null;

  function initTheme() {
    const saved = localStorage.getItem("td360_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("td360_theme", next);
  }

  function createThemeToggle() {
    const toggle = document.createElement("button");
    toggle.className = "theme-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Cambiar tema");
    toggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    toggle.addEventListener("click", toggleTheme);
    const nav = document.querySelector(".main-nav");
    if (nav) nav.appendChild(toggle);
  }

  initTheme();
  let assistantMessages = null;
  let assistantInput = null;
  let assistantPanel = null;
  let assistantToggle = null;
  let assistantHistory = [];
  const historyKey = "td360_chat_history";

  function saveChatHistory() {
    try {
      localStorage.setItem(historyKey, JSON.stringify(assistantHistory));
    } catch {}
  }

  function loadChatHistory() {
    try {
      const saved = localStorage.getItem(historyKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }

  const stepMessages = {
    recibida: "La solicitud fue recibida y queda pendiente de validación.",
    validada: "Los datos fueron validados y el trámite pasa a procesamiento.",
    en_impresion: "El documento está en impresión. El siguiente paso será retiro.",
    lista_retiro: "El documento o respuesta está listo para retiro o entrega.",
  };

  const knowledgeBase = [
    {
      keywords: ["hola", "buenos días", "buenas tardes", "ayuda", "qué haces", "quién eres", "saludos"],
      answer: "¡Hola! Soy el asistente virtual del Tribunal Electoral de Panamá. Puedo ayudarte con información sobre: cédula y BioCed, Registro Civil, certificados, centro de votación, citas, oficinas, trámites, pagos y más. ¿En qué puedo orientarte hoy?"
    },
    {
      keywords: ["cédula", "cedula", "bioced", "bio ced", "renovar", "renovación", "vencimiento", "duplicado", "reposición", "reponer", "pérdida", "robo", "hurto", "extravi"],
      answer: "La cédula de identidad es el documento principal del ciudadano panameño. Puedes realizar los siguientes trámites desde el Portal Ciudadano:\n\n\u2022 Renovación por vencimiento: Se solicita cuando tu cédula está próxima a vencer o ya venció.\n\u2022 Reposición por pérdida o robo: Debes reportarlo primero y luego solicitar el duplicado.\n\u2022 Primera vez: Para nuevos ciudadanos que obtienen su cédula por primera vez.\n\u2022 Consultar estado: Puedes verificar si tu cédula está vigente, en trámite o lista para retiro.\n\nIngresa a la sección \"Mi Identidad\" en el Portal Ciudadano para iniciar cualquiera de estos trámites."
    },
    {
      keywords: ["registro civil", "nacimiento", "matrimonio", "defunción", "acta", "inscripción", "reconocimiento", "hijo", "hijos", "nombre", "cambio de nombre", "corrección", "datos registrales"],
      answer: "El Registro Civil agrupa los servicios relacionados con el estado civil de las personas:\n\n\u2022 Inscripción de nacimiento: Registrar el nacimiento de un ciudadano.\n\u2022 Registro de matrimonio: Inscripción de matrimonios civiles.\n\u2022 Registro de defunción: Inscripción de fallecimiento.\n\u2022 Reconocimiento de hijos: Reconocimiento voluntario de paternidad o maternidad.\n\u2022 Corrección de datos: Rectificar errores en actas del Registro Civil.\n\u2022 Cambio de nombre: Cuando corresponda según la normativa.\n\nTodos estos servicios están disponibles en la sección \"Registro Civil\" del Portal Ciudadano."
    },
    {
      keywords: ["certificado", "certificados", "solicitar", "pedir", "qr", "código qr", "código", "digital", "documento digital", "nacimiento", "matrimonio", "defunción"],
      answer: "Puedes solicitar certificados digitales oficiales con código QR de verificación:\n\n\u2022 Certificado de nacimiento\n\u2022 Certificado de matrimonio\n\u2022 Certificado de defunción\n\u2022 Certificaciones del Registro Civil\n\nTodos incluyen un código QR que permite verificar la autenticidad del documento en línea. Ingresa a la sección \"Certificados\" en tu Portal Ciudadano para pedirlos."
    },
    {
      keywords: ["centro de votación", "votación", "votar", "voto", "donde voto", "mesa", "padrón", "padron", "electoral", "electorales", "habilitación", "habilitado", "residencia", "cambio de residencia", "resultados"],
      answer: "Servicios Electorales disponibles:\n\n\u2022 Centro de votación: Consulta el lugar donde te corresponde votar.\n\u2022 Padrón electoral: Revisa el padrón electoral preliminar y definitivo.\n\u2022 Cambio de residencia: Solicita el cambio de tu residencia electoral.\n\u2022 Habilitación: Verifica si estás habilitado para votar.\n\u2022 Resultados: Consulta resultados de elecciones anteriores.\n\nTodo esto está en la sección \"Servicios Electorales\" del Portal Ciudadano."
    },
    {
      keywords: ["cita", "citas", "agendar", "reprogramar", "cancelar", "turno", "turno digital"],
      answer: "Puedes gestionar tus citas de forma completamente digital:\n\n\u2022 Agendar cita: Selecciona el servicio, la oficina y el horario disponible.\n\u2022 Reprogramar: Cambia la fecha u hora de una cita existente.\n\u2022 Cancelar: Anula una cita que ya no necesites.\n\u2022 Consultar: Revisa todas tus citas futuras.\n\nIngresa a la sección \"Citas\" en el Portal Ciudadano para gestionarlas."
    },
    {
      keywords: ["oficina", "oficinas", "quiosco", "quioscos", "kiosco", "kioskos", "ubicación", "ubicaciones", "dirección", "sucursal", "sucursales", "dónde queda", "atencion", "punto de atención"],
      answer: "El Tribunal Electoral cuenta con 15 oficinas regionales a nivel nacional: Panamá (sede central), San Miguelito, Colón, Chiriquí, Veraguas, Los Santos, Herrera, Coclé, Bocas del Toro, Darién, Panamá Oeste, comarcas Ngäbe Buglé y Guna Yala, y puntos de atención adicionales.\n\nTambién hay quioscos de autoservicio para consultas rápidas en centros comerciales seleccionados. En la sección \"Oficinas y Quioscos\" del Portal puedes ver todas las ubicaciones, horarios y servicios disponibles."
    },
    {
      keywords: ["mis trámites", "trámite", "tramite", "trámites", "tramites", "seguimiento", "estado", "solicitud", "solicitudes", "expediente", "proceso", "en revisión", "aprobado", "pendiente"],
      answer: "En la sección \"Mis Trámites\" puedes dar seguimiento a todas tus solicitudes activas:\n\n\u2022 Estado actual del trámite (Recibida, Validada, En impresión, Lista para retiro).\n\u2022 Línea de tiempo con cada paso completado.\n\u2022 Código único de seguimiento (ej: TE-2026-0842).\n\u2022 Funcionario asignado a tu caso.\n\u2022 Fechas clave de cada etapa.\n\nTambién puedes ver el historial de trámites completados anteriormente."
    },
    {
      keywords: ["mis documentos", "documento", "documentos", "comprobante", "recibo", "descargar", "pdf", "digital"],
      answer: "La seccion \"Pagos\" del Portal Ciudadano almacena todos tus documentos electronicos:\n\n\u2022 Comprobantes de pago de tramites.\n\u2022 Recibos de solicitud con codigo de seguimiento.\n\u2022 Certificados digitales aprobados.\n\nPuedes subir comprobantes y generar recibos directamente desde la seccion Pagos."
    },
    {
      keywords: ["pago", "pagos", "pagar", "factura", "comprobante", "método de pago", "métodos", "tarjeta", "historial de pagos", "monto", "tasa"],
      answer: "La sección \"Pagos\" del Portal Ciudadano te permite:\n\n\u2022 Pagar trámites en línea (renovación, certificados, reposiciones).\n\u2022 Consultar el historial de pagos realizados.\n\u2022 Descargar facturas y comprobantes de pago.\n\u2022 Ver los métodos de pago disponibles.\n\nCada trámite tiene una tasa establecida que puedes consultar antes de iniciar el proceso."
    },
    {
      keywords: ["perfil", "mi perfil", "datos personales", "correo", "teléfono", "telefono", "dirección", "contraseña", "password", "contrase", "seguridad", "autenticación", "dos pasos", "2fa"],
      answer: "En \"Mi Perfil\" puedes administrar tu cuenta:\n\n\u2022 Nombre completo y datos personales.\n\u2022 Correo electrónico y teléfono de contacto.\n\u2022 Dirección registrada.\n\u2022 Preferencias de notificación.\n\u2022 Cambio de contraseña.\n\u2022 Autenticación en dos pasos (recomendado para mayor seguridad).\n\nMantén tus datos actualizados para recibir notificaciones importantes del Tribunal Electoral."
    },
    {
      keywords: ["notificación", "notificaciones", "notificacion", "alerta", "aviso", "documento aprobado", "cita confirmada", "pago recibido", "listo para retirar"],
      answer: "Las notificaciones te mantienen al día sobre el estado de tus trámites:\n\n\u2022 Documento aprobado: Tu trámite ha sido aprobado.\n\u2022 Falta un requisito: Debes completar información pendiente.\n\u2022 Cita confirmada: Tu cita ha sido agendada exitosamente.\n\u2022 Documento listo para retirar: Puedes pasar por tu oficina.\n\u2022 Pago recibido: Confirmación de pago de un trámite.\n\nRevisa la sección \"Notificaciones\" del Portal Ciudadano para ver todas tus alertas."
    },
    {
      keywords: ["solicitud", "solicitar", "registrar", "iniciar", "pedir", "requisito", "requisitos", "documentos necesarios", "formulario"],
      answer: "Para iniciar un trámite, dirígete a la sección \"Solicitud\" desde el menú principal. Allí puedes:\n\n\u2022 Seleccionar el tipo de servicio (cédula, certificado, registro civil).\n\u2022 Revisar los requisitos necesarios antes de empezar.\n\u2022 Llenar el formulario con tus datos.\n\u2022 Adjuntar los documentos requeridos.\n\u2022 Recibir un código de seguimiento para tu trámite.\n\nCada servicio tiene requisitos específicos que se muestran antes de iniciar la solicitud."
    },
    {
      keywords: ["seguimiento", "rastrear", "código", "codigo", "tracking", "TE-", "te-", "código de seguimiento"],
      answer: "Puedes rastrear tu trámite usando el código único de seguimiento (ej: TE-2026-0842) en la página de Seguimiento. Allí verás:\n\n\u2022 El estado actual actualizado en tiempo real.\n\u2022 La línea de tiempo completa del proceso.\n\u2022 Los documentos asociados a tu solicitud.\n\u2022 El funcionario encargado de tu caso.\n\nTu código de seguimiento se entrega al momento de registrar la solicitud."
    },
    {
      keywords: ["horario", "horarios", "horas", "abierto", "cierre", "atención", "atencion", "lunes", "viernes", "sábado", "sabado"],
      answer: "Las oficinas del Tribunal Electoral atienden en horario de lunes a viernes de 8:00 a.m. a 4:00 p.m. Algunas oficinas principales pueden tener horarios extendidos. Los quioscos de autoservicio están disponibles las 24 horas en centros comerciales seleccionados. Verifica los horarios específicos en la sección \"Oficinas\" del Portal."
    },
    {
      keywords: ["tribunal electoral", "te", "qué es", "quienes son", "funciones", "institución", "organismo"],
      answer: "El Tribunal Electoral (TE) es el organismo constitucional autónomo encargado de organizar, dirigir y supervisar los procesos electorales en Panamá. También administra el Registro Civil, la cédula de identidad, el padrón electoral, y brinda servicios digitales a través de TE Digital Express 360 para facilitar los trámites ciudadanos."
    },
    {
      keywords: ["gracias", "ok", "vale", "listo", "entendido", "perfecto", "claro", "resuelto", "ayudó", "ayudo"],
      answer: "¡Con gusto! Recuerda que puedes acceder a todos estos servicios desde el Portal Ciudadano en cualquier momento. Si tienes más preguntas, aquí estoy para ayudarte. ¡Que tengas un buen día!"
    }
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
        if (q.includes(kw.toLowerCase())) {
          return entry.answer;
        }
      }
    }

    const words = q.split(/\s+/);
    let bestScore = 0;
    let bestAnswer = null;

    for (const entry of knowledgeBase) {
      let score = 0;
      for (const kw of entry.keywords) {
        const kwWords = kw.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (w.length > 3 && kwWords.some(kww => kww.includes(w) || w.includes(kww))) {
            score += 1;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestAnswer = entry.answer;
      }
    }

    if (bestScore >= 2) return bestAnswer;

    return null;
  }

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
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3600);
  }
  window.showToast = showToast;

  function addAssistantMessage(text, type, isHTML) {
    if (!assistantMessages) return;

    const message = document.createElement("p");
    message.className = type;

    if (isHTML) {
      message.innerHTML = text;
    } else {
      message.textContent = text;
    }

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

    if (isOpen) {
      window.setTimeout(() => assistantInput?.focus(), 80);
    }
  }

  async function askFloatingAssistant(question) {
    const cleanQuestion = String(question || "").trim();

    if (!cleanQuestion) return;

    setAssistantOpen(true);
    addAssistantMessage(cleanQuestion, "user");

    const typingMsg = addAssistantMessage(
      'Escribiendo<span class="typing-dots"><span></span><span></span><span></span></span>',
      "bot", true
    );
    typingMsg.classList.add("typing");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const answer = findBestAnswer(cleanQuestion);

    typingMsg.classList.remove("typing");

    if (answer) {
      typingMsg.textContent = answer;
    } else {
      typingMsg.textContent = 'No tengo una respuesta específica para esa consulta. ¿Podrías ser más específico? Puedo ayudarte con: cédula, certificados, Registro Civil, centro de votación, citas, oficinas, trámites, pagos, perfil y notificaciones del Tribunal Electoral. También puedes intentar con palabras clave como "renovar cédula" o "pedir certificado".';
    }

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
      <button
        class="assistant-toggle"
        type="button"
        aria-expanded="false"
        aria-label="Abrir asistente de ayuda"
      >
        <span>TE</span>
        <strong>Ayuda</strong>
      </button>

      <section class="floating-chat" role="dialog" aria-label="Asistente ciudadano" hidden>
        <div class="floating-chat-head">
          <span class="icon-pill teal">TE</span>
          <div>
            <strong>Asistente TE Digital Express</strong>
            <small>Disponible en todo el proceso</small>
          </div>
          <button class="assistant-minimize" type="button" aria-label="Minimizar asistente">
            -
          </button>
          <button class="chat-clear" type="button" data-clear-chat aria-label="Borrar historial">Borrar historial</button>
        </div>

        <div class="floating-quick-questions">
          ${quickQuestions
            .map(
              ([label, question]) => `
                <button type="button" data-assistant-question="${question}">
                  ${label}
                </button>
              `
            )
            .join("")}
        </div>

        <div class="chat-body floating-chat-body" data-assistant-messages></div>

        <form class="chat-form floating-chat-form" data-assistant-form>
          <input
            name="question"
            placeholder="Escribe tu consulta..."
            autocomplete="off"
            aria-label="Pregunta para el asistente"
          />
          <button type="submit">Enviar</button>
        </form>
      </section>
    `;

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
        if (msg.isHTML) {
          el.innerHTML = msg.text;
        } else {
          el.textContent = msg.text;
        }
        assistantMessages.appendChild(el);
      }
      assistantMessages.scrollTop = assistantMessages.scrollHeight;
    } else {
      const welcome = document.createElement("p");
      welcome.className = "bot";
      welcome.textContent = "Hola. Soy el asistente del Tribunal Electoral. Puedo orientarte sobre cédula, BioCed, certificados, Registro Civil, centro de votación, citas, oficinas, quioscos, trámites, pagos, perfil y notificaciones. ¿En qué puedo ayudarte?";
      assistantMessages.appendChild(welcome);
      assistantHistory.push({ type: "bot", text: welcome.textContent, isHTML: false });
      saveChatHistory();
    }

    assistantToggle.addEventListener("click", () => setAssistantOpen(true));
    root
      .querySelector(".assistant-minimize")
      .addEventListener("click", () => setAssistantOpen(false));

    const clearBtn = root.querySelector("[data-clear-chat]");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!assistantMessages) return;
        assistantMessages.innerHTML = "";
        assistantHistory = [];
        saveChatHistory();
        const welcome = document.createElement("p");
        welcome.className = "bot";
        welcome.textContent = "Hola. Soy el asistente del Tribunal Electoral. Puedo orientarte sobre cédula, BioCed, certificados, Registro Civil, centro de votación, citas, oficinas, quioscos, trámites, pagos, perfil y notificaciones. ¿En qué puedo ayudarte?";
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

    if (localStorage.getItem("td360_assistant_open") === "1") {
      setAssistantOpen(true);
    }
  }

  document.querySelectorAll(".main-nav a").forEach((link) => {
    const targetPage = link.getAttribute("href");
    const activePage = navPageMap[currentPage] || currentPage;

    if (targetPage === activePage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  createFloatingAssistant();
  createThemeToggle();

  const PASS_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}\[\]|:;\"'<>,.?\/~`]).{8,12}$/;

  function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.getAttribute("data-toggle"));
        if (!input) return;
        const isPass = input.type === "password";
        input.type = isPass ? "text" : "password";
        btn.setAttribute("aria-label", isPass ? "Ocultar contraseña" : "Mostrar contraseña");
        btn.querySelector(".eye-icon")?.toggleAttribute("hidden", !isPass);
        btn.querySelector(".eye-off-icon")?.toggleAttribute("hidden", isPass);
      });
    });
  }

  function validatePassword(pass) {
    return PASS_PATTERN.test(pass);
  }

  function getPasswordError(pass) {
    if (pass.length < 8 || pass.length > 12) {
      return "Debe tener entre 8 y 12 caracteres.";
    }
    if (!/[A-Z]/.test(pass)) return "Falta una mayúscula.";
    if (!/[a-z]/.test(pass)) return "Falta una minúscula.";
    if (!/\d/.test(pass)) return "Falta un número.";
    if (!/[!@#$%^&*()_\-+={}\[\]|:;\"'<>,.?\/~`]/.test(pass)) return "Falta un carácter especial.";
    return "";
  }

  function initCitizenRegistration() {
    const hub = document.getElementById("citizenHub");
    if (!hub) return;

    const unregistered = document.getElementById("citizenUnregistered");
    const registered = document.getElementById("citizenRegistered");
    const title = document.getElementById("citizenTitle");
    const nameDisplay = document.getElementById("citizenName");
    const regForm = document.getElementById("citizenRegForm");
    const loginForm = document.getElementById("citizenLoginForm");
    const regView = document.getElementById("citizenRegView");
    const loginView = document.getElementById("citizenLoginView");
    const regError = document.getElementById("regError");
    const loginError = document.getElementById("loginError");
    const regPass = document.getElementById("regPass");
    const passHint = document.getElementById("regPassHint");

    initPasswordToggles();

    if (regPass && passHint) {
      regPass.addEventListener("input", () => {
        const err = getPasswordError(regPass.value);
        if (!regPass.value) {
          passHint.className = "pass-hint";
          passHint.textContent = "Debe tener entre 8 y 12 caracteres, mayúsculas, minúsculas, números y al menos un carácter especial.";
        } else if (!err) {
          passHint.className = "pass-hint is-valid";
          passHint.textContent = "Contraseña válida.";
        } else {
          passHint.className = "pass-hint is-invalid";
          passHint.textContent = err;
        }
      });
    }

    async function fetchCitizenSession(token) {
      try {
        const res = await fetch("/api/citizens/me", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) throw new Error("Invalid");
        return await res.json();
      } catch {
        return null;
      }
    }

    function showUnregistered() {
      unregistered.hidden = false;
      registered.hidden = true;
      title.textContent = "Regístrate como ciudadano digital";
      hub.classList.remove("is-registered");
    }

    function showRegistered(citizen) {
      unregistered.hidden = true;
      registered.hidden = false;
      title.textContent = "Bienvenido, " + citizen.full_name;
      if (nameDisplay) nameDisplay.textContent = citizen.full_name;
      hub.classList.add("is-registered");
    }

    (async () => {
      const token = localStorage.getItem("td360_citizen_token");
      if (token) {
        const session = await fetchCitizenSession(token);
        if (session) {
          localStorage.setItem("td360_citizen_user", JSON.stringify(session));
          showRegistered(session);
          return;
        }
        localStorage.removeItem("td360_citizen_token");
        localStorage.removeItem("td360_citizen_user");
      }
      showUnregistered();
    })();

    document.getElementById("showLogin")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (regError) regError.hidden = true;
      if (loginError) loginError.hidden = true;
      regView.hidden = true;
      loginView.hidden = false;
    });

    document.getElementById("showRegister")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (regError) regError.hidden = true;
      if (loginError) loginError.hidden = true;
      regView.hidden = false;
      loginView.hidden = true;
    });

    if (regForm) {
      regForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (regError) regError.hidden = true;

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const cedula = document.getElementById("regCedula").value.trim();
        const pass = document.getElementById("regPass").value;
        const confirm = document.getElementById("regConfirm").value;

        if (!name || !email || !cedula || !pass) { showToast("Completa todos los campos."); return; }
        if (!validatePassword(pass)) { showToast(getPasswordError(pass) || "Contraseña inválida."); return; }
        if (pass !== confirm) { showToast("Las contraseñas no coinciden."); return; }

        try {
          const res = await fetch("/api/citizens/register", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ full_name: name, email, cedula, password: pass }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 409 && data.error) {
              regError.innerHTML = data.error;
              regError.hidden = false;
              const switchLink = regError.querySelector("#switchToLogin");
              if (switchLink) {
                switchLink.addEventListener("click", (ev) => {
                  ev.preventDefault();
                  if (regView) regView.hidden = true;
                  if (loginView) loginView.hidden = false;
                  regError.hidden = true;
                });
              }
            } else {
              regError.textContent = data.error || "Error al registrarse.";
              regError.hidden = false;
            }
            return;
          }
          localStorage.setItem("td360_citizen_token", data.token);
          localStorage.setItem("td360_citizen_user", JSON.stringify(data.citizen));
          showRegistered(data.citizen);
          showToast("Cuenta creada. Bienvenido " + name + ".");
          setTimeout(() => { window.location.href = "ciudadano.html"; }, 1200);
        } catch {
          regError.textContent = "Error de conexión con el servidor.";
          regError.hidden = false;
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (loginError) loginError.hidden = true;

        const email = document.getElementById("loginEmail").value.trim();
        const pass = document.getElementById("loginPass").value;

        if (!email || !pass) { showToast("Ingresa correo y contraseña."); return; }

        try {
          const res = await fetch("/api/citizens/login", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass }),
          });
          const data = await res.json();
          if (!res.ok) {
            loginError.textContent = data.error || "Credenciales inválidas.";
            loginError.hidden = false;
            return;
          }
          localStorage.setItem("td360_citizen_token", data.token);
          localStorage.setItem("td360_citizen_user", JSON.stringify(data.citizen));
          showRegistered(data.citizen);
          showToast("Sesión iniciada.");
          setTimeout(() => { window.location.href = "ciudadano.html"; }, 1200);
        } catch {
          loginError.textContent = "Error de conexión.";
          loginError.hidden = false;
        }
      });
    }

    const logoutBtn = document.getElementById("citizenLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const t = localStorage.getItem("td360_citizen_token");
        if (t) {
          try { await fetch("/api/citizens/logout", { method: "POST", headers: { Authorization: "Bearer " + t } }); } catch {}
        }
        localStorage.removeItem("td360_citizen_token");
        localStorage.removeItem("td360_citizen_user");
        ["regName","regEmail","regCedula","regPass","regConfirm","loginEmail","loginPass"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        if (regView) regView.hidden = false;
        if (loginView) loginView.hidden = true;
        if (regError) regError.hidden = true;
        if (loginError) loginError.hidden = true;
        if (passHint) {
          passHint.className = "pass-hint";
          passHint.textContent = "Debe tener entre 8 y 12 caracteres, mayúsculas, minúsculas, números y al menos un carácter especial.";
        }
        showUnregistered();
      });
    }

    const regPrompt = document.getElementById("citizenRegPrompt");
    if (regPrompt) {
      regPrompt.addEventListener("click", () => {
        if (regView) regView.hidden = false;
        if (loginView) loginView.hidden = true;
        const f = document.getElementById("citizenRegForm");
        if (f) f.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  function initPortalIdentity() {
    const page = window.location.pathname.split("/").pop() || "principal.html";
    if (page !== "ciudadano.html") return;

    const token = localStorage.getItem("td360_citizen_token");
    if (!token) {
      window.location.href = "principal.html";
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/citizens/me", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) throw new Error("No autenticado");
        const data = await res.json();

        const setText = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val || "—";
        };
        setText("idCedula", data.cedula);
        setText("idName", data.full_name);
        setText("idEmail", data.email);

        if (data.created_at) {
          const d = new Date(data.created_at);
          setText("idIssued", d.toLocaleDateString("es-PA"));
          const expiry = new Date(d.getFullYear() + 10, d.getMonth(), d.getDate());
          setText("idExpiry", expiry.toLocaleDateString("es-PA"));
        }
      } catch {
        localStorage.removeItem("td360_citizen_token");
        localStorage.removeItem("td360_citizen_user");
      window.location.href = "principal.html";
      }
    })();
  }

  initCitizenRegistration();
  initPortalIdentity();

  document.addEventListener("click", (event) => {
    const assistantQuestion = event.target.closest("[data-assistant-question]");

    if (assistantQuestion) {
      askFloatingAssistant(assistantQuestion.getAttribute("data-assistant-question"));
      return;
    }

    const assistantOpen = event.target.closest("[data-assistant-open]");

    if (assistantOpen) {
      setAssistantOpen(true);
      return;
    }

    const serviceLink = event.target.closest("[data-service]");

    if (serviceLink) {
      if (currentPage === "solicitud.html" || currentPage === "ciudadano.html") return;
      const hub = document.getElementById("citizenHub");
      if (!hub || !hub.classList.contains("is-registered")) {
        event.preventDefault();
        showToast("Debes registrarte para acceder a este servicio. Crea tu cuenta gratuita en la parte superior.");
        const formEl = document.getElementById("citizenRegForm");
        if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    const backButton = event.target.closest("[data-back]");

    if (backButton) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = backButton.getAttribute("data-fallback") || "principal.html";
      }

      return;
    }

    const navigable = event.target.closest("[data-href]");

    if (navigable) {
      const href = navigable.getAttribute("data-href");

      if (href) {
        window.location.href = href;
        return;
      }
    }

    const infoButton = event.target.closest("[data-info]");

    if (infoButton) {
      showToast(infoButton.getAttribute("data-info"));
      return;
    }

    const focusButton = event.target.closest("[data-focus]");

    if (focusButton) {
      const target = document.querySelector(focusButton.getAttribute("data-focus"));

      if (target) {
        target.focus();
        showToast("Listo. Completa tus credenciales para entrar al panel.");
      }

      return;
    }

    const stepButton = event.target.closest("[data-step]");

    if (!stepButton) return;

    const container = stepButton.closest(".steps");
    const key = stepButton.getAttribute("data-step");
    const messageTarget = document.querySelector(
      stepButton.getAttribute("data-message-target") || "#nextStep"
    );

    container?.querySelectorAll("button").forEach((button) => {
      button.classList.remove("is-active");
    });

    stepButton.classList.add("is-active");

    if (messageTarget) {
      messageTarget.textContent =
        stepButton.getAttribute("data-step-message") ||
        stepMessages[key] ||
        "Estado seleccionado.";
    }
  });
})();
