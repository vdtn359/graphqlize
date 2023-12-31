import type {
  DatabaseMapper,
  ForeignKeyMetadata,
} from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { hasColumns } from '../utils';

export class HasResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private foreignKey: ForeignKeyMetadata;

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

  async resolve(
    parent: any,
    { pagination, filter, sort }: any,
    context: any,
    info: any
  ) {
    const { referenceTable, columns, referenceColumns } = this.foreignKey;

    if (!hasColumns(parent?.$raw ?? {}, columns)) {
      return [];
    }
    const schemaBuilder = this.tableBuilder.getSchemaBuilder();
    const referencedTableBuilder =
      schemaBuilder.getTableBuilder(referenceTable);
    const referencedTableRepository = referencedTableBuilder.getRepository();
    const translator = this.tableBuilder.getTranslator();
    const dataLoader = this.getOrCreateDataLoader(context, info, () =>
      referencedTableRepository.createDataLoader({
        columns: referenceColumns,
        pagination,
        filter,
        sort,
      })
    );

    const result = await dataLoader.load(
      referenceColumns.reduce(
        (agg, referenceColumn, currentIndex) => ({
          ...agg,
          [referenceColumn]: parent.$raw[columns[currentIndex]],
        }),
        {}
      )
    );
    return result.map((item: any) => translator.convertFromDB(item));
  }
}
