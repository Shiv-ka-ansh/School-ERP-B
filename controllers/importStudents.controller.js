const XLSX = require('xlsx');
const path = require('path');
const Student = require('../models/Student.model');
const Counter = require('../models/Counter.model');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

// Promotion map: Excel class name → promoted class in our system
const PROMOTION_MAP = {
  'Nursery/KG/PP3': 'LKG',
  'LKG/KG1/PP2': 'UKG',
  'UKG/KG2/PP1': 'Class 1',
  'I': 'Class 2',
  'II': 'Class 3',
  'III': 'Class 4',
  'IV': 'Class 5',
  'V': 'Class 6',
  'VI': 'Class 7',
  'VII': 'Class 8',
  'VIII': 'Class 9',
};

// Classes to SKIP (user requirement: don't import 9th/10th)
const SKIP_CLASSES = ['IX', 'X'];

exports.importStudents = async (req, res, next) => {
  try {
    const filePath = path.resolve(__dirname, '../../09361103114_Students_Details 2025-26.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Use header:1 to get raw arrays
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    
    const COL = {
      CLASS: 0,
      SECTION: 1,
      NAME: 2,
      GENDER: 3,
      PEN: 5,
      FATHER: 7,
      MOTHER: 8,
      SOCIAL_CATEGORY: 9,
      MINORITY_GROUP: 10,
      AADHAR: 17,
    };

    const dataRows = allRows.slice(3); // skip title, blank, header rows

    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Get current counter for studentId generation
    const counter = await Counter.findOneAndUpdate(
      { key: `student-import-seq-${req.schoolId}` },
      { $inc: { value: 0 } },
      { upsert: true, new: true }
    );
    let seqNum = counter.value || 0;

    const studentsToInsert = [];

    for (const row of dataRows) {
      const classRaw = (row[COL.CLASS] || '').toString().trim();
      if (!classRaw) { skipped++; continue; }

      // Skip IX and X
      if (SKIP_CLASSES.includes(classRaw)) {
        skipped++;
        continue;
      }

      const promotedClass = PROMOTION_MAP[classRaw];
      if (!promotedClass) {
        errors.push(`Unknown class: ${classRaw}`);
        skipped++;
        continue;
      }

      const section = (row[COL.SECTION] || 'A').toString().trim();
      const fullName = (row[COL.NAME] || '').toString().trim();
      if (!fullName) { skipped++; continue; }

      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const genderRaw = (row[COL.GENDER] || 'Male').toString().trim();
      const gender = genderRaw === 'Female' || genderRaw === 'F' ? 'Female' : genderRaw === 'Male' || genderRaw === 'M' ? 'Male' : 'Other';
      
      const studentPEN = row[COL.PEN] ? String(row[COL.PEN]).trim() : '';
      const fatherName = (row[COL.FATHER] || '').toString().trim();
      const motherName = (row[COL.MOTHER] || '').toString().trim();
      const socialCategory = (row[COL.SOCIAL_CATEGORY] || 'NA').toString().trim();
      const minorityGroup = (row[COL.MINORITY_GROUP] || 'NA').toString().trim();
      
      // Skip masked Aadhar (contains *) or "NOT AVAILABLE"
      const aadharRaw = row[COL.AADHAR] ? String(row[COL.AADHAR]).trim() : '';
      const aadharNumber = (aadharRaw.includes('*') || aadharRaw.includes('NOT')) ? '' : aadharRaw;

      seqNum++;
      const studentId = `SMPS-2026-${String(seqNum).padStart(4, '0')}`;
      const admissionNumber = `ADM${new Date().getFullYear()}${String(seqNum).padStart(4, '0')}`;

      studentsToInsert.push({
        studentId,
        admissionNumber,
        firstName,
        lastName,
        dateOfBirth: new Date('2015-01-01'), // Placeholder — exact DOB not in Excel
        gender,
        currentClass: promotedClass,
        section: section || 'A',
        studentPEN,
        fatherName,
        motherName,
        socialCategory,
        minorityGroup,
        aadharNumber: aadharNumber || undefined,
        primaryContactPhone: '0000000000', // Placeholder — not in Excel
        academicYear: '2026-27',
        dateOfAdmission: new Date(),
        isActive: true,
        isDeleted: false,
        totalFeesPaid: 0,
        totalFeesDue: 0,
        schoolId: req.schoolId,
        createdBy: req.user._id,
      });
    }

    // Bulk insert
    if (studentsToInsert.length > 0) {
      await Student.insertMany(studentsToInsert, { ordered: false });
      imported = studentsToInsert.length;

      // Update counter
      await Counter.findOneAndUpdate(
        { key: `student-import-seq-${req.schoolId}` },
        { value: seqNum }
      );
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: `Import complete: ${imported} students imported, ${skipped} skipped`,
      data: {
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }
    });
  } catch (error) {
    return next(error);
  }
};
