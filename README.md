# EduNexus Academic

Full-stack parent-teacher communication platform starter built with HTML, CSS, JavaScript, Bootstrap, Node.js, Express, and Supabase PostgreSQL.

## Step 1: Project Setup and Login System

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Copy `.env.example` to `.env` and fill in your Supabase values:

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=replace-this-with-a-long-random-secret
```

Use the Supabase service role key only on the backend. Never expose it in frontend JavaScript.

### 3. Create the database tables

Open Supabase SQL Editor and run:

```sql
-- database/001_auth_schema.sql
-- database/002_school_master_schema.sql
-- database/003_attendance_schema.sql
-- database/004_timetable_homework_schema.sql
-- database/005_messaging_schema.sql
-- database/006_parent_admission_fields.sql
-- database/007_remove_parent_name.sql
-- database/008_class_wise_subjects.sql
```

The first file creates login users with `admin`, `teacher`, and `parent` roles. The second file adds academic years, classes, divisions, subjects, parent profiles, teacher profiles, students, and teacher subject assignments. The third file adds attendance records for daily marking and parent history views. The fourth file adds timetable entries and homework items. The fifth file adds parent-teacher messaging threads and messages. The sixth file adds mother and father fields used by the student admission form. The seventh file removes the old `parent_name` field. The eighth file makes curriculum subjects class-wise through a `class_subjects` mapping table.

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:5000`.

### Demo Login

After running the SQL seed, use:

```text
admin@edunexus.test
teacher@edunexus.test
parent@edunexus.test
```

Password for all three demo users:

```text
Password@123
```

## Folder Structure

```text
EduNexus Academic
+-- database
|   +-- 001_auth_schema.sql
|   +-- 002_school_master_schema.sql
|   +-- 003_attendance_schema.sql
|   +-- 004_timetable_homework_schema.sql
|   +-- 005_messaging_schema.sql
|   +-- 006_parent_admission_fields.sql
|   +-- 007_remove_parent_name.sql
|   +-- 008_class_wise_subjects.sql
+-- public
|   +-- css
|   |   +-- styles.css
|   +-- js
|   |   +-- auth.js
|   |   +-- dashboard.js
|   +-- pages
|   |   +-- admin-dashboard.html
|   |   +-- parent-dashboard.html
|   |   +-- teacher-dashboard.html
|   +-- index.html
+-- server
|   +-- config
|   |   +-- supabase.js
|   +-- controllers
|   |   +-- authController.js
|   +-- middleware
|   |   +-- authMiddleware.js
|   +-- routes
|   |   +-- authRoutes.js
|   |   +-- dashboardRoutes.js
|   +-- server.js
+-- .env.example
+-- package.json
+-- README.md
```

## Step 2: School Master Tables

Run [002_school_master_schema.sql](database/002_school_master_schema.sql) after [001_auth_schema.sql](database/001_auth_schema.sql).

This adds:

- `academic_years` for active school year selection.
- `classes` and `divisions` for class-wise sections like Class 3-A.
- `subjects` for school subjects.
- `parent_profiles` linked to parent users.
- `teacher_profiles` linked to teacher users.
- `students` linked to class, division, and parent.
- `teacher_subject_assignments` so each class/division can have different subject teachers.

The seed data creates Class 1 to Class 5, divisions A and B, common subjects, one demo student, one parent profile, one teacher profile, and demo teacher assignments for Class 3-A.

## Step 3: Attendance Module

Run [003_attendance_schema.sql](database/003_attendance_schema.sql) after [001_auth_schema.sql](database/001_auth_schema.sql) and [002_school_master_schema.sql](database/002_school_master_schema.sql).

This adds:

- `attendance_records` with one row per student per day.
- `present` and `absent` attendance status values.
- teacher-linked attendance entries for traceability.
- indexes for student history and teacher/class daily lookups.

Teacher flow:

- Open `/pages/teacher-attendance.html`
- select one assigned class/division
- choose a date and optional subject
- mark each student as present or absent

Parent flow:

- Open `/pages/parent-attendance.html`
- view attendance percentage
- review present and absent totals
- browse full day-wise attendance history

## Step 4: Timetable And Homework

Run [004_timetable_homework_schema.sql](database/004_timetable_homework_schema.sql) after the first three SQL files.

This adds:

- `timetable_entries` for weekly class schedules.
- `homework_items` for teacher-assigned homework.
- day-of-week support for timetable display.
- seeded demo timetable and one demo homework item for Class 3-A.

Timetable flow:

- Admin opens `/pages/admin-timetable.html`
- adds periods by class, division, weekday, and time
- Parent opens `/pages/parent-timetable.html`
- sees the timetable for linked students only

Homework flow:

- Teacher opens `/pages/teacher-homework.html`
- selects one assigned class/division/subject combination
- enters title, description, assigned date, and due date
- Parent opens `/pages/parent-homework.html`
- sees homework for linked students only

## Step 5: Messaging

Run [005_messaging_schema.sql](database/005_messaging_schema.sql) after the first four SQL files.

This adds:

- `message_threads` for parent-teacher-student conversations.
- `messages` for the actual chat history.
- sender role tracking for each message.
- seeded demo conversation data.

Teacher flow:

- Open `/pages/teacher-messages.html`
- start a conversation for an assigned student and subject
- send replies inside the thread

Parent flow:

- Open `/pages/parent-messages.html`
- start a conversation for your own child and assigned teacher
- send replies inside the thread

## Step 6: Parent Creation During Student Admission

Run [006_parent_admission_fields.sql](database/006_parent_admission_fields.sql) and then [007_remove_parent_name.sql](database/007_remove_parent_name.sql) after the first five SQL files.

This adds:

- `mother_name`
- `father_name`

Admin flow:

- Open `/pages/admin-master-data.html`
- in the student form, check `Create a new parent account`
- enter mother name, father name, email, and phone number
- the parent login email becomes the email you enter
- the initial parent password becomes the phone number
- the parent account display name uses the father's name

## Step 7: Class-Wise Curriculum Subjects

Run [008_class_wise_subjects.sql](database/008_class_wise_subjects.sql) after the first seven SQL files.

This adds:

- `class_subjects` to map curriculum subjects to each class.
- class-wise subject filtering in admin teacher assignments.
- class-wise subject filtering in admin timetable creation.

Admin flow:

- Open `/pages/admin-master-data.html`
- in the subject form, first select a class
- add only the subjects that belong to that class curriculum
- while creating teacher assignments, the subject list changes based on the selected class

## What This Step Includes

- Express server setup
- Supabase backend client setup
- JWT-based login
- Password verification with bcrypt
- Role-based middleware
- Admin, Teacher, and Parent dashboard pages
- Protected `/api/auth/me` endpoint

## Next Steps

1. Build parent verification management.
2. Add edit and delete actions for timetable and homework items.
3. Add edit and archive controls for message threads.
