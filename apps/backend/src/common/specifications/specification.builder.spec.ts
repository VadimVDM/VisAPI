import { OrderSpecificationBuilder, OrderSpecificationFactory } from './specification.builder';

describe('OrderSpecificationBuilder', () => {
  let builder: OrderSpecificationBuilder;

  beforeEach(() => {
    builder = OrderSpecificationBuilder.create();
  });

  describe('Single Specifications', () => {
    it('should build specification for branch filter', () => {
      // Act
      const query = builder.withBranch('IL').toQuery();

      // Assert
      expect(query).toEqual({ branch: 'IL' });
    });

    it('should build specification for status filter', () => {
      // Act
      const query = builder.withStatus('processed').toQuery();

      // Assert
      expect(query).toEqual({ status: 'processed' });
    });

    it('should build specification for minimum amount', () => {
      // Act
      const query = builder.withMinAmount(5000).toQuery();

      // Assert
      expect(query).toEqual({ amount: { $gte: 5000 } });
    });

    it('should build specification for date range', () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Act
      const query = builder.withinDateRange(startDate, endDate).toQuery();

      // Assert
      expect(query).toEqual({
        created_at: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    });
  });

  describe('Composite Specifications with AND logic', () => {
    it('should combine multiple specifications with AND logic', () => {
      // Act
      const query = builder
        .withBranch('IL')
        .withStatus('pending')
        .withMinAmount(1000)
        .toQuery();

      // Assert
      expect(query).toEqual({
        branch: 'IL',
        status: 'pending',
        amount: { $gte: 1000 },
      });
    });

    it('should handle complex AND combinations', () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Act
      const query = builder
        .withBranch('US')
        .withinDateRange(startDate, endDate)
        .withWhatsAppEnabled()
        .unprocessedOnly()
        .toQuery();

      // Assert
      expect(query).toEqual({
        branch: 'US',
        created_at: {
          $gte: startDate,
          $lte: endDate,
        },
        whatsapp_alerts_enabled: true,
        processed_at: null,
      });
    });
  });

  describe('Composite Specifications with OR logic', () => {
    it('should combine specifications with OR logic when specified', () => {
      // Act
      const specification = builder
        .useOrLogic()
        .withBranch('IL')
        .withBranch('US')
        .build();
      
      const description = specification?.getDescription() || '';

      // Assert
      expect(description).toContain('OR');
    });

    it('should handle multiple branches with OR logic', () => {
      // Act
      const query = builder.withBranches(['IL', 'US', 'UK']).toQuery();

      // Assert
      expect(query).toEqual({
        $or: [
          {
            $or: [
              { branch: 'IL' },
              { branch: 'US' },
            ],
          },
          { branch: 'UK' },
        ],
      });
    });
  });

  describe('Builder Reset', () => {
    it('should reset specifications when reset is called', () => {
      // Arrange
      builder.withBranch('IL').withStatus('pending');

      // Act
      builder.reset();
      const query = builder.toQuery();

      // Assert
      expect(query).toEqual({});
    });
  });

  describe('Description Generation', () => {
    it('should generate meaningful descriptions', () => {
      // Act
      const description = builder
        .withBranch('IL')
        .withMinAmount(5000)
        .highPriorityOnly()
        .getDescription();

      // Assert
      expect(description).toContain('Order from branch IL');
      expect(description).toContain('AND');
    });
  });
});

describe('OrderSpecificationFactory', () => {
  describe('Predefined Specifications', () => {
    it('should create specification for today\'s orders', () => {
      // Act
      const spec = OrderSpecificationFactory.todaysOrders();
      const query = spec.toQuery();

      // Assert
      expect(query.created_at).toBeDefined();
      expect(query.created_at.$gte).toBeInstanceOf(Date);
      expect(query.created_at.$lte).toBeInstanceOf(Date);
      
      // Verify it's today
      const startDate = query.created_at.$gte;
      const endDate = query.created_at.$lte;
      expect(startDate.getDate()).toBe(new Date().getDate());
      expect(endDate.getDate()).toBe(new Date().getDate());
    });

    it('should create specification for high-value orders', () => {
      // Act
      const spec = OrderSpecificationFactory.highValueOrders(15000);
      const query = spec.toQuery();

      // Assert
      expect(query).toEqual({
        amount: { $gte: 15000 },
      });
    });

    it('should create specification for orders needing attention', () => {
      // Act
      const spec = OrderSpecificationFactory.needingAttention();
      const query = spec.toQuery();

      // Assert
      expect(query.processed_at).toBeNull();
      expect(query.created_at).toBeDefined();
      expect(query.created_at.$lte).toBeInstanceOf(Date);
    });

    it('should create specification for pending processing', () => {
      // Act
      const spec = OrderSpecificationFactory.pendingProcessing();
      const query = spec.toQuery();

      // Assert
      expect(query).toEqual({
        processed_at: null,
        whatsapp_alerts_enabled: true,
      });
    });
  });
});