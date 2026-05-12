// src/shared/components/organization-switcher/organization-switcher.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserOrganization } from '../../interfaces/user-organization.interface';
import { UserInterface } from '../../interfaces/auth.interface';
import { Subject, takeUntil } from 'rxjs';
import { LocalStorageService } from '../../Services/local-storage.service';
import { MultiOrganizationService } from '../../Services/multi-organization.service';

@Component({
  selector: 'app-organization-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" *ngIf="organizations.length > 1">
      <!-- Current Organization Display -->
      <button
        (click)="toggleDropdown()"
        class="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 text-gray-900 dark:text-white min-w-0"
        [class.ring-2]="isDropdownOpen"
        [class.ring-blue-500]="isDropdownOpen"
        aria-label="Switch organization"
      >
        <!-- Organization Logo or Initial -->
        <div class="relative w-6 h-6 flex-shrink-0">
          <img
            *ngIf="currentOrganization?.logoUrl"
            [src]="currentOrganization!.logoUrl"
            [alt]="currentOrganization?.name + ' logo'"
            class="w-6 h-6 rounded-full object-cover"
            (error)="onImageError($event)"
          />
          <div
            *ngIf="!currentOrganization?.logoUrl"
            class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold"
            [title]="currentOrganization?.name"
          >
            {{ getOrganizationInitial(currentOrganization?.name) }}
          </div>
        </div>

        <!-- Organization Info (Hidden on mobile) -->
        <div class="flex flex-col items-start min-w-0 hidden sm:block">
          <span
            class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32"
          >
            {{ currentOrganization?.name || 'Select Organization' }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-300 truncate">
            {{
              currentOrganization?.isPrimary
                ? 'Primary'
                : currentOrganization?.role
            }}
          </span>
        </div>

        <!-- Dropdown Arrow -->
        <i
          class="material-icons text-sm transform transition-transform duration-200 flex-shrink-0"
          [class.rotate-180]="isDropdownOpen"
        >
          expand_more
        </i>
      </button>

      <!-- Dropdown Menu -->
      <div
        *ngIf="isDropdownOpen"
        class="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 max-h-80 overflow-y-auto"
      >
        <div class="py-2">
          <!-- Header -->
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Switch Organization</span
            >
          </div>

          <!-- Loading State -->
          <div *ngIf="loading" class="px-4 py-8 text-center">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"
            ></div>
            <span class="text-sm text-gray-500 dark:text-gray-400 mt-2"
              >Loading organizations...</span
            >
          </div>

          <!-- Organization List -->
          <div class="py-1" *ngIf="!loading">
            <button
              *ngFor="let org of organizations; trackBy: trackByOrgId"
              (click)="selectOrganization(org)"
              class="w-full flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-left"
              [class.bg-gray-100]="org.id === currentOrganization?.id"
              [class.dark:bg-gray-700]="org.id === currentOrganization?.id"
              [disabled]="switching"
            >
              <!-- Organization Logo or Initial -->
              <div class="relative w-8 h-8 mr-3 flex-shrink-0">
                <img
                  *ngIf="org.logoUrl"
                  [src]="org.logoUrl"
                  [alt]="org.name + ' logo'"
                  class="w-8 h-8 rounded-full object-cover"
                  (error)="onImageError($event)"
                />
                <div
                  *ngIf="!org.logoUrl"
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold"
                  [title]="org.name"
                >
                  {{ getOrganizationInitial(org.name) }}
                </div>
              </div>

              <!-- Organization Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white truncate"
                  >
                    {{ org.name }}
                  </span>
                  <!-- Current indicator -->
                  <span
                    *ngIf="org.id === currentOrganization?.id"
                    class="text-xs bg-blue-600 text-white px-2 py-1 rounded-full ml-2"
                  >
                    Current
                  </span>
                </div>

                <div class="flex items-center justify-between mt-1">
                  <span
                    class="text-xs text-gray-500 dark:text-gray-400 truncate"
                  >
                    {{
                      org.isPrimary
                        ? 'Primary Organization'
                        : org.role + ' Role'
                    }}
                  </span>

                  <!-- Primary badge -->
                  <span
                    *ngIf="org.isPrimary"
                    class="text-xs bg-green-600 text-white px-2 py-1 rounded-full ml-2"
                  >
                    Primary
                  </span>
                </div>

                <!-- Address if available -->
                <span
                  *ngIf="org.address"
                  class="text-xs text-gray-600 dark:text-gray-500 truncate block mt-1"
                >
                  {{ org.address }}
                </span>
              </div>

              <!-- Switch indicator -->
              <div
                *ngIf="switching && org.id !== currentOrganization?.id"
                class="ml-2"
              >
                <div
                  class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"
                ></div>
              </div>
            </button>
          </div>

          <!-- No organizations message -->
          <div
            *ngIf="!loading && organizations.length === 0"
            class="px-4 py-6 text-center"
          >
            <i
              class="material-icons text-gray-400 dark:text-gray-500 text-2xl mb-2"
              >business</i
            >
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No organizations available
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Single organization display (no dropdown) -->
    <div
      *ngIf="organizations.length <= 1 && currentOrganization"
      class="flex items-center space-x-2 px-3 py-2"
    >
      <div class="relative w-6 h-6 flex-shrink-0">
        <img
          *ngIf="currentOrganization.logoUrl"
          [src]="currentOrganization.logoUrl"
          [alt]="currentOrganization.name + ' logo'"
          class="w-6 h-6 rounded-full object-cover"
          (error)="onImageError($event)"
        />
        <div
          *ngIf="!currentOrganization.logoUrl"
          class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold"
          [title]="currentOrganization.name"
        >
          {{ getOrganizationInitial(currentOrganization.name) }}
        </div>
      </div>

      <div class="flex flex-col items-start min-w-0 hidden sm:block">
        <span
          class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32"
        >
          {{ currentOrganization.name }}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-300 truncate">
          {{
            currentOrganization.isPrimary ? 'Primary' : currentOrganization.role
          }}
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .dropdown-transition {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @media (max-width: 640px) {
        .w-72 {
          width: 16rem;
          right: -2rem;
        }
      }
    `,
  ],
})
export class OrganizationSwitcherComponent implements OnInit, OnDestroy {
  organizations: UserOrganization[] = [];
  currentOrganization: UserOrganization | null = null;
  isDropdownOpen = false;
  loading = false;
  switching = false;
  // Remove defaultLogoUrl since we'll use initials instead

  private destroy$ = new Subject<void>();

  constructor(
    private multiOrgService: MultiOrganizationService,
    private localStorageService: LocalStorageService,
  ) {}

  ngOnInit() {
    this.loadUserOrganizations();

    // Subscribe to current organization changes
    this.multiOrgService.currentOrganization$
      .pipe(takeUntil(this.destroy$))
      .subscribe((org) => {
        this.currentOrganization = org;
      });

    // Subscribe to organizations list changes
    this.multiOrgService.userOrganizations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((orgs) => {
        this.organizations = orgs;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserOrganizations() {
    const currentUser = this.localStorageService.getItem(
      'user',
      true,
    ) as UserInterface;

    if (currentUser?.id) {
      this.loading = true;
      this.multiOrgService
        .getUserOrganizations(currentUser.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (organizations) => {
            this.organizations = organizations;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading organizations:', error);
            this.loading = false;
          },
        });
    }
  }

  toggleDropdown() {
    if (this.organizations.length > 1) {
      this.isDropdownOpen = !this.isDropdownOpen;
    }
  }

  selectOrganization(organization: UserOrganization) {
    if (this.switching || organization.id === this.currentOrganization?.id) {
      return;
    }

    this.switching = true;
    this.multiOrgService
      .switchOrganization(organization.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.isDropdownOpen = false;
            // Page will reload, so we don't need to reset switching state
          } else {
            this.switching = false;
          }
        },
        error: () => {
          this.switching = false;
        },
      });
  }

  trackByOrgId(index: number, org: UserOrganization): number {
    return org.id;
  }

  getOrganizationInitial(name?: string): string {
    if (!name) return '?';

    // Get first letter of each word, up to 2 letters
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    // For multiple words, take first letter of first two words
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Hide the failed image - the *ngIf will show the initial instead
    img.style.display = 'none';

    // Find the parent container and trigger change detection
    const container = img.closest('.relative');
    if (container) {
      // Force Angular to re-evaluate the *ngIf conditions
      const orgName = img.alt.replace(' logo', '');
      console.log(`Logo failed for ${orgName}, showing initial instead`);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('app-organization-switcher')) {
      this.isDropdownOpen = false;
    }
  }
}
