import { Component, OnInit } from '@angular/core';
import {
  Requisition,
  RequisitionStatus,
  RequisitionPriority,
} from '../../../../../shared/interfaces/store.interface';
import { RequisitionService } from '../../../../../shared/Services/requisition.service';
import { AddRequisitionComponent } from '../add-requisition/add-requisition.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { finalize } from 'rxjs/operators';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-show-requisitions',
  templateUrl: './show-requisitions.component.html',
  styleUrl: './show-requisitions.component.scss',
})
export class ShowRequisitionsComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddRequisitionComponent,
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AddRequisitionComponent,
  );
  requisitions: Requisition[] = [];
  private allRequisitions: Requisition[] = [];
  query: string = '';
  loading: boolean = false;
  statusFilter: RequisitionStatus | '' = '';
  expandedRequisitionId: number | null = null;

  constructor(
    private requisitionService: RequisitionService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.getAllRequisitions();
  }

  onInputChange() {
    this.filterLocally();
  }

  onStatusChange() {
    this.getAllRequisitions();
  }

  getAllRequisitions(): void {
    this.loading = true;
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.requisitionService
      .getAllRequisitions(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((requisitions) => {
        this.allRequisitions = requisitions;
        this.filterLocally();
      });
  }

  filterLocally(): void {
    if (this.query && this.query.trim()) {
      const q = this.query.toLowerCase();
      this.requisitions = this.allRequisitions.filter(
        (r) =>
          r.requisitionNumber?.toLowerCase().includes(q) ||
          r.department?.name?.toLowerCase().includes(q) ||
          r.items?.some((i) =>
            i.storeProduct?.productName?.toLowerCase().includes(q),
          ) ||
          r.requester?.fullName?.toLowerCase().includes(q),
      );
    } else {
      this.requisitions = [...this.allRequisitions];
    }
  }

  toggleExpand(id: number): void {
    this.expandedRequisitionId = this.expandedRequisitionId === id ? null : id;
  }

  approveRequisition(id: number): void {
    if (confirm('Approve this requisition? Stock will be deducted.')) {
      this.loading = true;
      this.requisitionService
        .approveRequisition(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(
          () => {
            this.toast.success('Requisition approved');
            this.getAllRequisitions();
          },
          (error) =>
            this.toast.error(error.error?.message || 'Error approving'),
        );
    }
  }

  rejectRequisition(id: number): void {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      this.loading = true;
      this.requisitionService
        .rejectRequisition(id, reason)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(
          () => {
            this.toast.success('Requisition rejected');
            this.getAllRequisitions();
          },
          (error) =>
            this.toast.error(error.error?.message || 'Error rejecting'),
        );
    }
  }

  issueRequisition(id: number): void {
    if (confirm('Mark this requisition as issued?')) {
      this.loading = true;
      this.requisitionService
        .issueRequisition(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(
          () => {
            this.toast.success('Requisition issued');
            this.getAllRequisitions();
          },
          (error) => this.toast.error(error.error?.message || 'Error issuing'),
        );
    }
  }

  cancelRequisition(id: number): void {
    if (confirm('Cancel this requisition?')) {
      this.loading = true;
      this.requisitionService
        .cancelRequisition(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Requisition cancelled');
          this.getAllRequisitions();
        });
    }
  }

  deleteRequisition(id: number): void {
    if (confirm('Delete this requisition permanently?')) {
      this.loading = true;
      this.requisitionService
        .deleteRequisition(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Requisition deleted');
          this.getAllRequisitions();
        });
    }
  }

  openAddDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.dialog.openDialog().subscribe((resp) => {
      if (resp) this.getAllRequisitions();
    });
  }

  openUpdateDialog(requisition: Requisition) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.updateDialog.openDialog(requisition).subscribe((resp) => {
      if (resp) this.getAllRequisitions();
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
      case 'APPROVED':
        return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      case 'REJECTED':
        return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      case 'ISSUED':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'PARTIALLY_ISSUED':
        return 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30';
      case 'CANCELLED':
        return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
      default:
        return 'text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'LOW':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/50';
      case 'MEDIUM':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      case 'URGENT':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-gray-400 bg-gray-100 dark:bg-gray-700/50';
    }
  }
}
