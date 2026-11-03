export type TutorialRole = "student" | "coach" | "owner" | "finance"
export type TutorialLesson = {
    id: string
    group: string
    title: string
    summary: string
    destination: string
    action: string
    steps: { title: string; detail: string }[]
    tip: string
}
export type TutorialGuide = { title: string; introduction: string; lessons: TutorialLesson[] }

function security(student = false): TutorialLesson {
    return {
        id: "account-security", group: "Getting started", title: "Sign in and secure your account",
        summary: "Use your range account, choose a personal password, and find your way around.",
        destination: student ? "security" : "password", action: "Open Account security",
        steps: [
            { title: "Use the account provided to you", detail: student ? "Sign in at /range/login with the username and temporary password shared by the owner. Your account opens the student training portal." : "Sign in at /range/login with your phone number or username and password. Coaches receive their account from the owner; owners use their provisioned owner account." },
            { title: "Replace your temporary password", detail: "On your first sign-in, enter the temporary password as Current password. Choose a unique new password of at least 12 characters, repeat it in Confirm new password, and select Change password. Your records unlock after this step." },
            { title: "Find the tools for your account", detail: student ? "Use the portal menu for Overview, Training Plans, Diary & History, Progress, and Account Security. On a phone, open Menu. Select Tutorial any time to return to this guide." : "Use the left menu on a computer or the menu button at the top left on a phone. Select the location you are working at in the top bar. Menu options depend on your account role." },
            { title: "Keep your sign-in private", detail: "Use Account security to change your password later, and Sign out when you finish on a shared device. If you forget your password, ask the owner for a reset. Owners should contact the person who manages their account setup." },
        ],
        tip: "All training and range dates use India Standard Time (IST). You can read Tutorial before completing the required password change.",
    }
}

const assignPlans: TutorialLesson = {
    id: "assign-plans", group: "Training", title: "Assign and update daily training plans",
    summary: "Write a common plan, personalize it, and deliberately replace existing plans.",
    destination: "training", action: "Open Training & progress",
    steps: [
        { title: "Open Daily plans", detail: "In Training & progress, select Daily plans. Choose the training date and enter a Plan title and Instructions, such as warm-up, technical drills, and recovery." },
        { title: "Choose the students and documents", detail: "Tick the students who should receive the plan, or use Select all to choose the entire available roster, including students outside the current search. Add optional Plan documents: up to 5 PDF, JPG, PNG, or WEBP files, each no larger than 3 MB." },
        { title: "Preview before saving", detail: "Select Preview assignments. Review each student. Existing plans stay unchanged unless you tick Replace existing plan. Use Customize instructions to change an individual student's title, instructions, or attachments." },
        { title: "Edit an existing plan carefully", detail: "Expand Existing plan in the preview and choose Edit this existing plan to load its saved content. All assigned coaches share one plan per student per day, so check what is already there before replacing it." },
        { title: "Save and verify", detail: "Select Save selected assignments. Choose the student below the composer and check Training plans. Use From and To to find older dates, and Version history to review earlier versions." },
    ],
    tip: "If no students appear for a coach, the owner needs to assign them in Student access. Location enrollment alone does not grant training access.",
}

const reviewDiaries: TutorialLesson = {
    id: "review-diaries", group: "Training", title: "Review diaries and follow progress",
    summary: "Read students' sessions, leave feedback, and review the latest version.",
    destination: "training", action: "Open Training & progress",
    steps: [
        { title: "Select the student and session", detail: "Open Training & progress → Diary & review. Choose a student. Filter by From, To, Discipline, and Review status to find sessions, then read the notes, recorded metrics, target images, and linked plan." },
        { title: "Write your feedback", detail: "Open Add remarks / review (or Edit my remarks / review). Enter Your remarks. Tick Mark this version reviewed when you have finished checking the session, then select Save remarks & review." },
        { title: "Return to changed sessions", detail: "If the student edits a reviewed session, it shows Changed since review. Read the new version and save a fresh review. Each coach records their own review; a coach's review filter reflects that coach's reviews." },
        { title: "Use history for context", detail: "Open Version history to compare earlier diary entries and reviews. Previous remarks remain available when the student updates the session." },
        { title: "Check trends over time", detail: "Switch to Progress, choose the student, date range, and discipline. Read score percentages, session frequency, minutes, and shots. For raw score comparisons, enable Show raw scores for a matching maximum and choose the maximum score." },
    ],
    tip: "Only students edit their own training sessions. Coaches and owners add remarks and reviews. Missing metrics stay missing; they are not treated as zero.",
}

