/**
 * Utility for managing the AI's persona and responding according to character
 */
import { promptService } from '../echo-ai/services/prompt.service.js'

/**
 * Check if a message might be asking about the AI's persona or identity
 * @param {string} message - The user's message
 * @returns {boolean} Whether the message is likely asking about the AI
 */
export function isPersonaQuery(message) {
    if (!message) {
        return false
    }

    const normalizedMessage = message.toLowerCase()

    // Check for direct questions about identity
    const identityPatterns = [
        'who are you',
        'what are you',
        'tell me about yourself',
        'your name',
        'who is echo',
        'what is echo',
        'are you',
        'do you know',
        'can you tell me about',
        'your personality',
        'your character',
        'fox',
        'mascot'
    ]

    // Check for questions about preferences or relationships
    const preferencePatterns = [
        'do you like',
        'what do you think of',
        'how do you feel about',
        'your favorite',
        'you listen to',
        'you know',
        'opinion on'
    ]

    // Check if message contains any identity patterns
    for (const pattern of identityPatterns) {
        if (normalizedMessage.includes(pattern)) {
            return true
        }
    }

    // Check if message contains any preference patterns
    for (const pattern of preferencePatterns) {
        if (normalizedMessage.includes(pattern)) {
            return true
        }
    }

    return false
}

/**
 * Check if a message contains references to specific people mentioned in the persona
 * @param {string} message - The user's message
 * @returns {boolean} Whether the message mentions specific people
 */
export function mentionsPersonaRelationships(message) {
    if (!message) {
        return false
    }

    const normalizedMessage = message.toLowerCase()

    // Get all known individual aliases for checking
    const allAliases = Object.values(KNOWN_INDIVIDUALS).flatMap(person => person.aliases)

    // Check if any alias is mentioned in the message
    return allAliases.some(alias => normalizedMessage.includes(alias.toLowerCase()))
}

/**
 * Create a specialized system prompt for persona-focused queries
 * @param {string} message - The user's message
 * @returns {Promise<string>} A specialized system prompt
 */
export async function createPersonaPrompt(message) {
    try {
        const promptContext = await promptService.createContext(message, {
            messageType: 'core',
            message: message
        })
        return await promptService.getPromptForContext(promptContext)
    } catch (err) {
        console.error('Error loading core persona prompt:', err)
        return `You are Echo, NodeByte's fox mascot. Respond in character, referencing your core personality, relationships, and context.`
    }
}

/**
 * Map of known individuals and their Discord IDs
 * This is used to find and mention people Echo knows about
 */
export const KNOWN_INDIVIDUALS = {
    pixel: {
        id: '510065483693817867',
        aliases: ['codemeapixel', 'pixel', 'toxic', 'therealtoxicdev', 'toxic dev', 'pixelated']
    },
    exa: { id: '896951964234043413', aliases: ['callmeabyte', 'exa', 'byte', 'elixir'] },
    connor: { id: '324646179134636043', aliases: ['connor200024', 'connor'] },
    harley: { id: '251736315001831425', aliases: ['harley200317', 'harley'] },
    rizon: { id: '303278996932526084', aliases: ['rizonftw_', 'rizon'] },
    rootspring: { id: '728871946456137770', aliases: ['rootspring', 'burgerking', 'root', 'frostpaw'] },
    select: { id: '564164277251080208', aliases: ['select', 'selectdev'] },
    ranveersoni: { id: '787241442770419722', aliases: ['ranveersoni98', 'ranveer', 'ranveersoni', 'ran'] },
    quin: { id: '1377261230968016967', aliases: ['heypurrquinox', 'quin', 'purrquinox'] }
}

/**
 * Loads relationship data from a JSON file or API
 * @param {string} source - Path to JSON file or API endpoint
 * @returns {Promise<Object>} Updated relationships data
 */
export async function loadRelationshipData(source) {
    try {
        // If source is a local file
        if (source.startsWith('file://')) {
            const filePath = source.replace('file://', '')
            const fs = await import('fs/promises')
            const data = await fs.readFile(filePath, 'utf8')
            return JSON.parse(data)
        }

        // If source is a URL
        if (source.startsWith('http')) {
            const response = await fetch(source)
            return await response.json()
        }

        console.log('Invalid source format for relationship data')
        return null
    } catch (error) {
        console.error('Error loading relationship data:', error)
        return null
    }
}

