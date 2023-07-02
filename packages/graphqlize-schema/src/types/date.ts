import { SchemaComposer } from 'graphql-compose';

export function buildDateFilter(composer: SchemaComposer) {
  return composer.getOrCreateITC('DateFilter', (tc) => {
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
      _year: 'NumberFilter',
      _month: 'NumberFilter',
      _day: 'NumberFilter',
      _hour: 'NumberFilter',
      _minute: 'NumberFilter',
      _second: 'NumberFilter',
      _dayOfWeek: 'NumberFilter',
      _date: 'StringFilter',
    });
  });
}
