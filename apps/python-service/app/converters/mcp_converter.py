import json
import re
from typing import Any, Dict, List, Optional, Union

from app.models import SkillFile
from .base import BaseConverter


class McpConverter(BaseConverter):
    """Convert MCP server configuration to Claude Skill (SKILL.md format)"""

    @property
    def source_type(self) -> str:
        return "mcp"

    def parse(self, source: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Parse MCP server config"""
        if isinstance(source, str):
            data = json.loads(source)
        else:
            data = source

        # Handle both single server and multi-server configs
        if "mcpServers" in data:
            servers = data["mcpServers"]
        elif "tools" in data:
            servers = {"default": data}
        else:
            servers = {"default": data}

        parsed_tools = []
        server_name = None
        server_config = None

        for name, config in servers.items():
            server_name = name
            server_config = config
            tools = config.get("tools", [])
            for tool in tools:
                parsed_tools.append({
                    "server": name,
                    "name": tool.get("name"),
                    "description": tool.get("description", ""),
                    "inputSchema": tool.get("inputSchema", {}),
                })

        return {
            "server_name": server_name or "mcp-server",
            "server_config": server_config or {},
            "tools": parsed_tools,
            "command": server_config.get("command") if server_config else None,
            "args": server_config.get("args") if server_config else None,
        }

    def generate_skill_name(self, schema: Dict[str, Any]) -> str:
        """Generate skill name from server name"""
        name = schema.get("server_name", "mcp-skill")
        # Convert to lowercase, replace non-alphanumeric with hyphens
        name = re.sub(r"[^a-z0-9-]", "-", name.lower())
        name = re.sub(r"-+", "-", name).strip("-")
        return name[:64]  # Max 64 chars

    def generate_description(self, schema: Dict[str, Any]) -> str:
        """Generate description for Claude to match requests"""
        tools = schema.get("tools", [])
        server_name = schema.get("server_name", "MCP server")

        if not tools:
            return "Provides access to {} capabilities.".format(server_name)

        # List tool capabilities
        tool_names = [t["name"] for t in tools[:5]]
        tool_list = ", ".join(tool_names)

        if len(tools) > 5:
            tool_list += " and {} more".format(len(tools) - 5)

        desc = "Use this skill when working with {}. ".format(server_name)
        desc += "Provides tools for: {}.".format(tool_list)

        return desc[:1024]  # Max 1024 chars

    def generate_instructions(self, schema: Dict[str, Any]) -> str:
        """Generate markdown instructions for the skill"""
        tools = schema.get("tools", [])
        server_name = schema.get("server_name", "MCP Server")
        command = schema.get("command")
        args = schema.get("args", [])

        lines = []

        # Title
        lines.append("# {} Skill".format(self._to_title(server_name)))
        lines.append("")

        # Overview
        lines.append("This skill provides access to the {} MCP server.".format(server_name))
        lines.append("")

        # MCP Server info
        if command:
            lines.append("## MCP Server Configuration")
            lines.append("")
            lines.append("```json")
            config = {"command": command}
            if args:
                config["args"] = args
            lines.append(json.dumps(config, indent=2))
            lines.append("```")
            lines.append("")

        # Available Tools
        if tools:
            lines.append("## Available Tools")
            lines.append("")

            for tool in tools:
                lines.append("### `{}`".format(tool["name"]))
                lines.append("")
                if tool.get("description"):
                    lines.append(tool["description"])
                    lines.append("")

                input_schema = tool.get("inputSchema", {})
                if input_schema.get("properties"):
                    lines.append("**Parameters:**")
                    lines.append("")
                    props = input_schema.get("properties", {})
                    required = input_schema.get("required", [])
                    for prop_name, prop_def in props.items():
                        req_marker = " (required)" if prop_name in required else ""
                        prop_type = prop_def.get("type", "any")
                        prop_desc = prop_def.get("description", "")
                        lines.append("- `{}`: {}{} - {}".format(
                            prop_name, prop_type, req_marker, prop_desc
                        ))
                    lines.append("")

        # Usage guidance
        lines.append("## Usage")
        lines.append("")
        lines.append("When a user request matches this skill's capabilities, use the appropriate MCP tool.")
        lines.append("Always explain what you're doing before invoking a tool.")
        lines.append("")

        return "\n".join(lines)

    def generate_allowed_tools(self, schema: Dict[str, Any]) -> Optional[List[str]]:
        """MCP skills typically don't restrict tools"""
        return None

    def generate_supporting_files(self, schema: Dict[str, Any]) -> List[SkillFile]:
        """Generate supporting files with tool schemas"""
        tools = schema.get("tools", [])

        if not tools:
            return []

        # Create a tools reference file
        tools_content = "# Tool Reference\n\n"
        tools_content += "Detailed schema for each tool:\n\n"

        for tool in tools:
            tools_content += "## {}\n\n".format(tool["name"])
            tools_content += "```json\n"
            tools_content += json.dumps(tool.get("inputSchema", {}), indent=2)
            tools_content += "\n```\n\n"

        return [
            SkillFile(path="docs/tools-reference.md", content=tools_content)
        ]

    def _to_title(self, name: str) -> str:
        """Convert to title case"""
        return name.replace("-", " ").replace("_", " ").title()
