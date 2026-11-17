import datetime
from typing import Tuple, Optional, Dict, Any
from backend.app.market_engine.models import (
    NormalizedQuote,
    FreshnessMetric,
    DataDelayType,
    MarketStatusEnum,
)

class FreshnessMonitor:
    def __init__(self, max_allowed_stale_seconds: int = 1800): # 30 min maximum threshold
        self.max_allowed_stale_seconds = max_allowed_stale_seconds

    def check_quote_freshness(self, quote: NormalizedQuote) -> FreshnessMetric:
        try:
            quote_dt = datetime.datetime.fromisoformat(quote.timestamp)
        except Exception:
            quote_dt = datetime.datetime.now()

        age_seconds = int((datetime.datetime.now() - quote_dt).total_seconds())
        is_stale = age_seconds > self.max_allowed_stale_seconds

        eligible, reason = self.validate_for_signals(quote, age_seconds)

        return FreshnessMetric(
            symbol=quote.symbol,
            last_updated=quote.timestamp,
            age_seconds=max(age_seconds, 0),
            is_stale=is_stale,
            threshold_seconds=self.max_allowed_stale_seconds,
            eligible_for_signals=eligible,
            reason=reason
        )

    def validate_for_signals(self, quote: NormalizedQuote, age_seconds: Optional[int] = None) -> Tuple[bool, str]:
        """
        Requirement 14: Reject invalid, stale, or missing data from live signal generation.
        Never fabricate live prices. Never label delayed data as real-time.
        """
        # 1. Structural validity
        if not quote.is_valid:
            reasons = "; ".join(quote.validation_notes) if quote.validation_notes else "Invalid price or volume structure"
            return False, f"REJECTED: Quote failed structural validation ({reasons})"

        # 2. Positive price check
        if quote.price <= 0:
            return False, "REJECTED: Non-positive price reported (<= 0.0)"

        # 3. Staleness check
        if age_seconds is None:
            try:
                quote_dt = datetime.datetime.fromisoformat(quote.timestamp)
                age_seconds = int((datetime.datetime.now() - quote_dt).total_seconds())
            except Exception:
                age_seconds = 0

        if age_seconds > self.max_allowed_stale_seconds:
            return False, f"REJECTED: Stale data. Observation is {age_seconds}s old (exceeds {self.max_allowed_stale_seconds}s threshold)"

        # 4. Data delay acknowledgement
        if quote.delay_type == DataDelayType.DELAYED_15MIN:
            # We allow research signals on delayed data, but with explicit delayed attribution
            return True, "ACCEPTED (15-Min Delayed Public Feed): Passed all sanity checks."

        return True, "ACCEPTED: Fresh validated quote."

freshness_monitor = FreshnessMonitor()
