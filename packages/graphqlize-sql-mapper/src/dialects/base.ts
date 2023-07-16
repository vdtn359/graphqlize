import { Knex } from 'knex';

export interface BaseDialect {
  year(knex: Knex, name: string): Knex.Raw;
  month(knex: Knex, name: string): Knex.Raw;
  date(knex: Knex, name: string): Knex.Raw;
  hour(knex: Knex, name: string): Knex.Raw;
  minute(knex: Knex, name: string): Knex.Raw;
  second(knex: Knex, name: string): Knex.Raw;
  dayOfWeek(knex: Knex, name: string): Knex.Raw;
  day(knex: Knex, name: string): Knex.Raw;
  transform(value: any): any;
}
