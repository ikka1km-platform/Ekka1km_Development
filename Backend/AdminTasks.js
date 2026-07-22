/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminTasks.js
 * V5.12.0 - TASK MANAGEMENT SYSTEM (Phase 5.5)
 * Create, assign, monitor, complete tasks with history tracking
 * ============================================================
 */


/**
 * ============================================================
 * TASK DASHBOARD STATS
 * ?action=admintaskstats&session=TOKEN
 * ============================================================
 */

function getAdminTaskStats(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const tasks = getSheetData(CONFIG.SHEETS.TASKS);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    var stats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      highPriority: 0,
      assignedToday: 0,
      myTasks: 0
    };

    tasks.forEach(function(t) {
      stats.total++;

      var status = (t.Status || "").toLowerCase();
      var priority = (t.Priority || "").toLowerCase();
      var dueDate = t.DueDate ? new Date(t.DueDate) : null;
      var createdDate = t.CreatedDate ? new Date(t.CreatedDate) : null;

      if (status === "pending") stats.pending++;
      else if (status === "in progress" || status === "inprogress") stats.inProgress++;
      else if (status === "completed") stats.completed++;

      // Overdue: not completed and past due date
      if (status !== "completed" && status !== "cancelled" && status !== "rejected" && dueDate && dueDate < now) {
        stats.overdue++;
      }

      if (priority === "high" || priority === "critical") {
        stats.highPriority++;
      }

      // Assigned today
      if (createdDate && createdDate >= todayStart) {
        stats.assignedToday++;
      }

      // My tasks (assigned to current admin)
      if (String(t.AssignedTo || "").trim().toUpperCase() === String(sessionResult.adminId || "").trim().toUpperCase()) {
        stats.myTasks++;
      }
    });

    return success(stats, "Task Stats Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET ALL TASKS
 * ?action=admintasks&session=TOKEN&search=TERM&status=FILTER&priority=FILTER&department=FILTER&assignedTo=FILTER&page=1&limit=50
 * ============================================================
 */

function getAdminTasks(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var search = (e.parameter.search || "").trim().toLowerCase();
    var statusFilter = (e.parameter.status || "").trim().toLowerCase();
    var priorityFilter = (e.parameter.priority || "").trim().toLowerCase();
    var departmentFilter = (e.parameter.department || "").trim().toLowerCase();
    var assignedToFilter = (e.parameter.assignedTo || "").trim().toLowerCase();
    var page = parseInt(e.parameter.page || "1");
    var limit = parseInt(e.parameter.limit || "50");

    var tasks = getSheetData(CONFIG.SHEETS.TASKS);

    // Apply filters
    if (search) {
      tasks = tasks.filter(function(t) {
        return (t.Title || "").toLowerCase().indexOf(search) !== -1 ||
               (t.Description || "").toLowerCase().indexOf(search) !== -1 ||
               (t.TaskID || "").toLowerCase().indexOf(search) !== -1 ||
               (t.AssignedTo || "").toLowerCase().indexOf(search) !== -1 ||
               (t.AssignedBy || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      tasks = tasks.filter(function(t) {
        return (t.Status || "").toLowerCase() === statusFilter;
      });
    }

    if (priorityFilter) {
      tasks = tasks.filter(function(t) {
        return (t.Priority || "").toLowerCase() === priorityFilter;
      });
    }

    if (departmentFilter) {
      tasks = tasks.filter(function(t) {
        return (t.Department || "").toLowerCase() === departmentFilter;
      });
    }

    if (assignedToFilter) {
      tasks = tasks.filter(function(t) {
        return (t.AssignedTo || "").toLowerCase().indexOf(assignedToFilter) !== -1;
      });
    }

    // Sort by CreatedDate descending (newest first)
    tasks.sort(function(a, b) {
      return new Date(b.CreatedDate || 0).getTime() - new Date(a.CreatedDate || 0).getTime();
    });

    var total = tasks.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = tasks.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Tasks Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CREATE TASK
 * ?action=admintaskcreate&session=TOKEN&title=...&description=...&department=...&category=...&priority=...&assignedTo=...&dueDate=...
 * ============================================================
 */

function createAdminTask(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var title = (e.parameter.title || "").trim();
    if (!title) return error("Task title is required");

    var description = (e.parameter.description || "").trim();
    var department = (e.parameter.department || "").trim();
    var category = (e.parameter.category || "").trim();
    var priority = (e.parameter.priority || "Medium").trim();
    var assignedTo = (e.parameter.assignedTo || "").trim();
    var dueDate = (e.parameter.dueDate || "").trim();

    // Validate priority
    var validPriorities = ["Low", "Medium", "High", "Critical"];
    if (validPriorities.indexOf(priority) === -1) {
      priority = "Medium";
    }

    // Generate Task ID
    var taskId = generateTaskId();

    var now = new Date();
    var createdDate = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    var sheet = getSheet(CONFIG.SHEETS.TASKS);
    if (!sheet) return error("Tasks sheet not found");

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var row = [];
    headers.forEach(function(h) {
      switch (h) {
        case "TaskID": row.push(taskId); break;
        case "Title": row.push(title); break;
        case "Description": row.push(description); break;
        case "Department": row.push(department); break;
        case "Category": row.push(category); break;
        case "Priority": row.push(priority); break;
        case "AssignedTo": row.push(assignedTo); break;
        case "AssignedBy": row.push(sessionResult.adminId); break;
        case "DueDate": row.push(dueDate); break;
        case "CreatedDate": row.push(createdDate); break;
        case "Status": row.push("Pending"); break;
        case "Remarks": row.push(""); break;
        default: row.push("");
      }
    });

    sheet.appendRow(row);

    // Log to task history
    logTaskHistory(taskId, "Created", "Task created by " + sessionResult.adminId, sessionResult.adminId);

    return success({ taskId: taskId }, "Task created successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UPDATE TASK
 * ?action=admintaskupdate&session=TOKEN&taskId=T001&title=...&status=...&priority=...&assignedTo=...&remarks=...
 * ============================================================
 */

function updateAdminTask(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var taskId = (e.parameter.taskId || "").trim();
    if (!taskId) return error("taskId required");

    var updates = {};
    var fields = ["Title", "Description", "Department", "Category", "Priority", "AssignedTo", "DueDate", "Status", "Remarks"];

    fields.forEach(function(f) {
      var paramKey = f.charAt(0).toLowerCase() + f.slice(1);
      var val = e.parameter[paramKey];
      if (val !== undefined && val !== null) {
        updates[f] = String(val).trim();
      }
    });

    if (Object.keys(updates).length === 0) {
      return error("No fields to update");
    }

    // Validate status if provided
    if (updates.Status) {
      var validStatuses = ["Pending", "Assigned", "In Progress", "Waiting", "Completed", "Rejected", "Cancelled", "Overdue"];
      if (validStatuses.indexOf(updates.Status) === -1) {
        return error("Invalid status. Must be: " + validStatuses.join(", "));
      }
    }

    // Validate priority if provided
    if (updates.Priority) {
      var validPriorities = ["Low", "Medium", "High", "Critical"];
      if (validPriorities.indexOf(updates.Priority) === -1) {
        return error("Invalid priority. Must be: " + validPriorities.join(", "));
      }
    }

    var updated = updateRow(CONFIG.SHEETS.TASKS, "TaskID", taskId, updates);
    if (!updated) return error("Task not found");

    // Log to history
    var changeSummary = [];
    for (var key in updates) {
      changeSummary.push(key + ": " + updates[key]);
    }
    logTaskHistory(taskId, "Updated", "Task updated: " + changeSummary.join(", "), sessionResult.adminId);

    return success({ taskId: taskId, updates: updates }, "Task updated successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET TASK DETAIL
 * ?action=admintaskdetail&session=TOKEN&taskId=T001
 * ============================================================
 */

function getAdminTaskDetail(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var taskId = (e.parameter.taskId || "").trim();
    if (!taskId) return error("taskId required");

    var task = getRowById(CONFIG.SHEETS.TASKS, "TaskID", taskId);
    if (!task) return error("Task not found");

    // Get task history
    var history = getTaskHistory(taskId);

    return success({
      task: task,
      history: history
    }, "Task Detail Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * DELETE TASK
 * ?action=admintaskdelete&session=TOKEN&taskId=T001
 * ============================================================
 */

function deleteAdminTask(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var taskId = (e.parameter.taskId || "").trim();
    if (!taskId) return error("taskId required");

    var updated = updateRow(CONFIG.SHEETS.TASKS, "TaskID", taskId, { Status: "Deleted" });
    if (!updated) return error("Task not found");

    logTaskHistory(taskId, "Deleted", "Task deleted by " + sessionResult.adminId, sessionResult.adminId);

    return success({ taskId: taskId }, "Task deleted");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * DUPLICATE TASK
 * ?action=admintaskduplicate&session=TOKEN&taskId=T001
 * ============================================================
 */

function duplicateAdminTask(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var taskId = (e.parameter.taskId || "").trim();
    if (!taskId) return error("taskId required");

    var original = getRowById(CONFIG.SHEETS.TASKS, "TaskID", taskId);
    if (!original) return error("Task not found");

    var newTaskId = generateTaskId();
    var now = new Date();
    var createdDate = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    var sheet = getSheet(CONFIG.SHEETS.TASKS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var row = [];
    headers.forEach(function(h) {
      switch (h) {
        case "TaskID": row.push(newTaskId); break;
        case "CreatedDate": row.push(createdDate); break;
        case "Status": row.push("Pending"); break;
        case "Remarks": row.push("Duplicated from " + taskId); break;
        default:
          row.push(original[h] !== undefined ? original[h] : "");
      }
    });

    sheet.appendRow(row);

    logTaskHistory(newTaskId, "Created", "Duplicated from " + taskId + " by " + sessionResult.adminId, sessionResult.adminId);

    return success({ taskId: newTaskId, originalTaskId: taskId }, "Task duplicated successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET TASK HISTORY
 * ?action=admintaskhistory&session=TOKEN&taskId=T001
 * ============================================================
 */

function getAdminTaskHistory(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var taskId = (e.parameter.taskId || "").trim();
    if (!taskId) return error("taskId required");

    var history = getTaskHistory(taskId);

    return success({
      taskId: taskId,
      history: history
    }, "Task History Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET TASK ASSIGNEES (Workforce list for assignment dropdown)
 * ?action=admintaskassignees&session=TOKEN
 * ============================================================
 */

function getAdminTaskAssignees(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var admins = getSheetData(CONFIG.SHEETS.ADMINS);

    var assignees = admins.map(function(a) {
      return {
        adminId: a.AdminID,
        fullName: a.FullName || "",
        role: a.Role || "",
        department: a.Department || "",
        designation: a.Designation || ""
      };
    });

    return success(assignees, "Assignees Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET TASK DEPARTMENTS
 * ?action=admintaskdepartments&session=TOKEN
 * ============================================================
 */

function getAdminTaskDepartments(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var tasks = getSheetData(CONFIG.SHEETS.TASKS);
    var depts = {};

    tasks.forEach(function(t) {
      var d = (t.Department || "").trim();
      if (d) depts[d] = (depts[d] || 0) + 1;
    });

    // Also add from Admins sheet
    var admins = getSheetData(CONFIG.SHEETS.ADMINS);
    admins.forEach(function(a) {
      var d = (a.Department || "").trim();
      if (d) depts[d] = (depts[d] || 0) + 1;
    });

    var result = Object.keys(depts).map(function(d) {
      return { department: d, count: depts[d] };
    }).sort(function(a, b) { return b.count - a.count; });

    return success(result, "Departments Loaded");

  } catch (err) {
    return exception(err);
  }
}


// ============================================================
// INTERNAL HELPERS
// ============================================================


/**
 * ============================================================
 * GENERATE TASK ID
 * ============================================================
 */

function generateTaskId() {
  var prefix = "T";
  var timestamp = new Date().getTime().toString(36).toUpperCase();
  var random = Math.floor(Math.random() * 10000).toString(36).toUpperCase();
  return prefix + timestamp + random;
}


/**
 * ============================================================
 * LOG TASK HISTORY
 * ============================================================
 */

function logTaskHistory(taskId, action, description, adminId) {
  try {

    var sheet = getSheet(CONFIG.SHEETS.TASK_HISTORY);
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data.length > 0 ? data[0] : [];

    // Auto-create headers if empty
    if (headers.length === 0) {
      headers = ["TaskID", "Action", "Description", "AdminID", "Timestamp"];
      sheet.appendRow(headers);
    }

    var now = new Date();
    var timestamp = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    var row = [];
    headers.forEach(function(h) {
      switch (h) {
        case "TaskID": row.push(taskId); break;
        case "Action": row.push(action); break;
        case "Description": row.push(description); break;
        case "AdminID": row.push(adminId || ""); break;
        case "Timestamp": row.push(timestamp); break;
        default: row.push("");
      }
    });

    sheet.appendRow(row);

  } catch (err) {
    console.error("Failed to log task history: " + err);
  }
}


/**
 * ============================================================
 * GET TASK HISTORY
 * ============================================================
 */

function getTaskHistory(taskId) {
  try {

    var history = getSheetData(CONFIG.SHEETS.TASK_HISTORY);

    var filtered = history.filter(function(h) {
      return String(h.TaskID || "").trim() === String(taskId).trim();
    });

    // Sort by timestamp descending
    filtered.sort(function(a, b) {
      return new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime();
    });

    return filtered;

  } catch (err) {
    return [];
  }
}