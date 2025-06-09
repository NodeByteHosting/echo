# Utility Functions

Echo uses various utility functions to enhance functionality, improve performance, and maintain code quality. This document covers the key utilities available in the codebase.

## Table of Contents

-   [Persona Manager](#persona-manager)
-   [Serialization](#serialization)
-   [Performance Optimization](#performance-optimization)
-   [Permission Management](#permission-management)

## Persona Manager

The Persona Manager (`personaManager.js`) handles Echo's personality and character interactions, particularly for detecting and resolving mentions of known individuals.

### Key Functions

#### `isPersonaQuery(message)`

Determines if a message is asking about Echo's identity or personality.

```javascript
const isAboutEcho = isPersonaQuery('Who are you?') // Returns true
```

#### `mentionsPersonaRelationships(message)`

Checks if a message mentions specific people from Echo's relationships.

```javascript
const mentionsPerson = mentionsPersonaRelationships('What do you think of Pixel?') // Returns true
```

#### `detectAndResolvePeople(message, guild)`

Identifies mentions of known individuals in a message and resolves them to Discord guild members.

```javascript
const peopleDetection = await detectAndResolvePeople('Is Pixel around?', guild)
console.log(peopleDetection.mentions) // Array of detected people with guild member info
```

#### `formatPeopleMentions(detectedPeople, mentionAll)`

Formats detected people as Discord mentions.

```javascript
const mentions = formatPeopleMentions(detectedPeople)
message.reply(`${mentions} has been mentioned`)
```

### Known Individuals

Echo knows about several individuals with special relationships:

| Name        | Role              | Relationship        |
| ----------- | ----------------- | ------------------- |
| Pixel       | Creator           | Deep respect        |
| Exa         | Co-creator        | Deep respect        |
| Connor      | NodeByte Owner    | Deep respect        |
| Harley      | NodeByte Co-owner | Deep respect        |
| Rizon       | Developer         | Fun to roast        |
| Rootspring  | Staff             | Fun to roast        |
| Select      | Staff             | Fun to roast        |
| Ranveersoni | Web Developer     | Fun to roast        |
| Quin        | Purrquinox Mascot | Cross-species rival |

## Serialization

The Serialization utility (`serialization.js`) prevents circular reference errors when handling complex objects.

### Key Functions

#### `makeSerializable(obj, options)`

Creates a safe copy of an object by handling circular references and non-serializable values.

```javascript
// Before sending complex objects to the AI model
const safeObject = makeSerializable(complexObject)
```

#### `safeStringify(obj)`

Safely converts an object to a JSON string.

```javascript
const jsonString = safeStringify(complexObject)
```

#### `safeClone(obj)`

Creates a deep clone of an object without circular references.

```javascript
const clonedObject = safeClone(originalObject)
```

## Performance Optimization

The Performance utilities help optimize Echo's operations.

### Memoization

```javascript
// Memoize expensive operations
const memoizedFunction = memoize(expensiveFunction)
```

### Rate Limiting

Echo implements rate limiting for various operations, particularly for the knowledge base:

```javascript
// Rate limiting configuration
this.rateLimits = {
    creation: {
        window: 3600000, // 1 hour in ms
        maxRequests: 10 // Max 10 entries per hour per user
    }
}
```

## Permission Management

Echo uses a role-based permission system defined in `permissionUtils.js`.

### Role Hierarchy

1. Admin - Full access
2. Developer - Technical access
3. Moderator - Moderation capabilities
4. Support Agent - Support capabilities
5. User - Basic access

### Default Permissions

```javascript
const userPermissions = getDefaultPermissions(Roles.USER)
```

### Permission Validation

```javascript
// Check if a role change is valid
const isValid = validatePermissionChange(oldRole, newRole, performerRole)
```
