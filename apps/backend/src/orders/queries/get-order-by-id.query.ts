import { IQuery } from '@nestjs/cqrs';

/**
 * Query to retrieve a single order by its ID
 * Returns detailed order information
 */
export class GetOrderByIdQuery implements IQuery {
  constructor(
    public readonly orderId: string,
    public readonly includeRelations?: boolean,
  ) {}
}