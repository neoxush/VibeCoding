extends "res://scripts/skill.gd"

func _init():
	name = "Thundergod's Wrath"
	energy_cost = 4
	# Load the icon
	icon = load("res://assets/skill_zuus_thundergods_wrath.png")

func execute(context: Dictionary) -> void:
	var grid = context.get("grid")
	var runner = context.get("runner")
	var lightning_node = context.get("lightning_node")
	var origin_pos = context.get("origin_pos")
	
	if not grid or not runner or not lightning_node:
		push_error("Missing context for Thundergod skill")
		return

	print("CASTING THUNDERGOD'S WRATH!")
	
	if runner.has_method("play_skill_sound"):
		runner.play_skill_sound()
	
	# Logic adapted from original cast_lightning_chain
	var power = energy_cost
	if "max_volume" in runner:
		power = runner.max_volume
		
	var num_targets = floor(power / 2.0)
	
	# Wait a bit (visual timing)
	await runner.get_tree().create_timer(0.4).timeout
	
	if grid.has_method("select_random_targets"):
		var targets = grid.select_random_targets(num_targets)
		if not targets.is_empty():
			await animate_lightning(runner, lightning_node, origin_pos, targets, grid)
			if grid.has_method("refill_after_lightning"):
				grid.refill_after_lightning()

func animate_lightning(runner: Node, lightning: Line2D, start_pos: Vector2, targets: Array, grid: Node):
	lightning.show()
	lightning.modulate.a = 1.0
	
	for target_pos in targets:
		var points = []
		points.append(start_pos)
		
		var segments = 10
		for i in range(1, segments):
			var t = float(i) / segments
			var pos = start_pos.lerp(target_pos, t)
			var displace = 35.0 * (1.0 - abs(t * 2.0 - 1.0))
			pos += Vector2(randf_range(-displace, displace), randf_range(-displace, displace))
			points.append(pos)
		
		points.append(target_pos)
		
		for flash in range(2):
			lightning.points = PackedVector2Array(points)
			lightning.default_color = Color(4.0, 4.0, 4.0, 1)
			lightning.width = 14.0
			await runner.get_tree().create_timer(0.04).timeout
			lightning.default_color = Color(0.4, 0.7, 1.0, 1.0)
			lightning.width = 7.0
			await runner.get_tree().create_timer(0.04).timeout
		
		# Play strike sound
		if runner.has_method("play_strike_sound"):
			runner.play_strike_sound()
		
		if grid and grid.has_method("explode_at_position"):
			grid.explode_at_position(target_pos)
		
		var fade = runner.create_tween()
		fade.tween_property(lightning, "modulate:a", 0.0, 0.08)
		await runner.get_tree().create_timer(0.12).timeout
		lightning.modulate.a = 1.0
	
	lightning.hide()
