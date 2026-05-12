import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import { InvoiceNumberService } from './invoice-number.service';
import {
  CreateRecurringTemplateDto,
  UpdateRecurringTemplateDto,
  RecurringTemplateFilterDto,
  RecurrenceFrequency,
  RecurringStatus,
} from './recurring-invoice.dto';
import { InvoiceType } from './invoice.dto';

@Injectable()
export class RecurringInvoiceService {
  private readonly logger = new Logger(RecurringInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  /**
   * Create a recurring invoice template
   */
  async createTemplate(
    organizationId: number,
    dto: CreateRecurringTemplateDto,
  ) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Generate template code
    const templateCode = await this.generateTemplateCode(organizationId);

    // Calculate next invoice date
    const startDate = new Date(dto.startDate);
    const nextInvoiceDate = this.calculateNextDate(
      startDate,
      dto.frequency,
      dto.intervalCount,
      dto.dayOfMonth,
      dto.dayOfWeek,
    );

    // Create template with items
    const template = await this.prisma.recurringInvoiceTemplate.create({
      data: {
        organizationId,
        templateCode,
        templateName: dto.templateName,
        customerId: dto.customerId,
        frequency: dto.frequency,
        intervalCount: dto.intervalCount,
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextInvoiceDate,
        dayOfMonth: dto.dayOfMonth,
        dayOfWeek: dto.dayOfWeek,
        paymentTermsDays: dto.paymentTermsDays || 30,
        taxRate: dto.taxRate || 0,
        discountAmount: dto.discountAmount || 0,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        footerText: dto.footerText,
        autoSendEmail: dto.autoSendEmail ?? true,
        emailRecipients: dto.emailRecipients
          ? JSON.stringify(dto.emailRecipients)
          : null,
        salesPersonId: dto.salesPersonId,
        createdBy: dto.createdBy,
        items: {
          createMany: {
            data: dto.items.map((item, index) => ({
              productId: item.productId,
              productName: item.productName,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate ?? dto.taxRate ?? 0,
              discountAmount: item.discountAmount ?? 0,
              sortOrder: item.sortOrder ?? index,
            })),
          },
        },
      },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customer: true,
      },
    });

    this.logger.log(
      `Created recurring template ${template.templateCode} for customer ${customer.fullName}`,
    );

