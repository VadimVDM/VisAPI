/**
 * Specification Pattern Interface
 * Enables building complex queries through composition
 */
export interface ISpecification<T> {
  /**
   * Check if the entity satisfies the specification
   */
  isSatisfiedBy(entity: T): boolean;

  /**
   * Combine with another specification using AND logic
   */
  and(specification: ISpecification<T>): ISpecification<T>;

  /**
   * Combine with another specification using OR logic
   */
  or(specification: ISpecification<T>): ISpecification<T>;

  /**
   * Negate the specification
   */
  not(): ISpecification<T>;

  /**
   * Convert to a query object for database operations
   */
  toQuery(): any;

  /**
   * Get a description of what this specification checks
   */
  getDescription(): string;
}