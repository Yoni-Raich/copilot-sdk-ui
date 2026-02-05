# File Upload Feature - Quick Reference

## Component Changes Summary

### ChatView.tsx
```
┌─────────────────────────────────────────────────────────┐
│ ChatView Component                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ NEW STATE:                                               │
│ ✓ attachedFiles: File[]                                 │
│ ✓ uploadPreviews: Array<{file, preview}>                │
│ ✓ isUploading: boolean                                  │
│                                                          │
│ NEW HANDLERS:                                            │
│ ✓ handleFileSelect(e)                                   │
│ ✓ handleRemoveFile(index)                               │
│ ✓ handleSubmit() - MODIFIED to send files               │
│                                                          │
│ NEW UI ELEMENTS:                                         │
│ ✓ <input type="file"> (hidden)                          │
│ ✓ Attach button (Paperclip icon)                        │
│ ✓ File preview area (images + file names)               │
│ ✓ Remove buttons on previews                            │
│                                                          │
│ MODIFIED UI:                                             │
│ ✓ renderMessage() - displays file attachments           │
│ ✓ Send button - enabled when files OR text present      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   User       │
│   Clicks     │
│   Paperclip  │
└──────┬───────┘
       │
       v
┌──────────────────────┐
│ File Input Dialog     │
│ (Browser Native)      │
└──────┬───────────────┘
       │
       v
┌──────────────────────────────┐
│ handleFileSelect()            │
│ • Validate size (<10MB)       │
│ • Validate type               │
│ • Generate previews (images)  │
│ • Update attachedFiles state  │
└──────┬───────────────────────┘
       │
       v
┌──────────────────────────────┐
│ Preview Area Renders          │
│ • Image thumbnails            │
│ • File icons + names          │
│ • Remove buttons              │
└──────┬───────────────────────┘
       │
       v (User types message & clicks Send)
       │
┌──────────────────────────────────────┐
│ handleSubmit()                        │
│ 1. Convert files to base64            │
│ 2. Create file objects array          │
│ 3. Send via WebSocket:                │
│    {                                  │
│      type: "message",                 │
│      content: "text...",              │
│      files: [{                        │
│        name: "...",                   │
│        type: "image/png",             │
│        size: 12345,                   │
│        data: "data:image/png;base64"  │
│      }]                               │
│    }                                  │
│ 4. Clear attachedFiles                │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│ Server (chat.py)                      │
│ • Receives WebSocket message          │
│ • Extracts files array                │
│ • Creates FileAttachment objects      │
│ • Stores in Message.files             │
│ • Saves to session                    │
│ • Sends to Copilot SDK (enhanced)     │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│ Message Display (renderMessage)       │
│ • Shows text content                  │
│ • Renders file attachments:           │
│   - Images: clickable thumbnails      │
│   - Files: icon + name + size         │
└───────────────────────────────────────┘
```

## File Structure Changes

```
src/client/
├── components/
│   └── ChatView.tsx           ← MODIFIED (main changes)
│       • Add file selection logic
│       • Add preview rendering
│       • Update submit handler
│       • Update message renderer
│
├── types.ts                   ← MODIFIED
│   • Add FileAttachment interface
│   • Update Message interface
│
└── styles/
    └── globals.css            ← MODIFIED
        • .attach-button
        • .file-previews
        • .file-preview-item
        • .file-preview-image
        • .file-preview-remove
        • .message-attachments
        • .message-attachment-image
        • Update .chat-input padding

src/server/
├── domain/
│   └── models.py              ← MODIFIED
│       • Add FileAttachment class
│       • Update Message class
│       • Update WSChatMessage class
│
└── api/
    └── routers/
        └── chat.py            ← MODIFIED
            • Handle files in message
            • Create FileAttachment objects
            • Enhanced prompt for Copilot SDK
```

## Key Decision Points

### 1. File Storage Strategy
**Options**:
- [ ] A. Store base64 in database (Simple, but heavy)
- [x] B. Save to disk, store file paths (Recommended for MVP)
- [ ] C. Upload to cloud storage (Best for production)

**Recommendation**: Start with B, migrate to C later.

