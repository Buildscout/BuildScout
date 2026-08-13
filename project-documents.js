// BuildScout project document center
// Shows authorized plans, specifications, addenda, and related project files.

(function () {
  const state = { projectId: null, documents: [] };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("spec")) return "📘";
    if (t.includes("addend")) return "📝";
    if (t.includes("plan") || t.includes("drawing")) return "📐";
    return "📄";
  }

  async function documentsFor(projectId) {
    const backend = window.BuildScoutBackend;
    if (!backend || typeof backend.getProjectDocuments !== "function") return [];
    try {
      return await backend.getProjectDocuments(projectId);
    } catch (error) {
      console.warn("BuildScout documents could not load:", error);
      return [];
    }
  }

  function renderCards(documents) {
    if (!documents.length) {
      return `<div class="panel" style="background:#0d1d28;border:1px solid #203746;">
        <b>No plans or specifications are attached yet.</b>
        <div class="muted" style="margin-top:6px;">When BuildScout has an authorized plan set, specification book, addendum, or other project document, it will appear here.</div>
      </div>`;
    }

    return `<div style="display:grid;gap:10px;">
      ${documents.map((doc, index) => `
        <button type="button" onclick="BuildScoutProjectDocuments.openDocument(${index})"
          style="width:100%;text-align:left;background:#0d1d28;border:1px solid #203746;border-radius:10px;padding:13px 14px;color:white;cursor:pointer;display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;">
          <div style="font-size:22px;">${icon(doc.document_type)}</div>
          <div style="min-width:0;">
            <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(doc.title || doc.file_name || "Project document")}</div>
            <div class="muted" style="font-size:12px;margin-top:3px;">${escapeHtml(doc.document_type || "Document")}${doc.sheet_number ? ` · ${escapeHtml(doc.sheet_number)}` : ""}${doc.revision ? ` · Rev ${escapeHtml(doc.revision)}` : ""}</div>
          </div>
          <div style="font-weight:800;color:#ff9f32;">View →</div>
        </button>
      `).join("")}
    </div>`;
  }

  async function open(projectId, projectName) {
    state.projectId = projectId;
    state.documents = [];

    const shell = document.createElement("div");
    shell.id = "buildScoutDocumentModal";
    shell.style.cssText = "position:fixed;inset:0;z-index:10050;background:rgba(2,8,12,.86);display:flex;align-items:center;justify-content:center;padding:20px;";
    shell.innerHTML = `
      <div style="width:min(1050px,96vw);max-height:92vh;overflow:auto;background:#081721;border:1px solid #28404f;border-radius:16px;padding:20px;color:white;box-shadow:0 24px 80px rgba(0,0,0,.5);">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
          <div><div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Project documents</div><h2 style="margin:4px 0 4px;">Plans & specifications</h2><div class="muted">${escapeHtml(projectName || "Project")}</div></div>
          <button class="btn" onclick="BuildScoutProjectDocuments.close()">Close</button>
        </div>
        <div style="margin:16px 0;padding:11px 13px;border-radius:10px;background:#102735;border:1px solid #234456;font-size:13px;">BuildScout displays documents that are publicly available or that BuildScout/customers are authorized to access. Source rights and document permissions should be preserved when documents are ingested.</div>
        <div id="buildScoutDocumentList"><div class="muted">Loading project documents…</div></div>
      </div>`;
    document.body.appendChild(shell);

    state.documents = await documentsFor(projectId);
    const list = document.getElementById("buildScoutDocumentList");
    if (list) list.innerHTML = renderCards(state.documents);
  }

  function close() {
    const modal = document.getElementById("buildScoutDocumentModal");
    if (modal) modal.remove();
  }

  function openDocument(index) {
    const doc = state.documents[index];
    if (!doc) return;
    const url = doc.file_url || doc.source_url;
    if (!url) {
      alert("This document does not have a viewable URL yet.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function injectButton() {
    try {
      const projectModal = document.querySelector(".modal");
      if (!projectModal || document.getElementById("buildScoutPlansButton")) return;
      const projectId = stateFromCurrentModal();
      if (!projectId) return;
      const project = typeof projects !== "undefined" ? projects.find(p => String(p.id) === String(projectId)) : null;
      const actions = projectModal.querySelector(".modal-actions") || projectModal.querySelector(".actions") || projectModal.querySelector("button")?.parentElement;
      if (!actions) return;
      const button = document.createElement("button");
      button.id = "buildScoutPlansButton";
      button.type = "button";
      button.className = "btn";
      button.textContent = "Plans & Specs";
      button.onclick = () => open(projectId, project && project.name);
      actions.appendChild(button);
    } catch (_) {}
  }

  function stateFromCurrentModal() {
    try {
      const modal = document.querySelector(".modal");
      if (!modal || typeof projects === "undefined") return null;
      const title = modal.querySelector("h2,h3")?.textContent?.trim();
      const project = projects.find(p => String(p.name || "").trim() === title);
      return project ? project.id : null;
    } catch (_) { return null; }
  }

  const observer = new MutationObserver(() => requestAnimationFrame(injectButton));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.BuildScoutProjectDocuments = { open, close, openDocument, injectButton };
})();
