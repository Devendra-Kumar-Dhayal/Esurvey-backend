const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const Role = require('../models/Role');
const DropdownOption = require('../models/DropdownOption');

describe('Admin Endpoints', () => {
  const testAdmin = {
    email: 'admin@test.com',
    password: 'adminpassword123',
    name: 'Test Admin',
    isAdmin: true,
    isSuperAdmin: true,
  };

  const testUser = {
    email: 'user@test.com',
    password: 'userpassword123',
    name: 'Test User',
  };

  let adminToken;
  let superAdminRole;

  const createAdminAndLogin = async () => {
    // Create super admin role if not exists
    superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'Super Admin',
        description: 'Full system access',
        permissions: [
          'users:read', 'users:create', 'users:update', 'users:delete',
          'locations:read', 'locations:create', 'locations:update', 'locations:delete',
          'reports:read', 'reports:create', 'reports:export',
          'settings:read', 'settings:update',
        ],
        isSystem: true,
      });
    }

    await User.create({ ...testAdmin, role: superAdminRole._id });
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: testAdmin.email, password: testAdmin.password });
    return res.body.data.token;
  };

  describe('POST /api/admin/login', () => {
    beforeEach(async () => {
      superAdminRole = await Role.findOne({ name: 'Super Admin' });
      if (!superAdminRole) {
        superAdminRole = await Role.create({
          name: 'Super Admin',
          description: 'Full system access',
          permissions: [
            'users:read', 'users:create', 'users:update', 'users:delete',
            'locations:read', 'locations:create', 'locations:update', 'locations:delete',
            'reports:read', 'reports:create', 'reports:export',
            'settings:read', 'settings:update',
          ],
          isSystem: true,
        });
      }
      await User.create({ ...testAdmin, role: superAdminRole._id });
    });

    it('should login admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: testAdmin.email, password: testAdmin.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.admin.email).toBe(testAdmin.email);
      expect(res.body.data.admin.isAdmin).toBe(true);
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: testAdmin.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not login deactivated admin', async () => {
      await User.updateOne({ email: testAdmin.email }, { isActive: false });

      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: testAdmin.email, password: testAdmin.password });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/admin/profile', () => {
    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
    });

    it('should get admin profile with valid token', async () => {
      const res = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.email).toBe(testAdmin.email);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/admin/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/users', () => {
    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
    });

    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
    });

    it('should not create user with existing email', async () => {
      await User.create(testUser);

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject request without admin token', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .send(testUser);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/users', () => {
    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
      await User.create(testUser);
      await User.create({ ...testUser, email: 'user2@test.com', name: 'User Two' });
    });

    it('should get all users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // 3 users: admin + 2 test users
      expect(res.body.data.users).toHaveLength(3);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/admin/users?limit=1&skip=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(1);
      // 3 users: admin + 2 test users
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.hasMore).toBe(true);
    });

    it('should support search', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=user2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.users[0].email).toBe('user2@test.com');
    });
  });

  describe('GET /api/admin/users/:id', () => {
    let userId;

    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
      const user = await User.create(testUser);
      userId = user._id.toString();
    });

    it('should get user by id', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    let userId;

    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
      const user = await User.create(testUser);
      userId = user._id.toString();
    });

    it('should update user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Updated Name');
      expect(res.body.data.user.isActive).toBe(false);
    });

    it('should not update to existing email', async () => {
      await User.create({ ...testUser, email: 'other@test.com' });

      const res = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'other@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/users/:id/reset-password', () => {
    let userId;

    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
      const user = await User.create(testUser);
      userId = user._id.toString();
    });

    it('should reset user password', async () => {
      const newPassword = 'newpassword123';
      const res = await request(app)
        .post(`/api/admin/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: newPassword });

      expect(loginRes.status).toBe(200);
    });

    it('should validate password length', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    let userId;

    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
      const user = await User.create(testUser);
      userId = user._id.toString();
    });

    it('should delete user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user is deleted
      const user = await User.findById(userId);
      expect(user).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/dashboard', () => {
    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
      await User.create(testUser);
      await User.create({ ...testUser, email: 'user2@test.com', isActive: false });
    });

    it('should get dashboard stats', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // 3 users: admin + 2 test users (1 active, 1 inactive)
      expect(res.body.data.stats.totalUsers).toBe(3);
      expect(res.body.data.stats.activeUsers).toBe(2); // admin + 1 active test user
      expect(res.body.data.stats.inactiveUsers).toBe(1);
      expect(res.body.data.recentUsers).toBeDefined();
    });
  });

  describe('POST /api/admin/admins (superadmin only)', () => {
    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
    });

    it('should create a new admin when superadmin', async () => {
      const newAdmin = {
        email: 'newadmin@test.com',
        password: 'newadminpass123',
        name: 'New Admin',
      };

      const res = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newAdmin);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.email).toBe(newAdmin.email);
      expect(res.body.data.admin.isAdmin).toBe(true);
    });

    it('should not create admin with existing email', async () => {
      const newAdmin = {
        email: testAdmin.email,
        password: 'newadminpass123',
        name: 'Duplicate Admin',
      };

      const res = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newAdmin);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-superadmin from creating admins', async () => {
      // Create admin role
      const adminRole = await Role.create({
        name: 'Admin',
        description: 'Regular admin access',
        permissions: ['users:read'],
      });

      // Create regular admin (not super admin)
      const regularAdmin = {
        email: 'regular@test.com',
        password: 'regularpass123',
        name: 'Regular Admin',
        isAdmin: true,
        isSuperAdmin: false,
        role: adminRole._id,
      };
      await User.create(regularAdmin);
      const loginRes = await request(app)
        .post('/api/admin/login')
        .send({ email: regularAdmin.email, password: regularAdmin.password });
      const regularToken = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          email: 'another@test.com',
          password: 'anotherpass123',
          name: 'Another Admin',
          role: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Dropdown Options Management', () => {
    beforeEach(async () => {
      adminToken = await createAdminAndLogin();
    });

    describe('POST /api/admin/dropdown-options', () => {
      it('should create a dropdown option', async () => {
        const res = await request(app)
          .post('/api/admin/dropdown-options')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'project',
            name: 'Test Project',
            code: 'TP001',
            order: 1,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.option.name).toBe('Test Project');
        expect(res.body.data.option.type).toBe('project');
      });

      it('should validate type enum', async () => {
        const res = await request(app)
          .post('/api/admin/dropdown-options')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'invalid_type',
            name: 'Test',
          });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
      });

      it('should require name', async () => {
        const res = await request(app)
          .post('/api/admin/dropdown-options')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'project',
          });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
      });
    });

    describe('GET /api/admin/dropdown-options', () => {
      beforeEach(async () => {
        await DropdownOption.create([
          { type: 'project', name: 'Project 1', order: 1 },
          { type: 'project', name: 'Project 2', order: 2 },
          { type: 'way_bridge', name: 'Way Bridge 1', order: 1 },
          { type: 'loading_point', name: 'Loading Point 1', order: 1 },
        ]);
      });

      it('should get all dropdown options grouped', async () => {
        const res = await request(app)
          .get('/api/admin/dropdown-options')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.options).toHaveLength(4);
        expect(res.body.data.grouped.projects).toHaveLength(2);
        expect(res.body.data.grouped.wayBridges).toHaveLength(1);
        expect(res.body.data.grouped.loadingPoints).toHaveLength(1);
      });

      it('should filter by type', async () => {
        const res = await request(app)
          .get('/api/admin/dropdown-options?type=project')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.options).toHaveLength(2);
      });
    });

    describe('GET /api/admin/dropdown-options/:id', () => {
      let optionId;

      beforeEach(async () => {
        const option = await DropdownOption.create({
          type: 'project',
          name: 'Test Project',
          code: 'TP001',
        });
        optionId = option._id.toString();
      });

      it('should get option by id', async () => {
        const res = await request(app)
          .get(`/api/admin/dropdown-options/${optionId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.option.name).toBe('Test Project');
      });

      it('should return 404 for non-existent option', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const res = await request(app)
          .get(`/api/admin/dropdown-options/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('PUT /api/admin/dropdown-options/:id', () => {
      let optionId;

      beforeEach(async () => {
        const option = await DropdownOption.create({
          type: 'project',
          name: 'Test Project',
          code: 'TP001',
        });
        optionId = option._id.toString();
      });

      it('should update option', async () => {
        const res = await request(app)
          .put(`/api/admin/dropdown-options/${optionId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Updated Project',
            code: 'UP001',
            isActive: false,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.option.name).toBe('Updated Project');
        expect(res.body.data.option.code).toBe('UP001');
        expect(res.body.data.option.isActive).toBe(false);
      });

      it('should return 404 for non-existent option', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const res = await request(app)
          .put(`/api/admin/dropdown-options/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated' });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/admin/dropdown-options/:id', () => {
      let optionId;

      beforeEach(async () => {
        const option = await DropdownOption.create({
          type: 'project',
          name: 'Test Project',
        });
        optionId = option._id.toString();
      });

      it('should delete option', async () => {
        const res = await request(app)
          .delete(`/api/admin/dropdown-options/${optionId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const option = await DropdownOption.findById(optionId);
        expect(option).toBeNull();
      });

      it('should return 404 for non-existent option', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const res = await request(app)
          .delete(`/api/admin/dropdown-options/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('POST /api/admin/dropdown-options/reorder', () => {
      let options;

      beforeEach(async () => {
        options = await DropdownOption.create([
          { type: 'project', name: 'Project 1', order: 1 },
          { type: 'project', name: 'Project 2', order: 2 },
          { type: 'project', name: 'Project 3', order: 3 },
        ]);
      });

      it('should reorder options', async () => {
        const res = await request(app)
          .post('/api/admin/dropdown-options/reorder')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            options: [
              { id: options[0]._id.toString(), order: 3 },
              { id: options[1]._id.toString(), order: 1 },
              { id: options[2]._id.toString(), order: 2 },
            ],
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const updated = await DropdownOption.find({ type: 'project' }).sort({ order: 1 });
        expect(updated[0].name).toBe('Project 2');
        expect(updated[1].name).toBe('Project 3');
        expect(updated[2].name).toBe('Project 1');
      });

      it('should validate options array', async () => {
        const res = await request(app)
          .post('/api/admin/dropdown-options/reorder')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ options: [] });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
      });
    });
  });
});
