import { SchemaComposer } from 'graphql-compose';
import type { ColumnMetadata } from '@vdtn359/graphqlize-mapper';
import { GraphQLEnumType } from 'graphql';
import { TableTranslator } from '../builders/translator';

export function buildEnumType(
  translator: TableTranslator,
  column: ColumnMetadata,
  composer: SchemaComposer
) {
  const { name } = column;
  const type = column.type as GraphQLEnumType;
  const enumName = translator.enumTypeName(name);

  return composer.getOrCreateETC(enumName, (etc) => {
    const values = type.getValues();
    for (const value of values) {
      etc.addFields({
        [value.name]: {
          value: value.value,
        },
      });
    }
  });
}

export function buildEnumFilter(
  translator: TableTranslator,
  column: ColumnMetadata,
  composer: SchemaComposer
) {
  const { name } = column;
  const enumType = buildEnumType(translator, column, composer);
  const enumFilterName = translator.enumTypeFilterName(name);

  return composer.getOrCreateITC(enumFilterName, (tc) => {
    tc.addFields({
      _eq: enumType.getTypeName(),
      _neq: enumType.getTypeName(),
      _in: `[${enumType.getTypeName()}]`,
      _notIn: `[${enumType.getTypeName()}]`,
    });
  });
}
