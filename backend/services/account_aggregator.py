"""
Sahamati Account Aggregator (AA) Provider Adapter.

The Account Aggregator framework (RBI / ReBIT spec) lets users grant a Financial
Information User (FIU = Rinkosh) consent-based access to their bank statements,
GST, EPF, MF holdings, etc., via a Sahamati-licensed AA (Finvu, OneMoney, NESL,
CAMS, Anumati, Saafe).

The flow:
    1. FIU requests consent → AA returns a `consent_handle`
    2. User authenticates with AA via redirect / app handoff
    3. FIU polls consent status → on APPROVED, gets `consent_id` + `consent_artefact`
    4. FIU initiates FI Data Request with `consent_id`
    5. AA responds with `session_id`; FIU polls → fetches encrypted FI Data
    6. FIU decrypts via ECDH key-pair

This adapter abstracts that lifecycle behind a clean async interface so we can
ship UI today and swap to real FIU credentials later without code changes.

Switch providers via env var `AA_PROVIDER`:
    - `mock`     (default) — In-memory sandbox, returns synthetic statements.
    - `finvu`              — Finvu sandbox / prod (TODO: requires FIU registration).
    - `onemoney`           — OneMoney sandbox / prod (TODO).
    - `nesl`               — NESL Asset Data sandbox (TODO).
"""
from __future__ import annotations

import os
import uuid
import json
import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from typing import List, Optional

logger = logging.getLogger(__name__)

# Standard FI types supported by the AA framework
FI_TYPES = {
    "DEPOSIT": "Savings/Current bank account statements",
    "TERM_DEPOSIT": "Fixed deposits",
    "RECURRING_DEPOSIT": "Recurring deposits",
    "EQUITIES": "Equity holdings",
    "MUTUAL_FUNDS": "Mutual fund holdings",
    "GSTR1_3B": "GST returns (business loans)",
    "EPF": "EPF balance / contributions",
    "INSURANCE_POLICIES": "Insurance policy data",
    "NPS": "National Pension Scheme",
}


@dataclass
class ConsentRequest:
    user_id: str
    fi_types: List[str]                    # e.g. ["DEPOSIT", "EPF"]
    purpose_code: str = "101"              # 101 = Loan underwriting (per RBI spec)
    purpose_text: str = "Personal loan underwriting"
    valid_for_days: int = 90               # how long FIU can pull data
    fetch_history_months: int = 12         # how many months of data


@dataclass
class ConsentHandle:
    consent_handle: str                    # AA-issued handle
    user_id: str
    status: str                            # PENDING | APPROVED | REJECTED | EXPIRED
    redirect_url: str                      # where the user authenticates
    fi_types: List[str]
    purpose_code: str
    created_at: str
    expires_at: str
    provider: str
    consent_id: Optional[str] = None       # Populated after approval
    raw: Optional[dict] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FIDataPacket:
    consent_id: str
    session_id: str
    user_id: str
    fi_data: dict                          # Normalized financial summary
    fetched_at: str
    provider: str
    is_mock: bool
    raw: Optional[dict] = None

    def to_dict(self) -> dict:
        return asdict(self)


class AccountAggregatorProvider(ABC):
    """Abstract base — every AA adapter implements this interface."""

    name: str = "abstract"

    @abstractmethod
    async def request_consent(self, req: ConsentRequest) -> ConsentHandle:
        """Step 1: Initiate consent — returns a handle + redirect URL."""
        raise NotImplementedError

    @abstractmethod
    async def get_consent_status(self, consent_handle: str) -> ConsentHandle:
        """Step 2: Poll consent status; if APPROVED returns consent_id."""
        raise NotImplementedError

    @abstractmethod
    async def fetch_financial_data(self, consent_id: str,
                                   user_id: str) -> FIDataPacket:
        """Step 3: Fetch FI Data once consent is APPROVED."""
        raise NotImplementedError

    @abstractmethod
    async def revoke_consent(self, consent_id: str) -> dict:
        """Step 4: Revoke an active consent (user right under DPDP/AA spec)."""
        raise NotImplementedError


