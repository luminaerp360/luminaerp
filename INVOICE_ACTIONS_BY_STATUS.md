# Invoice Actions by Status - Current vs Recommended

## Current Actions Available (All Statuses)

### ✅ Currently Implemented Actions

| Action | Mobile (Lines) | Desktop (Lines) | Restrictions | Icon |
|--------|---------------|-----------------|--------------|------|
| **View Invoice** | 408-414 | 730-736 | None | 👁️ bi-eye |
| **Record Payment** | 415-424 | 737-746 | Only if NOT fully paid | 💰 bi-cash-coin |
| **Download PDF** | 425-433 | 747-755 | None | 📄 bi-file-pdf |
| **Custom Print/PDF** | 434-440 | 756-764 | None | 🎨 bi-sliders |
| **Send Invoice** | 441-447 | 765-773 | None | 📧 bi-send |
| **Copy Public Link** | 448-457 | 774-783 | Only if has publicToken | 🔗 bi-link-45deg |
| **Edit** | 461-468 | 791-800 | Permission: canUpdateInvoice | ✏️ bi-pencil |
| **Cancel** | 469-478 | 801-811 | Permission: canDeleteInvoice<br>Status: NOT PAID | ❌ bi-x-circle |
| **Delete** | 479-486 | 812-820 | Permission: canDeleteInvoice<br>amountPaid === 0 | 🗑️ bi-trash |

### Current Behavior
- **No status-specific action filtering** - All actions show for all statuses (except permission-based)
- DRAFT invoices have same actions as PENDING/SENT
- No "Finalize Draft" or "Mark as Sent" actions
- No visual distinction between draft and final invoices in action menu

---

## ❌ Issues with Current Implementation

