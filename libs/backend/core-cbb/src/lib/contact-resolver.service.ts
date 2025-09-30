import { Injectable, Logger } from '@nestjs/common';
import { Contact, CreateContactDto } from '@visapi/shared-types';
import { CbbClientService, ContactNotFoundError } from './cbb-client.service';

@Injectable()
export class ContactResolverService {
  private readonly logger = new Logger(ContactResolverService.name);
  private readonly contactCache = new Map<string, Contact>();
  private readonly cacheTimeout: number;

  constructor(private readonly cbbClient: CbbClientService) {
    this.cacheTimeout = 3600000; // 1 hour in milliseconds
  }

  /**
   * Resolve phone number to CBB contact, creating if necessary
   */
  async resolveContact(phone: string): Promise<Contact> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    // Check cache first
    const cachedContact = this.getCachedContact(normalizedPhone);
    if (cachedContact) {
      this.logger.debug(`Using cached contact for phone: ${normalizedPhone}`);
      return cachedContact;
    }

    try {
      // Try to find existing contact
      let contact = await this.cbbClient.findContactByPhone(normalizedPhone);

      if (!contact) {
        this.logger.debug(
          `Contact not found for ${normalizedPhone}, creating new contact`,
        );
        contact = await this.createNewContact(normalizedPhone);
      } else {
        this.logger.debug(
          `Found existing contact ${contact.id} for phone: ${normalizedPhone}`,
        );
      }

      // Cache the result
      this.setCachedContact(normalizedPhone, contact);

      return contact;
    } catch (error) {
      this.logger.error(
        `Failed to resolve contact for phone ${normalizedPhone}:`,
        error,
      );
      throw new ContactNotFoundError(normalizedPhone);
    }
  }

  /**
   * Create a new contact with minimal information
   */
  private async createNewContact(phone: string): Promise<Contact> {
    const contactData: CreateContactDto = {
      phone,
      first_name: this.extractFirstNameFromPhone(phone),
      // Auto-tag new contacts for tracking
      actions: [
        {
          action: 'add_tag',
          tag_name: 'visapi_created',
        },
      ],
    };

    return await this.cbbClient.createContact(contactData);
  }

  /**
   * Normalize phone number to international format
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    if (!normalized) {
      throw new Error(`Phone number contains no digits: ${phone}`);
    }

    // Add + prefix if not present
    if (!normalized.startsWith('+')) {
      // If number doesn't start with country code, assume US (+1)
      if (normalized.length === 10) {
        normalized = `+1${normalized}`;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = `+${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Extract a reasonable first name from phone number for display
   */
  private extractFirstNameFromPhone(phone: string): string {
    // Use last 4 digits for a friendly display name
    const digits = phone.replace(/\D/g, '');
    const lastFour = digits.slice(-4);
    return `Contact${lastFour}`;
  }

  /**
   * Get contact from cache if not expired
   */
  private getCachedContact(phone: string): Contact | null {
    const cacheKey = `contact:${phone}`;
    const cached = this.contactCache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Remove expired cache entry
    if (cached) {
      this.contactCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache contact with timestamp
   */
  private setCachedContact(phone: string, contact: Contact): void {
    const cacheKey = `contact:${phone}`;
    const contactWithTimestamp = {
      ...contact,
      _cached_at: Date.now(),
    };

    this.contactCache.set(cacheKey, contactWithTimestamp as Contact);

    // Clean up old cache entries periodically
    if (this.contactCache.size > 1000) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Check if cached contact is still valid
   */
  private isCacheValid(contact: any): boolean {
    const cachedAt = contact._cached_at;
    if (!cachedAt) return false;

    return Date.now() - cachedAt < this.cacheTimeout;
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, contact] of this.contactCache.entries()) {
      const cachedAt = (contact as any)._cached_at;
      if (!cachedAt || now - cachedAt >= this.cacheTimeout) {
        this.contactCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(
        `Cleaned up ${removedCount} expired contact cache entries`,
      );
    }
  }

  /**
   * Clear all cached contacts (useful for testing)
   */
  clearCache(): void {
    this.contactCache.clear();
    this.logger.debug('Contact cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.contactCache.size,
      maxSize: 1000,
    };
  }
}
