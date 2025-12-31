const API_BASE = '/api/admin';
let token = localStorage.getItem('adminToken');
let currentPage = 0;
const pageSize = 20;
let rolesCache = [];
let permissionsCache = { permissions: [], grouped: {} };
let currentOptionType = 'project';
let dropdownOptionsCache = { grouped: {} };
let tripsPage = 0;
const tripsPageSize = 20;
let suspiciousPage = 0;
const suspiciousPageSize = 20;

// API Helper
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// Auth Functions
async function login(email, password) {
  const data = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  token = data.data.token;
  localStorage.setItem('adminToken', token);
  localStorage.setItem('adminData', JSON.stringify(data.data.admin));

  return data.data.admin;
}

function logout() {
  token = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
  showPage('login');
}

// UI Functions
function showPage(page) {
  document.getElementById('login-page').classList.toggle('hidden', page !== 'login');
  document.getElementById('dashboard-page').classList.toggle('hidden', page !== 'dashboard');

  if (page === 'dashboard') {
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    document.getElementById('admin-name').textContent = adminData.name || 'Admin';
    loadRolesCache();
    loadDashboard();
  }
}

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`${section}-section`).classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === section);
  });

  if (section === 'dashboard') loadDashboard();
  if (section === 'users') loadUsers();
  if (section === 'roles') loadRoles();
  if (section === 'create-user') populateRoleDropdowns();
  if (section === 'dropdown-options') loadDropdownOptions();
  if (section === 'open-trips') loadTrips();
  if (section === 'suspicious-entries') loadSuspiciousEntries();
}

function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function formatDate(dateString) {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Role Cache and Dropdowns
async function loadRolesCache() {
  try {
    const data = await apiRequest('/roles');
    rolesCache = data.data.roles;
    populateRoleDropdowns();
    populateRoleFilter();
  } catch (error) {
    console.error('Failed to load roles:', error);
  }
}

function populateRoleDropdowns() {
  const dropdowns = ['new-user-role', 'edit-user-role'];
  dropdowns.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">No Role</option>';
      rolesCache.forEach(role => {
        const option = document.createElement('option');
        option.value = role._id;
        option.textContent = role.name + (role.isDefault ? ' (Default)' : '');
        select.appendChild(option);
      });
      select.value = currentValue;
    }
  });
}

