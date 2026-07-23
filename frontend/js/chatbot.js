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

  const quickQuestions = [
    { icon: "🪪", label: "Renovar cédula", question: "renovar cédula" },
    { icon: "📄", label: "Certificados", question: "certificados" },
    { icon: "📅", label: "Agendar cita", question: "cita" },
    { icon: "📂", label: "Mis trámites", question: "mis trámites" },
    { icon: "🕐", label: "Horarios", question: "horarios" },
    { icon: "📍", label: "Oficinas", question: "oficinas" },
  ];

  function formatTime() {
    return new Date().toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" });
  }

  function addAssistantMessage(text, type, isHTML) {
    if (!assistantMessages) return;
    const wrapper = document.createElement("div");
    wrapper.className = "chat-msg chat-msg--" + type;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    if (isHTML) bubble.innerHTML = text; else bubble.textContent = text;
    const time = document.createElement("span");
    time.className = "chat-time";
    time.textContent = formatTime();
    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    assistantMessages.appendChild(wrapper);
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
    assistantHistory.push({ type, text, isHTML: !!isHTML });
    saveChatHistory();
    return wrapper;
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

    const typingEl = addAssistantMessage("Escribiendo...", "bot");
    if (typingEl) typingEl.classList.add("is-typing");

    let answer = "";

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const data = await res.json();
      answer = data.answer || "No pude procesar tu consulta. Intenta de nuevo.";
    } catch {
      answer = "Error de conexión. Verifica tu internet e intenta de nuevo.";
    }

    if (typingEl) typingEl.classList.remove("is-typing");

    const bubble = typingEl?.querySelector(".chat-bubble");
    if (bubble) {
      const lines = answer.split("\n");
      const formatted = lines.map(line => {
        if (/^https?:\/\//.test(line.trim())) {
          return '<a href="' + line.trim() + '" target="_blank" rel="noopener" style="color:var(--teal);text-decoration:underline;">' + line.trim() + '</a>';
        }
        return line;
      }).join("\n");
      if (formatted.includes("<a ")) {
        bubble.innerHTML = formatted;
      } else {
        bubble.textContent = answer;
      }
    }

    if (assistantHistory.length > 0) {
      assistantHistory[assistantHistory.length - 1].text = answer;
      saveChatHistory();
    }
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
  }

  function createFloatingAssistant() {
    if (document.querySelector(".floating-assistant")) return;
    const root = document.createElement("aside");
    root.className = "floating-assistant";
    root.setAttribute("aria-label", "Asistente TE Digital Express 360");

    const quickBtns = quickQuestions.map(q =>
      `<button class="quick-btn" type="button" data-assistant-question="${q.question}">
        <span class="quick-btn-icon">${q.icon}</span>
        <span class="quick-btn-label">${q.label}</span>
      </button>`
    ).join("");

    root.innerHTML = `
      <button class="assistant-toggle" type="button" aria-expanded="false" aria-label="Abrir asistente de ayuda">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <section class="floating-chat" role="dialog" aria-label="Asistente ciudadano" hidden>
        <div class="floating-chat-head">
          <div class="head-avatar">TE</div>
          <div class="head-info">
            <strong>Asistente Virtual</strong>
            <small><span class="status-dot"></span>En línea</small>
          </div>
          <button class="assistant-minimize" type="button" aria-label="Minimizar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="chat-clear-btn" type="button" data-clear-chat aria-label="Borrar historial" title="Borrar historial">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        <div class="chat-body floating-chat-body" data-assistant-messages></div>

        <div class="floating-quick-questions">${quickBtns}</div>

        <form class="chat-form floating-chat-form" data-assistant-form>
          <input name="question" placeholder="Escribe tu pregunta..." autocomplete="off" aria-label="Pregunta para el asistente" />
          <button type="submit" aria-label="Enviar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
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
        const wrapper = document.createElement("div");
        wrapper.className = "chat-msg chat-msg--" + msg.type;
        const bubble = document.createElement("div");
        bubble.className = "chat-bubble";
        if (msg.isHTML) bubble.innerHTML = msg.text; else bubble.textContent = msg.text;
        wrapper.appendChild(bubble);
        assistantMessages.appendChild(wrapper);
      }
      assistantMessages.scrollTop = assistantMessages.scrollHeight;
    } else {
      const welcome = document.createElement("div");
      welcome.className = "chat-msg chat-msg--bot";
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = "Hola, soy tu asistente virtual del Tribunal Electoral de Panamá. Puedo orientarte sobre cédula, certificados, Registro Civil, servicios electorales, citas, oficinas y más. ¿En qué puedo ayudarte?";
      welcome.appendChild(bubble);
      assistantMessages.appendChild(welcome);
      assistantHistory.push({ type: "bot", text: bubble.textContent, isHTML: false });
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
        const welcome = document.createElement("div");
        welcome.className = "chat-msg chat-msg--bot";
        const bubble = document.createElement("div");
        bubble.className = "chat-bubble";
        bubble.textContent = "Historial borrado. ¿En qué puedo ayudarte?";
        welcome.appendChild(bubble);
        assistantMessages.appendChild(welcome);
        assistantHistory.push({ type: "bot", text: bubble.textContent, isHTML: false });
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
