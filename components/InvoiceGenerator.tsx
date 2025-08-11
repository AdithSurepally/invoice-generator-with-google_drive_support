
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InvoiceForm } from './InvoiceForm';
import { PdfPreviewer } from './PdfPreviewer';
import { DEFAULT_INVOICE_DATA, DEFAULT_QUOTATION_DATA } from '../constants';
import type { InvoiceData, DocType } from '../types';
import { DownloadIcon, ShareIcon, LockIcon, UnlockIcon, PencilIcon } from './icons';
import { downloadPdf, generatePdfBlob } from '../utils/pdfGenerator';
import { InvoiceNumberManager } from './InvoiceNumberManager';
import { validateAll, validateCustomerInfo } from '../utils/validation';
import { AuthDisplay, useAuth, authService } from './GoogleAuth';
import { uploadToDrive, getLatestDocumentNumber } from '../utils/googleDrive';


const EditLockButton: React.FC<{ isLocked: boolean; setIsLocked: (locked: boolean) => void; }> = ({ isLocked, setIsLocked }) => {
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const DURATION = 7000;

    const startPress = () => {
        if (!isLocked) return;

        const startTime = Date.now();
        progressIntervalRef.current = window.setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            setProgress(Math.min(100, (elapsedTime / DURATION) * 100));
        }, 50);

        timerRef.current = window.setTimeout(() => {
            setIsLocked(false);
            endPress();
        }, DURATION);
    };

    const endPress = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(0);
    };

    const handleClick = () => {
        if (!isLocked) setIsLocked(true);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            className={`relative flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors overflow-hidden ${
                isLocked
                ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500'
                : 'bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-500'
            }`}
            aria-live="polite"
        >
            <div
                className="absolute top-0 left-0 h-full bg-black/20"
                style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
            />
            {isLocked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
            <span className="relative z-10">{isLocked ? 'Hold to Edit' : 'Details Unlocked'}</span>
        </button>
    );
};


