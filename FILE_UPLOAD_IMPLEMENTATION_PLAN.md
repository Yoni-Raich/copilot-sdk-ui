# File/Image Upload Feature - Implementation Plan

## Executive Summary
This document outlines the comprehensive plan for adding file and image upload functionality to the chat interface. The feature will allow users to attach files/images to their messages, which will be sent to the Copilot SDK for processing.

---

## 1. Current Architecture Analysis

### 1.1 Client-Side Components
- **Primary Component**: `src/client/components/ChatView.tsx`
  - Lines 594-623: Input area with textarea and send button
  - Line 40: `input` state manages text content
  - Lines 193-210: `handleSubmit` sends messages via WebSocket
  - WebSocket communication: Lines 119-181

- **Type Definitions**: `src/client/types.ts`
  - `Message` interface (lines 11-16): Currently only supports text `content`
  - Will need extension for file attachments

- **Styling**: `src/client/styles/globals.css`
  - Lines 339-370: Input container and chat input styles
  - Lines 372-403: Send button styles
  - Mobile responsive: Lines 898-917

### 1.2 Server-Side Architecture
- **WebSocket Handler**: `src/server/api/routers/chat.py`
  - Lines 10-165: WebSocket endpoint `/ws/chat/{session_id}`
  - Lines 45-62: Message handling (type: "message")
  - Currently only processes text `content` field

- **Data Models**: `src/server/domain/models.py`
  - `Message` class (lines 11-16): Only has `content: str`
  - `WSChatMessage` (lines 179-182): WebSocket message schema

### 1.3 Current Data Flow
```
User Input (textarea) 
  → handleSubmit() 
  → WebSocket.send({ type: "message", content: string }) 
  → Server chat.py receives JSON
  → Creates Message(role="user", content=content)
  → Sends to Copilot SDK
  → Response streams back via WebSocket
```

---

## 2. Proposed Architecture Changes

### 2.1 Component Modifications Required

#### **A. ChatView.tsx** (Primary Changes)
**Location**: `src/client/components/ChatView.tsx`

**New State Variables** (add near line 40):
```typescript
const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
const [uploadPreviews, setUploadPreviews] = useState<Array<{file: File, preview?: string}>>([]);
const [isUploading, setIsUploading] = useState(false);
```

**File Selection Handler** (new function):
```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  
  // Validate files (size, type)
  const validFiles = files.filter(file => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error(`File ${file.name} exceeds 10MB limit`);
      return false;
    }
    return true;
  });
  
  // Generate previews for images
  const newPreviews = validFiles.map(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreviews(prev => [
          ...prev,
          { file, preview: e.target?.result as string }
        ]);
      };
      reader.readAsDataURL(file);
      return { file };
    }
    return { file };
  });
  
  setAttachedFiles(prev => [...prev, ...validFiles]);
};
```

