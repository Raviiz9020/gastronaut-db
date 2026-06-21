
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## How to Fix PDF Image Loading Errors (CORS)

If you see network errors when generating a PDF menu, it's likely due to a browser security policy called CORS. To fix this, you need to tell Firebase Storage to allow your web app to load images.

**Prerequisites:**
*   You must have the [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed or use the Google Cloud Shell.

---

### Step 1: Open Your Terminal or Cloud Shell

1.  Open a terminal where you have `gcloud` installed, or go to the [Google Cloud Shell](https://shell.cloud.google.com/).
2.  Make sure you are authenticated (`gcloud auth login`) and have selected the correct project (`gcloud config set project YOUR_PROJECT_ID`).

---

### Step 2: Identify Your Storage Bucket URL

1.  Go to your Firebase project.
2.  Navigate to **Storage** in the left menu.
3.  Your bucket URL is shown at the top of the file view. It will look like `gs://your-project-id.appspot.com`. Copy this URL.

---

### Step 3: Apply the CORS Configuration

1.  This project includes a file named `cors.json` with the correct settings.
2.  In your terminal or Cloud Shell, run the following command, replacing `[YOUR_BUCKET_URL]` with the URL you copied in the previous step:

    ```bash
    gcloud storage buckets update [YOUR_BUCKET_URL] --cors-file=./cors.json
    ```

    **Example:**
    ```bash
    gcloud storage buckets update gs://hyperplate-app.appspot.com --cors-file=./cors.json
    ```

3.  That's it! The changes may take a few minutes to take effect. After that, your PDF menus should generate with images correctly.

---

## How to Enable Order Confirmation Emails (Using Gmail)

To allow the application to send order confirmation emails to vendors, you need to configure it with a Gmail account that can send emails on its behalf. The most secure way to do this is by using a **Google App Password**.

**Prerequisites:**
*   You must have 2-Step Verification enabled on the Google Account you want to send emails from.

---

### Step 1: Enable 2-Step Verification (If you haven't already)

1.  Go to your [Google Account](https://myaccount.google.com/).
2.  In the navigation panel on the left, select **Security**.
3.  Under "How you sign in to Google," select **2-Step Verification**.
4.  Click **Get started** and follow the on-screen steps.

---

### Step 2: Generate an App Password

1.  Go back to your [Google Account's Security page](https://myaccount.google.com/security).
2.  Under "How you sign in to Google," click on **App passwords**. You may need to sign in again.
    *   If you can’t find this option, it might be because 2-Step Verification is not set up, or it's set up only for security keys.
3.  At the bottom, click **Select app** and choose **Other (Custom name)**.
4.  Enter a name for the app password (e.g., "HyperDelivery App") and click **Generate**.
5.  Google will generate a **16-character password**. This is the password you need. **Copy this password now**, as you won't be able to see it again.
    *   It will look something like this (without spaces): `xxxx xxxx xxxx xxxx`

---

### Step 3: Configure Your Application

1.  Open the `.env` file in your project.
2.  Add the following two lines, replacing the placeholder values with your Gmail address and the 16-digit App Password you just generated:

    ```env
    EMAIL_USER=your-email@gmail.com
    EMAIL_APP_PASSWORD=your-16-digit-app-password
    ```

3.  Save the `.env` file.

Your application is now configured to send emails securely through your Gmail account.

## One-Time Data Migration (Dev to Prod)

To migrate your data from your development Firestore database to your production database, the recommended and most secure method is to use the Google Cloud Platform (GCP) Import/Export feature.

**Prerequisites:**

*   You must have two separate Firebase projects: one for development and one for production.
*   You must have the "Owner" or "Cloud Datastore Import Export Admin" role in both GCP projects.
*   You will need a Google Cloud Storage bucket to temporarily store the exported data.

---

### Step 1: Export Data from Your Development Project

1.  **Go to the GCP Console**: Open the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Select Your Development Project**: Make sure your development Firebase project is selected at the top of the page.
3.  **Navigate to Firestore**: In the navigation menu (`☰`), go to **Databases > Firestore**.
4.  **Go to Import/Export**: In the Firestore menu, click on **Import/Export**.
5.  **Start Export**:
    *   Click the **Export** button.
    *   Choose **Export entire database**.
    *   For the destination, select a **Cloud Storage bucket**. If you don't have one, you can easily create one in the same project.
    *   Click **Export**. The process may take a few minutes.

### Step 2: Grant Permissions to the Production Project

Your production project needs permission to read the data from your development project's storage bucket.

1.  **Navigate to Cloud Storage in Dev Project**: In the GCP console (still in your dev project), go to **Cloud Storage > Buckets**.
2.  **Select Your Bucket**: Click on the bucket where you exported your data.
3.  **Go to Permissions**: Click on the **Permissions** tab.
4.  **Grant Access**:
    *   Click **Grant Access**.
    *   In the "New principals" field, enter the service account email of your **production project**. The email will look like this: `service-[YOUR-PROD-PROJECT-NUMBER]@gcp-sa-firestore.iam.gserviceaccount.com`. You can find your production project number in the GCP console under "Project info" on the Dashboard.
    *   Assign the **Storage Object Admin** role.
    *   Click **Save**.

### Step 3: Import Data into Your Production Project

1.  **Switch to Your Production Project**: In the GCP Console, switch to your production project.
2.  **Navigate to Firestore**: Go back to **Databases > Firestore > Import/Export**.
3.  **Start Import**:
    *   Click the **Import** button.
    *   Find the export file you created in your development project's bucket. You may need to browse for it. The file path will look something like: `gs://[YOUR-DEV-BUCKET-NAME]/[TIMESTAMP]/`.
    *   Select the `all_namespaces` output file (e.g., `...[TIMESTAMP].overall_export_metadata`).
    *   Click **Import**.

This will safely and securely copy all the data from your development database into your production database.
