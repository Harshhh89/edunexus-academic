const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getAdminBootstrap,
  getClasses,
  getDivisions,
  createClass,
  deleteClass,
  createDivision,
  deleteDivision,
  getSubjects,
  getClassSubjects,
  createSubject,
  deleteSubject,
  getParents,
  getTeachers,
  getStudents,
  createStudent,
  deleteStudent,
  getAssignments,
  createAssignment,
  deleteAssignment,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/bootstrap', getAdminBootstrap);

router.get('/classes', getClasses);
router.get('/divisions', getDivisions);
router.post('/classes', createClass);
router.delete('/classes/:id', deleteClass);
router.post('/divisions', createDivision);
router.delete('/divisions/:id', deleteDivision);

router.get('/subjects', getSubjects);
router.get('/class-subjects', getClassSubjects);
router.post('/subjects', createSubject);
router.delete('/subjects/:id', deleteSubject);

router.get('/parents', getParents);
router.get('/teachers', getTeachers);

router.get('/students', getStudents);
router.post('/students', createStudent);
router.delete('/students/:id', deleteStudent);

router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
router.delete('/assignments/:id', deleteAssignment);

module.exports = router;