function studentRoll(owner = false): TutorialLesson {
    return {
        id: "student-attendance", group: "Daily operations", title: "Add students and mark daily attendance",
        summary: "Enroll students, take the daily roll, and save attendance changes.",
        destination: "students", action: "Open Students & attendance",
        steps: [
            { title: "Check the location and student profile", detail: "Choose the correct location in the top bar. In Students & attendance, use Student roster and Find a student to check whether the student already exists before adding another profile." },
            { title: "Add a student when needed", detail: "Select Add student. Enter the name, student or guardian contact, discipline, and Enrollment date, then save. Siblings can share a contact number; each student still needs their own profile." },
            { title: "Take the roll", detail: "Select Daily attendance and check the Attendance date. Choose Present, Absent, or Leave for each eligible student. Search and Show status help narrow the list. Unmarked means no attendance has been saved." },
            { title: "Review bulk marks and save", detail: "Bulk marking affects only visible, eligible students who are still unmarked. It preserves existing individual choices. Check the Unsaved indicators, then select Save attendance and wait for the saved confirmation." },
            { title: owner ? "Correct saved marks with a reason" : "Request corrections when needed", detail: owner ? "For saved attendance changes, enter the required reason and save. Use Corrections to review a coach's request, check its date and proposed status, then apply it with an owner reason or reject it with an explanation. Use Student roster → Edit for profile or enrollment changes." : "Coaches can mark today's unmarked attendance. For an older date or an existing mark, use Request an attendance correction, choose the student, date, requested status, and reason, then Send correction request. Check its status in Corrections." },
        ],
        tip: "Student attendance, fee coverage, and training accounts are separate. Adding a roster profile does not automatically create a student sign-in.",
    }
}

function fees(owner = false): TutorialLesson {
    return {
        id: "student-fees", group: "Money", title: "Record admissions and renewal payments",
        summary: "Save money received together with the student's agreed coverage dates.",
        destination: "fees", action: "Open Admissions & fees",
        steps: [
            { title: "Prepare the student and accounts", detail: "Add the student in Students & attendance first. Select the right location, open Admissions & fees, and expand Record a student payment. The owner must have configured a funds account and an income category." },
            { title: "Enter the payment and coverage", detail: `Choose the Student and New admission or Renewal. Enter Amount received, Received on, and Number of months paid. ${owner ? "Use the actual payment date, including an earlier date for historical payments." : "Coaches record payments received today; ask the owner to enter historical payments."} Review Coverage starts and Coverage through; the suggested end date is editable and inclusive.` },
            { title: "Match how the money was received", detail: "Choose the holding account and payment method. Use Split across another account for a mixed payment, such as ₹600 cash plus ₹400 online for a ₹1,000 total. Payment parts must add up to the amount received. Add a reference, notes, or receipt image if needed." },
            { title: "Save once and verify the record", detail: "Select Save payment and coverage. Check the student's name, amount, payment date, and coverage in the payment list. This creates the income entry automatically." },
            { title: owner ? "Correct payment and coverage together" : "Ask the owner to fix mistakes", detail: owner ? "Use Correct / void payment on the fee record. Enter a reason to replace the payment and its coverage together, or void a mistaken payment. If money is actually returned, record a separate linked refund in Income & expenses." : "Use Request correction on your payment, describe the issue, and send it to the owner. Do not add a second payment to cancel the first." },
        ],
        tip: "This screen records payments received and coverage dates. It does not calculate unpaid balances or installment schedules. Avoid entering the same fee again as Other income.",
    }
}