/**
 * Check if a message mentions known individuals and attempts to resolve them
 * @param {string} message - The message to check
 * @param {Object} guild - The Discord guild where the message was sent
 * @param {Object} options - Additional options
 * @returns {Object} Object containing detections and resolved IDs
 */
export async function detectAndResolvePeople(message, guild, options = {}) {
    if (!message) {
        return { detected: false, mentions: [] }
    }

    console.log(`🦊 personaManager: Checking message for known individuals: "${message}"`)

    const lowercaseMsg = message.toLowerCase()
    const detectedPeople = []

    // First pass: Enhanced detection for direct questions about people
    // Detect patterns like "What do you think of X" or "Tell me about Y"
    const directPatterns = [
        /what\s+(?:do\s+you\s+(?:think|know|feel|like))\s+(?:about|of)\s+(\w+)/i,
        /tell\s+me\s+about\s+(\w+)/i,
        /who\s+is\s+(\w+)/i,
        /(?:thoughts|opinion|opinions)\s+(?:about|on)\s+(\w+)/i,
        /how\s+(?:do\s+you\s+feel|are\s+you)\s+(?:about|with)\s+(\w+)/i
    ]

    // Check all direct question patterns
    for (const pattern of directPatterns) {
        const match = lowercaseMsg.match(pattern)
        if (match && match[1]) {
            const possibleName = match[1].toLowerCase()
            console.log(`🦊 personaManager: Found direct question about: "${possibleName}"`)

            // Check if this matches a known individual
            for (const [key, person] of Object.entries(KNOWN_INDIVIDUALS)) {
                if (
                    person.aliases.some(
                        alias =>
                            possibleName === alias.toLowerCase() ||
                            alias.toLowerCase().includes(possibleName) ||
                            possibleName.includes(alias.toLowerCase())
                    )
                ) {
                    console.log(`🦊 personaManager: Matched to known person: ${key}`)
                    detectedPeople.push({
                        key,
                        name: key,
                        knownId: person.id,
                        resolvedId: null,
                        foundInGuild: false,
                        isDirect: true // Mark as direct question
                    })
                    break
                }
            }
        }
    }

    // Second pass: Simple name detection for all known individuals
    if (detectedPeople.length === 0) {
        for (const [key, person] of Object.entries(KNOWN_INDIVIDUALS)) {
            for (const alias of person.aliases) {
                // More flexible detection - check for mentions with various boundaries
                // This will catch mentions even in the middle of sentences
                const regex = new RegExp(`\\b${alias}\\b|\\s${alias}[^\\w]|[^\\w]${alias}\\s`, 'i')
                if (regex.test(lowercaseMsg)) {
                    console.log(`🦊 personaManager: Found mention of: ${key} (${alias})`)
                    detectedPeople.push({
                        key,
                        name: key,
                        type: 'user',
                        knownId: person.id,
                        resolvedId: null,
                        foundInGuild: false,
                        isDirect: false
                    })
                    break // Found one alias, no need to check others for this person
                }
            }
        }
    }

    // New: Check for channel mentions
    const channelMentions = detectChannelMentions(message, guild)
    detectedPeople.push(...channelMentions)

    // New: Check for role mentions
    const roleMentions = await detectRoleMentions(message, guild)
    detectedPeople.push(...roleMentions)

    // Third pass: Try to resolve the people in the current guild
    if (detectedPeople.length > 0 && guild) {
        console.log(`🦊 personaManager: Found ${detectedPeople.length} entities to resolve in guild`)

        try {
            // For each detected entity, try to find them in the guild
            for (const entity of detectedPeople) {
                // Skip resolution for non-user types that are already resolved
                if (entity.type !== 'user' && entity.resolvedId) {
                    continue
                }

                try {
                    // For users, use existing resolution logic
                    if (entity.type === 'user') {
                        await resolveUserInGuild(entity, guild)
                    }
                } catch (err) {
                    console.error(`🦊 personaManager: Error resolving ${entity.type} for ${entity.name}:`, err)
                }
            }
        } catch (err) {
            console.error('🦊 personaManager: Error in guild entity resolution:', err)
        }
    }

    // Always ping if we successfully resolved someone in the guild
    const foundEntities = detectedPeople.filter(p => p.foundInGuild || p.resolvedId)
    if (foundEntities.length > 0) {
        console.log(`🦊 personaManager: Successfully resolved ${foundEntities.length} entities in guild!`)
        for (const entity of foundEntities) {
            console.log(
                `🦊 personaManager: - ${entity.type}: ${entity.name} (${entity.resolvedId}), isDirect: ${entity.isDirect || false}`
            )
        }
    } else if (detectedPeople.length > 0) {
        console.log(`🦊 personaManager: Detected entities but couldn't resolve any in this guild`)
    }

    return {
        detected: detectedPeople.length > 0,
        mentions: detectedPeople
    }
}

