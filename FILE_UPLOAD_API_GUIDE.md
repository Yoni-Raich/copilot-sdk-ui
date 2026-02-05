# File Upload API Usage Guide

## API Endpoints

### 1. Upload a File

**Endpoint:** `POST /api/uploads`

**Content-Type:** `multipart/form-data`

**Request:**
```bash
curl -X POST http://localhost:3001/api/uploads \
  -F "file=@/path/to/file.txt" \
  -F "session_id=your-session-id"
```

**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('session_id', sessionId);

const response = await fetch('http://localhost:3001/api/uploads', {
  method: 'POST',
  body: formData
});

const attachment = await response.json();
// attachment.id - use this in WebSocket message
```

**Response:**
```json
{
  "id": "uuid-here",
  "session_id": "your-session-id",
  "filename": "uuid.txt",
  "original_filename": "file.txt",
  "path": "/tmp/uploads/your-session-id/uuid.txt",
  "size": 1234,
  "mime_type": "text/plain",
  "created_at": "2024-02-03T08:00:00Z"
}
```

---

### 2. Send Message with Attachments

**Endpoint:** WebSocket `/ws/chat/{session_id}`

**Message Format:**
```json
{
  "type": "message",
  "content": "Please analyze this file",
  "attachment_ids": ["file-uuid-1", "file-uuid-2"]
}
```

**JavaScript Example:**
```javascript
// After uploading files and getting IDs
const message = {
  type: "message",
  content: userInput,
  attachment_ids: uploadedFileIds  // Array of file IDs from upload
};

websocket.send(JSON.stringify(message));
```

---

### 3. Download a File

**Endpoint:** `GET /api/uploads/{file_id}`

**Request:**
```bash
curl http://localhost:3001/api/uploads/{file-id} \
  -o downloaded-file.txt
```

**JavaScript Example:**
```javascript
const response = await fetch(`http://localhost:3001/api/uploads/${fileId}`);
const blob = await response.blob();
const url = URL.createObjectURL(blob);

// Use for download link or preview
const a = document.createElement('a');
a.href = url;
a.download = 'filename.txt';
a.click();
```

---

### 4. List Session Files

**Endpoint:** `GET /api/uploads?session_id={session_id}`

**Request:**
```bash
curl "http://localhost:3001/api/uploads?session_id=your-session-id"
```

**JavaScript Example:**
```javascript
const response = await fetch(
  `http://localhost:3001/api/uploads?session_id=${sessionId}`
);
const files = await response.json();

console.log(`Session has ${files.length} uploaded files`);
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "session_id": "your-session-id",
    "filename": "uuid-1.txt",
    "original_filename": "document.txt",
    "path": "/tmp/uploads/your-session-id/uuid-1.txt",
    "size": 1234,
    "mime_type": "text/plain",
    "created_at": "2024-02-03T08:00:00Z"
  },
  {
    "id": "uuid-2",
    "session_id": "your-session-id",
    "filename": "uuid-2.png",
    "original_filename": "screenshot.png",
    "path": "/tmp/uploads/your-session-id/uuid-2.png",
    "size": 56789,
    "mime_type": "image/png",
    "created_at": "2024-02-03T08:05:00Z"
  }
]
```

---

### 5. Delete a File

**Endpoint:** `DELETE /api/uploads/{file_id}`

**Request:**
```bash
curl -X DELETE http://localhost:3001/api/uploads/{file-id}
```

**JavaScript Example:**
```javascript
const response = await fetch(`http://localhost:3001/api/uploads/${fileId}`, {
  method: 'DELETE'
});

const result = await response.json();
console.log(result.success); // true
```

**Response:**
```json
{
  "success": true
}
```

---

## Complete Workflow Example

```javascript
// 1. User selects a file
const handleFileSelect = async (file) => {
  // 2. Upload the file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', currentSessionId);
  
  const uploadResponse = await fetch('/api/uploads', {
    method: 'POST',
    body: formData
  });
  
  const attachment = await uploadResponse.json();
  
  // 3. Store the file ID
  setAttachedFileIds(prev => [...prev, attachment.id]);
  
  // 4. Show preview
  setFilePreviews(prev => [...prev, {
    id: attachment.id,
    name: attachment.original_filename,
    size: attachment.size,
    type: attachment.mime_type
  }]);
};

// 5. Send message with attachments
const handleSendMessage = async (content) => {
  const message = {
    type: "message",
    content: content,
    attachment_ids: attachedFileIds
  };
  
  // Send via WebSocket
  websocket.send(JSON.stringify(message));
  
  // Clear attachments
  setAttachedFileIds([]);
  setFilePreviews([]);
};

// 6. Display received message with attachments
const renderMessage = (message) => {
  return (
    <div>
      <div>{message.content}</div>
      {message.attachments?.map(attachment => (
        <div key={attachment.id}>
          <a href={`/api/uploads/${attachment.id}`} download>
            {attachment.original_filename} ({attachment.size} bytes)
          </a>
        </div>
      ))}
    </div>
  );
};
```

---

## Error Handling

### Upload Errors

```javascript
try {
  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Upload failed:', error.detail);
    // Show error to user
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### Common Error Codes

- `400 Bad Request` - Missing file or session_id
- `404 Not Found` - File ID doesn't exist
- `500 Internal Server Error` - Server-side error (e.g., disk full)

---

## File Size Considerations

Current implementation has no hard limits, but recommended:

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_FILE_SIZE) {
  alert('File too large. Maximum size is 10MB.');
  return;
}
```

---

## Security Considerations

For production, implement:

1. **File Type Validation** (client and server)
2. **File Size Limits** (prevent DOS attacks)
3. **Authentication** (verify session ownership)
4. **Rate Limiting** (prevent abuse)
5. **Virus Scanning** (especially for user uploads)

---

## TypeScript Types

```typescript
interface FileAttachment {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments: FileAttachment[];
}

interface UploadResponse {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
}
```
