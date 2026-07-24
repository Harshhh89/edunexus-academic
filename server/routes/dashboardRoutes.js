const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', authenticate, authorizeRoles('admin'), (req, res) => {
  res.json({
    message: 'Welcome to the Admin dashboard.',
    nextModules: ['Student Management', 'Teacher Allocation', 'Class and Division Setup'],
  });
});

router.get('/teacher', authenticate, authorizeRoles('teacher'), (req, res) => {
  res.json({
    message: 'Welcome to the Teacher dashboard.',
    nextModules: ['Attendance', 'Homework', 'Messaging'],
  });
});

router.get('/parent', authenticate, authorizeRoles('parent'), (req, res) => {
  res.json({
    message: 'Welcome to the Parent dashboard.',
    nextModules: ['Attendance View', 'Timetable View', 'Homework View', 'Messaging'],
  });
});

module.exports = router;
