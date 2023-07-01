import request from 'supertest';
import { print } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { Server } from 'http';
import { buildSchema } from '../src/schema';
import { sequelize } from './sequelize';

export const clearDB = async () => {
  if (sequelize.getDialect() === 'mysql') {
    await sequelize.transaction(async (transaction: any) => {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', {
        transaction,
      });
      await sequelize.truncate({ cascade: true, transaction });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', {
        transaction,
      });
    });
  } else {
    await sequelize.truncate({ cascade: true });
  }
};

export async function sendQuery(
  server: Server,
  { query, variables }: { query: any; variables?: any }
): Promise<any> {
  return request(server)
    .post('/graphql')
    .send({
      query: print(query),
      variables,
    });
}

export const getServer = async () => {
  const schema = await buildSchema();
  const yoga = createYoga({
    schema,
  });

  return createServer(yoga);
};
