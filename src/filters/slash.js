export const filterSlash = async ({ client, category }) => {
    let cmds = client.slash.filter(cmd => cmd.structure.category === category);
    let results = cmds.map(cmd => cmd.structure.name);
    return results;
};