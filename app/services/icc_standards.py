# app/services/icc_standards.py
"""
ICC and coaching standards for batting and bowling
Based on MCC Laws of Cricket and coaching manuals
"""

ICC_BATTING_STANDARDS = {
    "stance": {
        "optimal": {
            "head_position": {"x_variance": 0.05, "y_variance": 0.03},
            "shoulder_alignment": {"max_tilt": 5},  # degrees
            "knee_flexion": {"min": 140, "max": 160},  # degrees
            "weight_distribution": {"front": 45, "back": 55, "tolerance": 10}
        },
        "types": {
            "square": {"shoulder_angle": (85, 95)},
            "open": {"shoulder_angle": (96, 120)},
            "closed": {"shoulder_angle": (60, 84)}
        }
    },
    "backlift": {
        "optimal": {
            "bat_angle": {"min": 15, "max": 45},  # degrees from vertical
            "height": {"min": 0.3, "max": 0.7},  # normalized height
            "straightness": {"max_deviation": 10}  # degrees
        }
    },
    "footwork": {
        "forward_defense": {"stride_length": 0.2, "balance_score": 8},
        "drive": {"stride_length": 0.3, "weight_transfer": 70},
        "pull_shot": {"back_foot_pivot": True, "head_position": "stable"}
    }
}

ICC_BOWLING_STANDARDS = {
    "legal_limits": {
        "elbow_extension": 15,  # degrees (Law 21.3)
        "front_foot": 0.0,  # Must land behind popping crease
        "arm_actions": {
            "legal": ["bowling", "throwing_warning", "throwing_illegal"],
            "thresholds": {
                "warning": 12,  # degrees (warning threshold)
                "illegal": 15   # degrees (illegal threshold)
            }
        }
    },
    "action_types": {
        "fast_bowling": {
            "run_up": {"length": "long", "rhythm": "smooth"},
            "jump": {"height": "moderate", "landing": "balanced"},
            "delivery_stride": {"length": "long", "braking": "strong"}
        },
        "spin_bowling": {
            "gather": {"pause": "brief", "balance": "excellent"},
            "pivot": {"rotation": "full", "arm_speed": "fast"}
        }
    }
}

def check_batting_compliance(metrics: dict) -> dict:
    """Check batting metrics against ICC/coaching standards"""
    compliance = {"pass": True, "warnings": [], "issues": []}
    
    # Check stance
    stance_type = metrics.get("stance_type", "unknown")
    if stance_type in ICC_BATTING_STANDARDS["stance"]["types"]:
        shoulder_angle = metrics.get("shoulder_angle", 90)
        min_angle, max_angle = ICC_BATTING_STANDARDS["stance"]["types"][stance_type]["shoulder_angle"]
        
        if not (min_angle <= shoulder_angle <= max_angle):
            compliance["warnings"].append(f"Shoulder angle {shoulder_angle}° not optimal for {stance_type} stance")
    
    # Check head position
    head_movement = metrics.get("head_movement", 0)
    if head_movement > ICC_BATTING_STANDARDS["stance"]["optimal"]["head_position"]["y_variance"]:
        compliance["issues"].append(f"Excessive head movement: {head_movement:.2f}")
        compliance["pass"] = False
    
    return compliance

def check_bowling_compliance(metrics: dict) -> dict:
    """Check bowling metrics against ICC standards"""
    compliance = {
        "legal": True,
        "elbow_status": "legal",
        "front_foot_status": "legal",
        "violations": []
    }
    
    # Elbow extension check
    elbow_ext = metrics.get("elbow_extension", 0)
    if elbow_ext > ICC_BOWLING_STANDARDS["legal_limits"]["elbow_extension"]:
        compliance["legal"] = False
        compliance["elbow_status"] = "illegal"
        compliance["violations"].append({
            "rule": "Law 21.3",
            "detail": f"Elbow extension {elbow_ext:.1f}° exceeds 15° limit"
        })
    elif elbow_ext > ICC_BOWLING_STANDARDS["legal_limits"]["arm_actions"]["thresholds"]["warning"]:
        compliance["elbow_status"] = "warning"
        compliance["violations"].append({
            "rule": "Law 21.3 (Warning)",
            "detail": f"Elbow extension {elbow_ext:.1f}° close to limit"
        })
    
    # Front foot check
    if metrics.get("front_foot_no_ball", False):
        compliance["legal"] = False
        compliance["front_foot_status"] = "no_ball"
        compliance["violations"].append({
            "rule": "Law 24.5",
            "detail": "Front foot landing beyond popping crease"
        })
    
    return compliance