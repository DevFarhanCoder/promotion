import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const AllUsersManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingIntroducer, setEditingIntroducer] = useState(null);
  const [editingUserType, setEditingUserType] = useState(null);
  const [introducerInput, setIntroducerInput] = useState('');
  const [introducerSuggestions, setIntroducerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch all users
  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      console.log('Fetching all users from:', api.defaults.baseURL + '/users/all-users');
      const response = await api.get('/users/all-users');
      console.log('Users fetched successfully:', response.data);
      console.log('Number of users:', response.data.users?.length);
      if (response.data.users?.length > 0) {
        console.log('First user sample:', response.data.users[0]);
        console.log('Introducer data:', response.data.users[0]?.introducer);
        console.log('IntroducerName:', response.data.users[0]?.introducerName);
      }
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch users';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for introducers by mobile/name
  const searchIntroducers = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setIntroducerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await api.get(`/users/search-introducers?q=${encodeURIComponent(searchTerm)}`);
      setIntroducerSuggestions(response.data.users || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error searching introducers:', err);
      setIntroducerSuggestions([]);
    }
  }, []);

  // Update introducer
  const updateIntroducer = async (userId, introducerId) => {
    try {
      console.log('Updating introducer for user:', userId, 'to:', introducerId);
      const response = await api.put(`/users/update-introducer/${userId}`, { introducerId });
      console.log('Introducer update response:', response.data);
      await fetchAllUsers(); // Refresh data
      setEditingIntroducer(null);
      setIntroducerInput('');
      setShowSuggestions(false);
      setSuccess('Introducer updated successfully! Network relationships have been refreshed.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating introducer:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update introducer';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Update user type and collection
  const updateUserType = async (userId, userType) => {
    try {
      console.log('Updating user type for user:', userId, 'to:', userType);
      const response = await api.put(`/users/update-user-type/${userId}`, { userType });
      console.log('User type update response:', response.data);
      await fetchAllUsers(); // Refresh data
      setEditingUserType(null);
      setSuccess(`User type updated to ${userType} successfully!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating user type:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update user type';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Handle introducer input change
  const handleIntroducerInputChange = (value) => {
    setIntroducerInput(value);
    searchIntroducers(value);
  };

  // Handle introducer selection
  const handleIntroducerSelect = (user, selectedIntroducer) => {
    updateIntroducer(user._id, selectedIntroducer._id);
  };

  // Handle user type selection
  const handleUserTypeSelect = (user, userType) => {
    updateUserType(user._id, userType);
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="all-users-management">
      {/* Navigation Header */}
      <nav className="management-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <img src="/promotion-hub.png" alt="Promotion Hub" className="navbar-logo" />
          </div>
          <div className="navbar-nav">
            <Link to="/home" className="nav-link">
              Home
            </Link>
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
            <button onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }} className="nav-button">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="management-content">
        <div className="section-header">
          <h2 className="section-title">All Users Management</h2>
          <p className="section-subtitle">Manage all users, their introducers, and user types</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="users-table-container">
          <table className="users-management-table">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Name</th>
                <th>Mobile No.</th>
                <th>Introducer Name/Edit</th>
                <th>I AM a</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user._id}>
                  <td>{index + 1}</td>
                  <td>{user.displayName || user.name}</td>
                  <td>{user.mobile || 'N/A'}</td>
                  
                  {/* Introducer Name/Edit Column */}
                  <td className="introducer-cell">
                    {editingIntroducer === user._id ? (
                      <div className="introducer-edit-container">
                        <input
                          type="text"
                          value={introducerInput}
                          onChange={(e) => handleIntroducerInputChange(e.target.value)}
                          placeholder="Type mobile number or name..."
                          className="introducer-input"
                          autoFocus
                          onBlur={() => {
                            // Delay to allow selection
                            setTimeout(() => {
                              if (!showSuggestions) {
                                setEditingIntroducer(null);
                                setIntroducerInput('');
                              }
                            }, 200);
                          }}
                        />
                        
                        {showSuggestions && introducerSuggestions.length > 0 && (
                          <div className="suggestions-dropdown">
                            {introducerSuggestions.map((suggester) => (
                              <div
                                key={suggester._id}
                                className="suggestion-item"
                                onClick={() => handleIntroducerSelect(user, suggester)}
                              >
                                {suggester.displayName || suggester.name} - {suggester.mobile}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="introducer-display"
                        onClick={() => {
                          setEditingIntroducer(user._id);
                          setIntroducerInput(user.introducerName || '');
                        }}
                      >
                        {user.introducerName || 'No Introducer'}
                        <span className="edit-icon">✎</span>
                      </div>
                    )}
                  </td>

                  {/* I AM a Column */}
                  <td className="user-type-cell">
                    {editingUserType === user._id ? (
                      <div className="user-type-options">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`userType-${user._id}`}
                            value="CP"
                            checked={user.userType === 'CP'}
                            onChange={() => handleUserTypeSelect(user, 'CP')}
                          />
                          CP
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`userType-${user._id}`}
                            value="Customer"
                            checked={user.userType === 'Customer'}
                            onChange={() => handleUserTypeSelect(user, 'Customer')}
                          />
                          CUST
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`userType-${user._id}`}
                            value="Both"
                            checked={user.userType === 'Both'}
                            onChange={() => handleUserTypeSelect(user, 'Both')}
                          />
                          BOTH
                        </label>
                        <button
                          className="cancel-btn"
                          onClick={() => setEditingUserType(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        className="user-type-display"
                        onClick={() => setEditingUserType(user._id)}
                      >
                        {user.userType || 'Not Set'}
                        <span className="edit-icon">✎</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .management-navbar {
          background: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 0;
          margin-bottom: 20px;
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
        }

        .navbar-logo {
          height: 40px;
          width: auto;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-link {
          text-decoration: none;
          color: #666;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .nav-link:hover {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          transform: translateY(-2px);
        }

        .nav-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .management-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 30px;
        }

        .all-users-management {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 5px;
        }

        .section-subtitle {
          color: #666;
          font-size: 0.9rem;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        .users-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin: 0 10px;
        }

        .users-management-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }

  .users-management-table th {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    white-space: nowrap;
  }

  .users-management-table th:first-child {
    text-align: center;
  }

  .users-management-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #e9ecef;
          position: relative;
          font-size: 12px;
          word-wrap: break-word;
          max-width: 150px;
        }

        .users-management-table td:first-child {
          text-align: center;
        }

        .users-management-table tbody tr:hover {
          background: #f8f9fa;
        }

        .introducer-cell {
          position: relative;
        }

        .introducer-edit-container {
          position: relative;
        }

        .introducer-input {
          width: 100%;
          padding: 5px 8px;
          border: 1px solid #667eea;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
        }

        .introducer-input:focus {
          border-color: #764ba2;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
        }

        .suggestion-item {
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
        }

        .suggestion-item:hover {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .introducer-display,
        .user-type-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .introducer-display:hover,
        .user-type-display:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          color: #667eea;
        }

        .edit-icon {
          color: #667eea;
          opacity: 0.7;
          font-size: 11px;
          margin-left: 6px;
        }

        .introducer-display:hover .edit-icon,
        .user-type-display:hover .edit-icon {
          opacity: 1;
        }

        .user-type-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 6px;
          background: white;
          border: 1px solid #667eea;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 12px;
          padding: 3px;
        }

        .radio-option:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border-radius: 3px;
        }

        .radio-option input[type="radio"] {
          margin: 0;
          accent-color: #667eea;
        }

        .cancel-btn {
          align-self: flex-end;
          background: #f8f9fa;
          border: 1px solid #667eea;
          border-radius: 3px;
          padding: 2px 8px;
          cursor: pointer;
          font-size: 11px;
          color: #667eea;
        }

        .cancel-btn:hover {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 1.1rem;
          color: #666;
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
          .navbar-container {
            padding: 0.75rem 1rem;
          }

          .navbar-nav {
            gap: 0.5rem;
          }

          .nav-link {
            padding: 6px 12px;
            font-size: 14px;
          }

          .nav-button {
            padding: 6px 12px;
            font-size: 14px;
          }

          .management-content {
            padding: 0 15px;
          }

          .section-title {
            font-size: 1.25rem;
          }

          .section-subtitle {
            font-size: 0.85rem;
          }

          .users-table-container {
            border-radius: 6px;
            margin: 0 5px;
          }

          .users-management-table {
            font-size: 12px;
          }

          .users-management-table th,
          .users-management-table td {
            padding: 8px 5px;
            font-size: 12px;
            max-width: 120px;
          }

          .users-management-table th {
            font-size: 11px;
          }

          .introducer-input {
            font-size: 13px;
            padding: 5px 6px;
          }

          .suggestion-item {
            padding: 6px 10px;
            font-size: 13px;
          }

          .radio-option {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .management-content {
            padding: 0 12px;
          }

          .navbar-container {
            flex-direction: column;
            gap: 10px;
            padding: 0.75rem;
          }

          .navbar-nav {
            width: 100%;
            justify-content: space-between;
          }

          .section-title {
            font-size: 1.1rem;
            text-align: center;
          }

          .section-subtitle {
            font-size: 0.8rem;
            text-align: center;
          }

          .users-table-container {
            margin: 0 5px;
          }

          .users-management-table {
            font-size: 10px;
          }

          .users-management-table th,
          .users-management-table td {
            padding: 6px 3px;
            font-size: 10px;
            max-width: 100px;
          }

          .users-management-table th {
            font-size: 9px;
          }

          .users-management-table th:first-child,
          .users-management-table td:first-child {
            max-width: 30px;
          }

          .edit-icon {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default AllUsersManagement;