/**
 * Resolve a user in the guild
 * @param {Object} person - The person to resolve
 * @param {Object} guild - The Discord guild
 */
async function resolveUserInGuild(person, guild) {
    // First try with the known ID
    console.log(`🦊 personaManager: Trying to fetch member with ID: ${person.knownId}`)

    const member = await guild.members.fetch(person.knownId).catch(err => {
        console.log(`🦊 personaManager: Couldn't fetch by ID: ${err.message}`)
        return null
    })

    if (member) {
        person.resolvedId = member.id
        person.foundInGuild = true
        console.log(`🦊 personaManager: ✅ Found ${person.name} in guild with ID ${person.resolvedId}`)
        return
    }

    // If not found by ID, try to find by username/nickname
    console.log(`🦊 personaManager: Trying to find ${person.name} by username/nickname`)

    // Fetch with a reasonable limit to avoid API overload
    let members
    try {
        members = await guild.members.fetch({ limit: 100 })
        console.log(`🦊 personaManager: Fetched ${members.size} members`)
    } catch (fetchErr) {
        console.error(`🦊 personaManager: Error fetching guild members: ${fetchErr.message}`)
        members = guild.members.cache
        console.log(`🦊 personaManager: Using cached members (${members.size})`)
    }

    const foundMember = members.find(m => {
        const username = m.user.username.toLowerCase()
        const nickname = m.nickname?.toLowerCase() || ''
        const displayName = m.displayName?.toLowerCase() || ''

        // Check if username, nickname or display name matches the person's name or aliases
        const nameMatch =
            username === person.name.toLowerCase() ||
            nickname === person.name.toLowerCase() ||
            displayName === person.name.toLowerCase()

        const aliasMatch = KNOWN_INDIVIDUALS[person.key].aliases.some(alias => {
            const lowerAlias = alias.toLowerCase()
            return username.includes(lowerAlias) || nickname.includes(lowerAlias) || displayName.includes(lowerAlias)
        })

        return nameMatch || aliasMatch
    })

    if (foundMember) {
        person.resolvedId = foundMember.id
        person.foundInGuild = true
        console.log(`🦊 personaManager: ✅ Found ${person.name} by name/alias with ID ${person.resolvedId}`)
    } else {
        console.log(`🦊 personaManager: ❌ Could not find ${person.name} in guild members`)
    }
}

/**
 * Detect channel mentions in a message
 * @param {string} message - The message to check
 * @param {Object} guild - The Discord guild
 * @returns {Array} Array of detected channel objects
 */
function detectChannelMentions(message, guild) {
    if (!message || !guild) {
        return []
    }

    const detectedChannels = []

    // Check for #channel-name mentions
    const channelRegex = /#([\w-]+)/g
    const channelMatches = [...message.matchAll(channelRegex)]

    if (channelMatches.length > 0) {
        for (const match of channelMatches) {
            const channelName = match[1].toLowerCase()

            // Try to find the channel in the guild
            const channel = guild.channels.cache.find(
                c =>
                    c.name.toLowerCase() === channelName ||
                    c.name.toLowerCase().replace(/-/g, '') === channelName.replace(/-/g, '')
            )

            if (channel) {
                detectedChannels.push({
                    name: channel.name,
                    type: 'channel',
                    resolvedId: channel.id,
                    foundInGuild: true,
                    isDirect: false
                })
                console.log(`🦊 personaManager: Found channel #${channel.name} with ID ${channel.id}`)
            }
        }
    }

    return detectedChannels
}

