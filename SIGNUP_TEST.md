# Signup API Testing Guide

## Endpoint
`POST /api/users/signup`

## Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password123"
}
```

## cURL Command for Postman/Testing

### Basic Request
```bash
curl -X POST http://localhost:8000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "Password123"
  }'
```

### PowerShell (Windows)
```powershell
curl.exe -X POST http://localhost:8000/api/users/signup `
  -H "Content-Type: application/json" `
  -d '{\"name\": \"John Doe\", \"email\": \"john.doe@example.com\", \"password\": \"Password123\"}'
```

### With prettified output (using jq)
```bash
curl -X POST http://localhost:8000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "Password123"
  }' | jq
```

## Using Postman

1. **Method**: POST
2. **URL**: `http://localhost:8000/api/users/signup`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body** (raw JSON):
   ```json
   {
     "name": "John Doe",
     "email": "john.doe@example.com",
     "password": "Password123"
   }
   ```

## Success Response (201 Created)
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "65f1234567890abcdef12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Error Responses

### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Duplicate Email (409 Conflict)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

## Validation Rules

1. **name**: 
   - Required
   - Minimum 2 characters
   - Only letters and spaces allowed

2. **email**: 
   - Required
   - Must be a valid email format
   - Will be normalized to lowercase

3. **password**: 
   - Required
   - Minimum 6 characters
   - Must contain at least one uppercase letter, one lowercase letter, and one number

## Test Cases

### Valid Request
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "password": "SecurePass123"
}
```

### Invalid Email
```json
{
  "name": "John Doe",
  "email": "invalid-email",
  "password": "Password123"
}
```

### Weak Password
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "12345"
}
```

### Missing Fields
```json
{
  "name": "John Doe"
}
```

## Notes

- The password is automatically hashed using bcrypt before storing in the database
- The email is normalized to lowercase
- The name is split into firstName and lastName (first word = firstName, rest = lastName)
- Password is not included in the response for security
