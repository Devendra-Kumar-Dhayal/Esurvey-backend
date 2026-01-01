const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../index');
const User = require('../models/User');
const Trip = require('../models/Trip');
const DropdownOption = require('../models/DropdownOption');
const UnloadingPointData = require('../models/UnloadingPointData');

describe('Image Endpoints', () => {
  let userToken;
  let adminToken;
  let testUser;
  let testAdmin;
  let testProject;
  let testUnloadingPoint;
  let testTrip;
  let testUnloadingPointData;
  const testImagesDir = path.join(__dirname, '../images/unloading_point');

  const createUserAndLogin = async () => {
    testUser = await User.create({
      email: 'user@test.com',
      password: 'password123',
      name: 'Test User',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });

    return res.body.data.token;
  };

  const createAdminAndLogin = async () => {
    testAdmin = await User.create({
      email: 'admin@test.com',
      password: 'admin123',
      name: 'Test Admin',
      isAdmin: true,
    });

    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@test.com', password: 'admin123' });

    return res.body.data.token;
  };

  const createDropdownOptions = async () => {
    testProject = await DropdownOption.create({
      type: 'project',
      name: 'Test Project',
      code: 'TP001',
    });

    testUnloadingPoint = await DropdownOption.create({
      type: 'unloading_point',
      name: 'Test Unloading Point',
      code: 'UP001',
    });
  };

  const createTestData = async () => {
    testTrip = await Trip.create({
      userId: testUser._id,
      qrCode: 'TEST_QR',
      vehicleNumber: 'ABC123',
      projectId: testProject._id,
      projectName: testProject.name,
      selectionType: 'unloading_point',
      selectionId: testUnloadingPoint._id,
      selectionName: testUnloadingPoint.name,
      status: 'completed',
    });

    testUnloadingPointData = await UnloadingPointData.create({
      userId: testUser._id,
      tripId: testTrip._id,
      vehicleNumber: 'ABC123',
      unloadingPointId: testUnloadingPoint._id,
      unloadingPointName: testUnloadingPoint.name,
      projectId: testProject._id,
      projectName: testProject.name,
      netWeight: 1000,
    });
  };

  beforeEach(async () => {
    userToken = await createUserAndLogin();
    adminToken = await createAdminAndLogin();
    await createDropdownOptions();
    await createTestData();

    // Ensure test images directory exists
    if (!fs.existsSync(testImagesDir)) {
      fs.mkdirSync(testImagesDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up any test images
    if (fs.existsSync(testImagesDir)) {
      const files = fs.readdirSync(testImagesDir);
      files.forEach(file => {
        const filePath = path.join(testImagesDir, file);
        fs.unlinkSync(filePath);
      });
    }
  });

  describe('POST /api/images/unloading-point/:unloadingPointDataId', () => {
    it('should upload an image for unloading point data', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      // Create a test image file
      fs.writeFileSync(testImagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

      const res = await request(app)
        .post(`/api/images/unloading-point/${testUnloadingPointData._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('image', testImagePath);

      // Clean up test file
      fs.unlinkSync(testImagePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imagePath).toBeDefined();
      expect(res.body.data.imagePath).toContain('images/unloading_point/');

      // Verify database was updated
      const updatedData = await UnloadingPointData.findById(testUnloadingPointData._id);
      expect(updatedData.imagePath).toBe(res.body.data.imagePath);
    });

    it('should return 400 when no image is provided', async () => {
      const res = await request(app)
        .post(`/api/images/unloading-point/${testUnloadingPointData._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No image file provided');
    });

    it('should return 404 for non-existent unloading point data', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

      const res = await request(app)
        .post('/api/images/unloading-point/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('image', testImagePath);

      fs.unlinkSync(testImagePath);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/images/unloading-point/${testUnloadingPointData._id}`);

      expect(res.status).toBe(401);
    });

    it('should validate unloading point data ID format', async () => {
      const res = await request(app)
        .post('/api/images/unloading-point/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/images/unloading-point/:filename', () => {
    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .get('/api/images/unloading-point/non-existent.jpg');

      expect(res.status).toBe(404);
    });

    it('should return image when it exists', async () => {
      // Create a test image file
      const testFilename = 'test-image-123.jpg';
      const testImagePath = path.join(testImagesDir, testFilename);
      fs.writeFileSync(testImagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));

      const res = await request(app)
        .get(`/api/images/unloading-point/${testFilename}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
    });

    it('should prevent directory traversal attacks', async () => {
      const res = await request(app)
        .get('/api/images/unloading-point/../../../etc/passwd');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/images/unloading-point/by-id/:unloadingPointDataId', () => {
    it('should return 404 when no image path exists', async () => {
      const res = await request(app)
        .get(`/api/images/unloading-point/by-id/${testUnloadingPointData._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('No image available');
    });

    it('should return image when image path exists', async () => {
      // Create a test image file and update the database
      const testFilename = 'test-image-456.jpg';
      const testImagePath = path.join(testImagesDir, testFilename);
      fs.writeFileSync(testImagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));

      await UnloadingPointData.findByIdAndUpdate(testUnloadingPointData._id, {
        imagePath: `images/unloading_point/${testFilename}`,
      });

      const res = await request(app)
        .get(`/api/images/unloading-point/by-id/${testUnloadingPointData._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
    });

    it('should require admin authentication', async () => {
      const res = await request(app)
        .get(`/api/images/unloading-point/by-id/${testUnloadingPointData._id}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent unloading point data', async () => {
      const res = await request(app)
        .get('/api/images/unloading-point/by-id/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/images/unloading-point/:unloadingPointDataId', () => {
    it('should delete image and clear imagePath', async () => {
      // Create a test image file and update the database
      const testFilename = 'test-delete-image.jpg';
      const testImagePath = path.join(testImagesDir, testFilename);
      fs.writeFileSync(testImagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

      await UnloadingPointData.findByIdAndUpdate(testUnloadingPointData._id, {
        imagePath: `images/unloading_point/${testFilename}`,
      });

      const res = await request(app)
        .delete(`/api/images/unloading-point/${testUnloadingPointData._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify database was updated
      const updatedData = await UnloadingPointData.findById(testUnloadingPointData._id);
      expect(updatedData.imagePath).toBeNull();

      // Verify file was deleted
      expect(fs.existsSync(testImagePath)).toBe(false);
    });

    it('should return 400 when no image exists', async () => {
      const res = await request(app)
        .delete(`/api/images/unloading-point/${testUnloadingPointData._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No image to delete');
    });

    it('should require admin authentication', async () => {
      const res = await request(app)
        .delete(`/api/images/unloading-point/${testUnloadingPointData._id}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent unloading point data', async () => {
      const res = await request(app)
        .delete('/api/images/unloading-point/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/completed-trips', () => {
    beforeEach(async () => {
      // Create additional unloading point data entries
      await UnloadingPointData.create({
        userId: testUser._id,
        tripId: testTrip._id,
        vehicleNumber: 'XYZ789',
        unloadingPointId: testUnloadingPoint._id,
        unloadingPointName: testUnloadingPoint.name,
        projectId: testProject._id,
        projectName: testProject.name,
        netWeight: 2000,
        imagePath: 'images/unloading_point/test.jpg',
      });
    });

    it('should return completed trips with stats', async () => {
      const res = await request(app)
        .get('/api/admin/completed-trips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entries).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total).toBe(2);
      expect(res.body.data.stats.withImages).toBe(1);
      expect(res.body.data.stats.withoutImages).toBe(1);
    });

    it('should support search', async () => {
      const res = await request(app)
        .get('/api/admin/completed-trips?search=XYZ789')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.entries[0].vehicleNumber).toBe('XYZ789');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/admin/completed-trips?limit=1&skip=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.pagination.hasMore).toBe(true);
    });

    it('should require admin authentication', async () => {
      const res = await request(app)
        .get('/api/admin/completed-trips');

      expect(res.status).toBe(401);
    });
  });
});
