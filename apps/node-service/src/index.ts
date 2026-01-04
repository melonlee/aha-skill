import express from 'express';
import cors from 'cors';
import { RestApiConverter, OpenApiConverter } from './converters';
import { ConvertRequest, ConvertResponse, ClaudeSkill } from './types';

const app = express();
const port = process.env.PORT || 8001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const restConverter = new RestApiConverter();
const openApiConverter = new OpenApiConverter();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'node-service' });
});

// REST API conversion
app.post('/convert/rest', (req, res) => {
  try {
    const request = req.body as ConvertRequest;

    if (request.sourceType !== 'rest-api') {
      res.status(400).json({
        success: false,
        errors: ['This endpoint only handles REST API conversions'],
      } as ConvertResponse);
      return;
    }

    const skill = restConverter.convert(request.source, request.options);
    const skillMd = restConverter.toSkillMd(skill);

    res.json({
      success: true,
      skill,
      skillMd,
    } as ConvertResponse);
  } catch (error) {
    res.json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    } as ConvertResponse);
  }
});

// OpenAPI conversion
app.post('/convert/openapi', (req, res) => {
  try {
    const request = req.body as ConvertRequest;

    if (request.sourceType !== 'openapi') {
      res.status(400).json({
        success: false,
        errors: ['This endpoint only handles OpenAPI conversions'],
      } as ConvertResponse);
      return;
    }

    const skill = openApiConverter.convert(request.source, request.options);
    const skillMd = openApiConverter.toSkillMd(skill);

    res.json({
      success: true,
      skill,
      skillMd,
    } as ConvertResponse);
  } catch (error) {
    res.json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    } as ConvertResponse);
  }
});

// Package skill for download
app.post('/skill/package', (req, res) => {
  try {
    const { skill, skillMd } = req.body as { skill: ClaudeSkill; skillMd: string };

    const skillName = skill.metadata.name;

    // Generate directory structure
    const files: Record<string, string> = {
      [`${skillName}/SKILL.md`]: skillMd,
    };

    // Add supporting files
    if (skill.supportingFiles) {
      for (const file of skill.supportingFiles) {
        files[`${skillName}/${file.path}`] = file.content;
      }
    }

    res.json({
      success: true,
      files,
      installPath: `.claude/skills/${skillName}/`,
      instructions: `To install this skill:\n1. Copy the ${skillName}/ folder to .claude/skills/ in your project\n2. Or copy to ~/.claude/skills/ for personal use\n3. Restart Claude Code`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    });
  }
});

app.listen(port, () => {
  console.log(`Node service running on port ${port}`);
});
