const $ = (id) => document.getElementById(id);

const fileInput = $("file-input");
const selectedFiles = $("selected-files");
const submitBtn = $("submit-btn");
const uploadForm = $("upload-form");
const uploadError = $("upload-error");
const sessionEmpty = $("session-empty");
const sessionActive = $("session-active");
const sessionIdEl = $("session-id");
const sessionStatus = $("session-status");
const sessionSummary = $("session-summary");
const sessionFilesBody = $("session-files");
const sessionWait = $("session-wait");
const downloadJson = $("download-json");
const copyJson = $("copy-json");
const pastSessions = $("past-sessions");
const refreshList = $("refresh-list");

let pollTimer = null;
let lastOutput = null;

function showError(msg) {
  uploadError.textContent = msg;
  uploadError.classList.remove("hidden");
}

function clearError() {
  uploadError.textContent = "";
  uploadError.classList.add("hidden");
}

function renderSelectedFiles() {
  const files = fileInput.files;
  selectedFiles.textContent = "";
  if (!files || files.length === 0) {
    selectedFiles.classList.add("hidden");
    submitBtn.disabled = true;
    return;
  }
  selectedFiles.classList.remove("hidden");
  submitBtn.disabled = false;
  for (let i = 0; i < files.length; i++) {
    const li = document.createElement("li");
    li.textContent = `${files[i].name} (${(files[i].size / 1024).toFixed(1)} KB)`;
    selectedFiles.appendChild(li);
  }
}

fileInput.addEventListener("change", renderSelectedFiles);

function terminalStatus(s) {
  return s === "completed" || s === "failed" || s === "partial";
}

function setBadge(el, status) {
  el.textContent = status;
  el.className = "badge " + status;
}

async function fetchSession(id) {
  const res = await fetch(`/sessions/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchOutput(id) {
  const res = await fetch(`/sessions/${id}/output`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function rowCount(ex) {
  if (!ex || !ex.tables) return 0;
  return ex.tables.reduce((n, t) => n + (t.rows?.length || 0), 0);
}

function renderSession(doc) {
  sessionEmpty.classList.add("hidden");
  sessionActive.classList.remove("hidden");
  sessionIdEl.textContent = doc.sessionId;
  setBadge(sessionStatus, doc.status);
  sessionSummary.textContent = `${doc.fileCount} file(s) · ${doc.completedCount} ok · ${doc.failedCount} failed · updated ${doc.updatedAt}`;
  sessionFilesBody.textContent = "";
  for (const f of doc.files) {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = f.originalName;
    const tdStatus = document.createElement("td");
    const span = document.createElement("span");
    span.className = "badge " + f.status;
    span.textContent = f.status;
    tdStatus.appendChild(span);
    const tdTime = document.createElement("td");
    tdTime.textContent = f.processingTimeMs != null ? `${f.processingTimeMs} ms` : "—";
    const tdDetail = document.createElement("td");
    if (f.status === "failed") {
      tdDetail.textContent = f.error || "Error";
    } else if (f.status === "completed" && f.extraction) {
      const tc = f.extraction.tables?.length ?? 0;
      tdDetail.textContent = `${tc} table(s), ${rowCount(f.extraction)} row(s)`;
    } else {
      tdDetail.textContent = "—";
    }
    tr.appendChild(tdName);
    tr.appendChild(tdStatus);
    tr.appendChild(tdTime);
    tr.appendChild(tdDetail);
    sessionFilesBody.appendChild(tr);
  }

  const done = terminalStatus(doc.status);
  sessionWait.classList.toggle("hidden", done);
  downloadJson.classList.toggle("hidden", !done);
  copyJson.classList.toggle("hidden", !done);

  if (done) {
    downloadJson.href = `/sessions/${doc.sessionId}/output`;
    downloadJson.setAttribute("download", `loom-session-${doc.sessionId}.json`);
  }

  if (done && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function pollSession(id) {
  try {
    const doc = await fetchSession(id);
    renderSession(doc);
    if (terminalStatus(doc.status) && doc.output) {
      lastOutput = doc.output;
    }
  } catch (e) {
    showError(e.message || String(e));
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
}

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const files = fileInput.files;
  if (!files || files.length === 0) {
    showError("Choose at least one file.");
    return;
  }
  const fd = new FormData();
  for (let i = 0; i < files.length; i++) {
    fd.append("files", files[i]);
  }
  submitBtn.disabled = true;
  try {
    const res = await fetch("/sessions", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || res.statusText);
    }
    const { sessionId } = await res.json();
    lastOutput = null;
    await pollSession(sessionId);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => pollSession(sessionId), 600);
    loadPastSessions();
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    submitBtn.disabled = !fileInput.files || fileInput.files.length === 0;
  }
});

copyJson.addEventListener("click", async () => {
  try {
    const id = sessionIdEl.textContent?.trim();
    if (!id) return;
    const out = lastOutput || (await fetchOutput(id));
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    copyJson.textContent = "Copied!";
    setTimeout(() => {
      copyJson.textContent = "Copy output JSON";
    }, 2000);
  } catch (e) {
    showError("Copy failed: " + (e.message || String(e)));
  }
});

function appendText(el, text) {
  el.appendChild(document.createTextNode(text));
}

async function loadPastSessions() {
  const res = await fetch("/sessions");
  if (!res.ok) return;
  const data = await res.json();
  const sessions = data.sessions || [];
  pastSessions.textContent = "";
  if (sessions.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No saved sessions yet.";
    pastSessions.appendChild(li);
    return;
  }
  for (const s of sessions) {
    const li = document.createElement("li");
    const left = document.createElement("div");
    const code = document.createElement("code");
    code.textContent = s.sessionId;
    const meta = document.createElement("div");
    meta.className = "past-meta";
    appendText(meta, `${s.createdAt} · ${s.fileCount} files · `);
    const badge = document.createElement("span");
    badge.className = "badge " + s.status;
    badge.textContent = s.status;
    meta.appendChild(badge);
    left.appendChild(code);
    left.appendChild(meta);
    const right = document.createElement("div");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "button secondary open-session";
    btn.dataset.id = s.sessionId;
    btn.textContent = "Open";
    right.appendChild(btn);
    li.appendChild(left);
    li.appendChild(right);
    pastSessions.appendChild(li);
  }
  pastSessions.querySelectorAll(".open-session").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!id) return;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      await pollSession(id);
      const doc = await fetchSession(id);
      if (terminalStatus(doc.status)) {
        lastOutput = doc.output;
      }
      if (!terminalStatus(doc.status)) {
        pollTimer = setInterval(() => pollSession(id), 600);
      }
    });
  });
}

refreshList.addEventListener("click", loadPastSessions);

loadPastSessions();
