import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LogService } from '@visapi/backend-logging';
import { OrdersRepository, OrderRecord } from '@visapi/backend-repositories';
import {
  ResyncCBBContactDto,
  ResyncCBBResultDto,
} from '../dto/resync-cbb-contact.dto';
import { CBBContactSyncResult } from '@visapi/shared-types';
import { CBBSyncOrchestratorService } from '../../../queue/services/cbb-sync-orchestrator.service';

@Injectable()
export class ViziCbbResyncService {
  private readonly logger = new Logger(ViziCbbResyncService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cbbSyncOrchestrator: CBBSyncOrchestratorService,
    private readonly logService: LogService,
  ) {}

  async resync(
    dto: ResyncCBBContactDto,
    correlationId: string,
  ): Promise<ResyncCBBResultDto> {
    this.logger.log(
      `CBB resync initiated with DTO: ${JSON.stringify(dto)}`,
      correlationId,
    );

    if (!dto.phoneNumber && !dto.orderId && !dto.viziOrderId) {
      throw new BadRequestException(
        'At least one of phoneNumber, orderId, or viziOrderId must be provided',
      );
    }

    await this.logService.createLog({
      level: 'info',
      message: 'CBB resync operation initiated',
      metadata: { ...dto, source: 'admin_resync' },
      correlation_id: correlationId,
    });

    try {
      const order = await this.findOrder(dto);

      if (order.branch?.toLowerCase() !== 'il') {
        return {
          success: false,
          phoneNumber: order.client_phone,
          orderId: order.id,
          message: `CBB sync skipped - order is for ${order.branch} branch (only IL branch orders are synced)`,
        };
      }

      const result: CBBContactSyncResult =
        await this.cbbSyncOrchestrator.syncOrderToCBB(order.order_id);

      this.logger.log(
        `CBB resync completed for order ${order.id}: status=${result.status}, action=${result.action}`,
      );

      const successful = ['success', 'no_whatsapp'].includes(result.status);

      return {
        success: successful,
        phoneNumber: order.client_phone || 'unknown',
        orderId: order.id,
        cbbContactUuid: result.contactId,
        message: this.buildResultMessage(result),
        whatsappAvailable: result.hasWhatsApp ?? false,
        created: result.action === 'created',
        error: successful ? undefined : result.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `CBB resync operation failed: ${errorMessage}`,
        error instanceof Error ? error : undefined,
      );

      await this.logService.createLog({
        level: 'error',
        message: 'CBB resync operation failed',
        metadata: { error: errorMessage, ...dto, source: 'admin_resync' },
        correlation_id: correlationId,
      });

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      return {
        success: false,
        phoneNumber: dto.phoneNumber || 'unknown',
        orderId: dto.orderId || 'unknown',
        message: 'CBB resync failed',
        error: errorMessage,
        whatsappAvailable: false,
        created: false,
      };
    }
  }

  private async findOrder(dto: ResyncCBBContactDto): Promise<OrderRecord> {
    let order: OrderRecord | null = null;

    if (dto.orderId) {
      order = await this.ordersRepository.findById(dto.orderId);
    } else if (dto.viziOrderId) {
      order = await this.ordersRepository.findOne({
        where: { order_id: dto.viziOrderId },
      });
    } else if (dto.phoneNumber) {
      const orders = await this.ordersRepository.findMany({
        where: { client_phone: dto.phoneNumber },
        orderBy: 'created_at',
        orderDirection: 'desc',
      });
      if (orders.length > 0) {
        order = orders[0];
      }
    }

    if (!order) {
      const searchCriteria = JSON.stringify(dto);
      throw new NotFoundException(
        `Order not found with criteria: ${searchCriteria}`,
      );
    }

    return order;
  }

  private buildResultMessage(result: CBBContactSyncResult): string {
    switch (result.status) {
      case 'success':
        return result.action === 'created'
          ? 'CBB contact created successfully'
          : 'CBB contact updated successfully';
      case 'no_whatsapp':
        return 'CBB contact synced, but WhatsApp not available for the user.';
      default:
        return `CBB resync failed with error: ${result.error || 'Unknown error'}`;
    }
  }
}