# ============================================================================
# Mock AA Provider — synthetic but realistic data shape
# ============================================================================
class MockAAProvider(AccountAggregatorProvider):
    """
    Local stub that mimics the Finvu / OneMoney happy path.

    State lives in-memory (process-local). For demos this is fine; for real
    development swap to FinvuSandboxProvider once `FINVU_FIU_ID` is set.
    """
    name = "mock"
    _store: dict = {}                      # consent_handle -> ConsentHandle dict

    async def request_consent(self, req: ConsentRequest) -> ConsentHandle:
        handle_id = f"chdl_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc)
        handle = ConsentHandle(
            consent_handle=handle_id,
            user_id=req.user_id,
            status="PENDING",
            redirect_url=f"https://anumati-mock.rinkosh.dev/auth?handle={handle_id}",
            fi_types=req.fi_types,
            purpose_code=req.purpose_code,
            created_at=now.isoformat(),
            expires_at=(now + timedelta(minutes=10)).isoformat(),
            provider=self.name,
        )
        self._store[handle_id] = handle.to_dict()
        return handle

    async def get_consent_status(self, consent_handle: str) -> ConsentHandle:
        data = self._store.get(consent_handle)
        if not data:
            raise ValueError(f"Unknown consent_handle: {consent_handle}")
        # Auto-approve mock consents (real flow waits for user auth)
        if data["status"] == "PENDING":
            data["status"] = "APPROVED"
            data["consent_id"] = f"cnst_{uuid.uuid4().hex[:16]}"
            self._store[consent_handle] = data
        return ConsentHandle(**data)

    async def fetch_financial_data(self, consent_id: str,
                                   user_id: str) -> FIDataPacket:
        # Deterministic synthetic data based on user_id
        seed = int(hashlib.sha256(user_id.encode()).hexdigest()[:6], 16)
        avg_balance = 50000 + (seed % 450000)        # ₹50K - ₹5L
        avg_inflow = 30000 + (seed % 170000)         # ₹30K - ₹2L/mo (likely salary)
        avg_outflow = int(avg_inflow * 0.7)
        bounce_count = seed % 3                      # 0-2 bounces in 12mo
        existing_emi = (seed % 4) * 5000             # ₹0 - ₹15K existing EMI

        fi_data = {
            "summary": {
                "avg_monthly_balance": avg_balance,
                "avg_monthly_inflow": avg_inflow,
                "avg_monthly_outflow": avg_outflow,
                "estimated_monthly_savings": avg_inflow - avg_outflow,
                "salary_credits_last_3mo": 3,
                "bounce_count_last_12mo": bounce_count,
                "existing_emi_outflow": existing_emi,
                "primary_bank": "HDFC Bank",
            },
            "accounts": [
                {
                    "bank": "HDFC Bank",
                    "account_type": "SAVINGS",
                    "masked_account_no": "XXXX1234",
                    "avg_balance_3mo": avg_balance,
                }
            ],
            "epf_balance": 50000 + (seed % 250000) if "EPF" in (consent_id or "") or True else 0,
        }
        return FIDataPacket(
            consent_id=consent_id,
            session_id=f"sess_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            fi_data=fi_data,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            provider=self.name,
            is_mock=True,
        )

    async def revoke_consent(self, consent_id: str) -> dict:
        # Mark every matching handle revoked
        revoked = 0
        for k, v in list(self._store.items()):
            if v.get("consent_id") == consent_id:
                v["status"] = "REVOKED"
                self._store[k] = v
                revoked += 1
        return {"consent_id": consent_id, "revoked": revoked, "provider": self.name}


# ============================================================================
# Live provider stubs — TODO: wire real APIs
# ============================================================================
class FinvuSandboxProvider(AccountAggregatorProvider):
    """
    TODO: Finvu (Cookiejar Tech) Sandbox AA integration.

    Activation steps:
      1. Register Rinkosh as an FIU on https://finvu.in/fiu-onboarding.
         (Requires GST cert, RBI category, board resolution, ECDH key-pair.)
      2. Obtain `FINVU_FIU_ID`, `FINVU_API_KEY`, `FINVU_PRIVATE_KEY` (X25519),
         set them in /app/backend/.env.
      3. Sandbox base URL: https://webvwdev.finvu.in/API
         Prod base URL:    https://webview.finvu.in/API
      4. Implement:
          - POST /Consent/init           → returns consent_handle
          - GET  /Consent/status/{h}     → poll until APPROVED
          - POST /FI/request             → returns session_id
          - GET  /FI/fetch/{session_id}  → returns ENCRYPTED FI data
          - ECDH-decrypt payload using Rinkosh FIU private key.
      5. Map response → ConsentHandle / FIDataPacket.

    Until then this raises so missing-config doesn't silently succeed in prod.
    """
    name = "finvu"

    def __init__(self):
        self.fiu_id = os.environ.get("FINVU_FIU_ID")
        self.api_key = os.environ.get("FINVU_API_KEY")
        self.base_url = os.environ.get(
            "FINVU_BASE_URL", "https://webvwdev.finvu.in/API"
        )
        if not (self.fiu_id and self.api_key):
            logger.warning(
                "FinvuSandboxProvider missing FINVU_FIU_ID / FINVU_API_KEY env vars — "
                "calls will fail. Set AA_PROVIDER=mock until creds are provisioned."
            )

    async def request_consent(self, req: ConsentRequest) -> ConsentHandle:
        raise NotImplementedError(
            "Finvu live call not implemented — see docstring for activation steps."
        )

    async def get_consent_status(self, consent_handle: str) -> ConsentHandle:
        raise NotImplementedError

    async def fetch_financial_data(self, consent_id: str,
                                   user_id: str) -> FIDataPacket:
        raise NotImplementedError

    async def revoke_consent(self, consent_id: str) -> dict:
        raise NotImplementedError


# ============================================================================
# Factory
# ============================================================================
_PROVIDER_REGISTRY = {
    "mock": MockAAProvider,
    "finvu": FinvuSandboxProvider,
}


def get_aa_provider() -> AccountAggregatorProvider:
    """Return the configured AA provider. Falls back to mock if unset/unknown."""
    name = os.environ.get("AA_PROVIDER", "mock").lower()
    cls = _PROVIDER_REGISTRY.get(name, MockAAProvider)
    if name not in _PROVIDER_REGISTRY:
        logger.warning("Unknown AA_PROVIDER=%s, falling back to mock", name)
    return cls()
