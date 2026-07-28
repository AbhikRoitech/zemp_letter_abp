# Fixes Applied

Files changed: `webapp/controller/InitialScreen.controller.js`, `webapp/view/InitialScreen.view.xml`

---

## Fix 1: Employee Search — Slow Response & Field State (HRBP Action Tab)

**Issue:** Every keystroke in the Employee field fired a separate OData call, creating network pile-up. A new JSONModel was created on each response, causing re-renders. Stale responses could overwrite newer ones. Additionally, Employee and Effective Date fields were always enabled (even before Request selection), and the Employee Details fragment appeared immediately on Request selection instead of after filling all fields.

**Changes:**
- Added 400ms debounce + sequence counter to discard stale responses in `onEmployeeLiveSearch` / `_callEmployeeSearch`.
- Reuse existing JSONModel instead of creating new one on each response.
- Switched view from `liveChange` to `suggest` event with `startSuggestion="3"` and `filterSuggests="false"`.
- Added `enabled="{stateModel>/empFieldEnabled}"` to Employee Input and DatePicker — disabled by default, enabled on Request selection.
- New `_loadEmployeeDropdown` method pre-fetches employees on Request selection.
- Removed `_updateFragment()` from `onActionChange` HR block — fragment now loads only via `handleDateChange` (after Employee + Date are filled).

---

## Fix 2: Employee & Effective Date Stay Disabled After Viewing Record

**Issue:** After viewing a Track List record (which disables fields via `setEnabled(false)`), switching to HRBP Action tab kept fields disabled because `_clearEmployeeSection` never re-enabled them.

**Changes:**
- Added `setEnabled(true)` for `empItems` and `datePickerHR` in `_clearEmployeeSection`.

---

## Fix 3: New Assignment Fields Empty When Opening Draft

**Issue:** Opening a saved draft from Track List showed empty New Designation, New RM, and Matrix Manager fields despite data existing on the server.

**Root Cause:** (1) `empModel` was missing `NewDesignation` and `MatrixManagerSelected` properties that the fragment binds to. (2) Field values were set immediately after `_updateFragment()`, but `Fragment.load()` is async — controls didn't exist yet.

**Changes:**
- Added `NewDesignation` and `MatrixManagerSelected` to `oEmpModel.setData()` in `onRequestPress`.
- Made `_updateFragment` return its Promise (`return sap.ui.core.Fragment.load(...)`).
- Populate New Designation, New RM, and Matrix Manager fields inside `.then()` callback after fragment loads.

---

## Fix 4: HRBP Form Not Reset When Switching Tabs

**Issue:** Navigating away from HRBP Action tab left stale data (Employee, Date, Request, fragment) on screen. Returning showed previous request's data instead of a clean form.

**Root Cause:** `this.sSelectedTab` was overwritten to the new tab before cleanup ran, so the `if (sSelectedTab === "HR")` guard in `onBackPress` never matched. Also, `onBackPress` HR block cleared `fragmentContainerEMP` instead of `fragmentContainerHR` (copy-paste bug).

**Changes:**
- Capture `sPreviousTab` before overwriting `sSelectedTab` in `onRoleTabSelect`.
- Added full HR cleanup when leaving the tab: clear fields, disable Employee/Date, reset Request ComboBox, destroy fragment, clear all models.
- Fixed container ID from `fragmentContainerEMP` to `fragmentContainerHR` in `onBackPress`.

---

## Fix 5: Matrix Manager Checkbox Not Checked When Opening Draft

**Issue:** Opening a draft with a Matrix Manager showed the Emp ID value but the checkbox remained unchecked.

**Root Cause:** The `.then()` callback used `byId("matrixManagerCheckbox")` but the checkbox has no `id` in the XML. The `MatrxMngEmpId` form visibility is only toggled by `onMatrixCheck`, not by the model binding alone.

**Changes:**
- Replaced broken `byId` call with `that.onMatrixCheck(true)` — checks the checkbox and makes the Matrix Manager form visible.
- Matrix Manager Emp ID input is then populated with the server value.

---

## Fix 6: Fragment Intermittently Missing When Opening Draft

**Issue:** Clicking a request in Track List sometimes showed only Request/Employee/Date fields — the Employee Details / New Assignment section was blank.

**Root Cause:** `_updateFragment()` was called before `oTabBar.setSelectedKey(sRole)` switched the tab. The HR container wasn't rendered yet (UI5 lazy-renders inactive tabs), so `byId("fragmentContainerHR")` returned `null` and the function exited silently.

**Changes:**
- Moved `oTabBar.setSelectedKey(sRole)` and `that.sSelectedTab = sRole` **before** `_updateFragment()` so the container exists when the fragment loads.