export const InvoiceGenerator: React.FC = () => {
  const [docType, setDocType] = useState<DocType>('invoice');
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(DEFAULT_INVOICE_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [sharingStatus, setSharingStatus] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number | null>(null);
  const [nextQuotationNumber, setNextQuotationNumber] = useState<number | null>(null);
  const [numbersLoading, setNumbersLoading] = useState(true);
  
  const auth = useAuth();
  const defaultData = docType === 'invoice' ? DEFAULT_INVOICE_DATA : DEFAULT_QUOTATION_DATA;
  
  // Fetch latest document numbers from Google Drive when user signs in
  useEffect(() => {
    const fetchNumbers = async () => {
        if (auth.isSignedIn) {
            setNumbersLoading(true);
            try {
                const [invNum, quoNum] = await Promise.all([
                    getLatestDocumentNumber('invoice'),
                    getLatestDocumentNumber('quotation')
                ]);
                setNextInvoiceNumber(invNum);
                setNextQuotationNumber(quoNum);
            } catch (error) {
                console.error("Failed to fetch latest document numbers from Google Drive:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Could not fetch the next document number from Google Drive. Defaulting to 1. Error: ${errorMessage}`);
                // Fallback to default if Drive fails
                setNextInvoiceNumber(1);
                setNextQuotationNumber(1);
            } finally {
                setNumbersLoading(false);
            }
        } else {
            // If not signed in, we can't fetch from drive. Default to 1.
            setNextInvoiceNumber(1);
            setNextQuotationNumber(1);
            setNumbersLoading(false);
        }
    };

    fetchNumbers();
  }, [auth.isSignedIn]);


  // Handle switching document types (e.g., reset T&Cs, quotation number)
  useEffect(() => {
      const newDefaults = docType === 'invoice' ? DEFAULT_INVOICE_DATA : DEFAULT_QUOTATION_DATA;
      const oldDefaults = docType === 'invoice' ? DEFAULT_QUOTATION_DATA : DEFAULT_INVOICE_DATA;

      setInvoiceData(currentData => {
          const newData = {...currentData};
          if (currentData.termsAndConditions === oldDefaults.termsAndConditions) {
              newData.termsAndConditions = newDefaults.termsAndConditions;
          }
          return newData;
      });
  }, [docType]);

  // Set dynamic document number when type or number changes
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    if (docType === 'invoice' && nextInvoiceNumber !== null) {
      const invoiceNumberStr = `INV-${year}${month}-${String(nextInvoiceNumber).padStart(3, '0')}`;
      setInvoiceData(d => ({ ...d, quote: { ...d.quote, no: invoiceNumberStr } }));
    } else if (docType === 'quotation' && nextQuotationNumber !== null) {
      const quotationNumberStr = `QUO-${year}${month}-${String(nextQuotationNumber).padStart(3, '0')}`;
      setInvoiceData(d => ({ ...d, quote: { ...d.quote, no: quotationNumberStr } }));
    }
  }, [docType, nextInvoiceNumber, nextQuotationNumber]);

  const handleDownloadPdf = useCallback(async () => {
    const validationErrors = validateAll(invoiceData, defaultData);
    if (validationErrors.length > 0) {
      alert("Please fix the following issues before generating the PDF:\n\n- " + validationErrors.join("\n- "));
      return;
    }

    setIsLoading(true);
    try {
      await downloadPdf(invoiceData, docType);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please check the console for details.");
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [invoiceData, docType, defaultData]);

  const handleShare = useCallback(async () => {
    const validationErrors = validateAll(invoiceData, defaultData);
    if (validationErrors.length > 0) {
        alert("Please fix the following issues before sharing:\n\n- " + validationErrors.join("\n- "));
        return;
    }

    if (!auth.isSignedIn || !auth.token) {
      alert('Please sign in with Google to upload to Drive.');
      authService.signIn();
      return;
    }

    setSharingStatus('Generating PDF...');
    try {
        const docPrefix = docType === 'invoice' ? 'INV' : 'QUO';
        const dateString = invoiceData.quote.date.replace(/-/g, '');
        
        const nextNumber = docType === 'invoice' ? nextInvoiceNumber : nextQuotationNumber;
        const invoiceNumber = String(nextNumber ?? 1).padStart(6, '0');
        
        const customerPhone = invoiceData.customer.number.replace(/\D/g, '');

        const pdfFileName = `${docPrefix}_${dateString}_${invoiceNumber}_${customerPhone}.pdf`;
        
        const pdfBlob = await generatePdfBlob(invoiceData, docType);

        setSharingStatus('Uploading to Drive...');
        await uploadToDrive(pdfBlob, pdfFileName, docType);

        const subtotal = invoiceData.items.reduce((acc, item) => acc + item.rate * item.qty, 0);
        const cgst = subtotal * 0.09;
        const sgst = subtotal * 0.09;
        const total = subtotal + cgst + sgst + invoiceData.transport.cost;

        const formattedTotal = total.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const message = `Hello ${invoiceData.customer.name},\n\nPlease find the attached ${docType} (${invoiceData.quote.no}).\n\nThe total amount payable is ${formattedTotal}.\n\nThank you,\n${invoiceData.company.name}`;
        
        const fileToShare = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });

        // Device-specific sharing: Use Web Share API if available (mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
            setSharingStatus('Preparing share...');
            try {
                await navigator.share({
                    files: [fileToShare],
                    title: `${docType.charAt(0).toUpperCase() + docType.slice(1)} - ${invoiceData.quote.no}`,
                    text: message,
                });
                // On successful share, increment number
                if (docType === 'invoice' && nextInvoiceNumber !== null) {
                    setNextInvoiceNumber(n => n !== null ? n + 1 : 1);
                } else if (docType === 'quotation' && nextQuotationNumber !== null) {
                    setNextQuotationNumber(n => n !== null ? n + 1 : 1);
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') { // Don't alert if user just cancelled the share
                    console.error("Web Share API error:", error);
                    alert(`Could not share file: ${error.message}`);
                }
            }
        } else {
            // Fallback for desktop: download and open WhatsApp Web
            setSharingStatus('Downloading...');
            const link = document.createElement('a');
            const url = URL.createObjectURL(pdfBlob);
            link.href = url;
            link.download = pdfFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            setSharingStatus('Opening WhatsApp...');
            const encodedMessage = encodeURIComponent(message);
            const customerNumber = invoiceData.customer.number.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${customerNumber}&text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
            
            if (docType === 'invoice' && nextInvoiceNumber !== null) {
                setNextInvoiceNumber(n => n !== null ? n + 1 : 1);
            } else if (docType === 'quotation' && nextQuotationNumber !== null) {
                setNextQuotationNumber(n => n !== null ? n + 1 : 1);
            }
        }
    } catch (error: any) {
        console.error("Error during sharing process:", error);
        alert(`Could not complete sharing process: ${error.message || 'Unknown error occurred.'}`);
    } finally {
        setSharingStatus('');
    }
  }, [invoiceData, docType, defaultData, auth, nextInvoiceNumber, nextQuotationNumber]);

  return (
    <div className="min-h-screen text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center py-3 gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <h1 className="text-xl font-bold text-gray-900">Invoice Pro</h1>
                    <EditLockButton isLocked={isLocked} setIsLocked={setIsLocked} />
                </div>
              
              <div className="flex items-center flex-wrap justify-center gap-2 md:gap-4">
                 {numbersLoading ? (
                    <div className="flex items-center gap-2 text-sm px-2 py-1 text-gray-500">
                      <span>Loading #...</span>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <InvoiceNumberManager 
                        docType={docType}
                        nextNumber={docType === 'invoice' ? (nextInvoiceNumber ?? 1) : (nextQuotationNumber ?? 1)}
                        setNextNumber={docType === 'invoice' ? setNextInvoiceNumber : setNextQuotationNumber}
                    />
                 )}
                 <div className="flex items-center p-1 bg-gray-200 rounded-lg">
                  <button
                    onClick={() => setDocType('invoice')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${docType === 'invoice' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => setDocType('quotation')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${docType === 'quotation' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                  >
                    Quotation
                  </button>
                </div>
                 <AuthDisplay />
                <button
                  onClick={handleShare}
                  disabled={!!sharingStatus}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-wait transition"
                >
                  {sharingStatus ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ShareIcon />
                  )}
                  <span className="min-w-[120px] text-center">{sharingStatus || 'Share Document'}</span>
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <DownloadIcon />
                  )}
                  <span>{isLoading ? 'Generating...' : `Download PDF`}</span>
                </button>
              </div>
            </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          <div className="lg:order-1">
             <InvoiceForm data={invoiceData} setData={setInvoiceData} docType={docType} isLocked={isLocked} defaultData={defaultData} />
          </div>
          <div className="mt-8 lg:mt-0 lg:order-2">
            <div className="sticky top-[110px]">
              <h2 className="text-lg font-semibold mb-4 text-center text-gray-600">Live PDF Preview</h2>
               <PdfPreviewer data={invoiceData} docType={docType} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}