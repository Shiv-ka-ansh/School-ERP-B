const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'], 
    unique: true, 
    lowercase: true,
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Exclude password from query results by default
  },
  role: { 
    type: String, 
    enum: ['PRINCIPAL', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF'], 
    required: [true, 'Role is required'] 
  },
  fullName: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true
  },
  assignedClasses: {
    type: [String], // e.g., ['Class 6A', 'Class 7B']
    default: []
  },
  linkedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  schoolId: {
    type: String,
    required: true,
    default: 'smps_jhansi',
    index: true
  },
  permissions: {
    type: [String],
    default: []
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastLogin: {
    type: Date
  }
}, { timestamps: true });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);  // 12 rounds (secure as per docs)
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes as per documentation
userSchema.index({ role: 1 });
userSchema.index({ schoolId: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
