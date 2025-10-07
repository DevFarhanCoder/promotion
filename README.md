# Promotion App - Setup Instructions

A complete web application built with React.js, Node.js, Express.js, and MongoDB for creating personalized promotional images.

## Features

- User Registration with profile photo upload
- User Authentication (Login/Logout)
- Personalized promotional image generation
- Download and share functionality
- Responsive design

## Prerequisites

Before running this application, make sure you have the following installed:

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - [Download here](https://www.mongodb.com/try/download/community)
3. **Git** (optional) - [Download here](https://git-scm.com/)

## Installation & Setup

### 1. Install Dependencies

#### Backend Setup:
```bash
cd backend
npm install
```

#### Frontend Setup:
```bash
cd frontend
npm install
```

### 2. Environment Configuration

The backend already has a `.env` file configured. Update it if needed:

```
MONGODB_URI=mongodb://localhost:27017/promotion_app
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

**Windows:**
```bash
mongod
```

**macOS/Linux:**
```bash
sudo service mongod start
```

Or if using MongoDB Compass, just open the application.

### 4. Run the Application

#### Start Backend Server:
```bash
cd backend
npm run dev
```
The backend will run on: http://localhost:5000

#### Start Frontend (in a new terminal):
```bash
cd frontend
npm start
```
The frontend will run on: http://localhost:3000

## Usage

### 1. Sign Up
- Navigate to http://localhost:3000
- Fill in the signup form with:
  - Profile Photo (optional)
  - Name
  - Mobile Number (10 digits)
  - Name to Appear on Design
  - Password (minimum 6 characters)

### 2. Login
- Use your mobile number and password to login
- You'll be redirected to the home page

### 3. Generate & Download Images
- Click any download button in the table
- The system will generate a personalized promotional image with your details
- The image will automatically download
- You can also share the generated image

## Project Structure

```
promotion/
├── backend/
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── images.js
│   ├── middleware/
│   │   └── auth.js
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── SignUp.js
│   │   │   ├── Login.js
│   │   │   └── Home.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── public/
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Images
- `POST /api/images/generate` - Generate personalized image
- `GET /api/images/download/:filename` - Download image

### Users
- `GET /api/users/profile` - Get user profile

## Technologies Used

- **Frontend:** React.js, React Router, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Image Processing:** Canvas API
- **Password Hashing:** bcryptjs

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error:**
   - Make sure MongoDB is running
   - Check if the connection string in `.env` is correct

2. **Port Already in Use:**
   - Change the PORT in `.env` file
   - Or kill the process using the port

3. **File Upload Issues:**
   - Check if the `uploads` folder exists in the backend directory
   - Ensure proper file permissions

4. **CORS Issues:**
   - The backend is configured with CORS enabled
   - Make sure both servers are running on correct ports

## Customization

### Modify Promotional Image:
Edit `backend/routes/images.js` to customize:
- Image dimensions
- Background colors
- Text content
- Font styles
- User detail positioning

### Styling:
Modify `frontend/src/App.css` to change:
- Colors
- Fonts
- Layout
- Responsive behavior

## Production Deployment

For production deployment:

1. Set NODE_ENV=production in `.env`
2. Use a production MongoDB instance
3. Build the React app: `npm run build`
4. Serve the built files using a web server
5. Use PM2 or similar for backend process management

## Security Notes

- JWT secret should be strong and unique in production
- File upload validation is implemented
- Password hashing is handled automatically
- API routes are protected with authentication middleware

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure MongoDB is running
4. Check network connectivity between frontend and backend