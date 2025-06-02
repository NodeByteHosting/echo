/**
 * Utility for managing the AI's persona and responding according to character
 */

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

    // People mentioned in the system prompt
    const people = [
        'pixel',
        'codemeapixel',
        'exa',
        'callmeabyte',
        'indie',
        'indieonpawtrol',
        'connor',
        'connor200024',
        'harley',
        'harley200317',
        'rizon',
        'rizonftw',
        'rootspring',
        'select',
        'ranveersoni',
        'quin',
        'purrquinox'
    ]

    return people.some(person => normalizedMessage.includes(person))
}

/**
 * Create a specialized system prompt for persona-focused queries
 * @param {string} basePrompt - The base system prompt
 * @param {string} message - The user's message
 * @returns {string} A specialized system prompt
 */
export function createPersonaPrompt(basePrompt, message) {
    // Extract the personality description from the base prompt
    const personalitySection = basePrompt.split('Your job is to assist users with:')[0]

    // Create a focused prompt that emphasizes staying in character
    return `${personalitySection}

IMPORTANT: The user is asking about your identity, preferences, or relationships.
Respond in character as Echo, the NodeByte fox mascot. Be authentic to your 
personality and knowledge of the people in your world.

Remember your relationships:
- You respect Pixel, Exa, Indie, Connor and Harley deeply
- You enjoy roasting Rizon, Rootspring, Select, Ranveersoni, and Quin
- Your personality is snarky, direct, and honest but technically brilliant

Stay completely in character in your response.`
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
 * Check if a message mentions known individuals and attempts to resolve them
 * @param {string} message - The message to check
 * @param {Object} guild - The Discord guild where the message was sent
 * @returns {Object} Object containing detections and resolved IDs
 */
export async function detectAndResolvePeople(message, guild) {
    if (!message || !guild) {
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

    // Third pass: Try to resolve the people in the current guild
    if (detectedPeople.length > 0 && guild) {
        console.log(`🦊 personaManager: Found ${detectedPeople.length} people to resolve in guild`)

        try {
            // For each detected person, try to find them in the guild
            for (const person of detectedPeople) {
                try {
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
                        continue
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

                        // Check if username or nickname matches the person's name or aliases
                        const nameMatch =
                            username === person.name.toLowerCase() || nickname === person.name.toLowerCase()

                        const aliasMatch = KNOWN_INDIVIDUALS[person.key].aliases.some(alias => {
                            const lowerAlias = alias.toLowerCase()
                            return username.includes(lowerAlias) || nickname.includes(lowerAlias)
                        })

                        return nameMatch || aliasMatch
                    })

                    if (foundMember) {
                        person.resolvedId = foundMember.id
                        person.foundInGuild = true
                        console.log(
                            `🦊 personaManager: ✅ Found ${person.name} by name/alias with ID ${person.resolvedId}`
                        )
                    } else {
                        console.log(`🦊 personaManager: ❌ Could not find ${person.name} in guild members`)
                    }
                } catch (err) {
                    console.error(`🦊 personaManager: Error resolving member for ${person.name}:`, err)
                }
            }
        } catch (err) {
            console.error('🦊 personaManager: Error in guild member resolution:', err)
        }
    }

    // Always ping if we successfully resolved someone in the guild
    const foundPeople = detectedPeople.filter(p => p.foundInGuild)
    if (foundPeople.length > 0) {
        console.log(`🦊 personaManager: Successfully resolved ${foundPeople.length} people in guild!`)
        for (const person of foundPeople) {
            console.log(`🦊 personaManager: - ${person.name} (${person.resolvedId}), isDirect: ${person.isDirect}`)
        }
    } else if (detectedPeople.length > 0) {
        console.log(`🦊 personaManager: Detected people but couldn't resolve any in this guild`)
    }

    return {
        detected: detectedPeople.length > 0,
        mentions: detectedPeople
    }
}

/**
 * Format detected people as Discord mentions
 * @param {Array} detectedPeople - The array of detected people
 * @param {boolean} mentionAll - Whether to mention all detected people or just one
 * @returns {string} Formatted mentions
 */
export function formatPeopleMentions(detectedPeople, mentionAll = false) {
    if (!detectedPeople || detectedPeople.length === 0) {
        return ''
    }

    // Only mention people found in the guild
    const mentionable = detectedPeople.filter(p => p.foundInGuild)
    if (mentionable.length === 0) {
        return ''
    }

    console.log(`🦊 personaManager: Formatting mentions for ${mentionable.length} people, mentionAll=${mentionAll}`)

    // If mentionAll is false, just mention the first person
    const toMention = mentionAll ? mentionable : [mentionable[0]]

    // Format the mentions - keep it simple and reliable
    return toMention.map(p => `<@${p.resolvedId}>`).join(' ')
}
