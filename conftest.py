import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "besa-python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ethosterra-python"))
os.environ.setdefault("ETHOSTERRA_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
