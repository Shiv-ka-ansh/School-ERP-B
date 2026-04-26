const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true }, // Equivalent to admissionNumber internally
  admissionNumber: { type: String }, // ADM2026001
  rollNumber: { type: Number },
  firstName: { type: String, required: true },
  lastName: { type: String },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bloodGroup: { type: String },
  currentClass: { type: String, required: true },
  section: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'A' },
  
  // IDs & Government Data
  aadharNumber: { 
    type: String, 
    set: encrypt, 
    get: decrypt 
  },
  studentPEN: { type: String },
  parentAadhar: { 
    type: String, 
    set: encrypt, 
    get: decrypt 
  },
  
  // Parent Details
  fatherName: String,
  motherName: String,
  guardianName: String,
  guardianRelation: String,
  
  // Social/Demographic (populated via SDMS import)
  socialCategory: { type: String, default: 'NA' },   // e.g. '2-SC', '4-OBC', 'General'
  minorityGroup: { type: String, default: 'NA' },     // e.g. 'Muslim', 'NA'
  
  primaryContactPhone: { type: String, required: true }, // For SMS + sibling detection
  alternateContact: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // Academic
  dateOfAdmission: { type: Date, required: true, default: Date.now },
  academicYear: String,
  previousSchool: String,
  
  // Financial
  totalFeesPaid: { type: Number, default: 0 },
  totalFeesDue: { type: Number, default: 0 },
  hasDiscount: { type: Boolean, default: false },
  
  // Photo (Cloudinary URL only)
  photoUrl: String,
  
  // Status
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt: { type: Date, default: null },
  leftDate: Date,
  leftReason: String,
  
  // Sibling Detection
  familyId: String, // Auto-generated for siblings
  hasSiblings: { type: Boolean, default: false },
  
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  schoolId: { type: String, required: true, default: 'smps_jhansi', index: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Indexes
studentSchema.index({ admissionNumber: 1 });
studentSchema.index({ currentClass: 1, section: 1 });
studentSchema.index({ primaryContactPhone: 1 }); // Sibling detection
studentSchema.index({ familyId: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ isDeleted: 1 });
studentSchema.index({ dateOfBirth: 1 }); // Birthday SMS

module.exports = mongoose.model('Student', studentSchema);
