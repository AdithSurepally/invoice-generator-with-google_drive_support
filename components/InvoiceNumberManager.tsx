
import React, { useState, useEffect } from 'react';
import { PencilIcon } from './icons';
import { DocType } from '../types';

interface InvoiceNumberManagerProps {
  docType: DocType;
  nextNumber: number;
  setNextNumber: (num: number) => void;
}

export const InvoiceNumberManager: React.FC<InvoiceNumberManagerProps> = ({ docType, nextNumber, setNextNumber }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(nextNumber));

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(nextNumber));
    }
  }, [nextNumber, isEditing]);

  const handleSave = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num > 0) {
      setNextNumber(num);
      setIsEditing(false);
    } else {
      alert("Please enter a valid positive number.");
    }
  };

  const handleCancel = () => {
    setInputValue(String(nextNumber));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const docLabel = docType === 'invoice' ? 'Invoice' : 'Quotation';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="invoice-number-input" className="font-medium text-gray-700 whitespace-nowrap">Set {docLabel} #:</label>
        <input
          id="invoice-number-input"
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          autoFocus
        />
        <button onClick={handleSave} className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600">Save</button>
        <button onClick={handleCancel} className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-600 whitespace-nowrap">{docLabel} #:</span>
      <span className="font-bold text-gray-800">{String(nextNumber).padStart(3, '0')}</span>
      <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors" aria-label={`Edit ${docLabel} number`}>
        <PencilIcon className="w-4 h-4" />
        <span className="sr-only">Edit {docLabel} number</span>
      </button>
    </div>
  );
};
