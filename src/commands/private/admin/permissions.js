import { cmdTypes } from '../../../configs/cmdTypes.config.js'
import { Roles, Permissions } from '../../../configs/roles.config.js'
import { validatePermissionChange } from '../../../functions/permissionUtils.js'
import { PermissionHandler } from '../../../functions/permissions.js'

export default {
    structure: {
        name: 'permissions',
        description: 'Manage user roles and permissions',
        category: 'admin',
        handlers: {
            cooldown: 5000,
            permissions: ['ADMIN', 'DEVELOPER']
        },
        options: [
            {
                name: 'view',
                description: "View a user's current permissions",
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to view permissions for',
                        type: cmdTypes.USER,
                        required: true
                    }
                ]
            },
            {
                name: 'set_role',
                description: "Set a user's role",
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to set role for',
                        type: cmdTypes.USER,
                        required: true
                    },
                    {
                        name: 'role',
                        description: 'The role to assign',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Admin', value: Roles.ADMIN },
                            { name: 'Developer', value: Roles.DEVELOPER },
                            { name: 'Moderator', value: Roles.MODERATOR },
                            { name: 'Support Agent', value: Roles.SUPPORT_AGENT },
                            { name: 'User', value: Roles.USER }
                        ]
                    }
                ]
            },
            {
                name: 'add_permission',
                description: 'Add a specific permission to a user',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to add permission for',
                        type: cmdTypes.USER,
                        required: true
                    },
                    {
                        name: 'permission',
                        description: 'The permission to add',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Tkt New', value: 'CREATE_TICKET' },
                            { name: 'Tkt View', value: 'VIEW_TICKET' },
                            { name: 'Tkt Close', value: 'CLOSE_TICKET' },
                            { name: 'Tkt Assign', value: 'ASSIGN_TICKET' },
                            { name: 'Tkt Mng', value: 'MANAGE_TICKETS' },
                            { name: 'Tkt Escalate', value: 'ESCALATE_TICKET' },
                            { name: 'Tkt View All', value: 'VIEW_ALL_TICKETS' },
                            { name: 'User Ban', value: 'BAN_USER' },
                            { name: 'User Unban', value: 'UNBAN_USER' },
                            { name: 'User Warn', value: 'WARN_USER' },
                            { name: 'User Mng Roles', value: 'MANAGE_ROLES' },
                            { name: 'User View Info', value: 'VIEW_USER_INFO' },
                            { name: 'User Mng Prof', value: 'MANAGE_USER_PROFILE' },
                            { name: 'KB View', value: 'VIEW_KB' },
                            { name: 'KB New', value: 'CREATE_KB' },
                            { name: 'KB Edit', value: 'EDIT_KB' },
                            { name: 'KB Del', value: 'DELETE_KB' },
                            { name: 'KB Verify', value: 'VERIFY_KB' },
                            { name: 'Sys View Stat', value: 'VIEW_SYSTEM_STATUS' },
                            { name: 'Sys View Met', value: 'VIEW_METRICS' },
                            { name: 'Sys Mng Bot Set', value: 'MANAGE_BOT_SETTINGS' },
                            { name: 'Sup Provide', value: 'PROVIDE_SUPPORT' },
                            { name: 'Sup View Q', value: 'VIEW_SUPPORT_QUEUE' },
                            { name: 'Sup Mng Agents', value: 'MANAGE_SUPPORT_AGENTS' }
                        ]
                    }
                ]
            },
            {
                name: 'remove_permission',
                description: 'Remove a specific permission from a user',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to remove permission from',
                        type: cmdTypes.USER,
                        required: true
                    },
                    {
                        name: 'permission',
                        description: 'The permission to remove',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Tkt New', value: 'CREATE_TICKET' },
                            { name: 'Tkt View', value: 'VIEW_TICKET' },
                            { name: 'Tkt Close', value: 'CLOSE_TICKET' },
                            { name: 'Tkt Assign', value: 'ASSIGN_TICKET' },
                            { name: 'Tkt Mng', value: 'MANAGE_TICKETS' },
                            { name: 'Tkt Escalate', value: 'ESCALATE_TICKET' },
                            { name: 'Tkt View All', value: 'VIEW_ALL_TICKETS' },
                            { name: 'User Ban', value: 'BAN_USER' },
                            { name: 'User Unban', value: 'UNBAN_USER' },
                            { name: 'User Warn', value: 'WARN_USER' },
                            { name: 'User Mng Roles', value: 'MANAGE_ROLES' },
                            { name: 'User View Info', value: 'VIEW_USER_INFO' },
                            { name: 'User Mng Prof', value: 'MANAGE_USER_PROFILE' },
                            { name: 'KB View', value: 'VIEW_KB' },
                            { name: 'KB New', value: 'CREATE_KB' },
                            { name: 'KB Edit', value: 'EDIT_KB' },
                            { name: 'KB Del', value: 'DELETE_KB' },
                            { name: 'KB Verify', value: 'VERIFY_KB' },
                            { name: 'Sys View Stat', value: 'VIEW_SYSTEM_STATUS' },
                            { name: 'Sys View Met', value: 'VIEW_METRICS' },
                            { name: 'Sys Mng Bot Set', value: 'MANAGE_BOT_SETTINGS' },
                            { name: 'Sup Provide', value: 'PROVIDE_SUPPORT' },
                            { name: 'Sup View Q', value: 'VIEW_SUPPORT_QUEUE' },
                            { name: 'Sup Mng Agents', value: 'MANAGE_SUPPORT_AGENTS' }
                        ]
                    }
                ]
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true })

        const subCommand = interaction.options.getSubcommand()
        const targetUser = interaction.options.getUser('user')
        const permHandler = new PermissionHandler(client.db.prisma)

        // Get the performer's role
        const performer = await client.db.prisma.user.findUnique({
            where: { id: interaction.user.id },
            select: { role: true }
        })

        if (!performer) {
            return interaction.editReply({
                content: '❌ You need to be registered in the system to use this command.'
            })
        }

        try {
            switch (subCommand) {
                case 'view': {
                    const user = await client.db.prisma.user.findUnique({
                        where: { id: targetUser.id },
                        select: { role: true, permissions: true }
                    })

                    if (!user) {
                        return interaction.editReply({
                            content: '❌ User not found in the system.'
                        })
                    }

                    const defaultPerms = await permHandler.getDefaultPermissions(user.role)
                    const customPerms = user.permissions || []

                    const embed = new client.Gateway.EmbedBuilder()
                        .setTitle(`🔑 Permissions for ${targetUser.username}`)
                        .setColor(client.colors.primary)
                        .setThumbnail(targetUser.displayAvatarURL())
                        .addFields([
                            { name: 'Role', value: user.role, inline: true },
                            {
                                name: 'Role Permissions',
                                value: defaultPerms.length > 0 ? defaultPerms.join(', ') : 'None',
                                inline: false
                            },
                            {
                                name: 'Custom Permissions',
                                value: customPerms.length > 0 ? customPerms.join(', ') : 'None',
                                inline: false
                            }
                        ])
                        .setTimestamp()
                        .setFooter({ text: client.footer, iconURL: client.logo })

                    return interaction.editReply({ embeds: [embed] })
                }

                case 'set_role': {
                    const newRole = interaction.options.getString('role')

                    const targetUserData = await client.db.prisma.user.findUnique({
                        where: { id: targetUser.id },
                        select: { role: true }
                    })

                    if (!targetUserData) {
                        return interaction.editReply({
                            content: '❌ Target user not found in the system.'
                        })
                    }

                    // Validate the role change
                    if (!validatePermissionChange(targetUserData.role, newRole, performer.role)) {
                        return interaction.editReply({
                            content: "❌ You don't have permission to set this role."
                        })
                    }

                    // Update the user's role
                    await client.db.prisma.user.update({
                        where: { id: targetUser.id },
                        data: { role: newRole }
                    })

                    return interaction.editReply({
                        content: `✅ Successfully updated ${targetUser.username}'s role to ${newRole}.`
                    })
                }

                case 'add_permission': {
                    const permission = interaction.options.getString('permission')

                    // Only ADMIN and DEVELOPER can manage permissions
                    if (!['ADMIN', 'DEVELOPER'].includes(performer.role)) {
                        return interaction.editReply({
                            content: '❌ Only administrators and developers can manage custom permissions.'
                        })
                    }

                    const user = await client.db.prisma.user.findUnique({
                        where: { id: targetUser.id },
                        select: { permissions: true, role: true }
                    })

                    if (!user) {
                        return interaction.editReply({
                            content: '❌ User not found in the system.'
                        })
                    }

                    // Don't add if user already has the permission through their role
                    const defaultPerms = await permHandler.getDefaultPermissions(user.role)
                    if (defaultPerms.includes(permission)) {
                        return interaction.editReply({
                            content: '❌ User already has this permission through their role.'
                        })
                    }

                    // Add the permission if they don't already have it
                    const currentPerms = user.permissions || []
                    if (currentPerms.includes(permission)) {
                        return interaction.editReply({
                            content: '❌ User already has this custom permission.'
                        })
                    }

                    await client.db.prisma.user.update({
                        where: { id: targetUser.id },
                        data: { permissions: [...currentPerms, permission] }
                    })

                    return interaction.editReply({
                        content: `✅ Successfully added permission ${permission} to ${targetUser.username}.`
                    })
                }

                case 'remove_permission': {
                    const permission = interaction.options.getString('permission')

                    // Only ADMIN and DEVELOPER can manage permissions
                    if (!['ADMIN', 'DEVELOPER'].includes(performer.role)) {
                        return interaction.editReply({
                            content: '❌ Only administrators and developers can manage custom permissions.'
                        })
                    }

                    const user = await client.db.prisma.user.findUnique({
                        where: { id: targetUser.id },
                        select: { permissions: true, role: true }
                    })

                    if (!user) {
                        return interaction.editReply({
                            content: '❌ User not found in the system.'
                        })
                    }

                    // Check if permission comes from role
                    const defaultPerms = await permHandler.getDefaultPermissions(user.role)
                    if (defaultPerms.includes(permission)) {
                        return interaction.editReply({
                            content:
                                "❌ Cannot remove this permission as it comes from the user's role. Change their role instead."
                        })
                    }

                    // Remove the permission if they have it
                    const currentPerms = user.permissions || []
                    if (!currentPerms.includes(permission)) {
                        return interaction.editReply({
                            content: "❌ User doesn't have this custom permission."
                        })
                    }

                    await client.db.prisma.user.update({
                        where: { id: targetUser.id },
                        data: { permissions: currentPerms.filter(p => p !== permission) }
                    })

                    return interaction.editReply({
                        content: `✅ Successfully removed permission ${permission} from ${targetUser.username}.`
                    })
                }
            }

            return null
        } catch (error) {
            console.error('Error in permissions command:', error)
            return interaction.editReply({
                content: '❌ An error occurred while processing your request.'
            })
        }
    }
}