### 2. File Size Limits
- Client: 10MB max per file
- Server: Same or stricter
- Total per message: Consider 50MB limit

### 3. Supported File Types
**Phase 1**:
- Images: jpg, png, gif, webp
- Documents: pdf, txt, md

**Future**:
- Office docs: doc, docx, xls, xlsx
- Code: all common extensions
- Archives: zip (with scanning)

### 4. Copilot SDK Integration
**Need to research**:
- Does SDK support vision/multimodal?
- How to pass images to SDK?
- File content extraction for text files?

## Implementation Checklist

### Phase 1: UI Only (No Breaking Changes)
- [ ] Add attach button to input area
- [ ] Add hidden file input element
- [ ] Implement handleFileSelect with validation
- [ ] Create file preview components
- [ ] Add CSS for previews and attach button
- [ ] Implement remove file functionality
- [ ] Test file selection (no upload yet)
- [ ] Ensure text-only messages still work

### Phase 2: WebSocket Integration
- [ ] Update TypeScript Message interface
- [ ] Update Python Message model
- [ ] Update Python WSChatMessage model
- [ ] Modify handleSubmit to encode files
- [ ] Update chat.py to receive files
- [ ] Store files with messages
- [ ] Test round-trip (send + retrieve)

### Phase 3: Display in History
- [ ] Update renderMessage function
- [ ] Add image display component
- [ ] Add file download component
- [ ] Style message attachments
- [ ] Test with real messages
- [ ] Mobile responsive testing

### Phase 4: Polish & Edge Cases
- [ ] Error handling (file too large)
- [ ] Loading states during upload
- [ ] Accessibility improvements
- [ ] Security validation
- [ ] Performance optimization
- [ ] Cross-browser testing

## Testing Scenarios

1. **Happy Path**
   - Select 1 image → preview shown → send → displays in history ✓

2. **Multiple Files**
   - Select 3 files → all preview → send → all display ✓

3. **File Too Large**
   - Select 15MB file → error message → not added ✓

4. **Mixed Content**
   - Add file + type text → both send together ✓

5. **File Only**
   - Add file, no text → can still send ✓

6. **Remove File**
   - Add file → click remove → file removed from preview ✓

7. **Unsupported Type**
   - Try to select .exe → rejected or warning ✓

8. **Mobile**
   - Test on phone → file picker works → preview responsive ✓

## API Reference

### WebSocket Message Format (Updated)

```typescript
// CLIENT → SERVER
{
  type: "message",
  content: string,           // Can be empty if files-only
  files?: [                  // Optional array of files
    {
      name: string,
      type: string,          // MIME type
      size: number,          // Bytes
      data: string           // base64 data URL
    }
  ]
}

// SERVER → CLIENT (user_message)
{
  type: "user_message",
  message: {
    id: string,
    role: "user",
    content: string,
    timestamp: string,
    files?: [
      {
        name: string,
        type: string,
        size: number,
        data: string        // For display
      }
    ]
  }
}
```

## Icons Needed (lucide-react)

- `Paperclip` - Attach button
- `X` - Remove file from preview
- `FileIcon` - Generic file icon
- `Loader` - Upload spinner
- `Image` - Image placeholder (optional)
- `Download` - Download file (optional)

All already available in `lucide-react` package.

## Performance Considerations

1. **Large Images**
   - Consider client-side compression
   - Use Web Workers for base64 conversion
   - Thumbnail generation for preview

2. **Multiple Files**
   - Process conversions in parallel
   - Show progress per file
   - Abort capability

3. **Memory Management**
   - Clear previews after send
   - Revoke object URLs
   - Limit concurrent uploads

## Security Checklist

- [ ] Validate file type (client + server)
- [ ] Validate file size (client + server)
- [ ] Sanitize file names
- [ ] Prevent path traversal
- [ ] Content-type verification
- [ ] Rate limiting on uploads
- [ ] Virus scanning (future)
- [ ] CSP headers for file display

---

**Last Updated**: Implementation plan created
**Status**: Ready for Phase 1 implementation
**Owner**: client-architect agent
