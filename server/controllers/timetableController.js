const supabase = require('../config/supabase');

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function badRequest(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, error, fallbackMessage) {
  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
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

async function getTimetableBootstrapData() {
  const [{ data: academicYears, error: academicYearsError }, { data: classes, error: classesError }, { data: subjects, error: subjectsError }, { data: teachers, error: teachersError }] = await Promise.all([
    supabase.from('academic_years').select('id, name, is_active').order('start_date', { ascending: false }),
    supabase.from('classes').select('id, name, sort_order, divisions(id, name)').order('sort_order', { ascending: true }),
    supabase.from('class_subjects').select(`
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
    `).order('created_at', { ascending: false }),
    supabase.from('teacher_profiles').select(`
      id,
      user:users!teacher_profiles_user_id_fkey (
        id,
        full_name,
        email
      )
    `).order('created_at', { ascending: false }),
  ]);

  if (academicYearsError) throw academicYearsError;
  if (classesError) throw classesError;
  if (subjectsError) throw subjectsError;
  if (teachersError) throw teachersError;

  return { academicYears, classes, subjects, teachers };
}

async function fetchTimetableEntries() {
  const { data, error } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      weekday,
      period_number,
      start_time,
      end_time,
      room_label,
      academic_year:academic_years!timetable_entries_academic_year_id_fkey (
        id,
        name,
        is_active
      ),
      class:classes!timetable_entries_class_id_fkey (
        id,
        name
      ),
      division:divisions!timetable_entries_division_id_fkey (
        id,
        name
      ),
      subject:subjects!timetable_entries_subject_id_fkey (
        id,
        name,
        code
      ),
      teacher:teacher_profiles!timetable_entries_teacher_id_fkey (
        id,
        user:users!teacher_profiles_user_id_fkey (
          id,
          full_name
        )
      )
    `)
    .order('weekday', { ascending: true })
    .order('period_number', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

async function getAdminTimetableBootstrap(req, res) {
  try {
    const [baseData, entries] = await Promise.all([
      getTimetableBootstrapData(),
      fetchTimetableEntries(),
    ]);

    return res.json({
      ...baseData,
      entries,
      weekdays,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to load timetable management data.');
  }
}

async function createTimetableEntry(req, res) {
  const {
    academicYearId,
    classId,
    divisionId,
    subjectId,
    teacherId,
    weekday,
    periodNumber,
    startTime,
    endTime,
    roomLabel,
  } = req.body;

  if (!academicYearId || !classId || !divisionId || !subjectId || !weekday || !periodNumber || !startTime || !endTime) {
    return badRequest(res, 'Academic year, class, division, subject, weekday, period number, start time, and end time are required.');
  }

  if (!weekdays.includes(weekday)) {
    return badRequest(res, 'Invalid weekday.');
  }

  try {
    const { data: classSubjects, error: classSubjectsError } = await supabase
      .from('class_subjects')
      .select('subject_id')
      .eq('class_id', classId);

    if (classSubjectsError) {
      throw classSubjectsError;
    }

    const allowedSubjectIds = new Set((classSubjects || []).map((item) => item.subject_id));

    if (!allowedSubjectIds.has(subjectId)) {
      return badRequest(res, 'This subject is not part of the selected class curriculum.');
    }

    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({
        academic_year_id: academicYearId,
        class_id: classId,
        division_id: divisionId,
        subject_id: subjectId,
        teacher_id: teacherId || null,
        weekday,
        period_number: Number(periodNumber),
        start_time: startTime,
        end_time: endTime,
        room_label: roomLabel?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return badRequest(res, 'A timetable entry already exists for this class, division, day, and period.');
      }

      throw error;
    }

    return res.status(201).json({
      message: 'Timetable entry created successfully.',
      id: data.id,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create timetable entry.');
  }
}

async function deleteTimetableEntry(req, res) {
  try {
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    return res.json({ message: 'Timetable entry deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Unable to delete timetable entry.');
  }
}

async function getParentTimetableOverview(req, res) {
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
      const { data: entries, error: entriesError } = await supabase
        .from('timetable_entries')
        .select(`
          id,
          weekday,
          period_number,
          start_time,
          end_time,
          room_label,
          subject:subjects!timetable_entries_subject_id_fkey (
            id,
            name,
            code
          ),
          teacher:teacher_profiles!timetable_entries_teacher_id_fkey (
            id,
            user:users!teacher_profiles_user_id_fkey (
              id,
              full_name
            )
          ),
          academic_year:academic_years!timetable_entries_academic_year_id_fkey (
            id,
            name,
            is_active
          )
        `)
        .eq('class_id', student.class.id)
        .eq('division_id', student.division.id)
        .order('weekday', { ascending: true })
        .order('period_number', { ascending: true });

      if (entriesError) {
        throw entriesError;
      }

      const grouped = weekdays.map((day) => ({
        day,
        entries: entries.filter((entry) => entry.weekday === day),
      }));

      overviews.push({
        ...student,
        timetable: grouped,
      });
    }

    return res.json({ students: overviews, weekdays });
  } catch (error) {
    return serverError(res, error, 'Unable to load parent timetable.');
  }
}

module.exports = {
  getAdminTimetableBootstrap,
  createTimetableEntry,
  deleteTimetableEntry,
  getParentTimetableOverview,
};
