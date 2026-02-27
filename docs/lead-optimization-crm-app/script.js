const STATUSES = ["New", "Contacted", "Follow-up", "Proposal Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "Referral", "Ads", "Cold Call", "LinkedIn", "Other"];
const SALESPEOPLE = ["Aisha", "Carlos", "Nina", "Raj"];

const seedLeads = [
  { id: 1, leadName: "Acme Retail", company: "Acme", phone: "+1 555 101", email: "ops@acme.com", source: "Referral", dealValue: 24000, industry: "Retail", assigned: "Aisha", createdDate: "2026-02-01", lastContacted: "2026-02-24", nextFollowUp: "2026-02-26", stage: "Hot", status: "Negotiation", activities: [] },
  { id: 2, leadName: "Nova Logistics", company: "Nova", phone: "+1 555 102", email: "cto@nova.com", source: "LinkedIn", dealValue: 12000, industry: "Logistics", assigned: "Carlos", createdDate: "2026-02-08", lastContacted: "2026-02-20", nextFollowUp: "2026-02-27", stage: "Warm", status: "Follow-up", activities: [] },
  { id: 3, leadName: "Beacon Health", company: "Beacon", phone: "+1 555 103", email: "admin@beacon.com", source: "Website", dealValue: 48000, industry: "Healthcare", assigned: "Raj", createdDate: "2026-01-22", lastContacted: "2026-02-18", nextFollowUp: "2026-02-21", stage: "Hot", status: "Proposal Sent", activities: [] },
  { id: 4, leadName: "Core Manufacturing", company: "Core", phone: "+1 555 104", email: "buyer@core.com", source: "Ads", dealValue: 9000, industry: "Manufacturing", assigned: "Nina", createdDate: "2026-02-10", lastContacted: "2026-02-12", nextFollowUp: "2026-02-17", stage: "Cold", status: "Contacted", activities: [] },
  { id: 5, leadName: "Orbit Finance", company: "Orbit", phone: "+1 555 105", email: "ceo@orbit.com", source: "Cold Call", dealValue: 30000, industry: "Finance", assigned: "Aisha", createdDate: "2026-02-04", lastContacted: "2026-02-25", nextFollowUp: "2026-02-28", stage: "Hot", status: "Follow-up", activities: [] }
];

const state = {
  leads: JSON.parse(localStorage.getItem("crm_leads") || "null") || seedLeads,
  view: "table",
  selectedId: null
};

const el = (id) => document.getElementById(id);

function daysOverdue(nextFollowUp) {
  const now = new Date();
  const target = new Date(nextFollowUp + "T00:00:00");
  return Math.floor((now - target) / (1000 * 60 * 60 * 24));
}

function stageSuggestion(lead) {
  const overdue = daysOverdue(lead.nextFollowUp);
  if (lead.dealValue > 20000 && overdue <= 1) return "Hot";
  if (overdue > 6) return "Cold";
  return "Warm";
}

function runMissedLeadCheck() {
  const now = new Date();
  state.leads = state.leads.map((lead) => {
    const overdueDays = daysOverdue(lead.nextFollowUp);
    const closed = ["Won", "Lost"].includes(lead.status);
    const isMissed = overdueDays > 0 && !closed;
    return {
      ...lead,
      isMissed,
      escalated: isMissed && overdueDays >= 2,
      suggestedStage: stageSuggestion(lead),
      activities: isMissed
        ? [{ at: now.toISOString(), actor: "System", type: "missed_follow_up", note: `Lead marked missed (${overdueDays} days overdue).` }, ...lead.activities]
        : lead.activities
    };
  });
  persist();
  render();
}

function persist() {
  localStorage.setItem("crm_leads", JSON.stringify(state.leads));
}

function filteredLeads() {
  const q = el("search").value.toLowerCase().trim();
  return state.leads.filter((lead) => {
    const matchQuery = !q || [lead.leadName, lead.company, lead.phone, lead.email].join(" ").toLowerCase().includes(q);
    const matchSales = !el("filter-salesperson").value || lead.assigned === el("filter-salesperson").value;
    const matchSource = !el("filter-source").value || lead.source === el("filter-source").value;
    const matchStage = !el("filter-stage").value || lead.stage === el("filter-stage").value;
    return matchQuery && matchSales && matchSource && matchStage;
  });
}

function metric(label, value) {
  return `<div class="kpi"><p>${label}</p><h3>${value}</h3></div>`;
}

function renderKpis(leads) {
  const total = leads.length;
  const hot = leads.filter((l) => l.stage === "Hot").length;
  const warm = leads.filter((l) => l.stage === "Warm").length;
  const cold = leads.filter((l) => l.stage === "Cold").length;
  const overdue = leads.filter((l) => l.isMissed).length;
  const won = leads.filter((l) => l.status === "Won").length;
  const conversion = total ? `${Math.round((won / total) * 100)}%` : "0%";
  const forecast = leads.filter((l) => ["Hot", "Warm"].includes(l.stage)).reduce((sum, l) => sum + l.dealValue, 0);

  el("kpis").innerHTML = [
    metric("Total Leads", total),
    metric("Hot / Warm / Cold", `${hot} / ${warm} / ${cold}`),
    metric("Conversion Rate", conversion),
    metric("Overdue Leads", overdue),
    metric("Revenue Forecast", `$${forecast.toLocaleString()}`)
  ].join("");
}

function renderTable(leads) {
  const rows = leads.map((lead) => {
    const stageClass = lead.stage.toLowerCase();
    const missed = lead.isMissed ? `<span class="badge missed">Missed</span>` : "";
    return `<tr data-id="${lead.id}">
      <td>${lead.leadName}<br><small>${lead.company}</small></td>
      <td>${lead.assigned}</td>
      <td><span class="badge ${stageClass}">${lead.stage}</span></td>
      <td>${lead.status}</td>
      <td>${lead.source}</td>
      <td>$${lead.dealValue.toLocaleString()}</td>
      <td>${lead.nextFollowUp}</td>
      <td>${missed}</td>
    </tr>`;
  }).join("");

  el("table-view").innerHTML = `<h2>Lead Table View</h2><table>
    <thead><tr><th>Lead</th><th>Owner</th><th>Stage</th><th>Status</th><th>Source</th><th>Value</th><th>Next Follow-up</th><th>Risk</th></tr></thead>
    <tbody>${rows || "<tr><td colspan='8'>No leads match filter.</td></tr>"}</tbody>
  </table>`;

  el("table-view").querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", () => openLead(Number(row.dataset.id)));
  });
}

