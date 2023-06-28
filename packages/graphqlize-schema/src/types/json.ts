import { SchemaComposer } from 'graphql-compose';

export function buildJsonFilter(composer: SchemaComposer) {
  composer.getOrCreateITC('JsonFieldFilter', (tc) =>
    tc.addFields({
      field: 'String!',
      value: 'StringNumberFilter!',
    })
  );
  return composer.getOrCreateITC('JsonFilter', (tc) => {
    tc.addFields({
      _fields: '[JsonFieldFilter!]!',
    });
  });
}
