import { Knex } from 'knex';
import { BaseDialect } from './base';

export class DefaultDialect implements BaseDialect {
  dayOfWeek(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('DAYOFWEEK', ${name})`);
  }

  hour(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('HOUR', ${name})`);
  }

  minute(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('MINUTE', ${name})`);
  }

  second(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('SECOND', ${name})`);
  }

  year(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('YEAR', ${name})`);
  }

  month(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('MONTH', ${name})`);
  }

  day(knex: Knex, name: string) {
    return knex.raw(`DATE_PART('DAY', ${name})`);
  }

  date(knex: Knex, name: string) {
    return knex.raw(`DATE(${name})`);
  }

  json(knex: Knex, column: string, field: string) {
    return knex.raw(`JSON_UNQUOTE(JSON_EXTRACT(${column}, '$.${field}'))`);
  }
}
