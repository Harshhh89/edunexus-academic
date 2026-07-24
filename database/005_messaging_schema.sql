create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_sender_role') then
    create type message_sender_role as enum ('teacher', 'parent');
  end if;
end $$;

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  parent_id uuid not null references parent_profiles(id) on delete cascade,
  teacher_id uuid not null references teacher_profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, parent_id, teacher_id, subject_id)
);

create index if not exists idx_message_threads_parent_id on message_threads(parent_id);
create index if not exists idx_message_threads_teacher_id on message_threads(teacher_id);
create index if not exists idx_message_threads_student_id on message_threads(student_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_role message_sender_role not null,
  sender_parent_id uuid references parent_profiles(id) on delete set null,
  sender_teacher_id uuid references teacher_profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint message_sender_parent_or_teacher check (
    (sender_role = 'parent' and sender_parent_id is not null and sender_teacher_id is null)
    or
    (sender_role = 'teacher' and sender_teacher_id is not null and sender_parent_id is null)
  )
);

create index if not exists idx_messages_thread_created_at on messages(thread_id, created_at);

insert into message_threads (student_id, parent_id, teacher_id, subject_id)
select
  s.id,
  p.id,
  tp.id,
  sub.id
from students s
join parent_profiles p on p.id = s.parent_id
join users pu on pu.id = p.user_id and pu.email = 'parent@edunexus.test'
join teacher_profiles tp on true
join users tu on tu.id = tp.user_id and tu.email = 'teacher@edunexus.test'
join subjects sub on sub.code = 'ENG'
where s.admission_number = 'ADM-1001'
on conflict (student_id, parent_id, teacher_id, subject_id) do nothing;

insert into messages (thread_id, sender_role, sender_teacher_id, body)
select
  mt.id,
  'teacher',
  mt.teacher_id,
  'Please remind Aarav to bring the English notebook tomorrow.'
from message_threads mt
join students s on s.id = mt.student_id and s.admission_number = 'ADM-1001'
join subjects sub on sub.id = mt.subject_id and sub.code = 'ENG'
where not exists (
  select 1
  from messages m
  where m.thread_id = mt.id
);
