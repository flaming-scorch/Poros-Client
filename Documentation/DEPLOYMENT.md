# Poros Application Deployment Guide

This guide will help you deploy the **Backend** to the cloud (Render) so you can run the **Client** on your computer without network issues.

## Part 1: Deploy Backend to Render

1.  **Push your code to GitHub**
    *   Ensure all your latest changes (including the new `render.yaml` file) are committed and pushed to your GitHub repository.

2.  **Create a Render Account**
    *   Go to [dashboard.render.com](https://dashboard.render.com/) and sign up.
    *   Connect your GitHub account.

3.  **Create a New Blueprint**
    *   Click **New +** button in the top right.
    *   Select **Blueprint**.
    *   Connect your `calvin-cs262-fall2025-teamF` repository (or wherever your code is).
    *   Render will automatically detect the `render.yaml` file we just created.
    *   Click **Apply**.

4.  **Configure Database**
    *   Render might ask you to add a database or you might need to create a **PostgreSQL** database separately on Render (or use Supabase).
    *   **Recommendation:** Use **Supabase** (it's free and easier).
        1.  Go to [supabase.com](https://supabase.com) and create a project.
        2.  Get the **Connection String** (URI) from Settings -> Database -> Connection string -> Node.js.
        3.  In Render Dashboard -> Your Service -> **Environment**, add a new variable:
            *   Key: `DATABASE_URL`
            *   Value: `postgres://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres` (replace with your actual string).
    *   *Note: If you use Render's built-in Postgres, it costs money after the trial. Supabase is free forever for small apps.*

5.  **Get Your URL**
    *   Once deployed, Render will give you a URL like `https://poros-data-service.onrender.com`.
    *   Copy this URL.

## Part 2: Connect the Client

1.  **Update Environment Variable**
    *   Open `client/Client/.env` on your computer.
    *   Change `EXPO_PUBLIC_API_URL` to your new Render URL.
    
    ```env
    EXPO_PUBLIC_API_URL=https://poros-data-service.onrender.com
    ```
    *(Make sure there is NO trailing slash `/` at the end)*

2.  **Restart Client**
    *   Stop the terminal (`Ctrl + C`).
    *   Run `npm run web` (or `npm start`).

## Part 3: Share with Team

1.  Tell your teammates to pull the latest code.
2.  Give them the `.env` file (or the URL) so they can update theirs.
3.  Now everyone connects to the **same** database in the cloud!
