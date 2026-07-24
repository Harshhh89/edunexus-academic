create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'weekday_name') then
    create type weekday_name as enum ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
  end if;
end $$;

create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  class_id uuid not null references classes(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete restrict,
  teacher_id uuid references teacher_profiles(id) on delete set null,
  weekday weekday_name not null,
  period_number integer not null,
  start_time time not null,
  end_time time not null,
  room_label text,
  created_at timestamptz not null default now(),
  constraint timetable_period_positive check (period_number > 0),
  constraint timetable_time_valid check (end_time > start_time),
  unique (academic_year_id, class_id, division_id, weekday, period_number)
);

create index if not exists idx_timetable_class_division_weekday
on timetable_entries(class_id, division_id, weekday, period_number);

create table if not exists homework_items (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  class_id uuid not null references classes(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete restrict,
  teacher_id uuid not null references teacher_profiles(id) on delete restrict,
  title text not null,
  description text not null,
  assigned_date date not null default current_date,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_due_date_valid check (due_date >= assigned_date)
);

create index if not exists idx_homework_class_division_due_date
on homework_items(class_id, division_id, due_date desc);

create index if not exists idx_homework_teacher_created_at
on homework_items(teacher_id, created_at desc);

create or replace function set_homework_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_homework_updated_at on homework_items;

create trigger trg_homework_updated_at
before update on homework_items
for each row
execute function set_homework_updated_at();

insert into timetable_entries (
  academic_year_id,
  class_id,
  division_id,
  subject_id,
  teacher_id,
  weekday,
  period_number,
  start_time,
  end_time,
  room_label
)
select
  ay.id,
  c.id,
  d.id,
  s.id,
  tp.id,
  schedule.weekday::weekday_name,
  schedule.period_number,
  schedule.start_time::time,
  schedule.end_time::time,
  schedule.room_label
from academic_years ay
join classes c on c.name = 'Class 3'
join divisions d on d.class_id = c.id and d.name = 'A'
join teacher_profiles tp on true
join users u on u.id = tp.user_id and u.email = 'teacher@edunexus.test'
join (
  values
    ('monday', 1, '08:30', '09:15', 'ENG', 'Room 12'),
    ('monday', 2, '09:20', '10:05', 'MATH', 'Room 12'),
    ('tuesday', 1, '08:30', '09:15', 'ENG', 'Room 12'),
    ('tuesday', 2, '09:20', '10:05', 'MATH', 'Room 12')
) as schedule(weekday, period_number, start_time, end_time, subject_code, room_label) on true
join subjects s on s.code = schedule.subject_code
where ay.is_active = true
on conflict (academic_year_id, class_id, division_id, weekday, period_number) do nothing;

insert into homework_items (
  academic_year_id,
  class_id,
  division_id,
  subject_id,
  teacher_id,
  title,
  description,
  assigned_date,
  due_date
)
select
  ay.id,
  c.id,
  d.id,
  s.id,
  tp.id,
  'Reading Practice',
  'Read chapter 3 and write five new words with meanings.',
  current_date,
  current_date + 3
from academic_years ay
join classes c on c.name = 'Class 3'
join divisions d on d.class_id = c.id and d.name = 'A'
join teacher_profiles tp on true
join users u on u.id = tp.user_id and u.email = 'teacher@edunexus.test'
join subjects s on s.code = 'ENG'
where ay.is_active = true
on conflict do nothing;
