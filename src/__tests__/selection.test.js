const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const DropdownOption = require('../models/DropdownOption');
const UserSelection = require('../models/UserSelection');

describe('Selection Endpoints', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  let token;
  let project;
  let wayBridge;
  let loadingPoint;
  let unloadingPoint;

  beforeEach(async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    token = registerRes.body.data.token;

    project = await DropdownOption.create({
      type: 'project',
      name: 'Test Project',
      code: 'TP001',
      order: 1,
    });

    wayBridge = await DropdownOption.create({
      type: 'way_bridge',
      name: 'Test Way Bridge',
      code: 'WB001',
      order: 1,
    });

    loadingPoint = await DropdownOption.create({
      type: 'loading_point',
      name: 'Test Loading Point',
      code: 'LP001',
      order: 1,
    });

    unloadingPoint = await DropdownOption.create({
      type: 'unloading_point',
      name: 'Test Unloading Point',
      code: 'UP001',
      order: 1,
    });
  });

  describe('GET /api/selection/options', () => {
    it('should return all dropdown options', async () => {
      const res = await request(app)
        .get('/api/selection/options')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.options).toBeDefined();
      expect(res.body.data.options.projects).toHaveLength(1);
      expect(res.body.data.options.wayBridges).toHaveLength(1);
      expect(res.body.data.options.loadingPoints).toHaveLength(1);
      expect(res.body.data.options.unloadingPoints).toHaveLength(1);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/selection/options');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should only return active options', async () => {
      await DropdownOption.create({
        type: 'project',
        name: 'Inactive Project',
        code: 'IP001',
        isActive: false,
        order: 2,
      });

      const res = await request(app)
        .get('/api/selection/options')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.options.projects).toHaveLength(1);
    });
  });

  describe('POST /api/selection', () => {
    it('should save a selection with way_bridge', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'way_bridge',
          selectionId: wayBridge._id.toString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selection).toBeDefined();
      expect(res.body.data.selection.selectionType).toBe('way_bridge');
    });

    it('should save a selection with loading_point', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'loading_point',
          selectionId: loadingPoint._id.toString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selection.selectionType).toBe('loading_point');
    });

    it('should save a selection with unloading_point', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'unloading_point',
          selectionId: unloadingPoint._id.toString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selection.selectionType).toBe('unloading_point');
    });

    it('should reject invalid project ID', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: wayBridge._id.toString(),
          selectionType: 'way_bridge',
          selectionId: wayBridge._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject mismatched selection type and ID', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'loading_point',
          selectionId: wayBridge._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should validate selection type enum', async () => {
      const res = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'invalid_type',
          selectionId: wayBridge._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app).post('/api/selection').send({
        projectId: project._id.toString(),
        selectionType: 'way_bridge',
        selectionId: wayBridge._id.toString(),
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/selection/active', () => {
    it('should return null when no active selection', async () => {
      const res = await request(app)
        .get('/api/selection/active')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selection).toBeNull();
    });

    it('should return active selection', async () => {
      await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'way_bridge',
          selectionId: wayBridge._id.toString(),
        });

      const res = await request(app)
        .get('/api/selection/active')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selection).toBeDefined();
      expect(res.body.data.selection.isActive).toBe(true);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/selection/active');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/selection/history', () => {
    it('should return empty array when no selections', async () => {
      const res = await request(app)
        .get('/api/selection/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selections).toHaveLength(0);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should return selection history', async () => {
      await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'way_bridge',
          selectionId: wayBridge._id.toString(),
        });

      await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'loading_point',
          selectionId: loadingPoint._id.toString(),
        });

      const res = await request(app)
        .get('/api/selection/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selections).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('should support pagination', async () => {
      await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'way_bridge',
          selectionId: wayBridge._id.toString(),
        });

      await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'loading_point',
          selectionId: loadingPoint._id.toString(),
        });

      const res = await request(app)
        .get('/api/selection/history?limit=1&skip=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.selections).toHaveLength(1);
      expect(res.body.data.pagination.limit).toBe(1);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/selection/history');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/selection/:id/deactivate', () => {
    let selectionId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/selection')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          selectionType: 'way_bridge',
          selectionId: wayBridge._id.toString(),
        });
      selectionId = createRes.body.data.selection._id;
    });

    it('should deactivate a selection', async () => {
      const res = await request(app)
        .put(`/api/selection/${selectionId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selection.isActive).toBe(false);
    });

    it('should return 404 for non-existent selection', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/api/selection/${fakeId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject request without token', async () => {
      const res = await request(app).put(
        `/api/selection/${selectionId}/deactivate`
      );

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not allow deactivating other users selection', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        name: 'Other User',
      });

      const otherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'password123' });
      const otherToken = otherLoginRes.body.data.token;

      const res = await request(app)
        .put(`/api/selection/${selectionId}/deactivate`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Login and Register should return dropdown options', () => {
    it('should return dropdown options on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.data.dropdownOptions).toBeDefined();
      expect(res.body.data.dropdownOptions.projects).toBeDefined();
      expect(res.body.data.dropdownOptions.wayBridges).toBeDefined();
      expect(res.body.data.dropdownOptions.loadingPoints).toBeDefined();
      expect(res.body.data.dropdownOptions.unloadingPoints).toBeDefined();
    });

    it('should return dropdown options on register', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.dropdownOptions).toBeDefined();
      expect(res.body.data.dropdownOptions.projects).toBeDefined();
    });
  });
});
