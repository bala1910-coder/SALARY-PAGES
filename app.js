const STORAGE_KEYS = {
  employees: "employees",
  attendanceRecords: "attendanceRecords",
  leaveRequests: "leaveRequests",
  salaryRuns: "salaryRuns",
  appSettings: "appSettings"
};

const DEFAULT_SETTINGS = {
  stdDailyHours: 8,
  overtimeMultiplier: 1.5,
  latePenaltyPerMinute: 1,
  pfPercent: 12,
  workingDaysPerMonth: 26
};

const state = {
  employees: [],
  attendanceRecords: [],
  leaveRequests: [],
  salaryRuns: [],
  appSettings: { ...DEFAULT_SETTINGS },
  reportRows: []
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  loadState();
  initializeDefaults();
  renderAll();
});

function cacheElements() {
  const ids = [
    "employeeForm", "employeeInternalId", "employeeId", "employeeName", "employeePhone", "employeeEmail",
    "employeeDepartment", "employeeDesignation", "employeeJoinDate", "salaryType", "baseSalary",
    "leaveSick", "leaveCasual", "leavePaid", "resetEmployeeForm", "employeeTableBody",
    "attendanceForm", "attendanceEmployee", "attendanceDate", "checkIn", "checkOut", "totalHours", "overtimeHours",
    "lateMinutes", "earlyLeaveMinutes", "attendanceTableBody",
    "leaveForm", "leaveEmployee", "leaveType", "leaveDate", "leaveDuration", "leaveReason", "leaveTableBody",
    "salaryRunForm", "salaryMonth", "salaryEmployeeFilter", "manualBonus", "manualDeduction", "salaryTableBody",
    "payslipMonth", "payslipEmployee", "viewPayslipBtn", "printPayslipBtn", "payslipView",
    "reportMonth", "reportHead", "reportBody", "exportReportCsv",
    "settingsForm", "stdDailyHours", "overtimeMultiplier", "latePenaltyPerMinute", "pfPercent", "workingDaysPerMonth",
    "metricEmployees", "metricAttendanceToday", "metricPendingLeaves", "metricSalaryRuns", "toast"
  ];
  ids.forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  el.employeeForm.addEventListener("submit", onSaveEmployee);
  el.resetEmployeeForm.addEventListener("click", resetEmployeeForm);

  el.attendanceForm.addEventListener("submit", onSaveAttendance);
  el.checkIn.addEventListener("change", fillComputedHours);
  el.checkOut.addEventListener("change", fillComputedHours);

  el.leaveForm.addEventListener("submit", onSubmitLeave);
  el.salaryRunForm.addEventListener("submit", onRunSalary);

  el.viewPayslipBtn.addEventListener("click", renderPayslipFromSelection);
  el.printPayslipBtn.addEventListener("click", () => window.print());

  document.querySelectorAll("#reports button[data-report]").forEach((btn) => {
    btn.addEventListener("click", () => buildReport(btn.dataset.report));
  });
  el.exportReportCsv.addEventListener("click", exportReportCsv);

  el.settingsForm.addEventListener("submit", onSaveSettings);
}

function loadState() {
  state.employees = readStorage(STORAGE_KEYS.employees, []);
  state.attendanceRecords = readStorage(STORAGE_KEYS.attendanceRecords, []);
  state.leaveRequests = readStorage(STORAGE_KEYS.leaveRequests, []);
  state.salaryRuns = readStorage(STORAGE_KEYS.salaryRuns, []);
  state.appSettings = { ...DEFAULT_SETTINGS, ...readStorage(STORAGE_KEYS.appSettings, {}) };
}

function initializeDefaults() {
  if (!el.salaryMonth.value) el.salaryMonth.value = currentMonth();
  if (!el.reportMonth.value) el.reportMonth.value = currentMonth();
  if (!el.attendanceDate.value) el.attendanceDate.value = currentDate();
  if (!el.leaveDate.value) el.leaveDate.value = currentDate();
  syncSettingsForm();
}

