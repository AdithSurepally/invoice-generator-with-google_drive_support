import { InvoiceData } from './types';

export const UPI_ID = 'your-upi-id@okbank'; // <-- REPLACE WITH YOUR UPI ID

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const uniqueId = `001`;

export const DEFAULT_INVOICE_DATA: InvoiceData = {
  company: {
    name: 'Your Company Name',
    gstin: 'YOUR_GSTIN_HERE',
    address: '123 Business Rd, Business City, 12345',
    contactPerson: 'Your Name',
    phone: '+91 9876543210',
  },
  quote: {
    no: `INV-${year}${month}-${uniqueId}`,
    date: `${year}-${month}-${day}`,
    validThrough: '', // Not used in invoices
  },
  purchaseOrder: {},
  transport: {
    mode: 'Direct Delivery',
    placeOfSupply: 'State Name',
    deliveryAddress: '##Customer Full Address',
    vehicleNo: '-',
    cost: 0,
  },
  customer: {
    name: '##Customer Name',
    number: '##91',
    state: 'State Name',
    consigneeGst: '-',
  },
  bank: {
    name: 'Your Bank Name',
    accountName: 'Your Account Name',
    accountNumber: '12345678901234',
    ifsc: 'YOURIFSC001',
    branch: 'Your Branch',
  },
  items: [
    {
      id: '1',
      hsn: '998314', // Example HSN for web development services
      description: 'Item Description (e.g., Web Development Services, Product Supply). You can customize this default text.',
      rate: 1000,
      qty: 1,
    },
  ],
  termsAndConditions: `1. Payment due within 30 days.
2. Please make payments to the account specified.
3. For any queries regarding this document, please contact us.
4. All disputes subject to local jurisdiction.`,
};

export const DEFAULT_QUOTATION_DATA: InvoiceData = {
  ...DEFAULT_INVOICE_DATA,
  quote: {
    ...DEFAULT_INVOICE_DATA.quote,
    no: `QUO-${year}${month}-${uniqueId}`,
    validThrough: '15 Days',
  },
  transport: {
    ...DEFAULT_INVOICE_DATA.transport,
  },
  termsAndConditions: `1. This quotation is valid for 15 days.
2. Prices are exclusive of applicable taxes.
3. Payment Terms: 50% advance, 50% on completion.
4. Project timeline will be shared upon confirmation.`,
};
