import { Injectable } from '@angular/core';
import {
  DocumentTemplateService,
  DocumentData,
} from './document-template.service';
import { PrintingService } from '../Services/printing.service';
import { SettingsService } from '../Services/settings.service';
import {
  DocumentType,
  DocumentTypeSettings,
  DEFAULT_SALE_SETTINGS,
  DEFAULT_INVOICE_SETTINGS,
  DEFAULT_QUOTATION_SETTINGS,
} from '../interfaces/settings.interface';

@Injectable({ providedIn: 'root' })
export class DocumentPrintService {
  constructor(
    private templateService: DocumentTemplateService,
    private printingService: PrintingService,
    private settingsService: SettingsService,
  ) {}

  /** Get current settings for a doc type, falling back to defaults */
  getSettings(type: DocumentType): DocumentTypeSettings {
    // 1. Try in-memory BehaviorSubject cache (populated after first HTTP call)
    let orgSettings = this.settingsService.getCachedSettings();

    // 2. If not in memory, try localStorage (written by updateSection/getSettings)
    if (!orgSettings) {
      try {
        const raw = localStorage.getItem('orgSettings');
        if (raw) {
          orgSettings = JSON.parse(raw);
          // Also hydrate the BehaviorSubject so future calls are instant
          if (orgSettings) {
            this.settingsService['settingsCache$']?.next(orgSettings);
          }
        }
      } catch {
        /* ignore parse errors */
      }
    }

    if (!orgSettings) return this.templateService.getDefaultSettings(type);

    const stored: any =
      type === 'invoice'
        ? orgSettings['invoiceDocSettings']
        : type === 'quotation'
          ? orgSettings['quotationDocSettings']
          : orgSettings['saleDocSettings'];

    if (!stored) return this.templateService.getDefaultSettings(type);

    // Merge stored settings with defaults so new fields always exist
    const defaults = this.templateService.getDefaultSettings(type);
    return { ...defaults, ...stored };
  }

  /** Print a document using current template settings */
  async print(
    type: DocumentType,
    data: DocumentData,
    customSettings?: DocumentTypeSettings,
  ): Promise<void> {
    const settings = customSettings ?? this.getSettings(type);

    // Convert logo to base64 so it renders in the popup window regardless of CORS
    let printData = data;
    if (data.orgLogo && /^https?:\/\//i.test(data.orgLogo)) {
      try {
        const resp = await fetch(data.orgLogo, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          const base64 = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
          printData = { ...data, orgLogo: base64 };
        }
      } catch {
        // proceed without logo if fetch fails
      }
    }

    const html = this.templateService.render(printData, settings);
    await this.printingService.printHTML(html);
  }

