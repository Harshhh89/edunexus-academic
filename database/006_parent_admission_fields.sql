alter table parent_profiles
add column if not exists mother_name text,
add column if not exists father_name text;

update parent_profiles
set
  mother_name = coalesce(mother_name, 'Neha Rahul'),
  father_name = coalesce(father_name, 'Rahul Kumar')
where user_id in (
  select id from users where email = 'parent@edunexus.test'
);
