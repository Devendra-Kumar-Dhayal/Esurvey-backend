const API_BASE = '/api/admin';
let token = localStorage.getItem('adminToken');
let currentPage = 0;
const pageSize = 20;

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
    let endpoint = `/users?limit=${pageSize}&skip=${skip}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;

    const data = await apiRequest(endpoint);
    const { users } = data.data;
    const { total, hasMore } = data.pagination;

    const tbody = document.getElementById('users-table');
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
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
    document.getElementById('edit-user-active').checked = user.isActive;

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
  const isActive = document.getElementById('edit-user-active').checked;

  try {
    await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email, isActive }),
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

  const messageEl = document.getElementById('create-user-message');

  try {
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
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