**Updated Submit Handler** (modify existing `handleSubmit` at line 193):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if ((!input.trim() && attachedFiles.length === 0) || isStreaming) return;

  if (!sessionId) {
    onNewChat();
    return;
  }

  if (wsRef.current?.readyState === WebSocket.OPEN) {
    setIsStreaming(true);
    
    // If files are attached, convert to base64 and send
    if (attachedFiles.length > 0) {
      setIsUploading(true);
      
      const filePromises = attachedFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: reader.result, // base64 data URL
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
      
      const filesData = await Promise.all(filePromises);
      
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: input.trim(),
        files: filesData, // NEW: Include files in message
      }));
      
      setIsUploading(false);
      setAttachedFiles([]);
      setUploadPreviews([]);
    } else {
      // Text-only message (existing behavior)
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: input.trim(),
      }));
    }
    
    setInput('');
  }
};
```

**Remove File Handler** (new function):
```typescript
const handleRemoveFile = (index: number) => {
  setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  setUploadPreviews(prev => prev.filter((_, i) => i !== index));
};
```

**UI Changes in JSX** (lines 594-623):

Replace the current input-wrapper with:
```tsx
<div className="input-wrapper">
  {/* File attachment previews - above the input */}
  {uploadPreviews.length > 0 && (
    <div className="file-previews">
      {uploadPreviews.map((item, index) => (
        <div key={index} className="file-preview-item">
          {item.preview ? (
            <img src={item.preview} alt={item.file.name} className="file-preview-image" />
          ) : (
            <div className="file-preview-placeholder">
              <FileIcon size={24} />
              <span className="file-preview-name">{item.file.name}</span>
            </div>
          )}
          <button
            className="file-preview-remove"
            onClick={() => handleRemoveFile(index)}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )}

  <form className="input-form" onSubmit={handleSubmit}>
    {/* Hidden file input */}
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileSelect}
      multiple
      accept="image/*,.pdf,.txt,.doc,.docx,.md"
      style={{ display: 'none' }}
    />
    
    {/* Attachment button */}
    <button
      type="button"
      className="attach-button"
      onClick={() => fileInputRef.current?.click()}
      disabled={isStreaming}
      title="Attach file"
    >
      <Paperclip size={20} />
    </button>

    <textarea
      ref={inputRef}
      className="chat-input"
      placeholder={attachedFiles.length > 0 
        ? `${attachedFiles.length} file(s) attached - add message (optional)` 
        : "Ask anything (type / for commands)"
      }
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleInputFocus}
      rows={1}
      disabled={isStreaming}
    />
    
    {isStreaming ? (
      <button type="button" className="send-button active" onClick={handleCancel}>
        <Square size={16} fill="currentColor" />
      </button>
    ) : (
      <button
        type="submit"
        className={`send-button ${(input.trim() || attachedFiles.length > 0) ? 'active' : ''}`}
        disabled={!input.trim() && attachedFiles.length === 0}
      >
        {isUploading ? <Loader size={16} className="spinning" /> : <Send size={16} />}
      </button>
    )}
  </form>
</div>
```

**New Ref** (add near line 62):
```typescript
const fileInputRef = useRef<HTMLInputElement>(null);
```

**New Imports** (update line 2):
```typescript
import { Send, Square, Menu, Sparkles, ChevronDown, Paperclip, X, FileIcon, Loader } from 'lucide-react';
```

---

#### **B. Type Definitions** 
**Location**: `src/client/types.ts`

**Update Message Interface** (lines 11-16):
```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: FileAttachment[]; // NEW: Optional file attachments
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;      // For displaying/downloading
  data?: string;     // base64 data (when sending)
}
```

---

#### **C. CSS Styling**
**Location**: `src/client/styles/globals.css`

**Add after `.send-button` styles** (~line 403):
```css
/* File Attachment Styles */
.attach-button {
  position: absolute;
  left: 8px;
  bottom: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.attach-button:hover:not(:disabled) {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.attach-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.file-previews {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 12px;
  flex-wrap: wrap;
}

.file-preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
}

.file-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-secondary);
}

.file-preview-name {
  font-size: 10px;
  text-align: center;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.file-preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.file-preview-item:hover .file-preview-remove {
  opacity: 1;
}

.file-preview-remove:hover {
  background-color: var(--error-color);
}

/* Update chat-input padding to accommodate attach button */
.chat-input {
  padding: 14px 52px 14px 48px; /* Left padding increased for attach button */
}

/* Spinning loader animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* File attachments in messages */
.message-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.message-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.message-attachment-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
}

