const parentTimetableAlert = document.querySelector('#parentTimetableAlert');
const parentTimetableContent = document.querySelector('#parentTimetableContent');

function showParentTimetableAlert(message, type = 'success') {
  parentTimetableAlert.className = `alert alert-${type}`;
  parentTimetableAlert.textContent = message;
}

async function loadParentTimetable() {
  const response = await fetch('/api/timetable/parent/overview', {
    headers: { Authorization: `Bearer ${localStorage.getItem('edunexusToken')}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load timetable.');
  if (!result.students.length) {
    parentTimetableContent.innerHTML = '<div class="col-12"><div class="admin-section"><p class="mb-0 text-secondary">No linked students found yet.</p></div></div>';
    return;
  }
  parentTimetableContent.innerHTML = result.students.map((student) => `<div class="col-12"><section class="admin-section"><div class="mb-4"><p class="eyebrow mb-1">Student</p><h2 class="h4 mb-1">${student.full_name}</h2><p class="mb-0 text-secondary">${student.class?.name || '-'} - ${student.division?.name || '-'}</p></div><div class="row g-3">${student.timetable.map((day) => `<div class="col-lg-4 col-md-6"><div class="mini-card"><h3 class="h6 text-capitalize mb-3">${day.day}</h3>${day.entries.length ? day.entries.map((entry) => `<div class="mini-list-item"><div class="fw-semibold">Period ${entry.period_number}: ${entry.subject?.name || '-'}</div><div class="small text-secondary">${entry.start_time} - ${entry.end_time}</div><div class="small text-secondary">${entry.teacher?.user?.full_name || 'Teacher TBA'}${entry.room_label ? ` | ${entry.room_label}` : ''}</div></div>`).join('') : '<p class="small text-secondary mb-0">No periods added.</p>'}</div></div>`).join('')}</div></section></div>`).join('');
}

loadParentTimetable().then(() => showParentTimetableAlert('Timetable loaded successfully.')).catch((error) => showParentTimetableAlert(error.message, 'danger'));
