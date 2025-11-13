# Product Overview

This is a procedural content generation (PCG) tool for Blender 3.6.22 that automates the creation of semi-open world level blockouts for game development.

## Purpose

The tool enables level designers to rapidly prototype game environments by drawing a spline curve that defines the path of their level, then automatically generating modular building blocks, terrain features, and spatial layouts along that path with configurable parameters. It prioritizes user-friendly workflows while maintaining professional-grade output suitable for technical level design.

## Core Workflow

1. User draws a spline/curve in Blender to define the level path
2. User adjusts generation parameters (spacing, density, terrain, etc.)
3. Tool samples points along the spline and generates spaces at each point
4. Building blocks and terrain are automatically created following the spline path
5. User can iterate by modifying the spline or parameters and regenerating

## Key Features

- Spline-driven layout: Draw curves to control level path and direction
- Modular building block generation (walls, floors, platforms, ramps) along the spline
- Semi-open world layout generation with spaces distributed along the spline path
- Terrain and ground feature generation following spline elevation
- Seed-based reproducible generation for consistent results
- Parameter presets for common scenarios (dense urban, open wilderness, etc.)
- Organized scene management with collections
- Default spline creation for quick start

## Target Users

Level designers working in Blender who need to quickly prototype game environments and establish spatial flow for exploration-based gameplay.
