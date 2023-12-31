import { GraphQLEnumType, GraphQLList, GraphQLScalarType } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import type { ColumnMetadata } from '@vdtn359/graphqlize-mapper';
import { buildNumberFilter } from './number';
import { buildStringFilter } from './string';
import { buildDateFilter } from './date';
import { buildJsonFilter } from './json';
import { buildBooleanFilter } from './boolean';
import { buildListFilter } from './list';
import { TableTranslator } from '../builders/translator';
import { buildEnumFilter } from './enum';

export const getFilterType = (
  column: ColumnMetadata,
  translator: TableTranslator,
  composer: SchemaComposer
) => {
  const { type } = column;
  if (type instanceof GraphQLScalarType) {
    switch (type.name) {
      case 'Int':
      case 'Float':
        return buildNumberFilter(translator, composer);
      case 'String':
        return buildStringFilter(translator, composer);
      case 'Date':
      case 'DateTime':
        return buildDateFilter(translator, composer);
      case 'JSON':
      case 'JSONObject':
        return buildJsonFilter(translator, composer);
      case 'Boolean':
        return buildBooleanFilter(translator, composer);
      default:
        throw new Error(`Unknown filter type ${type.name}`);
    }
  }

  if (type instanceof GraphQLEnumType) {
    return buildEnumFilter(translator, column, composer);
  }
  if (type instanceof GraphQLList) {
    return buildListFilter(translator, composer);
  }
  throw new Error(`Unknown filter type ${type.toString()}`);
};
