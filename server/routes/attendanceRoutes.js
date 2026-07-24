const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getTeacherAssignments,
  getTeacherAttendanceSheet,
  saveTeacherAttendance,
  getParentAttendanceOverview,
} = require('../controllers/attendanceController');

const router = express.Router();

router.get('/teacher/assignments', authenticate, authorizeRoles('teacher'), getTeacherAssignments);
router.get('/teacher/sheet', authenticate, authorizeRoles('teacher'), getTeacherAttendanceSheet);
router.post('/teacher/mark', authenticate, authorizeRoles('teacher'), saveTeacherAttendance);

router.get('/parent/overview', authenticate, authorizeRoles('parent'), getParentAttendanceOverview);

module.exports = router;
