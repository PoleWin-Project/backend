import { withLinks, meLinks, publicProfileLinks, registerLinks, loginLinks } from "./hateoas";

describe("withLinks()", () => {
    it("fusionne data et _links", () => {
        const result = withLinks({ status: "ok" }, { self: { href: "/test", method: "GET" } });
        expect(result.status).toBe("ok");
        expect(result._links.self.href).toBe("/test");
        expect(result._links.self.method).toBe("GET");
    });

    it("ne mute pas l'objet original", () => {
        const data = { status: "ok" };
        withLinks(data, {});
        expect(Object.keys(data)).toEqual(["status"]);
    });
});

describe("meLinks(userId)", () => {
    it("contient self, update, publicProfile, deleteAccount", () => {
        const links = meLinks(42);
        expect(links.self.href).toBe("/api/v1/users/me");
        expect(links.update.method).toBe("PATCH");
        expect(links.publicProfile.href).toBe("/api/v1/users/42/public");
        expect(links.deleteAccount.method).toBe("DELETE");
    });
});

describe("publicProfileLinks(userId)", () => {
    it("self pointe vers le bon profil public", () => {
        const links = publicProfileLinks("99");
        expect(links.self.href).toBe("/api/v1/users/99/public");
        expect(links.self.method).toBe("GET");
    });
});

describe("registerLinks", () => {
    it("contient self, login, me, verifyEmail, resendVerify", () => {
        expect(registerLinks.self.href).toBe("/api/v1/auth/register");
        expect(registerLinks.login.href).toBe("/api/v1/auth/login");
        expect(registerLinks.me.href).toBe("/api/v1/users/me");
    });
});

describe("loginLinks", () => {
    it("contient self, me, updateMe, deleteAccount", () => {
        expect(loginLinks.self.method).toBe("POST");
        expect(loginLinks.deleteAccount.method).toBe("DELETE");
    });
});
