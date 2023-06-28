import { MysqlDialect } from './mysql';
import { DefaultDialect } from './default';

export const getDialectHandler = (dialect: string) => {
  if (dialect.startsWith('mysql')) {
    return new MysqlDialect();
  }
  return new DefaultDialect();
};
