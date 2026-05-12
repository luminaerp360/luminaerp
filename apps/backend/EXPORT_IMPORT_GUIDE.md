# 📋 Data Export/Import Guide

## 🌐 API Endpoints

**Online API (Production):** `https://api.dasadovesystems.co.ke`
**Offline API (Local):** `http://localhost:3000` (or your configured local endpoint)

---

## 📤 STEP 1: Export Data from Online API

### **✅ Export Using License Key (Recommended)**

**Endpoint:**
```
GET https://api.dasadovesystems.co.ke/organization/export/license/{licenseKey}
```

**Example Request:**
```bash
# Using cURL
curl -X GET "https://api.dasadovesystems.co.ke/organization/export/license/POS-ABCD1234EFGH5678" \
  -H "Content-Type: application/json"

# Or using JavaScript/Fetch
const licenseKey = 'POS-ABCD1234EFGH5678';

fetch(`https://api.dasadovesystems.co.ke/organization/export/license/${licenseKey}`)
  .then(response => response.json())
  .then(data => {
    console.log('Export successful:', data);
    // Save this data for import
    localStorage.setItem('exportedData', JSON.stringify(data.data));
    // Or download as file
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-export-${Date.now()}.json`;
    a.click();
  })
  .catch(error => {
    console.error('Export failed:', error);
  });
```

### **Alternative: Export Using Organization ID**

**Endpoint:**
```
GET https://api.dasadovesystems.co.ke/organization/{organizationId}/export
```

**Example:**
```bash
curl -X GET "https://api.dasadovesystems.co.ke/organization/1/export" \
  -H "Content-Type: application/json"
```

---

## 📦 Expected Export Response

```json
{
  "success": true,
  "message": "Organization data exported successfully",
  "data": {
    "metadata": {
      "exportDate": "2025-12-10T08:30:00.000Z",
      "organizationId": 1,
      "organizationName": "My Business",
      "version": "1.0.0"
    },
    "organization": {
      "name": "My Business",
      "address": "123 Main St",
      "contact": "+254712345678",
      "logoUrl": "https://...",
      "complementaryMessage": "Thank you for your business!",
      "stations": {...},
      "bankDetails": {...},
      "mpesaDetails": {...}
    },
    "subscription": {
      "plan": "PREMIUM",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2026-01-01T00:00:00.000Z",
      "maxDevices": 10,
      "maxUsers": 15,
      "maxLocations": 5,
      "licenseKey": "POS-ABCD1234EFGH5678"
    },
    "locations": [
      {
        "id": 1,
        "name": "Main Branch",
        "address": "123 Main St",
        "contact": "+254712345678"
      }
    ],
    "users": [
      {
        "id": 1,
        "email": "admin@mybusiness.com",
        "fullName": "Admin User",
        "username": "admin",
        "phone": "0712345678",
        "role": "Admin",
        "permissions": {...}
        // Note: password NOT included for security
      }
    ],
    "products": [...],
    "categories": [...],
    "customers": [...],
    "suppliers": [...],
    "orders": [...],
    "inventory": [...],
    "creditSales": [...],
    "quotations": [...],
    "localPurchaseOrders": [...],
    "expenses": [...],
    "creditSalePayments": [...],
    "stockTransfers": [...],
    "statistics": {
      "totalLocations": 5,
      "totalUsers": 3,
      "totalProducts": 500,
      "totalCategories": 10,
      "totalOrders": 1000,
      "totalCustomers": 100,
      "totalSuppliers": 20,
      "totalInventoryRecords": 50,
      "totalCreditSales": 30,
      "totalQuotations": 15,
      "totalLPOs": 10,
      "totalExpenses": 25
    }
  }
}
```

---

## 📥 STEP 2: Import Data to Offline API

### **Prerequisites**
1. ✅ Valid **offline subscription license key** (format: `OFFLINE-XXXXXXXXXXXX`)
2. ✅ Offline subscription must be **ACTIVE** (not expired or suspended)
3. ✅ Exported data from Step 1

### **Import Organization Data**

**Endpoint:**
```
POST http://localhost:3000/offline-subscription/{offlineLicenseKey}/import
```

**⚠️ Important:** Use your **OFFLINE license key** (not the online one!)

**Request Body:**
```json
{
  "data": {
    // Paste the entire "data" object from export response here
  }
}
```

**Complete Example:**
```bash
# Using cURL
curl -X POST "http://localhost:3000/offline-subscription/OFFLINE-ABC123DEF456/import" \
  -H "Content-Type: application/json" \
  -d @export.json

# Or using JavaScript/Fetch
const offlineLicenseKey = 'OFFLINE-ABC123DEF456';
const exportedData = JSON.parse(localStorage.getItem('exportedData'));

fetch(`http://localhost:3000/offline-subscription/${offlineLicenseKey}/import`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: exportedData
  })
})
.then(response => response.json())
.then(result => {
  console.log('Import successful:', result);
  alert(`Imported: ${result.importStatistics.productsImported} products, ${result.importStatistics.customersImported} customers`);
})
.catch(error => {
  console.error('Import failed:', error);
});
```

---

## ✅ Expected Import Response

```json
{
  "success": true,
  "message": "Organization data imported successfully",
  "organizationId": 1,
  "organizationName": "My Business",
  "licenseKey": "OFFLINE-ABC123DEF456",
  "importStatistics": {
    "locationsImported": 5,
    "categoriesImported": 10,
    "usersImported": 3,
    "customersImported": 100,
    "suppliersImported": 20,
    "productsImported": 500
  },
  "note": "Users need to reset their passwords. Default password is: TEMP_PASSWORD_NEEDS_RESET"
}
```

---

## 🔒 Important Security Notes

### **License Key Types**

| Type | Format | Purpose | Usage |
|------|--------|---------|-------|
| **Online License** | `POS-XXXXXXXX` | Online subscriptions | Export from online API |
| **Offline License** | `OFFLINE-XXXXXXXX` | Offline subscriptions | Import to offline API |

### **Export Restrictions**

- ✅ **Online API**: Can export using license key or organization ID
- ❌ **Offline API**: Cannot export (only import allowed)

**Why?**
- Single source of truth (online API)
- Prevents data conflicts
- License control and security

---

## 🔄 Complete Workflow

### **Step-by-Step Process**

1. **Get Your License Keys**
   - Online license key from subscription (e.g., `POS-ABC123`)
   - Offline license key (e.g., `OFFLINE-XYZ789`)

2. **Export from Online API**
   ```bash
   curl -X GET "https://api.dasadovesystems.co.ke/organization/export/license/POS-ABC123" \
     -o export.json
   ```

3. **Verify Export**
   - Check `export.json` file exists
   - Verify `success: true`
   - Check statistics match your data

4. **Import to Offline API**
   ```bash
   curl -X POST "http://localhost:3000/offline-subscription/OFFLINE-XYZ789/import" \
     -H "Content-Type: application/json" \
     -d @export.json
   ```

5. **Verify Import**
   - Check import statistics
   - Login to offline app
   - Verify data is present

---

## 🛠️ Troubleshooting

### **Export Errors**

**Error: "Invalid license key"**
```
✅ Solution: Verify your online license key format (POS-XXXXXXXX)
✅ Check: GET /organization/subscriptions to see all licenses
```

**Error: "Organization not found"**
```
✅ Solution: Use the license key endpoint instead of org ID
✅ Endpoint: /organization/export/license/{licenseKey}
```

### **Import Errors**

**Error: "Invalid license key"**
```
✅ Solution: Verify offline license key format (OFFLINE-XXXXXXXX)
✅ Check: GET /offline-subscription/license/{licenseKey}
```

**Error: "Subscription has expired"**
```
✅ Solution: Extend your offline subscription
✅ Endpoint: POST /offline-subscription/extend
   Body: { "licenseKey": "OFFLINE-XXX", "additionalDays": 30 }