function renderKanban(leads) {
  const groups = { Hot: [], Warm: [], Cold: [] };
  leads.forEach((lead) => groups[lead.stage].push(lead));
  const column = (name) => `<div class="column"><h3>${name}</h3>${groups[name].map((lead) => `
      <div class="lead-card" data-id="${lead.id}">
        <strong>${lead.leadName}</strong>
        <p>${lead.assigned} · $${lead.dealValue.toLocaleString()}</p>
        <p>Status: ${lead.status}</p>
        <p>Follow-up: ${lead.nextFollowUp}${lead.isMissed ? " 🔴" : ""}</p>
      </div>`).join("") || "<p>No leads</p>"}
  </div>`;

  el("kanban-view").innerHTML = `<h2>Kanban by Lead Stage</h2><div class="kanban-grid">${column("Hot")}${column("Warm")}${column("Cold")}</div>`;
  el("kanban-view").querySelectorAll(".lead-card").forEach((card) => {
    card.addEventListener("click", () => openLead(Number(card.dataset.id)));
  });
}

function renderRightRail(leads) {
  const notifications = [];
  leads.forEach((lead) => {
    if (lead.isMissed) notifications.push(`🔴 ${lead.leadName}: overdue follow-up for ${lead.assigned}.`);
    if (lead.escalated) notifications.push(`🚨 Escalated to manager: ${lead.leadName} is 48h+ overdue.`);
    if (lead.stage === "Hot" && daysOverdue(lead.nextFollowUp) >= 1) notifications.push(`⚠️ Hot lead untouched: ${lead.leadName}.`);
  });

  const dueToday = leads.filter((l) => daysOverdue(l.nextFollowUp) === 0).length;
  const overdue = leads.filter((l) => l.isMissed).length;
  const hotPending = leads.filter((l) => l.stage === "Hot" && !["Won", "Lost"].includes(l.status)).length;

  el("notifications").innerHTML = notifications.length ? notifications.map((n) => `<li>${n}</li>`).join("") : "<li>No active alerts.</li>";
  el("daily-summary").innerHTML = [
    `<li>Leads due today: <strong>${dueToday}</strong></li>`,
    `<li>Overdue leads: <strong>${overdue}</strong></li>`,
    `<li>Hot leads pending: <strong>${hotPending}</strong></li>`
  ].join("");
}