/**
 * Detect role mentions in a message
 * @param {string} message - The message to check
 * @param {Object} guild - The Discord guild
 * @returns {Array} Array of detected role objects
 */
async function detectRoleMentions(message, guild) {
    if (!message || !guild) {
        return []
    }

    const detectedRoles = []

    // Check for @role mentions
    const roleRegex = /@([^\s]+)/g
    const roleMatches = [...message.matchAll(roleRegex)]

    if (roleMatches.length > 0) {
        // Ensure roles are fetched
        let roles
        try {
            roles = await guild.roles.fetch()
        } catch (error) {
            console.error('Error fetching roles:', error)
            roles = guild.roles.cache
        }

        for (const match of roleMatches) {
            const roleName = match[1].toLowerCase()

            // Skip if it looks like a user mention
            if (roleName.match(/^\d+$/)) {
                continue
            }

            // Try to find the role in the guild
            const role = roles.find(
                r =>
                    r.name.toLowerCase() === roleName ||
                    r.name.toLowerCase().replace(/\s+/g, '') === roleName.replace(/\s+/g, '')
            )

            if (role) {
                detectedRoles.push({
                    name: role.name,
                    type: 'role',
                    resolvedId: role.id,
                    foundInGuild: true,
                    isDirect: false
                })
                console.log(`🦊 personaManager: Found role @${role.name} with ID ${role.id}`)
            }
        }
    }

    return detectedRoles
}

/**
 * Format detected entities as Discord mentions
 * @param {Array} detectedEntities - The array of detected entities
 * @param {boolean} mentionAll - Whether to mention all detected entities or just one
 * @param {Object} options - Additional options for formatting
 * @returns {string} Formatted mentions
 */
export function formatPeopleMentions(detectedEntities, mentionAll = false, options = {}) {
    if (!detectedEntities || detectedEntities.length === 0) {
        return ''
    }

    // Only mention entities found in the guild
    const mentionable = detectedEntities.filter(p => p.foundInGuild || p.resolvedId)
    if (mentionable.length === 0) {
        return ''
    }

    console.log(`🦊 personaManager: Formatting mentions for ${mentionable.length} entities, mentionAll=${mentionAll}`)

    // If mentionAll is false, just mention the first entity of each type
    let toMention = mentionAll ? mentionable : []

    if (!mentionAll) {
        // Group by type and take first of each type
        const typeGroups = {}
        for (const entity of mentionable) {
            if (!typeGroups[entity.type]) {
                typeGroups[entity.type] = entity
            }
        }
        toMention = Object.values(typeGroups)
    }

    // Format the mentions based on entity type
    return toMention
        .map(entity => {
            switch (entity.type) {
                case 'user':
                    return `<@${entity.resolvedId}>`
                case 'channel':
                    return `<#${entity.resolvedId}>`
                case 'role':
                    return `<@&${entity.resolvedId}>`
                default:
                    return `<@${entity.resolvedId}>`
            }
        })
        .join(' ')
}

/**
 * Create a specialized context object for response generation
 * @param {string} message - The user's message
 * @param {Object} guild - The Discord guild
 * @param {Object} user - The user who sent the message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Context object for response generation
 */
export async function createContextForResponse(message, guild, user, options = {}) {
    // Detect entities in message
    const entityDetection = await detectAndResolvePeople(message, guild, options)

    // Create context object that can be used with prompt service
    const context = {
        message,
        guild: guild
            ? {
                  id: guild.id,
                  name: guild.name,
                  memberCount: guild.memberCount
              }
            : null,
        user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName
        },
        platform: 'discord',
        isDM: !guild,
        detectedEntities: entityDetection.mentions,
        shouldMention: entityDetection.detected
    }

    return context
}

/**
 * Parse a Discord message for all types of mentions
 * @param {Message} message - Discord.js message object
 * @returns {Object} Object containing all parsed mentions
 */
export function parseAllMentions(message) {
    if (!message) {
        return { users: [], channels: [], roles: [] }
    }

    return {
        users: Array.from(message.mentions.users.values()),
        channels: Array.from(message.mentions.channels.values()),
        roles: Array.from(message.mentions.roles.values()),
        everyone: message.mentions.everyone,
        raw: message.content.match(/<(@|@&|#)!?(\d+)>/g) || []
    }
}
