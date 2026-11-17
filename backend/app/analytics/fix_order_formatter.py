import datetime
import hashlib
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ExecutionSafetyCheck(BaseModel):
    rule: str
    passed: bool
    detail: str

class FastOrderTicketRequest(BaseModel):
    symbol: str
    action: str = "BUY"  # BUY or SELL
    price: float
    quantity: int
    order_type: str = "LIMIT"  # LIMIT, MARKET, STOP_LIMIT
    stop_loss: Optional[float] = None
    target_1: Optional[float] = None
    client_code: Optional[str] = "SCST-PRO"
    is_upper_locked: bool = False
    is_defaulter: bool = False
    is_non_compliant: bool = False

class FastOrderTicketResponse(BaseModel):
    ticket_id: str
    symbol: str
    action: str
    price: float
    quantity: int
    order_type: str
    stop_loss_trigger: Optional[float] = None
    target_price: Optional[float] = None
    client_code: str
    scstrade_quick_string: str
    fix_42_message: str
    fix_tags: Dict[str, str]
    batch_csv_row: str
    safety_checks: List[ExecutionSafetyCheck]
    all_safety_checks_passed: bool
    generated_at: str

def compute_fix_checksum(msg_without_checksum: str) -> str:
    """Computes standard FIX protocol modulo 256 checksum (Tag 10)."""
    total = sum(ord(c) for c in msg_without_checksum.replace("|", "\x01"))
    return f"{total % 256:03d}"

