
import { GOOGLE_CONFIG } from '../config';
import { DocType } from '../types';

declare const gapi: any;

let gapiClientInitialized = false;

export const initGapiClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gapiClientInitialized) {
            resolve();
            return;
        }

        // Use the object-based config for gapi.load for more robust error handling
        const config = {
            callback: async () => {
                try {
                    await gapi.client.init({
                        apiKey: GOOGLE_CONFIG.API_KEY,
                        discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
                    });
                    gapiClientInitialized = true;
                    resolve();
                } catch (e) {
                    reject(e);
                }
            },
            onerror: (err: any) => {
                 reject(new Error(`Failed to load GAPI client. Please check your network connection and ad-blockers. Details: ${err?.details || 'Unknown error'}`));
            },
            timeout: 5000, // 5 seconds
            ontimeout: () => {
                reject(new Error('GAPI client load timed out. Please check your network connection.'));
            },
        };

        gapi.load('client', config);
    });
};

export const setGapiToken = (token: string | null) => {
    if (gapi && gapi.client) {
        gapi.client.setToken(token ? { access_token: token } : null);
    }
};

const getFolderId = async (folderName: string): Promise<string> => {
  const response = await gapi.client.drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: 'files(id, name)',
  });
  if (response.result.files && response.result.files.length > 0) {
    return response.result.files[0].id;
  } else {
    // Create folder
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const createResponse = await gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return createResponse.result.id;
  }
};

const getCachedFolderId = async (folderName: string): Promise<string> => {
    const cachedId = sessionStorage.getItem(`drive_folder_${folderName}`);
    if (cachedId) {
        return cachedId;
    }
    const id = await getFolderId(folderName);
    sessionStorage.setItem(`drive_folder_${folderName}`, id);
    return id;
};

export const uploadToDrive = async (pdfBlob: Blob, fileName: string, docType: DocType): Promise<string> => {
    if (!gapiClientInitialized) throw new Error("GAPI client not initialized.");
    
    const folderName = docType === 'invoice' ? 'invoices' : 'quotes';
    const folderId = await getCachedFolderId(folderName);

    const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/pdf',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', pdfBlob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': `Bearer ${gapi.client.getToken().access_token}` }),
        body: form,
    });
    
    const result = await response.json();
    if (result.error) {
        console.error("Upload error:", result.error);
        throw new Error(`Failed to upload to Google Drive: ${result.error.message}`);
    }

    return result.id;
};

export const getLatestDocumentNumber = async (docType: DocType): Promise<number> => {
    if (!gapiClientInitialized) throw new Error("GAPI client not initialized.");

    const folderName = docType === 'invoice' ? 'invoices' : 'quotes';
    const folderId = await getCachedFolderId(folderName);

    const searchPrefix = docType === 'invoice' ? 'INV' : 'QUO';

    const response = await gapi.client.drive.files.list({
        // Search for all files with the new naming convention.
        q: `'${folderId}' in parents and name starts with '${searchPrefix}_' and trashed=false`,
        fields: 'files(name)',
        pageSize: 1000, // A larger page size to search through more history
    });

    const files = response.result.files || [];
    if (files.length === 0) {
        return 1; // No previous documents, start with 1.
    }

    let maxNumber = 0;
    // Regex for new format: INV_YYYYMMDD_NUMBER_...
    const regex = new RegExp(`^${searchPrefix}_\\d{8}_(\\d+)`);

    for (const file of files) {
        const match = file.name.match(regex);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
                maxNumber = num;
            }
        }
    }
    
    return maxNumber + 1;
};