function renderAll() {
  renderEmployeeTable();
  renderAttendanceTable();
  renderLeaveTable();
  renderSalaryTable();
  renderSelectors();
  renderMetrics();
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
}

function onSaveEmployee(event) {
  event.preventDefault();
  const internalId = el.employeeInternalId.value || uid("INT");
  const empId = el.employeeId.value.trim();
  const duplicate = state.employees.find((e) => e.employeeId === empId && e.internalId !== internalId);
  if (duplicate) return toast("Employee ID must be unique");

  const employee = {
    internalId,
    employeeId: empId,
    name: el.employeeName.value.trim(),
    phone: el.employeePhone.value.trim(),
    email: el.employeeEmail.value.trim(),
    department: el.employeeDepartment.value.trim(),
    designation: el.employeeDesignation.value.trim(),
    joiningDate: el.employeeJoinDate.value,
    salaryType: el.salaryType.value,
    baseSalary: num(el.baseSalary.value),
    leaveBalance: {
      sick: num(el.leaveSick.value),
      casual: num(el.leaveCasual.value),
      paid: num(el.leavePaid.value)
    }
  };

  const idx = state.employees.findIndex((e) => e.internalId === internalId);
  if (idx >= 0) state.employees[idx] = employee;
  else state.employees.push(employee);

  writeStorage(STORAGE_KEYS.employees, state.employees);
  resetEmployeeForm();
  renderAll();
  toast("Employee saved");
}

function resetEmployeeForm() {
  el.employeeForm.reset();
  el.employeeInternalId.value = "";
  el.leaveSick.value = "6";
  el.leaveCasual.value = "6";
  el.leavePaid.value = "12";
}

function editEmployee(internalId) {
  const e = state.employees.find((x) => x.internalId === internalId);
  if (!e) return;
  el.employeeInternalId.value = e.internalId;
  el.employeeId.value = e.employeeId;
  el.employeeName.value = e.name;
  el.employeePhone.value = e.phone;
  el.employeeEmail.value = e.email;
  el.employeeDepartment.value = e.department;
  el.employeeDesignation.value = e.designation;
  el.employeeJoinDate.value = e.joiningDate;
  el.salaryType.value = e.salaryType;
  el.baseSalary.value = e.baseSalary;
  el.leaveSick.value = e.leaveBalance.sick;
  el.leaveCasual.value = e.leaveBalance.casual;
  el.leavePaid.value = e.leaveBalance.paid;
  switchTab("employees");
}

function deleteEmployee(internalId) {
  if (!confirm("Delete employee?")) return;
  state.employees = state.employees.filter((e) => e.internalId !== internalId);
  state.attendanceRecords = state.attendanceRecords.filter((r) => r.employeeInternalId !== internalId);
  state.leaveRequests = state.leaveRequests.filter((r) => r.employeeInternalId !== internalId);
  state.salaryRuns = state.salaryRuns.filter((r) => r.employeeInternalId !== internalId);
  persistAll();
  renderAll();
}

function onSaveAttendance(event) {
  event.preventDefault();
  const employeeInternalId = el.attendanceEmployee.value;
  if (!employeeInternalId) return toast("Select employee");
  const totalHours = el.totalHours.value ? num(el.totalHours.value) : calculateHours(el.checkIn.value, el.checkOut.value);
  const recordId = `${employeeInternalId}_${el.attendanceDate.value}`;

  const rec = {
    id: recordId,
    employeeInternalId,
    date: el.attendanceDate.value,
    checkIn: el.checkIn.value,
    checkOut: el.checkOut.value,
    totalHours,
    overtimeHours: num(el.overtimeHours.value),
    lateMinutes: num(el.lateMinutes.value),
    earlyLeaveMinutes: num(el.earlyLeaveMinutes.value)
  };

  const idx = state.attendanceRecords.findIndex((r) => r.id === recordId);
  if (idx >= 0) state.attendanceRecords[idx] = rec;
  else state.attendanceRecords.push(rec);

  writeStorage(STORAGE_KEYS.attendanceRecords, state.attendanceRecords);
  el.attendanceForm.reset();
  el.attendanceDate.value = currentDate();
  renderAll();
  toast("Attendance saved");
}

