// src/app/modules/main/layout/main-layout/main-layout.component.ts
import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { AuthService } from '../../../../shared/Services/auth.service';
import { PermissionService } from '../../../../shared/Services/permission.service';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BackButtonComponent } from '../../../../shared/Data/components/back-button/back-button.component';
import { OrganizationSwitcherComponent } from '../../../../shared/components/organization-switcher/organization-switcher.component';
import { SharedModule } from '../../../../shared/shared.module';

interface MenuItem {
  icon: string;
  label: string;
  link?: string;
  subItems?: MenuItem[];
  expanded?: boolean;
  permissionId: string | null;
  requiredAction?: string; // Optional: specific action required (e.g., 'update', 'delete')
}

interface Permission {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    BackButtonComponent,
    OrganizationSwitcherComponent,
    SharedModule,
  ],
})
export class MainLayoutComponent implements OnInit {
  currentUser: UserInterface | null = null;
  isSidebarOpen = false;
  isMobile = false;
  sidebarHovered = false;
  private hoverTimeout: any = null;
  currentTheme: 'light' | 'dark' | 'system' = 'light';
  showSettingsDropdown = false;
  showSupportDropdown = false;
  showProfileDropdown = false;

  // Trial banner
  trialInfo: { daysRemaining: number; status: string } | null = null;
  trialBannerDismissed = false;

  permissions: Permission[] = [
    { id: 'dashboard', name: 'Dashboard', icon: 'chart-bar' },
    { id: 'products', name: 'Products', icon: 'cube' },
    { id: 'categories', name: 'Categories', icon: 'folder' },
    { id: 'inventory', name: 'Inventory', icon: 'clipboard-list' },
    { id: 'suppliers', name: 'Suppliers', icon: 'truck' },
    { id: 'sales', name: 'Sales', icon: 'shopping-cart' },
    { id: 'credit_sales', name: 'Credit Sales', icon: 'credit-card' },
    { id: 'reports', name: 'Reports', icon: 'document-report' },
    { id: 'customers', name: 'Customers', icon: 'users' },
    { id: 'stock', name: 'Stock', icon: 'archive' },
    { id: 'users', name: 'Users', icon: 'user-group' },
    { id: 'quotations', name: 'Quotations', icon: 'document' },
    { id: 'lpo', name: 'LPO', icon: 'clipboard-check' },
    { id: 'setting', name: 'Setting', icon: 'clipboard-check' },
  ];

