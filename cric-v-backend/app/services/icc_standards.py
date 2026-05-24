# app/services/icc_standards.py
"""
ICC and coaching standards for batting and bowling
Based on MCC Laws of Cricket and coaching manuals
"""

# Constants
MAX_ELBOW_EXTENSION_DEGREES = 15.0
LEGAL_FRONT_FOOT_ZONE = 0.95  # normalized pitch position (behind crease)
MIN_BALL_HEIGHT_AT_RELEASE = 0.6  # normalized (above waist)

def check_bowling_action(elbow_angle: float) -> dict:
    """
    Check if the elbow extension is within ICC limits (Law 21.3)
    """
    legal = elbow_angle <= MAX_ELBOW_EXTENSION_DEGREES
    warning = not legal or (elbow_angle > 12.0)
    
    violation = None
    if not legal:
        violation = f"Elbow extension {elbow_angle:.1f}° exceeds {MAX_ELBOW_EXTENSION_DEGREES}° limit"
    
    return {
        "legal": legal,
        "angle": round(elbow_angle, 1),
        "violation": violation,
        "warning": warning
    }

def check_front_foot(foot_y_normalized: float) -> dict:
    """
    Check if the front foot landed behind the popping crease (Law 24.5)
    """
    # Assuming y=1 is bottom of frame (near crease)
    # Crease is typically at y ~ 0.95
    legal = foot_y_normalized <= LEGAL_FRONT_FOOT_ZONE
    margin = LEGAL_FRONT_FOOT_ZONE - foot_y_normalized
    
    return {
        "legal": legal,
        "margin_cm": round(margin * 100, 1) # rough scale
    }

def check_ball_height(release_y_normalized: float) -> dict:
    """
    Check if the ball is released at a high enough point (not a 'chuck')
    """
    valid = release_y_normalized > MIN_BALL_HEIGHT_AT_RELEASE
    category = "high" if release_y_normalized > 0.8 else "medium" if release_y_normalized > 0.6 else "low"
    
    return {
        "valid": valid,
        "height_category": category
    }

def get_full_compliance_report(delivery_data: dict) -> dict:
    """
    Get full ICC compliance report for a delivery
    """
    elbow_check = check_bowling_action(delivery_data.get("elbow_angle", 0))
    foot_check = check_front_foot(delivery_data.get("foot_y", 1.0))
    height_check = check_ball_height(delivery_data.get("release_y", 0))
    
    compliant = elbow_check["legal"] and foot_check["legal"]
    
    return {
        "is_compliant": compliant,
        "elbow": elbow_check,
        "foot": foot_check,
        "height": height_check,
        "overall_status": "Legal" if compliant else "Illegal/Notice"
    }