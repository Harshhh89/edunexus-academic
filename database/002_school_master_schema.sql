create extension if not exists "pgcrypto";

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint academic_year_dates_valid check (end_date > start_date)
);

create unique index if not exists idx_academic_years_one_active
on academic_years (is_active)
where is_active = true;

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  created_at timestamptz not null default now()
);

create table if not exists parent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  phone text,
  qualification text,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  admission_number text not null unique,
  full_name text not null,
  roll_number integer,
  class_id uuid not null references classes(id) on delete restrict,
  division_id uuid not null references divisions(id) on delete restrict,
  parent_id uuid not null references parent_profiles(id) on delete restrict,
  date_of_birth date,
  created_at timestamptz not null default now(),
  unique (division_id, roll_number)
);

create table if not exists teacher_subject_assignments (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  teacher_id uuid not null references teacher_profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (academic_year_id, class_id, division_id, subject_id)
);

create index if not exists idx_divisions_class_id on divisions(class_id);
create index if not exists idx_students_class_id on students(class_id);
create index if not exists idx_students_division_id on students(division_id);
create index if not exists idx_students_parent_id on students(parent_id);
create index if not exists idx_teacher_assignments_teacher_id on teacher_subject_assignments(teacher_id);
create index if not exists idx_teacher_assignments_class_division on teacher_subject_assignments(class_id, division_id);

insert into academic_years (name, start_date, end_date, is_active)
values ('2026-2027', '2026-04-01', '2027-03-31', true)
on conflict (name) do nothing;

insert into classes (name, sort_order)
values
  ('Class 1', 1),
  ('Class 2', 2),
  ('Class 3', 3),
  ('Class 4', 4),
  ('Class 5', 5)
on conflict (name) do nothing;

insert into divisions (class_id, name)
select c.id, d.name
from classes c
cross join (values ('A'), ('B')) as d(name)
where c.name in ('Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5')
on conflict (class_id, name) do nothing;

insert into subjects (name, code)
values
  ('English', 'ENG'),
  ('Mathematics', 'MATH'),
  ('Science', 'SCI'),
  ('Social Studies', 'SST'),
  ('Hindi', 'HIN')
on conflict (name) do nothing;

insert into parent_profiles (user_id, phone, address)
select id, '9000000001', 'Demo parent address'
from users
where email = 'parent@edunexus.test'
on conflict (user_id) do nothing;

insert into teacher_profiles (user_id, phone, qualification)
select id, '9000000002', 'B.Ed'
from users
where email = 'teacher@edunexus.test'
on conflict (user_id) do nothing;

insert into students (admission_number, full_name, roll_number, class_id, division_id, parent_id, date_of_birth)
select
  'ADM-1001',
  'Aarav Rahul',
  1,
  c.id,
  d.id,
  p.id,
  '2017-08-12'
from classes c
join divisions d on d.class_id = c.id and d.name = 'A'
join parent_profiles p on true
join users u on u.id = p.user_id and u.email = 'parent@edunexus.test'
where c.name = 'Class 3'
on conflict (admission_number) do nothing;

insert into teacher_subject_assignments (academic_year_id, teacher_id, class_id, division_id, subject_id)
select ay.id, tp.id, c.id, d.id, s.id
from academic_years ay
join teacher_profiles tp on true
join users u on u.id = tp.user_id and u.email = 'teacher@edunexus.test'
join classes c on c.name = 'Class 3'
join divisions d on d.class_id = c.id and d.name = 'A'
join subjects s on s.name in ('English', 'Mathematics')
where ay.name = '2026-2027'
on conflict (academic_year_id, class_id, division_id, subject_id) do nothing;
