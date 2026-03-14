/**
 * Utility to calculate changes between two objects for audit logging.
 */
export function calculateChanges(before: any, after: any): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  if (!before && after) {
    Object.keys(after).forEach((key) => {
      changes[key] = { old: null, new: after[key] };
    });
    return changes;
  }

  if (before && !after) {
    Object.keys(before).forEach((key) => {
      changes[key] = { old: before[key], new: null };
    });
    return changes;
  }

  if (!before && !after) return changes;

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  allKeys.forEach((key) => {
    const oldValue = before[key];
    const newValue = after[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        old: oldValue === undefined ? null : oldValue,
        new: newValue === undefined ? null : newValue,
      };
    }
  });

  return changes;
}
