const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    title: { type: String, required: true },
    description: String,
    eventDate: { type: Date, required: true },
    category: { type: String, enum: ['EVENT', 'HOLIDAY', 'EXAM', 'MEETING'], default: 'EVENT' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
