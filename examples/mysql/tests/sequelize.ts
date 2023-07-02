import { Sequelize } from 'sequelize';
import {
  InstrumentBuilder,
  OrchestraBuilder,
  StatsBuilder,
  UserBuilder,
  UserSessionBuilder,
  SessionBuilder,
} from './models';
import { associate } from './association';

const logging = process.env.LOG_LEVEL === 'debug' ? undefined : false;

export const sequelize = new Sequelize({
  dialect: 'mysql',
  username: 'root',
  password: 'password',
  port: 30306,
  database: 'graphqlize',
  logQueryParameters: true,
  benchmark: true,
  ...(logging !== undefined ? { logging } : undefined),
});

const modelDefiners = [
  UserBuilder,
  InstrumentBuilder,
  OrchestraBuilder,
  StatsBuilder,
  UserSessionBuilder,
  SessionBuilder,
];

for (const modelDefiner of modelDefiners) {
  modelDefiner(sequelize);
}

associate(sequelize);