  menuItems: MenuItem[] = [
    {
      icon: 'dashboard',
      label: 'Dashboard',
      link: '/dashboard',
      permissionId: 'dashboard',
    },
    {
      icon: 'shopping_cart',
      label: 'Sales',
      permissionId: 'sales',
      subItems: [
        { icon: '', label: 'Make Sale', link: '/sales', permissionId: 'sales' },
        {
          icon: '',
          label: 'Sales Receipts',
          link: '/cash-sales',
          permissionId: 'sales',
        },
        {
          icon: '',
          label: 'Invoice',
          link: '/invoices',
          permissionId: 'credit_sales',
        },
        {
          icon: '',
          label: 'Recurring Invoices',
          link: '/recurring-invoices',
          permissionId: 'credit_sales',
        },
        {
          icon: '',
          label: 'Quotations',
          link: '/quotations',
          permissionId: 'quotations',
        },
        {
          icon: '',
          label: 'Commission',
          link: '/commission',
          permissionId: 'sales',
        },
      ],
    },
    {
      icon: 'inventory',
      label: 'Inventory',
      permissionId: 'inventory',
      subItems: [
        {
          icon: '',
          label: 'Current Stock',
          link: '/stock',
          permissionId: 'stock',
        },
        {
          icon: '',
          label: 'Batch Management',
          link: '/batch-management',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Reorder Dashboard',
          link: '/reorder-dashboard',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Stock Sheet',
          link: '/stock-sheet',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Stock Movements',
          link: '/stock-movements',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Categories',
          link: '/categories',
          permissionId: 'categories',
        },
        {
          icon: '',
          label: 'Make Purchase',
          link: '/inventory',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Purchases',
          link: '/purchases',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Branch Stock Transfer',
          link: '/stock-transfer',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Stock Take',
          link: '/stock-take',
          permissionId: 'inventory',
        },
        { icon: '', label: 'Lpo', link: '/lpo', permissionId: 'lpo' },
      ],
    },
    {
      icon: 'store',
      label: 'Store',
      permissionId: 'inventory',
      subItems: [
        {
          icon: '',
          label: 'Departments',
          link: '/store/departments',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Store Categories',
          link: '/store/categories',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Store Products',
          link: '/store/products',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Store Purchases',
          link: '/store/purchases',
          permissionId: 'inventory',
        },
        {
          icon: '',
          label: 'Requisitions',
          link: '/store/requisitions',
          permissionId: 'inventory',
        },
      ],
    },
    {
      icon: 'assessment',
      label: 'Reports',
      permissionId: 'reports',
      subItems: [
        {
          icon: '',
          label: 'Reports Hub',
          link: '/reports-hub',
          permissionId: 'reports',
        },
        {
          icon: '',
          label: 'Sales Reports',
          link: '/sale-reports',
          permissionId: 'reports',
        },
        {
          icon: '',
          label: 'Purchase Reports',
          link: '/purchase-reports',
          permissionId: 'reports',
        },
        {
          icon: '',
          label: 'System Logs',
          link: '/system-logs',
          permissionId: 'reports',
        },
      ],
    },
    // {
    //   icon: 'support',
    //   label: 'Support',
    //   permissionId: null,
    //   expanded: false,
    //   subItems: [
    //     {
    //       icon: '',
    //       label: 'Tickets',
    //       link: '/tickets',
    //       permissionId: null,
    //     },
    //   ],
    // },
    {
      icon: 'assessment',
      label: 'Accounting',
      permissionId: 'reports',
      subItems: [
        {
          icon: '',
          label: 'Chart of Accounts',
          link: '/chart-of-accounts',
          permissionId: 'reports',
        },
        {
          icon: '',
          label: 'Debtors',
          link: '/debtors',
          permissionId: 'sales',
          requiredAction: 'update',
        },
        {
          icon: '',
          label: 'Wallets',
          link: '/debtors/wallets',
          permissionId: 'sales',
          requiredAction: 'update',
        },

        {
          icon: '',
          label: 'Creditors',
          link: '/creditors',
          permissionId: 'reports',
        },
        // {
        //   icon: '',
        //   label: 'Accounts Receivable',
        //   link: '/accounts-receivable',
        //   permissionId: 'reports',
        // },
        {
          icon: '',
          label: 'Bills',
          link: '/bills',
          permissionId: 'reports',
        },

        {
          icon: '',
          label: 'Expenses',
          link: '/expenses',
          permissionId: 'reports',
        },
        {
          icon: '',
          label: 'Payments',
          link: '/payments',
          permissionId: 'reports',
        },
      ],
    },
    { icon: 'group', label: 'Users', link: '/users', permissionId: 'users' },
    {
      icon: 'category',
      label: 'Products',
      link: '/products',
      permissionId: 'products',
    },
    {
      icon: 'local_shipping',
      label: 'Suppliers',
      link: '/suppliers',
      permissionId: 'suppliers',
    },
    {
      icon: 'people',
      label: 'Customers',
      link: '/customers',
      permissionId: 'customers',
    },
    {
      icon: 'settings',
      label: 'Settings',
      permissionId: 'setting',
      subItems: [
        {
          icon: '',
          label: 'Organization Details',
          link: '/org-details-setting',
          permissionId: 'setting',
        },
        {
          icon: '',
          label: 'App Settings',
          link: '/app-settings',
          permissionId: 'setting',
        },
        {
          icon: '',
          label: 'System Logs',
          link: '/system-logs',
          permissionId: 'setting',
        },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private eRef: ElementRef,
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    const user = localStorage.getItem('user');
    this.currentUser = user ? JSON.parse(user) : null;
    this.loadTheme();
    this.setupSystemThemeListener();
    this.authService.checkWhetherSessionHasExpired();
    this.authService.user$.subscribe((user) => {
      console.log('Current user in MainLayoutComponent:', user);
      if (user) {
        console.log('User permissions:', user.permissions);
      }
    });
    this.loadTrialInfo();
  }

  private loadTrialInfo(): void {
    const raw = localStorage.getItem('subscriptionStatus');
    if (!raw) return;
    try {
      const sub = JSON.parse(raw);
      if (sub?.status === 'TRIAL') {
        this.trialInfo = {
          daysRemaining: sub.daysRemaining ?? 0,
          status: 'TRIAL',
        };
        this.trialBannerDismissed =
          sessionStorage.getItem('trialBannerDismissed') === '1';
      }
    } catch {
      /* ignore parse errors */
    }
  }

  dismissTrialBanner(): void {
    this.trialBannerDismissed = true;
    sessionStorage.setItem('trialBannerDismissed', '1');
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 1024;
    // On desktop, sidebar is open by default; on mobile, it's closed
    this.isSidebarOpen = !this.isMobile;
  }

  hasPermission(permissionId: string): Observable<boolean> {
    return this.authService.hasPermission(permissionId);
  }

  /**
   * Check if user has a specific action permission for a module
   * @param moduleId - The module identifier (e.g., 'sales', 'products')
   * @param action - The action to check (e.g., 'update', 'delete', 'create', 'view')
   */
  hasActionPermission(moduleId: string, action: string): Observable<boolean> {
    console.log('=== hasActionPermission Debug ===');
    console.log('Module ID:', moduleId);
    console.log('Action:', action);

    // Use PermissionService which combines module access + global CRUD permissions
    return this.permissionService.canPerformAction$(
      moduleId,
      action as 'create' | 'update' | 'delete' | 'view',
    );
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const wasMobile = this.isMobile;
    this.checkScreenSize();

    // If switching from mobile to desktop, open sidebar
    // If switching from desktop to mobile, close sidebar
    if (wasMobile && !this.isMobile) {
      this.isSidebarOpen = true;
    } else if (!wasMobile && this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close sidebar on mobile when clicking outside
    if (
      this.isMobile &&
      this.isSidebarOpen &&
      !this.eRef.nativeElement.contains(event.target)
    ) {
      this.isSidebarOpen = false;
    }
    // Close all dropdowns
    this.showSettingsDropdown = false;
    this.showSupportDropdown = false;
    this.showProfileDropdown = false;
  }

  toggleSidebar(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  /** Gmail-style: expand sidebar on hover when collapsed (desktop only) */
  onSidebarMouseEnter() {
    if (this.isMobile || this.isSidebarOpen) return;
    clearTimeout(this.hoverTimeout);
    this.sidebarHovered = true;
  }

  onSidebarMouseLeave() {
    if (this.isMobile || this.isSidebarOpen) return;
    // Small delay so the sidebar doesn't flicker
    this.hoverTimeout = setTimeout(() => {
      this.sidebarHovered = false;
      // Collapse any expanded submenus when hover ends
      this.menuItems.forEach((item) => {
        if (item.subItems) item.expanded = false;
      });
    }, 200);
  }

  /** Close sidebar after clicking a link (hover-expanded or mobile) */
  onNavClick() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    } else if (this.sidebarHovered) {
      this.sidebarHovered = false;
      this.menuItems.forEach((item) => {
        if (item.subItems) item.expanded = false;
      });
    }
  }

  toggleSubMenu(item: MenuItem, event: Event) {
    event.stopPropagation();
    // Close other expanded items on mobile for better UX
    if (this.isMobile) {
      this.menuItems.forEach((menuItem) => {
        if (menuItem !== item && menuItem.subItems) {
          menuItem.expanded = false;
        }
      });
    }
    item.expanded = !item.expanded;
  }

  logout() {
    this.authService.logout();
  }

  cycleTheme() {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.currentTheme = themes[nextIndex];
    localStorage.setItem('theme', this.currentTheme);
    this.applyTheme();
  }

  toggleSettingsDropdown(event: Event) {
    event.stopPropagation();
    this.showSettingsDropdown = !this.showSettingsDropdown;
    this.showSupportDropdown = false;
    this.showProfileDropdown = false;
  }

  toggleSupportDropdown(event: Event) {
    event.stopPropagation();
    this.showSupportDropdown = !this.showSupportDropdown;
    this.showSettingsDropdown = false;
    this.showProfileDropdown = false;
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showSettingsDropdown = false;
    this.showSupportDropdown = false;
  }

  getInitials(): string {
    if (!this.currentUser?.fullName) return 'U';
    return this.currentUser.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | 'system';
    this.currentTheme = savedTheme || 'light';
    this.applyTheme();
  }

  private applyTheme() {
    const html = document.documentElement;

    if (this.currentTheme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      if (prefersDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    } else if (this.currentTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  private setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        this.applyTheme();
      }
    });
  }
}