### 1. DRAFT Invoices
**Problem:** Draft invoices can be sent/paid/recorded immediately without finalization
- ❌ "Send Invoice" available on DRAFT (shouldn't send drafts)
- ❌ "Record Payment" available on DRAFT (draft not finalized)
- ❌ No "Finalize" or "Convert to Pending" action

### 2. PENDING Invoices
**Problem:** Missing status progression actions
- ❌ No "Mark as Sent" action (manually track sending)
- ❌ No "Approve" action (if approval workflow needed)

### 3. Action Organization
**Problem:** Actions not grouped logically by status workflow
- All actions in one flat list
- No visual hierarchy (primary vs secondary actions)
- No status-specific action highlighting

---

## ✅ Recommended Status-Based Actions

### 📝 DRAFT Status

**Purpose:** Work in progress, needs review before finalizing

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **✅ Finalize Invoice** | bi-check-circle | PRIMARY | Convert DRAFT → PENDING (ready to send) |
| **View** | bi-eye | Secondary | Preview draft |
| **Edit** | bi-pencil | Secondary | Modify draft details |
| **Download PDF** | bi-file-pdf | Secondary | Preview PDF |
| **Custom Print/PDF** | bi-sliders | Secondary | Custom preview |
| **Duplicate** | bi-files | Secondary | Create copy |
| **Delete** | bi-trash | Danger | Remove draft (if no payments) |

**🚫 Disabled Actions:**
- ❌ Send Invoice (must finalize first)
- ❌ Record Payment (must finalize first)
- ❌ Mark as Sent (must finalize first)
- ❌ Cancel (use Delete instead for drafts)

---

### ⏳ PENDING Status

**Purpose:** Finalized, awaiting sending/payment

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **📧 Send Invoice** | bi-send | PRIMARY | Email to customer |
| **✅ Mark as Sent** | bi-check2-circle | PRIMARY | Manually mark sent (if sent outside system) |
| **💰 Record Payment** | bi-cash-coin | PRIMARY | Add payment |
| **View** | bi-eye | Secondary | Full invoice view |
| **Download PDF** | bi-file-pdf | Secondary | Export PDF |
| **Custom Print/PDF** | bi-sliders | Secondary | Custom template |
| **Copy Link** | bi-link-45deg | Secondary | Share public link |
| **Edit** | bi-pencil | Secondary | Modify invoice |
| **📋 Duplicate** | bi-files | Secondary | Create similar invoice |
| **Cancel** | bi-x-circle | Danger | Cancel invoice |

**🚫 Disabled Actions:**
- ❌ Delete (use Cancel instead once finalized)
- ❌ Convert to Draft (can't revert once pending)

---

### 📨 SENT Status

**Purpose:** Invoice has been sent to customer

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **💰 Record Payment** | bi-cash-coin | PRIMARY | Add payment |
| **📧 Resend Invoice** | bi-arrow-repeat | PRIMARY | Send again |
| **View** | bi-eye | Secondary | Full invoice view |
| **Download PDF** | bi-file-pdf | Secondary | Export PDF |
| **Custom Print/PDF** | bi-sliders | Secondary | Custom template |
| **Copy Link** | bi-link-45deg | Secondary | Share public link |
| **📋 Duplicate** | bi-files | Secondary | Create similar invoice |
| **Send Reminder** | bi-bell | Secondary | Automated reminder email |
| **Edit** | bi-pencil-square | Secondary | Modify (with caution) |
| **Cancel** | bi-x-circle | Danger | Cancel invoice |

**🚫 Disabled Actions:**
- ❌ Delete (too late, use Cancel)
- ❌ Mark as Sent (already sent)

---

### 👀 VIEWED Status

**Purpose:** Customer has viewed the invoice

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **💰 Record Payment** | bi-cash-coin | PRIMARY | Add payment |
| **📧 Send Reminder** | bi-bell | PRIMARY | Nudge for payment |
| **View** | bi-eye | Secondary | Full invoice view |
| **Download PDF** | bi-file-pdf | Secondary | Export PDF |
| **Custom Print/PDF** | bi-sliders | Secondary | Custom template |
| **Copy Link** | bi-link-45deg | Secondary | Share public link |
| **📋 Duplicate** | bi-files | Secondary | Create similar invoice |
| **Edit** | bi-pencil-square | Secondary | Modify with caution |
| **Cancel** | bi-x-circle | Danger | Cancel invoice |

---

### 💵 PARTIALLY_PAID Status

**Purpose:** Some payment received, balance remaining

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **💰 Record Payment** | bi-cash-coin | PRIMARY | Add more payment |
| **📧 Send Reminder** | bi-bell | PRIMARY | Remind about balance |
| **View Payments** | bi-list-ul | PRIMARY | See payment history |
| **View** | bi-eye | Secondary | Full invoice view |
| **Download PDF** | bi-file-pdf | Secondary | Export PDF |
| **Custom Print/PDF** | bi-sliders | Secondary | Custom template |
| **Copy Link** | bi-link-45deg | Secondary | Share public link |
| **📋 Duplicate** | bi-files | Secondary | Create similar invoice |

**🚫 Disabled Actions:**
- ❌ Edit (payments exist)
- ❌ Delete (payments exist)
- ❌ Cancel (payments exist - must refund first)

---

### ✅ PAID Status

**Purpose:** Invoice fully paid

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **🧾 View Receipt** | bi-receipt | PRIMARY | Payment receipt |
| **View Payments** | bi-list-ul | PRIMARY | Payment history |
| **Download PDF** | bi-file-pdf | Secondary | Export PDF |
| **Custom Print/PDF** | bi-sliders | Secondary | Custom template |
| **Send Receipt** | bi-send-check | Secondary | Email receipt to customer |
| **Copy Link** | bi-link-45deg | Secondary | Share public link |
| **📋 Duplicate** | bi-files | Secondary | Create similar invoice |
| **Issue Refund** | bi-arrow-return-left | Danger | Refund payment |

**🚫 Disabled Actions:**
- ❌ Record Payment (fully paid)
- ❌ Edit (fully paid and final)
- ❌ Delete (has payments)
- ❌ Cancel (use Refund instead)

---

### 🚨 OVERDUE Status

**Purpose:** Past due date, unpaid

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **📧 Send Urgent Reminder** | bi-exclamation-triangle-fill | PRIMARY | Urgent payment request |
| **💰 Record Payment** | bi-cash-coin | PRIMARY | Add payment |
| **📞 Log Contact Attempt** | bi-telephone | PRIMARY | Track collection efforts |
| **View** | bi-eye | Secondary | Full invoice view |
| **Download PDF** | bi-file-pdf | Secondary | Export PDF |
| **Send Statement** | bi-file-text | Secondary | Account statement |
| **Apply Late Fee** | bi-cash-stack | Secondary | Add late charges |
| **Write Off** | bi-x-octagon | Danger | Bad debt write-off |
| **Cancel** | bi-x-circle | Danger | Cancel invoice |

---

### ❌ CANCELLED Status

**Purpose:** Invoice cancelled/voided

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **View** | bi-eye | Secondary | View cancelled invoice |
| **Download PDF** | bi-file-pdf | Secondary | Export for records |
| **View Cancellation Details** | bi-info-circle | Secondary | Reason and date |
| **📋 Duplicate & Recreate** | bi-arrow-clockwise | Secondary | Create new from cancelled |

**🚫 Disabled Actions:**
- ❌ ALL modification actions
- ❌ Send
- ❌ Record Payment
- ❌ Edit
- ❌ Delete (keep for audit trail)

---

### 💸 REFUNDED Status

**Purpose:** Payment returned to customer

| Action | Icon | Priority | Description |
|--------|------|----------|-------------|
| **View** | bi-eye | Secondary | View refunded invoice |
| **View Refund Details** | bi-receipt-cutoff | PRIMARY | Refund info |
| **Download PDF** | bi-file-pdf | Secondary | Export for records |
| **Send Refund Receipt** | bi-send-check | Secondary | Email refund confirmation |
| **📋 Duplicate & Recreate** | bi-arrow-clockwise | Secondary | Create new invoice |

**🚫 Disabled Actions:**
- ❌ ALL modification actions
- ❌ Record Payment
- ❌ Edit
- ❌ Delete

---

## 🎨 UI/UX Improvements

### 1. Action Menu Organization

```
┌─────────────────────────────────────────┐
│  📧 Send Invoice                 [PRIMARY]│  ← Blue highlight
│  💰 Record Payment              [PRIMARY]│  ← Green highlight
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  👁️ View Invoice                         │
│  📄 Download PDF                         │
│  🎨 Custom Print / PDF                   │
│  🔗 Copy Public Link                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  ✏️ Edit                                 │
│  📋 Duplicate                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  ❌ Cancel                      [DANGER] │  ← Red highlight
└─────────────────────────────────────────┘
```

### 2. Status Badge with Quick Actions

Add status-specific quick action buttons next to status badge:

**DRAFT:**
```
[DRAFT 📝] [✅ Finalize] [✏️ Edit]
```

**PENDING:**
```
[PENDING ⏳] [📧 Send] [💰 Pay]
```

**OVERDUE:**
```
[OVERDUE 🚨] [📧 Remind] [💰 Pay] [⚠️ Apply Late Fee]
```

### 3. Bulk Actions by Status

Enable multi-select with status-aware bulk actions:
- Bulk Finalize (DRAFT → PENDING)
- Bulk Send (PENDING → SENT)
- Bulk Send Reminders (OVERDUE)
- Bulk Cancel
- Bulk Export

---

## 🔧 Implementation Plan

### Phase 1: Core Status Actions (Priority)

1. **Add "Finalize Draft" action** for DRAFT invoices
   - Button converts DRAFT → PENDING
   - Shows confirmation modal
   - Validates invoice completeness

2. **Add "Mark as Sent" action** for PENDING invoices
   - Manually update status to SENT
   - Record sent date
   - Optionally add note

3. **Restrict actions based on status**
   - Hide "Send" for DRAFT
   - Hide "Record Payment" for DRAFT
   - Show appropriate warnings

### Phase 2: Enhanced Actions

4. **Add "Duplicate" action** for all statuses
   - Create new invoice from existing
   - Copy items, customer, terms
   - Set new invoice as DRAFT

5. **Add "Send Reminder" action**
   - For SENT, VIEWED, PARTIALLY_PAID, OVERDUE
   - Automated reminder email
   - Track reminder history

6. **Add "Apply Late Fee" action**
   - For OVERDUE invoices
   - Calculate based on settings
   - Add line item or separate charge

### Phase 3: Advanced Workflow

7. **Add approval workflow** (optional)
   - DRAFT → PENDING APPROVAL → PENDING
   - Approval by manager/admin
   - Rejection with comments

8. **Add collection tracking**
   - Log contact attempts
   - Track promises to pay
   - Escalation workflow

9. **Add write-off capability**
   - Mark as bad debt
   - Accounting integration
   - Audit trail

---

## 📊 Backend API Requirements

### New Endpoints Needed

```typescript
// Finalize draft
PUT /invoices/:id/finalize
// Changes status from DRAFT to PENDING

// Mark as sent
PUT /invoices/:id/mark-sent
// Changes status from PENDING to SENT

// Send reminder
POST /invoices/:id/send-reminder
// Sends email reminder, updates reminder count/date

// Apply late fee
POST /invoices/:id/apply-late-fee
// Calculates and adds late fee

// Duplicate invoice
POST /invoices/:id/duplicate
// Creates new DRAFT invoice based on existing

// Write off
PUT /invoices/:id/write-off
// Marks as bad debt

// Refund
POST /invoices/:id/refund
// Process refund and update status
```

---

## 🧪 Testing Checklist

### Test Each Status
- [ ] DRAFT - Finalize, Edit, Delete actions work
- [ ] PENDING - Send, Mark Sent, Record Payment work
- [ ] SENT - Resend, Record Payment work
- [ ] VIEWED - Reminder, Record Payment work
- [ ] PARTIALLY_PAID - Additional payment, Reminder work
- [ ] PAID - View receipt, Refund work
- [ ] OVERDUE - Urgent reminder, Late fee work
- [ ] CANCELLED - View only, no modifications
- [ ] REFUNDED - View refund details

### Test Restrictions
- [ ] DRAFT cannot be sent
- [ ] DRAFT cannot record payment
- [ ] PAID cannot be edited
- [ ] PAID cannot be cancelled (only refunded)
- [ ] CANCELLED cannot be modified

---

## 📈 Benefits

### For Users
✅ Clear workflow progression (Draft → Pending → Sent → Paid)
✅ Prevents mistakes (can't send drafts)
✅ Faster common actions (one-click finalize)
✅ Better payment tracking
✅ Improved collection process

### For Business
✅ Audit trail (status changes logged)
✅ Reduced errors (status-based validation)
✅ Better cash flow (reminders, late fees)
✅ Professional appearance (proper workflow)

---

**Priority:** HIGH - Core functionality for proper invoice lifecycle management

**Effort:** Medium
- Phase 1: 8-12 hours
- Phase 2: 12-16 hours
- Phase 3: 16-24 hours

**Impact:** HIGH - Significantly improves invoice management workflow
