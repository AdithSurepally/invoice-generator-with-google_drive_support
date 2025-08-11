import React, { useState, useEffect } from 'react';
import { InvoiceData, DocType } from '../types';
import { createPdfDoc } from '../utils/pdfGenerator';

interface PdfPreviewerProps {
  data: InvoiceData;
  docType: DocType;
}

export const PdfPreviewer: React.FC<PdfPreviewerProps> = ({ data, docType }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const generatePreview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await createPdfDoc(data, docType);
        const blob = doc.output('blob');
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (e) {
        console.error("Error generating PDF preview:", e);
        setError("Could not generate PDF preview. Please check console for details.");
        setPdfUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the preview generation to avoid re-rendering on every keystroke
    const handler = setTimeout(() => {
        generatePreview();
    }, 500);

    return () => {
      clearTimeout(handler);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [data, docType]);

  return (
    <div className="w-full h-[80vh] bg-gray-200 rounded-lg flex items-center justify-center border shadow-inner">
      {isLoading && (
        <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-600">Generating Preview...</p>
        </div>
      )}
      {error && !isLoading && <p className="text-red-500 p-4">{error}</p>}
      {!isLoading && pdfUrl && (
        <iframe
          src={pdfUrl}
          title="PDF Preview"
          className="w-full h-full border-0 rounded-lg"
        />
      )}
    </div>
  );
};
