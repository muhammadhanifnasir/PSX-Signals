import random
import datetime
from typing import List, Dict, Any
from backend.app.models.market import MarketStatusResponse, MarketBreadth, MarketMover, MarketMoversResponse
from backend.app.models.signal import Signal, SignalOverviewResponse
from backend.app.models.scanner import ScannerItem, ScannerResponse, OpportunityItem, OpportunitiesResponse
from backend.app.models.stock import Candle, TechnicalIndicators, StockDetail

PSX_STOCKS = [
    {"symbol": "OGDC", "name": "Oil & Gas Development Co", "sector": "Oil & Gas Exploration", "base_price": 164.50, "high_52": 182.00, "low_52": 110.00, "pe": 4.8, "div": 11.2},
    {"symbol": "PPL", "name": "Pakistan Petroleum Limited", "sector": "Oil & Gas Exploration", "base_price": 132.80, "high_52": 148.50, "low_52": 85.00, "pe": 4.2, "div": 9.5},
    {"symbol": "HUBC", "name": "Hub Power Company Limited", "sector": "Power Generation", "base_price": 138.20, "high_52": 155.00, "low_52": 95.00, "pe": 4.9, "div": 14.5},
    {"symbol": "ENGRO", "name": "Engro Corporation", "sector": "Fertilizer / Conglomerate", "base_price": 348.60, "high_52": 390.00, "low_52": 260.00, "pe": 6.5, "div": 8.5},
    {"symbol": "LUCK", "name": "Lucky Cement Limited", "sector": "Cement", "base_price": 945.00, "high_52": 1020.00, "low_52": 680.00, "pe": 7.8, "div": 4.2},
    {"symbol": "MCB", "name": "MCB Bank Limited", "sector": "Commercial Banks", "base_price": 242.30, "high_52": 265.00, "low_52": 160.00, "pe": 3.9, "div": 12.8},
    {"symbol": "UBL", "name": "United Bank Limited", "sector": "Commercial Banks", "base_price": 288.75, "high_52": 310.00, "low_52": 175.00, "pe": 4.1, "div": 13.5},
    {"symbol": "MEBL", "name": "Meezan Bank Limited", "sector": "Islamic Banking", "base_price": 235.10, "high_52": 255.00, "low_52": 145.00, "pe": 5.2, "div": 10.5},
    {"symbol": "PSO", "name": "Pakistan State Oil", "sector": "Oil & Gas Marketing", "base_price": 192.40, "high_52": 215.00, "low_52": 135.00, "pe": 5.8, "div": 6.2},
    {"symbol": "FFC", "name": "Fauji Fertilizer Company", "sector": "Fertilizer", "base_price": 210.50, "high_52": 225.00, "low_52": 120.00, "pe": 5.0, "div": 15.0},
    {"symbol": "SYS", "name": "Systems Limited", "sector": "Technology & Comm.", "base_price": 482.00, "high_52": 520.00, "low_52": 370.00, "pe": 16.5, "div": 2.1},
    {"symbol": "ATRL", "name": "Attock Refinery Limited", "sector": "Refinery", "base_price": 412.30, "high_52": 450.00, "low_52": 280.00, "pe": 3.4, "div": 8.0},
    {"symbol": "DGKC", "name": "D.G. Khan Cement", "sector": "Cement", "base_price": 89.40, "high_52": 105.00, "low_52": 62.00, "pe": 9.2, "div": 3.0},
    {"symbol": "PRL", "name": "Pakistan Refinery Limited", "sector": "Refinery", "base_price": 33.75, "high_52": 41.50, "low_52": 22.00, "pe": 4.5, "div": 0.0},
    {"symbol": "SEARL", "name": "The Searle Company", "sector": "Pharmaceuticals", "base_price": 74.20, "high_52": 88.00, "low_52": 48.00, "pe": 14.2, "div": 2.5},
    {"symbol": "AIRLINK", "name": "Air Link Communication", "sector": "Technology", "base_price": 142.10, "high_52": 165.00, "low_52": 65.00, "pe": 11.2, "div": 3.5},
    {"symbol": "PAEL", "name": "Pak Elektron Limited", "sector": "Engineering", "base_price": 29.80, "high_52": 36.50, "low_52": 18.00, "pe": 7.5, "div": 2.0},
    {"symbol": "CNERGY", "name": "Cnergyico PK Limited", "sector": "Refinery", "base_price": 5.45, "high_52": 7.20, "low_52": 3.80, "pe": 12.0, "div": 0.0},
    {"symbol": "TELE", "name": "Telecard Limited", "sector": "Technology", "base_price": 9.20, "high_52": 12.50, "low_52": 6.50, "pe": 8.5, "div": 0.0},
    {"symbol": "EFERT", "name": "Engro Fertilizers Limited", "sector": "Fertilizer", "base_price": 178.50, "high_52": 195.00, "low_52": 115.00, "pe": 6.8, "div": 13.8}
]

