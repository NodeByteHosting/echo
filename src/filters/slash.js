export const filterSlash = async ({ client, category }) => {
    const cmds = client.slash.filter(cmd => cmd.structure.category === category)
    const results = cmds.map(cmd => cmd.structure.name)
    return results
}
