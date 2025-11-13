# CRITICAL: Preview/Generation Mismatch - Root Cause Found

## Problem Confirmed

From your screenshot:
- **Preview**: 3 black wireframe boxes
- **Generated**: 4 gray solid blocks in different positions
- **Seed input**: Doesn't seem to work

## Root Causes Identified

### 1. Random State Not Properly Managed

**In Preview (`preview_manager.py`):**
```python
def _create_space_boundary_previews(self, points):
    seed_to_use = seed_manager.initialize_seed(self.params.seed)
    random.seed(seed_to_use)
    # Creates main spaces...
    
def _create_lateral_space_previews(self, main_path_points):
    import random  # ← PROBLEM: Doesn't use the seed!
    # Random state is different here
```

**In Generation (`layout_generator.py`):**
```python
def __init__(self, seed, params, spline_points):
    random.seed(seed)  # Sets seed once
    # All generation uses this seed consistently
```

### 2. Seed Manager Side Effects

`seed_manager.initialize_seed()` generates a NEW random seed each time it's called with `seed=0`:

```python
# First call (preview):
seed_manager.initialize_seed(0) → returns 1731523456

# Second call (generation):
seed_manager.initialize_seed(0) → returns 1731523461  # DIFFERENT!
```

### 3. Building Block Generation Uses Different Logic

The preview shows SPACE boundaries, but generation creates BUILDING BLOCKS inside those spaces. The building block placement has its own randomization that isn't previewed.

---

## The Real Issue

**Preview shows:** Where spaces will be (wireframe boxes)
**Generation creates:** Building blocks INSIDE those spaces (walls, floors, etc.)

**These are two different things!**

Your screenshot shows:
- Preview wireframes = space boundaries
- Gray blocks = individual building blocks (walls, floors, platforms)

---

## Solutions

### Immediate Fix: Make Preview Match Generation Exactly

The preview needs to:
1. Use the EXACT same seed
2. NOT call `seed_manager.initialize_seed()` multiple times
3. Show building block positions, not just space boundaries

### Long-term Fix: Simplify the System

The current system is too complex with:
- Seed manager
- Random state in multiple places
- Preview and generation using different logic

---

## Recommended Action

I need to refactor the preview system to:

1. **Store the seed once**
2. **Use it consistently** in both preview and generation
3. **Preview the actual building blocks**, not just spaces

Would you like me to implement this fix? It will require:
- Refactoring how seeds are handled
- Making preview show actual building block positions
- Ensuring perfect 1:1 match between preview and generation

This is a significant fix but necessary for the tool to be useful.

**Should I proceed with this refactor?**
