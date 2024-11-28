export const formattedSize = size => {
    // Convert MB to GB (1 GB = 1,000 MB)
    const gb = size / 1000

    if (gb >= 1000) {
        // If the value is greater than or equal to 1000 GB, convert to TB
        const tb = gb / 1000
        return Math.round(tb) + ' TB' // Round to nearest whole TB
    }
    // Otherwise, show the size in GB rounded to the nearest whole number
    return Math.round(gb) + ' GB'
}
