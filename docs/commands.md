# Commands Reference

Echo provides various commands for administration, moderation, and user interaction. This document covers all available commands and their usage.

## Administrative Commands

### Configuration (`/config`)
Manage bot configuration settings:
- `view` - View current configuration
- `edit` - Modify configuration settings
- `reset` - Reset to default settings

### Knowledge Base (`/kb`)
Manage AI knowledge base:
- `add` - Add new training data
- `remove` - Remove existing entries
- `list` - View all entries
- `search` - Search knowledge base

## Moderation Commands

### User Management
- `/ban` - Ban users with reason
- `/kick` - Remove users from server
- `/mute` - Temporarily mute users
- `/warn` - Issue warnings to users

### Server Management
- `/clean` - Bulk message deletion
- `/lockdown` - Restrict channel access
- `/slowmode` - Set channel slowmode

## Support System

### Ticket Management
- `/ticket create` - Create support ticket
- `/ticket close` - Close active ticket
- `/ticket assign` - Assign ticket to staff

### Help Commands
- `/help` - Display command help
- `/info` - Show bot information
- `/status` - Check bot status

## Command Permissions

Commands are categorized by required permissions:
- Administrator commands require admin privileges
- Moderation commands require mod role
- Support commands available to support staff
- Basic commands accessible to all users

## Custom Commands

Server administrators can create custom commands through:
1. Knowledge base entries
2. Command aliases
3. Auto-responses

## Error Handling

Commands include proper error handling:
- Permission checks
- Input validation
- Rate limiting
- Error messages

## Best Practices

1. Use command cooldowns for rate limiting
2. Implement proper permission checks
3. Provide clear error messages
4. Log command usage for auditing
5. Keep command responses concise