.message-attachment-file {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.message-attachment-file:hover {
  color: var(--accent-color);
}
```

**Mobile responsive updates** (add to mobile section ~line 900):
```css
@media (max-width: 768px) {
  .chat-input {
    padding: 12px 48px 12px 44px; /* Adjust for attach button */
  }
  
  .attach-button {
    left: 4px;
    bottom: 10px;
  }
  
  .file-preview-item {
    width: 60px;
    height: 60px;
  }
}
```

---

### 2.2 Server-Side Modifications Required

#### **A. Python Models**
**Location**: `src/server/domain/models.py`

**Update Message model** (lines 11-16):
```python
class FileAttachment(BaseModel):
    """A file attachment."""
    name: str
    type: str
    size: int
    data: Optional[str] = None  # base64 encoded data
    url: Optional[str] = None   # URL for retrieval

class Message(BaseModel):
    """A chat message."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    files: list[FileAttachment] = Field(default_factory=list)  # NEW
```

**Update WebSocket message** (lines 179-182):
```python
class WSChatMessage(WSMessage):
    """Chat message from client."""
    type: Literal["message"] = "message"
    content: str
    files: Optional[list[dict]] = None  # NEW: Optional file attachments
```

---

#### **B. WebSocket Handler**
**Location**: `src/server/api/routers/chat.py`

**Update message handling** (lines 45-62):
```python
elif msg_type == "message":
    content = data.get("content", "")
    files_data = data.get("files", [])  # NEW: Get files from message
    
    # Process file attachments
    file_attachments = []
    if files_data:
        for file_data in files_data:
            # Store file data or save to disk
            # For now, we'll keep base64 in memory
            file_attachment = FileAttachment(
                name=file_data.get("name"),
                type=file_data.get("type"),
                size=file_data.get("size"),
                data=file_data.get("data"),  # base64 data URL
            )
            file_attachments.append(file_attachment)
    
    # Create user message with files
    user_msg = Message(
        role="user", 
        content=content,
        files=file_attachments  # NEW
    )
    session.messages.append(user_msg)
    
    # Update session name if first message
    if len(session.messages) == 1:
        session.name = content[:50] + ("..." if len(content) > 50 else "")
    
    await session_repo.save(session)
    
    await websocket.send_json({
        "type": "user_message",
        "message": user_msg.model_dump(mode="json"),
    })
    
    # Build prompt with file context
    if file_attachments:
        file_context = "\n\n".join([
            f"[Attached file: {f.name} ({f.type}, {f.size} bytes)]"
            for f in file_attachments
        ])
        enhanced_content = f"{content}\n\n{file_context}"
        
        # For images, include base64 data in prompt (if SDK supports vision)
        # This depends on Copilot SDK's multimodal capabilities
    else:
        enhanced_content = content
    
    # Rest of the existing message handling...
    # (lines 64-141 continue as before, using enhanced_content)
```

---

### 2.3 Message Display Updates

**Location**: `src/client/components/ChatView.tsx`

**Update `renderMessage` function** (lines 421-449):
```typescript
const renderMessage = (message: Message) => (
  <div key={message.id} className="message">
    <div className="message-header">
      <div className={`message-avatar ${message.role}`}>
        {message.role === 'user' ? 'U' : <Sparkles size={14} />}
      </div>
      <span className="message-role">
        {message.role === 'user' ? 'You' : 'Copilot'}
      </span>
    </div>
    <div className="message-content">
      <ReactMarkdown
        components={{
          pre: ({ children }) => <pre>{children}</pre>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
      
      {/* NEW: Render file attachments */}
      {message.files && message.files.length > 0 && (
        <div className="message-attachments">
          {message.files.map((file, index) => (
            <div key={index} className="message-attachment">
              {file.type.startsWith('image/') && file.data ? (
                <img 
                  src={file.data} 
                  alt={file.name}
                  className="message-attachment-image"
                  onClick={() => window.open(file.data, '_blank')}
                />
              ) : (
                <div className="message-attachment-file">
                  <FileIcon size={16} />
                  <span>{file.name}</span>
                  <span className="text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
```

---

## 3. Implementation Phases

### Phase 1: Client-Side UI (No Server Changes)
**Goal**: Add file selection UI and previews without breaking existing functionality

**Tasks**:
1. Add file input and attach button to ChatView
2. Implement file selection handler with validation
3. Create preview components for images/files
4. Add CSS for file previews and attach button
5. Test file selection and preview generation
6. Ensure existing text-only messages still work

**Success Criteria**:
- Users can click attach button and select files
- Image previews display correctly
- Files can be removed from selection
- No regression in text-only messaging

---

### Phase 2: Client-Server Integration
**Goal**: Send files to server and persist in messages

**Tasks**:
1. Update TypeScript types to include files
2. Modify handleSubmit to convert files to base64
3. Update server models (Message, WSChatMessage)
4. Update chat.py to receive and store file data
5. Test file upload through WebSocket
6. Verify files are persisted in session messages

**Success Criteria**:
- Files are successfully sent via WebSocket
- Server stores files with messages
- File metadata is correct (name, type, size)
- Message history includes file attachments

---

### Phase 3: Message Display
**Goal**: Display file attachments in message history

**Tasks**:
1. Update renderMessage to show file attachments
2. Add CSS for message attachment display
3. Implement image viewer (click to expand)
4. Add download functionality for non-image files
5. Test with various file types
6. Ensure responsive design on mobile

**Success Criteria**:
- Images display inline with messages
- Non-image files show as downloadable items
- File size limits are enforced
- Mobile display is functional

---

### Phase 4: Copilot SDK Integration (Optional)
**Goal**: Enable Copilot to process file contents

**Tasks**:
1. Research Copilot SDK multimodal capabilities
2. For images: Send base64 data if vision model available
3. For text files: Extract and include content in prompt
4. For other files: Provide metadata only
5. Test with different file types
6. Handle errors gracefully

**Success Criteria**:
- Copilot can analyze images (if supported)
- Text file contents are included in context
- Unsupported file types are handled gracefully

---

## 4. Edge Cases & Considerations

### 4.1 File Size Limits
- **Client validation**: Max 10MB per file
- **Server validation**: Add additional checks
- **UX**: Show error toast for rejected files

### 4.2 File Type Restrictions
- **Images**: jpg, png, gif, webp, svg
- **Documents**: pdf, txt, md, doc, docx
- **Code**: js, ts, py, etc.
- **Other**: Expandable based on requirements

### 4.3 Multiple Files
- Allow multiple file attachments per message
- Display all files in preview area
- Send as array in WebSocket message

### 4.4 Mobile Considerations
- Ensure file picker works on iOS/Android
- Optimize preview size for small screens
- Handle camera/photo library access

### 4.5 Performance
- Large images: Consider compression before upload
- Preview generation: Use Web Workers if needed
- Memory management: Clear previews after send

### 4.6 Accessibility
- Keyboard navigation for attach button
- Screen reader labels for file previews
- Alt text for images

### 4.7 Security
- Validate file types on both client and server
- Sanitize file names
- Prevent XSS through file content
- Consider file storage location (memory vs. disk vs. cloud)

### 4.8 Data Persistence
- **Option 1**: Store base64 in database (simple but space-intensive)
- **Option 2**: Save files to disk, store paths (recommended)
- **Option 3**: Upload to cloud storage (S3, etc.) for scalability

---

## 5. Testing Strategy

### 5.1 Unit Tests
- File validation logic
- Base64 conversion
- Preview generation
- File removal from selection

### 5.2 Integration Tests
- WebSocket message with files
- Server-side file processing
- Message persistence with attachments

### 5.3 E2E Tests
- Complete upload flow
- Message display with attachments
- Mixed text and file messages
- Mobile file selection

### 5.4 Manual Testing
- Various file types
- Large files (boundary testing)
- Multiple files at once
- Network interruption during upload
- Cross-browser compatibility

---

## 6. Future Enhancements

1. **Drag & Drop**: Add drop zone for file uploads
2. **Paste from Clipboard**: Support Ctrl+V for images
3. **Progress Indicators**: Show upload progress for large files
4. **File Storage**: Migrate to cloud storage for scalability
5. **File History**: Show all files shared in a session
6. **Image Editing**: Basic crop/resize before upload
7. **Voice Messages**: Record and send audio files
8. **Video Support**: Allow video file attachments
9. **File Scanning**: Virus/malware scanning on upload
10. **Compression**: Auto-compress large images

---

## 7. Dependencies & Resources

### 7.1 No New Dependencies Required
- File API (built-in browser API)
- FileReader API (built-in)
- lucide-react (already installed) - for icons

### 7.2 Optional Future Dependencies
- `react-dropzone`: For drag & drop
- `image-compression`: For client-side compression
- `pdfjs-dist`: For PDF previews
- Cloud storage SDK (AWS S3, Google Cloud Storage)

---

## 8. Estimated Effort

- **Phase 1** (UI Only): 4-6 hours
- **Phase 2** (Integration): 4-6 hours
- **Phase 3** (Display): 2-4 hours
- **Phase 4** (SDK Integration): 4-8 hours (depends on SDK capabilities)
- **Testing & Polish**: 4-6 hours

**Total**: 18-30 hours (2-4 days for full implementation)

---

## 9. Summary

This implementation plan provides a structured approach to adding file/image upload functionality to the chat interface. The phased approach ensures:

1. **Minimal Risk**: Each phase can be tested independently
2. **Incremental Value**: UI changes provide immediate user feedback
3. **Flexibility**: Can stop after any phase if requirements change
4. **Maintainability**: Clean separation between UI, data, and business logic

The architecture maintains consistency with the existing codebase patterns:
- React hooks for state management
- WebSocket for real-time communication
- Pydantic models for type safety on server
- CSS classes following existing naming conventions

**Recommended Start**: Begin with Phase 1 to validate UX, then proceed to Phase 2 for full functionality.
