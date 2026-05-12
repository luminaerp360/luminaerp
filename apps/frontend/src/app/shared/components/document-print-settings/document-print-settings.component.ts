import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OrgDetailsService } from '../../Services/org-details.service';
import {
  DocumentType,
  DocumentTypeSettings,
  DocumentTemplate,
} from '../../interfaces/settings.interface';
import {
  DocumentTemplateService,
  DocumentData,
} from '../../services/document-template.service';
import { DocumentPrintService } from '../../services/document-print.service';
import { SettingsService } from '../../Services/settings.service';
import { HotToastService } from '@ngneat/hot-toast';

interface TemplateOption {
  id: DocumentTemplate;
  label: string;
  description: string;
  preview: string; // inline SVG thumbnail
}

@Component({
  selector: 'app-document-print-settings',
  templateUrl: './document-print-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPrintSettingsComponent implements OnInit, OnChanges {
  @Input() docType: DocumentType = 'sale';
  @Input() data: DocumentData | null = null;
  @Input() isOpen: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() settingsSaved = new EventEmitter<DocumentTypeSettings>();
  @Output() printRequested = new EventEmitter<DocumentTypeSettings>();
  @Output() pdfRequested = new EventEmitter<DocumentTypeSettings>();

  settings!: DocumentTypeSettings;
  activeTab: 'template' | 'content' | 'preview' = 'template';
  isSaving = false;
  isPrinting = false;
  isDownloading = false;
  previewHtml: SafeHtml = '';
  private orgDetails: any = null;

  templates: TemplateOption[] = [
    {
      id: 'classic',
      label: 'Classic',
      description: 'Clean white, accent border header',
      preview: this.svgThumb('#f8fafc', '#3b82f6', 'Classic'),
    },
    {
      id: 'modern-bold',
      label: 'Modern Bold',
      description: 'Dark full-width header, bold typography',
      preview: this.svgThumb('#1e40af', '#ffffff', 'Modern'),
    },
    {
      id: 'minimal',
      label: 'Minimal',
      description: 'Ultra-clean, thin dividers, elegant',
      preview: this.svgThumb('#ffffff', '#374151', 'Minimal'),
    },
    {
      id: 'branded',
      label: 'Branded Card',
      description: 'Full-bleed header, colored totals sidebar',
      preview: this.svgThumb('#f0f9ff', '#0369a1', 'Branded'),
    },
    {
      id: 'compact',
      label: 'Compact',
      description: 'Dense layout, fits more items',
      preview: this.svgThumb('#fafafa', '#4b5563', 'Compact'),
    },
  ];

  constructor(
    private templateService: DocumentTemplateService,
    private printService: DocumentPrintService,
    private settingsService: SettingsService,
    private orgDetailsService: OrgDetailsService,
    private toast: HotToastService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadOrgDetails();
    this.loadSettings();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['docType'] || (changes['isOpen'] && this.isOpen)) {
      this.loadSettings();
    }
  }

  loadOrgDetails(): void {
    const orgId = localStorage.getItem('licencedOrg');
    if (!orgId) return;
    this.orgDetailsService.getById(+orgId).subscribe({
      next: (details) => {
        this.orgDetails = details;
        // Re-render preview with real org data
        this.refreshPreview();
        this.cdr.markForCheck();
      },
      error: () => {
        /* use sample fallback */
      },
    });
  }

  loadSettings(): void {
    const cached = this.settingsService.getCachedSettings();
    if (cached) {
      this.settings = { ...this.printService.getSettings(this.docType) };
      this.refreshPreview();
    } else {
      // Cache is cold — fetch settings from backend first
      this.settingsService.getSettings().subscribe({
        next: () => {
          this.settings = { ...this.printService.getSettings(this.docType) };
          this.refreshPreview();
          this.cdr.markForCheck();
        },
        error: () => {
          // Fall back to defaults / localStorage
          this.settings = { ...this.printService.getSettings(this.docType) };
          this.refreshPreview();
        },
      });
    }
  }

  get docLabel(): string {
    return this.docType === 'invoice'
      ? 'Invoice'
      : this.docType === 'quotation'
        ? 'Quotation'
        : 'Sale';
  }

  get defaultAccentColor(): string {
    return this.docType === 'invoice'
      ? '#2563EB'
      : this.docType === 'quotation'
        ? '#16A34A'
        : '#EA580C';
  }

  selectTemplate(id: DocumentTemplate): void {
    this.settings = { ...this.settings, template: id };
    this.refreshPreview();
  }

  onColorChange(color: string): void {
    this.settings = { ...this.settings, accentColor: color };
    this.refreshPreview();
  }

  resetColor(): void {
    this.settings = { ...this.settings, accentColor: this.defaultAccentColor };
    this.refreshPreview();
  }

  onToggleChange(key: keyof DocumentTypeSettings, value: boolean): void {
    this.settings = { ...this.settings, [key]: value };
    this.refreshPreview();
  }

  onPaperSizeChange(size: 'A4' | 'Letter' | 'A5'): void {
    this.settings = { ...this.settings, paperSize: size };
  }

  onFooterTextChange(text: string): void {
    this.settings = { ...this.settings, customFooterText: text };
  }

  setTab(tab: 'template' | 'content' | 'preview'): void {
    this.activeTab = tab;
    if (tab === 'preview') this.refreshPreview();
  }

  refreshPreview(): void {
    const previewData = this.data ?? this.buildSampleData();
    // If the logo is an external URL, fetch it as base64 so srcdoc iframe can render it
    const logoUrl = previewData.orgLogo;
    if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
      fetch(logoUrl, { mode: 'cors' })
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then(
          (blob) =>
            new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result as string);
              reader.onerror = rej;
              reader.readAsDataURL(blob);
            }),
        )
        .then((base64) => {
          const raw = this.templateService.render(
            { ...previewData, orgLogo: base64 },
            this.settings,
          );
          this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(raw);
          this.cdr.markForCheck();
        })
        .catch(() => {
          // Logo fetch failed – render without logo
          const raw = this.templateService.render(previewData, this.settings);
          this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(raw);
          this.cdr.markForCheck();
        });
    } else {
      const raw = this.templateService.render(previewData, this.settings);
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(raw);
      this.cdr.markForCheck();
    }
  }

  async saveSettings(): Promise<void> {
    this.isSaving = true;
    try {
      await this.printService.saveSettings(this.docType, this.settings);
      this.settingsSaved.emit(this.settings);
      this.toast.success(`${this.docLabel} print settings saved!`);
    } catch {
      this.toast.error('Failed to save settings.');
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async printDocument(): Promise<void> {
    if (!this.data) {
      this.toast.info('No document data to print');
      return;
    }
    this.isPrinting = true;
    try {
      await this.printService.print(this.docType, this.data, this.settings);
      this.printRequested.emit(this.settings);
    } catch {
      this.toast.error('Print failed.');
    } finally {
      this.isPrinting = false;
      this.cdr.markForCheck();
    }
  }

  async downloadPDF(): Promise<void> {
    if (!this.data) {
      this.toast.info('No document data to download');
      return;
    }
    this.isDownloading = true;
    try {
      await this.printService.downloadPDF(
        this.docType,
        this.data,
        this.settings,
      );
      this.pdfRequested.emit(this.settings);
    } catch {
      this.toast.error('PDF download failed.');
    } finally {
      this.isDownloading = false;
      this.cdr.markForCheck();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private svgThumb(bg: string, fg: string, label: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'><rect width='120' height='80' fill='${bg}' rx='4'/><rect x='0' y='0' width='120' height='22' fill='${fg}' rx='4'/><rect x='8' y='28' width='50' height='4' fill='#ccc' rx='2'/><rect x='8' y='36' width='35' height='3' fill='#ddd' rx='2'/><rect x='8' y='46' width='104' height='2' fill='${fg}' opacity='0.3' rx='1'/><rect x='8' y='52' width='60' height='2' fill='#e5e7eb' rx='1'/><rect x='8' y='58' width='45' height='2' fill='#e5e7eb' rx='1'/><rect x='8' y='64' width='70' height='2' fill='#e5e7eb' rx='1'/><text x='60' y='14' fill='white' font-size='9' text-anchor='middle' font-family='Arial'>${label}</text></svg>`)}`;
  }

  private buildSampleData(): DocumentData {
    const org = this.orgDetails;
    return {
      docType: this.docType,
      docNumber:
        this.docType === 'invoice'
          ? 'INV-0001'
          : this.docType === 'quotation'
            ? 'QT-0001'
            : 'SL-0001',
      docDate: new Date().toISOString(),
      dueDate:
        this.docType !== 'sale'
          ? new Date(Date.now() + 30 * 86400000).toISOString()
          : undefined,
      orgName: org?.name ?? 'Lumina Business Ltd.',
      orgAddress: org?.address ?? '123 Moi Avenue, Nairobi, Kenya',
      orgPhone: org?.contact ?? '+254 700 000 000',
      orgEmail: org?.email ?? 'info@luminabusiness.co.ke',
      orgLogo: org?.logoUrl ?? '',
      customerName: 'John Doe',
      customerPhone: '+254 722 000 000',
      customerEmail: 'john@example.com',
      customerType: 'BUSINESS',
      kraPin: 'A001234567X',
      items: [
        {
          name: 'Product A',
          sku: 'PRD-001',
          description: 'High quality product',
          quantity: 2,
          unitPrice: 1500,
          discount: 0,
          taxRate: 16,
          total: 3000,
        },
        {
          name: 'Product B',
          sku: 'PRD-002',
          quantity: 1,
          unitPrice: 2500,
          total: 2500,
        },
        { name: 'Service Charge', quantity: 1, unitPrice: 500, total: 500 },
      ],
      subtotal: 6000,
      taxAmount: 480,
      discountAmount: 0,
      total: 6480,
      amountPaid: 6480,
      balanceDue: 0,
      paymentMethod: 'M-Pesa',
      notes: 'Payment due within 30 days.',
      terms:
        'All prices are in KSH. Goods once sold cannot be returned without prior agreement.',
    };
  }
}
