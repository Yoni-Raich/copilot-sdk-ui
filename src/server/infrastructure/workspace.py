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
        """Get all skills from both .claude/skills and .agent/skills directories."""
        skills = []
        skill_dirs = [
            Path(self.current_workspace) / ".claude" / "skills",
            Path(self.current_workspace) / ".agent" / "skills",
        ]
        
        for skills_dir in skill_dirs:
            if not skills_dir.exists():
                continue
            
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

    async def create_skill(self, name: str) -> Skill:
        """Create a new skill with a template SKILL.md file."""
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '', name)
        if not safe_name:
            raise ValueError("Invalid skill name")
        
        skills_dir = Path(self.current_workspace) / ".claude" / "skills"
        skill_dir = skills_dir / safe_name
        
        if skill_dir.exists():
            raise ValueError(f"Skill '{safe_name}' already exists")
        
        try:
            skill_dir.mkdir(parents=True, exist_ok=True)
            skill_path = skill_dir / "SKILL.md"
            
            template = f"""---
name: {safe_name}
description: A custom skill for specialized tasks. Update this description.
---

# {safe_name}

## Overview

Describe what this skill does and when it should be used.

## Usage

Provide examples and instructions for using this skill.

## Commands

List any commands or workflows this skill supports.
"""
            skill_path.write_text(template, encoding="utf-8")
            
            return Skill(
                name=safe_name,
                description="A custom skill for specialized tasks. Update this description.",
                path=str(skill_path),
            )
        except Exception as e:
            raise RuntimeError(f"Failed to create skill: {e}")

    async def import_skill(self, url: str) -> Skill:
        """Import a skill from a URL (GitHub URL or raw URL to SKILL.md)."""
        import urllib.request
        import urllib.error
        import urllib.parse
        
        # Validate URL
        if not url.startswith("http://") and not url.startswith("https://"):
            raise ValueError("URL must start with http:// or https://")
        
        # URL decode any encoded characters (e.g., %2F -> /)
        url = urllib.parse.unquote(url)
        
        # Convert GitHub blob URLs to raw URLs
        # https://github.com/user/repo/blob/branch/path -> https://raw.githubusercontent.com/user/repo/branch/path
        if "github.com" in url and "/blob/" in url:
            url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
        
        # Extract skill name from URL
        # Expected format: .../skills/{skill-name}/SKILL.md or similar
        url_parts = url.rstrip("/").split("/")
        if "SKILL.md" in url_parts[-1]:
            skill_name = url_parts[-2] if len(url_parts) >= 2 else "imported-skill"
        else:
            skill_name = url_parts[-1].replace(".md", "") if url_parts else "imported-skill"
        
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '', skill_name)
        if not safe_name:
            safe_name = "imported-skill"
        
        skills_dir = Path(self.current_workspace) / ".claude" / "skills"
        skill_dir = skills_dir / safe_name
        
        if skill_dir.exists():
            raise ValueError(f"Skill '{safe_name}' already exists")
        
        try:
            # Fetch content from URL
            req = urllib.request.Request(url, headers={"User-Agent": "CopilotSDK/1.0"})
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read().decode("utf-8")
            
            # Validate it looks like a SKILL.md (has frontmatter)
            if not content.strip().startswith("---"):
                raise ValueError("URL does not appear to contain a valid SKILL.md file")
            
            # Create skill directory and file
            skill_dir.mkdir(parents=True, exist_ok=True)
            skill_path = skill_dir / "SKILL.md"
            skill_path.write_text(content, encoding="utf-8")
            
            # Parse the frontmatter to get the name and description
            frontmatter_match = re.match(r"^---\n([\s\S]*?)\n---", content)
            name = safe_name
            description = "Imported skill"
            
            if frontmatter_match:
                frontmatter = frontmatter_match.group(1)
                name_match = re.search(r"name:\s*(.+)", frontmatter)
                desc_match = re.search(r"description:\s*(.+)", frontmatter)
                if name_match:
                    name = name_match.group(1).strip()
                if desc_match:
                    description = desc_match.group(1).strip()
            
            return Skill(
                name=name,
                description=description,
                path=str(skill_path),
            )
        except urllib.error.URLError as e:
            raise RuntimeError(f"Failed to fetch URL: {e}")
        except Exception as e:
            # Clean up on failure
            if skill_dir.exists():
                import shutil
                shutil.rmtree(skill_dir, ignore_errors=True)
            raise RuntimeError(f"Failed to import skill: {e}")

    async def delete_skill(self, name: str) -> bool:
        """Delete a skill by name from .claude/skills directory."""
        import shutil
        
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '', name)
        if not safe_name:
            raise ValueError("Invalid skill name")
        
        # Check both skill directories
        skill_dirs = [
            Path(self.current_workspace) / ".claude" / "skills" / safe_name,
            Path(self.current_workspace) / ".agent" / "skills" / safe_name,
        ]
        
        deleted = False
        for skill_dir in skill_dirs:
            if skill_dir.exists() and skill_dir.is_dir():
                try:
                    shutil.rmtree(skill_dir)
                    deleted = True
                except Exception as e:
                    raise RuntimeError(f"Failed to delete skill: {e}")
        
        if not deleted:
            raise ValueError(f"Skill '{name}' not found")
        
        return True

    async def get_skill_directories(self, workspace: Optional[str] = None) -> List[str]:
        """Get list of skill directories relative to workspace for SDK."""
        dirs = []
        potential_dirs = [".claude/skills", ".agent/skills"]
        target_workspace = workspace or self.current_workspace
        
        for d in potential_dirs:
            full_path = Path(target_workspace) / d
            if full_path.exists() and full_path.is_dir():
                dirs.append(d)
        
        return dirs

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
