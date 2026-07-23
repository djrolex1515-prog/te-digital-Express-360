(() => {
  const currentPage = window.location.pathname.split("/").pop() || "principal.html";
  const navPageMap = {
    "": "principal.html",
    "principal.html": "principal.html",
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
  window.showToast = showToast;

  const PASS_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}\[\]|:;\"'<>,.?\/~`]).{8,12}$/;

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

  function initPortalIdentity() {}

  initCitizenRegistration();
  initPortalIdentity();

  document.addEventListener("click", (event) => {
    const serviceLink = event.target.closest("[data-service]");

    if (serviceLink) {
      if (currentPage === "solicitud.html") return;
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
        "Estado seleccionado.";
    }
  });
})();
