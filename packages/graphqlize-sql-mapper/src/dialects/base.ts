import { Knex } from 'knex';
import Raw = Knex.Raw;

export interface BaseDialect {
  year(knex: Knex, name: string): Raw;
  month(knex: Knex, name: string): Raw;
  date(knex: Knex, name: string): Raw;
  hour(knex: Knex, name: string): Raw;
  minute(knex: Knex, name: string): Raw;
  second(knex: Knex, name: string): Raw;
  dayOfWeek(knex: Knex, name: string): Raw;
  day(knex: Knex, name: string): Raw;
}
