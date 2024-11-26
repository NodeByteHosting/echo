const post = (endpoint, body) => {
    return fetch(`${process.env.WEB_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REVALIDATE_SECRET}`
        },
        body: body ? JSON.stringify(body) : undefined
    })
}

/**
 * Revalidates the homepage of our forum
 * @returns {Promise<Response>}
 */
export const revalidateHomepage = () => {
    return post('/api/revalidate-home')
}

/**
 * Revalidates the index of a thread on our forum
 */
export const revalidateIndex = postId => {
    return post('/api/revalidate-post', { postId })
}
