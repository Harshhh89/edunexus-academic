const supabase = require('../config/supabase');

function badRequest(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, error, fallbackMessage) {
  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

async function getTeacherProfileId(userId) {
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function getParentProfileId(userId) {
  const { data, error } = await supabase
    .from('parent_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function getTeacherAssignmentRows(teacherProfileId) {
  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .select(`
      id,
      academic_year:academic_years!teacher_subject_assignments_academic_year_id_fkey (
        id,
        name,
        is_active
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
    .eq('teacher_id', teacherProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function fetchTeacherHomework(teacherProfileId) {
  const { data, error } = await supabase
    .from('homework_items')
    .select(`
      id,
      title,
      description,
      assigned_date,
      due_date,
      created_at,
      academic_year:academic_years!homework_items_academic_year_id_fkey (
        id,
        name,
        is_active
      ),
      class:classes!homework_items_class_id_fkey (
        id,
        name
      ),
      division:divisions!homework_items_division_id_fkey (
        id,
        name
      ),
      subject:subjects!homework_items_subject_id_fkey (
        id,
        name,
        code
      )
    `)
    .eq('teacher_id', teacherProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function getTeacherHomeworkBootstrap(req, res) {
  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const [assignments, homework] = await Promise.all([
      getTeacherAssignmentRows(teacherProfileId),
      fetchTeacherHomework(teacherProfileId),
    ]);

    return res.json({ assignments, homework });
  } catch (error) {
    return serverError(res, error, 'Unable to load teacher homework data.');
  }
}

async function createHomework(req, res) {
  const { assignmentId, title, description, assignedDate, dueDate } = req.body;

  if (!assignmentId || !title?.trim() || !description?.trim() || !dueDate) {
    return badRequest(res, 'Assignment, title, description, and due date are required.');
  }

  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const assignments = await getTeacherAssignmentRows(teacherProfileId);
    const selectedAssignment = assignments.find((assignment) => assignment.id === assignmentId);

    if (!selectedAssignment) {
      return res.status(403).json({ message: 'You can only assign homework for your own class, division, and subject assignments.' });
    }

    const { data, error } = await supabase
      .from('homework_items')
      .insert({
        academic_year_id: selectedAssignment.academic_year.id,
        class_id: selectedAssignment.class.id,
        division_id: selectedAssignment.division.id,
        subject_id: selectedAssignment.subject.id,
        teacher_id: teacherProfileId,
        title: title.trim(),
        description: description.trim(),
        assigned_date: assignedDate || new Date().toISOString().split('T')[0],
        due_date: dueDate,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      message: 'Homework assigned successfully.',
      id: data.id,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create homework.');
  }
}

async function deleteHomework(req, res) {
  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const { data: homework, error: homeworkError } = await supabase
      .from('homework_items')
      .select('id, teacher_id')
      .eq('id', req.params.id)
      .single();

    if (homeworkError) {
      throw homeworkError;
    }

    if (homework.teacher_id !== teacherProfileId) {
      return res.status(403).json({ message: 'You can only delete homework created by you.' });
    }

    const { error } = await supabase
      .from('homework_items')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    return res.json({ message: 'Homework deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete homework.');
  }
}

async function getParentHomeworkOverview(req, res) {
  try {
    const parentProfileId = await getParentProfileId(req.user.id);

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        full_name,
        admission_number,
        class:classes!students_class_id_fkey (
          id,
          name
        ),
        division:divisions!students_division_id_fkey (
          id,
          name
        )
      `)
      .eq('parent_id', parentProfileId)
      .order('full_name', { ascending: true });

    if (studentsError) {
      throw studentsError;
    }

    const overviews = [];

    for (const student of students) {
      const { data: homeworkItems, error: homeworkError } = await supabase
        .from('homework_items')
        .select(`
          id,
          title,
          description,
          assigned_date,
          due_date,
          subject:subjects!homework_items_subject_id_fkey (
            id,
            name,
            code
          ),
          teacher:teacher_profiles!homework_items_teacher_id_fkey (
            id,
            user:users!teacher_profiles_user_id_fkey (
              id,
              full_name
            )
          )
        `)
        .eq('class_id', student.class.id)
        .eq('division_id', student.division.id)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (homeworkError) {
        throw homeworkError;
      }

      overviews.push({
        ...student,
        homework: homeworkItems,
      });
    }

    return res.json({ students: overviews });
  } catch (error) {
    return serverError(res, error, 'Unable to load parent homework.');
  }
}

module.exports = {
  getTeacherHomeworkBootstrap,
  createHomework,
  deleteHomework,
  getParentHomeworkOverview,
};
