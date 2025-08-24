import { IQuery } from '@nestjs/cqrs';

/**
 * Query to retrieve multiple orders with filtering and pagination
 * Supports various filter criteria for flexible querying
 */
export class GetOrdersQuery implements IQuery {
  constructor(
    public readonly filters?: {
      branch?: string;
      orderStatus?: string; // Changed from status to match database column
      startDate?: string; // Changed to string for ISO dates
      endDate?: string; // Changed to string for ISO dates
      clientEmail?: string;
      whatsappEnabled?: boolean;
    },
    public readonly pagination?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}
