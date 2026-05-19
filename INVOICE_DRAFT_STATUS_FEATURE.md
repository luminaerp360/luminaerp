# Invoice Draft/Finalized Status Feature

## Overview
Added the ability to create invoices as either **Draft** or **Pending** (finalized) status when creating credit sale invoices. Previously, all invoices were created as `DRAFT` by default with no option to change this.

## Problem
- All invoices were automatically created with status `DRAFT`
- Users had no option to create an invoice as finalized/ready-to-process
- Required manual status update after creation to change from draft

## Solution Implemented

### Backend Changes

#### 1. Updated CreateInvoiceDto ([invoice.dto.ts](apps/backend/src/invoices/invoice.dto.ts#L188-L191))
Added optional `status` field:
```typescript
// Invoice status (defaults to DRAFT if not provided)
@IsOptional()
@IsEnum(InvoiceStatus)
status?: InvoiceStatus;
```

#### 2. Updated Invoice Service ([invoice.service.ts](apps/backend/src/invoices/invoice.service.ts#L124))
Modified invoice creation to use provided status or default to DRAFT:
```typescript
// Before:
status: 'DRAFT',

// After:
status: dto.status || 'DRAFT',
```

### Frontend Changes

#### 1. Updated Frontend Interface ([invoice.interface.ts](apps/frontend/src/app/shared/interfaces/invoice.interface.ts#L154))
Added `status` field to `CreateInvoiceDto`:
```typescript
export interface CreateInvoiceDto {
  // ... other fields
  status?: InvoiceStatus;
}
```

#### 2. Updated Credit Sales Component ([make-credit-sales.component.ts](apps/frontend/src/app/modules/sales/components/credit%20sales/make-credit-sales/make-credit-sales.component.ts))

**Added properties:**
```typescript
// Line 123-124
saveAsDraft: boolean = false;
InvoiceStatus = InvoiceStatus; // Expose enum to template
```

**Updated submit method (Line 1132):**
```typescript
const invoiceDto: CreateInvoiceDto = {
  // ... other fields

  // Invoice status - save as draft or finalize
  status: this.saveAsDraft ? InvoiceStatus.DRAFT : InvoiceStatus.PENDING,
};
```

#### 3. Added UI Toggle ([make-credit-sales.component.html](apps/frontend/src/app/modules/sales/components/credit%20sales/make-credit-sales/make-credit-sales.component.html#L455-L486))

Beautiful checkbox toggle with visual feedback:
- **Unchecked (Default)**: Creates invoice as `PENDING` (finalized, ready for processing)
- **Checked**: Creates invoice as `DRAFT` (for review/editing later)
- Real-time status indicator showing what will happen
- Dark mode support
- Positioned between commission section and terms summary

## Usage

### For Users

1. **Navigate to Credit Sales**: Go to Create Credit Sale/Invoice page
2. **Fill in customer and products**: As usual
3. **Choose Invoice Status**:
   - **Leave unchecked** (default): Invoice created as **Pending** - ready for immediate processing, sending, and payment collection
   - **Check "Save as Draft"**: Invoice created as **Draft** - can be reviewed, edited, or completed later

4. **Visual Indicators**:
   - ✅ **Unchecked**: "Invoice will be created as **Pending** and ready for processing" (green text)
   - ✏️ **Checked**: "Invoice will be saved as **Draft** for review and editing later" (blue text)

### Invoice Status Workflow

```
┌──────────────────────────────────────────────────┐
│         Create Invoice Form                      │
│                                                   │
│  □ Save as Draft                                 │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │ Unchecked (Default)                      │    │
│  │ ↓                                         │    │
│  │ Status: PENDING                          │    │
│  │ → Ready for immediate processing         │    │
│  │ → Can send to customer                   │    │
│  │ → Can record payments                    │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │ ☑ Checked                                │    │
│  │ ↓                                         │    │
│  │ Status: DRAFT                            │    │
│  │ → Saved for review                       │    │
│  │ → Can edit details later                 │    │
│  │ → Must finalize before sending           │    │
│  └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

## Invoice Status Flow

### Available Statuses (from InvoiceStatus enum)
- `DRAFT` - Initial draft, can be edited
- `PENDING` - Finalized and awaiting payment
- `SENT` - Sent to customer
- `VIEWED` - Customer viewed the invoice
- `PARTIALLY_PAID` - Some payment received
- `PAID` - Fully paid
- `OVERDUE` - Past due date
- `CANCELLED` - Cancelled invoice
- `REFUNDED` - Refunded invoice

### Status Progression
```
DRAFT → PENDING → SENT → VIEWED → PARTIALLY_PAID → PAID
                    ↓
                 OVERDUE
