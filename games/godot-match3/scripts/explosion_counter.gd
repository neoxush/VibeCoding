extends Node2D

# State-of-the-Art "Juicy" Counter
# Features: Energy particles, camera shake, layered text, and elastic snap

var count: int = 0
var reset_timer: float = 0.0
const RESET_TIME: float = 5.0

@onready var label: Label = $Label
@onready var shadow_label: Label = $ShadowLabel
@onready var glow_bg: ColorRect = $GlowBackground
@onready var particles: CPUParticles2D = $Particles

var current_tween: Tween = null
var wiggle_tween: Tween = null
var shake_tween: Tween = null
var is_disappearing: bool = false
var base_rotation: float = 0.0
var original_position: Vector2 = Vector2.ZERO

func _ready():
	count = 0
	visible = false
	scale = Vector2.ZERO
	modulate.a = 0.0

func _process(delta):
	if reset_timer > 0 and not is_disappearing:
		reset_timer -= delta
		if reset_timer <= 0:
			disappear_animation()

func add_explosion():
	# Cancel all current animations
	if current_tween and current_tween.is_valid(): current_tween.kill()
	if shake_tween and shake_tween.is_valid(): shake_tween.kill()
	
	is_disappearing = false
	count += 1
	reset_timer = RESET_TIME
	update_display()
	visible = true
	
	# VFX Trigger: Energy Burst
	if particles:
		particles.restart()
		particles.emitting = true
	
	# Execute high-energy pop
	premium_pop_animation()
	shake_effect()

func update_display():
	if label:
		label.text = str(count)
	if shadow_label:
		shadow_label.text = str(count)

func premium_pop_animation():
	if wiggle_tween and wiggle_tween.is_valid():
		wiggle_tween.kill()
	
	# Random tilt
	base_rotation = deg_to_rad(randf_range(-10, 10))
	current_tween = create_tween()
	
	# FAST POP UP
	current_tween.set_parallel(true)
	current_tween.tween_property(self, "scale", Vector2(1.8, 1.8), 0.07).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	current_tween.tween_property(self, "modulate:a", 1.0, 0.03)
	current_tween.tween_property(self, "rotation", base_rotation, 0.08).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	
	# Intense Flash
	label.modulate = Color(3.0, 3.0, 3.0, 1.0)
	current_tween.tween_property(label, "modulate", Color(1, 1, 1, 1), 0.2)
	
	# Snap Back
	current_tween.chain().set_parallel(true)
	current_tween.tween_property(self, "scale", Vector2(1.0, 1.0), 0.15).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	
	current_tween.chain().tween_callback(start_wiggle)

func shake_effect():
	# Creates a subtle "heavy" impact feel
	shake_tween = create_tween()
	for i in range(4):
		var offset = Vector2(randf_range(-10, 10), randf_range(-10, 10))
		shake_tween.tween_property(self, "position", original_position + offset, 0.03)
	shake_tween.tween_property(self, "position", original_position, 0.03)

func start_wiggle():
	if wiggle_tween and wiggle_tween.is_valid():
		wiggle_tween.kill()
	
	wiggle_tween = create_tween()
	wiggle_tween.set_loops()
	
	wiggle_tween.set_parallel(true)
	wiggle_tween.tween_property(self, "scale", Vector2(1.08, 1.08), 0.35).set_trans(Tween.TRANS_SINE)
	wiggle_tween.tween_property(self, "rotation", base_rotation + deg_to_rad(4), 0.3).set_trans(Tween.TRANS_SINE)
	
	wiggle_tween.chain().set_parallel(true)
	wiggle_tween.tween_property(self, "scale", Vector2(1.0, 1.0), 0.35).set_trans(Tween.TRANS_SINE)
	wiggle_tween.tween_property(self, "rotation", base_rotation - deg_to_rad(4), 0.3).set_trans(Tween.TRANS_SINE)

func disappear_animation():
	is_disappearing = true
	if current_tween and current_tween.is_valid(): current_tween.kill()
	if wiggle_tween and wiggle_tween.is_valid(): wiggle_tween.kill()
	
	current_tween = create_tween()
	
	# Ballon Out + Dissolve
	current_tween.set_parallel(true)
	current_tween.tween_property(self, "scale", Vector2(3.0, 3.0), 0.3).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	current_tween.tween_property(self, "modulate:a", 0.0, 0.3).set_trans(Tween.TRANS_SINE)
	current_tween.tween_property(self, "position", position + Vector2(0, -80), 0.3).set_trans(Tween.TRANS_QUAD)
	
	current_tween.chain().tween_callback(reset_counter)

func reset_counter():
	count = 0
	visible = false
	scale = Vector2.ZERO
	modulate.a = 0.0
	rotation = 0.0
	is_disappearing = false
	position = original_position

func set_original_position(pos: Vector2):
	original_position = pos
	position = pos
