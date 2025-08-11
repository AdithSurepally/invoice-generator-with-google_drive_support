export type DocType = 'invoice' | 'quotation';

export interface InvoiceItem {
  id: string;
  hsn: string;
  description: string;
  rate: number;
  qty: number;
}

export interface InvoiceData {
  company: {
    name: string;
    gstin: string;
    address: string;
    contactPerson: string;
    phone: string;
  };
  quote: {
    no: string;
    date: string;
    validThrough: string;
  };
  purchaseOrder: {};
  transport: {
    mode: string;
    placeOfSupply: string;
    deliveryAddress: string;
    vehicleNo: string;
    cost: number;
  };
  customer: {
    name: string;
    number: string;
    state: string;
    consigneeGst: string;
  };
  bank: {
    name: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  };
  items: InvoiceItem[];
  termsAndConditions: string;
}