function finance(owner = false): TutorialLesson {
    return {
        id: "income-expenses", group: "Money", title: "Record income, expenses, and product sales",
        summary: "Choose the right entry type and match every payment to its funds account.",
        destination: "finance", action: "Open Income & expenses",
        steps: [
            { title: "Choose the location and entry type", detail: "Open Income & expenses and expand the financial entry form. Use Other income for general receipts, Expense for money spent, or Product sale for a catalog item. Record admissions in Admissions & fees and salaries in Salary payments to keep their details together." },
            { title: "Enter the actual amount and activity date", detail: `Choose the category and describe the buyer or purpose. For a Product sale, choose the product, quantity, and actual unit selling price; the total must match quantity × price. ${owner ? "Use the actual activity date for historical records." : "Coaches record today's activity; ask the owner to add older transactions."}` },
            { title: "Assign the payment parts", detail: "Choose the account holding the money and the payment method. If several accounts were used, select Split across another account and make their amounts equal the total. Add a UTR/reference and optional receipt image when useful." },
            { title: "Save and check the balances", detail: "Select Save financial entry. Check the posted record and use Refresh balances and records if needed. Balance cards show cumulative tracked funds through today, even when the records list is filtered to a different period." },
            { title: owner ? "Correct the record in its original screen" : "Send a correction request", detail: owner ? "For a general entry or sale, use Correct / void and give a reason. Fee and salary corrections belong in their own screens. A real refund is a separate Refund of an earlier payment entry linked to the original; it is different from voiding an incorrect record." : "On a mistaken record, use Request correction and explain what needs changing. The owner reviews the request. Coaches see their own recorded entries and holding balances; shared account balances are restricted." },
        ],
        tip: "Balances start from each account's dated opening funds and do not reset daily. Earlier payments can appear in history without affecting that account's current balance. Product sales do not manage stock levels.",
    }
}

const studentLessons: TutorialLesson[] = [
    security(true),
    {
        id: "read-plans", group: "Daily training", title: "Find and follow your training plan",
        summary: "Read today's instructions and open the documents your coach shared.",
        destination: "plans", action: "Open Training Plans",
        steps: [
            { title: "Start with Overview", detail: "Overview shows today's plan, your assigned coaching team, and this month's training summary. Check the plan before your session." },
            { title: "Find another training date", detail: "Select Training Plans from the menu. Use From and To to find a particular day or period. Each plan shows its date, title, instructions, version, and the coach who last updated it." },
            { title: "Open the attached documents", detail: "Select a file under the plan to open it in a new tab. Read any drill sheets or images alongside the written instructions. You need to stay signed in to open private training files." },
            { title: "Check earlier instructions", detail: "Use Version history to see how a plan changed. Follow the current instructions and ask your coach if something is unclear." },
        ],
        tip: "No plan for today? You can still train and record a diary session. If no coaches appear, ask the owner to check your assignments.",
    },
    {
        id: "record-session", group: "Daily training", title: "Record your first training session",
        summary: "Build your diary with notes, time, shots, and scores.",
        destination: "diary", action: "Open Diary & History",
        steps: [
            { title: "Add a session", detail: "Select Diary & History → Add training session. Choose the Training date in IST and your Discipline: Air pistol, Air rifle, or General training. You can record past sessions, but not a future date." },
            { title: "Describe your practice", detail: "Enter a Session label, such as Morning precision practice. In Training notes, describe the drills, what went well, and what needs attention. The plan for your selected date appears alongside the form when available." },
            { title: "Add the metrics you recorded", detail: "Duration and Shot count are optional. If you enter a Total score, also enter a positive Maximum possible score, for example 365 out of 400. Leave unknown metrics blank; enter 0 only when you actually recorded zero." },
            { title: "Save and find your entry", detail: "Add optional target images, wait for uploads to finish, and select Save training session. Your entry appears in Diary & training history, where your assigned coaches can read and review it. You can add more than one session on the same day." },
        ],
        tip: "Saving a diary entry does not mark range attendance. Staff manage attendance separately.",
    },
    {
        id: "target-images", group: "Daily training", title: "Attach clear target images",
        summary: "Share evidence of your practice with your coaching team.",
        destination: "diary", action: "Open Diary & History",
        steps: [
            { title: "Open the session editor", detail: "Choose Add training session for a new entry or Edit session on an existing entry. Find Target images below the metrics." },
            { title: "Choose suitable images", detail: "Attach JPG, PNG, or WEBP files. Each file must be 3 MB or smaller, with up to 10 images per session. Choose a clear image with the whole target visible so your coach can assess it." },
            { title: "Finish the upload and save", detail: "Wait for Uploading files to finish. Use Remove beside a file if you selected the wrong image, then save the session. Uploading alone does not save the diary entry." },
            { title: "Check the saved images", detail: "Open the saved session and select an image to view it in a new tab. Training files are private to your authorized training team." },
        ],
        tip: "If a file is too large, resize or compress it and retry. If uploading fails repeatedly, ask the owner to check file storage setup.",
    },
    {
        id: "feedback-history", group: "Review & improve", title: "Read feedback and update a session",
        summary: "Use coach remarks and keep an accurate diary without losing earlier versions.",
        destination: "diary", action: "Open Diary & History",
        steps: [
            { title: "Find the session", detail: "In Diary & History, filter by From, To, Discipline, or Review status. Read the coach's remarks beneath your entry. Awaiting review means the current entry has not yet been marked reviewed." },
            { title: "Understand the review status", detail: "Reviewed means a coach reviewed the current version. Changed since review means you updated the entry after a review, so the coach needs to check it again. Multiple coaches can leave their own remarks." },
            { title: "Correct your own entry", detail: "Select Edit session, update the notes, metrics, or images, and save. Earlier versions and previous coach remarks remain available." },
            { title: "Look back at previous versions", detail: "Select Version history to read earlier entries and reviews. Use your coach's feedback to choose what to focus on next time." },
        ],
        tip: "Your assigned coaches and the owner can view your training. Share relevant training notes and keep account passwords private.",
    },
    {
        id: "understand-progress", group: "Review & improve", title: "Understand your progress graphs",
        summary: "Compare scores and track your training habits over time.",
        destination: "progress", action: "Open Progress",
        steps: [
            { title: "Choose a useful comparison", detail: "Open Progress. Set From, To, and Discipline. Start with a week or month in the discipline you want to improve." },
            { title: "Read the summary", detail: "Sessions counts entries, while Training days counts distinct practice days. Minutes and shots include only metrics you recorded. The score percentage uses recorded scores and their maxima." },
            { title: "Compare scores fairly", detail: "Read the separate discipline trends. To compare raw scores, enable Show raw scores for a matching maximum, then choose the maximum possible score. This keeps scores out of different totals from being mixed together." },
            { title: "Check consistency as well as scores", detail: "Read Training frequency, Training duration, and Recorded shot counts. Open View values below a graph for its table of dates and values." },
        ],
        tip: "No data in the period? Widen the dates or clear the discipline filter. Saved diary sessions build the graphs; blank metrics do not become zero scores.",
    },
]

