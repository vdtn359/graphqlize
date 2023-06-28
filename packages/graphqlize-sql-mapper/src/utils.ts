import { capitalCase } from 'change-case';

export const generateAlias = (tableName: string) => {
  const parts = capitalCase(tableName).split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toLowerCase();
  }
  return parts.map((part) => part[0].toLowerCase()).join('');
};
