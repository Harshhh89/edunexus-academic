const adminTimetableState = { academicYears: [], classes: [], subjects: [], teachers: [], weekdays: [], entries: [] };
const adminTimetableAlert = document.querySelector('#adminTimetableAlert');
const adminTimetableForm = document.querySelector('#adminTimetableForm');
const ttAcademicYearId = document.querySelector('#ttAcademicYearId');
const ttClassId = document.querySelector('#ttClassId');
const ttDivisionId = document.querySelector('#ttDivisionId');
const ttWeekday = document.querySelector('#ttWeekday');
const ttSubjectId = document.querySelector('#ttSubjectId');
const ttTeacherId = document.querySelector('#ttTeacherId');
const adminTimetableTableBody = document.querySelector('#adminTimetableTableBody');

function adminHeaders(includeJson = false) {
  const headers = { Authorization: `Bearer ${localStorage.getItem('edunexusToken')}` };
  if (includeJson) headers['Content-Type'] = 'application/json';
  return headers;
}

function showAdminTimetableAlert(message, type = 'success') {
  adminTimetableAlert.className = `alert alert-${type}`;
  adminTimetableAlert.textContent = message;
}

function fillSelect(select, items, labelBuilder, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id || item;
    option.textContent = labelBuilder(item);
    select.appendChild(option);
  });
}

function syncAdminTimetableDivisions() {
  const selectedClass = adminTimetableState.classes.find((item) => item.id === ttClassId.value);
  const classSubjects = adminTimetableState.subjects
    .filter((item) => item.class?.id === ttClassId.value)
    .map((item) => item.subject)
    .filter((subject) => Boolean(subject?.id));

  fillSelect(ttDivisionId, selectedClass?.divisions || [], (item) => item.name, 'Select division');
  fillSelect(ttSubjectId, classSubjects, (item) => item.code ? `${item.name} (${item.code})` : item.name, ttClassId.value ? 'Select subject' : 'Select class first');
}

async function deleteTimetableEntry(id) {
  const response = await fetch(`/api/timetable/admin/entries/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to delete timetable entry.');
  return result;
}

function renderAdminTimetable() {
  fillSelect(ttAcademicYearId, adminTimetableState.academicYears, (item) => item.is_active ? `${item.name} (Active)` : item.name, 'Select academic year');
  fillSelect(ttClassId, adminTimetableState.classes, (item) => item.name, 'Select class');
  fillSelect(ttTeacherId, adminTimetableState.teachers, (item) => item.user.full_name, 'Optional teacher');
  fillSelect(ttWeekday, adminTimetableState.weekdays, (item) => item.charAt(0).toUpperCase() + item.slice(1), 'Select day');
  syncAdminTimetableDivisions();

  adminTimetableTableBody.innerHTML = adminTimetableState.entries.map((entry) => `
    <tr>
      <td>${entry.class?.name || '-'} - ${entry.division?.name || '-'}</td>
      <td>${entry.weekday}</td>
      <td>${entry.period_number}</td>
      <td>${entry.start_time} - ${entry.end_time}</td>
      <td>${entry.subject?.name || '-'}</td>
      <td>${entry.teacher?.user?.full_name || '-'}</td>
      <td>${entry.room_label || '-'}</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger delete-timetable-btn" data-id="${entry.id}">Delete</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.delete-timetable-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Delete this timetable entry?')) {
        return;
      }

      try {
        const result = await deleteTimetableEntry(button.dataset.id);
        await loadAdminTimetable();
        showAdminTimetableAlert(result.message);
      } catch (error) {
        showAdminTimetableAlert(error.message, 'danger');
      }
    });
  });
}

async function loadAdminTimetable() {
  const response = await fetch('/api/timetable/admin/bootstrap', { headers: adminHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load timetable.');
  Object.assign(adminTimetableState, result);
  renderAdminTimetable();
}

ttClassId.addEventListener('change', syncAdminTimetableDivisions);

adminTimetableForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/api/timetable/admin/entries', {
      method: 'POST',
      headers: adminHeaders(true),
      body: JSON.stringify({
        academicYearId: ttAcademicYearId.value,
        classId: ttClassId.value,
        divisionId: ttDivisionId.value,
        weekday: ttWeekday.value,
        periodNumber: document.querySelector('#ttPeriodNumber').value,
        subjectId: ttSubjectId.value,
        teacherId: ttTeacherId.value || null,
        startTime: document.querySelector('#ttStartTime').value,
        endTime: document.querySelector('#ttEndTime').value,
        roomLabel: document.querySelector('#ttRoomLabel').value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to create timetable entry.');
    adminTimetableForm.reset();
    await loadAdminTimetable();
    showAdminTimetableAlert(result.message);
  } catch (error) {
    showAdminTimetableAlert(error.message, 'danger');
  }
});

loadAdminTimetable().catch((error) => showAdminTimetableAlert(error.message, 'danger'));
