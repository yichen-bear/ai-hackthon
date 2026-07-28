# Requirements Document

## Introduction

The Medical Module（醫 Module）is a new page in the AI Life Assistant hackathon project that provides emergency services, nearby medical resource discovery, AI-powered diagnosis suggestions, daily health management, prescription/drug identification, and medicine delivery tracking. The module follows the same design system, component architecture, and mobile-first 430px max-width layout established by the existing Food Module.

## Glossary

- **Medical_Module**: The top-level Vue page component (`medical.vue`) and its scoped CSS token overrides
- **SOS_Header**: The emergency section component providing one-tap ambulance calling and emergency contact dialing
- **Medical_Resource_Card**: The dual-state card component displaying either nearby medical resources (State A) or AI diagnosis suggestions (State B)
- **Health_Reminders**: The component displaying daily health tracking items (water intake, vitamin reminders, health tips)
- **Prescription_Manager**: The component for prescription photo upload, chronic medication reminders, and drug lookup
- **Medicine_Delivery**: The component showing external delivery platform integration or order tracking progress
- **State_A**: The default display mode of Medical_Resource_Card showing nearby clinics/pharmacies in list or map view
- **State_B**: The AI-triggered display mode of Medical_Resource_Card showing preliminary diagnosis results and pre-filled appointment forms
- **Design_System**: The global CSS custom properties (tokens) defined in `design-system.css` governing colors, spacing, typography, radius, and shadows

## Requirements

### Requirement 1: Page Structure and Design System Compliance

**User Story:** As a user, I want the Medical module page to follow the same visual style as other modules, so that the app feels cohesive and consistent.

#### Acceptance Criteria

1. THE Medical_Module SHALL render inside a mobile-first container with max-width of 430px, centered horizontally via auto margins, with min-height of 100vh and background color var(--color-bg-card)
2. THE Medical_Module SHALL override module-scoped color tokens (--color-primary, --color-primary-light, --color-secondary, --color-secondary-light) via a CSS class on the wrapper element
3. THE Medical_Module SHALL use var(--radius-lg) for card border-radius, var(--shadow-card) for card box-shadow, var(--text-*) for font sizes, and var(--space-*) for spacing
4. THE Medical_Module SHALL follow the BEM-like naming convention using a module-specific prefix (`.mc__*`) consistent with the `.bc__*` pattern used in the Food Module
5. THE Medical_Module SHALL arrange its three sections (SOS_Header, Medical_Resource_Card, Health/Prescription/Delivery) in a vertical flex column with var(--space-4) gap and var(--space-4) padding on the inner content area

### Requirement 2: SOS Emergency Section

**User Story:** As a user in a medical emergency, I want to quickly call 119 or reach my emergency contacts, so that I can get help immediately.

#### Acceptance Criteria

1. THE SOS_Header SHALL display a one-tap button with a minimum tap target size of 48×48 CSS pixels that initiates a telephone call to 119 (Taiwan ambulance service) using the `tel:119` protocol
2. IF an emergency contact number is configured, THEN THE SOS_Header SHALL display an emergency contact quick-dial button with a minimum tap target size of 48×48 CSS pixels that initiates a telephone call to the configured emergency contact number
3. IF no emergency contact number is configured, THEN THE SOS_Header SHALL hide the emergency contact quick-dial button or display it in a disabled state with a message indicating that no emergency contact has been set
4. WHEN the SOS_Header is mounted, THE SOS_Header SHALL request the user's GPS coordinates via the browser Geolocation API with a timeout of 10 seconds, and display the coordinates in decimal degrees format (latitude, longitude)
5. IF the browser Geolocation API returns an error or the user denies location permission or the request exceeds 10 seconds, THEN THE SOS_Header SHALL display a fallback message indicating location is unavailable
6. THE SOS_Header SHALL use a red-tone background color scheme to visually differentiate it from standard content cards

### Requirement 3: Medical Resources List and Map View (State A)

**User Story:** As a user looking for medical care, I want to browse nearby clinics and pharmacies in list or map mode, so that I can find and book appointments quickly.

#### Acceptance Criteria

