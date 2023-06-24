import { SchemaComposer } from 'graphql-compose';

export function buildBooleanFilter(composer: SchemaComposer) {
  return composer.getOrCreateITC('BooleanFilter', (tc) => {
    tc.addFields({
      _eq: 'Boolean',
      _neq: 'Boolean',
    });
  });
}