```

**Error: "Subscription is suspended"**
```
✅ Solution: Reactivate your subscription
✅ Endpoint: PATCH /offline-subscription/{licenseKey}/reactivate
```

**Error: "Failed to import organization data"**
```
✅ Check: Exported data structure is complete
✅ Check: Offline database is running
✅ Check: Sufficient disk space
✅ Check: Network connection (for localhost)
```

**Import Statistics show 0 for some entities**
```
✅ Normal: Duplicates are skipped
✅ Check: Console logs for "already exists, skipping..."
✅ Note: Import is idempotent - safe to run multiple times
```

---

## 📝 Post-Import Steps

### **1. User Password Reset**

All imported users have the temporary password: `TEMP_PASSWORD_NEEDS_RESET`

**Users must reset passwords on first login:**
```bash
POST /auth/reset-password
{
  "email": "user@example.com",
  "oldPassword": "TEMP_PASSWORD_NEEDS_RESET",
  "newPassword": "SecurePassword123!"
}
```

### **2. Verify Data Integrity**

- ✅ Check product quantities
- ✅ Verify customer records
- ✅ Test order creation
- ✅ Confirm category assignments

### **3. Configure Local Settings**

- Update printer IPs
- Set local M-PESA details
- Configure bank details
- Set station information

---

## 🎯 Quick Reference

### **Export Commands**

```bash
# By License Key (Recommended)
curl -X GET "https://api.dasadovesystems.co.ke/organization/export/license/POS-ABC123" > export.json

# By Organization ID
curl -X GET "https://api.dasadovesystems.co.ke/organization/1/export" > export.json
```

### **Import Commands**

```bash
# Import to offline API
curl -X POST "http://localhost:3000/offline-subscription/OFFLINE-XYZ789/import" \
  -H "Content-Type: application/json" \
  -d @export.json
```

### **Check Subscription Status**

```bash
# Online subscription
curl -X GET "https://api.dasadovesystems.co.ke/organization/license/POS-ABC123"

# Offline subscription
curl -X GET "http://localhost:3000/offline-subscription/license/OFFLINE-XYZ789"
```

---

## 💡 Best Practices

1. **Export Regularly**: Create backups before major changes
2. **Verify License Keys**: Double-check before export/import
3. **Test Import**: Use test environment first
4. **Monitor Statistics**: Compare export vs import counts
5. **Secure Data**: Store export files securely
6. **Document Changes**: Note what data was exported/imported
7. **User Communication**: Inform users about password resets

---

## 🔗 Related Endpoints

### **Online API**
- `GET /organization/subscriptions` - List all subscriptions
- `GET /organization/license/:key` - Get org by license key
- `GET /organization/:id` - Get organization details

### **Offline API**
- `GET /offline-subscription` - List offline subscriptions
- `GET /offline-subscription/license/:key` - Get subscription details
- `POST /offline-subscription/validate` - Validate license
- `POST /offline-subscription/extend` - Extend subscription
- `PATCH /offline-subscription/:key/reactivate` - Reactivate subscription

---

## 📞 Support

For help with export/import:
1. Check this guide
2. Review API documentation at `/api/docs`
3. Check console logs for detailed errors
4. Contact support with license key and error message

---

**Version:** 1.0.0
**Last Updated:** December 10, 2025
