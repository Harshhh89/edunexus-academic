const teacherAttendanceState = {
  assignments: [],
  selectedAssignment: null,
  students: [],
};

const teacherAttendanceAlert = document.querySelector('#teacherAttendanceAlert');
const teacherAttendanceFilterForm = document.querySelector('#teacherAttendanceFilterForm');
const teacherAssignmentSelect = document.querySelector('#teacherAssignmentId');
const teacherSubjectSelect = document.querySelector('#teacherSubjectId');
const attendanceDateInput = document.querySelector('#attendanceDate');
const teacherAttendanceTableBody = document.querySelector('#teacherAttendanceTableBody');
const saveAttendanceButton = document.querySelector('#saveAttendanceButton');

attendanceDateInput.value = new Date().toISOString().split('T')[0];

function teacherHeaders(includeJson = false) {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem('edunexusToken')}`,
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function showTeacherAlert(message, type = 'success') {
  teacherAttendanceAlert.className = `alert alert-${type}`;
  teacherAttendanceAlert.textContent = message;
}

function hideTeacherAlert() {
  teacherAttendanceAlert.className = 'alert d-none';
  teacherAttendanceAlert.textContent = '';
}

function renderTeacherAssignments() {
  teacherAssignmentSelect.innerHTML = '<option value="">Select assigned class</option>';

  teacherAttendanceState.assignments.forEach((assignment, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${assignment.class.name} - ${assignment.division.name}`;
    teacherAssignmentSelect.appendChild(option);
  });
}

function syncTeacherSubjectOptions() {
  const selectedIndex = teacherAssignmentSelect.value;
  teacherAttendanceState.selectedAssignment = selectedIndex === ''
    ? null
    : teacherAttendanceState.assignments[Number(selectedIndex)];

  teacherSubjectSelect.innerHTML = '<option value="">General attendance</option>';

  if (!teacherAttendanceState.selectedAssignment) {
    return;
  }

  teacherAttendanceState.selectedAssignment.subjects.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.code ? `${subject.name} (${subject.code})` : subject.name;
    teacherSubjectSelect.appendChild(option);
  });
}

function renderTeacherAttendanceRows() {
  if (teacherAttendanceState.students.length === 0) {
    teacherAttendanceTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-secondary">No students found for this class and division.</td>
      </tr>
    `;
    saveAttendanceButton.disabled = true;
    return;
  }

  teacherAttendanceTableBody.innerHTML = teacherAttendanceState.students.map((student) => `
    <tr data-student-id="${student.id}">
      <td>${student.roll_number ?? '-'}</td>
      <td>
        <div class="fw-semibold">${student.full_name}</div>
        <div class="small text-secondary">${student.admission_number}</div>
      </td>
      <td>
        <select class="form-select attendance-status">
          <option value="present" ${student.attendance?.status === 'present' || !student.attendance ? 'selected' : ''}>Present</option>
          <option value="absent" ${student.attendance?.status === 'absent' ? 'selected' : ''}>Absent</option>
        </select>
      </td>
      <td>
        <input class="form-control attendance-remarks" value="${student.attendance?.remarks || ''}" placeholder="Optional remark">
      </td>
    </tr>
  `).join('');

  saveAttendanceButton.disabled = false;
}

async function loadTeacherAssignments() {
  const response = await fetch('/api/attendance/teacher/assignments', {
    headers: teacherHeaders(),
  });

  if (!response.ok) {
    throw new Error('Unable to load your attendance assignments.');
  }

  const result = await response.json();
  const grouped = new Map();

  result.assignments.forEach((assignment) => {
    const key = `${assignment.class.id}:${assignment.division.id}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        class: assignment.class,
        division: assignment.division,
        academicYear: assignment.academic_year,
        subjects: [],
      });
    }

    grouped.get(key).subjects.push(assignment.subject);
  });

  teacherAttendanceState.assignments = Array.from(grouped.values());
  renderTeacherAssignments();
}

async function loadTeacherSheet() {
  hideTeacherAlert();

  if (!teacherAttendanceState.selectedAssignment) {
    showTeacherAlert('Please select one assigned class first.', 'danger');
    return;
  }

  const params = new URLSearchParams({
    classId: teacherAttendanceState.selectedAssignment.class.id,
    divisionId: teacherAttendanceState.selectedAssignment.division.id,
    date: attendanceDateInput.value,
  });

  const response = await fetch(`/api/attendance/teacher/sheet?${params.toString()}`, {
    headers: teacherHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load attendance sheet.');
  }

  teacherAttendanceState.students = result.students;
  renderTeacherAttendanceRows();
  showTeacherAlert('Attendance sheet loaded.');
}

teacherAssignmentSelect.addEventListener('change', syncTeacherSubjectOptions);

teacherAttendanceFilterForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await loadTeacherSheet();
  } catch (error) {
    showTeacherAlert(error.message, 'danger');
  }
});

saveAttendanceButton.addEventListener('click', async () => {
  hideTeacherAlert();

  if (!teacherAttendanceState.selectedAssignment) {
    showTeacherAlert('Please load an attendance sheet first.', 'danger');
    return;
  }

  const rows = Array.from(teacherAttendanceTableBody.querySelectorAll('tr[data-student-id]'));
  const records = rows.map((row) => ({
    studentId: row.dataset.studentId,
    status: row.querySelector('.attendance-status').value,
    remarks: row.querySelector('.attendance-remarks').value,
  }));

  try {
    const response = await fetch('/api/attendance/teacher/mark', {
      method: 'POST',
      headers: teacherHeaders(true),
      body: JSON.stringify({
        classId: teacherAttendanceState.selectedAssignment.class.id,
        divisionId: teacherAttendanceState.selectedAssignment.division.id,
        subjectId: teacherSubjectSelect.value || null,
        date: attendanceDateInput.value,
        records,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to save attendance.');
    }

    showTeacherAlert(result.message);
    await loadTeacherSheet();
  } catch (error) {
    showTeacherAlert(error.message, 'danger');
  }
});

loadTeacherAssignments().catch((error) => {
  showTeacherAlert(error.message, 'danger');
});
