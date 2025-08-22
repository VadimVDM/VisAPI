import { IQuery } from '@nestjs/cqrs';

/**
 * Query to retrieve multiple orders with filtering and pagination
 * Supports various filter criteria for flexible querying
 */
export class GetOrdersQuery implements IQuery {
  constructor(
    public readonly filters?: {
      branch?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
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