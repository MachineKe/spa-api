const express = require('express');
const { Op } = require('sequelize');
const { Booking, Service, TeamMember } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { Parser } = require('json2csv');

const router = express.Router();

/**
 * GET /api/sales/summary
 * Returns sales summary data for dashboard
 */
router.get('/summary', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  // TODO: Replace with real aggregation logic
  res.json({
    today: 12000,
    week: 90000,
    month: 350000,
    paymentBreakdown: { cash: 40, card: 35, mobile: 25 },
    salesOverTime: [
      { date: "2025-06-01", total: 12000 },
      { date: "2025-06-02", total: 15000 },
      { date: "2025-06-03", total: 9000 },
      { date: "2025-06-04", total: 18000 },
      { date: "2025-06-05", total: 21000 },
      { date: "2025-06-06", total: 17000 },
      { date: "2025-06-07", total: 22000 },
    ],
    salesByStore: [
      { store: "CBD", total: 50000 },
      { store: "Westlands", total: 35000 },
      { store: "Karen", total: 20000 },
    ],
    salesByEmployee: [
      { employee: "John", total: 30000 },
      { employee: "Mary", total: 25000 },
      { employee: "Ali", total: 20000 },
      { employee: "Grace", total: 15000 },
    ],
  });
});

/**
 * GET /api/sales/recent
 * Returns recent sales for dashboard
 */
router.get('/recent', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  // TODO: Replace with real recent sales logic
  res.json({
    sales: [
      {
        date: "2025-06-07",
        service: "Haircut",
        employee: "John",
        amount: 2000,
        payment: "cash",
      },
      {
        date: "2025-06-07",
        service: "Massage",
        employee: "Mary",
        amount: 3500,
        payment: "card",
      },
      {
        date: "2025-06-06",
        service: "Facial",
        employee: "Ali",
        amount: 2500,
        payment: "mobile",
      },
    ],
  });
});

// Export sales as CSV
router.get('/export/csv', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res, next) => {
  console.log("CSV export route hit");
  const tenantId = req.user.tenantId;
  const { from, to, employeeId, serviceId } = req.query;
  const where = {
    tenantId,
    status: 'completed',
  };
  if (from && to) {
    where.createdAt = { [Op.between]: [new Date(from), new Date(to)] };
  }
  if (employeeId) where.staffId = employeeId;
  if (serviceId) where.serviceId = serviceId;

  try {
    const { Service, Employee } = require('../../models');
    const sales = await Booking.findAll({
      where,
      order: [['createdAt', 'DESC']],
      raw: true,
    });

    // Fetch related service and employee data
    const serviceIds = [...new Set(sales.map(s => s.serviceId).filter(Boolean))];
    const staffIds = [...new Set(sales.map(s => s.staffId).filter(Boolean))];
    const services = await Service.findAll({ where: { id: serviceIds }, raw: true });
    const employees = await Employee.findAll({ where: { id: staffIds }, raw: true });

    const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));
    const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));

    const data = sales.map((s) => ({
      Date: s.createdAt,
      Service: serviceMap[s.serviceId]?.name || "",
      Employee: employeeMap[s.staffId]?.name || "",
      Amount: serviceMap[s.serviceId]?.price != null ? serviceMap[s.serviceId].price : "",
      Payment: "N/A",
    }));

    const fields = ["Date", "Service", "Employee", "Amount", "Payment"];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('sales_report.csv');
    res.send(csv);
  } catch (err) {
    console.error("CSV Export Error:", err);
    next(err);
  }
});

/**
 * Export sales as PDF
 */
