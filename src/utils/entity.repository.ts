import {
  AggregateOptions,
  ClientSession,
  Document,
  QueryFilter,
  InsertManyOptions,
  Model,
  PipelineStage,
  PopulateOptions,
  QueryOptions,
  SaveOptions,
  SortOrder,
  UpdateQuery,
  HydratedDocument,
} from 'mongoose';

type Population = PopulateOptions | (PopulateOptions | string)[];

type Options = {
  sort?: { [key: string]: SortOrder };
  projection?: Record<string, unknown>;
  populate?: Population;
  skip?: number;
  limit?: number;
  lean?: boolean;
  select?: string | string[];
};

export abstract class EntityRepository<T extends Object> {
  protected constructor(protected entityModel: Model<T>) {}

  async findOne(
    filter: QueryFilter<T>,
    options?: Options,
    session?: ClientSession,
  ) {
    const { sort, projection, populate, limit, select } = options || {};

    const query = this.entityModel.findOne(filter, projection, { session });

    if (sort) query.sort(sort);
    if (limit) query.limit(limit);
    if (populate) query.populate(populate);
    if (select) query.select(select);

    return query.exec();
  }
  async find(filter: QueryFilter<T>, options?: Options) {
    const { sort, projection, populate, skip, limit, lean } = options || {};
    const query = this.entityModel.find(filter, { ...projection });
    if (sort) query.sort(sort);
    if (populate) query.populate(populate);
    if (skip) query.skip(skip);
    if (limit) query.limit(limit);
    if (lean) query.lean();
    return query.exec();
  }

  async create(
    createEntityData: Partial<T>,
    options?: SaveOptions,
  ): Promise<HydratedDocument<T>> {
    const entity = new this.entityModel(createEntityData);
    return entity.save(options) as unknown as Promise<HydratedDocument<T>>;
  }

  async insertMany(entitiesData: unknown, options?: InsertManyOptions) {
    return this.entityModel.insertMany(entitiesData, options ?? {});
  }

  async findOneAndUpdate(
    filter: QueryFilter<T>,
    updateEntityData: UpdateQuery<T>,
    populate?: PopulateOptions,
    session?: ClientSession,
    select?: string,
  ) {
    const query = this.entityModel.findOneAndUpdate(filter, updateEntityData, {
      new: true,
      // use findOneAndUpdate to return the updated document
      // 'new: true' ensures the returned doc is the updated one
      session,
    });
    if (populate) query.populate(populate as any);
    if (select) query.select(select);
    return query.exec();
  }

  async updateOne(filter: QueryFilter<T>, updateEntityData: UpdateQuery<T>) {
    return this.entityModel.updateOne(filter, updateEntityData);
  }

  async exists(filter: QueryFilter<T>) {
    return this.entityModel.exists(filter);
  }

  async count(filter?: QueryFilter<T>) {
    return this.entityModel.countDocuments(filter);
  }

  async deleteMany(filter?: QueryFilter<T>, options?: Record<string, any>) {
    return this.entityModel.deleteMany(filter, options);
  }

  async updateMany(
    filter: QueryFilter<T> = {},
    updateEntityData: UpdateQuery<T>,
  ) {
    return this.entityModel.updateMany(filter, updateEntityData);
  }

  async findOneAndDelete(filter: QueryFilter<T>, options?: QueryOptions) {
    return this.entityModel.findOneAndDelete(filter, options);
  }

  async aggregate(pipeline: PipelineStage[], options?: AggregateOptions) {
    return this.entityModel.aggregate(pipeline, options);
  }
}
