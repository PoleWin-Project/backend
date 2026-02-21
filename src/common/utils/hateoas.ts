export type HalLink = {
    href: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

export type HalLinks = Record<string, HalLink>;

/**
 * Enrichit un objet de réponse avec des liens HATEOAS (_links).
 * Conforme au standard HAL (Hypertext Application Language).
 */
export function withLinks<T extends object>(data: T, links: HalLinks): T & { _links: HalLinks } {
    return { ...data, _links: links };
}

/** Liens de découverte racine — GET /api/v1 */
export const rootLinks: HalLinks = {
    self:              { href: "/api/v1",                          method: "GET" },
    docs:              { href: "/api/v1/docs",                     method: "GET" },
    health:            { href: "/api/v1/health",                   method: "GET" },
    register:          { href: "/api/v1/auth/register",            method: "POST" },
    login:             { href: "/api/v1/auth/login",               method: "POST" },
    verifyEmail:       { href: "/api/v1/auth/verify-email",        method: "GET" },
    resendVerifyEmail: { href: "/api/v1/auth/resend-verify-email", method: "POST" },
    me:                { href: "/api/v1/users/me",                 method: "GET" },
    updateMe:          { href: "/api/v1/users/me",                 method: "PATCH" },
    publicProfile:     { href: "/api/v1/users/:id/public",         method: "GET" },
    deleteAccount:     { href: "/api/v1/auth/delete-account",      method: "DELETE" },
};

/** Liens après un register réussi */
export const registerLinks: HalLinks = {
    self:          { href: "/api/v1/auth/register",            method: "POST" },
    login:         { href: "/api/v1/auth/login",               method: "POST" },
    me:            { href: "/api/v1/users/me",                 method: "GET" },
    verifyEmail:   { href: "/api/v1/auth/verify-email",        method: "GET" },
    resendVerify:  { href: "/api/v1/auth/resend-verify-email", method: "POST" },
};

/** Liens après un login réussi */
export const loginLinks: HalLinks = {
    self:          { href: "/api/v1/auth/login",          method: "POST" },
    me:            { href: "/api/v1/users/me",            method: "GET" },
    updateMe:      { href: "/api/v1/users/me",            method: "PATCH" },
    deleteAccount: { href: "/api/v1/auth/delete-account", method: "DELETE" },
};

/** Liens pour GET /api/v1/users/me */
export const meLinks = (userId: number): HalLinks => ({
    self:          { href: "/api/v1/users/me",                    method: "GET" },
    update:        { href: "/api/v1/users/me",                    method: "PATCH" },
    publicProfile: { href: `/api/v1/users/${userId}/public`,      method: "GET" },
    deleteAccount: { href: "/api/v1/auth/delete-account",         method: "DELETE" },
});

/** Liens pour GET /api/v1/users/:id/public */
export const publicProfileLinks = (userId: string): HalLinks => ({
    self: { href: `/api/v1/users/${userId}/public`, method: "GET" },
    list: { href: "/api/v1/users/me",               method: "GET" },
});
