import { GraphQLList, GraphQLScalarType } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { buildNumberFilter } from './number';
import { buildStringFilter } from './string';
import { buildDateFilter } from './date';
import { buildJsonFilter } from './json';
import { buildBooleanFilter } from './boolean';
import { buildListFilter } from './list';

export const getFilterType = (
  type: GraphQLScalarType,
  composer: SchemaComposer
) => {
  switch (type.name) {
    case 'Int':
    case 'Float':
      return buildNumberFilter(composer);
    case 'String':
      return buildStringFilter(composer);
    case 'Date':
    case 'DateTime':
      return buildDateFilter(composer);
    case 'JSON':
      return buildJsonFilter(composer);
    case 'Boolean':
      return buildBooleanFilter(composer);
    default:
      if (type instanceof GraphQLList) {
        return buildListFilter(composer);
      }
      throw new Error(`Unknown filter type ${type.name}`);
  }
};
