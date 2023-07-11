import { SchemaComposer } from 'graphql-compose';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { buildStringNumberFilter } from './number-string';

export function buildJsonFilter(composer: SchemaComposer) {
  const stringNumberFilter = buildStringNumberFilter(composer);
  const jsonFieldFilter = composer.getOrCreateITC('JsonFieldFilter', (tc) =>
    tc.addFields({
      field: 'String!',
      value: {
        type: new GraphQLNonNull(stringNumberFilter.getType()),
      },
    })
  );
  return composer.getOrCreateITC('JsonFilter', (tc) => {
    tc.addFields({
      _fields: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(jsonFieldFilter.getType()))
      ),
    });
  });
}
