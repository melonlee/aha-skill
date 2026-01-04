from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union

from app.models import ClaudeSkill, SkillMetadata, SkillFile


class BaseConverter(ABC):
    """Base class for skill converters - converts to Claude SKILL.md format"""

    @abstractmethod
    def parse(self, source: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Parse source definition into intermediate schema"""
        pass

    @abstractmethod
    def generate_skill_name(self, schema: Dict[str, Any]) -> str:
        """Generate skill name (lowercase, hyphens only)"""
        pass

    @abstractmethod
    def generate_description(self, schema: Dict[str, Any]) -> str:
        """Generate skill description for Claude to match requests"""
        pass

    @abstractmethod
    def generate_instructions(self, schema: Dict[str, Any]) -> str:
        """Generate markdown instructions for the skill"""
        pass

    def generate_allowed_tools(self, schema: Dict[str, Any]) -> Optional[List[str]]:
        """Generate allowed-tools list (optional)"""
        return None

    def generate_supporting_files(self, schema: Dict[str, Any]) -> List[SkillFile]:
        """Generate supporting files (optional)"""
        return []

    def convert(self, source: Union[str, Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> ClaudeSkill:
        """Convert source to Claude Skill"""
        schema = self.parse(source)

        metadata = SkillMetadata(
            name=self.generate_skill_name(schema),
            description=self.generate_description(schema),
            **{"allowed-tools": self.generate_allowed_tools(schema)}
        )

        instructions = self.generate_instructions(schema)
        supporting_files = self.generate_supporting_files(schema)

        return ClaudeSkill(
            metadata=metadata,
            instructions=instructions,
            supporting_files=supporting_files,
        )

    def to_skill_md(self, skill: ClaudeSkill) -> str:
        """Generate SKILL.md file content"""
        lines = ["---"]
        lines.append("name: {}".format(skill.metadata.name))
        lines.append("description: {}".format(skill.metadata.description))

        if skill.metadata.allowed_tools:
            lines.append("allowed-tools:")
            for tool in skill.metadata.allowed_tools:
                lines.append("  - {}".format(tool))

        if skill.metadata.model:
            lines.append("model: {}".format(skill.metadata.model))

        lines.append("---")
        lines.append("")
        lines.append(skill.instructions)

        return "\n".join(lines)

    @property
    @abstractmethod
    def source_type(self) -> str:
        pass
