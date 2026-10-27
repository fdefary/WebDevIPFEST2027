export async function getRoleClaims(user) {
    const { claims } = await user.getIdTokenResult(true)
    return { role: claims.ipfestRole || null, competition: claims.ipfestCompetition || null }
}
