import { SchemaComposer } from 'graphql-compose';
import { TableTranslator } from '../builders/translator';

export function buildNumberFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  return composer.getOrCreateITC(translator.typeName('NumberFilter'), (tc) => {
    tc.addFields({
      _eq: 'Float',
      _neq: 'Float',
      _lt: 'Float',
      _lte: 'Float',
      _gt: 'Float',
      _gte: 'Float',
      _between: '[Float]',
      _notBetween: '[Float]',
      _in: '[Float]',
      _notIn: '[Float]',
    });
  });
}
