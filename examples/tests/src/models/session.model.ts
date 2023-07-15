import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  sequelize.define(
    'session',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      start: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      end: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      time: {
        allowNull: false,
        defaultValue: '12:00:00',
        type: DataTypes.TIME,
      },
      location: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
    }
  );
};