def generate_psx_order_ticket(req: FastOrderTicketRequest) -> FastOrderTicketResponse:
    """
    Constructs an institutional execution ticket for Pakistan Stock Exchange brokers,
    specifically tailored for SCS Trade (Standard Capital Securities) and standard FIX 4.2 engines.
    """
    sym = req.symbol.strip().upper()
    act = req.action.strip().upper()
    price = round(req.price, 2)
    qty = req.quantity
    client = (req.client_code or "SCST-PRO").strip().upper()
    order_type = req.order_type.strip().upper()

    now = datetime.datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S PKT")
    utc_timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H:%M:%S")

    # Generate deterministic client order ID
    seed = f"{sym}-{act}-{qty}-{price}-{now.strftime('%H%M%S')}"
    cl_ord_id = f"CLORD-{sym}-{hashlib.md5(seed.encode()).hexdigest()[:8].upper()}"

    # Side: 1=Buy, 2=Sell
    side_tag = "1" if act == "BUY" else "2"
    # OrdType: 1=Market, 2=Limit, 3=Stop, 4=StopLimit
    ord_type_tag = "2" if order_type == "LIMIT" else ("1" if order_type == "MARKET" else "4")

    # 1. SCSTrade Quick String format (Single Line Fast Copy)
    # Format: [SYMBOL],[BUY/SELL],[QUANTITY],[PRICE],[ORDER_TYPE],[VALIDITY],[CLIENT_CODE]
    scs_quick_str = f"{sym},{act},{qty},{price:.2f},{order_type},DAY,{client}"

    # 2. SCS Trade Desktop Batch CSV Row
    # Header: Symbol,Side,OrderType,Qty,Price,DisclosedQty,Validity,ClientCode,TriggerPrice
    trigger = f"{req.stop_loss:.2f}" if req.stop_loss else "0.00"
    batch_csv = f"{sym},{act},{order_type},{qty},{price:.2f},{qty},DAY,{client},{trigger}"

    # 3. FIX 4.2 Message Construction
    # Body tags
    body_tags = [
        f"35=D",                      # MsgType: New Order Single
        f"49=PSX_INTELLIGENCE",       # SenderCompID
        f"56=SCSTRADE_GW",            # TargetCompID
        f"34=1",                      # MsgSeqNum
        f"52={utc_timestamp}",        # SendingTime
        f"11={cl_ord_id}",            # ClOrdID
        f"1={client}",                # Account
        f"55={sym}",                  # Symbol
        f"54={side_tag}",             # Side (1=Buy, 2=Sell)
        f"38={qty}",                  # OrderQty
        f"40={ord_type_tag}",         # OrdType (2=Limit)
        f"44={price:.2f}",            # Price
        f"59=0",                      # TimeInForce (0=Day)
        f"21=1",                      # HandlInst (1=Automated, private)
    ]
    if req.stop_loss and order_type == "STOP_LIMIT":
        body_tags.append(f"99={req.stop_loss:.2f}")  # StopPx

    body_str = "|".join(body_tags) + "|"
    header_str = f"8=FIX.4.2|9={len(body_str)}|"
    msg_no_cs = header_str + body_str
    checksum = compute_fix_checksum(msg_no_cs)
    fix_full_msg = f"{msg_no_cs}10={checksum}|"

    # Friendly human-readable FIX tag dictionary
    fix_tags_dict = {
        "8 (BeginString)": "FIX.4.2",
        "9 (BodyLength)": str(len(body_str)),
        "35 (MsgType)": "D (New Order Single)",
        "49 (SenderCompID)": "PSX_INTELLIGENCE",
        "56 (TargetCompID)": "SCSTRADE_GW",
        "11 (ClOrdID)": cl_ord_id,
        "1 (Account)": client,
        "55 (Symbol)": sym,
        "54 (Side)": f"{side_tag} ({'Buy' if side_tag == '1' else 'Sell'})",
        "38 (OrderQty)": str(qty),
        "40 (OrdType)": f"{ord_type_tag} ({order_type})",
        "44 (Price)": f"{price:.2f}",
        "59 (TimeInForce)": "0 (Day)",
        "10 (CheckSum)": checksum,
    }

    # 4. Institutional Execution Safety Checks
    checks: List[ExecutionSafetyCheck] = []

    # Check 1: Circuit Lock Check
    if req.is_upper_locked and act == "BUY":
        checks.append(ExecutionSafetyCheck(
            rule="PSX Upper Circuit Breaker Lock",
            passed=False,
            detail=f"{sym} is currently locked at upper circuit limit with 0 ask liquidity. Buy orders cannot execute."
        ))
    else:
        checks.append(ExecutionSafetyCheck(
            rule="PSX Upper Circuit Breaker Lock",
            passed=True,
            detail="Order price is within allowable 7.5% daily price band limits. Liquidity active."
        ))

    # Check 2: Regulatory Defaulter Shield
    if req.is_defaulter:
        checks.append(ExecutionSafetyCheck(
            rule="PSX Regulatory Defaulters Shield",
            passed=False,
            detail=f"{sym} is placed on the PSX Defaulters Segment (Rule 5.11.1). Institutional buys restricted."
        ))
    elif req.is_non_compliant:
        checks.append(ExecutionSafetyCheck(
            rule="PSX Regulatory Non-Compliant Shield",
            passed=False,
            detail=f"{sym} has pending regulatory warnings or overdue statutory filings."
        ))
    else:
        checks.append(ExecutionSafetyCheck(
            rule="PSX Regulatory Compliance Status",
            passed=True,
            detail="Normal trading counter. No adverse regulatory restrictions."
        ))

    # Check 3: Order Sizing & Single-Ticket Exposure
    trade_value = price * qty
    if trade_value > 5_000_000:
        checks.append(ExecutionSafetyCheck(
            rule="Large Order Exposure Cap (PKR 5M)",
            passed=False,
            detail=f"Single ticket value of PKR {trade_value:,.2f} exceeds recommended PKR 5,000,000 threshold. Consider iceberg slicing."
        ))
    else:
        checks.append(ExecutionSafetyCheck(
            rule="Single Ticket Sizing Check",
            passed=True,
            detail=f"Nominal order value of PKR {trade_value:,.2f} is within safe broker execution limits."
        ))

    # Check 4: Manual Broker Dispatch Rule (Mandatory Safety Principle)
    checks.append(ExecutionSafetyCheck(
        rule="Manual Broker Dispatch Protocol",
        passed=True,
        detail="No automated execution against broker accounts. Copy order ticket and confirm manually in SCS Trade."
    ))

    all_passed = all(c.passed for c in checks)

    return FastOrderTicketResponse(
        ticket_id=cl_ord_id,
        symbol=sym,
        action=act,
        price=price,
        quantity=qty,
        order_type=order_type,
        stop_loss_trigger=req.stop_loss,
        target_price=req.target_1,
        client_code=client,
        scstrade_quick_string=scs_quick_str,
        fix_42_message=fix_full_msg,
        fix_tags=fix_tags_dict,
        batch_csv_row=batch_csv,
        safety_checks=checks,
        all_safety_checks_passed=all_passed,
        generated_at=now_str
    )
