require('dotenv').config();
const mongoose = require('mongoose');
const DropdownOption = require('../models/DropdownOption');

const options = [
  // Projects
  { type: 'project', name: 'Project Alpha', code: 'PA001', order: 1 },
  { type: 'project', name: 'Project Beta', code: 'PB002', order: 2 },
  { type: 'project', name: 'Project Gamma', code: 'PG003', order: 3 },
  { type: 'project', name: 'Project Delta', code: 'PD004', order: 4 },

  // Way Bridges
  { type: 'way_bridge', name: 'Way Bridge North', code: 'WBN01', order: 1 },
  { type: 'way_bridge', name: 'Way Bridge South', code: 'WBS02', order: 2 },
  { type: 'way_bridge', name: 'Way Bridge East', code: 'WBE03', order: 3 },
  { type: 'way_bridge', name: 'Way Bridge West', code: 'WBW04', order: 4 },

  // Loading Points
  { type: 'loading_point', name: 'Loading Point A', code: 'LPA01', order: 1 },
  { type: 'loading_point', name: 'Loading Point B', code: 'LPB02', order: 2 },
  { type: 'loading_point', name: 'Loading Point C', code: 'LPC03', order: 3 },
  { type: 'loading_point', name: 'Loading Point D', code: 'LPD04', order: 4 },

  // Unloading Points
  { type: 'unloading_point', name: 'Unloading Point X', code: 'UPX01', order: 1 },
  { type: 'unloading_point', name: 'Unloading Point Y', code: 'UPY02', order: 2 },
  { type: 'unloading_point', name: 'Unloading Point Z', code: 'UPZ03', order: 3 },
];

const seedOptions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing options
    await DropdownOption.deleteMany({});
    console.log('Cleared existing options');

    // Insert new options
    await DropdownOption.insertMany(options);
    console.log(`Inserted ${options.length} dropdown options`);

    console.log('\nOptions seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding options:', error);
    process.exit(1);
  }
};

seedOptions();