  /** Download PDF using html2canvas (pixel-perfect rendering of template CSS) */
  async downloadPDF(
    type: DocumentType,
    data: DocumentData,
    customSettings?: DocumentTypeSettings,
  ): Promise<void> {
    const settings = customSettings ?? this.getSettings(type);

    // Convert logo URL → base64 data URI so html2canvas can draw it inside
    // the srcdoc iframe (null origin blocks cross-origin image requests).
    let printData = data;
    if (data.orgLogo && /^https?:\/\//i.test(data.orgLogo)) {
      try {
        const resp = await fetch(data.orgLogo, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          const base64 = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
          printData = { ...data, orgLogo: base64 };
        }
      } catch {
        // Logo fetch failed – proceed without it rather than blocking the PDF
      }
    }

    const html = this.templateService.render(printData, settings);
    const fileName = `${type}-${data.docNumber || 'doc'}.pdf`;

    // Paper dimensions in mm
    const paperW =
      settings.paperSize === 'A5'
        ? 148
        : settings.paperSize === 'Letter'
          ? 216
          : 210;
    const paperH =
      settings.paperSize === 'A5'
        ? 210
        : settings.paperSize === 'Letter'
          ? 279
          : 297;

    // Pixel width of the iframe we'll render into (794 ≈ A4 at 96 dpi)
    const renderPx =
      settings.paperSize === 'A5'
        ? 559
        : settings.paperSize === 'Letter'
          ? 816
          : 794;

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // ── 1. Render the HTML in a hidden off-screen iframe ──────────────────
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, {
        position: 'fixed',
        top: '-99999px',
        left: '-99999px',
        width: `${renderPx}px`,
        height: '1px',
        border: 'none',
        visibility: 'hidden',
      });
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe.addEventListener('load', () => resolve(), { once: true });
        // Use srcdoc so the full HTML (including <style>) is parsed correctly
        iframe.srcdoc = html;
      });

      const iframeDoc =
        iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      // Resize iframe height to actual content so html2canvas sees everything
      const pageEl =
        (iframeDoc.querySelector('.page') as HTMLElement) ?? iframeDoc.body;
      iframe.style.height = `${pageEl.scrollHeight + 40}px`;

      // ── 2. Wait for fonts and cross-origin images ─────────────────────────
      const imgLoadPromises = Array.from(iframeDoc.images).map(
        (img) =>
          new Promise<void>((res) => {
            if (img.complete) {
              res();
            } else {
              img.onload = () => res();
              img.onerror = () => res(); // don't block on broken images
            }
          }),
      );
      await Promise.all(imgLoadPromises);
      // Extra tick for web-font rendering
      await new Promise((r) => setTimeout(r, 400));

      // ── 3. Capture with html2canvas ───────────────────────────────────────
      const canvas = await html2canvas(pageEl, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // retina quality
        backgroundColor: '#ffffff',
        logging: false,
        width: renderPx,
      });

      document.body.removeChild(iframe);

      // ── 4. Add to jsPDF, splitting across pages if needed ─────────────────
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format:
          settings.paperSize === 'A5'
            ? 'a5'
            : settings.paperSize === 'Letter'
              ? 'letter'
              : 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.97);
      const imgWidthMm = paperW;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      let remainingHeight = imgHeightMm;
      let posY = 0;

      pdf.addImage(imgData, 'JPEG', 0, posY, imgWidthMm, imgHeightMm);
      remainingHeight -= paperH;

      while (remainingHeight > 0) {
        posY -= paperH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, posY, imgWidthMm, imgHeightMm);
        remainingHeight -= paperH;
      }

      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      // Fallback: open in new tab so user can print-to-PDF manually
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    }
  }

  /** Save settings for a doc type to backend (persistent) */
  async saveSettings(
    type: DocumentType,
    settings: DocumentTypeSettings,
  ): Promise<void> {
    const key =
      type === 'invoice'
        ? 'invoiceDocSettings'
        : type === 'quotation'
          ? 'quotationDocSettings'
          : 'saleDocSettings';

    // Optimistically update localStorage so getSettings() picks it up immediately
    try {
      const raw = localStorage.getItem('orgSettings');
      const current = raw ? JSON.parse(raw) : {};
      current[key] = settings;
      localStorage.setItem('orgSettings', JSON.stringify(current));
    } catch {
      /* ignore */
    }

    await this.settingsService
      .updateSection('documents', { [key]: settings })
      .toPromise();
  }

  /**
   * Normalize raw sale/order data into DocumentData for the template service.
   * Handles the varying shapes returned by the different backend endpoints.
   */
  normalizeSaleData(order: any, orgDetails: any): DocumentData {
    const items =
      typeof order.items === 'string'
        ? JSON.parse(order.items)
        : (order.items ?? []);

    // Extract payment method from payments array or direct field
    const paymentMethod =
      order.paymentMethod ??
      (Array.isArray(order.payments) && order.payments.length > 0
        ? order.payments
            .map((p: any) => p.paymentMethodName ?? p.paymentMethodCode ?? '')
            .filter(Boolean)
            .join(', ')
        : '');

    const subtotal = order.subtotal ?? order.total ?? order.totalAmount ?? 0;
    const total = order.totalAmount ?? order.total ?? 0;
    const amountPaid = order.amountPaid ?? order.totalAmountPaid ?? total;

    return {
      docType: 'sale',
      // receiptNumber is the human-readable sale number from the backend
      docNumber: order.receiptNumber ?? order.orderNumber ?? order.id ?? 'N/A',
      docDate: order.createdAt ?? new Date().toISOString(),
      orgName: orgDetails?.name ?? orgDetails?.organizationName ?? '',
      orgAddress: orgDetails?.address ?? '',
      orgPhone: orgDetails?.phone ?? '',
      orgEmail: orgDetails?.email ?? '',
      orgLogo: orgDetails?.logoUrl ?? '',
      // customer object uses fullName / phoneNumber (customer service shape)
      customerName:
        order.customerName ??
        order.customer_name ??
        order.customer?.fullName ??
        order.customer?.name ??
        'Walk-In Customer',
      customerPhone:
        order.customerPhone ??
        order.customer?.phoneNumber ??
        order.customer?.phone ??
        '',
      customerEmail: order.customerEmail ?? order.customer?.email ?? '',
      customerType: order.customer?.customerType,
      kraPin: order.customer?.kraPin ?? '',
      items: items.map((it: any) => {
        const qty = it.quantity ?? it.selectedItems ?? 0;
        const price = it.price ?? it.unitPrice ?? 0;
        return {
          name: it.name ?? it.productName ?? '',
          sku: it.sku ?? it.productCode ?? it.productIdNumber ?? '',
          description: it.description ?? '',
          quantity: qty,
          unitPrice: price,
          discount: it.discount ?? it.discountValue ?? 0,
          taxRate: it.taxRate,
          total: it.total ?? qty * price,
        };
      }),
      subtotal,
      taxAmount: order.taxAmount ?? 0,
      discountAmount: order.discountAmount ?? order.discount ?? 0,
      total,
      amountPaid,
      balanceDue: order.balanceDue ?? Math.max(0, total - amountPaid),
      paymentMethod,
      notes: order.notes ?? '',
    };
  }

  /**
   * Normalize invoice data into DocumentData.
   * Works with both the list response (no items) and full getById response (has items).
   */
  normalizeInvoiceData(invoice: any, orgDetails: any): DocumentData {
    const items =
      typeof invoice.items === 'string'
        ? JSON.parse(invoice.items)
        : (invoice.items ?? []);

    const customer = invoice.customer ?? {};
    const total = invoice.totalAmount ?? invoice.total ?? 0;
    const amountPaid = invoice.amountPaid ?? 0;

    return {
      docType: 'invoice',
      docNumber: invoice.invoiceNumber ?? invoice.id ?? 'N/A',
      docDate:
        invoice.issueDate ?? invoice.createdAt ?? new Date().toISOString(),
      dueDate: invoice.dueDate,
      orgName: orgDetails?.name ?? orgDetails?.organizationName ?? '',
      orgAddress: orgDetails?.address ?? '',
      orgPhone: orgDetails?.phone ?? '',
      orgEmail: orgDetails?.email ?? '',
      orgLogo: orgDetails?.logoUrl ?? '',
      // Top-level fields take priority (set directly on invoice); fall back to nested customer object
      customerName:
        invoice.customerName ?? customer.fullName ?? customer.name ?? '',
      customerPhone:
        invoice.customerPhone ?? customer.phoneNumber ?? customer.phone ?? '',
      customerEmail: invoice.customerEmail ?? customer.email ?? '',
      customerType: customer.customerType,
      kraPin:
        customer.kraPin ??
        invoice.customerKraPin ??
        invoice.customerTaxId ??
        '',
      items: items.map((it: any) => {
        const qty = it.quantity ?? it.selectedItems ?? 0;
        const price = it.unitPrice ?? it.price ?? 0;
        return {
          name: it.name ?? it.productName ?? '',
          sku: it.sku ?? it.productCode ?? '',
          description: it.description ?? '',
          quantity: qty,
          unitPrice: price,
          discount: it.discount ?? it.discountValue ?? 0,
          taxRate: it.taxRate,
          total: it.total ?? qty * price,
        };
      }),
      subtotal: invoice.subtotal ?? 0,
      taxAmount: invoice.taxAmount ?? 0,
      discountAmount: invoice.discountAmount ?? invoice.discount ?? 0,
      total,
      amountPaid,
      balanceDue:
        invoice.balanceDue ??
        invoice.remainingBalance ??
        Math.max(0, total - amountPaid),
      paymentMethod: invoice.paymentMethod ?? '',
      notes: invoice.notes ?? '',
      terms: invoice.terms ?? invoice.termsAndConditions ?? '',
    };
  }

  /**
   * Normalize quotation data into DocumentData.
   */
  normalizeQuotationData(quotation: any, orgDetails: any): DocumentData {
    const items =
      typeof quotation.items === 'string'
        ? JSON.parse(quotation.items)
        : (quotation.items ?? []);

    const customer = quotation.customer ?? {};

    return {
      docType: 'quotation',
      // referenceNumber is the human-readable quotation number from the backend
      docNumber:
        quotation.referenceNumber ??
        quotation.quotationNumber ??
        quotation.id ??
        'N/A',
      docDate: quotation.createdAt ?? new Date().toISOString(),
      dueDate: quotation.validUntil ?? quotation.expiryDate,
      orgName: orgDetails?.name ?? orgDetails?.organizationName ?? '',
      orgAddress: orgDetails?.address ?? '',
      orgPhone: orgDetails?.phone ?? '',
      orgEmail: orgDetails?.email ?? '',
      orgLogo: orgDetails?.logoUrl ?? '',
      // customer object uses fullName / phoneNumber (not name / phone)
      customerName:
        quotation.customerName ?? customer.fullName ?? customer.name ?? '',
      customerPhone:
        quotation.customerPhone ?? customer.phoneNumber ?? customer.phone ?? '',
      customerEmail: quotation.customerEmail ?? customer.email ?? '',
      customerType: customer.customerType,
      kraPin: customer.kraPin ?? quotation.customerKraPin ?? '',
      items: items.map((it: any) => {
        const qty = it.quantity ?? it.selectedItems ?? 0;
        const price = it.unitPrice ?? it.price ?? 0;
        return {
          name: it.name ?? it.productName ?? '',
          sku: it.sku ?? '',
          description: it.description ?? '',
          quantity: qty,
          unitPrice: price,
          discount: it.discount ?? it.discountValue ?? 0,
          taxRate: it.taxRate,
          total: it.total ?? qty * price,
        };
      }),
      subtotal: quotation.subtotal ?? quotation.totalAmount ?? 0,
      // totalTax is the field name used in the quotations endpoint
      taxAmount: quotation.taxAmount ?? quotation.totalTax ?? 0,
      discountAmount: quotation.discountAmount ?? quotation.discount ?? 0,
      total: quotation.totalAmount ?? quotation.total ?? 0,
      notes: quotation.notes ?? quotation.quotationNotes ?? '',
      terms: quotation.terms ?? quotation.quotationTerms ?? '',
    };
  }
}
