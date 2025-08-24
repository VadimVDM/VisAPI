import { ISpecification } from './specification.interface';

/**
 * Type for database query objects
 * Supports MongoDB-style query operators
 */
export type QueryObject = {
  [key: string]: unknown;
  $and?: QueryObject[];
  $or?: QueryObject[];
  $not?: QueryObject;
};

/**
 * Abstract base class for specifications
 * Provides default implementations for logical operations
 */
export abstract class Specification<T> implements ISpecification<T> {
  /**
   * Check if entity satisfies the specification
   * Must be implemented by concrete specifications
   */
  abstract isSatisfiedBy(entity: T): boolean;

  /**
   * Convert to database query
   * Must be implemented by concrete specifications
   */
  abstract toQuery(): QueryObject;

  /**
   * Get human-readable description
   * Should be overridden by concrete specifications
   */
  getDescription(): string {
    return this.constructor.name;
  }

  /**
   * Combine with another specification using AND logic
   */
  and(specification: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, specification);
  }

  /**
   * Combine with another specification using OR logic
   */
  or(specification: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, specification);
  }

  /**
   * Negate the specification
   */
  not(): ISpecification<T> {
    return new NotSpecification(this);
  }
}

/**
 * Composite specification for AND operations
 */
export class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }

  toQuery(): QueryObject {
    const leftQuery = this.left.toQuery();
    const rightQuery = this.right.toQuery();

    // Merge queries with AND logic
    if (leftQuery.$and || rightQuery.$and) {
      const conditions: QueryObject[] = [];

      if (leftQuery.$and) {
        conditions.push(...leftQuery.$and);
      } else {
        conditions.push(leftQuery);
      }

      if (rightQuery.$and) {
        conditions.push(...rightQuery.$and);
      } else {
        conditions.push(rightQuery);
      }

      return { $and: conditions };
    }

    return { ...leftQuery, ...rightQuery };
  }

  getDescription(): string {
    return `(${this.left.getDescription()} AND ${this.right.getDescription()})`;
  }
}

/**
 * Composite specification for OR operations
 */
export class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }

  toQuery(): QueryObject {
    const leftQuery = this.left.toQuery();
    const rightQuery = this.right.toQuery();

    return {
      $or: [leftQuery, rightQuery],
    };
  }

  getDescription(): string {
    return `(${this.left.getDescription()} OR ${this.right.getDescription()})`;
  }
}

/**
 * Specification for NOT operations
 */
export class NotSpecification<T> extends Specification<T> {
  constructor(private readonly specification: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return !this.specification.isSatisfiedBy(entity);
  }

  toQuery(): QueryObject {
    const query = this.specification.toQuery();

    // Convert to NOT query
    const notQuery: QueryObject = {};

    for (const key in query) {
      if (key === '$or' || key === '$and') {
        notQuery.$not = query;
      } else {
        notQuery[key] = { $not: query[key] };
      }
    }

    return notQuery;
  }

  getDescription(): string {
    return `NOT (${this.specification.getDescription()})`;
  }
}
