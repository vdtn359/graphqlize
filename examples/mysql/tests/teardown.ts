import { sequelize } from './sequelize';

export default async () => {
  await sequelize.close();
  process.exit(0);
};
