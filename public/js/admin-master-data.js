const adminState = {
  academicYears: [],
  classes: [],
  subjects: [],
  parents: [],
  teachers: [],
  students: [],
  assignments: [],
};

const pageAlert = document.querySelector('#pageAlert');
const classForm = document.querySelector('#classForm');
const divisionForm = document.querySelector('#divisionForm');
const subjectForm = document.querySelector('#subjectForm');
const studentForm = document.querySelector('#studentForm');
const assignmentForm = document.querySelector('#assignmentForm');
const createNewParentCheckbox = document.querySelector('#createNewParent');
const parentSelect = document.querySelector('#parentId');
const newParentFields = document.querySelector('#newParentFields');

function getAuthHeaders(includeJson = true) {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem('edunexusToken')}`,
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function showAlert(message, type = 'success') {
  pageAlert.className = `alert alert-${type}`;
  pageAlert.textContent = message;
}

function hideAlert() {
  pageAlert.className = 'alert d-none';
  pageAlert.textContent = '';
}

function populateSelect(select, items, options = {}) {
  const {
    valueKey = 'id',
    labelBuilder = (item) => item.name,
    placeholder = 'Select an option',
  } = options;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = labelBuilder(item);
    select.appendChild(option);
  });
}

function getDivisionsForClass(classId) {
  const selectedClass = adminState.classes.find((item) => item.id === classId);
  return selectedClass?.divisions || [];
}

function renderClasses() {
  const tableBody = document.querySelector('#classesTableBody');
  tableBody.innerHTML = adminState.classes.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.sort_order}</td>
      <td>${(item.divisions || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((division) => `<span class="badge text-bg-light border me-2 mb-1">${division.name} <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-1 delete-division-btn" data-id="${division.id}" title="Delete division">x</button></span>`)
        .join('') || '<span class="text-secondary">No divisions yet</span>'}</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger delete-class-btn" data-id="${item.id}">Delete</button></td>
    </tr>
  `).join('');

  populateSelect(document.querySelector('#divisionClassId'), adminState.classes, { placeholder: 'Select class' });
  populateSelect(document.querySelector('#subjectClassId'), adminState.classes, { placeholder: 'Select class' });
  populateSelect(document.querySelector('#studentClassId'), adminState.classes, { placeholder: 'Select class' });
  populateSelect(document.querySelector('#assignmentClassId'), adminState.classes, { placeholder: 'Select class' });
}

function renderSubjects() {
  const tableBody = document.querySelector('#subjectsTableBody');
  tableBody.innerHTML = adminState.subjects.map((item) => `
    <tr>
      <td>${item.class?.name || '-'}</td>
      <td>${item.subject?.name || '-'}</td>
      <td>${item.subject?.code || '<span class="text-secondary">-</span>'}</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger delete-subject-btn" data-id="${item.id}">Delete</button></td>
    </tr>
  `).join('');
}

function renderStudents() {
  const tableBody = document.querySelector('#studentsTableBody');
  tableBody.innerHTML = adminState.students.map((item) => `
    <tr>
      <td>${item.admission_number}</td>
      <td>
        <div class="fw-semibold">${item.full_name}</div>
        <div class="small text-secondary">Roll no: ${item.roll_number ?? '-'}</div>
      </td>
      <td>${item.class?.name || '-'} ${item.division?.name ? `- ${item.division.name}` : ''}</td>
      <td>
        <div class="fw-semibold">${item.parent?.user?.full_name || '-'}</div>
        <div class="small text-secondary">${item.parent?.user?.email || ''}</div>
      </td>
      <td>
        <div class="small"><strong>Mother:</strong> ${item.parent?.mother_name || '-'}</div>
        <div class="small"><strong>Father:</strong> ${item.parent?.father_name || '-'}</div>
        <div class="small"><strong>Phone:</strong> ${item.parent?.phone || '-'}</div>
      </td>
      <td><button type="button" class="btn btn-sm btn-outline-danger delete-student-btn" data-id="${item.id}">Delete</button></td>
    </tr>
  `).join('');
}

function renderAssignments() {
  const tableBody = document.querySelector('#assignmentsTableBody');
  tableBody.innerHTML = adminState.assignments.map((item) => `
    <tr>
      <td>${item.academic_year?.name || '-'}</td>
      <td>
        <div class="fw-semibold">${item.teacher?.user?.full_name || '-'}</div>
        <div class="small text-secondary">${item.teacher?.user?.email || ''}</div>
      </td>
      <td>${item.class?.name || '-'} ${item.division?.name ? `- ${item.division.name}` : ''}</td>
      <td>${item.subject?.name || '-'} ${item.subject?.code ? `(${item.subject.code})` : ''}</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger delete-assignment-btn" data-id="${item.id}">Delete</button></td>
    </tr>
  `).join('');
}

function renderPeopleSelects() {
  populateSelect(document.querySelector('#parentId'), adminState.parents, {
    placeholder: 'Select parent',
    labelBuilder: (item) => `${item.father_name || item.user.full_name} | ${item.user.email}`,
  });

  populateSelect(document.querySelector('#teacherId'), adminState.teachers, {
    placeholder: 'Select teacher',
    labelBuilder: (item) => `${item.user.full_name} (${item.user.email})`,
  });
}

function renderAcademicYears() {
  populateSelect(document.querySelector('#academicYearId'), adminState.academicYears, {
    placeholder: 'Select academic year',
    labelBuilder: (item) => item.is_active ? `${item.name} (Active)` : item.name,
  });
}

function syncDivisionSelects() {
  const studentClassId = document.querySelector('#studentClassId').value;
  const assignmentClassId = document.querySelector('#assignmentClassId').value;
  const classSubjects = adminState.subjects
    .filter((item) => item.class?.id === assignmentClassId)
    .map((item) => item.subject)
    .filter((subject) => Boolean(subject?.id));

  populateSelect(document.querySelector('#studentDivisionId'), getDivisionsForClass(studentClassId), {
    placeholder: 'Select division',
  });

  populateSelect(document.querySelector('#assignmentDivisionId'), getDivisionsForClass(assignmentClassId), {
    placeholder: 'Select division',
  });

  populateSelect(document.querySelector('#subjectId'), classSubjects, {
    placeholder: assignmentClassId ? 'Select subject' : 'Select class first',
    labelBuilder: (item) => item.code ? `${item.name} (${item.code})` : item.name,
  });
}

function bindDeleteActions() {
  document.querySelectorAll('.delete-class-btn').forEach((button) => {
    button.addEventListener('click', () => handleDelete('/api/admin/classes', button.dataset.id, 'Delete this class?'));
  });

  document.querySelectorAll('.delete-division-btn').forEach((button) => {
    button.addEventListener('click', () => handleDelete('/api/admin/divisions', button.dataset.id, 'Delete this division?'));
  });

  document.querySelectorAll('.delete-subject-btn').forEach((button) => {
    button.addEventListener('click', () => handleDelete('/api/admin/subjects', button.dataset.id, 'Delete this subject?'));
  });

  document.querySelectorAll('.delete-student-btn').forEach((button) => {
    button.addEventListener('click', () => handleDelete('/api/admin/students', button.dataset.id, 'Delete this student?'));
  });

  document.querySelectorAll('.delete-assignment-btn').forEach((button) => {
    button.addEventListener('click', () => handleDelete('/api/admin/assignments', button.dataset.id, 'Delete this teacher assignment?'));
  });
}

function renderAll() {
  renderClasses();
  renderSubjects();
  renderStudents();
  renderAssignments();
  renderPeopleSelects();
  renderAcademicYears();
  syncDivisionSelects();
  bindDeleteActions();
}

async function loadAdminData() {
  hideAlert();

  const response = await fetch('/api/admin/bootstrap', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('edunexusToken')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load admin data.');
  }

  const result = await response.json();
  Object.assign(adminState, result);
  renderAll();
}

async function submitJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Something went wrong.');
  }

  return result;
}

async function deleteResource(url) {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Delete failed.');
  }

  return result;
}

async function handleDelete(baseUrl, id, confirmationText) {
  hideAlert();

  if (!window.confirm(confirmationText)) {
    return;
  }

  try {
    const result = await deleteResource(`${baseUrl}/${id}`);
    await loadAdminData();
    showAlert(result.message);
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

function syncParentMode() {
  const creatingParent = createNewParentCheckbox.checked;
  parentSelect.disabled = creatingParent;
  parentSelect.required = !creatingParent;
  newParentFields.classList.toggle('d-none', !creatingParent);

  ['motherName', 'fatherName', 'parentEmail', 'parentPhone'].forEach((fieldId) => {
    const field = document.querySelector(`#${fieldId}`);
    field.required = creatingParent;
  });
}

classForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  const formData = new FormData(classForm);

  try {
    await submitJson('/api/admin/classes', {
      name: formData.get('name'),
      sortOrder: formData.get('sortOrder'),
    });
    classForm.reset();
    await loadAdminData();
    showAlert('Class added successfully.');
  } catch (error) {
    showAlert(error.message, 'danger');
  }
});

divisionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  const formData = new FormData(divisionForm);

  try {
    await submitJson('/api/admin/divisions', {
      classId: formData.get('classId'),
      name: formData.get('name'),
    });
    divisionForm.reset();
    await loadAdminData();
    showAlert('Division added successfully.');
  } catch (error) {
    showAlert(error.message, 'danger');
  }
});

subjectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  const formData = new FormData(subjectForm);

  try {
    await submitJson('/api/admin/subjects', {
      classId: formData.get('classId'),
      name: formData.get('name'),
      code: formData.get('code'),
    });
    subjectForm.reset();
    await loadAdminData();
    showAlert('Subject added successfully.');
  } catch (error) {
    showAlert(error.message, 'danger');
  }
});

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  const formData = new FormData(studentForm);

  try {
    const result = await submitJson('/api/admin/students', {
      admissionNumber: formData.get('admissionNumber'),
      fullName: formData.get('fullName'),
      rollNumber: formData.get('rollNumber'),
      classId: formData.get('classId'),
      divisionId: formData.get('divisionId'),
      parentId: formData.get('parentId'),
      dateOfBirth: formData.get('dateOfBirth'),
      createNewParent: createNewParentCheckbox.checked,
      newParent: createNewParentCheckbox.checked ? {
        motherName: formData.get('motherName'),
        fatherName: formData.get('fatherName'),
        email: formData.get('parentEmail'),
        phone: formData.get('parentPhone'),
        address: formData.get('parentAddress'),
      } : null,
    });
    studentForm.reset();
    createNewParentCheckbox.checked = false;
    syncParentMode();
    await loadAdminData();
    showAlert(result.message);
  } catch (error) {
    showAlert(error.message, 'danger');
  }
});

assignmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  const formData = new FormData(assignmentForm);

  try {
    await submitJson('/api/admin/assignments', {
      academicYearId: formData.get('academicYearId'),
      teacherId: formData.get('teacherId'),
      classId: formData.get('classId'),
      divisionId: formData.get('divisionId'),
      subjectId: formData.get('subjectId'),
    });
    assignmentForm.reset();
    await loadAdminData();
    showAlert('Teacher assignment created successfully.');
  } catch (error) {
    showAlert(error.message, 'danger');
  }
});

document.querySelector('#studentClassId').addEventListener('change', syncDivisionSelects);
document.querySelector('#assignmentClassId').addEventListener('change', syncDivisionSelects);
createNewParentCheckbox.addEventListener('change', syncParentMode);

syncParentMode();

loadAdminData().catch((error) => {
  showAlert(error.message, 'danger');
});
