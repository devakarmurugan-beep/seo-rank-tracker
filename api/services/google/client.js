import { google } from 'googleapis'

/**
 * Creates a Google OAuth2 client configured with the stored refresh token.
 * This is the shared foundation — every Google API (GSC, GA4, etc.) uses this.
 */
export const createGoogleOAuth2Client = (refreshToken) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GCP_CLIENT_ID,
        process.env.GCP_CLIENT_SECRET,
        process.env.GCP_REDIRECT_URI
    )
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    return oauth2Client
}

/**
 * Returns a Google Search Console (Webmasters v3) client.
 * Used for search analytics queries and site listing.
 */
export const getGSCClient = (refreshToken) => {
    return google.webmasters({
        version: 'v3',
        auth: createGoogleOAuth2Client(refreshToken)
    })
}

/**
 * Returns a Search Console v1 client (for URL Inspection API).
 */
export const getSearchConsoleClient = (refreshToken) => {
    return google.searchconsole({
        version: 'v1',
        auth: createGoogleOAuth2Client(refreshToken)
    })
}

// Future: export const getGA4Client = (refreshToken) => { ... }
