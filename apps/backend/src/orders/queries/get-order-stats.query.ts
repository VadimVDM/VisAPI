import { IQuery } from '@nestjs/cqrs';

/**
 * Query to retrieve aggregated order statistics
 * Provides insights into order volumes, trends, and metrics
 */
export class GetOrderStatsQuery implements IQuery {
  constructor(
    public readonly period: 'day' | 'week' | 'month' | 'year',
    public readonly branch?: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}