function fillComputedHours() {
  if (el.checkIn.value && el.checkOut.value) {
    el.totalHours.value = calculateHours(el.checkIn.value, el.checkOut.value).toString();
  }
}

function deleteAttendance(id) {
  state.attendanceRecords = state.attendanceRecords.filter((r) => r.id !== id);
  writeStorage(STORAGE_KEYS.attendanceRecords, state.attendanceRecords);
  renderAll();
}

function onSubmitLeave(event) {
  event.preventDefault();
  const employeeInternalId = el.leaveEmployee.value;
  const employee = state.employees.find((e) => e.internalId === employeeInternalId);
  if (!employee) return toast("Select employee");

  state.leaveRequests.push({
    id: uid("LR"),
    employeeInternalId,
    type: el.leaveType.value,
    date: el.leaveDate.value,
    duration: el.leaveDuration.value,
    reason: el.leaveReason.value.trim(),
    status: "pending"
  });
  writeStorage(STORAGE_KEYS.leaveRequests, state.leaveRequests);
  el.leaveForm.reset();
  el.leaveDate.value = currentDate();
  renderLeaveTable();
  renderMetrics();
  toast("Leave request submitted");
}

function setLeaveStatus(id, status) {
  const req = state.leaveRequests.find((r) => r.id === id);
  if (!req) return;
  req.status = status;
  if (status === "approved") {
    const e = state.employees.find((x) => x.internalId === req.employeeInternalId);
    if (e) {
      const days = req.duration === "half" ? 0.5 : 1;
      e.leaveBalance[req.type] = Math.max(0, num(e.leaveBalance[req.type]) - days);
    }
    writeStorage(STORAGE_KEYS.employees, state.employees);
  }
  writeStorage(STORAGE_KEYS.leaveRequests, state.leaveRequests);
  renderAll();
}

