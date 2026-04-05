const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User.model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      await User.create({
        username: 'admin',
        email: 'admin@smpsjhansi.com',
        password: 'password@123',
        role: 'PRINCIPAL',
        fullName: 'Principal Admin',
        schoolId: 'smps_jhansi'
      });
      console.log('Created default admin user!');
    } else {
      console.log('Admin user already exists!');
    }
  } catch (err) {
    console.error('Error creating user:', err);
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
