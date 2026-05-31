"""
Credit Bureau Provider Adapter (CIBIL / Experian / Equifax / Aggregator).

This module exposes a single `get_credit_provider()` factory that returns an
implementation of `CreditBureauProvider` based on the `CREDIT_BUREAU_PROVIDER`
env var.

Currently supported providers:
- `mock`     : Deterministic mock used for local dev / demo (default).
- `cibil`    : Direct CIBIL API integration (TODO — requires commercial agreement).
- `experian` : Experian Consumer API (TODO — requires commercial agreement).
- `decentro` : Decentro Credit Score Aggregator API (TODO — easier onboarding).
- `cashfree` : Cashfree Credit Score API (TODO — easier onboarding).

Switching providers is a single env-var change once production credentials
are obtained. The dashboard UX is preserved across providers.
"""
from __future__ import annotations

import os
import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class CreditScoreReport:
    """Normalized credit bureau response — same shape regardless of provider."""
    user_id: str
    score: int                          # 300-900
    bureau: str                         # "CIBIL" | "Experian" | "Equifax"
    band: str                           # "Poor" | "Fair" | "Good" | "Very Good" | "Excellent"
    on_time_payments_pct: float         # 0-100
    credit_utilization_pct: float       # 0-100
    open_accounts: int
    hard_enquiries_last_6mo: int
    months_of_history: int
    delinquencies: int
    recommendations: list               # list[str] - actionable tips
    fetched_at: str                     # ISO timestamp
    provider: str                       # which adapter generated it
    is_mock: bool                       # True if synthetic
    raw: Optional[dict] = None          # Raw provider payload for audit

    def to_dict(self) -> dict:
        return asdict(self)


class CreditBureauProvider(ABC):
    """Abstract interface every credit bureau adapter must implement."""

    name: str = "abstract"

    @abstractmethod
    async def fetch_score(self, user_id: str, pan: Optional[str] = None,
                          phone: Optional[str] = None,
                          full_name: Optional[str] = None,
                          dob: Optional[str] = None) -> CreditScoreReport:
        """Return a normalized CreditScoreReport for the given identity."""
        raise NotImplementedError


# ============================================================================
# Mock Provider — used until live API keys are wired
# ============================================================================
def _score_band(score: int) -> str:
    if score >= 800:
        return "Excellent"
    if score >= 750:
        return "Very Good"
    if score >= 700:
        return "Good"
    if score >= 650:
        return "Fair"
    return "Poor"


def _recos(score: int, util: float, enquiries: int) -> list:
    tips = []
    if score < 700:
        tips.append("Pay every EMI and credit-card bill in full and on time for the next 6 months.")
    if util > 30:
        tips.append("Bring your credit-card utilization below 30% to lift your score by 20-40 points.")
    if enquiries >= 3:
        tips.append("Avoid new loan applications for 6 months — too many enquiries hurt your score.")
    if score >= 750:
        tips.append("You're in the top band. You qualify for the lowest interest rates available.")
    if not tips:
        tips.append("Maintain your current habits — your score is healthy.")
    return tips


class MockCreditBureauProvider(CreditBureauProvider):
    """
    Deterministic mock — same user_id always returns same score.
    Useful for demos and integration tests. Replace with real provider in prod.
    """
    name = "mock"

    async def fetch_score(self, user_id: str, pan: Optional[str] = None,
                          phone: Optional[str] = None,
                          full_name: Optional[str] = None,
                          dob: Optional[str] = None) -> CreditScoreReport:
        seed = hashlib.sha256(user_id.encode()).hexdigest()
        n = int(seed[:6], 16)

        # Generate plausible-looking but deterministic numbers
        score = 600 + (n % 280)               # 600-879
        util = round((n % 60) + 5, 1)         # 5-65%
        on_time = round(80 + (n % 20), 1)     # 80-100%
        open_accts = 2 + (n % 6)              # 2-7
        enquiries = n % 4                     # 0-3
        months = 24 + (n % 96)                # 24-120 months
        delinq = 0 if score > 720 else (n % 3)

        report = CreditScoreReport(
            user_id=user_id,
            score=score,
            bureau="CIBIL",
            band=_score_band(score),
            on_time_payments_pct=on_time,
            credit_utilization_pct=util,
            open_accounts=open_accts,
            hard_enquiries_last_6mo=enquiries,
            months_of_history=months,
            delinquencies=delinq,
            recommendations=_recos(score, util, enquiries),
            fetched_at=datetime.now(timezone.utc).isoformat(),
            provider=self.name,
            is_mock=True,
            raw=None,
        )
        return report


# ============================================================================
# Live provider stubs — TODO: wire real APIs when commercial keys are obtained
# ============================================================================
class CibilProvider(CreditBureauProvider):
    """
    TODO: Direct CIBIL Bureau API integration.

    To activate:
    1. Sign commercial contract with TransUnion CIBIL (~₹X lakhs onboarding).
    2. Receive `CIBIL_API_KEY`, `CIBIL_MEMBER_REF_NO`, `CIBIL_USER_ID`, password.
    3. Implement OAuth2 + signed SOAP/REST envelope per CIBIL Bureau Web Service spec.
    4. Map response to CreditScoreReport.

    Until then this raises so we fail fast in prod with a clear message.
    """
    name = "cibil"

    async def fetch_score(self, user_id: str, pan: Optional[str] = None,
                          phone: Optional[str] = None,
                          full_name: Optional[str] = None,
                          dob: Optional[str] = None) -> CreditScoreReport:
        raise NotImplementedError(
            "CIBIL live integration not configured. Set CREDIT_BUREAU_PROVIDER=mock "
            "or complete CIBIL commercial onboarding and implement this adapter."
        )


class ExperianProvider(CreditBureauProvider):
    """TODO: Experian Consumer API integration. See Experian developer portal."""
    name = "experian"

    async def fetch_score(self, user_id: str, pan: Optional[str] = None,
                          phone: Optional[str] = None,
                          full_name: Optional[str] = None,
                          dob: Optional[str] = None) -> CreditScoreReport:
        raise NotImplementedError(
            "Experian live integration not configured. Provision EXPERIAN_API_KEY first."
        )


class DecentroProvider(CreditBureauProvider):
    """TODO: Decentro Credit Score Aggregator — simpler onboarding than direct bureau."""
    name = "decentro"

    async def fetch_score(self, user_id: str, pan: Optional[str] = None,
                          phone: Optional[str] = None,
                          full_name: Optional[str] = None,
                          dob: Optional[str] = None) -> CreditScoreReport:
        raise NotImplementedError(
            "Decentro integration not configured. Sign up at decentro.tech, then set "
            "DECENTRO_CLIENT_ID / DECENTRO_CLIENT_SECRET and implement POST "
            "https://in.decentro.tech/v2/financial_services/credit/cibil_score."
        )


# ============================================================================
# Factory
# ============================================================================
_PROVIDER_REGISTRY = {
    "mock": MockCreditBureauProvider,
    "cibil": CibilProvider,
    "experian": ExperianProvider,
    "decentro": DecentroProvider,
}


def get_credit_provider() -> CreditBureauProvider:
    """Return the configured CreditBureauProvider. Falls back to mock if unset."""
    name = os.environ.get("CREDIT_BUREAU_PROVIDER", "mock").lower()
    cls = _PROVIDER_REGISTRY.get(name, MockCreditBureauProvider)
    if name not in _PROVIDER_REGISTRY:
        logger.warning("Unknown CREDIT_BUREAU_PROVIDER=%s, falling back to mock", name)
    return cls()