function onRunSalary(event) {
  event.preventDefault();
  const month = el.salaryMonth.value;
  if (!month) return toast("Select month");
  const targetIds = el.salaryEmployeeFilter.value === "all"
    ? state.employees.map((e) => e.internalId)
    : [el.salaryEmployeeFilter.value];
  if (!targetIds.length) return toast("No employees");

  const monthPrefix = `${month}-`;
  targetIds.forEach((employeeInternalId) => {
    const employee = state.employees.find((e) => e.internalId === employeeInternalId);
    if (!employee) return;
    const attendance = state.attendanceRecords.filter((r) => r.employeeInternalId === employeeInternalId && r.date.startsWith(monthPrefix));
    if (!attendance.length) return;

    const approvedLeaves = state.leaveRequests.filter((l) =>
      l.employeeInternalId === employeeInternalId && l.date.startsWith(monthPrefix) && l.status === "approved"
    );

    const lateMinutes = attendance.reduce((a, c) => a + num(c.lateMinutes), 0);
    const overtimeHours = attendance.reduce((a, c) => a + num(c.overtimeHours), 0);
    const workedDays = attendance.length;
    const leaveDays = approvedLeaves.reduce((a, c) => a + (c.duration === "half" ? 0.5 : 1), 0);
    const unpaidLeaveDays = calcUnpaidLeaveDays(employee, approvedLeaves);

    const dayRate = employee.salaryType === "monthly"
      ? employee.baseSalary / num(state.appSettings.workingDaysPerMonth)
      : employee.salaryType === "daily"
        ? employee.baseSalary
        : employee.baseSalary * num(state.appSettings.stdDailyHours);

    const hourlyRate = employee.salaryType === "hourly"
      ? employee.baseSalary
      : dayRate / num(state.appSettings.stdDailyHours);

    const basicEarning = employee.salaryType === "monthly"
      ? employee.baseSalary
      : employee.salaryType === "daily"
        ? dayRate * workedDays
        : hourlyRate * attendance.reduce((a, c) => a + num(c.totalHours), 0);

    const overtimePay = overtimeHours * hourlyRate * num(state.appSettings.overtimeMultiplier);
    const lateDeduction = lateMinutes * num(state.appSettings.latePenaltyPerMinute);
    const leaveDeduction = unpaidLeaveDays * dayRate;
    const pfDeduction = basicEarning * (num(state.appSettings.pfPercent) / 100);
    const bonus = num(el.manualBonus.value);
    const manualDeduction = num(el.manualDeduction.value);

    const earnings = basicEarning + overtimePay + bonus;
    const deductions = lateDeduction + leaveDeduction + pfDeduction + manualDeduction;
    const netSalary = Math.max(0, earnings - deductions);

    const salaryRecord = {
      id: `${employeeInternalId}_${month}`,
      month,
      employeeInternalId,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      breakdown: {
        workedDays,
        leaveDays,
        unpaidLeaveDays,
        totalHours: attendance.reduce((a, c) => a + num(c.totalHours), 0),
        overtimeHours,
        basicEarning,
        overtimePay,
        bonus,
        lateDeduction,
        leaveDeduction,
        pfDeduction,
        manualDeduction,
        earnings,
        deductions,
        netSalary
      },
      createdAt: new Date().toISOString()
    };

    const idx = state.salaryRuns.findIndex((r) => r.id === salaryRecord.id);
    if (idx >= 0) state.salaryRuns[idx] = salaryRecord;
    else state.salaryRuns.push(salaryRecord);
  });

  writeStorage(STORAGE_KEYS.salaryRuns, state.salaryRuns);
  renderAll();
  toast("Salary generated");
}

function calcUnpaidLeaveDays(employee, approvedLeaves) {
  const used = { sick: 0, casual: 0, paid: 0 };
  approvedLeaves.forEach((l) => { used[l.type] += l.duration === "half" ? 0.5 : 1; });
  return Math.max(0, used.sick - employee.leaveBalance.sick) +
    Math.max(0, used.casual - employee.leaveBalance.casual) +
    Math.max(0, used.paid - employee.leaveBalance.paid);
}

function renderPayslipFromSelection() {
  const month = el.payslipMonth.value;
  const employeeInternalId = el.payslipEmployee.value;
  const rec = state.salaryRuns.find((r) => r.month === month && r.employeeInternalId === employeeInternalId);
  if (!rec) {
    el.payslipView.innerHTML = "<p>No payslip found for selected month and employee.</p>";
    return;
  }
  el.payslipView.innerHTML = `
    <h3>Payslip - ${rec.month}</h3>
    <p><strong>Employee:</strong> ${rec.employeeName} (${rec.employeeId})</p>
    <div class="grid payslip-grid">
      <article class="card">
        <h4>Earnings</h4>
        <p>Basic: ${money(rec.breakdown.basicEarning)}</p>
        <p>Overtime: ${money(rec.breakdown.overtimePay)}</p>
        <p>Bonus: ${money(rec.breakdown.bonus)}</p>
        <p><strong>Total Earnings: ${money(rec.breakdown.earnings)}</strong></p>
      </article>
      <article class="card">
        <h4>Deductions</h4>
        <p>Late: ${money(rec.breakdown.lateDeduction)}</p>
        <p>Leave: ${money(rec.breakdown.leaveDeduction)}</p>
        <p>PF: ${money(rec.breakdown.pfDeduction)}</p>
        <p>Manual: ${money(rec.breakdown.manualDeduction)}</p>
        <p><strong>Total Deductions: ${money(rec.breakdown.deductions)}</strong></p>
      </article>
    </div>
    <h3>Net Salary: ${money(rec.breakdown.netSalary)}</h3>
  `;
}

