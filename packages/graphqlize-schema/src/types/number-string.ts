import { SchemaComposer } from 'graphql-compose';
import { Kind } from 'graphql/language';

const TYPE = 'StringNumber';

export function buildStringNumberFilter(composer: SchemaComposer) {
  composer.getOrCreateSTC(TYPE, (tc) => {
    tc.setDescription('number or string');
    const serializeValue = (value: any) => {
      if (typeof value === 'number') {
        return value;
      }
      return String(value);
    };
    tc.setSerialize(serializeValue);
    tc.setParseValue(serializeValue);
    tc.setParseLiteral((ast) => {
      if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
        return parseFloat(ast.value);
      }
      if (ast.kind === Kind.STRING) {
        return ast.value;
      }
      return undefined;
    });
  });

  composer.getOrCreateITC('StringNumberFilter', (tc) => {
    tc.addFields({
      _eq: TYPE,
      _neq: TYPE,
      _le: TYPE,
      _lte: TYPE,
      _gt: TYPE,
      _gte: TYPE,
      _like: TYPE,
      _iLike: TYPE,
      _regExp: TYPE,
      _iRegExp: TYPE,
      _between: `[${TYPE}!]`,
      _notBetween: `[${TYPE}!]`,
      _in: `[${TYPE}]`,
      _notIn: `[${TYPE}]`,
      _contains: TYPE,
      _startsWith: TYPE,
      _endsWith: TYPE,
    });
  });
}
