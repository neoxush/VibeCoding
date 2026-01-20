extends Node2D

# State-of-the-Art "Juicy" Counter
# Features: Energy gauge, skill name display, lightning chain, camera shake, and elastic snap

var count: int = 0
var reset_timer: float = 0.0
const RESET_TIME: float = 5.0

var max_volume: int = 4
var energy: int = 0
var grid: Node2D = null

@onready var label: Label = $UI/Content/Label
@onready var shadow_label: Label = $UI/Content/ShadowLabel
@onready var skill_label: Label = $UI/Content/SkillLabel
@onready var shadow_skill_label: Label = $UI/Content/ShadowSkillLabel
@onready var glow_bg: ColorRect = $UI/Content/GlowBackground
@onready var particles: CPUParticles2D = $UI/Content/Particles
@onready var content: Node2D = $UI/Content
@onready var energy_gauge: ProgressBar = $UI/EnergyGauge
@onready var lightning: Line2D = $Lightning

var current_tween: Tween = null
var wiggle_tween: Tween = null
var shake_tween: Tween = null
var is_disappearing: bool = false
var is_lingering: bool = false
var base_rotation: float = 0.0
var content_original_pos: Vector2 = Vector2.ZERO

func _ready():
	count = 0
	energy = 0
	visible = true 
	content.visible = false
	content.scale = Vector2.ZERO
	content.modulate.a = 0.0
	content_original_pos = content.position
	update_gauge()
	lightning.hide()
	
	skill_label.visible = false
	shadow_skill_label.visible = false

func _process(delta):
	if reset_timer > 0 and not is_disappearing:
		reset_timer -= delta
		if reset_timer <= 0:
			disappear_animation()

func add_explosion():
	if current_tween and current_tween.is_valid(): current_tween.kill()
	if shake_tween and shake_tween.is_valid(): shake_tween.kill()
	
	is_disappearing = false
	is_lingering = false
	count += 1
	energy += 1
	reset_timer = RESET_TIME
	
	update_display()
	update_gauge()
	
	if not content.visible:
		content.visible = true
	
	if particles:
		particles.restart()
		particles.emitting = true
	
	premium_pop_animation()
	shake_effect()
	
	if energy >= max_volume:
		cast_lightning_chain()

func update_display():
	var display_text = ""
	var is_skill = (energy >= max_volume) or is_lingering
	
	if is_skill:
		display_text = "⚡"
		skill_label.visible = true
		shadow_skill_label.visible = true
	elif count > 0:
		display_text = str(count)
		skill_label.visible = false
		shadow_skill_label.visible = false
	else:
		display_text = ""
		skill_label.visible = false
		shadow_skill_label.visible = false
		
	if label:
		label.text = display_text
	if shadow_label:
		shadow_label.text = display_text

