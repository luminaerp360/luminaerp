export interface Inventory {
    id: string; // This will be the auto-generated ID from Firestore
    product_id: string;
    quantity: number;
    buying_price: number;
    added_by: string;
    total: number;
    deleted: boolean;
    created_at: Date; // You can use Date type for the created_at field
  }