const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    title: { type: String, required: true },
    description: String,
    eventDate: { type: Date, required: true },
    endDate: Date,
    category: {
      type: String,
      enum: [
        'Examination',
        'Holiday',
        'PTM',
        'Sports Event',
        'Annual Day',
        'Cultural Program',
        'Competition',
        'Inspection',
        'Other'
      ],
      default: 'Other'
    },
    isRecurring: { type: Boolean, default: false },
    recurrenceRule: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
