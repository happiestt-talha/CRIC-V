# test_mediapipe_structure.py
import mediapipe as mp
print(f"MediaPipe version: {mp.__version__}")
print(f"MediaPipe file: {mp.__file__}")
print(f"\nAttributes in mediapipe module:")
for attr in dir(mp):
    if not attr.startswith('__'):
        print(f"  - {attr}")

# Try to explore the module
import inspect
print(f"\nModule structure:")
try:
    import mediapipe.python
    print("Found mediapipe.python")
except ImportError:
    print("No mediapipe.python submodule")