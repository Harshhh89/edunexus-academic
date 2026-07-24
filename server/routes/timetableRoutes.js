const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getAdminTimetableBootstrap,
  createTimetableEntry,
  deleteTimetableEntry,
  getParentTimetableOverview,
} = require('../controllers/timetableController');

const router = express.Router();

router.get('/admin/bootstrap', authenticate, authorizeRoles('admin'), getAdminTimetableBootstrap);
router.post('/admin/entries', authenticate, authorizeRoles('admin'), createTimetableEntry);
router.delete('/admin/entries/:id', authenticate, authorizeRoles('admin'), deleteTimetableEntry);

router.get('/parent/overview', authenticate, authorizeRoles('parent'), getParentTimetableOverview);

module.exports = router;
