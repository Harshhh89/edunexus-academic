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

  if (error) throw error;
  return data.id;
}

async function getParentProfileId(userId) {
  const { data, error } = await supabase
    .from('parent_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data.id;
}

async function fetchTeacherAssignments(teacherProfileId) {
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
      )
    `)
    .eq('teacher_id', teacherProfileId);

  if (error) throw error;
  return data;
}

async function fetchParentStudents(parentProfileId) {
  const { data, error } = await supabase
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

  if (error) throw error;
  return data;
}

async function fetchThreadMessages(threadId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      body,
      sender_role,
      created_at,
      sender_parent:parent_profiles!messages_sender_parent_id_fkey (
        id,
        user:users!parent_profiles_user_id_fkey (
          id,
          full_name
        )
      ),
      sender_teacher:teacher_profiles!messages_sender_teacher_id_fkey (
        id,
        user:users!teacher_profiles_user_id_fkey (
          id,
          full_name
        )
      )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function fetchTeacherThreads(teacherProfileId) {
  const { data, error } = await supabase
    .from('message_threads')
    .select(`
      id,
      created_at,
      subject:subjects!message_threads_subject_id_fkey (
        id,
        name,
        code
      ),
      student:students!message_threads_student_id_fkey (
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
      ),
      parent:parent_profiles!message_threads_parent_id_fkey (
        id,
        user:users!parent_profiles_user_id_fkey (
          id,
          full_name,
          email
        )
      )
    `)
    .eq('teacher_id', teacherProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const threadsWithMessages = [];
  for (const thread of data) {
    const messages = await fetchThreadMessages(thread.id);
    threadsWithMessages.push({ ...thread, messages });
  }

  return threadsWithMessages;
}

async function fetchParentThreads(parentProfileId) {
  const { data, error } = await supabase
    .from('message_threads')
    .select(`
      id,
      created_at,
      subject:subjects!message_threads_subject_id_fkey (
        id,
        name,
        code
      ),
      student:students!message_threads_student_id_fkey (
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
      ),
      teacher:teacher_profiles!message_threads_teacher_id_fkey (
        id,
        user:users!teacher_profiles_user_id_fkey (
          id,
          full_name,
          email
        )
      )
    `)
    .eq('parent_id', parentProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const threadsWithMessages = [];
  for (const thread of data) {
    const messages = await fetchThreadMessages(thread.id);
    threadsWithMessages.push({ ...thread, messages });
  }

  return threadsWithMessages;
}

async function getTeacherMessagingBootstrap(req, res) {
  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const [assignments, threads] = await Promise.all([
      fetchTeacherAssignments(teacherProfileId),
      fetchTeacherThreads(teacherProfileId),
    ]);

    return res.json({ assignments, threads });
  } catch (error) {
    return serverError(res, error, 'Unable to load teacher messaging data.');
  }
}

async function createTeacherThread(req, res) {
  const { studentId, parentId, subjectId } = req.body;

  if (!studentId || !parentId) {
    return badRequest(res, 'Student and parent are required.');
  }

  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const assignments = await fetchTeacherAssignments(teacherProfileId);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class_id, division_id, parent_id')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    if (student.parent_id !== parentId) {
      return res.status(403).json({ message: 'This student is not linked to the selected parent.' });
    }

    const matchingAssignments = assignments.filter((assignment) => (
      assignment.class?.id === student.class_id
      && assignment.division?.id === student.division_id
      && (!subjectId || assignment.subject?.id === subjectId)
    ));

    if (matchingAssignments.length === 0) {
      return res.status(403).json({ message: 'You can only create threads for your assigned classes and subjects.' });
    }

    const selectedSubjectId = subjectId || matchingAssignments[0].subject?.id || null;

    const { data, error } = await supabase
      .from('message_threads')
      .upsert({
        student_id: studentId,
        parent_id: parentId,
        teacher_id: teacherProfileId,
        subject_id: selectedSubjectId,
      }, {
        onConflict: 'student_id,parent_id,teacher_id,subject_id',
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Conversation ready.',
      threadId: data.id,
    });
  } catch (error) {
    return serverError(res, error, 'Unable to create conversation thread.');
  }
}

async function sendTeacherMessage(req, res) {
  const { threadId, body } = req.body;

  if (!threadId || !body?.trim()) {
    return badRequest(res, 'Thread and message body are required.');
  }

  try {
    const teacherProfileId = await getTeacherProfileId(req.user.id);
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, teacher_id')
      .eq('id', threadId)
      .single();

    if (threadError) throw threadError;
    if (thread.teacher_id !== teacherProfileId) {
      return res.status(403).json({ message: 'You do not have access to this conversation.' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_role: 'teacher',
        sender_teacher_id: teacherProfileId,
        body: body.trim(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Message sent successfully.', id: data.id });
  } catch (error) {
    return serverError(res, error, 'Unable to send message.');
  }
}

async function getParentMessagingBootstrap(req, res) {
  try {
    const parentProfileId = await getParentProfileId(req.user.id);
    const [students, threads] = await Promise.all([
      fetchParentStudents(parentProfileId),
      fetchParentThreads(parentProfileId),
    ]);

    return res.json({ students, threads });
  } catch (error) {
    return serverError(res, error, 'Unable to load parent messaging data.');
  }
}

async function createParentThread(req, res) {
  const { studentId, teacherId, subjectId } = req.body;

  if (!studentId || !teacherId) {
    return badRequest(res, 'Student and teacher are required.');
  }

  try {
    const parentProfileId = await getParentProfileId(req.user.id);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, parent_id, class_id, division_id')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;
    if (student.parent_id !== parentProfileId) {
      return res.status(403).json({ message: 'You can only create conversations for your own child.' });
    }

    const { data: assignments, error: assignmentError } = await supabase
      .from('teacher_subject_assignments')
      .select('subject_id')
      .eq('teacher_id', teacherId)
      .eq('class_id', student.class_id)
      .eq('division_id', student.division_id);

    if (assignmentError) throw assignmentError;
    if (!assignments.length) {
      return res.status(403).json({ message: 'This teacher is not assigned to your child\'s class and division.' });
    }

    const allowedSubjectIds = assignments.map((assignment) => assignment.subject_id);
    const selectedSubjectId = subjectId && allowedSubjectIds.includes(subjectId) ? subjectId : allowedSubjectIds[0];

    const { data, error } = await supabase
      .from('message_threads')
      .upsert({
        student_id: studentId,
        parent_id: parentProfileId,
        teacher_id: teacherId,
        subject_id: selectedSubjectId,
      }, {
        onConflict: 'student_id,parent_id,teacher_id,subject_id',
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Conversation ready.', threadId: data.id });
  } catch (error) {
    return serverError(res, error, 'Unable to create conversation thread.');
  }
}

async function sendParentMessage(req, res) {
  const { threadId, body } = req.body;

  if (!threadId || !body?.trim()) {
    return badRequest(res, 'Thread and message body are required.');
  }

  try {
    const parentProfileId = await getParentProfileId(req.user.id);
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, parent_id')
      .eq('id', threadId)
      .single();

    if (threadError) throw threadError;
    if (thread.parent_id !== parentProfileId) {
      return res.status(403).json({ message: 'You do not have access to this conversation.' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_role: 'parent',
        sender_parent_id: parentProfileId,
        body: body.trim(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Message sent successfully.', id: data.id });
  } catch (error) {
    return serverError(res, error, 'Unable to send message.');
  }
}

module.exports = {
  getTeacherMessagingBootstrap,
  createTeacherThread,
  sendTeacherMessage,
  getParentMessagingBootstrap,
  createParentThread,
  sendParentMessage,
};
