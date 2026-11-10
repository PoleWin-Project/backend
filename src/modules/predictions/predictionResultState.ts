export function isResultCandidateConfirmed(
    candidateValue: string | null | undefined,
    candidateSeenAt: Date | null | undefined,
    observedValue: string,
    now: Date,
    confirmationMs: number,
) {
    return candidateValue === observedValue
        && candidateSeenAt !== null
        && candidateSeenAt !== undefined
        && now.getTime() - candidateSeenAt.getTime() >= confirmationMs;
}
