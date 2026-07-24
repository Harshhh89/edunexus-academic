const teacherMessagesState = {
  assignments: [],
  threads: [],
  studentOptions: [],
};

const teacherMessagesAlert = document.querySelector('#teacherMessagesAlert');
const teacherThreadForm = document.querySelector('#teacherThreadForm');
const teacherStudentOption = document.querySelector('#teacherStudentOption');
const teacherThreadSubject = document.querySelector('#teacherThreadSubject');
const teacherThreadsContainer = document.querySelector('#teacherThreadsContainer');

function teacherMessageHeaders(includeJson = false) {
  const headers = { Authorization: `Bearer ${localStorage.getItem('edunexusToken')}` };
  if (includeJson) headers['Content-Type'] = 'application/json';
  return headers;
}

function showTeacherMessagesAlert(message, type = 'success') {
  teacherMessagesAlert.className = `alert alert-${type}`;
  teacherMessagesAlert.textContent = message;
}

function buildTeacherStudentOptions() {
  const map = new Map();
  teacherMessagesState.threads.forEach((thread) => {
    const key = `${thread.student.id}:${thread.parent.id}`;
    if (!map.has(key)) {
      map.set(key, {
        studentId: thread.student.id,
        parentId: thread.parent.id,
        label: `${thread.student.full_name} | ${thread.parent.user.full_name} | ${thread.student.class?.name || '-'}-${thread.student.division?.name || '-'}`,
      });
    }
  });
  teacherMessagesState.studentOptions = Array.from(map.values());
}

function syncTeacherSubjectOptions() {
  teacherThreadSubject.innerHTML = '<option value="">Any assigned subject</option>';
  const selected = teacherStudentOption.value;
  if (!selected) return;

  const [studentId] = selected.split('|');
  const relatedThread = teacherMessagesState.threads.find((thread) => thread.student.id === studentId);
  const className = relatedThread?.student.class?.name;
  const divisionName = relatedThread?.student.division?.name;
  const matchingSubjects = teacherMessagesState.assignments.filter((assignment) => (
    assignment.class?.name === className && assignment.division?.name === divisionName
  ));

  const seen = new Set();
  matchingSubjects.forEach((assignment) => {
    if (!assignment.subject?.id || seen.has(assignment.subject.id)) return;
    seen.add(assignment.subject.id);
    const option = document.createElement('option');
    option.value = assignment.subject.id;
    option.textContent = assignment.subject.code ? `${assignment.subject.name} (${assignment.subject.code})` : assignment.subject.name;
    teacherThreadSubject.appendChild(option);
  });
}

function renderTeacherThreads() {
  if (!teacherMessagesState.threads.length) {
    teacherThreadsContainer.innerHTML = '<div class="col-12"><div class="admin-section"><p class="mb-0 text-secondary">No conversation threads yet. Start one above.</p></div></div>';
    return;
  }

  teacherThreadsContainer.innerHTML = teacherMessagesState.threads.map((thread) => `
    <div class="col-12">
      <section class="admin-section">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <p class="eyebrow mb-1">Conversation</p>
            <h2 class="h5 mb-1">${thread.student.full_name} with ${thread.parent.user.full_name}</h2>
            <p class="mb-0 text-secondary">${thread.student.class?.name || '-'} - ${thread.student.division?.name || '-'} | ${thread.subject?.name || 'General'}</p>
          </div>
        </div>
        <div class="message-log mb-3">
          ${thread.messages.length ? thread.messages.map((message) => `
            <div class="message-bubble ${message.sender_role === 'teacher' ? 'message-bubble-outgoing' : 'message-bubble-incoming'}">
              <div class="small fw-semibold mb-1">${message.sender_role === 'teacher' ? (message.sender_teacher?.user?.full_name || 'Teacher') : (message.sender_parent?.user?.full_name || 'Parent')}</div>
              <div>${message.body}</div>
              <div class="small text-secondary mt-1">${message.created_at}</div>
            </div>
          `).join('') : '<p class="text-secondary mb-0">No messages yet.</p>'}
        </div>
        <form class="teacher-message-form d-flex gap-2" data-thread-id="${thread.id}">
          <input class="form-control" name="body" placeholder="Type a message to the parent" required>
          <button class="btn btn-primary" type="submit">Send</button>
        </form>
      </section>
    </div>
  `).join('');

  document.querySelectorAll('.teacher-message-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = new FormData(form).get('body');
      try {
        const response = await fetch('/api/messaging/teacher/messages', {
          method: 'POST',
          headers: teacherMessageHeaders(true),
          body: JSON.stringify({
            threadId: form.dataset.threadId,
            body,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to send message.');
        form.reset();
        await loadTeacherMessages();
        showTeacherMessagesAlert(result.message);
      } catch (error) {
        showTeacherMessagesAlert(error.message, 'danger');
      }
    });
  });
}

function renderTeacherBootstrap() {
  buildTeacherStudentOptions();
  teacherStudentOption.innerHTML = '<option value="">Select student and parent</option>';
  teacherMessagesState.studentOptions.forEach((option) => {
    const item = document.createElement('option');
    item.value = `${option.studentId}|${option.parentId}`;
    item.textContent = option.label;
    teacherStudentOption.appendChild(item);
  });
  syncTeacherSubjectOptions();
  renderTeacherThreads();
}

async function loadTeacherMessages() {
  const response = await fetch('/api/messaging/teacher/bootstrap', {
    headers: teacherMessageHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load conversations.');
  Object.assign(teacherMessagesState, result);
  renderTeacherBootstrap();
}

teacherStudentOption.addEventListener('change', syncTeacherSubjectOptions);

teacherThreadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const selected = teacherStudentOption.value;
  if (!selected) {
    showTeacherMessagesAlert('Please select a student and parent first.', 'danger');
    return;
  }
  const [studentId, parentId] = selected.split('|');

  try {
    const response = await fetch('/api/messaging/teacher/threads', {
      method: 'POST',
      headers: teacherMessageHeaders(true),
      body: JSON.stringify({
        studentId,
        parentId,
        subjectId: teacherThreadSubject.value || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to create conversation.');
    await loadTeacherMessages();
    showTeacherMessagesAlert(result.message);
  } catch (error) {
    showTeacherMessagesAlert(error.message, 'danger');
  }
});

loadTeacherMessages().catch((error) => showTeacherMessagesAlert(error.message, 'danger'));
