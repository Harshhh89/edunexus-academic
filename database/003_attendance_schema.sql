create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum ('present', 'absent');
  end if;
end $$;

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete restrict,
  division_id uuid not null references divisions(id) on delete restrict,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid not null references teacher_profiles(id) on delete restrict,
  status attendance_status not null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendance_date, student_id)
);

create index if not exists idx_attendance_records_student_id on attendance_records(student_id);
create index if not exists idx_attendance_records_teacher_date on attendance_records(teacher_id, attendance_date desc);
create index if not exists idx_attendance_records_class_division_date on attendance_records(class_id, division_id, attendance_date desc);

create or replace function set_attendance_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_attendance_updated_at on attendance_records;

create trigger trg_attendance_updated_at
before update on attendance_records
for each row
execute function set_attendance_updated_at();
