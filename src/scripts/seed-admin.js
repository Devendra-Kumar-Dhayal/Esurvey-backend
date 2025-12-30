require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tracker.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin';

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Super Admin role if it doesn't exist
    let superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'Super Admin',
        description: 'Full system access',
        permissions: Role.getAvailablePermissions(),
        isSystem: true,
        isDefault: false,
      });
      console.log('Super Admin role created');
    }

    // Create Admin role if it doesn't exist
    let adminRole = await Role.findOne({ name: 'Admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Admin',
        description: 'Administrative access',
        permissions: [
          'users:read',
          'users:create',
          'users:update',
          'locations:read',
          'reports:read',
          'reports:export',
        ],
        isSystem: true,
        isDefault: false,
      });
      console.log('Admin role created');
    }

    // Create User role (default for regular users)
    let userRole = await Role.findOne({ name: 'User' });
    if (!userRole) {
      userRole = await Role.create({
        name: 'User',
        description: 'Standard user access',
        permissions: [
          'locations:read',
          'locations:create',
        ],
        isSystem: true,
        isDefault: true,
      });
      console.log('User role created (set as default)');
    }

    // Check if superadmin user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      // Update to ensure they have admin access
      if (!existingAdmin.isAdmin) {
        existingAdmin.isAdmin = true;
        existingAdmin.role = superAdminRole._id;
        await existingAdmin.save();
        console.log('Existing user upgraded to Super Admin:', existingAdmin.email);
      } else {
        console.log('Super Admin already exists:', existingAdmin.email);
      }
      process.exit(0);
    }

    // Create super admin user
    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: superAdminRole._id,
      isAdmin: true,
    });

    console.log('\nSuper Admin created successfully!');
    console.log('Email:', admin.email);
    console.log('Password:', ADMIN_PASSWORD);
    console.log('\n*** IMPORTANT: Change this password immediately! ***\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
