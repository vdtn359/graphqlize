import { SqlMapper } from './index';

async function run() {
  await SqlMapper.create({
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'stackla',
      charset: 'utf8',
    },
  });
}

run();
