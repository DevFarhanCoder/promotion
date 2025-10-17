import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AllUsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingIntroducer, setEditingIntroducer] = useState(null);
  const [editingUserType, setEditingUserType] = useState(null);
  const [introducerInput, setIntroducerInput] = useState('');
  const [introducerSuggestions, setIntroducerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch all users
  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/all-users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
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
      await api.put(`/users/update-introducer/${userId}`, { introducerId });
      await fetchAllUsers(); // Refresh data
      setEditingIntroducer(null);
      setIntroducerInput('');
      setShowSuggestions(false);
    } catch (err) {
      console.error('Error updating introducer:', err);
      setError('Failed to update introducer');
    }
  };

  // Update user type and collection
  const updateUserType = async (userId, userType) => {
    try {
      await api.put(`/users/update-user-type/${userId}`, { userType });
      await fetchAllUsers(); // Refresh data
      setEditingUserType(null);
    } catch (err) {
      console.error('Error updating user type:', err);
      setError('Failed to update user type');
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
      <div className="section-header">
        <h2 className="section-title">All Users Management</h2>
        <p className="section-subtitle">Manage all users, their introducers, and user types</p>
      </div>

      {error && <div className="error-message">{error}</div>}

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
                      <span className="edit-icon">✏️</span>
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
                      <span className="edit-icon">✏️</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .all-users-management {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
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

        .users-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .users-management-table {
          width: 100%;
          border-collapse: collapse;
        }

        .users-management-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e9ecef;
        }

        .users-management-table td {
          padding: 12px;
          border-bottom: 1px solid #e9ecef;
          position: relative;
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
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
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
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
        }

        .suggestion-item:hover {
          background: #f0f0f0;
        }

        .introducer-display,
        .user-type-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .introducer-display:hover,
        .user-type-display:hover {
          background: #f0f0f0;
        }

        .edit-icon {
          opacity: 0.5;
          font-size: 12px;
        }

        .user-type-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .radio-option input[type="radio"] {
          margin: 0;
        }

        .cancel-btn {
          align-self: flex-end;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 3px;
          padding: 2px 6px;
          cursor: pointer;
          font-size: 12px;
        }

        .cancel-btn:hover {
          background: #e9ecef;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 1.1rem;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default AllUsersManagement;
