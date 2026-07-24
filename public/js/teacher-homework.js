const teacherHomeworkState = { assignments: [], homework: [] };
const teacherHomeworkAlert = document.querySelector('#teacherHomeworkAlert');
const teacherHomeworkForm = document.querySelector('#teacherHomeworkForm');
const homeworkAssignmentId = document.querySelector('#homeworkAssignmentId');
const teacherHomeworkTableBody = document.querySelector('#teacherHomeworkTableBody');

document.querySelector('#homeworkAssignedDate').value = new Date().toISOString().split('T')[0];

function teacherHomeworkHeaders(includeJson = false) {
  const headers = { Authorization: `Bearer ${localStorage.getItem('edunexusToken')}` };
  if (includeJson) headers['Content-Type'] = 'application/json';
  return headers;
}

function showTeacherHomeworkAlert(message, type = 'success') {
  teacherHomeworkAlert.className = `alert alert-${type}`;
  teacherHomeworkAlert.textContent = message;
}

async function deleteHomework(id) {
  const response = await fetch(`/api/homework/teacher/${id}`, {
    method: 'DELETE',
    headers: teacherHomeworkHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to delete homework.');
  return result;
}

function renderTeacherHomework() {
  homeworkAssignmentId.innerHTML = '<option value="">Select assignment</option>';
  teacherHomeworkState.assignments.forEach((assignment) => {
    const option = document.createElement('option');
    option.value = assignment.id;
    option.textContent = `${assignment.class.name} - ${assignment.division.name} | ${assignment.subject.name}`;
    homeworkAssignmentId.appendChild(option);
  });

  teacherHomeworkTableBody.innerHTML = teacherHomeworkState.homework.map((item) => `
    <tr>
      <td>
        <div class="fw-semibold">${item.title}</div>
        <div class="small text-secondary">${item.description}</div>
      </td>
      <td>${item.class?.name || '-'} - ${item.division?.name || '-'}</td>
      <td>${item.subject?.name || '-'}</td>
      <td>${item.assigned_date}</td>
      <td>${item.due_date}</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger delete-homework-btn" data-id="${item.id}">Delete</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.delete-homework-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Delete this homework item?')) {
        return;
      }

      try {
        const result = await deleteHomework(button.dataset.id);
        await loadTeacherHomework();
        showTeacherHomeworkAlert(result.message);
      } catch (error) {
        showTeacherHomeworkAlert(error.message, 'danger');
      }
    });
  });
}

async function loadTeacherHomework() {
  const response = await fetch('/api/homework/teacher/bootstrap', { headers: teacherHomeworkHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load homework.');
  Object.assign(teacherHomeworkState, result);
  renderTeacherHomework();
}

teacherHomeworkForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/api/homework/teacher/create', {
      method: 'POST',
      headers: teacherHomeworkHeaders(true),
      body: JSON.stringify({
        assignmentId: homeworkAssignmentId.value,
        title: document.querySelector('#homeworkTitle').value,
        description: document.querySelector('#homeworkDescription').value,
        assignedDate: document.querySelector('#homeworkAssignedDate').value,
        dueDate: document.querySelector('#homeworkDueDate').value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to create homework.');
    teacherHomeworkForm.reset();
    document.querySelector('#homeworkAssignedDate').value = new Date().toISOString().split('T')[0];
    await loadTeacherHomework();
    showTeacherHomeworkAlert(result.message);
  } catch (error) {
    showTeacherHomeworkAlert(error.message, 'danger');
  }
});

loadTeacherHomework().catch((error) => showTeacherHomeworkAlert(error.message, 'danger'));
