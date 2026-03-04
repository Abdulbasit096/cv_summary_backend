# CV Summary Backend

Express.js backend application boilerplate.

## Features

- Express.js server setup
- MongoDB integration with Mongoose
- CORS enabled
- Security headers (Helmet)
- Request logging (Morgan)
- Environment variables support
- Error handling middleware
- Organized folder structure
- User and CV Bank data models

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (locally installed)

## Installation

```bash
npm install
```

## Configuration

1. Ensure MongoDB is running locally on `mongodb://localhost:27017`
2. Create a `.env` file in the root directory (or update existing one)
3. Add the following environment variables:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cv-summary
```

**Note:** The default MongoDB URI is `mongodb://localhost:27017/cv-summary` if not specified in `.env`

## Running the Application

### Development mode (with auto-reload)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Example environment variables
├── .gitignore
├── package.json
├── README.md
└── server.js            # Application entry point
```

## Database Models

### User Model
- Personal information (firstName, lastName, email, password, phone)
- Role-based access (user, admin)
- Authentication fields
- Timestamps (createdAt, updatedAt)

### CV Bank Model
- User association (userId reference)
- Personal information section
- Education history
- Work experience
- Skills (technical, soft, languages)
- Certifications
- Projects
- Public/private visibility settings
- Version tracking
- Timestamps

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/users` - User endpoints
- `GET /api/cv-bank` - CV Bank endpoints

## License

ISC