router.get('/export/pdf', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  const PDFDocument = require('pdfkit');
  const tenantId = req.user.tenantId;
  const { from, to, employeeId, serviceId } = req.query;
  const where = {
    tenantId,
    status: 'completed',
  };
  if (from && to) {
    where.createdAt = { [Op.between]: [new Date(from), new Date(to)] };
  }
  if (employeeId) where.employeeId = employeeId;
  if (serviceId) where.serviceId = serviceId;

  try {
    const { Service, Employee } = require('../../models');
    const sales = await Booking.findAll({
      where,
      order: [['createdAt', 'DESC']],
      raw: true,
    });

    // Fetch related service and employee data
    const serviceIds = [...new Set(sales.map(s => s.serviceId).filter(Boolean))];
    const staffIds = [...new Set(sales.map(s => s.staffId).filter(Boolean))];
    const services = await Service.findAll({ where: { id: serviceIds }, raw: true });
    const employees = await Employee.findAll({ where: { id: staffIds }, raw: true });

    const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));
    const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));

    // Create PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
    doc.pipe(res);

    doc.fontSize(18).fillColor('#FFD700').text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Table header
    doc.fontSize(12).fillColor('#FFD700');
    doc.text('Date', 30, doc.y, { continued: true, width: 100 });
    doc.text('Service', 130, doc.y, { continued: true, width: 100 });
    doc.text('Employee', 230, doc.y, { continued: true, width: 100 });
    doc.text('Amount', 330, doc.y, { continued: true, width: 80 });
    doc.text('Payment', 410, doc.y, { width: 80 });
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#FFF');
    sales.forEach((s) => {
      doc.text(
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
        30,
        doc.y,
        { continued: true, width: 100 }
      );
      doc.text(serviceMap[s.serviceId]?.name || '', 130, doc.y, { continued: true, width: 100 });
      doc.text(employeeMap[s.staffId]?.name || '', 230, doc.y, { continued: true, width: 100 });
      doc.text(serviceMap[s.serviceId]?.price != null ? `Ksh ${serviceMap[s.serviceId].price}` : '', 330, doc.y, { continued: true, width: 80 });
      doc.text('N/A', 410, doc.y, { width: 80 });
      doc.moveDown(0.2);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to export sales PDF', details: err.message });
  }
});

/**
 * Customer: List own purchases
 * GET /api/sales/my
 */
router.get('/my', authenticateJWT, requireRole(['Customer']), async (req, res) => {
  try {
    const { SalesLog, Product, CustomerTenants } = require('../../models');
    // Get tenantIds for this user
    const links = await CustomerTenants.findAll({ where: { userId: req.user.id } });
    const tenantIds = links.map(l => l.tenantId);
    const sales = await SalesLog.findAll({
      where: {
        userId: req.user.id,
        tenantId: tenantIds.length > 0 ? tenantIds : undefined
      },
      include: [{ model: Product, attributes: ['name', 'price'] }]
    });
    res.json({ sales });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchases', details: err.message });
  }
});

/**
 * Employee: Record a sale (pending approval)
 * POST /api/sales/record
 */
router.post('/record', authenticateJWT, requireRole(['Employee']), async (req, res) => {
  try {
    const { SalesLog, Product, Store, Tenant, Employee } = require('../../models');
    const { productId, quantity, totalPrice, storeId, transactionId } = req.body;
    if (!productId || !quantity || !totalPrice || !storeId || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Find product and store for tenantId
    const product = await Product.findByPk(productId);
    const store = await Store.findByPk(storeId);
    if (!product || !store) {
      return res.status(404).json({ error: 'Product or Store not found' });
    }
    // Create pending sale
    const sale = await SalesLog.create({
      tenantId: store.tenantId,
      storeId,
      employeeId: req.user.id,
      productId,
      quantity,
      totalPrice,
      soldAt: new Date(),
      userId: null,
      transactionId,
      status: 'pending'
    });
    res.json({ sale });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record sale', details: err.message });
  }
});

/**
 * Manager: Approve a sale
 * PATCH /api/sales/:id/approve
 */
router.patch('/:id/approve', authenticateJWT, requireRole(['Manager', 'Admin']), async (req, res) => {
  try {
    const { SalesLog, Employee } = require('../../models');
    const sale = await SalesLog.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status !== 'pending') return res.status(400).json({ error: 'Sale is not pending' });

    // Get employee commission rate (default 10%)
    const employee = await Employee.findByPk(sale.employeeId);
    let commissionRate = 0.1;
    if (employee && employee.commissionRate) {
      commissionRate = parseFloat(employee.commissionRate) || 0.1;
    }
    const commissionAmount = sale.totalPrice * commissionRate;

    sale.status = 'approved';
    sale.approverId = req.user.id;
    sale.commissionAmount = commissionAmount;
    sale.approvalNotes = req.body.notes || null;
    await sale.save();

    res.json({ sale });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve sale', details: err.message });
  }
});

/**
 * Manager: Reject a sale
 * PATCH /api/sales/:id/reject
 */
router.patch('/:id/reject', authenticateJWT, requireRole(['Manager', 'Admin']), async (req, res) => {
  try {
    const { SalesLog } = require('../../models');
    const sale = await SalesLog.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status !== 'pending') return res.status(400).json({ error: 'Sale is not pending' });

    sale.status = 'rejected';
    sale.approverId = req.user.id;
    sale.approvalNotes = req.body.notes || null;
    await sale.save();

    res.json({ sale });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject sale', details: err.message });
  }
});

module.exports = router;
