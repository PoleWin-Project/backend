import { isResultCandidateConfirmed } from "./predictionResultState";

describe("stabilisation d'un résultat officiel", () => {
    const firstSeen = new Date("2026-11-07T20:20:00.000Z");
    const fiveMinutesLater = new Date("2026-11-07T20:25:00.000Z");

    it("refuse une première observation", () => {
        expect(isResultCandidateConfirmed(null, null, "NOR", firstSeen, 5 * 60_000)).toBe(false);
    });

    it("confirme la même valeur après le délai", () => {
        expect(isResultCandidateConfirmed("NOR", firstSeen, "NOR", fiveMinutesLater, 5 * 60_000)).toBe(true);
    });

    it("réinitialise implicitement la confirmation si la valeur change", () => {
        expect(isResultCandidateConfirmed("NOR", firstSeen, "RUS", fiveMinutesLater, 5 * 60_000)).toBe(false);
    });
});
