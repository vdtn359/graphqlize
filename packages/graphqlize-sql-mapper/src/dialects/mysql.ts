import { Knex } from 'knex';
import type { BaseDialect } from './base';
import { DefaultDialect } from './default';

export class MysqlDialect extends DefaultDialect implements BaseDialect {
  dayOfWeek(knex: Knex, name: string): any {
    return knex.raw(`DAYOFWEEK(${name})`);
  }

  hour(knex: Knex, name: string): any {
    return knex.raw(`HOUR(${name})`);
  }

  minute(knex: Knex, name: string): any {
    return knex.raw(`MINUTE(${name})`);
  }

  second(knex: Knex, name: string): any {
    return knex.raw(`SECOND(${name})`);
  }

  year(knex: Knex, name: string): any {
    return knex.raw(`YEAR(${name})`);
  }

  month(knex: Knex, name: string): any {
    return knex.raw(`MONTH(${name})`);
  }

  date(knex: Knex, name: string): any {
    return knex.raw(`DATE_FORMAT(${name}, '%Y-%m-%d')`);
  }

  day(knex: Knex, name: string): any {
    return knex.raw(`DAY(${name})`);
  }

  json(knex: Knex, column: string, field: string) {
    return knex.raw(`JSON_UNQUOTE(JSON_EXTRACT(${column}, '$.${field}'))`);
  }
}
