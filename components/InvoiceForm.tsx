

import React from 'react';
import { InvoiceData, InvoiceItem, DocType } from '../types';
import { TrashIcon } from './icons';

interface InvoiceFormProps {
  data: InvoiceData;
  setData: React.Dispatch<React.SetStateAction<InvoiceData>>;
  docType: DocType;
  isLocked: boolean;
  defaultData: InvoiceData;
}

const EditableInput: React.FC<{
  label: string;
  value: string | number;
  defaultValue: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  disabled?: boolean;
  isTextarea?: boolean;
  rows?: number;
}> = ({ label, value, defaultValue, onChange, type = 'text', disabled = false, isTextarea = false, rows = 8 }) => {
  const isPristine = type !== 'number' && type !== 'date' && value === defaultValue;

  // The handleFocus logic that clears the input is removed as per user request
  // to allow editing default text directly.

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (type !== 'number' && type !== 'date' && e.target.value.trim() === '' && defaultValue) {
      const syntheticEvent = { ...e, target: { ...e.target, value: String(defaultValue) } };
      onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>);
    }
  };

  const commonProps = {
    value,
    onChange,
    onBlur: handleBlur,
    disabled,
    className: `mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:text-gray-500 disabled:cursor-not-allowed ${isPristine ? 'text-gray-400' : 'text-gray-900'}`,
  };

  const InputElement = isTextarea ? <textarea {...commonProps} rows={rows} /> : <input {...commonProps} type={type} />;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {InputElement}
    </div>
  );
};

const EditableTableInput: React.FC<{
    value: string;
    defaultValue: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    isTextarea?: boolean;
    rows?: number;
}> = ({ value, defaultValue, onChange, isTextarea = false, rows = 2 }) => {
    const isPristine = value === defaultValue;

    // The user wants to edit the default description, so we should not clear it on focus.
    // const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    //     if (isPristine) {
    //         onChange({ ...e, target: { ...e.target, value: '' } } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>);
    //     }
    // };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.target.value.trim() === '') {
            onChange({ ...e, target: { ...e.target, value: defaultValue } } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>);
        }
    };

    const commonProps = {
        value,
        onChange,
        // onFocus: handleFocus,
        onBlur: handleBlur,
        className: `mt-1 block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm ${isPristine ? 'text-gray-400' : 'text-gray-900'}`
    };

    return isTextarea ? <textarea {...commonProps} rows={rows} /> : <input {...commonProps} />;
};


