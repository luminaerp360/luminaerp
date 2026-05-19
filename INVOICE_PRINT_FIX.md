# Invoice Print Template Fix

## Problem
When printing invoices using the custom print modal, the browser's native print dialog was stripping away the custom template styling (colors, backgrounds, borders, layout). The printed output looked plain and unstyled compared to the preview.

## Root Cause
1. **Missing Print Media Queries**: The `@media print` CSS rules were too minimal and didn't force browsers to preserve colors and backgrounds
2. **Browser Default Behavior**: Browsers by default remove background colors and images to save ink when printing
3. **Timing Issues**: The print dialog was opening before stylesheets and fonts fully loaded

## Solution Implemented

### 1. Enhanced Print Media Queries ([document-template.service.ts](apps/frontend/src/app/shared/Services/document-template.service.ts#L114-L223))

Added comprehensive `@media print` rules with:
- **Color Preservation**: Added `-webkit-print-color-adjust: exact` and `print-color-adjust: exact` to all elements
- **Page Size**: Proper `@page` directive with correct paper size
- **Background Colors**: Forced all inline background styles to print
- **Border Preservation**: Ensured borders render correctly
- **Font Loading**: Applied print-color-adjust globally

### 2. Improved Print Timing ([printing.service.ts](apps/frontend/src/app/shared/Services/printing.service.ts#L55-L121))

Enhanced the `printOnWeb()` method to:
- Wait for all images to load completely
- Added 800ms delay for stylesheet and font rendering
- Increased safety fallback to 6 seconds
- Better error handling for broken images

## Key Changes

### Before
```css
@media print {
  .page { width: 100%; }
  body { margin: 0; }
}
```

### After
```css
@media print {
  @page {
    margin: 0;
    size: A4 portrait;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  /* ... comprehensive print rules ... */
}
```

## Testing Instructions

### 1. Test Custom Print with All Templates

1. Navigate to **Invoices** page
2. Click the **3-dot menu** on any invoice
3. Select **"Custom Print / PDF"**
4. In the modal:
   - Switch to **"Template"** tab
   - Try each template: Classic, Modern Bold, Minimal, Branded, Compact
   - Change the **accent color**
   - Adjust **paper size** (A4, Letter, A5)
5. Click **"Preview"** tab to see the rendered template
6. Click **"Print"** button
7. **Verify** in the browser print preview that:
   - ✅ Background colors are preserved (header, table rows, info boxes)
   - ✅ Border colors match your accent color
   - ✅ Text colors are correct
   - ✅ Layout matches the live preview
   - ✅ Logo displays correctly
   - ✅ Fonts render properly

### 2. Test Content Toggles

1. In the modal, go to **"Content & Fields"** tab
2. Toggle various options ON/OFF:
   - Organization info (logo, name, address, phone, email)
   - Customer info (type badge, KRA PIN)
   - Item columns (description, SKU, tax, discount)
   - Totals (subtotal, tax, discount, payment method, amount paid, balance)
   - Footer (notes, terms, signature lines)
3. Check **"Preview"** tab after each change
4. Click **"Print"** and verify toggles work correctly

### 3. Test PDF Download

1. In the custom print modal
2. Click **"Download PDF"** button
3. **Verify** the downloaded PDF:
   - ✅ All colors and styling preserved
   - ✅ Multi-page invoices split correctly
   - ✅ Images and logos render
   - ✅ Quality is high (2x retina scale)

### 4. Test Save Settings

1. Make custom changes (template, color, toggles)
2. Click **"Save Settings"**
3. Close the modal
4. Open another invoice's custom print
5. **Verify** your saved settings are remembered

### 5. Browser Compatibility

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

## Files Modified

1. **[apps/frontend/src/app/shared/Services/document-template.service.ts](apps/frontend/src/app/shared/Services/document-template.service.ts)**
   - Enhanced `sharedStyles()` method (lines 114-223)
   - Added comprehensive print media queries
   - Applied color-adjust properties globally

2. **[apps/frontend/src/app/shared/Services/printing.service.ts](apps/frontend/src/app/shared/Services/printing.service.ts)**
   - Improved `printOnWeb()` method (lines 55-121)
   - Added stylesheet loading detection
   - Extended timing delays for font rendering
   - Better image loading handling

## Expected Results

### ✅ What Should Work Now

1. **Print Preview** matches the **Live Preview** in the modal
2. **All colors, backgrounds, and borders** print correctly
3. **Custom accent colors** apply throughout the document
4. **Table headers** have colored backgrounds
5. **Info boxes** and **customer details** have subtle background colors
6. **Alternating row colors** in item tables
7. **Logos** and **images** render properly
8. **Fonts** load correctly (Inter font family)
9. **Layout** is pixel-perfect to the preview
10. **Multi-page documents** break correctly

### ⚠️ Known Limitations

1. **Browser Settings**: Users must have "Background graphics" enabled in their browser print settings
   - Chrome/Edge: Check "Background graphics" in print dialog
   - Firefox: File → Print → Options → Print backgrounds
   - Safari: File → Print → Show Details → "Print backgrounds"

2. **Font Loading**: Very slow connections may need the 6-second fallback to kick in

3. **PDF Quality**: Client-side PDF generation (html2canvas) is slightly lower quality than server-side PDF rendering but sufficient for most use cases

## Rollback (If Needed)

If issues arise, revert these commits:
```bash
git revert HEAD~2..HEAD
```

Or manually restore from:
```bash
git diff HEAD~2..HEAD apps/frontend/src/app/shared/Services/document-template.service.ts
git diff HEAD~2..HEAD apps/frontend/src/app/shared/Services/printing.service.ts
```

## Additional Notes

- The `color-adjust: exact` CSS property is the key to forcing browsers to print backgrounds
- The property has broad support: Chrome 52+, Firefox 48+, Safari 15.4+, Edge 79+
- For older browsers, users may need to manually enable background printing
- The PDF download feature uses html2canvas which respects all inline styles automatically

## Support

If users still see unstyled prints:
1. Check their browser print settings (Background graphics option)
2. Update their browser to the latest version
3. Try the "Download PDF" option instead of direct printing
4. Test in a different browser

---

**Fixed by:** Claude AI Assistant
**Date:** 2026-05-20
**Version:** 1.0.0
