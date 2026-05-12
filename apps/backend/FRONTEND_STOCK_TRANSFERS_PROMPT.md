# Frontend Implementation Prompt: Stock Transfers Pagination & Filters

Use this file as a guide or paste sections into GitHub Copilot Chat / IDE to scaffold the frontend changes.

---

## 1. API Contract (Backend Already Implemented)

Endpoint: `GET /stock-transfers`

Query Params (all optional unless noted):

- `page`: number (default 1)
- `pageSize`: number (default 20, max 200)
- `startDate`: ISO date string (inclusive)
- `endDate`: ISO date string (inclusive – backend expands to end of day)
- `search`: string (matches: transferNumber, transferredByName, approvedByName, notes, rejectionReason)
- `status`: comma‑separated string of statuses (e.g. `APPROVED,COMPLETED`)
- `organizationId`: number (filters when viewing a specific org)

Response:

```jsonc
{
  "data": [
    /* StockTransfer[] */
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 143,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false,
  },
}
```

Minimal StockTransfer shape expected (extend as needed):

```ts
interface StockTransfer {
  id: number;
  transferNumber: string;
  fromOrganization: { name: string };
  toOrganization: { name: string };
  fromLocation?: { name: string } | null;
  toLocation?: { name: string } | null;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  totalValue: number;
  transferredBy: number;
  transferredByName: string;
  approvedByName?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
}
```

---

## 2. Create / Update Interfaces File (e.g. `stock-transfer.interfaces.ts`)

```ts
export interface StockTransfer {
  id: number;
  transferNumber: string;
  fromOrganization: { name: string };
  toOrganization: { name: string };
  fromLocation?: { name: string } | null;
  toLocation?: { name: string } | null;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  totalValue: number;
  transferredBy: number;
  transferredByName: string;
  approvedByName?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
}

export interface StockTransferQuery {
  page?: number; // default 1
  pageSize?: number; // default 20
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  search?: string;
  status?: string[]; // will serialize as comma-separated
  organizationId?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StockTransferResponse {
  data: StockTransfer[];
  meta: PaginationMeta;
}
```

---

## 3. Angular Service Method (e.g. `stock-transfer.service.ts`)

Add or update:

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  StockTransferResponse,
  StockTransferQuery,
} from './stock-transfer.interfaces';

@Injectable({ providedIn: 'root' })
export class StockTransferService {
  private baseUrl = '/api'; // adjust if needed
  constructor(private http: HttpClient) {}

  getStockTransfers(
    query: StockTransferQuery = {},
  ): Observable<StockTransferResponse> {
    let params = new HttpParams();

    const withDefault = {
      page: 1,
      pageSize: 20,
      ...query,
    };

    Object.entries(withDefault).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'status' && Array.isArray(value) && value.length) {
        params = params.set('status', value.join(','));
      } else {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<StockTransferResponse>(
      `${this.baseUrl}/stock-transfers`,
      { params },
    );
  }
}
```

---

## 4. Component Logic (e.g. `stock-transfer.component.ts`)

Key features:

- Reactive form or individual controls
- Debounced search (400ms)
- Pagination (page, pageSize)
- Multi-select status
- Date pickers for start/end
- Organization filter (optional)

Example (simplified):

```ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { StockTransferService } from './stock-transfer.service';
import {
  StockTransfer,
  StockTransferQuery,
  StockTransferResponse,
} from './stock-transfer.interfaces';

@Component({
  selector: 'app-stock-transfer-list',
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss'],
})
export class StockTransferComponent implements OnInit, OnDestroy {
  transfers: StockTransfer[] = [];
  meta: StockTransferResponse['meta'] | null = null;
  loading = false;
  error: string | null = null;

  page = 1;
  pageSize = 20;

  statuses = ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  selectedStatuses: string[] = [];