const coachLessons: TutorialLesson[] = [
    security(),
    {
        id: "coach-day", group: "Getting started", title: "Run through your coaching day",
        summary: "A practical order for attendance, training, payments, and closing your shift.",
        destination: "home", action: "Open Overview",
        steps: [
            { title: "Check your location and overview", detail: "Choose your location in the top bar. Overview shows today's student roll, your shifts, your financial activity, and items needing attention. Date filters for money do not change today's attendance counts." },
            { title: "Start your shift and take the roll", detail: "Use My attendance to check in with a fresh selfie. In Students & attendance, mark today's eligible, unmarked students and save the roll." },
            { title: "Plan training and review practice", detail: "Open Training & progress to assign daily plans, read diaries, leave feedback, and follow progress for your assigned students." },
            { title: "Record the day's money and check out", detail: "Enter admissions or renewals in Admissions & fees, other receipts and spending in Income & expenses, and funds passed on in Money handovers. Review your entries, then return to My attendance to check out with a selfie." },
        ],
        tip: "If a location is missing, ask the owner to assign it in Staff & locations. Training student assignments are managed separately.",
    },
    {
        id: "coach-shifts", group: "Daily operations", title: "Check in, check out, and fix a missed shift",
        summary: "Record your arrival and departure with the live camera.",
        destination: "attendance", action: "Open My attendance",
        steps: [
            { title: "Start at the right location", detail: "Choose the range in the top bar, open My attendance, and select Check in with selfie. Allow the browser to use your camera." },
            { title: "Capture and submit a fresh selfie", detail: "Use the in-page camera and complete the punch. Attendance needs a fresh capture; an image from your gallery cannot be used. Wait for the confirmed arrival time before leaving the screen." },
            { title: "Close your shift when you leave", detail: "Open My attendance again and choose Check out with selfie. If your open shift is at another location, select that location first. Only one shift can be open at a time." },
            { title: "Request a correction for missed or wrong times", detail: "Use Request correction on a shift, or expand Request an attendance correction for an entirely missed shift. Enter the intended arrival, departure, and reason, then Send correction request. The owner must review it." },
            { title: "Review your hours", detail: "Use From and To in My shifts and open Daily completed hours. An open shift is not counted as completed time. Earlier shifts left open are flagged for review." },
        ],
        tip: "If the camera fails, check browser camera permission and use the site over HTTPS. A failed capture or upload does not save a punch; retry after fixing the issue.",
    },
    studentRoll(), assignPlans, reviewDiaries, fees(), finance(),
    {
        id: "coach-handovers", group: "Money", title: "Submit and track a money handover",
        summary: "Record funds you passed on and follow owner confirmation.",
        destination: "transfers", action: "Open Money handovers",
        steps: [
            { title: "Make the real handover first", detail: "Open Money handovers at the correct location and expand Record a handover. This screen records money that has already moved; it does not send money through a bank." },
            { title: "Describe the transfer", detail: "Choose your own source account under Money moved from and the recipient account under Money received in. Enter the amount, today's handover date, details, and optional UTR/reference. Accounts must be in the same location." },
            { title: "Submit for confirmation", detail: "Select Submit for owner confirmation. Check the Pending record. Balances change only when the owner confirms the handover." },
            { title: "Track the result or request a correction", detail: "Use Status to find pending, confirmed, rejected, or reversed handovers. Read the owner's note. Use Request correction to explain an incorrect record." },
        ],
        tip: "A confirmed transfer moves tracked funds between accounts and does not count as income or an expense.",
    },
]

