const express = require('express');
const { body, validationResult } = require('express-validator');
const { Employee, Tenant, Payout, Attendance, LeaveRequest, EmployeeDocument } = require('../../models');
const multer = require('multer');
const path = require('path');
const { sendEmail, sendSMS } = require("../utils/notify");
const { renderEmail } = require("../utils/emailTemplates");
const { recordAuditLog } = require("../utils/audit");
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});
const upload = multer({ storage });
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');

// For service assignment and hours logging
const { Service, EmployeeService, WorkHour } = require('../../models');

const router = express.Router();

// List all employees for the current tenant
router.get(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const employees = await Employee.findAll({
        where: { tenantId: req.user.tenantId },
        order: [['name', 'ASC']],
      });
      res.json({ employees });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employees', details: err.message });
    }
  }
);

// Employee: View own salary/payout history
router.get(
  '/:id/salary-history',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  async (req, res) => {
    const { id } = req.params;
    // Only allow staff to view their own history, or admin/manager for any staff in their tenant
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const payouts = await Payout.findAll({
        where: { employeeId: id },
        order: [['paidAt', 'DESC']],
      });
      res.json({ payouts });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch salary history', details: err.message });
    }
  }
);

// Admin: Record a payout for an employee and notify them
router.post(
  "/:id/payout",
  authenticateJWT,
  requireRole(["Admin"]),
  async (req, res) => {
    const { id } = req.params;
    const { amount, method, notes } = req.body;
    if (!amount || !method) {
      return res.status(400).json({ error: "amount and method are required" });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      if (employee.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Forbidden" });

      const payout = await Payout.create({
        employeeId: id,
        amount,
        method,
        notes,
        paidAt: new Date(),
        tenantId: req.user.tenantId,
      });

      // Send payout notification email (non-blocking)
      if (employee.email) {
        sendEmail({
          to: employee.email,
          subject: "Salary/Payout Notification",
          html: renderEmail({
            title: "Payout Processed",
            body: `
              <p>Dear ${employee.name},</p>
              <p>You have received a payout of <b>Ksh ${amount}</b> via <b>${method}</b>.</p>
              <p>Notes: ${notes || "N/A"}</p>
            `,
          }),
        }).catch(() => {});
      }

      // Audit log
      recordAuditLog({
        action: "record_payout",
        userId: req.user.id,
        tenantId: req.user.tenantId,
        targetType: "Employee",
        targetId: id,
        details: { amount, method, notes, payoutId: payout.id },
        ip: req.ip,
      });

      // Send SMS notification (non-blocking)
      if (employee.contact && employee.contact.match(/^\+\d{10,15}$/)) {
        sendSMS({
          to: employee.contact,
          body: `Fellas Spa: You have received a payout of Ksh ${amount} via ${method}. Notes: ${notes || "N/A"}`,
        }).catch(() => {});
      }

      res.status(201).json({ message: "Payout recorded", payout });
    } catch (err) {
      res.status(500).json({ error: "Failed to record payout", details: err.message });
    }
  }
);

/**
 * Log attendance for an employee (self or by admin/manager)
 * POST /employee/:id/attendance
 * Body: { date, status, notes }
 */
router.post(
  '/:id/attendance',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  [
    body('date').notEmpty(),
    body('status').isIn(['present', 'absent', 'late', 'excused']),
    body('notes').optional(),
  ],
  async (req, res) => {
    const { id } = req.params;
    // Staff can only log their own attendance
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { date, status, notes } = req.body;
      const attendance = await Attendance.create({
        employeeId: id,
        date,
        status,
        notes,
      });
      res.status(201).json({ message: 'Attendance logged', attendance });
    } catch (err) {
      res.status(500).json({ error: 'Failed to log attendance', details: err.message });
    }
  }
);

/**
 * View attendance history for an employee (self or by admin/manager)
 * GET /employee/:id/attendance
 */
