# Save and Submit Rules

## SAVE Behavior

| Action | What happens |
|--------|-------------|
| **R1, R2, T1** | Saves immediately — no validation |
| **C1** | Checks confirmation eligibility only (Row 12/13). If user selected "Confirmation" with bad ratings → blocked. Otherwise saves |

## SUBMIT Behavior

| Action | What happens |
|--------|-------------|
| **R1, R2, T1** | Only checks Effective Date. If missing → blocked. Otherwise submits |
| **C1** | Step 1: Checks all mandatory fields (5 ratings, comment, probation status, effective date). If any missing → blocked. Step 2: Checks confirmation eligibility (Row 12/13). If bad ratings + Confirmation → blocked. Otherwise submits |

## Confirmation Eligibility Logic (C1 only — applies on both Save and Submit)

| Scenario | Confirmation | Extension of Probation |
|----------|-------------|----------------------|
| Any rating = BELOW EXPECTATIONS | Blocked | Allowed |
| More than 1 rating = SATISFACTORY | Blocked | Allowed |
| All ratings GOOD or above | Allowed | Allowed |

**Blocked message:** *"You cannot recommend confirmation with this set of ratings"*
