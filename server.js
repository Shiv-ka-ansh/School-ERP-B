const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { notFoundHandler } = require('./middleware/notFound.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const userRoutes = require('./routes/user.routes');
const classSubjectRoutes = require('./routes/classSubject.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const staffRoutes = require('./routes/staff.routes');
const financeRoutes = require('./routes/finance.routes');
const payrollRoutes = require('./routes/payroll.routes');
const examRoutes = require('./routes/exam.routes');
const communicationRoutes = require('./routes/communication.routes');
const settingsRoutes = require('./routes/settings.routes');
const auditRoutes = require('./routes/audit.routes');
const tcRoutes = require('./routes/tc.routes');
const incomeRoutes = require('./routes/income.routes');
const financeExtraRoutes = require('./routes/financeExtra.routes');
const { startCronJobs } = require('./services/cron.service');

// Connect to Database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(apiLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/class-subjects', classSubjectRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/fees', financeRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/tc', tcRoutes);
app.use('/api/v1/finance/income', incomeRoutes);
app.use('/api/v1/finance', financeExtraRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SMPS ERP Backend API' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ success: true, status: 'ready' });
});

// 404 handler
app.use(notFoundHandler);

// Global Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
  startCronJobs();
}

module.exports = app;