def generate_candles_for_symbol(base_price: float, num_days: int = 60) -> List[Candle]:
    candles: List[Candle] = []
    current_date = datetime.date.today() - datetime.timedelta(days=num_days)
    price = base_price * 0.88 # start slight lower to create realistic trend
    
    for _ in range(num_days):
        if current_date.weekday() >= 5: # Skip weekends
            current_date += datetime.timedelta(days=1)
            continue
            
        change_pct = random.uniform(-0.028, 0.032)
        open_price = round(price, 2)
        close_price = round(price * (1 + change_pct), 2)
        high_price = round(max(open_price, close_price) * (1 + random.uniform(0.002, 0.015)), 2)
        low_price = round(min(open_price, close_price) * (1 - random.uniform(0.002, 0.015)), 2)
        vol = int(random.uniform(500_000, 18_000_000))
        
        candles.append(Candle(
            time=current_date.strftime("%Y-%m-%d"),
            open=open_price,
            high=high_price,
            low=low_price,
            close=close_price,
            volume=vol
        ))
        price = close_price
        current_date += datetime.timedelta(days=1)
        
    return candles

class MockDataService:
    def __init__(self):
        self.kse_index = 105420.50
        self.kse_change = 682.40
        self.kse_change_pct = 0.65
        self.last_tick_time = datetime.datetime.now()

    def get_market_status(self) -> MarketStatusResponse:
        now = datetime.datetime.now()
        # PSX Trading Hours: 9:15 AM - 3:30 PM PKT (Mon-Thu), 9:15-12:00, 2:30-4:30 (Fri)
        is_open = (9 <= now.hour < 16) and (now.weekday() < 5)
        status_text = "OPEN" if is_open else "CLOSED"

        return MarketStatusResponse(
            status=status_text,
            index_name="KSE-100 Index",
            current_value=round(self.kse_index, 2),
            change=round(self.kse_change, 2),
            change_percent=round(self.kse_change_pct, 2),
            high=round(self.kse_index + 340.20, 2),
            low=round(self.kse_index - 210.80, 2),
            volume=428950200,
            volume_formatted="428.95M",
            turnover_pkr=24850300000.0,
            turnover_formatted="PKR 24.85B",
            previous_close=round(self.kse_index - self.kse_change, 2),
            market_breadth=MarketBreadth(
                advances=214,
                declines=128,
                unchanged=46,
                total_traded=388
            ),
            stocks_scanned_count=388,
            active_signals_count=24,
            strong_opportunities_count=7,
            data_freshness_seconds=3,
            last_updated=now.strftime("%Y-%m-%d %H:%M:%S PKT"),
            is_mock=True
        )

    def get_market_movers(self) -> MarketMoversResponse:
        now = datetime.datetime.now()
        gainers = [
            MarketMover(symbol="AIRLINK", name="Air Link Communication", sector="Technology", price=142.10, change=9.60, change_percent=7.25, volume=18450000, volume_formatted="18.45M", turnover_pkr=2621745000.0, high_today=143.00, low_today=133.50),
            MarketMover(symbol="ATRL", name="Attock Refinery", sector="Refinery", price=412.30, change=21.40, change_percent=5.47, volume=12300000, volume_formatted="12.30M", turnover_pkr=5071290000.0, high_today=415.00, low_today=392.00),
            MarketMover(symbol="SYS", name="Systems Limited", sector="Technology", price=482.00, change=22.50, change_percent=4.90, volume=8900000, volume_formatted="8.90M", turnover_pkr=4289800000.0, high_today=485.00, low_today=461.00),
            MarketMover(symbol="LUCK", name="Lucky Cement", sector="Cement", price=945.00, change=35.00, change_percent=3.85, volume=6400000, volume_formatted="6.40M", turnover_pkr=6048000000.0, high_today=950.00, low_today=912.00),
            MarketMover(symbol="HUBC", name="Hub Power Company", sector="Power Generation", price=138.20, change=4.50, change_percent=3.37, volume=22100000, volume_formatted="22.10M", turnover_pkr=3054220000.0, high_today=139.50, low_today=134.00),
        ]
        losers = [
            MarketMover(symbol="CNERGY", name="Cnergyico PK", sector="Refinery", price=5.45, change=-0.32, change_percent=-5.55, volume=34200000, volume_formatted="34.20M", turnover_pkr=186390000.0, high_today=5.85, low_today=5.40),
            MarketMover(symbol="TELE", name="Telecard Limited", sector="Technology", price=9.20, change=-0.48, change_percent=-4.96, volume=15800000, volume_formatted="15.80M", turnover_pkr=145360000.0, high_today=9.75, low_today=9.15),
            MarketMover(symbol="PAEL", name="Pak Elektron Limited", sector="Engineering", price=29.80, change=-1.10, change_percent=-3.56, volume=19500000, volume_formatted="19.50M", turnover_pkr=581100000.0, high_today=31.20, low_today=29.60),
            MarketMover(symbol="DGKC", name="D.G. Khan Cement", sector="Cement", price=89.40, change=-2.20, change_percent=-2.40, volume=11400000, volume_formatted="11.40M", turnover_pkr=1019160000.0, high_today=92.00, low_today=88.90),
            MarketMover(symbol="SEARL", name="The Searle Company", sector="Pharma", price=74.20, change=-1.60, change_percent=-2.11, volume=7800000, volume_formatted="7.80M", turnover_pkr=578760000.0, high_today=76.50, low_today=73.80),
        ]
        volume_leaders = [
            MarketMover(symbol="CNERGY", name="Cnergyico PK", sector="Refinery", price=5.45, change=-0.32, change_percent=-5.55, volume=34200000, volume_formatted="34.20M", turnover_pkr=186390000.0, high_today=5.85, low_today=5.40),
            MarketMover(symbol="HUBC", name="Hub Power Company", sector="Power Generation", price=138.20, change=4.50, change_percent=3.37, volume=22100000, volume_formatted="22.10M", turnover_pkr=3054220000.0, high_today=139.50, low_today=134.00),
            MarketMover(symbol="PAEL", name="Pak Elektron Limited", sector="Engineering", price=29.80, change=-1.10, change_percent=-3.56, volume=19500000, volume_formatted="19.50M", turnover_pkr=581100000.0, high_today=31.20, low_today=29.60),
            MarketMover(symbol="AIRLINK", name="Air Link Communication", sector="Technology", price=142.10, change=9.60, change_percent=7.25, volume=18450000, volume_formatted="18.45M", turnover_pkr=2621745000.0, high_today=143.00, low_today=133.50),
            MarketMover(symbol="OGDC", name="Oil & Gas Development Co", sector="Oil & Gas", price=164.50, change=3.80, change_percent=2.36, volume=16800000, volume_formatted="16.80M", turnover_pkr=2763600000.0, high_today=165.80, low_today=161.00),
        ]
        return MarketMoversResponse(
            gainers=gainers,
            losers=losers,
            volume_leaders=volume_leaders,
            timestamp=now.strftime("%Y-%m-%d %H:%M:%S PKT"),
            is_mock=True
        )

    def get_signals(self) -> SignalOverviewResponse:
        now = datetime.datetime.now()
        signals = [
            Signal(
                id="SIG-PSX-101",
                symbol="AIRLINK",
                company_name="Air Link Communication",
                sector="Technology",
                action="STRONG_BUY",
                strategy="Multi-Day Consolidation Breakout",
                timeframe="1D",
                confidence_score=94,
                current_price=142.10,
                entry_price=140.50,
                stop_loss=133.00,
                target_1=152.00,
                target_2=164.00,
                target_3=175.00,
                risk_reward_ratio=3.2,
                potential_gain_percent=15.3,
                max_loss_percent=5.3,
                rsi_14=64.8,
                volume_surge_ratio=2.85,
                created_at=(now - datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=48)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Smart phone assembly volume expansion + 2.8x volume surge breaking above 6-month resistance.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-102",
                symbol="ATRL",
                company_name="Attock Refinery",
                sector="Refinery",
                action="STRONG_BUY",
                strategy="Refinery Margin Expansion / EMA Golden Cross",
                timeframe="4h",
                confidence_score=91,
                current_price=412.30,
                entry_price=408.00,
                stop_loss=390.00,
                target_1=435.00,
                target_2=460.00,
                target_3=485.00,
                risk_reward_ratio=2.8,
                potential_gain_percent=12.5,
                max_loss_percent=4.4,
                rsi_14=62.4,
                volume_surge_ratio=2.1,
                created_at=(now - datetime.timedelta(hours=4)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=72)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Refinery brownfield policy execution anticipated; GRMs strengthening.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-103",
                symbol="LUCK",
                company_name="Lucky Cement",
                sector="Cement",
                action="BUY",
                strategy="Key Level Support Bounce",
                timeframe="1D",
                confidence_score=86,
                current_price=945.00,
                entry_price=935.00,
                stop_loss=905.00,
                target_1=995.00,
                target_2=1040.00,
                target_3=1090.00,
                risk_reward_ratio=3.0,
                potential_gain_percent=10.0,
                max_loss_percent=3.2,
                rsi_14=54.2,
                volume_surge_ratio=1.65,
                created_at=(now - datetime.timedelta(hours=6)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=96)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Coal import price drop benefiting margins; retesting 50 EMA on heavy institutional bids.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-104",
                symbol="HUBC",
                company_name="Hub Power Company",
                sector="Power Generation",
                action="BUY",
                strategy="Dividend Yield Momentum & Volume Accumulation",
                timeframe="1D",
                confidence_score=84,
                current_price=138.20,
                entry_price=136.50,
                stop_loss=131.00,
                target_1=145.00,
                target_2=152.00,
                target_3=158.00,
                risk_reward_ratio=2.4,
                potential_gain_percent=9.9,
                max_loss_percent=4.0,
                rsi_14=58.1,
                volume_surge_ratio=1.9,
                created_at=(now - datetime.timedelta(hours=7)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=120)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Highest cash yield portfolio buffer; circular debt settlement tranches expected.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-105",
                symbol="SYS",
                company_name="Systems Limited",
                sector="Technology",
                action="BUY",
                strategy="Bullish Flag Breakout",
                timeframe="1h",
                confidence_score=82,
                current_price=482.00,
                entry_price=478.00,
                stop_loss=462.00,
                target_1=510.00,
                target_2=535.00,
                target_3=560.00,
                risk_reward_ratio=2.6,
                potential_gain_percent=11.9,
                max_loss_percent=3.3,
                rsi_14=61.0,
                volume_surge_ratio=1.8,
                created_at=(now - datetime.timedelta(hours=8)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=48)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Export revenue resilience and MEA contracts expansion pipeline.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-106",
                symbol="MEBL",
                company_name="Meezan Bank Limited",
                sector="Islamic Banking",
                action="BUY",
                strategy="Ascending Triangle Continuation",
                timeframe="1D",
                confidence_score=80,
                current_price=235.10,
                entry_price=232.00,
                stop_loss=224.00,
                target_1=248.00,
                target_2=260.00,
                target_3=272.00,
                risk_reward_ratio=2.5,
                potential_gain_percent=10.5,
                max_loss_percent=3.4,
                rsi_14=57.3,
                volume_surge_ratio=1.45,
                created_at=(now - datetime.timedelta(hours=12)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=140)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Consistent deposit franchise growth and low ADR taxation impact.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-107",
                symbol="CNERGY",
                company_name="Cnergyico PK",
                sector="Refinery",
                action="SELL",
                strategy="Head and Shoulders Breakdown",
                timeframe="1D",
                confidence_score=78,
                current_price=5.45,
                entry_price=5.50,
                stop_loss=5.85,
                target_1=5.05,
                target_2=4.75,
                target_3=4.40,
                risk_reward_ratio=2.1,
                potential_gain_percent=12.7,
                max_loss_percent=6.3,
                rsi_14=38.2,
                volume_surge_ratio=2.4,
                created_at=(now - datetime.timedelta(hours=14)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=72)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Heavy retail selling pressure below critical 5.60 support line.",
                is_mock=True
            ),
            Signal(
                id="SIG-PSX-108",
                symbol="OGDC",
                company_name="Oil & Gas Development Co",
                sector="Oil & Gas Exploration",
                action="BUY",
                strategy="MACD Zero Line Bullish Crossover",
                timeframe="4h",
                confidence_score=85,
                current_price=164.50,
                entry_price=163.00,
                stop_loss=157.00,
                target_1=174.00,
                target_2=182.00,
                target_3=190.00,
                risk_reward_ratio=2.8,
                potential_gain_percent=10.6,
                max_loss_percent=3.6,
                rsi_14=59.4,
                volume_surge_ratio=1.75,
                created_at=(now - datetime.timedelta(hours=16)).strftime("%Y-%m-%d %H:%M"),
                valid_until=(now + datetime.timedelta(hours=96)).strftime("%Y-%m-%d %H:%M"),
                status="ACTIVE",
                catalyst_notes="Exploration discovery flow tests in Sindh blocks positive.",
                is_mock=True
            ),
        ]
        return SignalOverviewResponse(
            total_signals=len(signals),
            strong_buy_count=2,
            buy_count=5,
            hold_count=0,
            sell_count=1,
            signals=signals,
            timestamp=now.strftime("%Y-%m-%d %H:%M:%S PKT"),
            is_mock=True
        )

    def get_scanner_results(self) -> ScannerResponse:
        now = datetime.datetime.now()
        results = [
            ScannerItem(symbol="AIRLINK", company_name="Air Link Communication", sector="Technology", price=142.10, change_percent=7.25, volume=18450000, rel_volume=2.85, rsi_14=64.8, macd_signal="Strong Bullish", ema_trend="Bullish Alignment", detected_pattern="Volume Breakout", signal_trigger="RSI & Vol Triggered", confidence_score=94),
            ScannerItem(symbol="ATRL", company_name="Attock Refinery", sector="Refinery", price=412.30, change_percent=5.47, volume=12300000, rel_volume=2.10, rsi_14=62.4, macd_signal="Bullish Crossover", ema_trend="Above 20/50/200 EMA", detected_pattern="Cup and Handle", signal_trigger="Breakout Confirmation", confidence_score=91),
            ScannerItem(symbol="LUCK", company_name="Lucky Cement", sector="Cement", price=945.00, change_percent=3.85, volume=6400000, rel_volume=1.65, rsi_14=54.2, macd_signal="Bullish Divergence", ema_trend="Testing 50 EMA", detected_pattern="Double Bottom", signal_trigger="Support Bounce", confidence_score=86),
            ScannerItem(symbol="OGDC", company_name="Oil & Gas Dev Co", sector="Oil & Gas", price=164.50, change_percent=2.36, volume=16800000, rel_volume=1.75, rsi_14=59.4, macd_signal="Bullish Crossover", ema_trend="Bullish", detected_pattern="Ascending Channel", signal_trigger="MACD Zero Cross", confidence_score=85),
            ScannerItem(symbol="HUBC", name="Hub Power Company", sector="Power Generation", price=138.20, change_percent=3.37, volume=22100000, rel_volume=1.90, rsi_14=58.1, macd_signal="Bullish", ema_trend="Strong Trend", detected_pattern="Consolidation Breakout", signal_trigger="Volume Surge", confidence_score=84),
            ScannerItem(symbol="SYS", name="Systems Limited", sector="Technology", price=482.00, change_percent=4.90, volume=8900000, rel_volume=1.80, rsi_14=61.0, macd_signal="Bullish", ema_trend="Bullish", detected_pattern="Bull Flag", signal_trigger="Upper Channel Break", confidence_score=82),
            ScannerItem(symbol="MEBL", name="Meezan Bank Limited", sector="Islamic Banking", price=235.10, change_percent=1.77, volume=5200000, rel_volume=1.45, rsi_14=57.3, macd_signal="Bullish", ema_trend="Bullish", detected_pattern="Ascending Triangle", signal_trigger="Resistance Test", confidence_score=80),
            ScannerItem(symbol="FFC", name="Fauji Fertilizer", sector="Fertilizer", price=210.50, change_percent=1.20, volume=4800000, rel_volume=1.30, rsi_14=53.5, macd_signal="Neutral", ema_trend="Sideways", detected_pattern="Range Bound", signal_trigger="Accumulation Zone", confidence_score=76),
            ScannerItem(symbol="CNERGY", name="Cnergyico PK", sector="Refinery", price=5.45, change_percent=-5.55, volume=34200000, rel_volume=2.40, rsi_14=38.2, macd_signal="Bearish Cross", ema_trend="Below 20/50 EMA", detected_pattern="Head & Shoulders", signal_trigger="Support Breakdown", confidence_score=78),
        ]
        return ScannerResponse(
            total_scanned=388,
            matches_count=len(results),
            scan_timestamp=now.strftime("%Y-%m-%d %H:%M:%S PKT"),
            filters_applied={"min_volume": 1000000, "min_rsi": 40, "max_rsi": 75, "min_score": 75},
            results=results,
            is_mock=True
        )

    def get_top_opportunities(self) -> OpportunitiesResponse:
        now = datetime.datetime.now()
        opps = [
            OpportunityItem(
                id="OPP-1",
                symbol="AIRLINK",
                company_name="Air Link Communication",
                action="STRONG_BUY",
                score=94,
                expected_return_pct=15.3,
                risk_level="Medium",
                timeframe="2-5 Days",
                entry_range="PKR 140.00 - 142.50",
                stop_loss=133.00,
                target_1=152.00,
                catalyst="Smartphone assembly volumes + 2.85x volume surge breakout.",
                volume_surge="2.85x Above 20D Avg"
            ),
            OpportunityItem(
                id="OPP-2",
                symbol="ATRL",
                company_name="Attock Refinery Limited",
                action="STRONG_BUY",
                score=91,
                expected_return_pct=12.5,
                risk_level="Medium-Low",
                timeframe="3-7 Days",
                entry_range="PKR 408.00 - 413.00",
                stop_loss=390.00,
                target_1=435.00,
                catalyst="Refinery policy implementation & robust refining crack spreads.",
                volume_surge="2.10x Above 20D Avg"
            ),
            OpportunityItem(
                id="OPP-3",
                symbol="LUCK",
                company_name="Lucky Cement",
                action="BUY",
                score=86,
                expected_return_pct=10.0,
                risk_level="Low",
                timeframe="1-2 Weeks",
                entry_range="PKR 935.00 - 946.00",
                stop_loss=905.00,
                target_1=995.00,
                catalyst="Lower coal tariffs boosting EBITDA margins, institutional rebalancing.",
                volume_surge="1.65x Above 20D Avg"
            ),
            OpportunityItem(
                id="OPP-4",
                symbol="OGDC",
                company_name="Oil & Gas Dev Co",
                action="BUY",
                score=85,
                expected_return_pct=10.6,
                risk_level="Low",
                timeframe="1-2 Weeks",
                entry_range="PKR 163.00 - 165.00",
                stop_loss=157.00,
                target_1=174.00,
                catalyst="Circular debt resolution allocation and steady high dividend payout.",
                volume_surge="1.75x Above 20D Avg"
            ),
            OpportunityItem(
                id="OPP-5",
                symbol="HUBC",
                company_name="Hub Power Company",
                action="BUY",
                score=84,
                expected_return_pct=9.9,
                risk_level="Low",
                timeframe="3-10 Days",
                entry_range="PKR 136.50 - 138.50",
                stop_loss=131.00,
                target_1=145.00,
                catalyst="EV charging network joint venture and strong cash dividends.",
                volume_surge="1.90x Above 20D Avg"
            )
        ]
        return OpportunitiesResponse(
            top_opportunities=opps,
            timestamp=now.strftime("%Y-%m-%d %H:%M:%S PKT"),
            is_mock=True
        )

    def get_stock_detail(self, symbol: str) -> StockDetail:
        symbol_upper = symbol.upper()
        matching = next((s for s in PSX_STOCKS if s["symbol"] == symbol_upper), None)
        if not matching:
            matching = {
                "symbol": symbol_upper,
                "name": f"{symbol_upper} Pakistan Ltd",
                "sector": "General Equity",
                "base_price": 100.0,
                "high_52": 130.0,
                "low_52": 70.0,
                "pe": 6.0,
                "div": 5.0
            }
        
        candles = generate_candles_for_symbol(matching["base_price"], num_days=60)
        last_candle = candles[-1]
        prev_candle = candles[-2] if len(candles) > 1 else last_candle
        change = round(last_candle.close - prev_candle.close, 2)
        change_pct = round((change / prev_candle.close) * 100, 2) if prev_candle.close else 0.0

        return StockDetail(
            symbol=matching["symbol"],
            company_name=matching["name"],
            sector=matching["sector"],
            price=last_candle.close,
            change=change,
            change_percent=change_pct,
            open=last_candle.open,
            high=last_candle.high,
            low=last_candle.low,
            volume=last_candle.volume,
            volume_formatted=f"{round(last_candle.volume / 1_000_000, 2)}M",
            pe_ratio=matching["pe"],
            dividend_yield_pct=matching["div"],
            high_52w=matching["high_52"],
            low_52w=matching["low_52"],
            technicals=TechnicalIndicators(
                rsi_14=63.5,
                macd_line=2.45,
                macd_signal=1.85,
                macd_hist=0.60,
                sma_20=round(matching["base_price"] * 0.98, 2),
                sma_50=round(matching["base_price"] * 0.94, 2),
                sma_200=round(matching["base_price"] * 0.86, 2),
                atr_14=round(matching["base_price"] * 0.024, 2),
                trend="Bullish"
            ),
            candles=candles,
            is_mock=True
        )

mock_service = MockDataService()
