import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AllUsersManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0
  });

  useEffect(() => {
    // Check if admin token exists
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchAllUsers();
  }, [navigate]);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.mobile?.includes(searchTerm) ||
        user.introducerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      console.log('Fetching all users...');
      const response = await api.get('/admin/all-users');
      console.log('API Response:', response.data);
      const usersData = response.data.users || [];
      setUsers(usersData);
      setFilteredUsers(usersData);
      
      // Calculate stats
      setStats({
        totalUsers: usersData.length,
        activeUsers: usersData.filter(u => u.isActive !== false).length,
        inactiveUsers: usersData.filter(u => u.isActive === false).length
      });
      
      console.log('Users fetched successfully:', usersData.length);
    } catch (err) {
      console.error('Fetch users error:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch users';
      setError(errorMessage);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);
      setError('');
      const response = await api.delete(`/admin/users/${userToDelete.id}`);
      setSuccess(`User "${userToDelete.name}" has been permanently deleted from the database. ${response.data.message || ''}`);
      
      // Refresh user list
      await fetchAllUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Delete user error:', err);
      setError(err.response?.data?.message || 'Failed to delete user');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError('');
      
      // Delete each selected user
      const deletePromises = selectedUsers.map(userId => 
        api.delete(`/admin/users/${userId}`)
      );
      
      await Promise.all(deletePromises);
      setSuccess(`Successfully deleted ${selectedUsers.length} user(s) from the database.`);
      
      // Clear selections and refresh
      setSelectedUsers([]);
      await fetchAllUsers();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Bulk delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete selected users');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u._id || u.id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Admin Navigation */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            👥 All Users Management
          </div>
          <div className="navbar-nav">
            <button onClick={() => navigate('/admin/dashboard')} className="nav-button">
              🏠 Dashboard
            </button>
            <button onClick={() => navigate('/admin/users')} className="nav-button">
              📊 Referral Network
            </button>
            <button onClick={handleLogout} className="nav-button">
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="all-users-management">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Statistics Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-number">{stats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-number">{stats.inactiveUsers}</div>
              <div className="stat-label">Inactive Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-number">{selectedUsers.length}</div>
              <div className="stat-label">Selected for Delete</div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, mobile, or introducer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="bulk-actions">
            {selectedUsers.length > 0 && (
              <button 
                onClick={handleBulkDelete} 
                className="bulk-delete-button"
                disabled={deleteLoading}
              >
                🗑️ Delete Selected ({selectedUsers.length})
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="users-table-section">
          <h2>All Users ({filteredUsers.length})</h2>
          {filteredUsers.length === 0 ? (
            <p className="no-data">No users found.</p>
          ) : (
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={toggleSelectAll}
                        className="checkbox-input"
                      />
                    </th>
                    <th>Name</th>
                    <th>Display Name</th>
                    <th>Mobile</th>
                    <th>Introducer</th>
                    <th>Join Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id || user.id} className={selectedUsers.includes(user._id || user.id) ? 'selected-row' : ''}>
                      <td className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id || user.id)}
                          onChange={() => toggleUserSelection(user._id || user.id)}
                          className="checkbox-input"
                        />
                      </td>
                      <td className="user-name-cell">{user.name}</td>
                      <td className="display-name-cell">@{user.displayName}</td>
                      <td className="mobile-cell">{user.mobile}</td>
                      <td className="introducer-cell">
                        {user.introducerName ? (
                          <div>
                            <div className="introducer-name">{user.introducerName}</div>
                            <div className="introducer-mobile">{user.introducerMobile}</div>
                          </div>
                        ) : (
                          <span className="no-introducer">Root User</span>
                        )}
                      </td>
                      <td className="date-cell">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => handleDeleteUser(user._id || user.id, user.name)}
                          className="delete-button"
                          disabled={deleteLoading}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>⚠️ Confirm Delete</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p className="warning-text">
                  Are you sure you want to permanently delete user <strong>"{userToDelete.name}"</strong>?
                </p>
                <p className="warning-subtext">
                  This action will:
                </p>
                <ul className="warning-list">
                  <li>Remove the user's profile from the database</li>
                  <li>Delete all associated data</li>
                  <li>Reassign their referrals to their introducer</li>
                  <li>Cannot be undone</li>
                </ul>
              </div>
              <div className="modal-footer">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="cancel-button"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="confirm-delete-button"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .all-users-management {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Statistics Cards */
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: #4a5568;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stat-info {
          flex: 1;
          text-align: center;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 8px;
        }

        .stat-label {
          color: #718096;
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* Controls Section */
        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-container {
          flex: 1;
          max-width: 500px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #4a5568;
          box-shadow: 0 0 0 3px rgba(74, 85, 104, 0.1);
        }

        .bulk-actions {
          display: flex;
          gap: 10px;
        }

        .bulk-delete-button {
          padding: 12px 24px;
          background: #e53e3e;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bulk-delete-button:hover {
          background: #c53030;
        }

        .bulk-delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Users Table Section */
        .users-table-section {
          background: white;
          padding: 25px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .users-table-section h2 {
          margin: 0 0 20px 0;
          font-size: 1.3rem;
          font-weight: 600;
          color: #4a5568;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #718096;
          font-size: 1.1rem;
        }

        .table-container {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .users-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 900px;
        }

        .users-table thead {
          background: #4a5568;
        }

        .users-table th {
          color: white;
          padding: 16px 20px;
          text-align: left;
          font-weight: 700;
          font-size: 0.95rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .users-table th.checkbox-column {
          width: 50px;
          text-align: center;
        }

        .users-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .users-table tbody tr {
          background: white;
          transition: all 0.15s;
        }

        .users-table tbody tr:nth-child(even) {
          background: #f7fafc;
        }

        .users-table tbody tr:hover {
          background: #edf2f7;
        }

        .users-table tbody tr.selected-row {
          background: #fff5f5;
        }

        .checkbox-column {
          text-align: center !important;
        }

        .checkbox-input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .user-name-cell {
          font-weight: 600;
          color: #2d3748;
        }

        .display-name-cell {
          color: #4a5568;
          font-weight: 500;
        }

        .mobile-cell {
          font-family: 'Courier New', monospace;
          color: #718096;
        }

        .introducer-cell {
          font-size: 0.875rem;
        }

        .introducer-name {
          font-weight: 600;
          color: #2d3748;
        }

        .introducer-mobile {
          color: #718096;
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
        }

        .no-introducer {
          color: #48bb78;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .date-cell {
          color: #718096;
          font-size: 0.875rem;
        }

        .status-cell {
          text-align: center;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: #c6f6d5;
          color: #22543d;
        }

        .status-badge.inactive {
          background: #fed7d7;
          color: #742a2a;
        }

        .actions-cell {
          text-align: center;
        }

        .delete-button {
          padding: 8px 16px;
          background: #e53e3e;
          color: white;
          border: none;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-button:hover {
          background: #c53030;
        }

        .delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 10px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          color: #e53e3e;
          font-size: 1.3rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #718096;
        }

        .modal-close:hover {
          color: #2d3748;
        }

        .modal-body {
          padding: 20px;
        }

        .warning-text {
          font-size: 1.1rem;
          color: #2d3748;
          margin-bottom: 15px;
        }

        .warning-subtext {
          color: #718096;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .warning-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .warning-list li {
          padding: 8px 0;
          color: #718096;
          padding-left: 25px;
          position: relative;
        }

        .warning-list li:before {
          content: "⚠️";
          position: absolute;
          left: 0;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .cancel-button {
          padding: 10px 20px;
          background: #e2e8f0;
          color: #2d3748;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        .cancel-button:hover {
          background: #cbd5e0;
        }

        .confirm-delete-button {
          padding: 10px 20px;
          background: #e53e3e;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        .confirm-delete-button:hover {
          background: #c53030;
        }

        .confirm-delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .all-users-management {
            padding: 10px;
          }

          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .controls-section {
            flex-direction: column;
            align-items: stretch;
          }

          .search-container {
            max-width: 100%;
          }

          .users-table {
            font-size: 0.875rem;
          }

          .users-table th,
          .users-table td {
            padding: 12px 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default AllUsersManagement;