const ownerLessons: TutorialLesson[] = [
    security(),
    {
        id: "locations-staff", group: "Getting started", title: "Set up locations and coach accounts",
        summary: "Give each coach their own account and the correct location access.",
        destination: "staff", action: "Open Staff & locations",
        steps: [
            { title: "Check your locations", detail: "Open Staff & locations and review Your locations. To add a range, expand Add a location, enter its name and a lowercase URL name such as mohali, and select Add location." },
            { title: "Create a coach account", detail: "Select Add coach. Enter the coach's name, phone number, and a temporary password of at least 12 characters. Keep Active account checked and tick the locations they can access." },
            { title: "Share credentials privately", detail: "Select Create coach account and provide the sign-in details to that coach privately. Their first sign-in requires them to replace the temporary password." },
            { title: "Manage access as your team changes", detail: "Use Manage on a coach to change assigned locations, issue a new temporary password, or deactivate the account. Leave the reset password field blank to keep the current password. Resets and deactivation revoke existing sessions." },
        ],
        tip: "Create active coaches before assigning them to students. Coach location access and student training assignments serve different purposes.",
    },
    {
        id: "financial-setup", group: "Getting started", title: "Set up funds accounts, products, and categories",
        summary: "Start accurate balances with real opening funds and a clear tracking date.",
        destination: "finance", action: "Open Income & expenses",
        steps: [
            { title: "Open the financial settings", detail: "Choose a location, open Income & expenses, and expand Accounts, products & categories. No starting money is assumed; configure the real accounts used at this range." },
            { title: "Add a funds account", detail: "Enter the account name, holder (Coach, Kartik, or Salvo), coach when relevant, and Cash or Online channel. Enter the actual opening range funds and the start-of-day date they represent." },
            { title: "Check the opening cutoff", detail: "Only movements on or after the opening date contribute to the tracked balance. For example, a payment on 26 October is excluded when tracking begins on 27 October. Correct the opening date and opening funds with a reason if that earlier payment should count." },
            { title: "Add categories and products", detail: "Create suitable income and expense categories, including an income category for student fees. Add operational products with a unit and suggested selling price for product sales. Confirm these items are active before your team records payments." },
            { title: "Retire accounts with history safely", detail: "Use Edit to deactivate an account that should no longer be used. Permanent deletion is only available for an unused account, requires its exact name and a reason, and removes its opening funds from the tracked total." },
        ],
        tip: "Define opening funds once, then record movements. Adding an opening balance and re-entering the same money as income would count it twice.",
    },
    studentRoll(true),
    {
        id: "owner-shifts", group: "Daily operations", title: "Review coach shifts and attendance corrections",
        summary: "Find open shifts, check evidence, and record reasoned adjustments.",
        destination: "attendance", action: "Open Coach attendance",
        steps: [
            { title: "Find the coach's shift", detail: "Select a location and open Coach attendance. Use From and To to review arrivals, departures, and completed time. An earlier shift still open needs review." },
            { title: "Check the evidence", detail: "Expand Photo evidence to view camera captures. Owner adjustments are labeled, and original camera times remain visible for context." },
            { title: "Resolve a correction request", detail: "In Correction requests, select Review correction. Check the proposed times against the intended shift, enter an owner reason, and select Save owner adjustment. Reject an incorrect request with an explanation." },
            { title: "Add or correct a shift directly", detail: "Use Correct times on an existing shift or expand Add a missed shift. Choose the coach when needed and enter arrival, departure, and a reason. A blank departure leaves a shift open; overlapping shifts are rejected." },
            { title: "Review completed hours", detail: "Open Daily completed hours. Completed time is grouped by coach and India date; open shifts do not gain an invented checkout time." },
        ],
        tip: "The owner reviews and adjusts coach attendance here. Coaches record their own live camera check-ins and checkouts from My attendance.",
    },
    {
        id: "student-access", group: "Training", title: "Create student sign-ins and assign coaches",
        summary: "Connect each student account to the correct profile and training team.",
        destination: "training", action: "Open Training & progress",
        steps: [
            { title: "Create or locate the student profile", detail: "Add the student in Students & attendance first. In Training & progress, choose Student access and select the correct student. Check identity carefully; shared family phone numbers do not identify a unique student." },
            { title: "Create the student account", detail: "Enter a Unique username of 3–32 characters, starting with a letter and using letters, numbers, dots, underscores, or hyphens. Set a temporary password of at least 12 characters, keep Account active checked, and select Create student account." },
            { title: "Assign the coaching team", detail: "In Assigned coaches, tick the active coaches who should see this student's plans and training history. Select Save coach assignments. This is a separate save from the account form." },
            { title: "Help the student get started", detail: "Share their username, temporary password, and /range/login privately. They must choose a personal password before viewing training. Ask them to open Tutorial from their portal menu." },
            { title: "Update or recover access", detail: "Return to Student access to reset a temporary password, change account activity, or update coach assignments. Removing a coach removes their access to past sessions, while their previous remarks remain in the diary." },
        ],
        tip: "A roster enrollment does not create a sign-in or assign coaches. Save both the student account and coach assignments before expecting the portal to be ready.",
    },
    assignPlans, reviewDiaries,
    fees(true), finance(true),
    {
        id: "owner-handovers", group: "Money", title: "Confirm handovers and correct transfers",
        summary: "Verify funds moved before updating the tracked account balances.",
        destination: "transfers", action: "Open Money handovers",
        steps: [
            { title: "Review pending handovers", detail: "Open Money handovers at the right location. The owner view starts with Pending. Select Review transfer and compare the source, recipient, amount, date, and reference with the real handover." },
            { title: "Record your decision", detail: "In Owner transfer review, choose confirmation or rejection, enter your reason or verification note, and select Apply owner decision. Confirmation posts equal debit and credit movements; pending and rejected requests have no balance effect." },
            { title: "Record an already verified transfer", detail: "Expand Record a handover and enter its details. You can tick I have verified this handover; confirm immediately, add a verification note, and select Record confirmed transfer. Both accounts must belong to the selected location." },
            { title: "Correct a mistaken record", detail: "Choose All or Confirmed in Status to find history. Use Correct mistaken record to reverse an incorrect confirmed entry with a reason, then record a corrected transfer if needed. If money actually moves back, record a new transfer for that real movement." },
        ],
        tip: "Salvo records handovers; it does not initiate payments. A bookkeeping reversal does not move money in a bank account. Transfers are excluded from income and expense totals.",
    },
    {
        id: "salary-payments", group: "Money", title: "Record and correct salary payments",
        summary: "Keep full or partial salary payments linked to their expense records.",
        destination: "salaries", action: "Open Salary payments",
        steps: [
            { title: "Record a payment already made", detail: "Choose the location, open Salary payments, and expand Record a salary payment. Select the coach, including a former or inactive coach for a historical payment." },
            { title: "Distinguish salary month from payment date", detail: "Enter Salary paid for month / year, the actual Payment date, and Amount paid. A payment made in November for October belongs to the October salary month with its actual November payment date." },
            { title: "Match the accounts and save", detail: "Choose the source account/payment parts so they sum to the amount paid. Add notes or an optional payment proof image, then select Save salary payment. Its expense entry is created automatically." },
            { title: "Review partial payments and corrections", detail: "Filter Salary payment history by salary month or All months. Multiple payments for the same coach and month are allowed. Use Correct / void with a reason when needed; replacements update the salary details and expense together." },
        ],
        tip: "Salary payments are owner-only. This records money paid and does not calculate salary entitlement, attendance deductions, or unpaid salary. Do not enter the same salary again as a general expense.",
    },
    {
        id: "reports-overview", group: "Review & reporting", title: "Use Overview and export reliable reports",
        summary: "Review the range, apply precise filters, and download matching Excel records.",
        destination: "reports", action: "Open Reports & history",
        steps: [
            { title: "Start with Overview", detail: "Overview brings together today's attendance, open shifts, pending handovers and corrections, and financial totals for the selected activity dates. Use its quick actions to open the relevant operational screen." },
            { title: "Choose a report and scope", detail: "Open Reports & history. Choose Finance ledger, Coach attendance, Student attendance marks, Daily student roll, Admission and renewal payments, Money handovers, Salary payments, or Change history. Select dates and the location or all locations." },
            { title: "Apply the filters", detail: "Set status and search as needed. Open More filters for staff, student, category, funds account, or payment method where supported. Select Apply filters and check the Applied dates and matching-record count above the results." },
            { title: "Interpret the results", detail: "Totals cover the full filtered result, even when the table spans pages of 50 rows. Daily student roll includes unmarked students; Student attendance marks shows recorded history. Voided records have no current money movement." },
            { title: "Download the applied result", detail: "Select Download Excel after applying filters. The file includes all matching pages with Records and Summary sheets. If the export exceeds 5,000 records or 4 MB, narrow the dates or other filters and try again." },
        ],
        tip: "Editing filter fields alone does not change the exported result: select Apply filters first. Account balances and income/expense totals answer different questions, and transfers do not count as income.",
    },
]

