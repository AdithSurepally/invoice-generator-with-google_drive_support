
import type { InvoiceData } from '../types';

export const validateCustomerInfo = (customer: InvoiceData['customer'], defaultCustomer: InvoiceData['customer']): string[] => {
    const errors: string[] = [];
    if (!customer.name || customer.name.trim() === '' || customer.name.trim() === defaultCustomer.name) {
        errors.push("Please provide a valid customer name.");
    }

    const fullNumber = customer.number.trim();
    if (fullNumber === defaultCustomer.number || fullNumber === '') {
        errors.push("Please provide a customer phone number.");
    } else if (fullNumber.startsWith('91')) {
        const numberPart = fullNumber.substring(2);
        if (!/^\d{10}$/.test(numberPart)) {
            errors.push("For India (+91), the phone number must be exactly 10 digits long.");
        }
    } else {
        // Fallback for other countries: just a generic length check on the digits.
        const phoneNumberDigits = fullNumber.replace(/\D/g, '');
        if (phoneNumberDigits.length < 7) {
            errors.push("Please provide a valid customer phone number (including country code).");
        }
    }
    
    return errors;
};

export const validateInvoiceItems = (items: InvoiceData['items'], defaultItem: InvoiceData['items'][0]): string[] => {
    const errors: string[] = [];
    if (items.length === 0) {
        errors.push("Please add at least one item to generate a document.");
        return errors;
    }
    items.forEach((item, index) => {
        if (!item.description || item.description.trim() === '') {
            errors.push(`Please provide a description for item #${index + 1}.`);
        }
        if (item.rate <= 0) {
            errors.push(`Item #${index + 1} must have a positive rate.`);
        }
        if (item.qty <= 0) {
            errors.push(`Item #${index + 1} must have a positive quantity.`);
        }
    });
    return errors;
};

export const validateAll = (data: InvoiceData, defaultData: InvoiceData): string[] => {
    return [
        ...validateCustomerInfo(data.customer, defaultData.customer),
        ...validateInvoiceItems(data.items, defaultData.items[0])
    ];
};
