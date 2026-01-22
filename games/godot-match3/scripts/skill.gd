class_name Skill
extends Resource

@export var name: String = "Skill"
@export var icon: Texture2D
@export var energy_cost: int = 4

# Context should contain:
# - grid: The game grid
# - runner: The node running the skill (for coroutines/timers)
# - visual_layer: Where to draw effects (e.g. the Lightning node)
# - origin_pos: Where effects start
func execute(context: Dictionary) -> void:
	pass