```

## Benefits

### ✅ Flexibility
- Users can choose workflow: immediate finalization OR draft for review
- Matches real-world business processes

### ✅ Quality Control
- Draft option allows review before finalizing
- Prevents sending incomplete invoices

### ✅ Efficiency
- Default behavior (unchecked) creates finalized invoices immediately
- No extra step needed for standard workflows

### ✅ User Experience
- Clear visual feedback on what will happen
- Intuitive checkbox with helpful descriptions
- Positioned logically in the form flow

## Testing

### Test Case 1: Create Invoice as Pending (Default)
1. Go to Create Credit Sale
2. Fill in customer, products, and terms
3. **Leave "Save as Draft" UNCHECKED**
4. Click Submit
5. **Expected**: Invoice created with status = `PENDING`
6. **Verify**: Invoice appears in invoices list with "Pending" badge

### Test Case 2: Create Invoice as Draft
1. Go to Create Credit Sale
2. Fill in customer, products, and terms
3. **CHECK "Save as Draft"**
4. Verify text changes to: "Invoice will be saved as **Draft** for review and editing later"
5. Click Submit
6. **Expected**: Invoice created with status = `DRAFT`
7. **Verify**: Invoice appears in invoices list with "Draft" badge

### Test Case 3: Toggle Behavior
1. Go to Create Credit Sale
2. Toggle "Save as Draft" on and off
3. **Expected**: Description text changes dynamically between:
   - Unchecked: Green text with check icon
   - Checked: Blue text with pencil icon

### Test Case 4: Update Mode
1. Edit an existing invoice
2. **Expected**: Draft toggle should respect existing invoice status
3. Can change status during update

## Database Impact

### No Schema Changes Required
- Uses existing `status` column in `Invoice` table
- No migration needed
- Backwards compatible

### Default Behavior
- If `status` not provided in DTO: defaults to `DRAFT` (backend fallback)
- Frontend explicitly sets status based on checkbox

## Files Modified

### Backend (3 files)
1. `apps/backend/src/invoices/invoice.dto.ts` - Added status field to CreateInvoiceDto
2. `apps/backend/src/invoices/invoice.service.ts` - Use provided status or default to DRAFT
3. (No migration needed - uses existing column)

### Frontend (3 files)
1. `apps/frontend/src/app/shared/interfaces/invoice.interface.ts` - Added status to DTO interface
2. `apps/frontend/src/app/modules/sales/components/credit sales/make-credit-sales/make-credit-sales.component.ts` - Added saveAsDraft logic
3. `apps/frontend/src/app/modules/sales/components/credit sales/make-credit-sales/make-credit-sales.component.html` - Added UI toggle

## API Documentation

### POST /invoices/:organizationId

**Request Body:**
```json
{
  "invoiceType": "CREDIT_SALE",
  "customerId": 123,
  "items": [...],
  "status": "PENDING",  // ← NEW: Optional field
  // ... other fields
}
```

**Status Values:**
- `"DRAFT"` - Save as draft
- `"PENDING"` - Finalize immediately
- Omit field - Defaults to `"DRAFT"`

**Response:**
```json
{
  "id": 456,
  "invoiceNumber": "INV-2026-00002",
  "status": "PENDING",  // ← Reflects provided value
  // ... other fields
}
```

## Backward Compatibility

### ✅ Fully Compatible
- Existing API calls without `status` field continue to work
- Defaults to `DRAFT` if not provided
- No breaking changes
- Frontend checkbox defaults to unchecked (creates PENDING invoices)

## Future Enhancements

### Possible Additions
1. **Bulk Status Update**: Change multiple invoices from draft to pending
2. **Draft Reminders**: Notify users of old draft invoices
3. **Auto-Finalize**: Option to auto-finalize drafts after X days
4. **Approval Workflow**: Require approval before finalizing certain invoices
5. **Status Change History**: Track when and who changed invoice status

## Support & Troubleshooting

### Issue: All invoices still created as DRAFT
**Solution**: Ensure frontend is updated and checkbox is working. Check browser console for errors.

### Issue: Status field validation error
**Solution**: Ensure status value is from InvoiceStatus enum. Valid values: `DRAFT`, `PENDING`, `SENT`, `VIEWED`, etc.

### Issue: Toggle not appearing
**Solution**: Clear browser cache, ensure FormsModule is imported in the module.

---

**Implemented by:** Claude AI Assistant
**Date:** 2026-05-20
**Version:** 1.0.0
**Status:** ✅ Ready for Testing
