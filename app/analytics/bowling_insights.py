import numpy as np
from typing import List, Dict
from sqlalchemy.orm import Session
from app.core.models import Delivery, Player
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw  # pip install fastdtw
from app.analytics.pitch_mapping import get_line_length_score

class BowlingInsights:
    def __init__(self):
        # Professional bowlers database (could be loaded from DB)
        self.professional_bowlers = self.load_professional_bowlers()
    
    def load_professional_bowlers(self):
        # In production, load from a database table
        # For now, define some dummy profiles with key features
        return [
            {
                "name": "Jasprit Bumrah",
                "action_features": {
                    "elbow_extension": 8.5,
                    "release_height": 2.1,
                    "run_up_speed": 7.2,
                    "front_foot_angle": 45,
                },
                "avg_speed": 145.2,
                "economy": 4.8,
            },
            {
                "name": "Pat Cummins",
                "action_features": {
                    "elbow_extension": 6.2,
                    "release_height": 2.0,
                    "run_up_speed": 8.1,
                    "front_foot_angle": 40,
                },
                "avg_speed": 148.0,
                "economy": 4.5,
            },
            # Add more...
        ]
    
    def speed_consistency(self, player_id: int, db: Session) -> Dict:
        """Calculate speed consistency metrics across all deliveries for a player"""
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id,
            Delivery.speed_kmh > 0
        ).all()
        
        speeds = [d.speed_kmh for d in deliveries]
        if not speeds:
            return {"avg_speed": 0, "std_dev": 0, "consistency_score": 0}
        
        avg = np.mean(speeds)
        std = np.std(speeds)
        # Consistency score: 100 - (std/avg)*100 (higher is better)
        consistency = max(0, 100 - (std / avg * 100)) if avg > 0 else 0
        
        return {
            "avg_speed": round(avg, 1),
            "std_dev": round(std, 1),
            "consistency_score": round(consistency, 1),
            "total_deliveries": len(speeds),
            "max_speed": max(speeds),
            "min_speed": min(speeds),
        }
    
    def line_length_heatmap(self, player_id: int, db: Session) -> Dict:
        """Generate heatmap data for line and length"""
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id,
            Delivery.line.isnot(None),
            Delivery.length.isnot(None)
        ).all()
        
        # Create a 5x3 grid (5 lengths x 3 lines)
        lines = ["off", "middle", "leg"]
        lengths = ["yorker", "full", "good", "short", "bouncer"]
        
        heatmap = {line: {length: 0 for length in lengths} for line in lines}
        
        for d in deliveries:
            if d.line in heatmap and d.length in heatmap[d.line]:
                heatmap[d.line][d.length] += 1
        
        # Convert to percentages if needed
        total = len(deliveries)
        if total > 0:
            for line in lines:
                for length in lengths:
                    heatmap[line][length] = round(heatmap[line][length] / total * 100, 1)
        
        return {
            "heatmap": heatmap,
            "most_common_line": max(lines, key=lambda l: sum(heatmap[l].values())),
            "most_common_length": max(lengths, key=lambda l: sum(heatmap[line][l] for line in lines)),
        }
    
    def wicket_probability(self, delivery: Delivery) -> float:
        """
        Predict wicket probability for a single delivery based on its metrics
        Uses a simple weighted score (0-100)
        """
        # Base score from line/length
        line_score = get_line_length_score(delivery.line, delivery.length) if delivery.line and delivery.length else 30
        
        # Speed factor (faster = higher chance)
        speed = delivery.speed_kmh or 120
        speed_factor = min(speed / 150 * 30, 30)  # max 30 points
        
        # Swing factor
        swing = abs(delivery.swing_angle or 0)
        swing_factor = min(swing / 10 * 20, 20)  # max 20 points
        
        # Spin factor (for spinners)
        spin = delivery.spin_rpm or 0
        spin_factor = min(spin / 1000 * 20, 20)  # max 20 points
        
        total = line_score * 0.4 + speed_factor + swing_factor + spin_factor
        return min(total, 100)
    
    def economy_prediction(self, player_id: int, db: Session, match_context: Dict = None) -> float:
        """
        Predict economy rate for a player based on historical data and match context
        match_context could include overs left, pitch type, etc.
        """
        # Get historical economy from deliveries
        deliveries = db.query(Delivery).join(Delivery.session).filter(
            Session.player_id == player_id
        ).all()
        
        # If we had runs per delivery, we could compute actual economy
        # For now, use a placeholder based on avg speed
        avg_speed = np.mean([d.speed_kmh for d in deliveries if d.speed_kmh]) if deliveries else 120
        base_economy = 8.0 - (avg_speed - 120) * 0.02  # faster = lower economy
        
        # Adjust for match context
        if match_context:
            if match_context.get("pitch_type") == "batting_friendly":
                base_economy *= 1.1
            if match_context.get("overs_left", 10) < 5:
                base_economy *= 1.2  # death overs
        
        return round(base_economy, 2)
    
    def compare_to_professional(self, delivery: Delivery) -> Dict:
        """
        Compare a delivery's action to professional bowlers
        Returns similarity scores
        """
        # Features to compare: elbow_extension, release_height, speed, swing
        features = {
            "elbow_extension": delivery.elbow_extension or 10,
            "release_height": delivery.release_point_y or 2.0,
            "speed_kmh": delivery.speed_kmh or 120,
            "swing_angle": abs(delivery.swing_angle or 0),
        }
        
        results = []
        for pro in self.professional_bowlers:
            # Compute weighted Euclidean distance
            pro_features = pro["action_features"]
            diff_elbow = abs(features["elbow_extension"] - pro_features["elbow_extension"])
            diff_height = abs(features["release_height"] - pro_features["release_height"])
            diff_speed = abs(features["speed_kmh"] - pro["avg_speed"]) / 10  # normalize
            diff_swing = abs(features["swing_angle"] - 2) / 2  # assume pro swing ~2deg
            
            distance = np.sqrt(diff_elbow**2 + diff_height**2 + diff_speed**2 + diff_swing**2)
            similarity = max(0, 100 - distance * 10)  # convert to 0-100
            results.append({
                "name": pro["name"],
                "similarity": round(similarity, 1),
                "avg_speed": pro["avg_speed"],
            })
        
        # Sort by similarity
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return {
            "top_match": results[0] if results else None,
            "all_matches": results[:3]
        }