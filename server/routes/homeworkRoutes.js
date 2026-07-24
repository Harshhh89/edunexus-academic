const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getTeacherHomeworkBootstrap,
  createHomework,
  deleteHomework,
  getParentHomeworkOverview,
} = require('../controllers/homeworkController');

const router = express.Router();

router.get('/teacher/bootstrap', authenticate, authorizeRoles('teacher'), getTeacherHomeworkBootstrap);
router.post('/teacher/create', authenticate, authorizeRoles('teacher'), createHomework);
router.delete('/teacher/:id', authenticate, authorizeRoles('teacher'), deleteHomework);

router.get('/parent/overview', authenticate, authorizeRoles('parent'), getParentHomeworkOverview);

module.exports = router;
