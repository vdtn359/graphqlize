import { SchemaComposer } from 'graphql-compose';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { buildStringNumberFilter } from './number-string';
import { TableTranslator } from '../builders/translator';

export function buildJsonFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  const stringNumberFilter = buildStringNumberFilter(translator, composer);
  const jsonFieldFilter = composer.getOrCreateITC(
    translator.typeName('JsonFieldFilter'),
    (tc) =>
      tc.addFields({
        field: 'String!',
        value: {
          type: new GraphQLNonNull(stringNumberFilter.getType()),
        },
      })
  );
  return composer.getOrCreateITC(translator.typeName('JsonFilter'), (tc) => {
    tc.addFields({
      _fields: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(jsonFieldFilter.getType()))
      ),
    });
  });
}