function populateRoleFilter() {
  const filter = document.getElementById('role-filter');
  if (filter) {
    filter.innerHTML = '<option value="">All Roles</option>';
    rolesCache.forEach(role => {
      const option = document.createElement('option');
      option.value = role._id;
      option.textContent = role.name;
      filter.appendChild(option);
    });
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const data = await apiRequest('/dashboard');
    const { stats, recentUsers } = data.data;

    document.getElementById('stat-total-users').textContent = stats.totalUsers;
    document.getElementById('stat-active-users').textContent = stats.activeUsers;
    document.getElementById('stat-inactive-users').textContent = stats.inactiveUsers;
    document.getElementById('stat-total-locations').textContent = stats.totalLocations;

    const tbody = document.getElementById('recent-users-table');
    tbody.innerHTML = recentUsers.map(user => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
          ${user.isActive ? 'Active' : 'Inactive'}
        </span></td>
        <td>${formatDate(user.createdAt)}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Users
async function loadUsers(search = '') {
  try {
    const skip = currentPage * pageSize;
    const roleFilter = document.getElementById('role-filter').value;
    let endpoint = `/users?limit=${pageSize}&skip=${skip}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    if (roleFilter) endpoint += `&role=${roleFilter}`;

    const data = await apiRequest(endpoint);
    const { users } = data.data;
    const { total, hasMore } = data.pagination;

    const tbody = document.getElementById('users-table');
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span class="role-badge ${user.role ? '' : 'no-role'}">
          ${user.role ? user.role.name : 'No Role'}
        </span></td>
        <td><span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
          ${user.isActive ? 'Active' : 'Inactive'}
        </span></td>
        <td>${formatDate(user.lastLogin)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-secondary btn-sm" onclick="editUser('${user._id}')">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="resetPassword('${user._id}')">Reset PWD</button>
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}', '${user.name}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    document.getElementById('page-info').textContent = `Page ${currentPage + 1} of ${Math.ceil(total / pageSize)}`;
    document.getElementById('prev-page').disabled = currentPage === 0;
    document.getElementById('next-page').disabled = !hasMore;
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

async function editUser(userId) {
  try {
    const data = await apiRequest(`/users/${userId}`);
    const { user } = data.data;

    document.getElementById('edit-user-id').value = user._id;
    document.getElementById('edit-user-name').value = user.name;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-role').value = user.role ? user.role._id : '';
    document.getElementById('edit-user-active').checked = user.isActive;

    populateRoleDropdowns();
    showModal('edit-modal');
  } catch (error) {
    alert('Failed to load user: ' + error.message);
  }
}

async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const name = document.getElementById('edit-user-name').value;
  const email = document.getElementById('edit-user-email').value;
  const role = document.getElementById('edit-user-role').value;
  const isActive = document.getElementById('edit-user-active').checked;

  try {
    await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email, role: role || null, isActive }),
    });

    hideModal('edit-modal');
    loadUsers();
    alert('User updated successfully');
  } catch (error) {
    alert('Failed to update user: ' + error.message);
  }
}

function resetPassword(userId) {
  document.getElementById('reset-user-id').value = userId;
  document.getElementById('new-password').value = '';
  showModal('reset-password-modal');
}

async function submitResetPassword(event) {
  event.preventDefault();

  const userId = document.getElementById('reset-user-id').value;
  const password = document.getElementById('new-password').value;

  try {
    await apiRequest(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    hideModal('reset-password-modal');
    alert('Password reset successfully');
  } catch (error) {
    alert('Failed to reset password: ' + error.message);
  }
}

async function deleteUser(userId, userName) {
  if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    await apiRequest(`/users/${userId}`, { method: 'DELETE' });
    loadUsers();
    alert('User deleted successfully');
  } catch (error) {
    alert('Failed to delete user: ' + error.message);
  }
}

async function createUser(event) {
  event.preventDefault();

  const name = document.getElementById('new-user-name').value;
  const email = document.getElementById('new-user-email').value;
  const password = document.getElementById('new-user-password').value;
  const role = document.getElementById('new-user-role').value;

  const messageEl = document.getElementById('create-user-message');

  try {
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role: role || null }),
    });

    messageEl.textContent = 'User created successfully!';
    messageEl.className = 'message success-message';

    document.getElementById('create-user-form').reset();

    setTimeout(() => {
      messageEl.textContent = '';
    }, 3000);
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.className = 'message error-message';
  }
}

// Roles
async function loadRoles() {
  try {
    const [rolesData, permData] = await Promise.all([
      apiRequest('/roles'),
      apiRequest('/roles/permissions')
    ]);

    rolesCache = rolesData.data.roles;
    permissionsCache = permData.data;

    const tbody = document.getElementById('roles-table');

    if (rolesCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #636e72;">No roles created yet. Click "Create New Role" to add one.</td></tr>';
      return;
    }

    tbody.innerHTML = await Promise.all(rolesCache.map(async role => {
      let userCount = 0;
      try {
        const usersData = await apiRequest(`/roles/${role._id}/users`);
        userCount = usersData.data.count;
      } catch (e) {
        // Ignore error
      }

      return `
        <tr>
          <td><strong>${role.name}</strong></td>
          <td>${role.description || '-'}</td>
          <td>${role.permissions.length} permissions</td>
          <td>${userCount} users</td>
          <td>${role.isDefault ? '<span class="default-badge">Default</span>' : '-'}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-secondary btn-sm" onclick="editRole('${role._id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteRole('${role._id}', '${role.name}')" ${role.isSystem ? 'disabled' : ''}>Delete</button>
            </div>
          </td>
        </tr>
      `;
    })).then(rows => rows.join(''));
  } catch (error) {
    console.error('Failed to load roles:', error);
  }
}

function renderPermissionsCheckboxes(selectedPermissions = []) {
  const container = document.getElementById('permissions-container');
  container.innerHTML = '';

  Object.entries(permissionsCache.grouped).forEach(([category, permissions]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'permission-category';
    categoryDiv.innerHTML = `<div class="permission-category-title">${category}</div>`;

    permissions.forEach(permission => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'permission-item';
      const isChecked = selectedPermissions.includes(permission);
      itemDiv.innerHTML = `
        <input type="checkbox" id="perm-${permission}" value="${permission}" ${isChecked ? 'checked' : ''}>
        <label for="perm-${permission}">${permission.split(':')[1]}</label>
      `;
      categoryDiv.appendChild(itemDiv);
    });

    container.appendChild(categoryDiv);
  });
}

function openCreateRoleModal() {
  document.getElementById('role-modal-title').textContent = 'Create Role';
  document.getElementById('role-id').value = '';
  document.getElementById('role-name').value = '';
  document.getElementById('role-description').value = '';
  document.getElementById('role-default').checked = false;
  renderPermissionsCheckboxes([]);
  showModal('role-modal');
}

async function editRole(roleId) {
  try {
    const data = await apiRequest(`/roles/${roleId}`);
    const { role } = data.data;

    document.getElementById('role-modal-title').textContent = 'Edit Role';
    document.getElementById('role-id').value = role._id;
    document.getElementById('role-name').value = role.name;
    document.getElementById('role-description').value = role.description || '';
    document.getElementById('role-default').checked = role.isDefault;
    renderPermissionsCheckboxes(role.permissions);
    showModal('role-modal');
  } catch (error) {
    alert('Failed to load role: ' + error.message);
  }
}

async function saveRole(event) {
  event.preventDefault();

  const roleId = document.getElementById('role-id').value;
  const name = document.getElementById('role-name').value;
  const description = document.getElementById('role-description').value;
  const isDefault = document.getElementById('role-default').checked;

  const permissions = [];
  document.querySelectorAll('#permissions-container input[type="checkbox"]:checked').forEach(cb => {
    permissions.push(cb.value);
  });

  const payload = { name, description, permissions, isDefault };

  try {
    if (roleId) {
      await apiRequest(`/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      alert('Role updated successfully');
    } else {
      await apiRequest('/roles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('Role created successfully');
    }

    hideModal('role-modal');
    loadRoles();
    loadRolesCache();
  } catch (error) {
    alert('Failed to save role: ' + error.message);
  }
}

async function deleteRole(roleId, roleName) {
  if (!confirm(`Are you sure you want to delete role "${roleName}"? Users with this role will have no role assigned.`)) {
    return;
  }

  try {
    await apiRequest(`/roles/${roleId}`, { method: 'DELETE' });
    loadRoles();
    loadRolesCache();
    alert('Role deleted successfully');
  } catch (error) {
    alert('Failed to delete role: ' + error.message);
  }
}

// Dropdown Options
async function loadDropdownOptions() {
  try {
    const data = await apiRequest('/dropdown-options');
    dropdownOptionsCache = data.data;
    renderOptionsTable();
  } catch (error) {
    console.error('Failed to load dropdown options:', error);
  }
}

function renderOptionsTable() {
  const typeMap = {
    'project': 'projects',
    'way_bridge': 'wayBridges',
    'loading_point': 'loadingPoints',
    'unloading_point': 'unloadingPoints',
    'transporter': 'transporters'
  };

  const groupKey = typeMap[currentOptionType];
  const options = dropdownOptionsCache.grouped[groupKey] || [];

  const tbody = document.getElementById('options-table');

  if (options.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #636e72;">No options found. Click "Add New Option" to create one.</td></tr>';
    return;
  }

  tbody.innerHTML = options.map(option => `
    <tr>
      <td>${option.order}</td>
      <td>${option.name}</td>
      <td>${option.code || '-'}</td>
      <td><span class="status-badge ${option.isActive ? 'status-active' : 'status-inactive'}">
        ${option.isActive ? 'Active' : 'Inactive'}
      </span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-secondary btn-sm" onclick="editOption('${option._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteOption('${option._id}', '${option.name}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function switchOptionTab(type) {
  currentOptionType = type;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const tabType = btn.dataset.tab === 'projects' ? 'project' : btn.dataset.tab;
    btn.classList.toggle('active', tabType === type);
  });

  renderOptionsTable();
}

function getTypeDisplayName(type) {
  const names = {
    'project': 'Project',
    'way_bridge': 'Way Bridge',
    'loading_point': 'Loading Point',
    'unloading_point': 'Unloading Point',
    'transporter': 'Transporter'
  };
  return names[type] || type;
}

function openCreateOptionModal() {
  document.getElementById('option-modal-title').textContent = `Add ${getTypeDisplayName(currentOptionType)}`;
  document.getElementById('option-id').value = '';
  document.getElementById('option-type').value = currentOptionType;
  document.getElementById('option-name').value = '';
  document.getElementById('option-code').value = '';
  document.getElementById('option-order').value = '0';
  document.getElementById('option-active').checked = true;
  document.getElementById('option-active-group').style.display = 'none';
  showModal('option-modal');
}

async function editOption(optionId) {
  try {
    const data = await apiRequest(`/dropdown-options/${optionId}`);
    const { option } = data.data;

    document.getElementById('option-modal-title').textContent = `Edit ${getTypeDisplayName(option.type)}`;
    document.getElementById('option-id').value = option._id;
    document.getElementById('option-type').value = option.type;
    document.getElementById('option-name').value = option.name;
    document.getElementById('option-code').value = option.code || '';
    document.getElementById('option-order').value = option.order || 0;
    document.getElementById('option-active').checked = option.isActive;
    document.getElementById('option-active-group').style.display = 'block';
    showModal('option-modal');
  } catch (error) {
    alert('Failed to load option: ' + error.message);
  }
}

async function saveOption(event) {
  event.preventDefault();

  const optionId = document.getElementById('option-id').value;
  const type = document.getElementById('option-type').value;
  const name = document.getElementById('option-name').value;
  const code = document.getElementById('option-code').value;
  const order = parseInt(document.getElementById('option-order').value) || 0;
  const isActive = document.getElementById('option-active').checked;

  try {
    if (optionId) {
      await apiRequest(`/dropdown-options/${optionId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, code, order, isActive }),
      });
      alert('Option updated successfully');
    } else {
      await apiRequest('/dropdown-options', {
        method: 'POST',
        body: JSON.stringify({ type, name, code, order }),
      });
      alert('Option created successfully');
    }

    hideModal('option-modal');
    loadDropdownOptions();
  } catch (error) {
    alert('Failed to save option: ' + error.message);
  }
}

