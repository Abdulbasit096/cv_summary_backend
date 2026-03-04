# CV Upload API Testing Guide

## Endpoint
`POST /api/cv-bank/upload`

**Note:** This endpoint requires authentication (cookies must be set from login)

## Request Format
- **Content-Type**: `multipart/form-data`
- **Field name**: `files` (array of files)
- **Allowed file types**: PDF, DOC, DOCX
- **Max file size**: 10MB per file
- **Max files**: 10 files per request

## cURL Command

### Upload Single File
```bash
curl -X POST http://localhost:8000/api/cv-bank/upload \
  -H "Content-Type: multipart/form-data" \
  -b cookies.txt \
  -F "files=@/path/to/your/cv.pdf"
```

### Upload Multiple Files
```bash
curl -X POST http://localhost:8000/api/cv-bank/upload \
  -H "Content-Type: multipart/form-data" \
  -b cookies.txt \
  -F "files=@/path/to/cv1.pdf" \
  -F "files=@/path/to/cv2.doc" \
  -F "files=@/path/to/cv3.docx"
```

### PowerShell (Windows) - Single File
```powershell
$cookieContent = Get-Content cookies.txt -Raw
$headers = @{
    'Content-Type' = 'multipart/form-data'
    'Cookie' = $cookieContent
}
Invoke-RestMethod -Uri 'http://localhost:8000/api/cv-bank/upload' -Method Post -InFile 'C:\path\to\cv.pdf' -Headers $headers
```

## Using Postman

1. **Method**: POST
2. **URL**: `http://localhost:8000/api/cv-bank/upload`
3. **Headers**: 
   - Cookies will be automatically sent (make sure you're logged in first)
4. **Body**: 
   - Select `form-data`
   - Key: `files` (change type to "File" for each)
   - Value: Select your PDF/DOC/DOCX file
   - You can add multiple `files` entries

### Postman Steps:
1. Set method to POST
2. Enter URL: `http://localhost:8000/api/cv-bank/upload`
3. Go to "Body" tab
4. Select "form-data"
5. Add key `files`, change type to "File", select your file
6. Add more `files` entries if uploading multiple files
7. Send request

## Success Response (201 Created)
```json
{
  "success": true,
  "message": "3 CV file(s) uploaded successfully",
  "data": {
    "uploaded": [
      {
        "id": "65f1234567890abcdef12345",
        "path": "userId123/cv-name-1234567890.pdf",
        "originalName": "MyCV.pdf",
        "fileSize": 245678,
        "summary": ""
      },
      {
        "id": "65f1234567890abcdef12346",
        "path": "userId123/cv-resume-1234567891.doc",
        "originalName": "Resume.doc",
        "fileSize": 189234,
        "summary": ""
      }
    ],
    "total": 3
  }
}
```

## Error Responses

### No Files (400)
```json
{
  "success": false,
  "message": "No files uploaded"
}
```

### Invalid File Type (400)
```json
{
  "success": false,
  "message": "Invalid file type. Only PDF and DOC/DOCX files are allowed."
}
```

### File Too Large (400)
```json
{
  "success": false,
  "message": "File too large"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

## File Storage Structure

Files are stored in the `uploads` folder with the following structure:
```
uploads/
  ├── userId1/
  │   ├── cv-name-1234567890.pdf
  │   ├── resume-1234567891.doc
  │   └── ...
  ├── userId2/
  │   ├── cv-1234567892.pdf
  │   └── ...
```

Each user has their own subdirectory based on their user ID.

## Database Schema

Each uploaded CV creates a record with:
- `_id`: Unique CV ID
- `userId`: Reference to User
- `path`: Relative path from uploads folder
- `summary`: Empty string for now
- `originalName`: Original filename
- `mimeType`: File MIME type
- `fileSize`: File size in bytes
- `isActive`: Boolean (default: true)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## Other CV Bank Endpoints

### Get All CVs
`GET /api/cv-bank`
- Returns all active CVs for the authenticated user

### Get CV by ID
`GET /api/cv-bank/:id`
- Returns a specific CV by ID (must belong to authenticated user)

### Delete CV
`DELETE /api/cv-bank/:id`
- Soft deletes a CV (sets isActive to false)
- Also deletes the physical file

## Testing Flow

1. **Login** first to get authentication cookies:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -d '{"email":"user@example.com","password":"Password123"}'
   ```

2. **Upload CV files** using the cookies:
   ```bash
   curl -X POST http://localhost:8000/api/cv-bank/upload \
     -b cookies.txt \
     -F "files=@cv.pdf"
   ```

3. **Get all CVs**:
   ```bash
   curl -X GET http://localhost:8000/api/cv-bank \
     -b cookies.txt
   ```
