const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const Location = require('../models/Location');

describe('Telemetry Endpoints', () => {
  let token;
  let userId;

  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const validLocation = {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 10,
    altitude: 100,
    speed: 5,
    heading: 180,
    batteryLevel: 80,
    batteryCharging: false,
    activity: 'walking',
  };

  beforeEach(async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    token = registerRes.body.data.token;
    userId = registerRes.body.data.user._id;
  });

  describe('POST /api/telemetry', () => {
    it('should submit telemetry data', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .set('Authorization', `Bearer ${token}`)
        .send(validLocation);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location.latitude).toBe(validLocation.latitude);
      expect(res.body.data.location.longitude).toBe(validLocation.longitude);
    });

    it('should validate latitude range', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validLocation, latitude: 100 });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should validate longitude range', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validLocation, longitude: 200 });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .send(validLocation);

      expect(res.status).toBe(401);
    });

    it('should accept minimum required fields', async () => {
      const res = await request(app)
        .post('/api/telemetry')
        .set('Authorization', `Bearer ${token}`)
        .send({ latitude: 40.7128, longitude: -74.006 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/telemetry/batch', () => {
    it('should submit batch telemetry data', async () => {
      const locations = [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.7129, longitude: -74.007 },
        { latitude: 40.713, longitude: -74.008 },
      ];

      const res = await request(app)
        .post('/api/telemetry/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ locations });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(3);
    });

    it('should reject empty locations array', async () => {
      const res = await request(app)
        .post('/api/telemetry/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ locations: [] });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/telemetry/batch')
        .send({ locations: [{ latitude: 40.7128, longitude: -74.006 }] });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/telemetry', () => {
    beforeEach(async () => {
      const locations = Array.from({ length: 15 }, (_, i) => ({
        userId,
        latitude: 40.7128 + i * 0.001,
        longitude: -74.006 + i * 0.001,
        timestamp: new Date(Date.now() - i * 60000),
      }));
      await Location.insertMany(locations);
    });

    it('should get telemetry history', async () => {
      const res = await request(app)
        .get('/api/telemetry')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.locations).toHaveLength(15);
      expect(res.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/telemetry?limit=5&skip=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.locations).toHaveLength(5);
      expect(res.body.pagination.hasMore).toBe(true);
    });

    it('should support date filtering', async () => {
      const startDate = new Date(Date.now() - 5 * 60000).toISOString();
      const res = await request(app)
        .get(`/api/telemetry?startDate=${startDate}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.locations.length).toBeLessThanOrEqual(6);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/telemetry');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/telemetry/latest', () => {
    it('should get latest location', async () => {
      await Location.create({
        userId,
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
      });

      const res = await request(app)
        .get('/api/telemetry/latest')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location).toBeDefined();
    });

    it('should return 404 if no location data', async () => {
      const res = await request(app)
        .get('/api/telemetry/latest')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/telemetry/latest');

      expect(res.status).toBe(401);
    });
  });
});