  filterForm = this.fb.group({
    search: [''],
    startDate: [''],
    endDate: [''],
    organizationId: [''],
  });

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private service: StockTransferService,
  ) {}

  ngOnInit() {
    this.setupSearchListener();
    this.load();
  }

  setupSearchListener() {
    this.filterForm
      .get('search')
      ?.valueChanges.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.page = 1;
        this.load();
      });
  }

  buildQuery(): StockTransferQuery {
    const { search, startDate, endDate, organizationId } =
      this.filterForm.value;
    return {
      page: this.page,
      pageSize: this.pageSize,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: this.selectedStatuses.length ? this.selectedStatuses : undefined,
      organizationId: organizationId ? Number(organizationId) : undefined,
    };
  }

  load() {
    this.loading = true;
    this.error = null;
    const query = this.buildQuery();
    this.service.getStockTransfers(query).subscribe({
      next: (res) => {
        this.transfers = res.data;
        this.meta = res.meta;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load transfers';
        this.loading = false;
      },
    });
  }

  onStatusToggle(status: string) {
    if (this.selectedStatuses.includes(status)) {
      this.selectedStatuses = this.selectedStatuses.filter((s) => s !== status);
    } else {
      this.selectedStatuses.push(status);
    }
    this.page = 1;
    this.load();
  }

  onDateChange() {
    this.page = 1;
    this.load();
  }

  changePage(page: number) {
    if (!this.meta) return;
    if (page < 1 || page > this.meta.totalPages) return;
    this.page = page;
    this.load();
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.load();
  }

  resetFilters() {
    this.filterForm.reset({
      search: '',
      startDate: '',
      endDate: '',
      organizationId: '',
    });
    this.selectedStatuses = [];
    this.page = 1;
    this.pageSize = 20;
    this.load();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 5. Component Template (`stock-transfer.component.html` outline)

```html
<div class="filters">
  <input
    type="text"
    placeholder="Search transfers..."
    [formControl]="filterForm.get('search')"
  />
  <input type="date" formControlName="startDate" (change)="onDateChange()" />
  <input type="date" formControlName="endDate" (change)="onDateChange()" />
  <input
    type="number"
    min="1"
    placeholder="Org ID"
    formControlName="organizationId"
    (change)="onDateChange()"
  />

  <div class="status-filters">
    <button
      type="button"
      *ngFor="let s of statuses"
      (click)="onStatusToggle(s)"
      [class.active]="selectedStatuses.includes(s)"
    >
      {{ s }}
    </button>
  </div>

  <button type="button" (click)="resetFilters()">Reset</button>
</div>

<div *ngIf="loading">Loading...</div>
<div *ngIf="error" class="error">{{ error }}</div>
<div *ngIf="!loading && !error && transfers.length === 0">
  No transfers found.
</div>

<table *ngIf="transfers.length">
  <thead>
    <tr>
      <th>#</th>
      <th>Transfer #</th>
      <th>From</th>
      <th>To</th>
      <th>Status</th>
      <th>Total</th>
      <th>Created</th>
      <th>Approved</th>
      <th>Completed</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let t of transfers; let i = index">
      <td>{{ (meta?.pageSize || 20) * ((meta?.page || 1) - 1) + i + 1 }}</td>
      <td>{{ t.transferNumber }}</td>
      <td>{{ t.fromOrganization?.name }}</td>
      <td>{{ t.toOrganization?.name }}</td>
      <td>
        <span class="status-badge status-{{ t.status }}">{{ t.status }}</span>
      </td>
      <td>{{ t.totalValue | number:'1.2-2' }}</td>
      <td>{{ t.createdAt | date:'short' }}</td>
      <td>{{ t.approvedAt ? (t.approvedAt | date:'short') : '-' }}</td>
      <td>{{ t.completedAt ? (t.completedAt | date:'short') : '-' }}</td>
    </tr>
  </tbody>
</table>

<div class="pagination" *ngIf="meta">
  <button (click)="changePage(meta.page - 1)" [disabled]="!meta.hasPrevPage">
    Prev
  </button>
  <span
    >Page {{ meta.page }} / {{ meta.totalPages }} (Total: {{ meta.total
    }})</span
  >
  <button (click)="changePage(meta.page + 1)" [disabled]="!meta.hasNextPage">
    Next
  </button>
  <select [ngModel]="pageSize" (ngModelChange)="changePageSize($event)">
    <option *ngFor="let s of [10,20,50,100]" [value]="s">{{ s }}</option>
  </select>
</div>
```

---

## 6. SCSS Snippet (`stock-transfer.component.scss`)

```scss
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.status-filters button {
  padding: 0.4rem 0.7rem;
  border: 1px solid #ccc;
  background: #f8f8f8;
  cursor: pointer;
}
.status-filters button.active {
  background: #193bff;
  color: #fff;
  border-color: #193bff;
}
.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.status-PENDING {
  background: #fff3cd;
  color: #856404;
}
.status-APPROVED {
  background: #cce5ff;
  color: #004085;
}
.status-COMPLETED {
  background: #d4edda;
  color: #155724;
}
.status-REJECTED {
  background: #f8d7da;
  color: #721c24;
}
.status-CANCELLED {
  background: #e2e3e5;
  color: #41464b;
}
.error {
  color: #b00020;
  margin-top: 0.5rem;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
```

---

## 7. Optional Enhancements

- Persist filters in query params (use Router.navigate with queryParams)
- Add CSV export using current filters
- Add column sorting (server-side or client if dataset small)
- Virtual scrolling if large lists

---

## 8. Acceptance Criteria

- Filters combine correctly
- Search debounced (no excessive calls)
- Status multi-select works (adds/removes tokens visually)
- Pagination updates without resetting filters unless intentional
- Empty state and error state handled
- No TypeScript errors

---

## 9. Example Copilot Request (One-liner)

"Generate Angular component + service to list stock transfers with paginated API (GET /stock-transfers) supporting page, pageSize, startDate, endDate, search, status[], organizationId; include a table, filters, status badges, and pagination controls using above interface definitions."

---

## 10. Follow-up Ideas

- Add a details drawer/modal on row click
- Inline approve/reject actions with optimistic update
- Cache recent queries in a shared store (NgRx / signal store)

---

Paste what you need into Copilot or implement directly. This file is your blueprint.
