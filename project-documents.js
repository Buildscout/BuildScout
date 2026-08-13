// BuildScout project document center
// Shows authorized plans, specifications, addenda, and related project files.

(function () {
  const STORAGE_BUCKET = "project-documents";
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const state = { projectId: null, projectName: "", documents: [] };

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

  function getSupabaseClient() {
    const backend = window.BuildScoutBackend;
    if (!backend) throw new Error("BuildScout backend is unavailable.");
    return backend.getClient() || backend.init();
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
        <div class="muted" style="margin-top:6px;">Upload an authorized plan set, specification book, addendum, or other project document and it will appear here.</div>
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

  function renderUploader() {
    return `<div class="panel" style="margin-bottom:14px;background:#0d1d28;border:1px solid #203746;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <b>Upload plans or specifications</b>
          <div class="muted" style="margin-top:4px;font-size:12px;">PDFs and other authorized project files up to 50 MB.</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:10px;margin-top:12px;">
        <input id="buildScoutDocumentTitle" class="input" placeholder="Document title (example: Architectural Plans)" style="width:100%;box-sizing:border-box;" />
        <select id="buildScoutDocumentType" class="input" style="width:100%;box-sizing:border-box;">
          <option value="Plans">Plans</option>
          <option value="Specifications">Specifications</option>
          <option value="Addendum">Addendum</option>
          <option value="Drawing">Drawing</option>
          <option value="Document">Other document</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;">
        <input id="buildScoutDocumentFile" type="file" style="max-width:100%;" />
        <button id="buildScoutUploadDocumentButton" class="btn primary" type="button" onclick="BuildScoutProjectDocuments.uploadSelected()">Upload document</button>
        <span id="buildScoutDocumentUploadStatus" class="muted" style="font-size:12px;"></span>
      </div>
    </div>`;
  }

  async function refreshDocuments() {
    state.documents = await documentsFor(state.projectId);
    const list = document.getElementById("buildScoutDocumentList");
    if (list) list.innerHTML = renderCards(state.documents);
  }

  async function open(projectId, projectName) {
    state.projectId = projectId;
    state.projectName = projectName || "Project";
    state.documents = [];

    close();
    const shell = document.createElement("div");
    shell.id = "buildScoutDocumentModal";
    shell.style.cssText = "position:fixed;inset:0;z-index:10050;background:rgba(2,8,12,.86);display:flex;align-items:center;justify-content:center;padding:20px;";
    shell.innerHTML = `
      <div style="width:min(1050px,96vw);max-height:92vh;overflow:auto;background:#081721;border:1px solid #28404f;border-radius:16px;padding:20px;color:white;box-shadow:0 24px 80px rgba(0,0,0,.5);">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
          <div><div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Project documents</div><h2 style="margin:4px 0 4px;">Plans & specifications</h2><div class="muted">${escapeHtml(state.projectName)}</div></div>
          <button class="btn" onclick="BuildScoutProjectDocuments.close()">Close</button>
        </div>
        <div style="margin:16px 0;padding:11px 13px;border-radius:10px;background:#102735;border:1px solid #234456;font-size:13px;">BuildScout displays documents that are publicly available or that BuildScout/customers are authorized to access. Source rights and document permissions should be preserved when documents are ingested.</div>
        ${renderUploader()}
        <div id="buildScoutDocumentList"><div class="muted">Loading project documents…</div></div>
      </div>`;
    document.body.appendChild(shell);

    await refreshDocuments();
  }

  function close() {
    const modal = document.getElementById("buildScoutDocumentModal");
    if (modal) modal.remove();
  }

  async function resolveDocumentUrl(doc) {
    const rawUrl = doc && (doc.file_url || doc.source_url);
    if (!rawUrl) return null;
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    const client = getSupabaseClient();
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(String(rawUrl).replace(/^\/+/, ""), 60 * 10);
    if (error) throw error;
    return data && data.signedUrl ? data.signedUrl : null;
  }

  async function openDocument(index) {
    const doc = state.documents[index];
    if (!doc) return;

    const newWindow = window.open("", "_blank");
    try {
      const url = await resolveDocumentUrl(doc);
      if (!url) {
        if (newWindow) newWindow.close();
        alert("This document does not have a viewable URL yet.");
        return;
      }
      if (newWindow) {
        newWindow.opener = null;
        newWindow.location = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      if (newWindow) newWindow.close();
      console.error("Unable to open project document:", error);
      alert(`Unable to open this document: ${error.message || error}`);
    }
  }

  function safeFileName(name) {
    return String(name || "document")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "document";
  }

  async function uploadSelected() {
    const fileInput = document.getElementById("buildScoutDocumentFile");
    const titleInput = document.getElementById("buildScoutDocumentTitle");
    const typeInput = document.getElementById("buildScoutDocumentType");
    const status = document.getElementById("buildScoutDocumentUploadStatus");
    const button = document.getElementById("buildScoutUploadDocumentButton");
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!state.projectId) return alert("No project is selected.");
    if (!file) return alert("Choose a project document first.");
    if (file.size > MAX_FILE_SIZE) return alert("That file is larger than the current 50 MB project-document limit.");

    const title = (titleInput && titleInput.value.trim()) || file.name;
    const documentType = (typeInput && typeInput.value) || "Document";
    const storagePath = `${state.projectId}/${Date.now()}-${safeFileName(file.name)}`;

    if (button) button.disabled = true;
    if (status) status.textContent = "Uploading…";

    try {
      const client = getSupabaseClient();
      const { error: uploadError } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined
        });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await client
        .from("project_documents")
        .insert({
          project_id: state.projectId,
          title,
          document_type: documentType,
          file_name: file.name,
          file_url: storagePath,
          is_public: true
        });
      if (metadataError) {
        throw new Error(`File uploaded, but the document record could not be created: ${metadataError.message}`);
      }

      if (fileInput) fileInput.value = "";
      if (titleInput) titleInput.value = "";
      if (status) status.textContent = "Upload complete.";
      await refreshDocuments();
    } catch (error) {
      console.error("Project document upload failed:", error);
      if (status) status.textContent = "Upload failed.";
      alert(`Unable to upload project document: ${error.message || error}`);
    } finally {
      if (button) button.disabled = false;
    }
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

  window.BuildScoutProjectDocuments = { open, close, openDocument, uploadSelected, injectButton };
})();
