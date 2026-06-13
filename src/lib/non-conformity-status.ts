export const ACTIVE_NON_CONFORMITY_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_VERIFICATION",
  "REJECTED",
] as const;

export function isActiveNonConformityStatus(status: string) {
  return ACTIVE_NON_CONFORMITY_STATUSES.some(
    (activeStatus) => activeStatus === status,
  );
}
