const mongoose = require('mongoose');
require('dotenv').config();
const ClassSubject = require('./models/ClassSubject.model');

const classesToSeed = [
  { className: 'Playcenter', subjects: ['Activities', 'Drawing', 'Oral'] },
  { className: 'Nursery', subjects: ['English (Writing)', 'English (Reading/Oral)', 'Hindi (Writing)', 'Hindi (Reading/Oral)', 'Maths', 'GK/Drawing'] },
  { className: 'LKG', subjects: ['English (Writing)', 'English (Oral)', 'Hindi (Writing)', 'Hindi (Oral)', 'Maths', 'GK/Drawing'] },
  { className: 'UKG', subjects: ['English (Writing)', 'English (Oral)', 'Hindi (Writing)', 'Hindi (Oral)', 'Maths', 'GK/Drawing'] },
  { className: 'Class 1', subjects: ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 2', subjects: ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 3', subjects: ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 4', subjects: ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 5', subjects: ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 6', subjects: ['Hindi', 'English', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 7', subjects: ['Hindi', 'English', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 8', subjects: ['Hindi', 'English', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'GK', 'Drawing'] },
  { className: 'Class 9', subjects: ['Hindi', 'English', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'Home Science', 'Drawing', 'PT/Games'] },
  { className: 'Class 10', subjects: ['Hindi', 'English', 'Maths', 'Science', 'Social Science', 'Sanskrit', 'Computer', 'Home Science', 'Drawing', 'PT/Games'] },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB...');
  try {
    for (const cls of classesToSeed) {
      await ClassSubject.findOneAndUpdate(
        { schoolId: 'smps_jhansi', className: cls.className },
        { subjects: cls.subjects },
        { upsert: true, new: true }
      );
      console.log(`Updated/Created class: ${cls.className}`);
    }
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding classes:', err);
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
