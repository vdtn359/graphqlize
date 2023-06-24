import { SchemaComposer } from 'graphql-compose';

export function buildListFilter(composer: SchemaComposer) {
  return composer.getOrCreateITC('ListFilter', (tc) => {
    tc.addFields({
      _eq: 'String',
      _neq: 'String',
      _in: '[String]',
      _notIn: '[String]',
      _contains: 'String',
    });
  });
}
