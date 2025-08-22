import { ISpecification } from './specification.interface';
import { Specification } from './specification.base';
import {
  OrderByBranchSpecification,
  OrderByStatusSpecification,
  OrderByDateRangeSpecification,
  OrderByMinAmountSpecification,
  OrderWithWhatsAppEnabledSpecification,
  UnprocessedOrderSpecification,
  OrderByClientEmailSpecification,
  OrderByVisaTypeSpecification,
  HighPriorityOrderSpecification,
} from './order.specifications';

/**
 * Fluent builder for creating complex order specifications
 * Enables elegant query construction through method chaining
 */
export class OrderSpecificationBuilder {
  private specifications: ISpecification<any>[] = [];
  private combineWithAnd = true;

  /**
   * Filter by branch
   */
  withBranch(branch: string): this {
    this.specifications.push(new OrderByBranchSpecification(branch));
    return this;
  }

  /**
   * Filter by multiple branches
   */
  withBranches(branches: string[]): this {
    if (branches.length === 0) return this;
    
    const branchSpecs = branches.map(branch => new OrderByBranchSpecification(branch));
    const orSpec: ISpecification<any> | null = branchSpecs.reduce((acc: ISpecification<any> | null, spec) => 
      acc ? acc.or(spec) : spec,
      null as ISpecification<any> | null
    );
    
    if (orSpec) {
      this.specifications.push(orSpec);
    }
    
    return this;
  }

  /**
   * Filter by status
   */
  withStatus(status: string): this {
    this.specifications.push(new OrderByStatusSpecification(status));
    return this;
  }

  /**
   * Filter by date range
   */
  withinDateRange(startDate: Date, endDate: Date): this {
    this.specifications.push(new OrderByDateRangeSpecification(startDate, endDate));
    return this;
  }

  /**
   * Filter by minimum amount
   */
  withMinAmount(amount: number): this {
    this.specifications.push(new OrderByMinAmountSpecification(amount));
    return this;
  }

  /**
   * Filter for WhatsApp enabled orders
   */
  withWhatsAppEnabled(): this {
    this.specifications.push(new OrderWithWhatsAppEnabledSpecification());
    return this;
  }

  /**
   * Filter for unprocessed orders
   */
  unprocessedOnly(): this {
    this.specifications.push(new UnprocessedOrderSpecification());
    return this;
  }

  /**
   * Filter by client email
   */
  withClientEmail(email: string): this {
    this.specifications.push(new OrderByClientEmailSpecification(email));
    return this;
  }

  /**
   * Filter by visa type
   */
  withVisaType(visaType: string): this {
    this.specifications.push(new OrderByVisaTypeSpecification(visaType));
    return this;
  }

  /**
   * Apply high-priority filter
   */
  highPriorityOnly(): this {
    this.specifications.push(new HighPriorityOrderSpecification());
    return this;
  }

  /**
   * Add custom specification
   */
  withCustom(specification: ISpecification<any>): this {
    this.specifications.push(specification);
    return this;
  }

  /**
   * Use OR logic for combining specifications
   */
  useOrLogic(): this {
    this.combineWithAnd = false;
    return this;
  }

  /**
   * Use AND logic for combining specifications (default)
   */
  useAndLogic(): this {
    this.combineWithAnd = true;
    return this;
  }

  /**
   * Build the final specification
   */
  build(): ISpecification<any> | null {
    if (this.specifications.length === 0) {
      return null;
    }

    if (this.specifications.length === 1) {
      return this.specifications[0];
    }

    // Combine all specifications
    return this.specifications.reduce((combined, spec) => {
      if (!combined) return spec;
      
      return this.combineWithAnd 
        ? combined.and(spec)
        : combined.or(spec);
    });
  }

  /**
   * Build and get the database query
   */
  toQuery(): any {
    const specification = this.build();
    return specification ? specification.toQuery() : {};
  }

  /**
   * Get description of the built specification
   */
  getDescription(): string {
    const specification = this.build();
    return specification ? specification.getDescription() : 'No specifications';
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.specifications = [];
    this.combineWithAnd = true;
    return this;
  }

  /**
   * Create a new builder instance
   */
  static create(): OrderSpecificationBuilder {
    return new OrderSpecificationBuilder();
  }
}

/**
 * Factory for common specification combinations
 */
export class OrderSpecificationFactory {
  /**
   * Get today's orders specification
   */
  static todaysOrders(): ISpecification<any> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    return new OrderByDateRangeSpecification(startOfDay, endOfDay);
  }

  /**
   * Get this week's orders specification
   */
  static thisWeeksOrders(): ISpecification<any> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return new OrderByDateRangeSpecification(startOfWeek, endOfWeek);
  }

  /**
   * Get pending processing specification
   */
  static pendingProcessing(): ISpecification<any> {
    return new UnprocessedOrderSpecification()
      .and(new OrderWithWhatsAppEnabledSpecification());
  }

  /**
   * Get high-value orders specification
   */
  static highValueOrders(threshold = 10000): ISpecification<any> {
    return new OrderByMinAmountSpecification(threshold);
  }

  /**
   * Get orders needing attention
   */
  static needingAttention(): ISpecification<any> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return new UnprocessedOrderSpecification()
      .and(new OrderByDateRangeSpecification(new Date(0), threeDaysAgo));
  }
}