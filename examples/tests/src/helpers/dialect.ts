import { Options } from 'sequelize';

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
      username: 'root',
      password: 'password',
      port: 30306,
      database: 'graphqlize',
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
    return {};
  }
  throw new Error(`Unsupported dialect ${dialect}`);
};
