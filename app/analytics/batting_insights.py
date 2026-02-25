import numpy as np
from typing import List, Dict
from sqlalchemy.orm import Session
from app.core.models import Delivery, Player

class BattingInsights:
    def __init__(self):
        self.professional_batsmen = self.load_professional_batsmen()
    
    def load_professional_batsmen(self):
        return [
            {
                "name": "Virat Kohli",
                "avg_strike_rate": 93.5,
                "favored_zones": ["cover", "midwicket"],
                "timing_score": 85,
            },
            {
                "name": "Rohit Sharma",
                "avg_strike_rate": 89.2,
                "favored_zones": ["off_side", "straight"],
                "timing_score": 82,
            },
        ]
    
    def strike_rate(self, player_id: int, db: Session) -> float:
        """
        Calculate strike rate (runs per 100 balls) from deliveries
        """
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id,
            Delivery.runs >= 0
        ).all()
        
        if not deliveries:
            return 0.0
        
        total_runs = sum(d.runs for d in deliveries)
        balls_faced = len(deliveries)
        sr = (total_runs / balls_faced) * 100 if balls_faced > 0 else 0
        return round(sr, 2)
    
    def scoring_zones(self, player_id: int, db: Session) -> Dict:
        """
        Wagon wheel data: where the batter scores runs
        Returns percentage distribution to different field zones
        """
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id,
            Delivery.shot_direction.isnot(None),
            Delivery.runs > 0
        ).all()
        
        zones = {
            "cover": 0,
            "midwicket": 0,
            "straight": 0,
            "point": 0,
            "square_leg": 0,
            "third_man": 0,
            "fine_leg": 0,
            "long_on": 0,
            "long_off": 0,
        }
        
        for d in deliveries:
            if d.shot_direction in zones:
                zones[d.shot_direction] += d.runs
        
        total_runs = sum(zones.values())
        if total_runs > 0:
            for zone in zones:
                zones[zone] = round(zones[zone] / total_runs * 100, 1)
        
        # Find favorite zone
        favorite = max(zones, key=zones.get) if total_runs > 0 else "unknown"
        return {
            "zones": zones,
            "favorite_zone": favorite,
            "total_runs": total_runs,
        }
    
    def shot_ratio(self, player_id: int, db: Session) -> Dict:
        """
        Defensive vs aggressive shot ratio
        """
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id,
            Delivery.shot_type.isnot(None)
        ).all()
        
        aggressive_shots = ["drive", "cut", "pull", "sweep", "loft"]
        defensive_shots = ["defense", "block", "leave"]
        
        aggressive_count = sum(1 for d in deliveries if d.shot_type in aggressive_shots)
        defensive_count = sum(1 for d in deliveries if d.shot_type in defensive_shots)
        total = aggressive_count + defensive_count
        
        if total == 0:
            return {"aggressive_percent": 0, "defensive_percent": 0, "ratio": 0}
        
        agg_percent = round(aggressive_count / total * 100, 1)
        def_percent = round(defensive_count / total * 100, 1)
        ratio = round(aggressive_count / defensive_count, 2) if defensive_count > 0 else 999
        
        return {
            "aggressive_percent": agg_percent,
            "defensive_percent": def_percent,
            "aggressive_defensive_ratio": ratio,
        }
    
    def timing_consistency(self, player_id: int, db: Session) -> Dict:
        """
        Evaluate how consistently the batter times the ball (0-100)
        Uses shot_timing field from deliveries
        """
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id,
            Delivery.shot_timing > 0
        ).all()
        
        timings = [d.shot_timing for d in deliveries]
        if not timings:
            return {"avg_timing": 0, "std_dev": 0, "consistency": 0}
        
        avg = np.mean(timings)
        std = np.std(timings)
        consistency = max(0, 100 - std)  # lower std = higher consistency
        
        return {
            "avg_timing": round(avg, 1),
            "std_dev": round(std, 1),
            "consistency_score": round(consistency, 1),
        }
    
    def compare_to_professional(self, delivery: Delivery) -> Dict:
        """
        Compare a batting delivery to professional batsmen
        """
        # Features: shot_power, timing, shot_type
        shot_power = delivery.shot_power or 50
        timing = delivery.shot_timing or 50
        
        results = []
        for pro in self.professional_batsmen:
            # Simple similarity based on timing
            diff = abs(timing - pro["timing_score"])
            similarity = max(0, 100 - diff)
            results.append({
                "name": pro["name"],
                "similarity": round(similarity, 1),
                "strike_rate": pro["avg_strike_rate"],
            })
        
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return {
            "top_match": results[0] if results else None,
            "all_matches": results[:3]
        }