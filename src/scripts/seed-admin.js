require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await Admin.findOne({ role: 'superadmin' });
    if (existingAdmin) {
      console.log('Superadmin already exists:', existingAdmin.email);
      process.exit(0);
    }

    const admin = await Admin.create({
      email: 'admin@tracker.com',
      password: 'admin123',
      name: 'Super Admin',
      role: 'superadmin',
    });

    console.log('Superadmin created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('\n*** IMPORTANT: Change this password immediately! ***\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
