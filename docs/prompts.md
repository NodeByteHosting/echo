# Prompt System Documentation

Echo uses a dynamic prompt system based on template files. This document explains how to use and customize these prompts.

## Overview

Echo's prompt system is based on template files with the `.echo` extension (though `.md` and `.txt` are also supported). These files contain structured templates that can include variables, conditionals, and loops, making them highly dynamic and context-aware.

All prompt templates are stored in the `prompts` directory.

## Template Format

Prompt templates use a simple templating language:

### Variables

Variables are defined using double curly braces:

```
Hello, {{userName}}!
```

### Conditionals

Conditional blocks allow for dynamic content based on conditions:

```
{{#if isDM}}
This is a direct message conversation.
{{else}}
This is a conversation in a server.
{{/if}}
```

### Loops

Loops can iterate over arrays of data:

```
{{#each detectedEntities}}
- {{type}}: {{name}}
{{/each}}
```

## Available Templates

| Template Name | Purpose | Core Variables |
|---------------|---------|---------------|
| `default` | Default system prompt | `guildName`, `channelName`, `userName`, `isDM` |
| `dm` | Used for direct messages | `userName` |
| `persona` | For questions about Echo itself | `userName`, `guildName`, `channelName` |
| `entity_mentions` | When users/channels are mentioned | `detectedEntities` |
| `technical` | Technical mode focused on accuracy | `userName`, `guildName`, `channelName` |
| `knowledge_synthesis` | Knowledge base information synthesis | `message`, `userName` |
| `research_synthesis` | Web research synthesis | `message`, `userName` |
| `technical_support` | Technical issue resolution | `message`, `userName`, `guildName`, `channelName` |
| `code_analysis` | Code review and analysis | `message`, `userName` |
| `conversation` | General conversation | `message`, `userName`, `messageStyle`, `messageIntent`, `messageFormat` |
| `context_determination` | Determines required context | `message`, `userName` |

## Core Context Variables

The following variables are available in most templates:

| Variable | Description |
|----------|-------------|
| `message` | The user's message |
| `userName` | Username of the message author |
| `userId` | ID of the message author |
| `guildName` | Name of the Discord server |
| `channelName` | Name of the Discord channel |
| `isDM` | Boolean indicating if this is a direct message |
| `platform` | Platform name (usually "discord") |
| `timestamp` | ISO timestamp of when the message was processed |
| `detectedEntities` | Array of detected entities (users, channels, roles) |
| `messageType` | Type of message being processed |

## Creating Custom Templates

To create a custom template:

1. Create a file with the `.echo` extension in the `prompts` directory
2. Structure your template using markdown for readability
3. Add variables, conditionals, and loops as needed
4. Use the template by referencing its name (without extension)

Example of a custom template (`prompts/greeting.echo`):

```markdown
# Echo - Greeting Mode

## Context
- User: {{userName}}
- Time: {{timestamp}}

## Instructions
Greet the user in a friendly way that matches Echo's personality.
{{#if timeOfDay}}Reference that it's currently {{timeOfDay}}.{{/if}}
```

## Using Templates in Code

The prompt system is managed by the `promptService` module. Here's how to use it:

```javascript
import { promptService } from '../services/prompt.service.js'

// Create context for the prompt
const context = await promptService.createContext(userMessage, {
    userName: user.displayName,
    timeOfDay: 'morning'
})

// Get the processed prompt
const prompt = await promptService.getPromptForContext(context)

// Use the prompt with the AI model
const response = await aiModel.getResponse(userMessage, {
    systemPrompt: prompt
})
```

## Admin Commands

Administrators can manage prompts using the `/system prompts` command:

- `/system prompts list` - List all available prompt templates
- `/system prompts view <name>` - View the content of a specific template
- `/system prompts reload` - Reload all templates from disk (clears cache)

## Best Practices

1. **Structure for Readability**: Use markdown headings and sections to make prompts readable
2. **Be Explicit with Instructions**: Clearly define what you want Echo to do
3. **Keep Core Personality**: Always maintain Echo's distinctive personality traits
4. **Use Variables**: Make templates dynamic by leveraging context variables
5. **Test Variations**: Try different instructions to find what works best
6. **Start with Existing Templates**: Use the default templates as starting points
7. **Version Control**: Keep prompt files in version control for tracking changes

## Example: Custom Agent Prompt

Here's how to create a prompt for a custom agent:

```markdown
# Echo - Custom Agent Mode

## About Echo
Echo is a snarky fox mascot with technical expertise.

## Task Definition
Echo is currently acting as a {{agentType}} to help with {{taskDescription}}.

## Context
- Query: {{message}}
- User: {{userName}}

## Agent Guidelines
- Provide expert assistance in {{domain}}
- Focus on {{priority}} while maintaining Echo's personality
- Include {{format}} in your response when appropriate
- Always {{requirement}} in your answers

Be {{trait1}}, {{trait2}}, and {{trait3}} while helping the user.
```
