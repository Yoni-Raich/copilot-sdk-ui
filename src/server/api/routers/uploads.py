import os
import uuid
import mimetypes
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from domain.interfaces import FileAttachmentRepository
from domain.models import FileAttachment
from api.deps import get_file_attachment_repo

router = APIRouter()

# Base directory for uploads
UPLOAD_BASE_DIR = "/tmp/uploads"

@router.post("/api/uploads", response_model=FileAttachment)
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    repo: FileAttachmentRepository = Depends(get_file_attachment_repo)
):
    """Upload a file for a session."""
    # Create session directory if it doesn't exist
    session_dir = os.path.join(UPLOAD_BASE_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    # Generate unique filename to avoid conflicts
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{file_id}{file_ext}"
    file_path = os.path.join(session_dir, unique_filename)
    
    # Save the file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_size = len(content)
        
        # Determine MIME type
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        
        # Create FileAttachment object
        attachment = FileAttachment(
            id=file_id,
            session_id=session_id,
            filename=unique_filename,
            original_filename=file.filename or unique_filename,
            path=file_path,
            size=file_size,
            mime_type=mime_type
        )
        
        # Save to repository
        await repo.save(attachment)
        
        return attachment
    except Exception as e:
        # Clean up file if it was created
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/api/uploads/{file_id}")
async def download_file(
    file_id: str,
    repo: FileAttachmentRepository = Depends(get_file_attachment_repo)
):
    """Download a file by ID."""
    attachment = await repo.get(file_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.exists(attachment.path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=attachment.path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type
    )

@router.delete("/api/uploads/{file_id}")
async def delete_file(
    file_id: str,
    repo: FileAttachmentRepository = Depends(get_file_attachment_repo)
):
    """Delete a file by ID."""
    success = await repo.delete(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"success": True}

@router.get("/api/uploads", response_model=List[FileAttachment])
async def list_session_files(
    session_id: str,
    repo: FileAttachmentRepository = Depends(get_file_attachment_repo)
):
    """List all files for a session."""
    return await repo.list_by_session(session_id)
