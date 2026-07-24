const parentMessagesState = {
  students: [],
  threads: [],
};

const parentMessagesAlert = document.querySelector('#parentMessagesAlert');
const parentThreadForm = document.querySelector('#parentThreadForm');
const parentStudentOption = document.querySelector('#parentStudentOption');
const parentTeacherOption = document.querySelector('#parentTeacherOption');
const parentThreadSubject = document.querySelector('#parentThreadSubject');
const parentThreadsContainer = document.querySelector('#parentThreadsContainer');

function parentMessageHeaders(includeJson = false) {
  const headers = { Authorization: `Bearer ${localStorage.getItem('edunexusToken')}` };
  if (includeJson) headers['Content-Type'] = 'application/json';
  return headers;
}

function showParentMessagesAlert(message, type = 'success') {
  parentMessagesAlert.className = `alert alert-${type}`;
  parentMessagesAlert.textContent = message;
}

function syncParentTeacherOptions() {
  const studentId = parentStudentOption.value;
  parentTeacherOption.innerHTML = '<option value="">Select teacher</option>';
  parentThreadSubject.innerHTML = '<option value="">Auto-select subject</option>';
  if (!studentId) return;

  const relevantThreads = parentMessagesState.threads.filter((thread) => thread.student.id === studentId);
  const teacherMap = new Map();
  const subjectMap = new Map();

  relevantThreads.forEach((thread) => {
    if (thread.teacher?.id && !teacherMap.has(thread.teacher.id)) {
      teacherMap.set(thread.teacher.id, thread.teacher);
    }
    if (thread.subject?.id && !subjectMap.has(thread.subject.id)) {
      subjectMap.set(thread.subject.id, thread.subject);
    }
  });

  teacherMap.forEach((teacher) => {
    const option = document.createElement('option');
    option.value = teacher.id;
    option.textContent = teacher.user.full_name;
    parentTeacherOption.appendChild(option);
  });

  subjectMap.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.code ? `${subject.name} (${subject.code})` : subject.name;
    parentThreadSubject.appendChild(option);
  });
}

function renderParentThreads() {
  if (!parentMessagesState.threads.length) {
    parentThreadsContainer.innerHTML = '<div class="col-12"><div class="admin-section"><p class="mb-0 text-secondary">No conversation threads yet. Start one above.</p></div></div>';
    return;
  }

  parentThreadsContainer.innerHTML = parentMessagesState.threads.map((thread) => `
    <div class="col-12">
      <section class="admin-section">
        <div class="mb-3">
          <p class="eyebrow mb-1">Conversation</p>
          <h2 class="h5 mb-1">${thread.teacher.user.full_name} about ${thread.student.full_name}</h2>
          <p class="mb-0 text-secondary">${thread.student.class?.name || '-'} - ${thread.student.division?.name || '-'} | ${thread.subject?.name || 'General'}</p>
        </div>
        <div class="message-log mb-3">
          ${thread.messages.length ? thread.messages.map((message) => `
            <div class="message-bubble ${message.sender_role === 'parent' ? 'message-bubble-outgoing' : 'message-bubble-incoming'}">
              <div class="small fw-semibold mb-1">${message.sender_role === 'parent' ? (message.sender_parent?.user?.full_name || 'Parent') : (message.sender_teacher?.user?.full_name || 'Teacher')}</div>
              <div>${message.body}</div>
              <div class="small text-secondary mt-1">${message.created_at}</div>
            </div>
          `).join('') : '<p class="text-secondary mb-0">No messages yet.</p>'}
        </div>
        <form class="parent-message-form d-flex gap-2" data-thread-id="${thread.id}">
          <input class="form-control" name="body" placeholder="Type a message to the teacher" required>
          <button class="btn btn-primary" type="submit">Send</button>
        </form>
      </section>
    </div>
  `).join('');

  document.querySelectorAll('.parent-message-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = new FormData(form).get('body');
      try {
        const response = await fetch('/api/messaging/parent/messages', {
          method: 'POST',
          headers: parentMessageHeaders(true),
          body: JSON.stringify({
            threadId: form.dataset.threadId,
            body,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to send message.');
        form.reset();
        await loadParentMessages();
        showParentMessagesAlert(result.message);
      } catch (error) {
        showParentMessagesAlert(error.message, 'danger');
      }
    });
  });
}

function renderParentBootstrap() {
  parentStudentOption.innerHTML = '<option value="">Select student</option>';
  parentMessagesState.students.forEach((student) => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.full_name} | ${student.class?.name || '-'}-${student.division?.name || '-'}`;
    parentStudentOption.appendChild(option);
  });
  syncParentTeacherOptions();
  renderParentThreads();
}

async function loadParentMessages() {
  const response = await fetch('/api/messaging/parent/bootstrap', {
    headers: parentMessageHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Unable to load conversations.');
  Object.assign(parentMessagesState, result);
  renderParentBootstrap();
}

parentStudentOption.addEventListener('change', syncParentTeacherOptions);

parentThreadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/api/messaging/parent/threads', {
      method: 'POST',
      headers: parentMessageHeaders(true),
      body: JSON.stringify({
        studentId: parentStudentOption.value,
        teacherId: parentTeacherOption.value,
        subjectId: parentThreadSubject.value || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to create conversation.');
    await loadParentMessages();
    showParentMessagesAlert(result.message);
  } catch (error) {
    showParentMessagesAlert(error.message, 'danger');
  }
});

loadParentMessages().catch((error) => showParentMessagesAlert(error.message, 'danger'));
