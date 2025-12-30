const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const Role = require('../models/Role');
const QRVehicle = require('../models/QRVehicle');
const Trip = require('../models/Trip');
const DropdownOption = require('../models/DropdownOption');

describe('QR Endpoints', () => {
  let userToken;
  let testUser;
  let testProject;
  let testWayBridge;

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

  const createDropdownOptions = async () => {
    testProject = await DropdownOption.create({
      type: 'project',
      name: 'Test Project',
      code: 'TP001',
    });

    testWayBridge = await DropdownOption.create({
      type: 'way_bridge',
      name: 'Test Way Bridge',
      code: 'WB001',
    });
  };

  beforeEach(async () => {
    userToken = await createUserAndLogin();
    await createDropdownOptions();
  });

  describe('POST /api/qr/check', () => {
    it('should return hasVehicle: false for new QR code', async () => {
      const res = await request(app)
        .post('/api/qr/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ qrCode: 'NEW_QR_CODE_123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasVehicle).toBe(false);
      expect(res.body.data.vehicleNumber).toBeNull();
    });

    it('should return vehicle number for existing QR', async () => {
      await QRVehicle.create({
        qrCode: 'EXISTING_QR',
        vehicleNumber: 'ABC123',
      });

      const res = await request(app)
        .post('/api/qr/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ qrCode: 'EXISTING_QR' });

      expect(res.status).toBe(200);
      expect(res.body.data.hasVehicle).toBe(true);
      expect(res.body.data.vehicleNumber).toBe('ABC123');
    });

    it('should validate qrCode is required', async () => {
      const res = await request(app)
        .post('/api/qr/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/qr/check')
        .send({ qrCode: 'TEST' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/qr/associate', () => {
    it('should create new QR-vehicle association', async () => {
      const res = await request(app)
        .post('/api/qr/associate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'NEW_QR',
          vehicleNumber: 'xyz789',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicleNumber).toBe('XYZ789'); // uppercase

      const qrVehicle = await QRVehicle.findOne({ qrCode: 'NEW_QR' });
      expect(qrVehicle).not.toBeNull();
      expect(qrVehicle.vehicleNumber).toBe('XYZ789');
    });

    it('should update existing QR-vehicle association', async () => {
      await QRVehicle.create({
        qrCode: 'EXISTING_QR',
        vehicleNumber: 'OLD123',
      });

      const res = await request(app)
        .post('/api/qr/associate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'EXISTING_QR',
          vehicleNumber: 'new456',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicleNumber).toBe('NEW456');

      const qrVehicle = await QRVehicle.findOne({ qrCode: 'EXISTING_QR' });
      expect(qrVehicle.vehicleNumber).toBe('NEW456');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/qr/associate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ qrCode: 'TEST' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/qr/start-trip', () => {
    it('should start a new trip', async () => {
      const res = await request(app)
        .post('/api/qr/start-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'TRIP_QR',
          vehicleNumber: 'ABC123',
          projectId: testProject._id.toString(),
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id.toString(),
          latitude: 40.7128,
          longitude: -74.0060,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trip).toBeDefined();
      expect(res.body.data.trip.vehicleNumber).toBe('ABC123');
      expect(res.body.data.trip.status).toBe('active');
    });

    it('should not allow multiple active trips', async () => {
      // Create first trip
      await request(app)
        .post('/api/qr/start-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'QR1',
          vehicleNumber: 'ABC123',
          projectId: testProject._id.toString(),
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id.toString(),
        });

      // Try to create second trip
      const res = await request(app)
        .post('/api/qr/start-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'QR2',
          vehicleNumber: 'XYZ789',
          projectId: testProject._id.toString(),
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already have an active trip');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/qr/start-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'TEST',
          vehicleNumber: 'ABC123',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should validate projectId is valid', async () => {
      const res = await request(app)
        .post('/api/qr/start-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qrCode: 'TEST',
          vehicleNumber: 'ABC123',
          projectId: '507f1f77bcf86cd799439011',
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid project');
    });
  });

  describe('GET /api/qr/active-trip', () => {
    it('should return null when no active trip', async () => {
      const res = await request(app)
        .get('/api/qr/active-trip')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trip).toBeNull();
    });

    it('should return active trip', async () => {
      await Trip.create({
        userId: testUser._id,
        qrCode: 'TEST_QR',
        vehicleNumber: 'ABC123',
        projectId: testProject._id,
        projectName: testProject.name,
        selectionType: 'way_bridge',
        selectionId: testWayBridge._id,
        selectionName: testWayBridge.name,
        status: 'active',
      });

      const res = await request(app)
        .get('/api/qr/active-trip')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trip).not.toBeNull();
      expect(res.body.data.trip.vehicleNumber).toBe('ABC123');
    });
  });

  describe('POST /api/qr/end-trip', () => {
    let tripId;

    beforeEach(async () => {
      const trip = await Trip.create({
        userId: testUser._id,
        qrCode: 'TEST_QR',
        vehicleNumber: 'ABC123',
        projectId: testProject._id,
        projectName: testProject.name,
        selectionType: 'way_bridge',
        selectionId: testWayBridge._id,
        selectionName: testWayBridge.name,
        status: 'active',
      });
      tripId = trip._id.toString();
    });

    it('should end active trip', async () => {
      const res = await request(app)
        .post('/api/qr/end-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tripId,
          latitude: 40.7128,
          longitude: -74.0060,
          notes: 'Trip completed successfully',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.trip.status).toBe('completed');
      expect(res.body.data.trip.endTime).toBeDefined();
    });

    it('should return 404 for non-existent trip', async () => {
      const res = await request(app)
        .post('/api/qr/end-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tripId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(404);
    });

    it('should validate tripId is required', async () => {
      const res = await request(app)
        .post('/api/qr/end-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/qr/cancel-trip', () => {
    let tripId;

    beforeEach(async () => {
      const trip = await Trip.create({
        userId: testUser._id,
        qrCode: 'TEST_QR',
        vehicleNumber: 'ABC123',
        projectId: testProject._id,
        projectName: testProject.name,
        selectionType: 'way_bridge',
        selectionId: testWayBridge._id,
        selectionName: testWayBridge.name,
        status: 'active',
      });
      tripId = trip._id.toString();
    });

    it('should cancel active trip', async () => {
      const res = await request(app)
        .post('/api/qr/cancel-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tripId });

      expect(res.status).toBe(200);

      const trip = await Trip.findById(tripId);
      expect(trip.status).toBe('cancelled');
    });

    it('should return 404 for non-existent trip', async () => {
      const res = await request(app)
        .post('/api/qr/cancel-trip')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tripId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/qr/trips', () => {
    beforeEach(async () => {
      await Trip.create([
        {
          userId: testUser._id,
          qrCode: 'QR1',
          vehicleNumber: 'ABC123',
          projectId: testProject._id,
          projectName: testProject.name,
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id,
          selectionName: testWayBridge.name,
          status: 'completed',
        },
        {
          userId: testUser._id,
          qrCode: 'QR2',
          vehicleNumber: 'XYZ789',
          projectId: testProject._id,
          projectName: testProject.name,
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id,
          selectionName: testWayBridge.name,
          status: 'active',
        },
        {
          userId: testUser._id,
          qrCode: 'QR3',
          vehicleNumber: 'DEF456',
          projectId: testProject._id,
          projectName: testProject.name,
          selectionType: 'way_bridge',
          selectionId: testWayBridge._id,
          selectionName: testWayBridge.name,
          status: 'cancelled',
        },
      ]);
    });

    it('should get all trips', async () => {
      const res = await request(app)
        .get('/api/qr/trips')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trips).toHaveLength(3);
      expect(res.body.data.pagination.total).toBe(3);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/qr/trips?status=completed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trips).toHaveLength(1);
      expect(res.body.data.trips[0].status).toBe('completed');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/qr/trips?limit=1&skip=0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trips).toHaveLength(1);
      expect(res.body.data.pagination.hasMore).toBe(true);
    });
  });
});
