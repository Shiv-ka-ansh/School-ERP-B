const cron = require('node-cron');
const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const { retryQueuedSms, dispatchSms } = require('./sms.service');

let started = false;

exports.startCronJobs = () => {
  if (started || process.env.NODE_ENV === 'test') {
    return;
  }
  started = true;

  // Birthday SMS at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const students = await Student.find({
      isDeleted: false,
      $expr: {
        $and: [{ $eq: [{ $month: '$dateOfBirth' }, month] }, { $eq: [{ $dayOfMonth: '$dateOfBirth' }, date] }]
      }
    }).limit(200);

    for (const student of students) {
      if (!student.primaryContactPhone) continue;
      await dispatchSms({
        schoolId: student.schoolId || 'smps_jhansi',
        recipient: student.primaryContactPhone,
        message: `Happy Birthday ${student.firstName}!`,
        templateId: process.env.MSG91_BIRTHDAY_TEMPLATE_ID,
        variables: { VAR1: student.firstName }
      });
    }
  });

  // Retry queued/failed SMS every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await retryQueuedSms();
  });

  // Fee reminder cron (daily 9 AM)
  cron.schedule('0 9 * * *', async () => {
    const dueStudents = await Student.find({ isDeleted: false, totalFeesDue: { $gt: 0 } }).limit(200);
    for (const student of dueStudents) {
      if (!student.primaryContactPhone) continue;
      await dispatchSms({
        schoolId: student.schoolId || 'smps_jhansi',
        recipient: student.primaryContactPhone,
        message: `Fee reminder: pending dues ${student.totalFeesDue}`,
        templateId: process.env.MSG91_FEE_DUE_TEMPLATE_ID,
        variables: { VAR1: student.firstName, VAR2: String(student.totalFeesDue) }
      });
    }
  });

  // Consecutive absence alert cron (daily 10 AM)
  cron.schedule('0 10 * * *', async () => {
    const threshold = Number(process.env.ABSENCE_ALERT_THRESHOLD || 3);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - threshold + 1);
    const rows = await Attendance.aggregate([
      {
        $match: {
          type: 'STUDENT',
          status: 'ABSENT',
          date: { $gte: start, $lte: end }
        }
      },
      { $group: { _id: '$studentId', absentCount: { $sum: 1 } } },
      { $match: { absentCount: { $gte: threshold } } }
    ]);
    const students = await Student.find({ _id: { $in: rows.map((r) => r._id) } }).limit(200);
    for (const student of students) {
      if (!student.primaryContactPhone) continue;
      await dispatchSms({
        schoolId: student.schoolId || 'smps_jhansi',
        recipient: student.primaryContactPhone,
        message: `Attendance alert: ${student.firstName} absent for ${threshold} consecutive days.`,
        templateId: process.env.MSG91_ABSENCE_TEMPLATE_ID,
        variables: { VAR1: student.firstName, VAR2: String(threshold) }
      });
    }
  });
};