router.get(
  '/:id/attendance',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  async (req, res) => {
    const { id } = req.params;
    // Staff can only view their own attendance
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const attendance = await Attendance.findAll({
        where: { employeeId: id },
        order: [['date', 'DESC']],
      });
      res.json({ attendance });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch attendance history', details: err.message });
    }
  }
);

/**
 * Staff submit a leave request
 * POST /employee/:id/leave-requests
 * Body: { startDate, endDate, type, reason }
 */
router.post(
  '/:id/leave-requests',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  [
    body('startDate').notEmpty(),
    body('endDate').notEmpty(),
    body('type').isIn(['annual', 'sick', 'unpaid', 'other']),
    body('reason').optional(),
  ],
  async (req, res) => {
    const { id } = req.params;
    // Staff can only submit for themselves
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { startDate, endDate, type, reason } = req.body;
      const leave = await LeaveRequest.create({
        employeeId: id,
        startDate,
        endDate,
        type,
        reason,
        status: 'pending',
      });
      res.status(201).json({ message: 'Leave request submitted', leave });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit leave request', details: err.message });
    }
  }
);

/**
 * View leave requests for an employee (self or by admin/manager)
 * GET /employee/:id/leave-requests
 */
router.get(
  '/:id/leave-requests',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  async (req, res) => {
    const { id } = req.params;
    // Staff can only view their own leave requests
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const leaves = await LeaveRequest.findAll({
        where: { employeeId: id },
        order: [['createdAt', 'DESC']],
      });
      res.json({ leaves });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch leave requests', details: err.message });
    }
  }
);

/**
 * Approve/reject a leave request (manager/admin only)
 * PATCH /employee/:id/leave-requests/:requestId
 * Body: { status, response }
 */
router.patch(
  '/:id/leave-requests/:requestId',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('status').isIn(['approved', 'rejected']),
    body('response').optional(),
  ],
  async (req, res) => {
    const { id, requestId } = req.params;
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const leave = await LeaveRequest.findByPk(requestId);
      if (!leave || leave.employeeId !== parseInt(id, 10)) {
        return res.status(404).json({ error: 'Leave request not found' });
      }
      leave.status = req.body.status;
      leave.response = req.body.response;
      leave.approverId = req.user.id;
      await leave.save();
      res.json({ message: 'Leave request updated', leave });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update leave request', details: err.message });
    }
  }
);

/**
 * Manager/Admin: View all leave requests for their tenant's staff
 * GET /employee/leave-requests
 */
router.get(
  '/team/leave-requests',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const employees = await Employee.findAll({
        where: { tenantId: req.user.tenantId },
        attributes: ['id', 'name'],
      });
      const employeeMap = {};
      employees.forEach((e) => (employeeMap[e.id] = e.name));
      const leaves = await LeaveRequest.findAll({
        where: { employeeId: employees.map((e) => e.id) },
        order: [['createdAt', 'DESC']],
      });
      const requests = leaves.map((l) => ({
        ...l.toJSON(),
        employeeName: employeeMap[l.employeeId] || "Unknown",
      }));
      res.json({ requests });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch team leave requests', details: err.message });
    }
  }
);

/**
 * Upload a document for an employee (admin/manager or self)
 * POST /employee/:id/documents
 * FormData: file
 */
router.post(
  '/:id/documents',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  upload.single('file'),
  async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Staff can only upload for themselves
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const doc = await EmployeeDocument.create({
        employeeId: id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        type: req.file.mimetype,
        uploadedBy: req.user.id,
      });

      // Audit log
      recordAuditLog({
        action: "upload_employee_document",
        userId: req.user.id,
        tenantId: req.user.tenantId,
        targetType: "Employee",
        targetId: id,
        details: { docId: doc.id, filename: doc.filename, originalName: doc.originalName },
        ip: req.ip,
      });

      res.status(201).json({ message: 'Document uploaded', doc });
    } catch (err) {
      res.status(500).json({ error: 'Failed to upload document', details: err.message });
    }
  }
);

