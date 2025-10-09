import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userReferrals, setUserReferrals] = useState([]);
  const [showReferrals, setShowReferrals] = useState(false);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check admin authentication
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchUsers();
    fetchStats();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/users/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchUserReferrals = async (userId, userName) => {
    setReferralsLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/admin/users/${userId}/referrals`);
      setUserReferrals(response.data.referrals || []);
      setSelectedUser({ id: userId, name: userName, ...response.data.introducer });
      setShowReferrals(true);
    } catch (err) {
      console.error('Fetch referrals error:', err);
      setError(err.response?.data?.message || 'Failed to fetch user referrals');
    } finally {
      setReferralsLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      const response = await api.delete(`/admin/users/${userId}`);
      setSuccess(`User "${userName}" deleted successfully. ${response.data.reassignedReferralsCount} referrals were reassigned.`);
      
      // Refresh users list
      fetchUsers();
      fetchStats();
      
      // Close referrals modal if it was open
      if (showReferrals && selectedUser?.id === userId) {
        setShowReferrals(false);
      }
    } catch (err) {
      console.error('Delete user error:', err);
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.mobile?.includes(searchTerm) ||
    user.introducerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.introducerMobile?.includes(searchTerm)
  );

  if (loading) {
    return <div className="loading">Loading user management...</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Admin Navigation */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            👥 User Management
          </div>
          <div className="navbar-nav">
            <button onClick={() => navigate('/admin/dashboard')} className="nav-button">
              🏠 Dashboard
            </button>
            <button onClick={handleLogout} className="nav-button">
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="user-management">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Statistics Cards */}
        {stats && (
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.totalUsers}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.usersToday}</div>
                  <div className="stat-label">Today</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.usersThisWeek}</div>
                  <div className="stat-label">This Week</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.usersThisMonth}</div>
                  <div className="stat-label">This Month</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Controls */}
        <div className="controls-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search users by name, mobile, or introducer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="total-count">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Users Table */}
        <div className="users-section">
          <h2>All Users ({filteredUsers.length})</h2>
          {filteredUsers.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User Info</th>
                    <th>Contact</th>
                    <th>Introducer</th>
                    <th>Referrals Made</th>
                    <th>Join Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{user.name}</div>
                          <div className="user-display">@{user.displayName}</div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="mobile">{user.mobile}</div>
                        </div>
                      </td>
                      <td>
                        <div className="introducer-info">
                          <div className="introducer-name">{user.introducerName}</div>
                          <div className="introducer-mobile">{user.introducerMobile}</div>
                        </div>
                      </td>
                      <td>
                        <div className="referral-count">
                          <span className="count-badge">{user.referralCount || 0}</span>
                          {user.referralCount > 0 && (
                            <button
                              onClick={() => fetchUserReferrals(user._id, user.name)}
                              className="view-referrals-btn"
                              disabled={referralsLoading}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="join-date">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="user-actions">
                          <button
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            className="delete-user-btn"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Introducers */}
        {stats && stats.topIntroducers && stats.topIntroducers.length > 0 && (
          <div className="top-introducers-section">
            <h2>Top Introducers</h2>
            <div className="introducers-grid">
              {stats.topIntroducers.map((introducer, index) => (
                <div key={introducer._id} className="introducer-card">
                  <div className="rank">#{index + 1}</div>
                  <div className="introducer-info">
                    <div className="name">{introducer.name}</div>
                    <div className="display-name">@{introducer.displayName}</div>
                    <div className="mobile">{introducer.mobile}</div>
                  </div>
                  <div className="referral-count">
                    <span className="count">{introducer.count}</span>
                    <span className="label">referrals</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referrals Modal */}
        {showReferrals && (
          <div className="modal-overlay" onClick={() => setShowReferrals(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Users Referred by {selectedUser?.name}</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowReferrals(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                {referralsLoading ? (
                  <div className="loading">Loading referrals...</div>
                ) : userReferrals.length === 0 ? (
                  <p>No referrals found for this user.</p>
                ) : (
                  <div className="referrals-list">
                    <div className="referrals-summary">
                      <strong>Total Referrals: {userReferrals.length}</strong>
                    </div>
                    <table className="referrals-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Display Name</th>
                          <th>Mobile</th>
                          <th>Sub-Referrals</th>
                          <th>Join Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userReferrals.map(referral => (
                          <tr key={referral._id}>
                            <td>{referral.name}</td>
                            <td>@{referral.displayName}</td>
                            <td>{referral.mobile}</td>
                            <td>
                              <span className="sub-referral-count">
                                {referral.subReferralCount || 0}
                              </span>
                            </td>
                            <td>{new Date(referral.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .user-management {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .stats-section {
          margin-bottom: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          color: #666;
          font-size: 0.9rem;
        }

        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 20px;
        }

        .search-container {
          flex: 1;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .total-count {
          color: #666;
          font-weight: 500;
        }

        .users-section {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .users-table-container {
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .users-table th,
        .users-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .users-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .user-info .user-name {
          font-weight: 600;
          color: #333;
        }

        .user-info .user-display {
          color: #666;
          font-size: 0.9rem;
        }

        .contact-info .mobile {
          font-family: monospace;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .introducer-info .introducer-name {
          font-weight: 500;
          color: #333;
        }

        .introducer-info .introducer-mobile {
          color: #666;
          font-size: 0.9rem;
          font-family: monospace;
        }

        .referral-count {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .count-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .view-referrals-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .view-referrals-btn:hover {
          background: #218838;
        }

        .join-date {
          color: #666;
          font-size: 0.9rem;
        }

        .delete-user-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .delete-user-btn:hover {
          background: #c82333;
        }

        .top-introducers-section {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .introducers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .introducer-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .introducer-card .rank {
          font-size: 1.5rem;
          font-weight: bold;
          opacity: 0.8;
        }

        .introducer-card .name {
          font-weight: 600;
        }

        .introducer-card .display-name,
        .introducer-card .mobile {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .introducer-card .referral-count {
          margin-left: auto;
          text-align: center;
        }

        .introducer-card .count {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .introducer-card .label {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 10px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
        }

        .referrals-summary {
          margin-bottom: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .referrals-table {
          width: 100%;
          border-collapse: collapse;
        }

        .referrals-table th,
        .referrals-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .referrals-table th {
          background: #f8f9fa;
          font-weight: 600;
        }

        .sub-referral-count {
          background: #17a2b8;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .controls-section {
            flex-direction: column;
            align-items: stretch;
          }
          
          .users-table-container {
            font-size: 0.9rem;
          }
          
          .introducers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;