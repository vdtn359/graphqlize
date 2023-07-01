import { SchemaComposer } from 'graphql-compose';
import { buildStringNumberFilter } from './number-string';

export function buildJsonFilter(composer: SchemaComposer) {
  buildStringNumberFilter(composer);
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
