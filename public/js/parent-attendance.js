const parentAttendanceAlert = document.querySelector('#parentAttendanceAlert');
const parentAttendanceContent = document.querySelector('#parentAttendanceContent');

function parentHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('edunexusToken')}`,
  };
}

function showParentAlert(message, type = 'success') {
  parentAttendanceAlert.className = `alert alert-${type}`;
  parentAttendanceAlert.textContent = message;
}

function renderParentAttendance(students) {
  if (!students.length) {
    parentAttendanceContent.innerHTML = `
      <div class="col-12">
        <div class="admin-section">
          <p class="mb-0 text-secondary">No students are linked to this parent account yet.</p>
        </div>
      </div>
    `;
    return;
  }

  parentAttendanceContent.innerHTML = students.map((student) => `
    <div class="col-12">
      <section class="admin-section">
        <div class="row g-4 align-items-center mb-4">
          <div class="col-lg-7">
            <p class="eyebrow mb-1">Student</p>
            <h2 class="h4 mb-1">${student.full_name}</h2>
            <p class="mb-0 text-secondary">${student.class?.name || '-'} - ${student.division?.name || '-'} | Admission No: ${student.admission_number}</p>
          </div>
          <div class="col-lg-5">
            <div class="attendance-stats-grid">
              <div class="attendance-stat-card">
                <span class="attendance-stat-value">${student.stats.attendancePercentage}%</span>
                <span class="attendance-stat-label">Attendance</span>
              </div>
              <div class="attendance-stat-card">
                <span class="attendance-stat-value">${student.stats.presentDays}</span>
                <span class="attendance-stat-label">Present</span>
              </div>
              <div class="attendance-stat-card">
                <span class="attendance-stat-value">${student.stats.absentDays}</span>
                <span class="attendance-stat-label">Absent</span>
              </div>
              <div class="attendance-stat-card">
                <span class="attendance-stat-value">${student.stats.totalMarkedDays}</span>
                <span class="attendance-stat-label">Marked Days</span>
              </div>
            </div>
          </div>
        </div>

        <div class="table-card">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${student.history.length
                  ? student.history.map((record) => `
                    <tr>
                      <td>${record.attendance_date}</td>
                      <td><span class="badge ${record.status === 'present' ? 'text-bg-success' : 'text-bg-danger'}">${record.status}</span></td>
                      <td>${record.subject?.name || 'General'}</td>
                      <td>${record.teacher?.user?.full_name || '-'}</td>
                      <td>${record.remarks || '<span class="text-secondary">-</span>'}</td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <td colspan="5" class="text-secondary">No attendance records have been marked yet.</td>
                    </tr>
                  `}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  `).join('');
}

async function loadParentAttendance() {
  const response = await fetch('/api/attendance/parent/overview', {
    headers: parentHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load attendance.');
  }

  renderParentAttendance(result.students);
}

loadParentAttendance()
  .then(() => showParentAlert('Attendance data loaded successfully.'))
  .catch((error) => showParentAlert(error.message, 'danger'));
