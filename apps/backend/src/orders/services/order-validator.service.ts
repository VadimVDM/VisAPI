import { Injectable, Logger } from '@nestjs/common';
import { CreateOrderData } from '@visapi/backend-repositories';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

@Injectable()
export class OrderValidatorService {
  private readonly logger = new Logger(OrderValidatorService.name);
  private static readonly VALID_BRANCHES = new Set([
    'se',
    'co',
    'il',
    'ru',
    'kz',
  ]);
  private static readonly VALID_CURRENCIES = new Set([
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'INR',
    'ILS',
    'VND',
    'KRW',
    'MAD',
    'SAR',
  ]);

  validateOrderData(orderData: CreateOrderData): ValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    const requiredFields: (keyof CreateOrderData)[] = [
      'order_id',
      'form_id',
      'branch',
      'domain',
      'payment_processor',
      'payment_id',
      'amount',
      'currency',
      'order_status',
      'client_name',
      'client_email',
      'client_phone',
      'product_country',
      'webhook_received_at',
    ];

    requiredFields.forEach((field) => {
      if (orderData[field] === null || orderData[field] === undefined) {
        missingFields.push(field as string);
      }
    });

    if (orderData.amount < 0) {
      warnings.push('Order amount is negative');
    }

    if (orderData.visa_quantity < 1) {
      warnings.push('Visa quantity is less than 1');
    }

    if (!this.isValidEmail(orderData.client_email)) {
      warnings.push(`Invalid email format: ${orderData.client_email}`);
    }

    if (!this.isValidPhoneNumber(orderData.client_phone)) {
      warnings.push(`Invalid phone format: ${orderData.client_phone}`);
    }

    if (
      !OrderValidatorService.VALID_BRANCHES.has(orderData.branch.toLowerCase())
    ) {
      warnings.push(`Unknown branch code: ${orderData.branch}`);
    }

    if (
      !OrderValidatorService.VALID_CURRENCIES.has(
        orderData.currency.toUpperCase(),
      )
    ) {
      warnings.push(`Unknown currency code: ${orderData.currency}`);
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  private isValidEmail(email: string): boolean {
    if (!email) return false;
    // A more robust email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 7 && cleanPhone !== '0000000000';
  }

  isEligibleForWhatsApp(orderData: CreateOrderData): boolean {
    return (
      orderData.branch?.toLowerCase() === 'il' &&
      orderData.whatsapp_alerts_enabled === true &&
      this.isValidPhoneNumber(orderData.client_phone)
    );
  }

  isEligibleForCBBSync(orderData: CreateOrderData): boolean {
    return orderData.branch?.toLowerCase() === 'il';
  }

  sanitizeOrderData(orderData: CreateOrderData): CreateOrderData {
    const sanitized = { ...orderData };

    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.sanitizeString(sanitized[key]);
      }
    }

    if (sanitized.client_email) {
      sanitized.client_email = sanitized.client_email.toLowerCase();
    }

    sanitized.amount = Number(sanitized.amount) || 0;
    sanitized.visa_quantity = Number(sanitized.visa_quantity) || 1;

    return sanitized;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[<>]/g, '') // Basic HTML tag removal
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}
