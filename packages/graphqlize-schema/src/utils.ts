import * as transformer from 'change-case';
import { capitalCase } from 'change-case';
import pluralize from 'pluralize';

export const transform = (str: string, casing: keyof typeof transformer) =>
  transformer[casing](str, {} as any);

export const mergeTransform = (
  strs: string[],
  casing: keyof typeof transformer
) =>
  transform(
    strs
      .filter(Boolean)
      .map((str) => capitalCase(str))
      .join(' '),
    casing
  );

export const singular = (str: string) => pluralize.singular(str);

export const pluralizeTransform = (
  str: string,
  casing: keyof typeof transformer
) => transform(pluralize(str), casing);
