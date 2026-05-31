"""
Loan recommendation scoring engine.

`calculate_approval_probability` is the heuristic that decides how likely a
given user is to be approved for a given bank product. It weighs credit
score, income vs minimum, existing EMI burden, requested amount, product
rate / fee, bank profile (PSU vs private), corporate tie-ups and region.

Pure function — no DB / IO. Easy to unit test.

Returns dict: {"score": int (10-95), "reasons": list[str] (top 4)}
"""
from __future__ import annotations

PUBLIC_SECTOR_BANKS = {
    "SBI", "PNB", "Bank of Baroda", "Canara Bank", "Union Bank", "LIC Housing",
}

GOVT_EMPLOYER_TYPES = {"psu", "govt", "defence"}


def _credit_score_signal(profile: dict, product: dict) -> tuple[int, list]:
    """Returns (delta, reasons) for credit-score related scoring."""
    if not profile.get("credit_score"):
        return 0, ["Credit score not provided"]

    cs = profile["credit_score"]
    min_cs = product.get("min_credit_score", 0)
    delta = 0
    reasons = []
    if cs >= 750:
        delta += 30
        reasons.append("Excellent credit score")
    elif cs >= 700:
        delta += 20
        reasons.append("Good credit score")
    elif cs >= 650:
        delta += 10
        reasons.append("Fair credit score")
    else:
        delta -= 10
        reasons.append("Low credit score - may affect approval")

    if min_cs > 0 and cs < min_cs:
        delta -= 15
        reasons.append(f"Bank requires min {min_cs} CIBIL")
    return delta, reasons


def _income_signal(profile: dict, product: dict) -> tuple[int, list]:
    income = profile.get("monthly_income")
    min_income = product.get("min_income") or 0

    if income and min_income > 0:
        ratio = income / min_income
        if ratio >= 3:
            return 15, ["Income well above requirement"]
        if ratio >= 2:
            return 12, ["Strong income-to-requirement ratio"]
        if ratio >= 1.5:
            return 8, ["Income meets requirement comfortably"]
        if ratio >= 1:
            return 3, ["Income just meets minimum"]
        return -20, [f"Income below bank's min Rs.{min_income:,}"]
    if min_income == 0:
        return 5, ["No income requirement for this product"]
    return 0, []


def _existing_loan_signal(profile: dict) -> tuple[int, list]:
    if not profile.get("existing_loans"):
        return 5, ["No existing loans - clean slate"]
    emi = profile.get("existing_loan_emi")
    income = profile.get("monthly_income")
    if emi and income and income > 0:
        ratio = emi / income
        if ratio > 0.5:
            return -18, ["High existing EMI burden (>50% income)"]
        if ratio > 0.3:
            return -8, ["Moderate existing EMI load"]
        return -3, ["Low existing EMI - manageable"]
    return -10, ["Existing loans may reduce eligibility"]


def _amount_signal(profile: dict, product: dict) -> tuple[int, list]:
    desired = profile.get("desired_amount", 0)
    max_amt = product.get("max_amount", 0)
    min_amt = product.get("min_amount", 0)
    delta = 0
    reasons = []
    if desired and max_amt:
        if desired > max_amt:
            delta -= 15
            reasons.append(f"Amount exceeds bank's max Rs.{max_amt:,}")
        elif desired > max_amt * 0.8:
            delta -= 5
            reasons.append("Requesting near maximum limit")
    if desired and min_amt and desired < min_amt:
        delta -= 5
        reasons.append(f"Amount below bank's minimum Rs.{min_amt:,}")
    return delta, reasons


def _product_attribute_signal(product: dict) -> tuple[int, list]:
    delta = 0
    reasons = []
    rate = product.get("interest_rate", 0)
    if rate <= 9:
        delta -= 3
        reasons.append("Premium product - stricter criteria")
    elif rate >= 12:
        delta += 4
        reasons.append("Easier approval - higher rate product")

    fee = product.get("processing_fee_pct", 0)
    if fee == 0:
        delta += 3
        reasons.append("Zero processing fee product")
    elif fee >= 2:
        delta -= 2

    if product.get("bank_name") in PUBLIC_SECTOR_BANKS:
        delta += 4
        reasons.append("Public sector bank - broader eligibility")
    return delta, reasons


def _corporate_tieup_signal(profile: dict, product: dict) -> tuple[int, list]:
    employer_type = (profile.get("employer_type") or "").lower()
    employer_name = (profile.get("employer_name") or "").upper()
    tieups = product.get("corporate_tieups") or []
    if not tieups:
        return 0, []
    for t in tieups:
        t_upper = t.upper()
        if (t_upper == employer_type.upper() or
                t_upper in employer_name or
                employer_name in t_upper):
            return 12, ["Corporate tie-up - preferential rates"]
    if employer_type in GOVT_EMPLOYER_TYPES:
        return 6, ["Govt/PSU employee - favorable terms"]
    return 0, []


def _region_signal(profile: dict, product: dict) -> tuple[int, list]:
    regions = product.get("available_regions") or []
    user_state = (profile.get("state") or "").lower()
    user_city = (profile.get("city") or "").lower()
    if not regions or not user_state:
        return 0, []
    for r in regions:
        r_lower = r.lower()
        if (r_lower == "pan_india"
                or r_lower in user_state or r_lower in user_city
                or user_state in r_lower or user_city in r_lower):
            return 0, []   # match → no penalty
    return -8, ["Limited availability in your region"]


def calculate_approval_probability(profile: dict, product: dict) -> dict:
    """Compose all signal contributions into a final approval probability."""
    score = 50
    reasons: list[str] = []

    for fn in (_credit_score_signal,):
        d, r = fn(profile, product)
        score += d
        reasons += r
    for fn in (_income_signal, _amount_signal, _corporate_tieup_signal, _region_signal):
        d, r = fn(profile, product)
        score += d
        reasons += r
    d, r = _existing_loan_signal(profile)
    score += d
    reasons += r
    d, r = _product_attribute_signal(product)
    score += d
    reasons += r

    final_score = max(10, min(95, score))
    return {"score": final_score, "reasons": reasons[:4]}
