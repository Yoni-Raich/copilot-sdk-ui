import os
import re
import subprocess
from pathlib import Path
from typing import List, Optional, Union, Any

from domain.interfaces import WorkspaceService
from domain.models import (
    WorkspaceResponse, WorkspaceUpdate, WorkspaceCreate,
    FileEntry, InstructionsResponse, Skill,
    ReviewResponse, ReviewResult, ReviewSummary
)

DEFAULT_INSTRUCTIONS = """# Copilot Instructions

You are an AI assistant helping with software development in this workspace.

## Guidelines
- Be concise and helpful.
- Follow the coding standards of the project.
- When generating code, include brief explanations.
"""

class FileSystemWorkspaceService(WorkspaceService):
    def __init__(self):
        self.workspaces_root = os.environ.get("COPILOT_WORKSPACES_ROOT", str(Path.home() / "Documents" / "CopilotWorkspaces"))
        if not os.path.exists(self.workspaces_root):
            try:
                os.makedirs(self.workspaces_root, exist_ok=True)
            except Exception:
                self.workspaces_root = os.getcwd()
        self.current_workspace = self.workspaces_root

    def get_current(self) -> str:
        return self.current_workspace

    async def set_current(self, path: str) -> WorkspaceResponse:
        target_path = Path(path)
        if not target_path.is_absolute():
             target_path = Path(self.workspaces_root) / path
             
        if target_path.exists() and target_path.is_dir():
            self.current_workspace = str(target_path.resolve())
            return await self.get_info()
            
        raise ValueError("Directory does not exist")

    async def get_info(self) -> WorkspaceResponse:
        subdirectories = []
        root_path = Path(self.workspaces_root)
        
        if root_path.exists():
            try:
                subdirectories = [
                    d.name for d in root_path.iterdir() 
                    if d.is_dir() and not d.name.startswith('.')
                ]
            except Exception:
                pass
                
        return WorkspaceResponse(
            workspace=self.current_workspace,
            root=self.workspaces_root,
            subdirectories=sorted(subdirectories)
        )

    async def create(self, name: str) -> WorkspaceResponse:
        safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '', name)
        if not safe_name:
            raise ValueError("Invalid workspace name")
            
        new_path = Path(self.workspaces_root) / safe_name
        
        try:
            new_path.mkdir(parents=True, exist_ok=True)
            
            # Create default instructions
            github_dir = new_path / ".github"
            github_dir.mkdir(exist_ok=True)
            instructions_path = github_dir / "copilot-instructions.md"
            instructions_path.write_text(DEFAULT_INSTRUCTIONS, encoding="utf-8")
            
            self.current_workspace = str(new_path.resolve())
            return await self.get_info()
        except Exception as e:
            raise RuntimeError(f"Failed to create workspace: {e}")

    async def list_files(self, path: Optional[str] = None) -> List[FileEntry]:
        dir_path = Path(path or self.current_workspace)
        if not dir_path.exists():
            raise ValueError("Directory not found")
        
        entries = []
        for entry in dir_path.iterdir():
            entries.append(FileEntry(
                name=entry.name,
                type="directory" if entry.is_dir() else "file",
                path=str(entry),
            ))
        return entries

    async def read_file(self, path: str) -> str:
        file_path = Path(path)
        if not file_path.exists():
            raise ValueError("File not found")
        try:
            return file_path.read_text(encoding="utf-8")
        except Exception as e:
            raise RuntimeError(f"Failed to read file: {e}")

    async def write_file(self, path: str, content: str) -> bool:
        file_path = Path(path)
        try:
            file_path.write_text(content, encoding="utf-8")
            return True
        except Exception as e:
            raise RuntimeError(f"Failed to write file: {e}")

    async def get_instructions(self) -> InstructionsResponse:
        instructions_path = Path(self.current_workspace) / ".github" / "copilot-instructions.md"
        content = ""
        
        if instructions_path.exists():
            try:
                content = instructions_path.read_text(encoding="utf-8")
            except Exception:
                pass
                
        return InstructionsResponse(content=content, path=str(instructions_path))

    async def save_instructions(self, content: str) -> InstructionsResponse:
        github_dir = Path(self.current_workspace) / ".github"
        instructions_path = github_dir / "copilot-instructions.md"
        
        try:
            github_dir.mkdir(exist_ok=True)
            instructions_path.write_text(content, encoding="utf-8")
            return InstructionsResponse(content=content, path=str(instructions_path))
        except Exception as e:
            raise RuntimeError(f"Failed to save instructions: {e}")

    async def get_skills(self) -> List[Skill]:
        skills_dir = Path(self.current_workspace) / ".claude" / "skills"
        skills = []
        
        if not skills_dir.exists():
            return skills
        
        for entry in skills_dir.iterdir():
            if entry.is_dir():
                skill_path = entry / "SKILL.md"
                if skill_path.exists():
                    try:
                        content = skill_path.read_text(encoding="utf-8")
                        frontmatter_match = re.match(r"^---\n([\s\S]*?)\n---", content)
                        if frontmatter_match:
                            frontmatter = frontmatter_match.group(1)
                            name_match = re.search(r"name:\s*(.+)", frontmatter)
                            desc_match = re.search(r"description:\s*(.+)", frontmatter)
                            skills.append(Skill(
                                name=name_match.group(1) if name_match else entry.name,
                                description=desc_match.group(1) if desc_match else "No description",
                                path=str(skill_path),
                            ))
                    except Exception:
                        pass
        return skills

    async def run_review(self, workspace: Optional[str] = None) -> ReviewResponse:
        cwd = workspace or self.current_workspace
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=cwd,
                capture_output=True,
                text=True,
                shell=True,
            )
            lines = result.stdout.strip().split("\n") if result.stdout.strip() else []
            
            results = []
            for line in lines:
                if line:
                    status = line[:2]
                    file = line[3:]
                    results.append(ReviewResult(
                        file=file,
                        status="warning" if "M" in status else "ok",
                        issues=[],
                    ))
            
            return ReviewResponse(
                results=results,
                summary=ReviewSummary(
                    total=len(results),
                    warnings=len([r for r in results if r.status == "warning"]),
                    errors=0,
                ),
            )
        except Exception:
            return ReviewResponse(
                results=[],
                summary=ReviewSummary(total=0, warnings=0, errors=0),
            )

    async def execute_command(self, command: str, cwd: Optional[str] = None) -> Any:
        try:
            result = subprocess.run(
                command,
                cwd=cwd or self.current_workspace,
                shell=True,
                capture_output=True,
                text=True,
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except Exception as e:
            raise RuntimeError(str(e))
