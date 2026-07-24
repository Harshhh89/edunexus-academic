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
      ),
      academic_year:academic_years!teacher_subject_assignments_academic_year_id_fkey (
        id,
        name,
        is_active
      )
    `)
    .eq('teacher_id', teacherProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function getTeacherAttendanceSession(teacherProfileId, classId, divisionId, date) {
  const assignmentRows = await getTeacherAssignmentRows(teacherProfileId);
  const filteredAssignments = assignmentRows.filter((row) => (
    row.class?.id === classId && row.division?.id === divisionId
  ));

  if (filteredAssignments.length === 0) {
    return null;
  }

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, admission_number, full_name, roll_number')
    .eq('class_id', classId)
    .eq('division_id', divisionId)
    .order('roll_number', { ascending: true })
    .order('full_name', { ascending: true });

  if (studentsError) {
    throw studentsError;
  }

  const studentIds = students.map((student) => student.id);

  const records = studentIds.length === 0
    ? []
    : await (async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, student_id, status, remarks, subject_id, attendance_date')
        .eq('attendance_date', date)
        .in('student_id', studentIds);

      if (error) {
        throw error;
      }

      return data;
    })();

  const recordByStudentId = Object.fromEntries(records.map((record) => [record.student_id, record]));
  const activeAssignment = filteredAssignments.find((row) => row.academic_year?.is_active) || filteredAssignments[0];

  return {
    assignments: filteredAssignments,
    activeAssignment,
    students: students.map((student) => ({
      ...student,
      attendance: recordByStudentId[student.id] || null,
    })),
  };
}

async function getTeacherAssignments(req, res) {
  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const assignments = await getTeacherAssignmentRows(teacherProfileId);

    return res.json({ assignments });
  } catch (error) {
    return serverError(res, error, 'Unable to load teacher attendance assignments.');
  }
}

async function getTeacherAttendanceSheet(req, res) {
  const { classId, divisionId, date } = req.query;

  if (!classId || !divisionId || !date) {
    return badRequest(res, 'Class, division, and date are required.');
  }

  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const session = await getTeacherAttendanceSession(teacherProfileId, classId, divisionId, date);

    if (!session) {
      return res.status(403).json({ message: 'You are not assigned to this class and division.' });
    }

    return res.json(session);
  } catch (error) {
    return serverError(res, error, 'Unable to load attendance sheet.');
  }
}

async function saveTeacherAttendance(req, res) {
  const { classId, divisionId, date, subjectId, records } = req.body;

  if (!classId || !divisionId || !date || !Array.isArray(records) || records.length === 0) {
    return badRequest(res, 'Class, division, date, and at least one attendance record are required.');
  }

  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const session = await getTeacherAttendanceSession(teacherProfileId, classId, divisionId, date);

    if (!session) {
      return res.status(403).json({ message: 'You are not assigned to this class and division.' });
    }

    const allowedStudentIds = new Set(session.students.map((student) => student.id));
    const allowedSubjectIds = new Set(session.assignments.map((assignment) => assignment.subject?.id).filter(Boolean));

    if (subjectId && !allowedSubjectIds.has(subjectId)) {
      return res.status(403).json({ message: 'You are not assigned to the selected subject for this class.' });
    }

    const payload = [];

    for (const record of records) {
      if (!allowedStudentIds.has(record.studentId)) {
        return res.status(403).json({ message: 'One or more students do not belong to your assigned class and division.' });
      }

      if (!['present', 'absent'].includes(record.status)) {
        return badRequest(res, 'Attendance status must be present or absent.');
      }

      payload.push({
        attendance_date: date,
        student_id: record.studentId,
        class_id: classId,
        division_id: divisionId,
        subject_id: subjectId || null,
        teacher_id: teacherProfileId,
        status: record.status,
        remarks: record.remarks?.trim() || null,
      });
    }

    const { error } = await supabase
      .from('attendance_records')
      .upsert(payload, {
        onConflict: 'attendance_date,student_id',
      });

    if (error) {
      throw error;
    }

    return res.json({ message: 'Attendance saved successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to save attendance.');
  }
}

async function getParentAttendanceOverview(req, res) {
  try {
    const parentProfileId = await getParentProfileId(req.user.id);

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        admission_number,
        full_name,
        roll_number,
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

    const studentIds = students.map((student) => student.id);

    const records = studentIds.length === 0
      ? []
      : await (async () => {
        const { data, error } = await supabase
          .from('attendance_records')
          .select(`
            id,
            attendance_date,
            status,
            remarks,
            student_id,
            subject:subjects!attendance_records_subject_id_fkey (
              id,
              name,
              code
            ),
            teacher:teacher_profiles!attendance_records_teacher_id_fkey (
              id,
              user:users!teacher_profiles_user_id_fkey (
                id,
                full_name
              )
            )
          `)
          .in('student_id', studentIds)
          .order('attendance_date', { ascending: false });

        if (error) {
          throw error;
        }

        return data;
      })();

    const recordsByStudentId = studentIds.reduce((acc, studentId) => {
      acc[studentId] = [];
      return acc;
    }, {});

    records.forEach((record) => {
      if (!recordsByStudentId[record.student_id]) {
        recordsByStudentId[record.student_id] = [];
      }

      recordsByStudentId[record.student_id].push(record);
    });

    const studentSummaries = students.map((student) => {
      const history = recordsByStudentId[student.id] || [];
      const totalMarkedDays = history.length;
      const presentDays = history.filter((record) => record.status === 'present').length;
      const attendancePercentage = totalMarkedDays === 0
        ? 0
        : Number(((presentDays / totalMarkedDays) * 100).toFixed(2));

      return {
        ...student,
        stats: {
          totalMarkedDays,
          presentDays,
          absentDays: totalMarkedDays - presentDays,
          attendancePercentage,
        },
        history,
      };
    });

    return res.json({ students: studentSummaries });
  } catch (error) {
    return serverError(res, error, 'Unable to load parent attendance data.');
  }
}

module.exports = {
  getTeacherAssignments,
  getTeacherAttendanceSheet,
  saveTeacherAttendance,
  getParentAttendanceOverview,
};
