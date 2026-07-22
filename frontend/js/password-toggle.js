(() => {
  const EYE_OPEN = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="12" r="3"/>';
  const EYE_CLOSED = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((btn) => {
      const svg = btn.querySelector("svg");
      if (svg) svg.innerHTML = EYE_CLOSED;
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.getAttribute("data-toggle"));
        if (!input) return;
        const wasHidden = input.type === "password";
        input.type = wasHidden ? "text" : "password";
        if (svg) svg.innerHTML = wasHidden ? EYE_OPEN : EYE_CLOSED;
        btn.setAttribute("aria-label", wasHidden ? "Ocultar contraseña" : "Mostrar contraseña");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPasswordToggles);
  } else {
    initPasswordToggles();
  }
})();