async function deleteOption(optionId, optionName) {
  if (!confirm(`Are you sure you want to delete "${optionName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    await apiRequest(`/dropdown-options/${optionId}`, { method: 'DELETE' });
    loadDropdownOptions();
    alert('Option deleted successfully');
  } catch (error) {
    alert('Failed to delete option: ' + error.message);
  }
}

// Trips
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'active': return 'status-active';
    case 'completed': return 'status-inactive';
    case 'cancelled': return 'status-cancelled';
    default: return '';
  }
}

async function loadTrips() {
  try {
    const skip = tripsPage * tripsPageSize;
    const statusFilter = document.getElementById('trip-status-filter').value;
    let endpoint = `/trips?limit=${tripsPageSize}&skip=${skip}`;
    if (statusFilter) endpoint += `&status=${statusFilter}`;

    const data = await apiRequest(endpoint);
    const { trips, activeCount } = data.data;
    const { total, hasMore } = data.pagination;

    document.getElementById('stat-active-trips').textContent = activeCount;

    const tbody = document.getElementById('trips-table');

    if (trips.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #636e72;">No trips found.</td></tr>';
    } else {
      tbody.innerHTML = trips.map(trip => `
        <tr>
          <td><strong>${trip.vehicleNumber}</strong></td>
          <td>${trip.userId ? trip.userId.name : 'Unknown'}</td>
          <td>${trip.projectId ? trip.projectId.name : trip.projectName || '-'}</td>
          <td>
            <span class="role-badge">${trip.selectionType.replace('_', ' ')}</span>
            ${trip.selectionId ? trip.selectionId.name : trip.selectionName || '-'}
          </td>
          <td>${formatDateTime(trip.startTime)}</td>
          <td><span class="status-badge ${getStatusBadgeClass(trip.status)}">
            ${trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </span></td>
        </tr>
      `).join('');
    }

    document.getElementById('trips-page-info').textContent = `Page ${tripsPage + 1} of ${Math.ceil(total / tripsPageSize) || 1}`;
    document.getElementById('prev-trips-page').disabled = tripsPage === 0;
    document.getElementById('next-trips-page').disabled = !hasMore;
  } catch (error) {
    console.error('Failed to load trips:', error);
  }
}

// Suspicious Entries
function getSuspiciousTypeBadge(entryType) {
  if (entryType === 'missing_loading') {
    return '<span class="status-badge status-warning">Missing Loading</span>';
  }
  return '<span class="status-badge status-cancelled">Missing Unloading</span>';
}

async function loadSuspiciousEntries() {
  try {
    const skip = suspiciousPage * suspiciousPageSize;
    const typeFilter = document.getElementById('suspicious-type-filter').value;
    let endpoint = `/suspicious-entries?limit=${suspiciousPageSize}&skip=${skip}`;
    if (typeFilter && typeFilter !== 'all') endpoint += `&type=${typeFilter}`;

    const data = await apiRequest(endpoint);
    const { entries, counts } = data.data;
    const { total, hasMore } = data.pagination;

    // Update stats
    document.getElementById('stat-missing-loading').textContent = counts.loading;
    document.getElementById('stat-missing-unloading').textContent = counts.unloading;
    document.getElementById('stat-total-suspicious').textContent = counts.total;

    const tbody = document.getElementById('suspicious-entries-table');

    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #636e72;">No suspicious entries found.</td></tr>';
    } else {
      tbody.innerHTML = entries.map(entry => `
        <tr>
          <td>${getSuspiciousTypeBadge(entry.entryType)}</td>
          <td><strong>${entry.vehicleNumber || '-'}</strong></td>
          <td>${entry.userId ? entry.userId.name : 'Unknown'}</td>
          <td>${entry.projectName || '-'}</td>
          <td>${entry.reason || entry.description || '-'}</td>
          <td>${formatDateTime(entry.createdAt)}</td>
        </tr>
      `).join('');
    }

    document.getElementById('suspicious-page-info').textContent = `Page ${suspiciousPage + 1} of ${Math.ceil(total / suspiciousPageSize) || 1}`;
    document.getElementById('prev-suspicious-page').disabled = suspiciousPage === 0;
    document.getElementById('next-suspicious-page').disabled = !hasMore;
  } catch (error) {
    console.error('Failed to load suspicious entries:', error);
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check if logged in
  if (token) {
    showPage('dashboard');
  } else {
    showPage('login');
  }

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
      await login(email, password);
      showPage('dashboard');
    } catch (error) {
      errorEl.textContent = error.message;
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // Search
  document.getElementById('search-btn').addEventListener('click', () => {
    currentPage = 0;
    loadUsers(document.getElementById('user-search').value);
  });

  document.getElementById('user-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      currentPage = 0;
      loadUsers(document.getElementById('user-search').value);
    }
  });

  // Role filter
  document.getElementById('role-filter').addEventListener('change', () => {
    currentPage = 0;
    loadUsers(document.getElementById('user-search').value);
  });

  // Pagination
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadUsers(document.getElementById('user-search').value);
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    currentPage++;
    loadUsers(document.getElementById('user-search').value);
  });

  // Create user form
  document.getElementById('create-user-form').addEventListener('submit', createUser);

  // Edit user form
  document.getElementById('edit-user-form').addEventListener('submit', saveUser);

  // Reset password form
  document.getElementById('reset-password-form').addEventListener('submit', submitResetPassword);

  // Create role button
  document.getElementById('create-role-btn').addEventListener('click', openCreateRoleModal);

  // Role form
  document.getElementById('role-form').addEventListener('submit', saveRole);

  // Create option button
  document.getElementById('create-option-btn').addEventListener('click', openCreateOptionModal);

  // Option form
  document.getElementById('option-form').addEventListener('submit', saveOption);

  // Tab buttons for dropdown options
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabType = btn.dataset.tab === 'projects' ? 'project' : btn.dataset.tab;
      switchOptionTab(tabType);
    });
  });

  // Trips
  document.getElementById('refresh-trips-btn').addEventListener('click', () => {
    tripsPage = 0;
    loadTrips();
  });

  document.getElementById('trip-status-filter').addEventListener('change', () => {
    tripsPage = 0;
    loadTrips();
  });

  document.getElementById('prev-trips-page').addEventListener('click', () => {
    if (tripsPage > 0) {
      tripsPage--;
      loadTrips();
    }
  });

  document.getElementById('next-trips-page').addEventListener('click', () => {
    tripsPage++;
    loadTrips();
  });

  // Suspicious Entries
  document.getElementById('refresh-suspicious-btn').addEventListener('click', () => {
    suspiciousPage = 0;
    loadSuspiciousEntries();
  });

  document.getElementById('suspicious-type-filter').addEventListener('change', () => {
    suspiciousPage = 0;
    loadSuspiciousEntries();
  });

  document.getElementById('prev-suspicious-page').addEventListener('click', () => {
    if (suspiciousPage > 0) {
      suspiciousPage--;
      loadSuspiciousEntries();
    }
  });

  document.getElementById('next-suspicious-page').addEventListener('click', () => {
    suspiciousPage++;
    loadSuspiciousEntries();
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
      });
    });
  });

  // Close modal on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
});
