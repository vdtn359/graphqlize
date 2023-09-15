import type {
  DatabaseMapper,
  Pagination,
  SortDirection,
  TableMapper,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import DataLoader from 'dataloader';
import { uniqBy } from 'lodash';

export class Repository<T = any> {
  private readonly uniqueDataLoaders: Record<
    string,
    DataLoader<Record<string, any>, T[]>
  > = {};

  private readonly multiDataLoaders: Record<
    string,
    DataLoader<Record<string, any>, T[]>
  > = {};

  private tableMapper: TableMapper<T>;

  constructor(
    private readonly tableMetadata: TableMetadata,
    private readonly mapper: DatabaseMapper
  ) {
    this.tableMapper = this.mapper.getTableMapper<T>(this.tableMetadata.name);
    for (const candidateKeys of Object.values(tableMetadata.candidateKeys)) {
      this.initDataLoader(candidateKeys, true);
    }

    for (const { referenceColumns } of Object.values(tableMetadata.hasMany)) {
      this.initDataLoader(referenceColumns, true);
    }

    for (const { referenceColumns } of Object.values(tableMetadata.hasOne)) {
      this.initDataLoader(referenceColumns, true);
    }

    for (const { columns } of Object.values(tableMetadata.belongsTo)) {
      this.initDataLoader(columns);
    }
  }

  getDataLoaderName(columns: string[]) {
    return columns.sort().join(',');
  }

  private initDataLoader(columns: string[], unique?: boolean) {
    const dataLoaders = unique ? this.uniqueDataLoaders : this.multiDataLoaders;
    const dataLoaderName = this.getDataLoaderName(columns);
    if (dataLoaders[dataLoaderName]) {
      return;
    }
    dataLoaders[dataLoaderName] = this.createDataLoader({
      columns,
      unique,
    });
  }

  createDataLoader({
    columns,
    unique = false,
    filter,
    pagination,
    sort,
  }: {
    columns: string[];
    unique?: boolean;
    pagination?: Pagination;
    filter?: Record<string, any>;
    sort?: Record<string, any>[];
  }) {
    return new DataLoader<Record<string, any>, any>(async (keys) => {
      const uniqueKeys = uniqBy(keys, (key) => JSON.stringify(key));
      const result = await this.tableMapper.findByFilter({
        partitions: uniqueKeys,
        filter,
        pagination: unique
          ? { limit: uniqueKeys.length, offset: 0, ...pagination }
          : pagination,
        sort,
      });
      const resultMap: Record<string, T[]> = {};
      for (const item of result) {
        const key = this.getByColumns(columns, item);
        if (!resultMap[key]) {
          resultMap[key] = [];
        }
        resultMap[key].push(item);
      }

      return keys.map((key) => {
        const currentValue = this.getByColumns(columns, key);
        const values = resultMap[currentValue] ?? [];
        for (const value of values) {
          this.preload(value);
        }
        if (unique) {
          return (resultMap[currentValue] ?? [])[0] ?? null;
        }
        return values;
      });
    });
  }

  createCountDataLoader({
    columns,
    filter,
  }: {
    columns: string[];
    filter?: Record<string, any>;
  }) {
    return new DataLoader<Record<string, any>, any>(async (keys) => {
      const result = await this.tableMapper.aggregateByFilter({
        partitions: keys,
        filter,
        groupBy: columns.reduce(
          (agg, column) => ({
            ...agg,
            [column]: true,
          }),
          {}
        ),
        fields: {
          count: {
            _all: true,
          },
          group: true,
        },
      });
      const resultMap: Record<string, number> = {};
      for (const item of result) {
        const key = this.getByColumns(columns, item.group);
        // eslint-disable-next-line no-underscore-dangle
        resultMap[key] = item.count?._all ?? 0;
      }

      return keys.map((key) => {
        const currentValue = this.getByColumns(columns, key);
        return resultMap[currentValue] ?? 0;
      });
    });
  }

  async loadOne(columns: string[], key: Record<string, any>) {
    const dataLoaderName = this.getDataLoaderName(columns);
    if (this.uniqueDataLoaders[dataLoaderName]) {
      return this.uniqueDataLoaders[dataLoaderName].load(key);
    }
    if (this.multiDataLoaders[dataLoaderName]) {
      const results =
        (await this.multiDataLoaders[dataLoaderName].load(key)) ?? [];
      return results[0] ?? null;
    }
    return null;
  }

  async loadMany(columns: string[], key: Record<string, any>) {
    const dataLoaderName = this.getDataLoaderName(columns);
    if (this.multiDataLoaders[dataLoaderName]) {
      return this.multiDataLoaders[dataLoaderName].load(key);
    }
    if (this.uniqueDataLoaders[dataLoaderName]) {
      const result = await this.uniqueDataLoaders[dataLoaderName].load(key);
      return result ? [result] : [];
    }
    return [];
  }

  preload(record: any) {
    for (const [dataLoaderName, dataLoader] of Object.entries(
      this.uniqueDataLoaders
    )) {
      const columns = dataLoaderName.split(',');
      const key = columns.reduce(
        (agg, current) => ({
          ...agg,
          [current]: record[current],
        }),
        {}
      );
      dataLoader.prime(key, record);
    }
  }

  private getByColumns(columns: string[], item: any) {
    return JSON.stringify(columns.map((column) => item[column]));
  }

  list({
    filter,
    pagination,
    sort,
  }: {
    filter?: Record<string, any>;
    pagination?: Pagination;
    sort?: Record<string, SortDirection>[];
  }) {
    return this.tableMapper.findByFilter({ filter, pagination, sort });
  }

  count({ filter }: { filter?: Record<string, any> }) {
    return this.tableMapper.countByFilter({ filter });
  }

  aggregate({
    filter,
    fields,
    groupBy,
    having,
    pagination,
    sort,
  }: {
    filter?: Record<string, any>;
    groupBy?: Record<string, any>;
    having?: Record<string, any>;
    fields: Record<string, any>;
    pagination?: Pagination;
    sort?: Record<string, any>[];
  }) {
    return this.tableMapper.aggregateByFilter({
      filter,
      fields,
      groupBy,
      having,
      pagination,
      sort,
    });
  }

  aggregateCount({
    filter,
    fields,
    having,
    groupBy,
  }: {
    filter?: Record<string, any>;
    groupBy?: Record<string, any>;
    having?: Record<string, any>;
    fields: Record<string, any>;
  }) {
    return this.tableMapper.aggregateCountByFilter({
      filter,
      fields,
      groupBy,
      having,
    });
  }
}
