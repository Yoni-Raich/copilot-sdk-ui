# Client-Side File Upload Implementation

## Overview
This document describes the client-side implementation of file upload support in the Copilot SDK UI.

## Architecture

### Type Definitions (`src/client/types.ts`)

#### FileAttachment Interface
```typescript
export interface FileAttachment {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  path: string;
  size: number;
  mime_type: string;
}
```

#### Updated Message Interface
```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];  // NEW
}
```

## Component Changes (`src/client/components/ChatView.tsx`)

### New State Variables
- `pendingAttachments: FileAttachment[]` - Stores files selected but not yet sent
- `isUploading: boolean` - Indicates upload in progress

### New Refs
- `fileInputRef: HTMLInputElement` - Reference to hidden file input element

### Key Functions

#### `handleFileUpload(e: React.ChangeEvent<HTMLInputElement>)`
- Handles file selection from the file input
- Uploads each file to `/api/uploads` via POST with FormData
- Stores returned `FileAttachment` objects in `pendingAttachments`
- Shows error notification on failure (console.error currently)

#### `handleRemoveAttachment(attachmentId: string)`
- Removes an attachment from `pendingAttachments` before sending

#### `handleAttachClick()`
- Triggers the hidden file input click

#### `formatFileSize(bytes: number): string`
- Formats file size for display (B, KB, MB)

#### `isImageFile(mimeType: string): boolean`
- Determines if a file is an image for rendering

### Updated Functions

#### `handleSubmit()` and `handleKeyDown()`
Both now include:
```typescript
const attachmentIds = pendingAttachments.map(att => att.id);
wsRef.current.send(JSON.stringify({
  type: 'message',
  content: input.trim(),
  attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
}));
setPendingAttachments([]); // Clear after sending
```

#### `renderMessage(message: Message)`
Enhanced to display attachments:
- **Images**: Rendered as `<img>` tags with captions
- **Files**: Rendered as download links with file icon and size

## UI Components

### 1. Hidden File Input
```tsx
<input
  ref={fileInputRef}
  type="file"
  multiple
  onChange={handleFileUpload}
  style={{ display: 'none' }}
  accept="*/*"
/>
```

### 2. Attach Button
- Located to the left of the chat input
- Uses Paperclip icon from lucide-react
- Disabled when streaming or uploading
- Triggers file selection dialog

### 3. Attachments Preview Area
- Displays above the input area when `pendingAttachments.length > 0`
- Shows thumbnails for images or file icons for other types
- Each chip includes:
  - Thumbnail/icon
  - Filename
  - File size
  - Remove button (X icon)

### 4. Message Attachments Display
- **Images**:
  - Full image display (max-width: 400px)
  - Caption with filename
  - Fetched from `/api/uploads/{id}`
  
- **Files**:
  - Clickable download link
  - File icon
  - Filename
  - File size
  - Download icon

## Styling (`src/client/styles/globals.css`)

### Key CSS Classes

#### Attach Button
- `.attach-button` - Circular button with hover effects

#### Preview Area
- `.attachments-preview` - Container for pending attachments
- `.attachment-chip` - Individual attachment card
- `.attachment-thumbnail` - Image preview (40x40px)
- `.attachment-icon` - File icon container
- `.attachment-info` - Filename and size text
- `.attachment-remove` - Remove button with hover effect

#### Message Attachments
- `.message-attachments` - Container for attachments in messages
- `.attachment-image-wrapper` - Image display wrapper
- `.attachment-image` - Image styling (rounded corners, border)
- `.attachment-image-caption` - Filename caption
- `.attachment-file-link` - File download link styling

### Layout Updates
- Updated `.input-wrapper` to use flexbox for attach button + input + send button
- Updated `.input-container` padding to accommodate preview area

## API Integration

### Upload Endpoint
- **URL**: `/api/uploads`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**:
  - `file`: File object
  - `session_id`: Current session ID
- **Response**: `FileAttachment` object

### Fetch Endpoint
- **URL**: `/api/uploads/{id}`
- **Method**: GET
- **Response**: File content with appropriate MIME type

## WebSocket Protocol Updates

### Message with Attachments
```json
{
  "type": "message",
  "content": "User message text",
  "attachment_ids": ["uuid-1", "uuid-2"]
}
```

## User Flow

1. User clicks Paperclip button
2. File picker opens
3. User selects one or more files
4. Files upload to `/api/uploads` (progress shown via `isUploading`)
5. Uploaded files appear in preview area above input
6. User can remove attachments before sending
7. User types message and clicks Send
8. Message sent with `attachment_ids` in payload
9. Pending attachments cleared
10. Message appears in history with attachments displayed

## Error Handling

- Upload failures logged to console (TODO: user notification)
- File input reset after upload completion
- Disabled state prevents multiple simultaneous uploads

## Accessibility

- Attach button has `aria-label="Attach files"`
- Remove buttons have `aria-label="Remove attachment"`
- Images have `alt` text with filename
- Keyboard navigation supported

## Browser Compatibility

- Uses standard HTML5 file input
- FormData API for uploads
- Flexbox for layout
- CSS Grid not required
- Compatible with all modern browsers

## Future Enhancements

- [ ] Upload progress indicator
- [ ] Drag-and-drop file upload
- [ ] File type restrictions/validation
- [ ] Maximum file size limits
- [ ] Image preview before upload
- [ ] Batch delete attachments
- [ ] Attachment re-ordering
- [ ] User-facing error notifications
- [ ] Retry failed uploads
- [ ] Cancel ongoing uploads

## Testing Checklist

- [x] TypeScript compilation passes
- [x] No console errors on page load
- [x] Attach button appears in input area
- [ ] File picker opens on button click
- [ ] Files upload successfully
- [ ] Preview area shows uploaded files
- [ ] Remove button deletes attachments
- [ ] Messages send with attachment_ids
- [ ] Attachments display in message history
- [ ] Images load and display correctly
- [ ] File downloads work correctly
- [ ] Multiple files can be attached
- [ ] Works with different file types
