import { SchemaComposer } from 'graphql-compose';
import { TableTranslator } from '../builders/translator';

export function buildBooleanFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  return composer.getOrCreateITC(translator.typeName('BooleanFilter'), (tc) => {
    tc.addFields({
      _eq: 'Boolean',
      _neq: 'Boolean',
    });
  });
}
