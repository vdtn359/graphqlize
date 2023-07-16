import { MysqlDialect } from './mysql';
import { DefaultDialect } from './default';
import { SqliteDialect } from './sqlite';

export const getDialectHandler = (dialect: string) => {
  if (dialect.startsWith('mysql')) {
    return new MysqlDialect();
  }
  if (dialect.includes('sqlite')) {
    return new SqliteDialect();
  }
  return new DefaultDialect();
};
