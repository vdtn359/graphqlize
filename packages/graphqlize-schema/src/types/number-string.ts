import { SchemaComposer } from 'graphql-compose';
import { Kind } from 'graphql/language';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { TableTranslator } from '../builders/translator';

export function buildStringNumberFilter(
  translator: TableTranslator,
  composer: SchemaComposer
) {
  const scalarType = composer.getOrCreateSTC(
    translator.typeName('StringNumber'),
    (tc) => {
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
    }
  );

  return composer.getOrCreateITC(
    translator.typeName('StringNumberFilter'),
    (tc) => {
      tc.addFields({
        _eq: scalarType.getType(),
        _neq: scalarType.getType(),
        _lt: scalarType.getType(),
        _lte: scalarType.getType(),
        _gt: scalarType.getType(),
        _gte: scalarType.getType(),
        _like: scalarType.getType(),
        _iLike: scalarType.getType(),
        _regExp: scalarType.getType(),
        _iRegExp: scalarType.getType(),
        _between: new GraphQLList(new GraphQLNonNull(scalarType.getType())),
        _notBetween: new GraphQLList(new GraphQLNonNull(scalarType.getType())),
        _in: new GraphQLList(scalarType.getType()),
        _notIn: new GraphQLList(scalarType.getType()),
        _contains: scalarType.getType(),
        _startsWith: scalarType.getType(),
        _endsWith: scalarType.getType(),
      });
    }
  );
}
