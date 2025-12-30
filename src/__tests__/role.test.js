const request = require('supertest');
const { app } = require('../index');
const Role = require('../models/Role');
const User = require('../models/User');

describe('Role Endpoints', () => {
  const testAdmin = {
    email: 'admin@test.com',
    password: 'adminpassword123',
    name: 'Test Admin',
    isAdmin: true,
  };

  const testRole = {
    name: 'Manager',
    description: 'Can manage users',
    permissions: ['users:read', 'users:create', 'users:update'],
  };

  let adminToken;
  let superAdminRole;

  const createAdminAndLogin = async () => {
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

  beforeEach(async () => {
    adminToken = await createAdminAndLogin();
  });

  describe('GET /api/admin/roles/permissions', () => {
    it('should return available permissions', async () => {
      const res = await request(app)
        .get('/api/admin/roles/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.permissions).toBeDefined();
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.grouped).toBeDefined();
    });
  });

  describe('POST /api/admin/roles', () => {
    it('should create a new role', async () => {
      const res = await request(app)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testRole);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role.name).toBe(testRole.name);
      expect(res.body.data.role.permissions).toEqual(testRole.permissions);
    });

    it('should not create role with duplicate name', async () => {
      await Role.create(testRole);

      const res = await request(app)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testRole);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate role name is required', async () => {
      const res = await request(app)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['users:read'] });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should set as default role when isDefault is true', async () => {
      const res = await request(app)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...testRole, isDefault: true });

      expect(res.status).toBe(201);
      expect(res.body.data.role.isDefault).toBe(true);
    });

    it('should unset previous default when new default is created', async () => {
      await Role.create({ ...testRole, isDefault: true });

      const res = await request(app)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Default', permissions: [], isDefault: true });

      expect(res.status).toBe(201);

      const oldDefault = await Role.findOne({ name: testRole.name });
      expect(oldDefault.isDefault).toBe(false);
    });
  });

  describe('GET /api/admin/roles', () => {
    beforeEach(async () => {
      await Role.create(testRole);
      await Role.create({ name: 'Viewer', permissions: ['users:read'] });
    });

    it('should get all roles', async () => {
      const res = await request(app)
        .get('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // 3 roles: Super Admin + Manager + Viewer
      expect(res.body.data.roles).toHaveLength(3);
    });

    it('should sort roles by name', async () => {
      const res = await request(app)
        .get('/api/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      // Sorted alphabetically: Manager, Super Admin, Viewer
      expect(res.body.data.roles[0].name).toBe('Manager');
      expect(res.body.data.roles[1].name).toBe('Super Admin');
      expect(res.body.data.roles[2].name).toBe('Viewer');
    });
  });

  describe('GET /api/admin/roles/:id', () => {
    let roleId;

    beforeEach(async () => {
      const role = await Role.create(testRole);
      roleId = role._id.toString();
    });

    it('should get role by id', async () => {
      const res = await request(app)
        .get(`/api/admin/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role.name).toBe(testRole.name);
    });

    it('should return 404 for non-existent role', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/admin/roles/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/roles/:id', () => {
    let roleId;

    beforeEach(async () => {
      const role = await Role.create(testRole);
      roleId = role._id.toString();
    });

    it('should update role', async () => {
      const res = await request(app)
        .put(`/api/admin/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Manager', permissions: ['users:read'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role.name).toBe('Updated Manager');
      expect(res.body.data.role.permissions).toEqual(['users:read']);
    });

    it('should not update to existing role name', async () => {
      await Role.create({ name: 'Existing', permissions: [] });

      const res = await request(app)
        .put(`/api/admin/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Existing' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent role', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/api/admin/roles/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should not update system role', async () => {
      const systemRole = await Role.create({ ...testRole, name: 'System', isSystem: true });

      const res = await request(app)
        .put(`/api/admin/roles/${systemRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Modified System' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/roles/:id', () => {
    let roleId;

    beforeEach(async () => {
      const role = await Role.create(testRole);
      roleId = role._id.toString();
    });

    it('should delete role', async () => {
      const res = await request(app)
        .delete(`/api/admin/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const role = await Role.findById(roleId);
      expect(role).toBeNull();
    });

    it('should return 404 for non-existent role', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/api/admin/roles/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should not delete system role', async () => {
      const systemRole = await Role.create({ ...testRole, name: 'System', isSystem: true });

      const res = await request(app)
        .delete(`/api/admin/roles/${systemRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not delete role with assigned users', async () => {
      const role = await Role.create({ name: 'UsedRole', permissions: [] });
      await User.create({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: role._id,
      });

      const res = await request(app)
        .delete(`/api/admin/roles/${role._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('user(s) are assigned');
    });
  });

  describe('GET /api/admin/roles/default', () => {
    it('should return null when no default role', async () => {
      const res = await request(app)
        .get('/api/admin/roles/default')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBeNull();
    });

    it('should return default role when exists', async () => {
      await Role.create({ ...testRole, isDefault: true });

      const res = await request(app)
        .get('/api/admin/roles/default')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role.name).toBe(testRole.name);
      expect(res.body.data.role.isDefault).toBe(true);
    });
  });

  describe('GET /api/admin/roles/:id/users', () => {
    let roleId;

    beforeEach(async () => {
      const role = await Role.create(testRole);
      roleId = role._id.toString();
    });

    it('should get users by role', async () => {
      await User.create({
        email: 'user1@test.com',
        password: 'password123',
        name: 'User One',
        role: roleId,
      });
      await User.create({
        email: 'user2@test.com',
        password: 'password123',
        name: 'User Two',
        role: roleId,
      });

      const res = await request(app)
        .get(`/api/admin/roles/${roleId}/users`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toHaveLength(2);
      expect(res.body.data.count).toBe(2);
    });

    it('should return 404 for non-existent role', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/admin/roles/${fakeId}/users`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User creation with role', () => {
    it('should create user with role', async () => {
      const role = await Role.create(testRole);

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
          role: role._id.toString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBeDefined();
      expect(res.body.data.user.role._id).toBe(role._id.toString());
    });

    it('should assign default role when no role specified', async () => {
      await Role.create({ ...testRole, isDefault: true });

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBeDefined();
      expect(res.body.data.user.role.name).toBe(testRole.name);
    });

    it('should update user role', async () => {
      const role = await Role.create(testRole);
      const user = await User.create({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
      });

      const res = await request(app)
        .put(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: role._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role._id).toBe(role._id.toString());
    });

    it('should remove user role', async () => {
      const role = await Role.create(testRole);
      const user = await User.create({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: role._id,
      });

      const res = await request(app)
        .put(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: null });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBeNull();
    });
  });
});