1. WHILE isAiTriggered is false, THE Medical_Resource_Card SHALL display the title "附近醫療資源"
2. WHILE isAiTriggered is false, THE Medical_Resource_Card SHALL display two toggle tabs labeled "📋 列表模式" and "🗺️ 地圖模式", with "📋 列表模式" in the selected state by default
3. WHEN the user selects "📋 列表模式", THE Medical_Resource_Card SHALL set viewMode to "list" and render clinic/pharmacy cards within a 5 km radius in a vertical scrollable list displaying at most 20 entries
4. WHEN the user selects "🗺️ 地圖模式", THE Medical_Resource_Card SHALL set viewMode to "map" and render a map view showing markers for medical facilities within a 5 km radius, displaying at most 20 markers
5. THE Medical_Resource_Card SHALL display each clinic/pharmacy entry with facility name, facility type (clinic or pharmacy), distance in "X.X km" format, and an online appointment button
6. WHEN the user taps an online appointment button on a facility entry, THE Medical_Resource_Card SHALL navigate to the appointment booking flow for that specific facility
7. IF no medical facilities are found within the 5 km radius, THEN THE Medical_Resource_Card SHALL display an empty-state message indicating that no nearby facilities are available
8. WHILE viewMode is "list", THE Medical_Resource_Card SHALL order facility entries by distance in ascending order (nearest first)

### Requirement 4: AI Diagnosis Suggestions (State B)

**User Story:** As a user who has received AI analysis, I want to see preliminary diagnosis results and have my appointment form pre-filled, so that I can quickly consult a relevant specialist.

#### Acceptance Criteria

1. WHEN isAiTriggered becomes true, THE Medical_Resource_Card SHALL switch the title to "AI 診斷建議"
2. WHILE isAiTriggered is true, THE Medical_Resource_Card SHALL display a diagnosis result card containing at minimum: a condition name (max 50 characters), a brief condition description (max 200 characters), and a suggested specialist department name
3. WHILE isAiTriggered is true, THE Medical_Resource_Card SHALL display an appointment/consultation form pre-filled with member data (name, phone, condition) where all pre-filled fields remain editable by the user
4. WHILE isAiTriggered is true, THE Medical_Resource_Card SHALL display a visible dismiss button labeled with text indicating return to resource list, which sets isAiTriggered to false and returns the card to State A
5. WHEN the user submits the appointment form, THE Medical_Resource_Card SHALL validate that name (1-50 characters), phone (7-15 digits), and condition (1-200 characters) fields are non-empty before accepting the submission
6. IF any required form field fails validation, THEN THE Medical_Resource_Card SHALL display an inline error indication on the invalid field without clearing other filled fields

### Requirement 5: Daily Health Reminders

**User Story:** As a health-conscious user, I want daily reminders about water intake, vitamins, and health tips, so that I can maintain healthy habits.

#### Acceptance Criteria

1. THE Health_Reminders SHALL display a water intake progress bar using the design system ProgressBar component, showing the current intake value (in millilitres) as a percentage of a daily goal of 2000 ml, with a label in the format "{current} / {goal} ml"
2. THE Health_Reminders SHALL display between 1 and 10 vitamin/supplement reminder items, each showing the supplement name (maximum 50 characters) and a scheduled time in HH:mm 24-hour format
3. THE Health_Reminders SHALL display a health tips card containing one tip text (maximum 200 characters) that changes once per calendar day
4. THE Health_Reminders SHALL use var(--color-progress-bg) for the progress bar track background and var(--color-secondary) for the filled portion colour
5. IF the water intake value exceeds the daily goal, THEN THE Health_Reminders SHALL display the progress bar fill at 100% width and apply the over-limit visual style provided by the ProgressBar component

### Requirement 6: Prescription and Drug Identification

**User Story:** As a user managing medications, I want to upload prescriptions, get drug reminders, and look up medications by name or image, so that I can safely manage my medicines.

#### Acceptance Criteria

