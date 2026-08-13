// Ensures the Plans & Specs action is mounted on the current project modal.
(function () {
  function mountPlansButton() {
    const modal = document.querySelector(".modal");
    if (!modal || document.getElementById("buildScoutPlansButton")) return;
    if (!window.BuildScoutProjectDocuments || typeof projects === "undefined") return;

    const title = modal.querySelector("h1, h2, h3")?.textContent?.trim();
    if (!title) return;

    const project = projects.find(p => String(p.name || "").trim() === title);
    if (!project) return;

    const actionButtons = Array.from(modal.querySelectorAll("button.btn"));
    const actionRow = actionButtons.length
      ? actionButtons[actionButtons.length - 1].parentElement
      : null;
    if (!actionRow) return;

    const button = document.createElement("button");
    button.id = "buildScoutPlansButton";
    button.type = "button";
    button.className = "btn secondary";
    button.textContent = "Plans & Specs";
    button.addEventListener("click", () => {
      window.BuildScoutProjectDocuments.open(project.id, project.name);
    });
    actionRow.appendChild(button);
  }

  const observer = new MutationObserver(() => requestAnimationFrame(mountPlansButton));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  requestAnimationFrame(mountPlansButton);
})();
