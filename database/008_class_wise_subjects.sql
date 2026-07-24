create table if not exists class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id)
);

create index if not exists idx_class_subjects_class_id on class_subjects(class_id);
create index if not exists idx_class_subjects_subject_id on class_subjects(subject_id);

insert into class_subjects (class_id, subject_id)
select c.id, s.id
from classes c
cross join subjects s
where c.name in ('Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5')
on conflict (class_id, subject_id) do nothing;
