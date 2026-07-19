/*
============================================================
EKKA1KM FRONTEND
admin-tasks.js
V5.12.0 - ADMIN TASK MANAGEMENT MODULE (Phase 5.5)
Create, assign, monitor, complete tasks with history tracking
============================================================
*/


AdminModules.register("tasks", async function(container) {

  var currentPage = 1;
  var currentSearch = "";
  var currentStatus = "";
  var currentPriority = "";
  var currentDepartment = "";
  var totalPages = 1;

  /*
  ============================================================
  RENDER TASK LIST
  ============================================================
  */

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading tasks...</p></div>';

    try {
      // Load stats
      var statsResponse = await fetch(getApiUrl() + "?action=admintaskstats&session=" + encodeURIComponent(session));
      var statsJson = await statsResponse.json();
      var stats = statsJson.success ? statsJson.data : {};

      // Load tasks
      var url = getApiUrl() + "?action=admintasks&session=" + encodeURIComponent(session) + "&page=" + currentPage + "&limit=20";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);
      if (currentPriority) url += "&priority=" + encodeURIComponent(currentPriority);
      if (currentDepartment) url += "&department=" + encodeURIComponent(currentDepartment);

      var response = await fetch(url);
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Tasks</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      var tasks = json.data.data || [];
      totalPages = json.data.totalPages || 1;

      var html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📋 Task Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' total tasks</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-primary" onclick="window._taskOpenCreate()">➕ New Task</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back</button>';
      html += '  </div>';
      html += '</div>';

      // Stats cards
      html += '<div class="task-stats">';
      html += '  <div class="task-stat-card"><span class="task-stat-value">' + (stats.total || 0) + '</span><span class="task-stat-label">Total</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value task-stat-pending">' + (stats.pending || 0) + '</span><span class="task-stat-label">Pending</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value task-stat-progress">' + (stats.inProgress || 0) + '</span><span class="task-stat-label">In Progress</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value task-stat-done">' + (stats.completed || 0) + '</span><span class="task-stat-label">Completed</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value task-stat-overdue">' + (stats.overdue || 0) + '</span><span class="task-stat-label">Overdue</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value task-stat-high">' + (stats.highPriority || 0) + '</span><span class="task-stat-label">High Priority</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value">' + (stats.assignedToday || 0) + '</span><span class="task-stat-label">Today</span></div>';
      html += '  <div class="task-stat-card"><span class="task-stat-value task-stat-mine">' + (stats.myTasks || 0) + '</span><span class="task-stat-label">My Tasks</span></div>';
      html += '</div>';

      // Filters
      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="taskSearch" class="module-input" placeholder="Search tasks..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._taskSearch(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._taskSearch()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" onchange="window._taskStatusChange(this.value)">';
      html += '    <option value="">All Status</option>';
      html += '    <option value="pending"' + (currentStatus === "pending" ? " selected" : "") + '>Pending</option>';
      html += '    <option value="assigned"' + (currentStatus === "assigned" ? " selected" : "") + '>Assigned</option>';
      html += '    <option value="in progress"' + (currentStatus === "in progress" ? " selected" : "") + '>In Progress</option>';
      html += '    <option value="waiting"' + (currentStatus === "waiting" ? " selected" : "") + '>Waiting</option>';
      html += '    <option value="completed"' + (currentStatus === "completed" ? " selected" : "") + '>Completed</option>';
      html += '    <option value="rejected"' + (currentStatus === "rejected" ? " selected" : "") + '>Rejected</option>';
      html += '    <option value="cancelled"' + (currentStatus === "cancelled" ? " selected" : "") + '>Cancelled</option>';
      html += '  </select>';
      html += '  <select class="module-select" onchange="window._taskPriorityChange(this.value)">';
      html += '    <option value="">All Priority</option>';
      html += '    <option value="low"' + (currentPriority === "low" ? " selected" : "") + '>Low</option>';
      html += '    <option value="medium"' + (currentPriority === "medium" ? " selected" : "") + '>Medium</option>';
      html += '    <option value="high"' + (currentPriority === "high" ? " selected" : "") + '>High</option>';
      html += '    <option value="critical"' + (currentPriority === "critical" ? " selected" : "") + '>Critical</option>';
      html += '  </select>';
      html += '  <input type="text" class="module-input" style="max-width:140px" id="taskDeptFilter" placeholder="Department" value="' + escapeHtml(currentDepartment) + '" onkeyup="if(event.key===\'Enter\'){ window._taskDeptFilter(); }" />';
      html += '</div>';

      // Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Due Date</th><th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (tasks.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No tasks found. Click "New Task" to create one.</td></tr>';
      } else {
        tasks.forEach(function(t) {
          var pClass = (t.Priority || "medium").toLowerCase();
          var sClass = (t.Status || "pending").toLowerCase().replace(/\s+/g, "");
          var dueDate = t.DueDate || "";
          var isOverdue = false;
          if (dueDate && sClass !== "completed" && sClass !== "cancelled" && sClass !== "rejected") {
            try {
              isOverdue = new Date(dueDate) < new Date();
            } catch(e) {}
          }

          html += '      <tr class="' + (isOverdue ? 'task-overdue-row' : '') + '">';
          html += '        <td><span class="module-id">' + escapeHtml(t.TaskID || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(t.Title || "N/A") + '</strong></td>';
          html += '        <td><span class="task-priority task-priority-' + pClass + '">' + escapeHtml(t.Priority || "Medium") + '</span></td>';
          html += '        <td><span class="status-badge status-' + sClass + '">' + escapeHtml(t.Status || "Pending") + '</span></td>';
          html += '        <td>' + escapeHtml(t.AssignedTo || "Unassigned") + '</td>';
          html += '        <td>' + (isOverdue ? '<span class="task-overdue">⚠️ ' : '') + escapeHtml(dueDate) + (isOverdue ? '</span>' : '') + '</td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._taskView(\'' + escapeHtml(t.TaskID || "") + '\')" title="View">👁️</button>';
          html += '          <button class="module-action-btn" onclick="window._taskEdit(\'' + escapeHtml(t.TaskID || "") + '\')" title="Edit">✏️</button>';
          html += '          <button class="module-action-btn" onclick="window._taskDuplicate(\'' + escapeHtml(t.TaskID || "") + '\')" title="Duplicate">📋</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._taskDelete(\'' + escapeHtml(t.TaskID || "") + '\')" title="Delete">🗑️</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      // Pagination
      html += '<div class="module-pagination">';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._taskPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
      html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._taskPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }


  /*
  ============================================================
  CREATE TASK MODAL
  ============================================================
  */

  window._taskOpenCreate = async function() {
    var session = AdminAuth.getSession();
    if (!session) return;

    // Load assignees for dropdown
    var assignees = [];
    try {
      var resp = await fetch(getApiUrl() + "?action=admintaskassignees&session=" + encodeURIComponent(session));
      var j = await resp.json();
      if (j.success) assignees = j.data || [];
    } catch(e) {}

    var html = '<div class="modal-overlay" onclick="closeModal(event)">';
    html += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    html += '    <div class="modal-header">';
    html += '      <h3>📋 Create New Task</h3>';
    html += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    html += '    </div>';
    html += '    <div class="modal-body">';
    html += '      <div class="task-form">';
    html += '        <div class="task-form-row"><label>Title *</label><input type="text" id="taskFormTitle" class="module-input" placeholder="Enter task title" /></div>';
    html += '        <div class="task-form-row"><label>Description</label><textarea id="taskFormDesc" class="module-input" rows="3" placeholder="Task description"></textarea></div>';
    html += '        <div class="task-form-row task-form-grid">';
    html += '          <div><label>Department</label><input type="text" id="taskFormDept" class="module-input" placeholder="e.g. Content" /></div>';
    html += '          <div><label>Category</label><input type="text" id="taskFormCat" class="module-input" placeholder="e.g. Review" /></div>';
    html += '        </div>';
    html += '        <div class="task-form-row task-form-grid">';
    html += '          <div><label>Priority</label><select id="taskFormPriority" class="module-select"><option value="Low">Low</option><option value="Medium" selected>Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>';
    html += '          <div><label>Assigned To</label><select id="taskFormAssign" class="module-select"><option value="">Unassigned</option>';
    assignees.forEach(function(a) {
      html += '<option value="' + escapeHtml(a.adminId) + '">' + escapeHtml(a.fullName || a.adminId) + ' (' + escapeHtml(a.role || "") + ')</option>';
    });
    html += '          </select></div>';
    html += '        </div>';
    html += '        <div class="task-form-row"><label>Due Date</label><input type="date" id="taskFormDue" class="module-input" /></div>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="modal-footer">';
    html += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
    html += '      <button class="module-btn module-btn-primary" onclick="window._taskCreateSubmit()">✅ Create Task</button>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    document.body.insertAdjacentHTML("beforeend", html);
  };

  window._taskCreateSubmit = async function() {
    var title = document.getElementById("taskFormTitle");
    if (!title || !title.value.trim()) {
      showToast("Task title is required", "error");
      return;
    }

    var session = AdminAuth.getSession();
    if (!session) return;

    var params = "?action=admintaskcreate&session=" + encodeURIComponent(session);
    params += "&title=" + encodeURIComponent(title.value.trim());

    var desc = document.getElementById("taskFormDesc");
    if (desc && desc.value.trim()) params += "&description=" + encodeURIComponent(desc.value.trim());

    var dept = document.getElementById("taskFormDept");
    if (dept && dept.value.trim()) params += "&department=" + encodeURIComponent(dept.value.trim());

    var cat = document.getElementById("taskFormCat");
    if (cat && cat.value.trim()) params += "&category=" + encodeURIComponent(cat.value.trim());

    var priority = document.getElementById("taskFormPriority");
    if (priority && priority.value) params += "&priority=" + encodeURIComponent(priority.value);

    var assign = document.getElementById("taskFormAssign");
    if (assign && assign.value) params += "&assignedTo=" + encodeURIComponent(assign.value);

    var due = document.getElementById("taskFormDue");
    if (due && due.value) params += "&dueDate=" + encodeURIComponent(due.value);

    try {
      var response = await fetch(getApiUrl() + params);
      var json = await response.json();
      if (json && json.success) {
        showToast("Task created: " + (json.data.taskId || ""), "success");
        closeModal();
        render();
      } else {
        showToast(json.message || "Failed to create task", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };


  /*
  ============================================================
  VIEW TASK MODAL
  ============================================================
  */

  window._taskView = async function(taskId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=admintaskdetail&session=" + encodeURIComponent(session) + "&taskId=" + encodeURIComponent(taskId));
      var json = await response.json();
      if (!json || !json.success || !json.data) {
        showToast(json.message || "Failed to load task", "error");
        return;
      }

      var task = json.data.task || {};
      var history = json.data.history || [];

      var html = '<div class="modal-overlay" onclick="closeModal(event)">';
      html += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
      html += '    <div class="modal-header">';
      html += '      <h3>📋 Task: ' + escapeHtml(task.TaskID || "") + '</h3>';
      html += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      html += '    </div>';
      html += '    <div class="modal-body">';

      // Task details
      html += '      <div class="profile-grid">';
      html += '        <div class="profile-field"><label>Title</label><span>' + escapeHtml(task.Title || "") + '</span></div>';
      html += '        <div class="profile-field"><label>Status</label><span class="status-badge status-' + (task.Status || "pending").toLowerCase().replace(/\s+/g,"") + '">' + escapeHtml(task.Status || "Pending") + '</span></div>';
      html += '        <div class="profile-field"><label>Priority</label><span class="task-priority task-priority-' + (task.Priority || "medium").toLowerCase() + '">' + escapeHtml(task.Priority || "Medium") + '</span></div>';
      html += '        <div class="profile-field"><label>Department</label><span>' + escapeHtml(task.Department || "") + '</span></div>';
      html += '        <div class="profile-field"><label>Category</label><span>' + escapeHtml(task.Category || "") + '</span></div>';
      html += '        <div class="profile-field"><label>Assigned To</label><span>' + escapeHtml(task.AssignedTo || "Unassigned") + '</span></div>';
      html += '        <div class="profile-field"><label>Assigned By</label><span>' + escapeHtml(task.AssignedBy || "") + '</span></div>';
      html += '        <div class="profile-field"><label>Due Date</label><span>' + escapeHtml(task.DueDate || "") + '</span></div>';
      html += '        <div class="profile-field"><label>Created</label><span>' + escapeHtml(task.CreatedDate || "") + '</span></div>';
      html += '        <div class="profile-field" style="grid-column: 1 / -1;"><label>Description</label><span>' + escapeHtml(task.Description || "No description") + '</span></div>';
      html += '        <div class="profile-field" style="grid-column: 1 / -1;"><label>Remarks</label><span>' + escapeHtml(task.Remarks || "") + '</span></div>';
      html += '      </div>';

      // History timeline
      if (history.length > 0) {
        html += '      <div style="margin-top: 20px;"><h4 style="font-size:14px;margin-bottom:8px;">📜 Activity History</h4></div>';
        html += '      <div class="task-timeline">';
        history.forEach(function(h) {
          html += '        <div class="task-timeline-item">';
          html += '          <div class="task-timeline-dot"></div>';
          html += '          <div class="task-timeline-content">';
          html += '            <div class="task-timeline-action">' + escapeHtml(h.Action || "") + '</div>';
          html += '            <div class="task-timeline-desc">' + escapeHtml(h.Description || "") + '</div>';
          html += '            <div class="task-timeline-meta">' + escapeHtml(h.AdminID || "") + ' • ' + escapeHtml(h.Timestamp || "") + '</div>';
          html += '          </div>';
          html += '        </div>';
        });
        html += '      </div>';
      }

      html += '    </div>';
      html += '    <div class="modal-footer">';
      html += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
      html += '      <button class="module-btn module-btn-primary" onclick="closeModal();window._taskEdit(\'' + escapeHtml(taskId) + '\')">✏️ Edit</button>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';

      document.body.insertAdjacentHTML("beforeend", html);

    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };


  /*
  ============================================================
  EDIT TASK MODAL
  ============================================================
  */

  window._taskEdit = async function(taskId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var resp = await fetch(getApiUrl() + "?action=admintaskdetail&session=" + encodeURIComponent(session) + "&taskId=" + encodeURIComponent(taskId));
      var j = await resp.json();
      if (!j || !j.success || !j.data) {
        showToast("Failed to load task", "error");
        return;
      }

      var task = j.data.task || {};

      // Load assignees
      var assignees = [];
      try {
        var aresp = await fetch(getApiUrl() + "?action=admintaskassignees&session=" + encodeURIComponent(session));
        var aj = await aresp.json();
        if (aj.success) assignees = aj.data || [];
      } catch(e) {}

      var html = '<div class="modal-overlay" onclick="closeModal(event)">';
      html += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
      html += '    <div class="modal-header">';
      html += '      <h3>✏️ Edit Task: ' + escapeHtml(taskId) + '</h3>';
      html += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      html += '    </div>';
      html += '    <div class="modal-body">';
      html += '      <div class="task-form">';
      html += '        <div class="task-form-row"><label>Title</label><input type="text" id="taskEditTitle" class="module-input" value="' + escapeHtml(task.Title || "") + '" /></div>';
      html += '        <div class="task-form-row"><label>Description</label><textarea id="taskEditDesc" class="module-input" rows="3">' + escapeHtml(task.Description || "") + '</textarea></div>';
      html += '        <div class="task-form-row task-form-grid">';
      html += '          <div><label>Status</label><select id="taskEditStatus" class="module-select">';
      ["Pending","Assigned","In Progress","Waiting","Completed","Rejected","Cancelled"].forEach(function(s) {
        html += '<option value="' + s + '"' + (task.Status === s ? ' selected' : '') + '>' + s + '</option>';
      });
      html += '          </select></div>';
      html += '          <div><label>Priority</label><select id="taskEditPriority" class="module-select">';
      ["Low","Medium","High","Critical"].forEach(function(p) {
        html += '<option value="' + p + '"' + (task.Priority === p ? ' selected' : '') + '>' + p + '</option>';
      });
      html += '          </select></div>';
      html += '        </div>';
      html += '        <div class="task-form-row task-form-grid">';
      html += '          <div><label>Department</label><input type="text" id="taskEditDept" class="module-input" value="' + escapeHtml(task.Department || "") + '" /></div>';
      html += '          <div><label>Category</label><input type="text" id="taskEditCat" class="module-input" value="' + escapeHtml(task.Category || "") + '" /></div>';
      html += '        </div>';
      html += '        <div class="task-form-row task-form-grid">';
      html += '          <div><label>Assigned To</label><select id="taskEditAssign" class="module-select"><option value="">Unassigned</option>';
      assignees.forEach(function(a) {
        html += '<option value="' + escapeHtml(a.adminId) + '"' + (task.AssignedTo === a.adminId ? ' selected' : '') + '>' + escapeHtml(a.fullName || a.adminId) + '</option>';
      });
      html += '          </select></div>';
      html += '          <div><label>Due Date</label><input type="date" id="taskEditDue" class="module-input" value="' + escapeHtml(task.DueDate || "") + '" /></div>';
      html += '        </div>';
      html += '        <div class="task-form-row"><label>Remarks</label><textarea id="taskEditRemarks" class="module-input" rows="2">' + escapeHtml(task.Remarks || "") + '</textarea></div>';
      html += '      </div>';
      html += '    </div>';
      html += '    <div class="modal-footer">';
      html += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      html += '      <button class="module-btn module-btn-primary" onclick="window._taskEditSubmit(\'' + escapeHtml(taskId) + '\')">💾 Save Changes</button>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';

      document.body.insertAdjacentHTML("beforeend", html);

    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  window._taskEditSubmit = async function(taskId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    var params = "?action=admintaskupdate&session=" + encodeURIComponent(session) + "&taskId=" + encodeURIComponent(taskId);

    var fields = {
      title: "taskEditTitle",
      description: "taskEditDesc",
      status: "taskEditStatus",
      priority: "taskEditPriority",
      department: "taskEditDept",
      category: "taskEditCat",
      assignedTo: "taskEditAssign",
      dueDate: "taskEditDue",
      remarks: "taskEditRemarks"
    };

    for (var key in fields) {
      var el = document.getElementById(fields[key]);
      if (el && el.value !== undefined) {
        params += "&" + key + "=" + encodeURIComponent(el.value);
      }
    }

    try {
      var response = await fetch(getApiUrl() + params);
      var json = await response.json();
      if (json && json.success) {
        showToast("Task " + taskId + " updated", "success");
        closeModal();
        render();
      } else {
        showToast(json.message || "Failed to update task", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };


  /*
  ============================================================
  DUPLICATE TASK
  ============================================================
  */

  window._taskDuplicate = async function(taskId) {
    var confirmed = confirm("Duplicate task " + taskId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=admintaskduplicate&session=" + encodeURIComponent(session) + "&taskId=" + encodeURIComponent(taskId));
      var json = await response.json();
      if (json && json.success) {
        showToast("Task duplicated: " + (json.data.taskId || ""), "success");
        render();
      } else {
        showToast(json.message || "Failed to duplicate task", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };


  /*
  ============================================================
  DELETE TASK
  ============================================================
  */

  window._taskDelete = async function(taskId) {
    var confirmed = confirm("Are you sure you want to delete task " + taskId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=admintaskdelete&session=" + encodeURIComponent(session) + "&taskId=" + encodeURIComponent(taskId));
      var json = await response.json();
      if (json && json.success) {
        showToast("Task " + taskId + " deleted", "success");
        render();
      } else {
        showToast(json.message || "Failed to delete task", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };


  /*
  ============================================================
  FILTER HELPERS
  ============================================================
  */

  window._taskSearch = function() {
    var input = document.getElementById("taskSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._taskStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };

  window._taskPriorityChange = function(value) {
    currentPriority = value;
    currentPage = 1;
    render();
  };

  window._taskDeptFilter = function() {
    var input = document.getElementById("taskDeptFilter");
    currentDepartment = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._taskPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };

  // Initial render
  await render();
});

console.log("Admin Tasks module loaded (Phase 5.5)");