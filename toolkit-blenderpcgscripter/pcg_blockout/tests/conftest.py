"""Pytest configuration to mock bpy module."""

import sys
from unittest.mock import MagicMock

class MockBpy:
    types = MagicMock()
    props = MagicMock()
    utils = MagicMock()
    ops = MagicMock()
    context = MagicMock()
    data = MagicMock()

# Mock bpy before any imports
sys.modules['bpy'] = MockBpy()
