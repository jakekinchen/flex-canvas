type PresenceNameInput = {
  connectionId: number | string;
  key: string;
  name: string;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ") || "Guest";
}

function compareConnectionOrder(left: PresenceNameInput, right: PresenceNameInput) {
  const leftNumber = Number(left.connectionId);
  const rightNumber = Number(right.connectionId);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return `${left.connectionId}:${left.key}`.localeCompare(`${right.connectionId}:${right.key}`);
}

export function withDuplicatePresenceNames<T extends PresenceNameInput>(entries: T[]) {
  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    name: normalizeName(entry.name),
  }));
  const groups = new Map<string, Array<T & { name: string }>>();

  normalizedEntries.forEach((entry) => {
    const group = groups.get(entry.name) ?? [];
    group.push(entry);
    groups.set(entry.name, group);
  });

  groups.forEach((group) => group.sort(compareConnectionOrder));

  return normalizedEntries.map((entry) => {
    const group = groups.get(entry.name) ?? [entry];
    const duplicateIndex = group.findIndex((candidate) => candidate.key === entry.key);
    const duplicateNumber = duplicateIndex + 1;
    return {
      ...entry,
      displayName: group.length > 1 && duplicateNumber > 1 ? `${entry.name} (${duplicateNumber})` : entry.name,
      duplicateCount: group.length,
      duplicateNumber,
    };
  });
}