func update_gauge():
	if energy_gauge:
		energy_gauge.max_value = max_volume
		var gf_tween = create_tween()
		gf_tween.tween_property(energy_gauge, "value", energy, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func cast_lightning_chain():
	print("LIGHTNING CHAIN CAST!")
	var num_targets = floor(max_volume / 2.0)
	
	update_display()
	content.visible = true 
	
	# Stop the combo reset timer while casting
	reset_timer = 0
	
	await get_tree().create_timer(0.4).timeout

	if grid and grid.has_method("select_random_targets"):
		var targets = grid.select_random_targets(num_targets)
		if not targets.is_empty():
			await animate_lightning(targets)
			if grid.has_method("refill_after_lightning"):
				grid.refill_after_lightning()
	
	# Transition into lingering state for fade out
	energy = 0
	max_volume += 2
	count = 0
	is_lingering = true
	update_display()
	
	# Short delay before fading out
	await get_tree().create_timer(0.5).timeout
	update_gauge()
	disappear_animation()

func animate_lightning(targets: Array):
	lightning.show()
	lightning.modulate.a = 1.0
	# lightning is global, content.global_position is our anchor
	var start_pos = content.global_position
	
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
			await get_tree().create_timer(0.04).timeout
			lightning.default_color = Color(0.4, 0.7, 1.0, 1.0)
			lightning.width = 7.0
			await get_tree().create_timer(0.04).timeout
		
		if grid and grid.has_method("explode_at_position"):
			grid.explode_at_position(target_pos)
		
		var fade = create_tween()
		fade.tween_property(lightning, "modulate:a", 0.0, 0.08)
		await get_tree().create_timer(0.12).timeout
		lightning.modulate.a = 1.0
	
	lightning.hide()

func premium_pop_animation():
	if count <= 0 and energy < max_volume and not is_lingering: return
	if wiggle_tween and wiggle_tween.is_valid(): wiggle_tween.kill()
	
	base_rotation = deg_to_rad(randf_range(-10, 10))
	current_tween = create_tween()
	current_tween.set_parallel(true)
	current_tween.tween_property(content, "scale", Vector2(1.8, 1.8), 0.07).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	current_tween.tween_property(content, "modulate:a", 1.0, 0.03)
	current_tween.tween_property(content, "rotation", base_rotation, 0.08).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	
	label.modulate = Color(3.0, 3.0, 3.0, 1.0)
	current_tween.tween_property(label, "modulate", Color(1, 1, 1, 1), 0.2)
	
	current_tween.chain().set_parallel(true)
	current_tween.tween_property(content, "scale", Vector2(1.0, 1.0), 0.15).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	current_tween.chain().tween_callback(start_wiggle)

func shake_effect():
	shake_tween = create_tween()
	for i in range(4):
		var offset = Vector2(randf_range(-10, 10), randf_range(-10, 10))
		shake_tween.tween_property(content, "position", content_original_pos + offset, 0.03)
	shake_tween.tween_property(content, "position", content_original_pos, 0.03)

func start_wiggle():
	if wiggle_tween and wiggle_tween.is_valid(): wiggle_tween.kill()
	wiggle_tween = create_tween()
	wiggle_tween.set_loops()
	wiggle_tween.set_parallel(true)
	wiggle_tween.tween_property(content, "scale", Vector2(1.08, 1.08), 0.35).set_trans(Tween.TRANS_SINE)
	wiggle_tween.tween_property(content, "rotation", base_rotation + deg_to_rad(4), 0.3).set_trans(Tween.TRANS_SINE)
	wiggle_tween.chain().set_parallel(true)
	wiggle_tween.tween_property(content, "scale", Vector2(1.0, 1.0), 0.35).set_trans(Tween.TRANS_SINE)
	wiggle_tween.tween_property(content, "rotation", base_rotation - deg_to_rad(4), 0.3).set_trans(Tween.TRANS_SINE)

func disappear_animation():
	if is_disappearing: return
	is_disappearing = true
	if current_tween and current_tween.is_valid(): current_tween.kill()
	if wiggle_tween and wiggle_tween.is_valid(): wiggle_tween.kill()
	
	current_tween = create_tween()
	current_tween.set_parallel(true)
	current_tween.tween_property(content, "scale", Vector2(3.0, 3.0), 0.3).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	current_tween.tween_property(content, "modulate:a", 0.0, 0.3).set_trans(Tween.TRANS_SINE)
	current_tween.tween_property(content, "position", content.position + Vector2(0, -80), 0.3).set_trans(Tween.TRANS_QUAD)
	current_tween.chain().tween_callback(reset_counter)

func reset_counter():
	count = 0
	energy = 0
	update_gauge()
	content.visible = false
	content.scale = Vector2.ZERO
	content.modulate.a = 0.0
	content.rotation = 0.0
	content.position = content_original_pos
	is_disappearing = false
	is_lingering = false

func set_original_position(_pos: Vector2):
	# Ignored as we use fixed screen positions now
	pass