    return template;
  }

  /**
   * Get all templates with filters
   */
  async getTemplates(
    organizationId: number,
    filters: RecurringTemplateFilterDto,
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.frequency) {
      where.frequency = filters.frequency;
    }

    const [templates, total] = await Promise.all([
      this.prisma.recurringInvoiceTemplate.findMany({
        where,
        include: {
          customer: true,
          items: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: {
            select: {
              generatedInvoices: true,
            },
          },
        },
        orderBy: {
          nextInvoiceDate: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.recurringInvoiceTemplate.count({ where }),
    ]);

    return {
      templates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get template by ID
   */
  async getTemplateById(organizationId: number, templateId: number) {
    const template = await this.prisma.recurringInvoiceTemplate.findFirst({
      where: {
        id: templateId,
        organizationId,
      },
      include: {
        customer: true,
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        generatedInvoices: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            invoiceNumber: true,
            issueDate: true,
            dueDate: true,
            totalAmount: true,
            amountPaid: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Recurring template not found');
    }

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(
    organizationId: number,
    templateId: number,
    dto: UpdateRecurringTemplateDto,
  ) {
    const template = await this.getTemplateById(organizationId, templateId);

    const updateData: any = {};

    if (dto.templateName) updateData.templateName = dto.templateName;
    if (dto.frequency) updateData.frequency = dto.frequency;
    if (dto.intervalCount) updateData.intervalCount = dto.intervalCount;
    if (dto.endDate !== undefined)
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.dayOfMonth !== undefined) updateData.dayOfMonth = dto.dayOfMonth;
    if (dto.dayOfWeek !== undefined) updateData.dayOfWeek = dto.dayOfWeek;
    if (dto.paymentTermsDays !== undefined)
      updateData.paymentTermsDays = dto.paymentTermsDays;
    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.discountAmount !== undefined)
      updateData.discountAmount = dto.discountAmount;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.termsAndConditions !== undefined)
      updateData.termsAndConditions = dto.termsAndConditions;
    if (dto.footerText !== undefined) updateData.footerText = dto.footerText;
    if (dto.autoSendEmail !== undefined)
      updateData.autoSendEmail = dto.autoSendEmail;
    if (dto.emailRecipients)
      updateData.emailRecipients = JSON.stringify(dto.emailRecipients);
    if (dto.salesPersonId !== undefined)
      updateData.salesPersonId = dto.salesPersonId;

    // Recalculate next invoice date if frequency or interval changed
    if (dto.frequency || dto.intervalCount || dto.dayOfMonth || dto.dayOfWeek) {
      updateData.nextInvoiceDate = this.calculateNextDate(
        template.nextInvoiceDate,
        dto.frequency || template.frequency,
        dto.intervalCount ?? template.intervalCount,
        dto.dayOfMonth ?? template.dayOfMonth,
        dto.dayOfWeek ?? template.dayOfWeek,
      );
    }

    const updated = await this.prisma.recurringInvoiceTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        items: true,
        customer: true,
      },
    });

    // Update items if provided
    if (dto.items) {
      await this.prisma.recurringInvoiceItem.deleteMany({
        where: { templateId },
      });

      await this.prisma.recurringInvoiceItem.createMany({
        data: dto.items.map((item, index) => ({
          templateId,
          productId: item.productId,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? updated.taxRate,
          discountAmount: item.discountAmount ?? 0,
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return this.getTemplateById(organizationId, templateId);
  }

  /**
   * Pause template
   */
  async pauseTemplate(organizationId: number, templateId: number) {
    await this.getTemplateById(organizationId, templateId);

    return await this.prisma.recurringInvoiceTemplate.update({
      where: { id: templateId },
      data: { status: RecurringStatus.PAUSED },
    });
  }

  /**
   * Resume template
   */
  async resumeTemplate(organizationId: number, templateId: number) {
    await this.getTemplateById(organizationId, templateId);

    return await this.prisma.recurringInvoiceTemplate.update({
      where: { id: templateId },
      data: { status: RecurringStatus.ACTIVE },
    });
  }

  /**
   * Cancel template
   */
  async cancelTemplate(organizationId: number, templateId: number) {
    await this.getTemplateById(organizationId, templateId);

    return await this.prisma.recurringInvoiceTemplate.update({
      where: { id: templateId },
      data: { status: RecurringStatus.CANCELLED },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(organizationId: number, templateId: number) {
    const template = await this.getTemplateById(organizationId, templateId);

    if (template.totalGenerated > 0) {
      throw new BadRequestException(
        'Cannot delete template that has generated invoices. Cancel it instead.',
      );
    }

    await this.prisma.recurringInvoiceTemplate.delete({
      where: { id: templateId },
    });

    return { message: 'Template deleted successfully' };
  }

  /**
   * Generate invoices from due templates (called by cron job)
   */
  async generateDueInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.logger.log(
      `Checking for recurring invoices due on ${today.toISOString()}`,
    );

    // Find all active templates where nextInvoiceDate <= today
    const dueTemplates = await this.prisma.recurringInvoiceTemplate.findMany({
      where: {
        status: RecurringStatus.ACTIVE,
        nextInvoiceDate: {
          lte: today,
        },
      },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customer: true,
        organization: true,
      },
    });

    this.logger.log(
      `Found ${dueTemplates.length} templates due for generation`,
    );

    const results = {
      success: [],
      failed: [],
    };

    for (const template of dueTemplates) {
      try {
        // Check if end date has passed
        if (template.endDate && new Date(template.endDate) < today) {
          await this.prisma.recurringInvoiceTemplate.update({
            where: { id: template.id },
            data: { status: RecurringStatus.COMPLETED },
          });
          this.logger.log(
            `Template ${template.templateCode} marked as COMPLETED (end date passed)`,
          );
          continue;
        }

        // Generate invoice from template
        const invoice = await this.generateInvoiceFromTemplate(template);

        // Calculate next invoice date
        const nextDate = this.calculateNextDate(
          template.nextInvoiceDate,
          template.frequency,
          template.intervalCount,
          template.dayOfMonth,
          template.dayOfWeek,
        );

        // Update template
        await this.prisma.recurringInvoiceTemplate.update({
          where: { id: template.id },
          data: {
            lastGeneratedDate: new Date(),
            lastGeneratedInvoiceId: invoice.id,
            nextInvoiceDate: nextDate,
            totalGenerated: { increment: 1 },
          },
        });

        results.success.push({
          templateId: template.id,
          templateCode: template.templateCode,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customer: template.customer.fullName,
          amount: invoice.totalAmount,
        });

        this.logger.log(
          `Generated invoice ${invoice.invoiceNumber} from template ${template.templateCode}`,
        );
      } catch (error) {
        results.failed.push({
          templateId: template.id,
          templateCode: template.templateCode,
          error: error.message,
        });
        this.logger.error(
          `Failed to generate invoice from template ${template.templateCode}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Invoice generation complete: ${results.success.length} success, ${results.failed.length} failed`,
    );

    return results;
  }

  /**
   * Generate a single invoice from template
   */
  private async generateInvoiceFromTemplate(template: any) {
    const invoiceDto: any = {
      invoiceType: InvoiceType.RECURRING_INVOICE,
      customerId: template.customerId,
      items: template.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discountAmount: item.discountAmount,
        sortOrder: item.sortOrder,
      })),
      paymentTermsDays: template.paymentTermsDays,
      taxRate: template.taxRate,
      discountAmount: template.discountAmount,
      notes: template.notes,
      termsAndConditions: template.termsAndConditions,
      footerText: template.footerText,
      createdBy: `System (Recurring: ${template.templateCode})`,
      salesPersonId: template.salesPersonId, // Assign commission to template's sales person
      sendEmail: template.autoSendEmail,
    };

    const invoice = await this.invoiceService.createInvoice(
      template.organizationId,
      invoiceDto,
    );

    // Link invoice to template and set status
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        recurringTemplateId: template.id,
        status: 'PENDING',
      },
    });

    return invoice;
  }

  /**
   * Generate template code
   */
  private async generateTemplateCode(organizationId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'REC';

    // Get count of templates for this org this year
    const count = await this.prisma.recurringInvoiceTemplate.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });

    const sequence = (count + 1).toString().padStart(5, '0');
    return `${prefix}-${year}-${sequence}`;
  }

  /**
   * Calculate next invoice date based on frequency
   */
  private calculateNextDate(
    currentDate: Date,
    frequency: RecurrenceFrequency,
    intervalCount: number,
    dayOfMonth?: number,
    dayOfWeek?: number,
  ): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        next.setDate(next.getDate() + intervalCount);
        break;

      case RecurrenceFrequency.WEEKLY:
        next.setDate(next.getDate() + 7 * intervalCount);
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          const diff = dayOfWeek - currentDay;
          next.setDate(next.getDate() + diff + (diff < 0 ? 7 : 0));
        }
        break;

      case RecurrenceFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14 * intervalCount);
        break;

      case RecurrenceFrequency.MONTHLY:
        next.setMonth(next.getMonth() + intervalCount);
        if (dayOfMonth) {
          const daysInMonth = this.getDaysInMonth(next);
          next.setDate(Math.min(dayOfMonth, daysInMonth));
        }
        break;

      case RecurrenceFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3 * intervalCount);
        if (dayOfMonth) {
          const daysInMonth = this.getDaysInMonth(next);
          next.setDate(Math.min(dayOfMonth, daysInMonth));
        }
        break;

      case RecurrenceFrequency.SEMI_ANNUALLY:
        next.setMonth(next.getMonth() + 6 * intervalCount);
        if (dayOfMonth) {
          const daysInMonth = this.getDaysInMonth(next);
          next.setDate(Math.min(dayOfMonth, daysInMonth));
        }
        break;

      case RecurrenceFrequency.YEARLY:
        next.setFullYear(next.getFullYear() + intervalCount);
        if (dayOfMonth) {
          const daysInMonth = this.getDaysInMonth(next);
          next.setDate(Math.min(dayOfMonth, daysInMonth));
        }
        break;
    }

    return next;
  }

  /**
   * Get number of days in a month
   */
  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
}
