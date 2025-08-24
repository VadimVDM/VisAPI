import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './domain-events';
import { LogService } from '@visapi/backend-logging';

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly eventHandlers = new Map<string, EventHandler[]>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logService: LogService,
  ) {}

  /**
   * Publish a domain event
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      // Log the event
      await this.logEvent(event);

      // Emit the event
      this.eventEmitter.emit(event.eventType, event);

      // Also emit a wildcard event for global listeners
      this.eventEmitter.emit('domain.*', event);

      this.logger.debug(
        `Published event: ${event.eventType} with ID: ${event.eventId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventType}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Register an event handler
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);

    // Also register with EventEmitter2
    this.eventEmitter.on(eventType, async (event: DomainEvent) => {
      try {
        await handler.handle(event);
      } catch (error) {
        this.logger.error(`Handler failed for event ${eventType}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event type
   */
  subscribe(
    eventType: string,
    callback: (event: DomainEvent) => Promise<void>,
  ): void {
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Subscribe to all events
   */
  subscribeToAll(callback: (event: DomainEvent) => Promise<void>): void {
    this.eventEmitter.on('domain.*', callback);
  }

  /**
   * Log domain event to database
   */
  private async logEvent(event: DomainEvent): Promise<void> {
    try {
      await this.logService.createLog({
        level: 'info',
        message: `Domain event: ${event.eventType}`,
        correlation_id: event.correlationId,
        metadata: {
          eventId: event.eventId,
          aggregateId: event.aggregateId,
          userId: event.userId,
          eventType: event.eventType,
          payload: event.getPayload(),
          occurredAt: event.occurredAt.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log domain event:', error);
    }
  }

  /**
   * Get event statistics
   */
  getStatistics(): {
    registeredHandlers: Record<string, number>;
    eventTypes: string[];
  } {
    const registeredHandlers: Record<string, number> = {};
    this.eventHandlers.forEach((handlers, eventType) => {
      registeredHandlers[eventType] = handlers.length;
    });

    return {
      registeredHandlers,
      eventTypes: Array.from(this.eventHandlers.keys()),
    };
  }
}
