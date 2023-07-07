import type {
  DatabaseMapper,
  ForeignKeyMetadata,
} from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { hasColumns } from '../utils';

export class HasCountResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private readonly foreignKey: ForeignKeyMetadata;

  constructor({
    mapper,
    tableBuilder,
    foreignKey,
  }: {
    mapper: DatabaseMapper;
    tableBuilder: TableBuilder;
    foreignKey: ForeignKeyMetadata;
  }) {
    super(tableBuilder);
    this.mapper = mapper;
    this.foreignKey = foreignKey;
  }

  async resolve(parent: any, { filter }: any, context: any, info: any) {
    const { referenceTable, columns, referenceColumns } = this.foreignKey;

    if (!hasColumns(parent?.$raw ?? {}, columns)) {
      return [];
    }
    const schemaBuilder = this.tableBuilder.getSchemaBuilder();
    const referencedTableBuilder =
      schemaBuilder.getTableBuilder(referenceTable);
    const referencedTableRepository = referencedTableBuilder.getRepository();
    const dataLoader = this.getOrCreateDataLoader(context, info, () =>
      referencedTableRepository.createCountDataLoader({
        columns: referenceColumns,
        filter,
      })
    );

    return (
      dataLoader.load(
        referenceColumns.reduce(
          (agg, referenceColumn, currentIndex) => ({
            ...agg,
            [referenceColumn]: parent.$raw[columns[currentIndex]],
          }),
          {}
        )
      ) ?? 0
    );
  }
}
