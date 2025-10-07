import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    displayName: '',
    password: '',
    profilePhoto: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profilePhoto') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate mobile number
      if (!/^[0-9]{10}$/.test(formData.mobile)) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      // Validate password
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('mobile', formData.mobile);
      submitData.append('displayName', formData.displayName);
      submitData.append('password', formData.password);
      
      if (formData.profilePhoto) {
        submitData.append('profilePhoto', formData.profilePhoto);
      }

      const response = await api.post('/auth/signup', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setSuccess('Registration successful! Redirecting to home...');
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Profile Photo (Optional)</label>
          <input
            type="file"
            name="profilePhoto"
            accept="image/*"
            onChange={handleChange}
            className="form-input file-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter your full name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mobile Number *</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter 10-digit mobile number"
            maxLength="10"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Name to Appear on Design *</label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Name for promotional image"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter password (min 6 characters)"
            minLength="6"
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          disabled={loading}
          className="form-button"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="form-link">
        Already have an account? <Link to="/login">Login here</Link>
      </div>
    </div>
  );
};

export default SignUp;