export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, setData, docType, isLocked, defaultData }) => {

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof InvoiceData['company']) => {
    setData(prev => ({ ...prev, company: { ...prev.company, [field]: e.target.value } }));
  };
  
  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof InvoiceData['customer']) => {
    setData(prev => ({ ...prev, customer: { ...prev.customer, [field]: e.target.value } }));
  };

  const handleQuoteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof InvoiceData['quote']) => {
    setData(prev => ({ ...prev, quote: { ...prev.quote, [field]: e.target.value } }));
  };
  
  const handleTransportChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof InvoiceData['transport']) => {
    const value = e.target.type === 'number' ? Math.max(0, parseFloat(e.target.value) || 0) : e.target.value;
    setData(prev => ({ ...prev, transport: { ...prev.transport, [field]: value } }));
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof InvoiceData['bank']) => {
    setData(prev => ({ ...prev, bank: { ...prev.bank, [field]: e.target.value } }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = data.items.map((item, i) => {
      if (i !== index) {
        return item;
      }

      let processedValue = value;
      if (field === 'rate' || field === 'qty') {
        processedValue = Math.max(0, parseFloat(String(value)) || 0);
      }
      
      return {
        ...item,
        [field]: processedValue,
      };
    });
    
    setData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { 
          id: Date.now().toString(),
          hsn: defaultData.items[0].hsn,
          description: defaultData.items[0].description,
          rate: defaultData.items[0].rate,
          qty: 1
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const docLabel = docType === 'invoice' ? 'Invoice' : 'Quotation';
  
  const countryCodes = [
      { code: '91', name: 'IN (+91)' }, { code: '1', name: 'US (+1)' },
      { code: '44', name: 'UK (+44)' }, { code: '61', name: 'AU (+61)' },
      { code: '971', name: 'AE (+971)' }, { code: '966', name: 'SA (+966)' },
      { code: '974', name: 'QA (+974)' },
  ].sort((a,b) => a.name.localeCompare(b.name));

  const customerNumberFull = data.customer.number;
  let detectedCode = '91';
  let detectedNumber = '';

  const isPristineNumber = customerNumberFull === defaultData.customer.number;

  const bestMatch = countryCodes.find(c => customerNumberFull.startsWith(c.code));

  if (bestMatch) {
      detectedCode = bestMatch.code;
      detectedNumber = isPristineNumber ? '' : customerNumberFull.substring(bestMatch.code.length);
  } else {
      detectedCode = '91';
      detectedNumber = customerNumberFull;
  }
  
  const handleCustomerNumberChange = (newCode: string, newNumber: string) => {
      setData(prev => ({ ...prev, customer: { ...prev.customer, number: newCode + newNumber.replace(/[^0-9]/g, '') } }));
  };

  const handlePhoneFocus = () => {
      if(isPristineNumber) {
          handleCustomerNumberChange(detectedCode, '');
      }
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if(e.target.value.trim() === '') {
          setData(prev => ({...prev, customer: {...prev.customer, number: defaultData.customer.number}}));
      }
  };


  return (
    <div className="p-4 sm:p-6 space-y-6 bg-white rounded-lg shadow-md">
      {/* Company Details */}
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-semibold text-gray-800">Your Company Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableInput label="Company Name" value={data.company.name} defaultValue={defaultData.company.name} onChange={e => handleCompanyChange(e, 'name')} disabled={isLocked} />
          <EditableInput label="GSTIN" value={data.company.gstin} defaultValue={defaultData.company.gstin} onChange={e => handleCompanyChange(e, 'gstin')} disabled={isLocked} />
          <EditableInput label="Address" value={data.company.address} defaultValue={defaultData.company.address} onChange={e => handleCompanyChange(e, 'address')} disabled={isLocked} />
          <EditableInput label="Contact Person" value={data.company.contactPerson} defaultValue={defaultData.company.contactPerson} onChange={e => handleCompanyChange(e, 'contactPerson')} />
          <EditableInput label="Phone Number" value={data.company.phone} defaultValue={defaultData.company.phone} onChange={e => handleCompanyChange(e, 'phone')} />
        </div>
      </fieldset>
      
      {/* Document Information */}
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-semibold text-gray-800">Document Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableInput label={`${docLabel} No.`} value={data.quote.no} defaultValue={defaultData.quote.no} onChange={e => handleQuoteChange(e, 'no')} disabled={isLocked} />
            <EditableInput label={`Date of ${docLabel}`} value={data.quote.date} defaultValue={defaultData.quote.date} onChange={e => handleQuoteChange(e, 'date')} type="date" />
            <EditableInput label="Made For (Customer Name)" value={data.customer.name} defaultValue={defaultData.customer.name} onChange={e => handleCustomerChange(e, 'name')} />
            
            {/* Address section */}
            <EditableInput label="Delivery Address" value={data.transport.deliveryAddress} defaultValue={defaultData.transport.deliveryAddress} onChange={e => handleTransportChange(e, 'deliveryAddress')} isTextarea={true} rows={3} />
            
            <EditableInput label="State" value={data.customer.state} defaultValue={defaultData.customer.state} onChange={e => handleCustomerChange(e, 'state')} />
            <EditableInput label="Consignee GST" value={data.customer.consigneeGst} defaultValue={defaultData.customer.consigneeGst} onChange={e => handleCustomerChange(e, 'consigneeGst')} />
            
            {/* Customer Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Number</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                  <select
                      value={detectedCode}
                      onChange={e => handleCustomerNumberChange(e.target.value, detectedNumber)}
                      className="block w-28 rounded-none rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      aria-label="Country code"
                  >
                      {countryCodes.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                  <input
                      type="tel"
                      value={detectedNumber}
                      onFocus={handlePhoneFocus}
                      onBlur={handlePhoneBlur}
                      onChange={e => handleCustomerNumberChange(detectedCode, e.target.value)}
                      placeholder="Phone number"
                      className={`block w-full flex-1 rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${isPristineNumber ? 'text-gray-400' : 'text-gray-900'}`}
                  />
              </div>
            </div>

            {docType === 'quotation' && (
                <EditableInput label="Valid Through" value={data.quote.validThrough} defaultValue={defaultData.quote.validThrough} onChange={e => handleQuoteChange(e, 'validThrough')} />
            )}
            <EditableInput label="Mode of Transport" value={data.transport.mode} defaultValue={defaultData.transport.mode} onChange={e => handleTransportChange(e, 'mode')} />
            <EditableInput label="Place of Supply" value={data.transport.placeOfSupply} defaultValue={defaultData.transport.placeOfSupply} onChange={e => handleTransportChange(e, 'placeOfSupply')} />
            <EditableInput label="Vehicle No." value={data.transport.vehicleNo} defaultValue={defaultData.transport.vehicleNo} onChange={e => handleTransportChange(e, 'vehicleNo')} />
            
            {/* Spanning field */}
            <div className="md:col-span-2">
                <EditableInput label="Transportation Cost" value={data.transport.cost} defaultValue={defaultData.transport.cost} onChange={e => handleTransportChange(e, 'cost')} type="number" />
            </div>
        </div>
      </fieldset>

      {/* Items Table */}
      <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-semibold text-gray-800">Items</legend>
        <div className="space-y-4">
          {data.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-2 md:grid-cols-12 gap-x-3 gap-y-2 p-3 border rounded-md items-start bg-gray-50/50">
                
                <div className="col-span-2 md:col-span-4">
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <EditableTableInput
                        isTextarea
                        rows={6}
                        value={item.description}
                        defaultValue={defaultData.items[0].description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                    />
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">HSN Code</label>
                    <EditableTableInput
                        value={item.hsn}
                        defaultValue={defaultData.items[0].hsn}
                        onChange={e => handleItemChange(index, 'hsn', e.target.value)}
                    />
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Rate</label>
                    <input type="number" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="mt-1 block w-full px-2 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-md text-sm"/>
                </div>
                
                <div className="col-span-1 md:col-span-1">
                    <label className="text-sm font-medium text-gray-600">Qty</label>
                    <input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="mt-1 block w-full px-2 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-md text-sm"/>
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Value</label>
                    <p className="mt-1 w-full px-2 py-1.5 text-sm font-semibold h-[32.5px] flex items-center">{(item.rate * item.qty).toFixed(2)}</p>
                </div>
                
                <div className="col-span-2 md:col-span-1 flex items-center justify-center md:items-end md:justify-end h-full">
                    <button onClick={() => removeItem(index)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Item</button>
      </fieldset>

      {/* Bank & T&C */}
       <fieldset className="p-4 border rounded-md">
        <legend className="px-2 font-semibold text-gray-800">Footer Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Bank Information</h3>
              <div className="space-y-3">
                <EditableInput label="Bank Name" value={data.bank.name} defaultValue={defaultData.bank.name} onChange={e => handleBankChange(e, 'name')} disabled={isLocked} />
                <EditableInput label="Account Name" value={data.bank.accountName} defaultValue={defaultData.bank.accountName} onChange={e => handleBankChange(e, 'accountName')} disabled={isLocked} />
                <EditableInput label="Account Number" value={data.bank.accountNumber} defaultValue={defaultData.bank.accountNumber} onChange={e => handleBankChange(e, 'accountNumber')} disabled={isLocked} />
                <EditableInput label="IFSC Code" value={data.bank.ifsc} defaultValue={defaultData.bank.ifsc} onChange={e => handleBankChange(e, 'ifsc')} disabled={isLocked} />
                <EditableInput label="Branch" value={data.bank.branch} defaultValue={defaultData.bank.branch} onChange={e => handleBankChange(e, 'branch')} disabled={isLocked} />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Terms & Conditions</h3>
              <EditableInput
                label=""
                value={data.termsAndConditions}
                defaultValue={defaultData.termsAndConditions}
                onChange={e => setData(prev => ({...prev, termsAndConditions: e.target.value}))}
                isTextarea={true}
                rows={8}
              />
            </div>
        </div>
      </fieldset>

    </div>
  );
};