function buildReport(type) {
  const month = el.reportMonth.value;
  const monthPrefix = month ? `${month}-` : "";
  const rows = [];
  let headers = [];

  if (type === "attendance") {
    headers = ["Date", "Employee", "In", "Out", "TotalHours", "OT"];
    state.attendanceRecords
      .filter((r) => !monthPrefix || r.date.startsWith(monthPrefix))
      .forEach((r) => {
        rows.push([r.date, employeeName(r.employeeInternalId), r.checkIn, r.checkOut, r.totalHours, r.overtimeHours]);
      });
  } else if (type === "salary") {
    headers = ["Month", "Employee", "Earnings", "Deductions", "NetSalary"];
    state.salaryRuns
      .filter((s) => !month || s.month === month)
      .forEach((s) => rows.push([s.month, s.employeeName, money(s.breakdown.earnings), money(s.breakdown.deductions), money(s.breakdown.netSalary)]));
  } else if (type === "overtime") {
    headers = ["Date", "Employee", "OvertimeHours"];
    state.attendanceRecords
      .filter((r) => !monthPrefix || r.date.startsWith(monthPrefix))
      .forEach((r) => rows.push([r.date, employeeName(r.employeeInternalId), r.overtimeHours]));
  } else {
    headers = ["Date", "Employee", "LateMinutes", "EarlyLeaveMinutes", "Status"];
    state.attendanceRecords
      .filter((r) => !monthPrefix || r.date.startsWith(monthPrefix))
      .forEach((r) => {
        const status = r.totalHours > 0 ? "Present" : "Absent";
        rows.push([r.date, employeeName(r.employeeInternalId), r.lateMinutes, r.earlyLeaveMinutes, status]);
      });
  }

  state.reportRows = [headers, ...rows];
  el.reportHead.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  el.reportBody.innerHTML = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
}

function exportReportCsv() {
  if (!state.reportRows.length) return toast("Generate a report first");
  const csv = state.reportRows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `report_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function onSaveSettings(event) {
  event.preventDefault();
  state.appSettings = {
    stdDailyHours: num(el.stdDailyHours.value),
    overtimeMultiplier: num(el.overtimeMultiplier.value),
    latePenaltyPerMinute: num(el.latePenaltyPerMinute.value),
    pfPercent: num(el.pfPercent.value),
    workingDaysPerMonth: num(el.workingDaysPerMonth.value)
  };
  writeStorage(STORAGE_KEYS.appSettings, state.appSettings);
  toast("Settings saved");
}

function renderEmployeeTable() {
  el.employeeTableBody.innerHTML = state.employees.map((e) => `
    <tr>
      <td>${e.employeeId}</td>
      <td>${e.name}</td>
      <td>${e.department}</td>
      <td>${e.designation}</td>
      <td>${e.salaryType}</td>
      <td>${money(e.baseSalary)}</td>
      <td>
        <button onclick="editEmployee('${e.internalId}')">Edit</button>
        <button onclick="deleteEmployee('${e.internalId}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function renderAttendanceTable() {
  const sorted = [...state.attendanceRecords].sort((a, b) => b.date.localeCompare(a.date));
  el.attendanceTableBody.innerHTML = sorted.map((r) => `
    <tr>
      <td>${r.date}</td><td>${employeeName(r.employeeInternalId)}</td><td>${r.checkIn}</td><td>${r.checkOut}</td>
      <td>${r.totalHours}</td><td>${r.overtimeHours}</td><td>${r.lateMinutes}/${r.earlyLeaveMinutes}</td>
      <td><button onclick="deleteAttendance('${r.id}')">Delete</button></td>
    </tr>
  `).join("");
}

