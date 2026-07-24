const parentHomeworkAlert = document.querySelector('#parentHomeworkAlert');
const parentHomeworkContent = document.querySelector('#parentHomeworkContent');

function showParentHomeworkAlert(message, type = 'success') {
  parentHomeworkAlert.className = `alert alert-${type}`;
  parentHomeworkAlert.textContent = message;
}

async function loadParentHomework() {
  const response = await fetch('/api/homework/parent/overview', {
    headers: { Authorization: `Bearer ${localStorage.getItem('edunexusToken')}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load homework.');
  if (!result.students.length) {
    parentHomeworkContent.innerHTML = '<div class="col-12"><div class="admin-section"><p class="mb-0 text-secondary">No linked students found yet.</p></div></div>';
    return;
  }
  parentHomeworkContent.innerHTML = result.students.map((student) => `<div class="col-12"><section class="admin-section"><div class="mb-4"><p class="eyebrow mb-1">Student</p><h2 class="h4 mb-1">${student.full_name}</h2><p class="mb-0 text-secondary">${student.class?.name || '-'} - ${student.division?.name || '-'}</p></div><div class="table-card"><div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Title</th><th>Subject</th><th>Teacher</th><th>Assigned</th><th>Due</th></tr></thead><tbody>${student.homework.length ? student.homework.map((item) => `<tr><td><div class="fw-semibold">${item.title}</div><div class="small text-secondary">${item.description}</div></td><td>${item.subject?.name || '-'}</td><td>${item.teacher?.user?.full_name || '-'}</td><td>${item.assigned_date}</td><td>${item.due_date}</td></tr>`).join('') : '<tr><td colspan="5" class="text-secondary">No homework assigned yet.</td></tr>'}</tbody></table></div></div></section></div>`).join('');
}

loadParentHomework().then(() => showParentHomeworkAlert('Homework loaded successfully.')).catch((error) => showParentHomeworkAlert(error.message, 'danger'));
