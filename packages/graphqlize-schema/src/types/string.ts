import { SchemaComposer } from 'graphql-compose';
import { TableTranslator } from '../builders/translator';

export function buildStringFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  return composer.getOrCreateITC(translator.typeName('StringFilter'), (tc) => {
    tc.addFields({
      _eq: 'String',
      _neq: 'String',
      _lt: 'String',
      _lte: 'String',
      _gt: 'String',
      _gte: 'String',
      _like: 'String',
      _iLike: 'String',
      _regExp: 'String',
      _iRegExp: 'String',
      _between: '[String!]',
      _notBetween: '[String!]',
      _in: '[String]',
      _notIn: '[String]',
      _contains: 'String',
      _startsWith: 'String',
      _endsWith: 'String',
    });
  });
}
