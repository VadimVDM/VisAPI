/**
 * Base domain event class
 */
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId?: string;
  public readonly userId?: string;
  public readonly correlationId?: string;

  constructor(data: {
    eventType: string;
    aggregateId?: string;
    userId?: string;
    correlationId?: string;
  }) {
    this.occurredAt = new Date();
    this.eventId = this.generateEventId();
    this.eventType = data.eventType;
    this.aggregateId = data.aggregateId;
    this.userId = data.userId;
    this.correlationId = data.correlationId;
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract getPayload(): Record<string, any>;
}

/**
 * Order domain events
 */
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly clientEmail: string,
    public readonly branch: string,
    public readonly amount: number,
    userId?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'order.created',
      aggregateId: orderId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      orderId: this.orderId,
      clientEmail: this.clientEmail,
      branch: this.branch,
      amount: this.amount,
    };
  }
}

export class OrderProcessedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly workflowId: string,
    public readonly jobId: string,
    userId?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'order.processed',
      aggregateId: orderId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      orderId: this.orderId,
      workflowId: this.workflowId,
      jobId: this.jobId,
    };
  }
}

export class OrderWhatsAppSentEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly phoneNumber: string,
    public readonly messageId: string,
    userId?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'order.whatsapp.sent',
      aggregateId: orderId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      orderId: this.orderId,
      phoneNumber: this.phoneNumber,
      messageId: this.messageId,
    };
  }
}

export class OrderCBBSyncedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly cbbContactId: string,
    userId?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'order.cbb.synced',
      aggregateId: orderId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      orderId: this.orderId,
      cbbContactId: this.cbbContactId,
    };
  }
}

export class OrderSyncRequestedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      orderId: string;
      syncType: 'CBB' | 'WhatsApp' | 'Workflow';
      branch: string;
      whatsappAlertsEnabled: boolean;
      delayMs: number;
      error?: string;
    },
    userId?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'order.sync.requested',
      aggregateId: data.orderId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return this.data;
  }
}

/**
 * Workflow domain events
 */
export class WorkflowCreatedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly name: string,
    public readonly createdBy: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'workflow.created',
      aggregateId: workflowId,
      userId: createdBy,
      correlationId,
    });
  }

  getPayload() {
    return {
      workflowId: this.workflowId,
      name: this.name,
      createdBy: this.createdBy,
    };
  }
}

export class WorkflowExecutedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly executionId: string,
    public readonly status: 'started' | 'completed' | 'failed',
    public readonly error?: string,
    userId?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'workflow.executed',
      aggregateId: workflowId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      workflowId: this.workflowId,
      executionId: this.executionId,
      status: this.status,
      error: this.error,
    };
  }
}

/**
 * API Key domain events
 */
export class ApiKeyCreatedEvent extends DomainEvent {
  constructor(
    public readonly apiKeyId: string,
    public readonly name: string,
    public readonly scopes: string[],
    public readonly createdBy: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'apikey.created',
      aggregateId: apiKeyId,
      userId: createdBy,
      correlationId,
    });
  }

  getPayload() {
    return {
      apiKeyId: this.apiKeyId,
      name: this.name,
      scopes: this.scopes,
      createdBy: this.createdBy,
    };
  }
}

export class ApiKeyUsedEvent extends DomainEvent {
  constructor(
    public readonly apiKeyId: string,
    public readonly endpoint: string,
    public readonly ipAddress: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'apikey.used',
      aggregateId: apiKeyId,
      correlationId,
    });
  }

  getPayload() {
    return {
      apiKeyId: this.apiKeyId,
      endpoint: this.endpoint,
      ipAddress: this.ipAddress,
    };
  }
}

export class ApiKeyRevokedEvent extends DomainEvent {
  constructor(
    public readonly apiKeyId: string,
    public readonly revokedBy: string,
    public readonly reason?: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'apikey.revoked',
      aggregateId: apiKeyId,
      userId: revokedBy,
      correlationId,
    });
  }

  getPayload() {
    return {
      apiKeyId: this.apiKeyId,
      revokedBy: this.revokedBy,
      reason: this.reason,
    };
  }
}

/**
 * User domain events
 */
export class UserSignedUpEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'user.signedup',
      aggregateId: userId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      userId: this.userId,
      email: this.email,
      name: this.name,
    };
  }
}

export class UserSignedInEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly ipAddress: string,
    correlationId?: string,
  ) {
    super({
      eventType: 'user.signedin',
      aggregateId: userId,
      userId,
      correlationId,
    });
  }

  getPayload() {
    return {
      userId: this.userId,
      email: this.email,
      ipAddress: this.ipAddress,
    };
  }
}
