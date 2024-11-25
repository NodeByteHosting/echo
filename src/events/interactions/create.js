import { Events, BaseInteraction } from 'discord.js';
import { log } from '../../functions/logger.js';
import Indexie from '../../class/client.js';

const cooldown = new Map();

export default {
    event: Events.InteractionCreate,

    run: async (client, interaction) => {

        if (interaction.isContextMenuCommand()) return;
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.isCommand()) return;

        const command = client.slash.get(interaction.commandName);

        if (!command) return;

        try {

            if (command.options?.cooldown) {

                const isGlobalCooldown = command.options.globalCooldown;
                const cooldownKey = isGlobalCooldown ? 'global_' + command.structure.name : interaction.user.id;

                const cooldownFunction = () => {
                    const data = cooldown.get(cooldownKey);

                    data.push(interaction.commandName);

                    cooldown.set(cooldownKey, data);

                    setTimeout(() => {
                        let data = cooldown.get(cooldownKey);

                        data = data.filter((v) => v !== interaction.commandName);

                        if (data.length <= 0) {
                            cooldown.delete(cooldownKey);
                        } else {
                            cooldown.set(cooldownKey, data);
                        }
                    }, command.options.cooldown);
                };

                if (cooldown.has(cooldownKey)) {
                    let data = cooldown.get(cooldownKey);

                    if (data.some((v) => v === interaction.commandName)) {
                        const message = (isGlobalCooldown
                            ? 'Slow down buddy, this command is on a global cooldown and you are using it to fast!'
                            : 'You are using this command too fast! Please wait: (${cooldown}s)'
                        ).replace('/${cooldown}/g', command.options.cooldown / 1000);

                        await interaction.reply({
                            content: message,
                            ephemeral: true
                        })

                        return;
                    } else {
                        cooldownFunction();
                    }
                } else {
                    cooldown.set(cooldownKey, [interaction.commandName]);
                    cooldownFunction();
                }
            }

            command.run(client, interaction);
        } catch (err) {

            log(`Failed to execute command: ${interaction.commandName}`, 'error');
            log(err, 'debug');

            await interaction.reply({
                content: 'An error occurred while executing this command!',
                ephemeral: true
            })
        }
    }
}