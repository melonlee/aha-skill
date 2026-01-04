from typing import Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ConvertRequest, ConvertResponse, ClaudeSkill
from app.converters import McpConverter

app = FastAPI(
    title="Skill Python Service",
    description="Convert MCP servers to Claude Skills (SKILL.md format)",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mcp_converter = McpConverter()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "python-service"}


@app.post("/convert/mcp")
async def convert_mcp(request: ConvertRequest):
    """Convert MCP server config to Claude Skill (SKILL.md format)"""
    try:
        if request.source_type != "mcp":
            raise HTTPException(400, "This endpoint only handles MCP conversions")

        skill = mcp_converter.convert(request.source, request.options)
        skill_md = mcp_converter.to_skill_md(skill)

        response = ConvertResponse(
            success=True,
            skill=skill,
            skill_md=skill_md,
        )
        return response.model_dump(by_alias=True)

    except Exception as e:
        response = ConvertResponse(success=False, errors=[str(e)])
        return response.model_dump(by_alias=True)


@app.post("/skill/validate")
async def validate_skill(skill_md: str):
    """Validate a SKILL.md file"""
    errors = []

    # Check frontmatter
    if not skill_md.startswith("---"):
        errors.append("SKILL.md must start with --- (YAML frontmatter)")

    lines = skill_md.split("\n")

    # Find frontmatter end
    frontmatter_end = -1
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            frontmatter_end = i
            break

    if frontmatter_end == -1:
        errors.append("Missing closing --- for YAML frontmatter")
    else:
        # Parse frontmatter
        frontmatter = "\n".join(lines[1:frontmatter_end])

        if "name:" not in frontmatter:
            errors.append("Missing required field: name")
        if "description:" not in frontmatter:
            errors.append("Missing required field: description")

        # Check name format
        for line in frontmatter.split("\n"):
            if line.startswith("name:"):
                name = line.split(":", 1)[1].strip()
                if not re.match(r"^[a-z0-9-]+$", name):
                    errors.append("name must be lowercase letters, numbers, and hyphens only")
                if len(name) > 64:
                    errors.append("name must be 64 characters or less")

            if line.startswith("description:"):
                desc = line.split(":", 1)[1].strip()
                if len(desc) > 1024:
                    errors.append("description must be 1024 characters or less")

    return {
        "valid": len(errors) == 0,
        "errors": errors if errors else None,
    }


@app.post("/skill/package")
async def package_skill(skill_md: str, skill_name: str):
    """Generate skill directory structure"""
    files = {
        "{}/SKILL.md".format(skill_name): skill_md,
    }

    return {
        "success": True,
        "files": files,
        "install_path": ".claude/skills/{}/".format(skill_name),
    }


import re
