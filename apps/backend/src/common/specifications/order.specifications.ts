import { Specification, QueryObject } from './specification.base';

/**
 * Order entity interface for specifications
 */
interface Order {
  id: string;
  order_id: string;
  branch: string;
  status?: string;
  amount?: number;
  client_email?: string;
  client_phone?: string;
  whatsapp_alerts_enabled?: boolean;
  created_at: Date;
  processed_at?: Date;
  visa_type?: string;
}

/**
 * Specification for orders from a specific branch
 */
export class OrderByBranchSpecification extends Specification<Order> {
  constructor(private readonly branch: string) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.branch === this.branch;
  }

  toQuery(): QueryObject {
    return { branch: this.branch };
  }

  getDescription(): string {
    return `Order from branch ${this.branch}`;
  }
}

/**
 * Specification for orders with a specific status
 */
export class OrderByStatusSpecification extends Specification<Order> {
  constructor(private readonly status: string) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.status === this.status;
  }

  toQuery(): QueryObject {
    return { status: this.status };
  }

  getDescription(): string {
    return `Order with status ${this.status}`;
  }
}

/**
 * Specification for orders within a date range
 */
export class OrderByDateRangeSpecification extends Specification<Order> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
  ) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    const orderDate = new Date(order.created_at);
    return orderDate >= this.startDate && orderDate <= this.endDate;
  }

  toQuery(): QueryObject {
    return {
      created_at: {
        $gte: this.startDate,
        $lte: this.endDate,
      },
    };
  }

  getDescription(): string {
    return `Order created between ${this.startDate.toISOString()} and ${this.endDate.toISOString()}`;
  }
}

/**
 * Specification for orders above a certain amount
 */
export class OrderByMinAmountSpecification extends Specification<Order> {
  constructor(private readonly minAmount: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return (order.amount || 0) >= this.minAmount;
  }

  toQuery(): QueryObject {
    return {
      amount: { $gte: this.minAmount },
    };
  }

  getDescription(): string {
    return `Order with amount >= ${this.minAmount}`;
  }
}

/**
 * Specification for orders with WhatsApp alerts enabled
 */
export class OrderWithWhatsAppEnabledSpecification extends Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.whatsapp_alerts_enabled === true;
  }

  toQuery(): QueryObject {
    return { whatsapp_alerts_enabled: true };
  }

  getDescription(): string {
    return 'Order with WhatsApp alerts enabled';
  }
}

/**
 * Specification for unprocessed orders
 */
export class UnprocessedOrderSpecification extends Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return !order.processed_at;
  }

  toQuery(): QueryObject {
    return {
      processed_at: null,
    };
  }

  getDescription(): string {
    return 'Unprocessed order';
  }
}

/**
 * Specification for orders by client email
 */
export class OrderByClientEmailSpecification extends Specification<Order> {
  constructor(private readonly email: string) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.client_email === this.email;
  }

  toQuery(): QueryObject {
    return { client_email: this.email };
  }

  getDescription(): string {
    return `Order from client ${this.email}`;
  }
}

/**
 * Specification for orders by visa type
 */
export class OrderByVisaTypeSpecification extends Specification<Order> {
  constructor(private readonly visaType: string) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.visa_type === this.visaType;
  }

  toQuery(): QueryObject {
    return { visa_type: this.visaType };
  }

  getDescription(): string {
    return `Order for ${this.visaType} visa`;
  }
}

/**
 * Specification for high-priority orders
 * Combines multiple criteria: specific branches, high amounts, and WhatsApp enabled
 */
export class HighPriorityOrderSpecification extends Specification<Order> {
  private readonly priorityBranches = ['IL', 'US', 'UK'];
  private readonly highAmountThreshold = 5000;

  isSatisfiedBy(order: Order): boolean {
    const isPriorityBranch = this.priorityBranches.includes(order.branch);
    const isHighAmount = (order.amount || 0) >= this.highAmountThreshold;
    const hasWhatsApp = order.whatsapp_alerts_enabled === true;
    
    return isPriorityBranch && (isHighAmount || hasWhatsApp);
  }

  toQuery(): QueryObject {
    return {
      $and: [
        { branch: { $in: this.priorityBranches } },
        {
          $or: [
            { amount: { $gte: this.highAmountThreshold } },
            { whatsapp_alerts_enabled: true },
          ],
        },
      ],
    };
  }

  getDescription(): string {
    return 'High-priority order (priority branch with high amount or WhatsApp alerts)';
  }
}