"""Seed management system for reproducible random generation."""

import random
import time
from typing import Optional


# Global variable to store the current seed
_current_seed: Optional[int] = None


def initialize_seed(seed: Optional[int] = None) -> int:
    """
    Initialize the random state with a seed value.
    
    Args:
        seed: Optional seed value. If None, generates a random seed based on current time.
    
    Returns:
        The seed value that was used (either provided or generated).
    """
    global _current_seed
    
    if seed is None:
        # Generate a random seed based on current time
        seed = int(time.time() * 1000) % (2**31)
    
    _current_seed = seed
    random.seed(seed)
    
    return seed


def get_current_seed() -> Optional[int]:
    """
    Get the currently active seed value.
    
    Returns:
        The current seed value, or None if no seed has been initialized.
    """
    return _current_seed


def generate_random_seed() -> int:
    """
    Generate a new random seed value.
    
    Returns:
        A new random seed value based on current time.
    """
    return int(time.time() * 1000) % (2**31)
