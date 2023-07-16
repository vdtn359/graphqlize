import { Options } from 'sequelize';
import * as path from 'path';

export enum Dialect {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
}
export const getSequelizeOptions = (dialect: Dialect): Options => {
  if (dialect === Dialect.MYSQL) {
    return {
      dialect: 'mysql',
      username: 'root',
      password: 'password',
      port: 30306,
      database: 'graphqlize',
      logQueryParameters: true,
      benchmark: true,
    };
  }
  if (dialect === Dialect.POSTGRES) {
    return {
      dialect: 'postgres',
      username: 'postgres',
      password: 'postgres',
      port: 50432,
      database: 'graphqlize',
      logQueryParameters: true,
      benchmark: true,
    };
  }
  if (dialect === Dialect.SQLITE) {
    return {
      dialect: 'sqlite',
      storage: path.resolve(__dirname, '..', '..', '..', 'sqlite', 'sqlite.db'),
      logQueryParameters: true,
      benchmark: true,
    };
  }
  throw new Error(`Unsupported dialect ${dialect}`);
};

export const getSchemaOptions = (dialect: Dialect): any => {
  if (dialect === Dialect.MYSQL) {
    return {
      client: 'mysql2',
      connection: {
        host: '127.0.0.1',
        user: 'root',
        port: 30306,
        password: 'password',
        database: 'graphqlize',
        charset: 'utf8',
      },
    };
  }
  if (dialect === Dialect.POSTGRES) {
    return {
      client: 'pg',
      connection: {
        host: '127.0.0.1',
        user: 'postgres',
        port: 50432,
        password: 'postgres',
        database: 'graphqlize',
        charset: 'utf8',
      },
    };
  }
  if (dialect === Dialect.SQLITE) {
    return {
      client: 'sqlite3',
      connection: {
        filename: path.resolve(
          __dirname,
          '..',
          '..',
          '..',
          'sqlite',
          'sqlite.db'
        ),
      },
    };
  }
  throw new Error(`Unsupported dialect ${dialect}`);
};
