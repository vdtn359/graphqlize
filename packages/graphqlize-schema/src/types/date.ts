import { SchemaComposer } from 'graphql-compose';
import { TableTranslator } from '../builders/translator';
import { buildNumberFilter } from './number';
import { buildStringFilter } from './string';

export function buildDateFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  const numberFilter = buildNumberFilter(translator, composer);
  const stringFilter = buildStringFilter(translator, composer);
  return composer.getOrCreateITC(translator.typeName('DateFilter'), (tc) => {
    tc.addFields({
      _eq: 'Date',
      _neq: 'Date',
      _lt: 'Date',
      _lte: 'Date',
      _gt: 'Date',
      _gte: 'Date',
      _between: '[Date]',
      _notBetween: '[Date]',
      _in: '[Date]',
      _notIn: '[Date]',
      _year: numberFilter.getType(),
      _month: numberFilter.getType(),
      _day: numberFilter.getType(),
      _hour: numberFilter.getType(),
      _minute: numberFilter.getType(),
      _second: numberFilter.getType(),
      _dayOfWeek: numberFilter.getType(),
      _date: stringFilter.getType(),
    });
  });
}
