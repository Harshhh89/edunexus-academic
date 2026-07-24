const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getTeacherMessagingBootstrap,
  createTeacherThread,
  sendTeacherMessage,
  getParentMessagingBootstrap,
  createParentThread,
  sendParentMessage,
} = require('../controllers/messagingController');

const router = express.Router();

router.get('/teacher/bootstrap', authenticate, authorizeRoles('teacher'), getTeacherMessagingBootstrap);
router.post('/teacher/threads', authenticate, authorizeRoles('teacher'), createTeacherThread);
router.post('/teacher/messages', authenticate, authorizeRoles('teacher'), sendTeacherMessage);

router.get('/parent/bootstrap', authenticate, authorizeRoles('parent'), getParentMessagingBootstrap);
router.post('/parent/threads', authenticate, authorizeRoles('parent'), createParentThread);
router.post('/parent/messages', authenticate, authorizeRoles('parent'), sendParentMessage);

module.exports = router;
