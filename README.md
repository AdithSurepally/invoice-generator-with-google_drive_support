
<div align="center">
  <img src="/public/logo.png" alt="Invoice Pro Logo" width="100"/>
  <h1>Invoice Generator Pro</h1>
  <p>A powerful, React-based PWA for creating professional invoices and quotations with seamless Google Drive integration.</p>
  
  <p>
    <a href="#"><img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React"></a>
    <a href="#"><img src="https://img.shields.io/badge/PWA-Ready-green?logo=pwa" alt="PWA Ready"></a>
    <a href="#"><img src="https://img.shields.io/badge/Google_Drive-Integrated-yellow?logo=googledrive" alt="Google Drive Integrated"></a>
    <a href="#"><img src="https://img.shields.io/badge/License-MIT-purple" alt="License: MIT"></a>
  </p>
</div>

---

> **Note:** This is a fully functional, client-side application that runs in your browser. All data is either stored locally or, with your permission, securely in your own Google Drive.

![Application Screenshot](https://user-images.githubusercontent.com/12345/123456789-abcdef.png)
_Add a screenshot or GIF of your running application here._

## ✨ Key Features

| Feature                  | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Invoice & Quotation**  | Seamlessly switch between creating invoices and quotations with pre-filled templates.                   |
| **Live PDF Preview**     | See a real-time preview of your document update as you type.                                            |
| **Company Details Lock** | A safety feature prevents accidental edits to your company/bank details. Hold the lock button to unlock. |
| **Dynamic Numbering**    | Automatically suggests the next document number by checking your Google Drive for the last one used.      |
| **Google Drive Sync**    | Securely save PDFs to a dedicated `invoices` or `quotes` folder in your Google Drive.                   |
| **Easy Sharing**         | Share documents via Web Share API (mobile) or open WhatsApp with a pre-filled message (desktop).        |
| **PWA Ready**            | Installable on desktop and mobile for an app-like experience and offline access.                          |
| **Fully Customizable**   | Easily configure your logo, UPI ID for QR payments, website URL, and default T&Cs.                      |

## 🚀 Getting Started (Local Development)

To run this project locally, you need [Node.js](https://nodejs.org/) installed.

1.  **No `npm install` Needed!**
    This project uses modern ES modules with an `importmap` in `index.html`. All dependencies like React are loaded directly from a CDN, so you don't need a `node_modules` folder.

2.  **Start a Local Server**
    You can use any simple static file server. A popular choice is `serve`. If you don't have it, install it globally:
    ```bash
    npm install -g serve
    ```
    Then, from the project's root directory, run:
    ```bash
    serve .
    ```
    Your terminal will provide a URL, typically `http://localhost:3000`. Open this in your browser to start using the app.

## 🔧 Configuration (Required for Google Drive)

To enable Google Drive features, you must configure your own Google Cloud credentials.

### 1. Google Cloud Project Setup
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2.  Navigate to **APIs & Services > Library**.
3.  Search for **Google Drive API** and **enable** it.

### 2. Create an API Key
1.  Go to **APIs & Services > Credentials**.
2.  Click **+ CREATE CREDENTIALS** -> **API Key**. Copy the key.
3.  **Restrict the key (Important!)**:
    *   Click the new key to edit it.
    *   Under **API restrictions**, select **Restrict key** and choose **Google Drive API**.
    *   Under **Application restrictions**, select **HTTP referrers** and add your app's URL (e.g., `http://localhost:3000/*` for testing).

### 3. Create an OAuth 2.0 Client ID
1.  Go back to **APIs & Services > Credentials**.
2.  Click **+ CREATE CREDENTIALS** -> **OAuth client ID**.
3.  If needed, configure the **OAuth consent screen**:
    *   Select **External** for User Type.
    *   Fill in the required app/contact info.
    *   Add your Google account as a **Test user** while in "Testing" mode.
4.  Create the Client ID:
    *   Select **Web application**.
    *   Under **Authorized JavaScript origins**, add your app's URL (e.g., `http://localhost:3000`).
5.  Click **Create** and copy the **Client ID**.

### 4. Update the Config File
Open the `config.ts` file and paste your credentials:

```typescript
// in config.ts
export const GOOGLE_CONFIG = {
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID', // <-- PASTE YOUR CLIENT ID HERE
  API_KEY: 'YOUR_GOOGLE_API_KEY',     // <-- PASTE YOUR API KEY HERE
  // ...
};
```

## ⚙️ Customization

Tailor the application to your brand.

1.  **UPI Payment QR Code**: Open `constants.ts` and replace the placeholder UPI ID to enable QR code payments on invoices.
    ```typescript
    // in constants.ts
    export const UPI_ID = 'your-upi-id@okbank'; // <-- REPLACE WITH YOUR UPI ID
    ```

2.  **Branding**:
    *   Replace `public/logo.png` with your company logo (150x40px recommended).
    *   Open `config.ts` and update `BRANDING_CONFIG` with your website URL for the QR code on quotations.
    ```typescript
    // in config.ts
    export const BRANDING_CONFIG = {
        WEBSITE_URL: 'https://your-website.com', // <-- REPLACE
    };
    ```

## 🤝 Contributing

Contributions, issues, and feature requests are not welcomed! just download and use/modify the page for your benefit and ease.MADE USING AI.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## CAUTION 

Use this project for personal use only "security features" not implemented!!!