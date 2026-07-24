const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

function badRequest(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, error, fallbackMessage) {
  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      sort_order,
      created_at,
      divisions (
        id,
        name,
        created_at
      )
    `)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchSubjects() {
  const { data, error } = await supabase
    .from('class_subjects')
    .select(`
      id,
      created_at,
      class:classes!class_subjects_class_id_fkey (
        id,
        name
      ),
      subject:subjects!class_subjects_subject_id_fkey (
        id,
        name,
        code,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchDivisions() {
  const { data, error } = await supabase
    .from('divisions')
    .select(`
      id,
      name,
      created_at,
      class:classes!divisions_class_id_fkey (
        id,
        name
      )
    `)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchAcademicYears() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date, is_active')
    .order('start_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchParents() {
  const { data, error } = await supabase
    .from('parent_profiles')
    .select(`
      id,
      mother_name,
      father_name,
      phone,
      address,
      created_at,
      user:users!parent_profiles_user_id_fkey (
        id,
        full_name,
        email,
        verification_status
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchTeachers() {
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select(`
      id,
      phone,
      qualification,
      created_at,
      user:users!teacher_profiles_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      admission_number,
      full_name,
      roll_number,
      date_of_birth,
      created_at,
      class:classes!students_class_id_fkey (
        id,
        name
      ),
      division:divisions!students_division_id_fkey (
        id,
        name
      ),
      parent:parent_profiles!students_parent_id_fkey (
        id,
        mother_name,
        father_name,
        phone,
        user:users!parent_profiles_user_id_fkey (
          id,
          full_name,
          email,
          verification_status
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchAssignments() {
  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .select(`
      id,
      created_at,
      academic_year:academic_years!teacher_subject_assignments_academic_year_id_fkey (
        id,
        name,
        is_active
      ),
      teacher:teacher_profiles!teacher_subject_assignments_teacher_id_fkey (
        id,
        qualification,
        user:users!teacher_profiles_user_id_fkey (
          id,
          full_name,
          email
        )
      ),
      class:classes!teacher_subject_assignments_class_id_fkey (
        id,
        name
      ),
      division:divisions!teacher_subject_assignments_division_id_fkey (
        id,
        name
      ),
      subject:subjects!teacher_subject_assignments_subject_id_fkey (
        id,
        name,
        code
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function getAdminBootstrap(req, res) {
  try {
    const [academicYears, classes, subjects, parents, teachers, students, assignments] = await Promise.all([
      fetchAcademicYears(),
      fetchClasses(),
      fetchSubjects(),
      fetchParents(),
      fetchTeachers(),
      fetchStudents(),
      fetchAssignments(),
    ]);

    return res.json({
      academicYears,
      classes,
      subjects,
      parents,
      teachers,
      students,
      assignments,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to load admin master data.');
  }
}

async function getClasses(req, res) {
  try {
    const classes = await fetchClasses();
    return res.json({ classes });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch classes.');
  }
}

async function getDivisions(req, res) {
  try {
    const divisions = await fetchDivisions();
    return res.json({ divisions });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch divisions.');
  }
}

async function createClass(req, res) {
  const { name, sortOrder } = req.body;

  if (!name?.trim()) {
    return badRequest(res, 'Class name is required.');
  }

  try {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: name.trim(),
        sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      })
      .select('id, name, sort_order, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return badRequest(res, 'A class with this name already exists.');
      }

      throw error;
    }

    return res.status(201).json({
      message: 'Class created successfully.',
      class: data,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create class.');
  }
}

async function deleteClass(req, res) {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      if (error.code === '23503') {
        return badRequest(res, 'This class cannot be deleted because it is being used in other records.');
      }

      throw error;
    }

    return res.json({ message: 'Class deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete class.');
  }
}

async function createDivision(req, res) {
  const { classId, name } = req.body;

  if (!classId || !name?.trim()) {
    return badRequest(res, 'Class and division name are required.');
  }

  try {
    const { data, error } = await supabase
      .from('divisions')
      .insert({
        class_id: classId,
        name: name.trim(),
      })
      .select('id, class_id, name, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return badRequest(res, 'This division already exists for the selected class.');
      }

      throw error;
    }

    return res.status(201).json({
      message: 'Division created successfully.',
      division: data,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create division.');
  }
}

async function deleteDivision(req, res) {
  try {
    const { error } = await supabase
      .from('divisions')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      if (error.code === '23503') {
        return badRequest(res, 'This division cannot be deleted because it is being used in other records.');
      }

      throw error;
    }

    return res.json({ message: 'Division deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete division.');
  }
}

async function getSubjects(req, res) {
  try {
    const subjects = await fetchSubjects();
    return res.json({ subjects });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch subjects.');
  }
}

async function createSubject(req, res) {
  const { classId, name, code } = req.body;

  if (!classId || !name?.trim()) {
    return badRequest(res, 'Class and subject name are required.');
  }

  try {
    const normalizedName = name.trim();
    const normalizedCode = code?.trim() || null;

    let subjectId;

    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('name', normalizedName)
      .maybeSingle();

    if (existingSubject) {
      subjectId = existingSubject.id;
    } else {
      const { data: createdSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          name: normalizedName,
          code: normalizedCode,
        })
        .select('id, name, code, created_at')
        .single();

      if (subjectError) {
        if (subjectError.code === '23505') {
          return badRequest(res, 'This subject name or code already exists.');
        }

        throw subjectError;
      }

      subjectId = createdSubject.id;
    }

    const { data, error } = await supabase
      .from('class_subjects')
      .insert({
        class_id: classId,
        subject_id: subjectId,
      })
      .select(`
        id,
        created_at,
        class:classes!class_subjects_class_id_fkey (
          id,
          name
        ),
        subject:subjects!class_subjects_subject_id_fkey (
          id,
          name,
          code,
          created_at
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return badRequest(res, 'This subject is already assigned to the selected class.');
      }

      throw error;
    }

    return res.status(201).json({
      message: 'Class-wise subject created successfully.',
      subject: data,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create subject.');
  }
}

async function deleteSubject(req, res) {
  try {
    const { data: relation, error: relationError } = await supabase
      .from('class_subjects')
      .select('id, subject_id')
      .eq('id', req.params.id)
      .single();

    if (relationError) {
      throw relationError;
    }

    const { error } = await supabase
      .from('class_subjects')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      if (error.code === '23503') {
        return badRequest(res, 'This class subject cannot be deleted because it is being used in other records.');
      }

      throw error;
    }

    const { count } = await supabase
      .from('class_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', relation.subject_id);

    if (count === 0) {
      await supabase
        .from('subjects')
        .delete()
        .eq('id', relation.subject_id);
    }

    return res.json({ message: 'Class-wise subject deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete subject.');
  }
}

async function fetchClassSubjectsByClassId(classId) {
  const { data, error } = await supabase
    .from('class_subjects')
    .select(`
      id,
      class:classes!class_subjects_class_id_fkey (
        id,
        name
      ),
      subject:subjects!class_subjects_subject_id_fkey (
        id,
        name,
        code
      )
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function getClassSubjects(req, res) {
  const { classId } = req.query;

  if (!classId) {
    return badRequest(res, 'Class is required.');
  }

  try {
    const subjects = await fetchClassSubjectsByClassId(classId);
    return res.json({ subjects });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch class-wise subjects.');
  }
}

async function getStudents(req, res) {
  try {
    const students = await fetchStudents();
    return res.json({ students });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch students.');
  }
}

async function createStudent(req, res) {
  const {
    admissionNumber,
    fullName,
    rollNumber,
    classId,
    divisionId,
    parentId,
    dateOfBirth,
    createNewParent,
    newParent,
  } = req.body;

  if (!admissionNumber?.trim() || !fullName?.trim() || !classId || !divisionId) {
    return badRequest(res, 'Admission number, student name, class, and division are required.');
  }

  let createdUserId = null;
  let createdParentProfileId = null;

  try {
    let resolvedParentId = parentId;

    if (createNewParent) {
      if (
        !newParent?.motherName?.trim()
        || !newParent?.fatherName?.trim()
        || !newParent?.email?.trim()
        || !newParent?.phone?.trim()
      ) {
        return badRequest(res, 'Mother name, father name, email, and phone number are required when creating a new parent.');
      }

      const normalizedEmail = newParent.email.trim().toLowerCase();
      const normalizedPhone = newParent.phone.trim();
      const passwordHash = await bcrypt.hash(normalizedPhone, 10);

      const { data: createdUser, error: userError } = await supabase
        .from('users')
        .insert({
          full_name: newParent.fatherName.trim(),
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'parent',
          verification_status: 'not_verified',
        })
        .select('id')
        .single();

      if (userError) {
        if (userError.code === '23505') {
          return badRequest(res, 'A parent account with this email already exists.');
        }

        throw userError;
      }

      createdUserId = createdUser.id;

      const { data: createdParent, error: parentError } = await supabase
        .from('parent_profiles')
        .insert({
          user_id: createdUser.id,
          mother_name: newParent.motherName.trim(),
          father_name: newParent.fatherName.trim(),
          phone: normalizedPhone,
          address: newParent.address?.trim() || null,
        })
        .select('id')
        .single();

      if (parentError) {
        throw parentError;
      }

      createdParentProfileId = createdParent.id;
      resolvedParentId = createdParent.id;
    }

    if (!resolvedParentId) {
      return badRequest(res, 'Please select an existing parent or create a new parent account.');
    }

    const { data, error } = await supabase
      .from('students')
      .insert({
        admission_number: admissionNumber.trim(),
        full_name: fullName.trim(),
        roll_number: rollNumber ? Number(rollNumber) : null,
        class_id: classId,
        division_id: divisionId,
        parent_id: resolvedParentId,
        date_of_birth: dateOfBirth || null,
      })
      .select('id, admission_number, full_name, roll_number, class_id, division_id, parent_id, date_of_birth, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return badRequest(res, 'Admission number or roll number already exists for this division.');
      }

      throw error;
    }

    return res.status(201).json({
      message: createNewParent
        ? 'Student and parent account created successfully. Initial parent password is the phone number.'
        : 'Student created successfully.',
      student: data,
    });
  } catch (error) {
    if (createdParentProfileId) {
      await supabase.from('parent_profiles').delete().eq('id', createdParentProfileId);
    }
    if (createdUserId) {
      await supabase.from('users').delete().eq('id', createdUserId);
    }
    return serverError(res, error, 'Unable to create student.');
  }
}

async function deleteStudent(req, res) {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      if (error.code === '23503') {
        return badRequest(res, 'This student cannot be deleted because related records still exist.');
      }

      throw error;
    }

    return res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete student.');
  }
}

async function getAssignments(req, res) {
  try {
    const assignments = await fetchAssignments();
    return res.json({ assignments });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch teacher assignments.');
  }
}

async function createAssignment(req, res) {
  const { academicYearId, teacherId, classId, divisionId, subjectId } = req.body;

  if (!academicYearId || !teacherId || !classId || !divisionId || !subjectId) {
    return badRequest(res, 'Academic year, teacher, class, division, and subject are required.');
  }

  try {
    const classSubjects = await fetchClassSubjectsByClassId(classId);
    const allowedSubjectIds = new Set(classSubjects.map((item) => item.subject?.id).filter(Boolean));

    if (!allowedSubjectIds.has(subjectId)) {
      return badRequest(res, 'This subject is not part of the selected class curriculum.');
    }

    const { data, error } = await supabase
      .from('teacher_subject_assignments')
      .insert({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        class_id: classId,
        division_id: divisionId,
        subject_id: subjectId,
      })
      .select('id, academic_year_id, teacher_id, class_id, division_id, subject_id, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return badRequest(res, 'This subject is already assigned for the selected class, division, and academic year.');
      }

      throw error;
    }

    return res.status(201).json({
      message: 'Teacher subject assignment created successfully.',
      assignment: data,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create teacher assignment.');
  }
}

async function deleteAssignment(req, res) {
  try {
    const { error } = await supabase
      .from('teacher_subject_assignments')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      if (error.code === '23503') {
        return badRequest(res, 'This assignment cannot be deleted because related records still exist.');
      }

      throw error;
    }

    return res.json({ message: 'Teacher assignment deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete teacher assignment.');
  }
}

async function getParents(req, res) {
  try {
    const parents = await fetchParents();
    return res.json({ parents });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch parents.');
  }
}

async function getTeachers(req, res) {
  try {
    const teachers = await fetchTeachers();
    return res.json({ teachers });
  } catch (error) {
    return serverError(res, error, 'Unable to fetch teachers.');
  }
}

module.exports = {
  getAdminBootstrap,
  getClasses,
  getDivisions,
  createClass,
  deleteClass,
  createDivision,
  deleteDivision,
  getSubjects,
  getClassSubjects,
  createSubject,
  deleteSubject,
  getParents,
  getTeachers,
  getStudents,
  createStudent,
  deleteStudent,
  getAssignments,
  createAssignment,
  deleteAssignment,
};
