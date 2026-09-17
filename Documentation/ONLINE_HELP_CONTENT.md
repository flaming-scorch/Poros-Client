# Poros Online Help Content



## 1. Feature: Tailor a Resume

**Title:** How to Tailor Your Resume
**Goal:** Create a custom resume version optimized for a specific job application to pass ATS filters.

**Instructions:**
1. Go to the **Resumes** tab.
2. Tap the **Tailor Resume** button (magic wand icon).
3. Select the **Base Resume** you want to customize.
4. Paste the **Job Description** from the job posting.
5. Enter the **Company Name** and **Position Title**.
6. Tap **Generate**.
7. Once finished, tap **Preview** to see and download your new PDF.

---

## 2. Feature: Track a Job Application

**Title:** Tracking Your Applications
**Goal:** Keep organized records of where you have applied and your current status.

**Instructions:**
1. Go to the **Job Tracker** tab.
2. Tap the **+** button to add a new application.
3. Fill in the **Company**, **Role**, and **Status** (e.g., Applied).
4. Tap **Save**.
5. To update a status later, tap the application card and select the new status (e.g., Interview).

---

## 3. Feature: Managing Target Companies

**Title:** Researching Target Companies
**Goal:** Build a list of dream companies and track your networking progress.

**Instructions:**
1. Go to the **Targets** tab.
2. Tap **Add Target Company**.
3. Search for a company (e.g., "Microsoft") or add a custom one.
4. Tap the company card to view **Events**, **Courses**, and your **Preparation Checklist**.
5. Check off items as you complete your research to track progress.

---

## 4. UI Implementation Details

**Accessing Help:**
*   **Trigger:** Tap the **Help icon (?)** located in the top-right corner of the header on supported screens (Dashboard, Tracker, Resume, Targets, Jobs).
*   **Display:** A modal popup overlay appears with contextual help for the current screen.
*   **Interaction:**
    *   **Scroll:** The help content is fully scrollable to accommodate detailed instructions.
    *   **Close:** Tap anywhere on the dimmed background or the Close (X) button to dismiss.

**Supported Screens & Content:**

### Dashboard
*   **Overview:** Quick summary of your application progress.
*   **Actions:** Access quick links to Recommendations, Tracker, and Targets.

### Job Recommendations
*   **Features:**
    *   **Filters:** Filter by Job Type (Internship/New Grad) and Categories.
    *   **Sponsorship:** View visa sponsorship status. "Other" status displays as **"no info on sponsorship available"**.

### Job Tracker
*   **Features:**
    *   **Status Updates:** Move applications between Applied, Interview, Offer, and Rejected.
    *   **Selection Mode:** Long-press an item to enter selection mode for bulk deletion.

### Resume Manager
*   **Features:**
    *   **Upload:** Add new PDF resumes.
    *   **Tailor:** Use AI to customize your resume for specific job descriptions.
    *   **Primary:** Set a specific resume as your default for quick applying.

### Target Companies
*   **Features:**
    *   **Research:** Access company-specific events and recommended courses.
    *   **Checklist:** Track preparation tasks for each target company.

