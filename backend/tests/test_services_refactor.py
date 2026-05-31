"""Unit tests for the extracted service modules (refactor regression suite)."""
import asyncio
import pytest

from services.credit_bureau import (
    get_credit_provider, MockCreditBureauProvider, CreditScoreReport,
)
from services.account_aggregator import (
    get_aa_provider, MockAAProvider, ConsentRequest,
)
from services.recommendation import calculate_approval_probability


# ---------------- Credit Bureau ----------------
def test_credit_provider_factory_returns_mock_by_default():
    p = get_credit_provider()
    assert isinstance(p, MockCreditBureauProvider)


def test_credit_mock_report_is_deterministic():
    p = MockCreditBureauProvider()
    r1 = asyncio.run(p.fetch_score("user_abc"))
    r2 = asyncio.run(p.fetch_score("user_abc"))
    assert r1.score == r2.score
    assert r1.bureau == "CIBIL"
    assert 300 <= r1.score <= 900
    assert r1.is_mock is True
    assert r1.band in ("Poor", "Fair", "Good", "Very Good", "Excellent")
    assert len(r1.recommendations) >= 1


# ---------------- Account Aggregator ----------------
def test_aa_full_flow_mock():
    p = MockAAProvider()
    req = ConsentRequest(user_id="user_xyz", fi_types=["DEPOSIT"])
    handle = asyncio.run(p.request_consent(req))
    assert handle.status == "PENDING"
    assert handle.consent_handle.startswith("chdl_")

    status = asyncio.run(p.get_consent_status(handle.consent_handle))
    assert status.status == "APPROVED"
    assert status.consent_id is not None

    fi = asyncio.run(p.fetch_financial_data(status.consent_id, "user_xyz"))
    assert fi.user_id == "user_xyz"
    assert fi.fi_data["summary"]["avg_monthly_balance"] > 0
    assert fi.is_mock is True


# ---------------- Recommendation engine ----------------
def test_approval_high_score_high_income_clean():
    profile = {"credit_score": 780, "monthly_income": 100000,
               "employment_type": "salaried", "existing_loans": False,
               "desired_amount": 500000, "state": "Karnataka", "city": "Bangalore"}
    product = {"bank_name": "HDFC Bank", "interest_rate": 10.5,
               "processing_fee_pct": 2.0, "min_income": 25000,
               "min_credit_score": 700, "max_amount": 4000000,
               "min_amount": 50000, "available_regions": ["pan_india"]}
    r = calculate_approval_probability(profile, product)
    assert 10 <= r["score"] <= 95
    assert r["score"] >= 80   # high score profile should get strong odds
    assert any("Excellent credit" in x for x in r["reasons"])


def test_approval_low_credit_high_emi_penalty():
    profile = {"credit_score": 600, "monthly_income": 25000,
               "existing_loans": True, "existing_loan_emi": 20000,
               "desired_amount": 500000}
    product = {"bank_name": "HDFC Bank", "interest_rate": 12,
               "processing_fee_pct": 2.5, "min_income": 25000,
               "min_credit_score": 700, "max_amount": 4000000}
    r = calculate_approval_probability(profile, product)
    assert r["score"] < 50  # heavily penalized
    assert any("Low credit" in x or "High existing EMI" in x for x in r["reasons"])


def test_approval_corporate_tieup_boost():
    profile = {"credit_score": 720, "monthly_income": 80000,
               "employer_type": "gcc", "employer_name": "Infosys",
               "existing_loans": False, "desired_amount": 500000}
    p_with_tieup = {"bank_name": "HDFC Bank", "interest_rate": 10.5,
                    "min_income": 25000, "min_credit_score": 700,
                    "max_amount": 4000000, "corporate_tieups": ["Infosys"]}
    p_without = {**p_with_tieup, "corporate_tieups": []}
    r1 = calculate_approval_probability(profile, p_with_tieup)
    r2 = calculate_approval_probability(profile, p_without)
    assert r1["score"] > r2["score"]
    assert any("Corporate tie-up" in x for x in r1["reasons"])


def test_approval_pscore_clamped_to_range():
    # Pathological inputs should still produce a sane score 10..95
    profile = {"credit_score": 850, "monthly_income": 1000000,
               "existing_loans": False, "desired_amount": 100000,
               "employer_type": "psu", "employer_name": "SAIL"}
    product = {"bank_name": "SBI", "interest_rate": 8.5,
               "processing_fee_pct": 0, "min_income": 0,
               "min_credit_score": 0, "max_amount": 5000000,
               "corporate_tieups": ["SAIL"]}
    r = calculate_approval_probability(profile, product)
    assert r["score"] <= 95
