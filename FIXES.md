# Fixes Applied — InitialScreen.controller.js

All changes are in `webapp/controller/InitialScreen.controller.js`.

---

## Fix 1: Employee Search Field — Slow Response Time (HRBP Action Tab)

**Issue:** When typing in the Employee field on the HRBP Action tab, every keystroke after 3 characters fired a separate OData `read("/EmpIdDropDown")` call. Typing "samrat" sent 4 back-to-back requests ("sam", "samr", "samra", "samrat"), causing multiple `$batch` calls to pile up in the network. Additionally, a `new JSONModel()` was created on every response, triggering full re-binding and re-render of the suggestion list each time. There was also a race condition where a slow earlier request could overwrite a faster later response.

**Code Problem:**
- `onEmployeeLiveSearch` (line 1639) called `_callEmployeeSearch` directly on every `liveChange` event — no debounce.
- `_callEmployeeSearch` (line 1674) created `new sap.ui.model.json.JSONModel()` on every success callback instead of reusing the existing model.
- No mechanism to discard stale responses.

**Changes Made:**
- **Added 400ms debounce** in `onEmployeeLiveSearch` — uses `setTimeout`/`clearTimeout` so only the last keystroke triggers the OData call after the user stops typing.
- **Reuse existing JSONModel** — `_callEmployeeSearch` success callback now checks if `employeeModelId` model exists and calls `setProperty("/AllEmployees", ...)` to update data in-place. Only creates a new model on the very first call.
- **Added sequence counter** (`_employeeSearchSeq`) — incremented on each call; stale responses (where the sequence number doesn't match the latest) are silently discarded.

---

## Fix 2: Employee & Effective Date Fields Stay Disabled on HRBP Tab Switch

**Issue:** After navigating from Track List to view a record, the Employee input (`empItems`) and Effective Date (`datePickerHR`) fields were explicitly disabled via `setEnabled(false)`. When the user then switched to the HRBP Action tab to create a new request, these fields remained disabled because `_clearEmployeeSection` only cleared values and value states — it never re-enabled the controls.

**Code Problem:**
- `onRequestPress` success handler (lines 605-606) called `oView.byId("empItems").setEnabled(false)` and `oView.byId("datePickerHR").setEnabled(false)`.
- `_clearEmployeeSection` (line 1789) cleared `setValue("")` and `setValueState("None")` but never called `setEnabled(true)`.

**Changes Made:**
- Added `oEmpInput.setEnabled(true)` and `oDatePicker.setEnabled(true)` in `_clearEmployeeSection` so the fields are re-enabled every time the section is cleared (on tab switch).

---

## Fix 3: New Assignment Fields Empty When Opening Draft from Track List

**Issue:** When a user saved a Re-Designation (or Transfer) request as Draft and later opened it from the Track List, the "New Assignment" section fields — New Designation, New RM, and Matrix Manager — were always empty, even though the data was correctly saved on the server.

**Code Problem (two causes):**

1. **Missing `empModel`:** The ReDesignation fragment (`ReDesignation.fragment.xml`) binds New Designation to `{empModel>/NewDesignation}` and Matrix Manager checkbox to `{empModel>/MatrixManagerSelected}`. But `empModel` was **never created or populated** anywhere in the controller. The server response data (`oSrvData.NewDesignation`, `oSrvData.NewMatrixManagerId`) was available but not mapped to this model.

2. **Async fragment timing:** The old code (lines 663-680, commented out) tried to set values on `newRMItems`, `newDesignation`, and `matrxMngrEmpId` controls immediately after calling `_updateFragment()`. But `_updateFragment` uses `Fragment.load()` which is asynchronous — the controls didn't exist in the DOM yet when `setValue()` was called, so `byId()` returned `null`.

**Changes Made:**

- **Created `empModel`** in the `onRequestPress` success handler (lines 599-608): initializes a new `JSONModel` with `NewDesignation` and `MatrixManagerSelected` from the server response. This feeds the fragment's data bindings.

- **Stored server data for deferred use** (`this._pendingSrvData = oSrvData` at line 609): holds the full server response so the fragment can access it after loading.

- **Made `_updateFragment` return its Promise** (line 266): changed `sap.ui.core.Fragment.load(...)` to `return sap.ui.core.Fragment.load(...)`.

- **Populated fields inside `.then()` callback** (lines 275-294): after the fragment is loaded and added to the container, the code now:
  - Sets `newRMItems` value to `"Name - ID"` from `oSrvData.NewRm1Name` / `oSrvData.NewRm1Id`
  - Sets `newDesignation` value from `oSrvData.NewDesignation`
  - Sets `matrxMngrEmpId` value and shows the Matrix Manager form (`MatrxMngEmpId`) if `oSrvData.NewMatrixManagerId` is present
  - Clears `_pendingSrvData` after use

- **Removed dead commented-out code** (old lines 663-680): deleted the two duplicate blocks of commented-out `setValue`/`setEnabled` calls that could never work due to the async timing issue.