function renderLeaveTable() {
  el.leaveTableBody.innerHTML = state.leaveRequests.map((r) => `
    <tr>
      <td>${r.date}</td><td>${employeeName(r.employeeInternalId)}</td><td>${r.type}</td><td>${r.duration}</td>
      <td>${r.status}</td><td>${r.reason || "-"}</td>
      <td>
        <button onclick="setLeaveStatus('${r.id}','approved')">Approve</button>
        <button onclick="setLeaveStatus('${r.id}','rejected')">Reject</button>
      </td>
    </tr>
  `).join("");
}

function renderSalaryTable() {
  const sorted = [...state.salaryRuns].sort((a, b) => b.month.localeCompare(a.month));
  el.salaryTableBody.innerHTML = sorted.map((s) => `
    <tr>
      <td>${s.month}</td><td>${s.employeeName}</td>
      <td>${money(s.breakdown.earnings)}</td><td>${money(s.breakdown.deductions)}</td>
      <td>${money(s.breakdown.netSalary)}</td>
      <td><button onclick="selectPayslip('${s.month}','${s.employeeInternalId}')">Open Payslip</button></td>
    </tr>
  `).join("");
}

function renderSelectors() {
  const employeeOptions = ['<option value="">Select</option>'].concat(
    state.employees.map((e) => `<option value="${e.internalId}">${e.employeeId} - ${e.name}</option>`)
  ).join("");
  el.attendanceEmployee.innerHTML = employeeOptions;
  el.leaveEmployee.innerHTML = employeeOptions;
  el.payslipEmployee.innerHTML = employeeOptions;

  el.salaryEmployeeFilter.innerHTML = '<option value="all">All Employees</option>' +
    state.employees.map((e) => `<option value="${e.internalId}">${e.employeeId} - ${e.name}</option>`).join("");

  const months = [...new Set(state.salaryRuns.map((s) => s.month))].sort().reverse();
  el.payslipMonth.innerHTML = months.map((m) => `<option value="${m}">${m}</option>`).join("");
}

function renderMetrics() {
  const today = currentDate();
  el.metricEmployees.textContent = state.employees.length;
  el.metricAttendanceToday.textContent = state.attendanceRecords.filter((r) => r.date === today).length;
  el.metricPendingLeaves.textContent = state.leaveRequests.filter((r) => r.status === "pending").length;
  el.metricSalaryRuns.textContent = state.salaryRuns.length;
}

function syncSettingsForm() {
  el.stdDailyHours.value = state.appSettings.stdDailyHours;
  el.overtimeMultiplier.value = state.appSettings.overtimeMultiplier;
  el.latePenaltyPerMinute.value = state.appSettings.latePenaltyPerMinute;
  el.pfPercent.value = state.appSettings.pfPercent;
  el.workingDaysPerMonth.value = state.appSettings.workingDaysPerMonth;
}

function selectPayslip(month, employeeInternalId) {
  switchTab("payslip");
  el.payslipMonth.value = month;
  el.payslipEmployee.value = employeeInternalId;
  renderPayslipFromSelection();
}

function persistAll() {
  writeStorage(STORAGE_KEYS.employees, state.employees);
  writeStorage(STORAGE_KEYS.attendanceRecords, state.attendanceRecords);
  writeStorage(STORAGE_KEYS.leaveRequests, state.leaveRequests);
  writeStorage(STORAGE_KEYS.salaryRuns, state.salaryRuns);
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function calculateHours(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = Math.max(0, endMin - startMin);
  return Math.round((diff / 60) * 100) / 100;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function employeeName(internalId) {
  return state.employees.find((e) => e.internalId === internalId)?.name || "Unknown";
}

function money(value) {
  return `Rs ${num(value).toFixed(2)}`;
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function csvCell(value) {
  const txt = String(value ?? "");
  if (txt.includes(",") || txt.includes("\"") || txt.includes("\n")) {
    return `"${txt.replaceAll("\"", "\"\"")}"`;
  }
  return txt;
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  setTimeout(() => el.toast.classList.remove("show"), 1800);
}

window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.deleteAttendance = deleteAttendance;
window.setLeaveStatus = setLeaveStatus;
window.selectPayslip = selectPayslip;
