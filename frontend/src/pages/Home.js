import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [error, setError] = useState('');
  
  // Calculate dynamic dates
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const eventDate2 = new Date(currentYear, 8, 28); // September 28
  
  // If current date is past September, show next year's dates
  const displayYear = currentDate > eventDate2 ? currentYear + 1 : currentYear;

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDownload = async (imageType) => {
    setLoadingStates(prev => ({ ...prev, [imageType]: true }));
    setError('');

    try {
      // Generate personalized image with specific type
      const response = await api.post('/images/generate', { imageType });
      
      if (response.data.imageUrl) {
        
        // Create download link
        const link = document.createElement('a');
        link.href = `http://localhost:5000${response.data.imageUrl}`;
        link.download = `promotional-${imageType}-${user.displayName}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate personalized image');
    } finally {
      setLoadingStates(prev => ({ ...prev, [imageType]: false }));
    }
  };

  const handleShare = async (type) => {
    // First generate the image, then share
    setLoadingStates(prev => ({ ...prev, [`share-${type}`]: true }));
    setError('');

    try {
      let imageType;
      if (type === 'day1') imageType = 'english-day1';
      else if (type === 'day2') imageType = 'english-day2';
      else imageType = 'english-both';

      const response = await api.post('/images/generate', { imageType });
      
      if (response.data.imageUrl) {
        const shareUrl = `http://localhost:5000${response.data.imageUrl}`;
        
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Property Expo 2025 - Promotional Image',
              text: `Check out my personalized promotional image for Property Expo ${displayYear}!`,
              url: shareUrl,
            });
          } catch (err) {
            console.log('Error sharing:', err);
            // Fallback to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
              alert('Image URL copied to clipboard!');
            });
          }
        } else {
          // Fallback - copy to clipboard
          navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Image URL copied to clipboard!');
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate image for sharing');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`share-${type}`]: false }));
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="welcome-message">Welcome, {user.displayName}!</h1>
        <div className="header-actions">
          <Link to="/profile" className="profile-link">View Profile</Link>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="promo-table">
        <div className="table-header">
          <div className="table-row">
            <div className="table-cell">
              <div className="table-header-cell">Date</div>
            </div>
            <div className="table-cell">
              <div className="table-header-cell">English</div>
            </div>
            <div className="table-cell">
              <div className="table-header-cell">हिंदी</div>
            </div>
            <div className="table-cell">
              <div className="table-header-cell">Share</div>
            </div>
          </div>
        </div>

        {/* Row 1 */}
        <div className="table-row">
          <div className="table-cell">
            27th Sept {displayYear}
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleDownload('english-day1')}
              disabled={loadingStates['english-day1']}
              className="download-button"
            >
              {loadingStates['english-day1'] ? 'Generating...' : 'Download'}
            </button>
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleDownload('hindi-day1')}
              disabled={loadingStates['hindi-day1']}
              className="download-button"
            >
              {loadingStates['hindi-day1'] ? 'तैयार कर रहे हैं...' : 'डाउनलोड'}
            </button>
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleShare('day1')}
              disabled={loadingStates['share-day1']}
              className="share-button"
            >
              {loadingStates['share-day1'] ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {/* Row 2 */}
        <div className="table-row">
          <div className="table-cell">
            28th Sept {displayYear}
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleDownload('english-day2')}
              disabled={loadingStates['english-day2']}
              className="download-button"
            >
              {loadingStates['english-day2'] ? 'Generating...' : 'Download'}
            </button>
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleDownload('hindi-day2')}
              disabled={loadingStates['hindi-day2']}
              className="download-button"
            >
              {loadingStates['hindi-day2'] ? 'तैयार कर रहे हैं...' : 'डाउनलोड'}
            </button>
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleShare('day2')}
              disabled={loadingStates['share-day2']}
              className="share-button"
            >
              {loadingStates['share-day2'] ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {/* Row 3 */}
        <div className="table-row">
          <div className="table-cell">
            Both Days
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleDownload('english-both')}
              disabled={loadingStates['english-both']}
              className="download-button"
            >
              {loadingStates['english-both'] ? 'Generating...' : 'Download'}
            </button>
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleDownload('hindi-both')}
              disabled={loadingStates['hindi-both']}
              className="download-button"
            >
              {loadingStates['hindi-both'] ? 'तैयार कर रहे हैं...' : 'डाउनलोड'}
            </button>
          </div>
          <div className="table-cell">
            <button
              onClick={() => handleShare('both')}
              disabled={loadingStates['share-both']}
              className="share-button"
            >
              {loadingStates['share-both'] ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Home;