"""
Map ball landing position to line and length zones
Uses normalized coordinates (0-1) assuming:
- x=0 is off side boundary, x=1 is leg side boundary
- y=0 is bowler's end, y=1 is batsman's end
"""
def classify_line(x: float) -> str:
    if x < 0.35:
        return "off"
    elif x < 0.65:
        return "middle"
    else:
        return "leg"

def classify_length(y: float) -> str:
    if y < 0.2:
        return "yorker"
    elif y < 0.4:
        return "full"
    elif y < 0.6:
        return "good"
    elif y < 0.8:
        return "short"
    else:
        return "bouncer"

# def get_line_length_score(line: str, length: str) -> float:
#     scores = {
#         ("off", "good"): 90,
#         ("middle", "good"): 85,
#         ("off", "full"): 70,
#         ("middle", "full"): 65,
#         ("leg", "good"): 50,
#         ("off", "short"): 40,
#         ("middle", "short"): 35,
#         ("leg", "short"): 20,
#         ("off", "yorker"): 80,
#         ("middle", "yorker"): 75,
#         ("leg", "yorker"): 30,
#         ("off", "bouncer"): 30,
#         ("middle", "bouncer"): 25,
#         ("leg", "bouncer"): 10,
#     }
#     return scores.get((line, length), 30)

def get_line_length_score(line: str, length: str) -> float:
    """
    Return a wicket-taking potential score (0-100) for a given line and length.
    """
    # Example heuristic – adjust based on cricket knowledge
    line_scores = {"off": 70, "middle": 50, "leg": 30}
    length_scores = {"yorker": 90, "full": 70, "good": 80, "short": 40, "bouncer": 30}
    
    line_score = line_scores.get(line, 40)
    length_score = length_scores.get(length, 40)
    
    # Weighted average
    return (line_score * 0.4 + length_score * 0.6)