function openLead(id) {
  const lead = state.leads.find((l) => l.id === id);
  if (!lead) return;
  state.selectedId = id;

  el("lead-title").textContent = `${lead.leadName} (${lead.company})`;
  el("lead-meta").innerHTML = `
    <p><strong>Owner:</strong> ${lead.assigned}</p>
    <p><strong>Status:</strong> ${lead.status} | <strong>Stage:</strong> ${lead.stage} | <strong>Suggested Stage:</strong> ${lead.suggestedStage || lead.stage}</p>
    <p><strong>Next Follow-up:</strong> ${lead.nextFollowUp} ${lead.isMissed ? `<span class="badge missed">Missed</span>` : ""}</p>
    <p><strong>Value:</strong> $${lead.dealValue.toLocaleString()} | <strong>Source:</strong> ${lead.source} | <strong>Industry:</strong> ${lead.industry}</p>`;

  el("edit-status").innerHTML = STATUSES.map((s) => `<option ${s === lead.status ? "selected" : ""}>${s}</option>`).join("");
  el("edit-stage").value = lead.stage;
  el("edit-followup").value = lead.nextFollowUp;

  const activities = lead.activities.length
    ? lead.activities.map((a) => `<li><strong>${new Date(a.at).toLocaleString()}</strong> · ${a.actor} · ${a.type}<br>${a.note}</li>`).join("")
    : "<li>No activities yet.</li>";
  el("lead-activities").innerHTML = activities;

  el("lead-dialog").showModal();
}

function saveLeadUpdate() {
  const lead = state.leads.find((l) => l.id === state.selectedId);
  if (!lead) return;
  const nextStatus = el("edit-status").value;
  const nextStage = el("edit-stage").value;
  const nextFollowUp = el("edit-followup").value;

  lead.activities.unshift({
    at: new Date().toISOString(),
    actor: "User",
    type: "lead_update",
    note: `Status ${lead.status}→${nextStatus}, Stage ${lead.stage}→${nextStage}, Follow-up ${lead.nextFollowUp}→${nextFollowUp}`
  });

  lead.status = nextStatus;
  lead.stage = nextStage;
  lead.nextFollowUp = nextFollowUp;
  persist();
  runMissedLeadCheck();
  openLead(lead.id);
}

function addComment() {
  const lead = state.leads.find((l) => l.id === state.selectedId);
  const note = el("comment-input").value.trim();
  if (!lead || !note) return;
  lead.activities.unshift({ at: new Date().toISOString(), actor: "User", type: "comment", note });
  el("comment-input").value = "";
  persist();
  openLead(lead.id);
}

function render() {
  const leads = filteredLeads();
  renderKpis(leads);
  renderTable(leads);
  renderKanban(leads);
  renderRightRail(leads);
}

function initFilters() {
  el("filter-salesperson").innerHTML += SALESPEOPLE.map((s) => `<option>${s}</option>`).join("");
  el("filter-source").innerHTML += SOURCES.map((s) => `<option>${s}</option>`).join("");
  ["search", "filter-salesperson", "filter-source", "filter-stage"].forEach((id) => {
    el(id).addEventListener("input", render);
    el(id).addEventListener("change", render);
  });
}

function initEvents() {
  el("run-missed-check").addEventListener("click", runMissedLeadCheck);
  el("toggle-view").addEventListener("click", () => {
    state.view = state.view === "table" ? "kanban" : "table";
    el("table-view").classList.toggle("hidden", state.view !== "table");
    el("kanban-view").classList.toggle("hidden", state.view !== "kanban");
    el("toggle-view").textContent = state.view === "table" ? "Switch to Kanban" : "Switch to Table";
  });
  el("close-dialog").addEventListener("click", () => el("lead-dialog").close());
  el("save-lead").addEventListener("click", saveLeadUpdate);
  el("add-comment").addEventListener("click", addComment);
}

initFilters();
initEvents();
runMissedLeadCheck();
