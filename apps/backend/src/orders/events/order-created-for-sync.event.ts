/**
 * Event emitted when an order is created and needs sync
 * This is a proper event class for NestJS CQRS saga handling
 */
export class OrderCreatedForSyncEvent {
  public readonly type = 'OrderCreatedForSync';

  constructor(
    public readonly orderId: string,
    public readonly branch: string,
    public readonly whatsappEnabled: boolean,
    public readonly correlationId?: string,
  ) {}
}