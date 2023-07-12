import { SchemaComposer } from 'graphql-compose';
import { TableTranslator } from '../builders/translator';

export function buildListFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  return composer.getOrCreateITC(translator.typeName('ListFilter'), (tc) => {
    tc.addFields({
      _eq: 'String',
      _neq: 'String',
      _in: '[String]',
      _notIn: '[String]',
      _contains: 'String',
    });
  });
}
