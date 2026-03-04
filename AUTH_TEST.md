# Authentication API Testing Guide

## Endpoints

### 1. Signup
`POST /api/users/signup`

### 2. Login
`POST /api/users/login`

### 3. Logout
`POST /api/users/logout`

---

## 1. Signup

### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password123"
}
```

### cURL Command
```bash
curl -X POST http://localhost:8000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "Password123"
  }'
```

### Success Response (201)
```json
{
  "success": true,
  "message": "User created successfully"
}
```

---

## 2. Login

### Request Body
```json
{
  "email": "john.doe@example.com",
  "password": "Password123"
}
```

### cURL Command (with cookies)
```bash
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john.doe@example.com",
    "password": "Password123"
  }'
```

### cURL Command (view response with cookies)
```bash
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john.doe@example.com",
    "password": "Password123"
  }' \
  -v
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "65f1234567890abcdef12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isActive": true
  }
}
```

**Note:** Cookies will be set automatically:
- `accessToken` - Expires in 15 minutes
- `refreshToken` - Expires in 7 days

### Error Responses

#### Invalid Credentials (401)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### Account Deactivated (403)
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact support."
}
```

---

## 3. Logout

### cURL Command (with cookies from login)
```bash
curl -X POST http://localhost:8000/api/users/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Note:** Cookies will be cleared automatically.

---

## Using Postman

### Login
1. **Method**: POST
2. **URL**: `http://localhost:8000/api/users/login`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body** (raw JSON):
   ```json
   {
     "email": "john.doe@example.com",
     "password": "Password123"
   }
   ```
5. After sending, check **Cookies** tab - you should see `accessToken` and `refreshToken`

### Logout
1. **Method**: POST
2. **URL**: `http://localhost:8000/api/users/logout`
3. **Headers**:
   - `Content-Type: application/json`
4. **Note**: Cookies will be automatically sent and cleared

---

## Environment Variables Required

Make sure your `.env` file includes:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cv-summary
ACCESS_SECRET=your-access-token-secret-here
REFRESH_SECRET=your-refresh-token-secret-here
```

---

## Testing Flow

1. **Signup** a new user
2. **Login** with the credentials
   - Verify cookies are set
   - Verify user data is returned
3. **Logout**
   - Verify cookies are cleared
   - Verify success message

---

## Cookie Configuration

- **httpOnly**: true (prevents JavaScript access)
- **secure**: true (HTTPS only in production)
- **sameSite**: 
  - `None` in development (for cross-origin)
  - `strict` in production (same-site only)

**Note**: In development, if using HTTP (not HTTPS), you may need to adjust the `secure` flag in `user.service.js` to `false` for local testing.
