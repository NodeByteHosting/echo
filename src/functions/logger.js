import chalk from "chalk";

export const log = (string, style) => {
    const styles = {
        info: { prefix: chalk.blue("[INFO]"), logFunction: console.log },
        err: { prefix: chalk.red("[ERROR]"), logFunction: console.error },
        error: { prefix: chalk.red("[ERROR]"), logFunction: console.error },
        debug: { prefix: chalk.magenta("[DEBUG]"), logFunction: console.log },
        warn: { prefix: chalk.yellow("[WARNING]"), logFunction: console.warn },
        done: { prefix: chalk.green("[SUCCESS]"), logFunction: console.log },
    };

    const selectedStyle = styles[style] || { logFunction: console.log };
    selectedStyle.logFunction(`${selectedStyle.prefix || ""} ${string}`);
};