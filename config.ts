// This file contains the configuration for Google APIs.
// IMPORTANT: To run this project, you must create your own Google Cloud project
// and obtain your own credentials.

// How to get your credentials:
// 1. Go to https://console.cloud.google.com/ and create a new project.
// 2. Go to "APIs & Services" -> "Credentials".
// 3. To get CLIENT_ID:
//    - Click "+ CREATE CREDENTIALS" -> "OAuth client ID".
//    - Select "Web application".
//    - Add your app's URL (e.g., http://localhost:3000) to "Authorized JavaScript origins".
//    - Copy the generated "Client ID" and paste it below.
// 4. To get API_KEY:
//    - Go to "APIs & Services" -> "Library", search for "Google Drive API", and enable it.
//    - Go back to "Credentials", click "+ CREATE CREDENTIALS" -> "API key".
//    - Copy the generated "API key" and paste it below.
//    - It's highly recommended to restrict this key. Click on the key, go to "API restrictions",
//      select "Restrict key", and choose "Google Drive API".
//      Then go to "Application restrictions", select "HTTP referrers", and add your app's URL.

// For production, it's best practice to store these keys in environment variables
// and not commit them to version control.
export const GOOGLE_CONFIG = {
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID', // <-- REPLACE WITH YOUR CLIENT ID
  API_KEY: 'YOUR_GOOGLE_API_KEY', // <-- REPLACE WITH YOUR API KEY
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
};

// Configuration for branding elements like logos and links
export const BRANDING_CONFIG = {
    // The URL your website or portfolio that the QR code on quotations will point to.
    WEBSITE_URL: 'https://example.com', // <-- REPLACE WITH YOUR WEBSITE URL
    // The text that appears below the QR code on quotations.
    QUOTATION_QR_TEXT: 'Visit our Website',
};