1. THE Prescription_Manager SHALL provide a photo upload interface that accepts camera capture or gallery selection for prescription images, limited to JPEG, PNG, or HEIC formats with a maximum file size of 10MB per image
2. THE Prescription_Manager SHALL display chronic disease medication reminders as a scrollable list, each item showing drug name, single-dose dosage (e.g., "500mg"), and schedule text (e.g., "每日 2 次，早晚飯後"), displaying up to 20 medication items
3. WHEN the user enters at least 1 character in the drug name lookup input field, THE Prescription_Manager SHALL display up to 10 matching results, each showing the drug name, dosage form, and a reference image for visual comparison
4. IF the uploaded prescription image cannot be processed within 10 seconds, THEN THE Prescription_Manager SHALL display an error message indicating processing failure and prompting the user to retake or re-upload the image
5. IF the drug name lookup returns no matching results, THEN THE Prescription_Manager SHALL display a placeholder message indicating no results were found for the entered keyword
6. THE Prescription_Manager SHALL adopt --radius-lg (16px) rounded corners, --shadow-card shadow, and --space-4 (16px) padding for all card containers, consistent with the Dashboard_Card visual style

### Requirement 7: Medicine Delivery System

**User Story:** As a user who needs medication delivered, I want to access an external delivery platform and track my order, so that I can receive medicine without visiting the pharmacy.

#### Acceptance Criteria

1. WHILE hasDeliveryOrder is false, THE Medicine_Delivery SHALL display an external logistics partner card with the title "合作外送藥局平台", a brief description of the delivery service, and a single call-to-action button labeled to open the external platform
2. WHEN the user taps the external platform call-to-action button, THE Medicine_Delivery SHALL open a modal overlay simulating the external delivery platform, displayed above the current content with a backdrop
3. WHILE hasDeliveryOrder is true, THE Medicine_Delivery SHALL display a multi-step progress tracker showing exactly 4 ordered stages (藥師調劑中 → 平台外送員接單 → 配送中 → 已送達), with the current stage visually highlighted, completed stages marked as done, and pending stages displayed in a muted/inactive style
4. WHILE hasDeliveryOrder is true, THE Medicine_Delivery SHALL display an estimated delivery time in the format "預計 N 分鐘送達" where N is a positive integer representing minutes remaining
5. WHEN the user confirms an order within the external platform modal, THE Medicine_Delivery SHALL set hasDeliveryOrder to true and close the modal, transitioning the UI from the partner card state to the delivery tracking state within 500 milliseconds

### Requirement 8: State Management

**User Story:** As a developer, I want clear reactive state variables controlling section behavior, so that the UI responds predictably to state changes.

#### Acceptance Criteria

1. THE Medical_Module SHALL declare a Vue ref named `isAiTriggered` (boolean, default false) and pass it as a prop to Medical_Resource_Card, which displays State A when the value is false and State B when the value is true
2. THE Medical_Module SHALL declare a Vue ref named `viewMode` (string literal union of "list" | "map", default "list") and pass it as a prop to Medical_Resource_Card, which shows list mode when the value is "list" and map mode when the value is "map"
3. THE Medical_Module SHALL declare a Vue ref named `hasDeliveryOrder` (boolean, default false) and pass it as a prop to Medicine_Delivery, which shows the external platform card when the value is false and the delivery tracking UI when the value is true
4. WHEN isAiTriggered changes value, THE Medical_Resource_Card SHALL update its rendered DOM to reflect the new state within the same Vue reactivity update cycle, without triggering a full page reload
5. WHEN viewMode changes value, THE Medical_Resource_Card SHALL update its rendered content to show the corresponding view mode within the same Vue reactivity update cycle, without triggering a full page reload

### Requirement 9: Internationalization and Language

**User Story:** As a Traditional Chinese speaking user, I want all UI text displayed in zh-TW, so that I can understand the interface without language barriers.

#### Acceptance Criteria

1. THE Medical_Module SHALL render all visible text labels, buttons, headings, placeholder text, and system-generated messages (including error prompts and empty-state descriptions) in Traditional Chinese (zh-TW), with no English-only labels remaining in the rendered output
2. THE Medical_Module SHALL set the HTML `lang` attribute to `zh-TW` on the page-level element (e.g., via Nuxt's `useHead` or `nuxt.config.ts` `app.head` configuration)
3. IF a component displays a fallback or error state (such as loading failures or missing data placeholders), THEN THE Medical_Module SHALL render the fallback text in Traditional Chinese (zh-TW)
4. THE Medical_Module SHALL exclude third-party embedded content (such as Google Maps labels or external widget text) from the zh-TW text requirement, as these are controlled by external services