/**
 * List documents for an employee (admin/manager or self)
 * GET /employee/:id/documents
 */
router.get(
  '/:id/documents',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff', 'Employee']),
  async (req, res) => {
    const { id } = req.params;
    // Staff can only view their own documents
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const docs = await EmployeeDocument.findAll({
        where: { employeeId: id },
        order: [['createdAt', 'DESC']],
      });
      res.json({ docs });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch documents', details: err.message });
    }
  }
);

/**
 * Download a document for an employee (admin/manager or self)
 * GET /employee/:id/documents/:docId
 */
router.get(
  '/:id/documents/:docId',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff']),
  async (req, res) => {
    const { id, docId } = req.params;
    // Staff can only download their own documents
    if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const doc = await EmployeeDocument.findByPk(docId);
      if (!doc || doc.employeeId !== parseInt(id, 10)) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const filePath = path.join(uploadDir, doc.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }
      res.download(filePath, doc.originalName);
    } catch (err) {
      res.status(500).json({ error: 'Failed to download document', details: err.message });
    }
  }
);

/**
 * Create a new employee
 * POST /employees
 * Body: { name, role, contact, email, storeId, photoUrl }
 */
const crypto = require("crypto");
const { User } = require("../../models");

router.post(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').notEmpty(),
    body('role').notEmpty(),
    body('contact').notEmpty(),
    body('email').isEmail(),
    body('storeId').optional(),
    body('photoUrl').optional(),
    body('roleDescription').optional(),
  ],
  async (req, res) => {
    try {
      const { name, role, contact, email, storeId, photoUrl, roleDescription } = req.body;
      // Create Employee
      const employee = await Employee.create({
        name,
        role,
        contact,
        email,
        storeId,
        photoUrl,
        roleDescription,
        tenantId: req.user.tenantId,
      });

      // Check if user already exists
      let user = await User.findOne({ where: { email } });
      if (!user) {
        // Generate registration token
        const registrationToken = crypto.randomBytes(32).toString("hex");
        const registrationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user = await User.create({
          username: name,
          email,
          role,
          roleDescription,
          tenantId: req.user.tenantId,
          registrationToken,
          registrationTokenExpires,
        });
      } else {
        // Update role and roleDescription if user already exists
        user.role = role;
        user.roleDescription = roleDescription;
        await user.save();
      }

      res.status(201).json({ employee });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create employee', details: err.message });
    }
  }
);

/**
 * Get salary info for an employee
 * GET /employee/:id/salary
 */
router.get(
  '/:id/salary',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      res.json({
        type: employee.salaryType || "fixed",
        base: employee.salaryBase || "",
        commission: employee.commissionRate || "",
        payouts: employee.payoutHistory || [],
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch salary info', details: err.message });
    }
  }
);

/**
 * Update salary info for an employee
 * PUT /employee/:id/salary
 */
router.put(
  '/:id/salary',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    const { type, base, commission } = req.body;
    try {
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      employee.salaryType = type || "fixed";
      employee.salaryBase = base || "";
      employee.commissionRate = commission || "";
      await employee.save();
      res.json({ message: 'Salary info updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update salary info', details: err.message });
    }
  }
);

/**
 * Update an employee
 * PUT /employees/:id
 * Body: { name, role, contact, email, storeId, photoUrl }
 */
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) return res.status(403).json({ error: 'Forbidden' });
      const { name, role, contact, email, storeId, photoUrl, roleDescription } = req.body;
      Object.assign(employee, { name, role, contact, email, storeId, photoUrl, roleDescription });
      await employee.save();
      res.json({ employee });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update employee', details: err.message });
    }
  }
);

/**
 * Assign services to an employee
 * POST /employees/:id/services
 * Body: { serviceIds: [1,2,3] }
 */
