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

  /**
   * Validate order data before creation
   */
  validateOrderData(orderData: CreateOrderData): ValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!orderData.order_id) missingFields.push('order_id');
    if (!orderData.form_id) missingFields.push('form_id');
    if (!orderData.branch) missingFields.push('branch');
    if (!orderData.domain) missingFields.push('domain');
    if (!orderData.payment_processor) missingFields.push('payment_processor');
    if (!orderData.payment_id) missingFields.push('payment_id');
    if (orderData.amount === null || orderData.amount === undefined) {
      missingFields.push('amount');
    }
    if (!orderData.currency) missingFields.push('currency');
    if (!orderData.order_status) missingFields.push('order_status');
    if (!orderData.client_name) missingFields.push('client_name');
    if (!orderData.client_email) missingFields.push('client_email');
    if (!orderData.client_phone) missingFields.push('client_phone');
    if (!orderData.product_name) missingFields.push('product_name');
    if (!orderData.product_country) missingFields.push('product_country');
    if (!orderData.webhook_received_at) {
      missingFields.push('webhook_received_at');
    }

    // Business logic validation
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

    if (!this.isValidBranch(orderData.branch)) {
      warnings.push(`Unknown branch code: ${orderData.branch}`);
    }

    if (!this.isValidCurrency(orderData.currency)) {
      warnings.push(`Unknown currency code: ${orderData.currency}`);
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Should be at least 7 digits
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 7 && cleanPhone !== '0000000000';
  }

  /**
   * Validate branch code
   */
  private isValidBranch(branch: string): boolean {
    const validBranches = ['se', 'co', 'il', 'ru', 'kz'];
    return validBranches.includes(branch.toLowerCase());
  }

  /**
   * Validate currency code
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies = [
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
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Check if order is eligible for WhatsApp
   */
  isEligibleForWhatsApp(orderData: CreateOrderData): boolean {
    return (
      orderData.branch?.toLowerCase() === 'il' &&
      orderData.whatsapp_alerts_enabled === true &&
      this.isValidPhoneNumber(orderData.client_phone)
    );
  }

  /**
   * Check if order is eligible for CBB sync
   */
  isEligibleForCBBSync(orderData: CreateOrderData): boolean {
    return orderData.branch?.toLowerCase() === 'il';
  }

  /**
   * Sanitize order data
   */
  sanitizeOrderData(orderData: CreateOrderData): CreateOrderData {
    // Remove any potential XSS or injection attempts
    const sanitized = { ...orderData };

    // Sanitize string fields
    if (sanitized.client_name) {
      sanitized.client_name = this.sanitizeString(sanitized.client_name);
    }
    if (sanitized.client_email) {
      sanitized.client_email = this.sanitizeString(sanitized.client_email).toLowerCase();
    }
    if (sanitized.product_name) {
      sanitized.product_name = this.sanitizeString(sanitized.product_name);
    }

    // Ensure numeric fields are numbers
    sanitized.amount = Number(sanitized.amount) || 0;
    sanitized.visa_quantity = Number(sanitized.visa_quantity) || 1;

    return sanitized;
  }

  /**
   * Sanitize string to prevent XSS
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
}