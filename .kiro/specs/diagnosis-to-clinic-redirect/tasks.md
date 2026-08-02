# Implementation Plan: Diagnosis to Clinic Redirect

## Overview

Pure frontend refactor that removes the internal booking flow from DiagnosisFlow.vue and replaces it with a `go-to-clinic` emit event. The parent MedicalPage handles tab switching, department filtering, and displays an AI recommend badge. Two files modified, no new components or backend changes.

## Tasks

- [x] 1. Refactor DiagnosisFlow.vue — remove booking flow and add emit
  - [x] 1.1 Remove booking/confirm/success steps from DiagnosisFlow.vue
    - Remove `'booking' | 'confirm' | 'success'` from `FlowStep` type
    - Remove `ClinicInfo` and `AppointmentPayload` type imports from `useDiagnosis`
    - Remove all booking-related refs: `selectedClinic`, `selectedSlot`, `visitType`, `patientName`, `patientPhone`, `nationalId`, `appointmentNumber`
    - Remove functions: `startBooking()`, `selectClinic()`, `proceedToConfirm()`, `confirmAppointment()`, `maskNationalId()`
    - Remove unused destructured values from `useDiagnosis()` call (`clinics`, `latestAppointment`, `submitting`, `fetchClinics`, `submitAppointment`, `fetchLatestAppointment`)
    - Remove `onMounted(() => { fetchLatestAppointment() })`
    - Remove all template blocks for steps: booking, confirm, success
    - Remove associated scoped styles for booking/confirm/success elements
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Add `go-to-clinic` emit and handler to DiagnosisFlow.vue
    - Add `defineEmits<{ 'go-to-clinic': [department: string] }>()` declaration
    - Create `handleGoToClinic()` function that emits `'go-to-clinic'` with `diagnosisResult.value.department` when `diagnosisResult.value` exists
    - Change the existing booking button (`dx-book-btn`) to call `handleGoToClinic()` instead of `startBooking()`
    - _Requirements: 2.1, 2.2_

- [x] 2. Checkpoint - Verify DiagnosisFlow changes compile
  - Ensure no TypeScript errors in DiagnosisFlow.vue, ask the user if questions arise.

- [x] 3. Update medical/index.vue — handle event, add AI badge, update pill logic
  - [x] 3.1 Add AI recommend state and update goToClinicTab handler
    - Add `aiRecommendDept` ref (`ref<string | null>(null)`)
    - Add `showAiRecommendBadge` ref (`ref(false)`)
    - Modify existing `goToClinicTab()` to accept a `department: string` parameter
    - Inside `goToClinicTab`: set `activeTab` to `'clinic'`, `currentAppointmentView` to `'list'`, `selectedDept` to department, `aiRecommendDept` to department, `showAiRecommendBadge` to `true`, and call `searchNearby(department)`
    - Remove the old `recommendedDept` ref and associated unused code (`symptomText`, `isAnalyzing`, `analysisComplete`, `appendSymptom`, `startAnalysis`, `symptomPills` in the page — these are handled by DiagnosisFlow)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Add event listener and AI recommend badge template
    - Add `@go-to-clinic="goToClinicTab"` to the `<DiagnosisFlow />` component in the template
    - Add `dismissAiRecommendBadge()` function that sets `showAiRecommendBadge` to `false` and `aiRecommendDept` to `null`
    - Add AI recommend badge markup inside the clinic tab section, above the dept-pill-bar: a `<div>` with `v-if="showAiRecommendBadge && aiRecommendDept"` showing the text「🤖 AI 建議科別：{aiRecommendDept}」with a close button that calls `dismissAiRecommendBadge()`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.3 Update pill bar selection logic to dismiss AI badge
    - Create a `selectDept(dept: string)` function that sets `selectedDept` to `dept` and hides the AI badge when `dept !== aiRecommendDept.value`
    - Replace the inline `@click="selectedDept = dept"` on pill buttons with `@click="selectDept(dept)"`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.4 Add AI recommend badge styles
    - Add `.ai-recommend-badge` scoped styles matching the design spec (gradient background, border, rounded, flex layout with close button)
    - _Requirements: 4.1_

- [x] 4. Final checkpoint - Verify full integration
  - Ensure no TypeScript errors across both files, ask the user if questions arise.

- [ ]* 5. Write property-based tests
  - [ ]* 5.1 Write property test for emit payload correctness
    - **Property 1: Emit payload matches diagnosisResult.department**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 5.2 Write property test for event handler state changes
    - **Property 2: Event handler sets correct tab and department state**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 5.3 Write property test for AI badge text format
    - **Property 3: AI badge text format**
    - **Validates: Requirements 4.1**

  - [ ]* 5.4 Write property test for pill bar active state
    - **Property 4: Pill bar active state reflects selectedDept**
    - **Validates: Requirements 4.4, 5.1**

  - [ ]* 5.5 Write property test for manual pill selection dismissing badge
    - **Property 5: Manual pill selection dismisses AI badge**
    - **Validates: Requirements 5.2, 5.3**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- This is a pure frontend refactor — no backend changes required
- Only two files are modified: `frontend/app/components/medical/DiagnosisFlow.vue` and `frontend/app/pages/medical/index.vue`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] }
  ]
}
```
