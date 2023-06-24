import { SchemaComposer } from 'graphql-compose';

export function buildStringFilter(composer: SchemaComposer) {
  return composer.getOrCreateITC('StringFilter', (tc) => {
    tc.addFields({
      _eq: 'String',
      _neq: 'String',
      _le: 'String',
      _lte: 'String',
      _gt: 'String',
      _gte: 'String',
      _like: 'String',
      _iLike: 'String',
      _regExp: 'String',
      _iRegExp: 'String',
      _between: '[String]',
      _notBetween: '[String]',
      _in: '[String]',
      _notIn: '[String]',
      _contains: 'String',
      _startsWith: 'String',
      _endWith: 'String',
    });
  });
}