export const masterTutorialGuide: TutorialGuide = {
    title: "Your master guide",
    introduction: "Your coaching, range management, and financial controls in one account.",
    lessons: ["Getting started", "Daily operations", "Training", "Money", "Review & reporting"].flatMap(group => [...ownerLessons, ...coachLessons.filter(lesson => ["coach-day", "coach-shifts"].includes(lesson.id))].filter(lesson => lesson.group === group)),
}

export const tutorialGuides: Record<TutorialRole, TutorialGuide> = {
    finance: { title: "Your finance guide", introduction: "Record financial changes directly and keep a clear history for the master account.", lessons: ownerLessons.filter(lesson => ["account-security", "financial-setup", "student-fees", "income-expenses", "owner-handovers", "salary-payments"].includes(lesson.id)) },
    student: { title: "Your student guide", introduction: "Follow your plan, keep a useful diary, and turn coach feedback into progress.", lessons: studentLessons },
    coach: { title: "Your coach guide", introduction: "Plan your students' training and handle the daily work at your range with confidence.", lessons: coachLessons },
    owner: { title: "Your owner guide", introduction: "Set up your range, support your team, and keep training and financial records accurate.", lessons: ownerLessons },
}

export type TutorialProgress = { lessonId: string; completed: string[] }
export function readTutorialProgress(value: string | null, lessons: TutorialLesson[]): TutorialProgress {
    const fallback = { lessonId: lessons[0].id, completed: [] }
    try {
        const parsed: unknown = JSON.parse(value || "null")
        if (!parsed || typeof parsed !== "object") return fallback
        const saved = parsed as { lessonId?: unknown; completed?: unknown }
        const ids = new Set(lessons.map(lesson => lesson.id))
        return {
            lessonId: typeof saved.lessonId === "string" && ids.has(saved.lessonId) ? saved.lessonId : fallback.lessonId,
            completed: Array.isArray(saved.completed) ? [...new Set(saved.completed.filter((id): id is string => typeof id === "string" && ids.has(id)))] : [],
        }
    } catch { return fallback }
}

export function searchTutorialLessons(lessons: TutorialLesson[], query: string) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return lessons.filter(lesson => {
        const text = [lesson.title, lesson.group, lesson.summary, lesson.tip, ...lesson.steps.flatMap(step => [step.title, step.detail])].join(" ").toLowerCase()
        return terms.every(term => text.includes(term))
    })
}
