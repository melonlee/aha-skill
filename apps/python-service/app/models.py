from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


# Claude Skill 结构 (基于 SKILL.md 规范)
class SkillMetadata(BaseModel):
    """SKILL.md YAML frontmatter"""
    name: str = Field(description="Skill name, lowercase with hyphens")
    description: str = Field(description="What the skill does and when to use it")
    allowed_tools: Optional[List[str]] = Field(default=None, alias="allowed-tools")
    model: Optional[str] = None

    class Config:
        populate_by_name = True


class SkillFile(BaseModel):
    """A file in the skill directory"""
    path: str
    content: str


class ClaudeSkill(BaseModel):
    """Complete Claude Skill package"""
    metadata: SkillMetadata
    instructions: str  # Markdown content after frontmatter
    supporting_files: List[SkillFile] = Field(default=[], alias="supportingFiles")  # Additional files like docs, scripts

    class Config:
        populate_by_name = True


# MCP 相关类型
class McpToolDefinition(BaseModel):
    """MCP Server tool definition"""
    name: str
    description: Optional[str] = None
    input_schema: Dict[str, Any] = Field(alias="inputSchema")

    class Config:
        populate_by_name = True


class McpServerConfig(BaseModel):
    """MCP Server configuration"""
    name: str
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    tools: List[McpToolDefinition] = []


# API 请求/响应
class ConvertRequest(BaseModel):
    source_type: Literal["mcp", "rest-api", "openapi"] = Field(alias="sourceType")
    source: Union[str, Dict[str, Any]]
    options: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True


class ConvertResponse(BaseModel):
    success: bool
    skill: Optional[ClaudeSkill] = None
    skill_md: Optional[str] = Field(default=None, alias="skillMd")  # 生成的 SKILL.md 内容
    errors: Optional[List[str]] = None

    class Config:
        populate_by_name = True
