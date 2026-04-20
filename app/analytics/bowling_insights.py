import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from app.core.models import Delivery, Session as DBSession, Analysis, Player
from app.services.icc_standards import MAX_ELBOW_EXTENSION_DEGREES

class BowlingInsights:
    def get_bowling_insights(self, player_id: int, db: Session) -> dict:
        """
        Comprehensive bowling insights for a player
        """
        deliveries = db.query(Delivery).join(DBSession).filter(
            DBSession.player_id == player_id
        ).all()

        if not deliveries:
            return {"player_id": player_id, "error": "No delivery data found"}

        # 1. Speed Consistency
        speeds = [d.speed_kmh for d in deliveries if d.speed_kmh]
        avg_speed = np.mean(speeds) if speeds else 0
        std_dev = np.std(speeds) if speeds else 0
        consistency_score = max(0, 100 - (std_dev / avg_speed * 100)) if avg_speed > 0 else 0
        
        # Speed Trend (last 10 vs previous 10)
        recent_10 = speeds[-10:]
        prev_10 = speeds[-20:-10]
        recent_avg = np.mean(recent_10) if recent_10 else 0
        prev_avg = np.mean(prev_10) if prev_10 else 0
        speed_trend = "improving" if recent_avg > prev_avg else "declining" if recent_avg < prev_avg else "stable"

        # 2. Line & Length Heatmap
        heatmap = self._generate_heatmap(deliveries)
        
        # 3. ICC Compliance
        total_d = len(deliveries)
        violations = sum(1 for d in deliveries if d.elbow_extension and d.elbow_extension > MAX_ELBOW_EXTENSION_DEGREES)
        compliant_pct = ((total_d - violations) / total_d) * 100 if total_d > 0 else 0
        avg_elbow = np.mean([d.elbow_extension for d in deliveries if d.elbow_extension]) if deliveries else 0

        # 4. Session Comparison
        sessions = db.query(DBSession).filter(DBSession.player_id == player_id).order_by(DBSession.created_at.desc()).limit(5).all()
        session_comp = []
        for s in sessions:
            s_deliveries = [d for d in deliveries if d.session_id == s.id]
            if s_deliveries:
                s_avg_speed = np.mean([d.speed_kmh for d in s_deliveries if d.speed_kmh])
                session_comp.append({
                    "session_id": s.id,
                    "date": s.created_at.strftime("%Y-%m-%d"),
                    "avg_speed": round(s_avg_speed, 1),
                    "accuracy_score": 80.0, # Placeholder
                    "total_deliveries": len(s_deliveries)
                })

        # 5. Recommendations
        recommendations = []
        if compliant_pct < 90:
            recommendations.append("Action needs correction - high percentage of illegal deliveries")
        if consistency_score < 70:
            recommendations.append("Focus on rhythm to improve speed consistency")
        if avg_speed < 120:
            recommendations.append("Work on explosive power in delivery stride")

        return {
            "player_id": player_id,
            "speed_consistency": {
                "avg_speed": round(avg_speed, 1),
                "std_dev": round(std_dev, 1),
                "consistency_score": round(consistency_score, 1),
                "total_deliveries": total_d,
                "max_speed": round(max(speeds), 1) if speeds else 0,
                "min_speed": round(min(speeds), 1) if speeds else 0,
                "speed_trend": speed_trend
            },
            "line_length_heatmap": heatmap,
            "icc_compliance": {
                "compliant_percentage": round(compliant_pct, 1),
                "total_violations": violations,
                "avg_elbow_angle": round(avg_elbow, 1),
                "violation_trend": "improving"
            },
            "session_comparison": session_comp,
            "recommendations": recommendations
        }

    def _generate_heatmap(self, deliveries):
        lines = ["outside_off", "off_stump", "middle_stump", "leg_stump", "outside_leg"]
        lengths = ["yorker", "full", "good_length", "short_of_length", "short"]
        
        heatmap_data = {line: {length: 0 for length in lengths} for line in lines}
        
        for d in deliveries:
            if d.line in heatmap_data and d.length in heatmap_data[d.line]:
                heatmap_data[d.line][d.length] += 1
        
        most_common_line = max(lines, key=lambda l: sum(heatmap_data[l].values()))
        most_common_length = max(lengths, key=lambda len_key: sum(heatmap_data[line][len_key] for line in lines))

        return {
            "heatmap": heatmap_data,
            "most_common_line": most_common_line,
            "most_common_length": most_common_length,
            "accuracy_score": 75.0
        }