router.post(
  '/:id/services',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { serviceIds } = req.body;
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) return res.status(403).json({ error: 'Forbidden' });
      // Remove existing assignments
      await EmployeeService.destroy({ where: { employeeId: id } });
      // Assign new services
      if (Array.isArray(serviceIds)) {
        await Promise.all(
          serviceIds.map((serviceId) =>
            EmployeeService.create({ employeeId: id, serviceId })
          )
        );
      }
      res.json({ message: 'Services assigned' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to assign services', details: err.message });
    }
  }
);

/**
 * Log work hours for an employee
 * POST /employees/:id/hours
 * Body: { date, hours }
 */
router.post(
  '/:id/hours',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff']),
  [
    body('date').notEmpty(),
    body('hours').isNumeric(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date, hours } = req.body;
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (employee.tenantId !== req.user.tenantId) return res.status(403).json({ error: 'Forbidden' });
      // Staff can only log their own hours
      if (req.user.role === 'Staff' && req.user.id !== parseInt(id, 10)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const workHour = await WorkHour.create({
        employeeId: id,
        date,
        hours,
      });
      res.status(201).json({ workHour });
    } catch (err) {
      res.status(500).json({ error: 'Failed to log hours', details: err.message });
    }
  }
);

/**
 * Send registration email to employee
 * POST /employees/:id/send-registration-email
 * Only Admin/Manager can trigger this.
 */
router.post(
  '/:id/send-registration-email',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await Employee.findByPk(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (!employee.email) return res.status(400).json({ error: 'Employee has no email address' });
      const user = await User.findOne({ where: { email: employee.email } });
      if (!user) return res.status(404).json({ error: 'User not found for employee' });

      // Generate new registration token
      const registrationToken = require("crypto").randomBytes(32).toString("hex");
      const registrationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      user.registrationToken = registrationToken;
      user.registrationTokenExpires = registrationTokenExpires;
      await user.save();

      // Compose registration link
      const baseUrl = process.env.FRONTEND_BASE_URL || "https://spa.beyondsoftwares.com";
      const registrationLink = `${baseUrl}/employee-register?token=${registrationToken}`;

      // Send registration email
      await sendEmail({
        to: user.email,
        subject: "Complete Your Employee Registration",
        html: renderEmail({
          title: "Set Your Password",
          body: `
            <p>Hello ${employee.name},</p>
            <p>Your account has been created. Please click the link below to set your password and activate your account:</p>
            <p><a href="${registrationLink}">${registrationLink}</a></p>
            <p>This link will expire in 24 hours.</p>
          `,
        }),
      });

      res.json({ message: "Registration email sent" });
    } catch (err) {
      res.status(500).json({ error: "Failed to send registration email", details: err.message });
    }
  }
);

/**
 * Get employee record by email (for self-service)
 * GET /employees/by-email/:email
 */
router.get(
  '/by-email/:email',
  authenticateJWT,
  async (req, res) => {
    try {
      const { email } = req.params;
      const employee = await Employee.findOne({
        where: { email, tenantId: req.user.tenantId }
      });
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      res.json({ employee });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employee', details: err.message });
    }
  }
);

/**
 * TEMPORARY DEBUG: List all employees for the current tenant (for debugging email/tenantId issues)
 * GET /employees/debug-list
 */
router.get(
  '/debug-list',
  authenticateJWT,
  async (req, res) => {
    try {
      const employees = await Employee.findAll({
        where: { tenantId: req.user.tenantId },
        attributes: ['id', 'name', 'email', 'tenantId'],
        order: [['name', 'ASC']],
      });
      res.json({ employees });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employees', details: err.message });
    }
  }
);

/**
 * TEMPORARY DEBUG: List all employees in the database (ignore tenantId)
 * GET /employees/debug-list-all
 */
router.get(
  '/debug-list-all',
  authenticateJWT,
  async (req, res) => {
    try {
      const employees = await Employee.findAll({
        attributes: ['id', 'name', 'email', 'tenantId'],
        order: [['tenantId', 'ASC'], ['name', 'ASC']],
      });
      res.json({ employees });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch all employees', details: err.message });
    }
  }
);

module.exports = router;
