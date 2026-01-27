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
@onready var skill_label: Label = $UI/Content/SkillLabel
@onready var glow_bg: ColorRect = $UI/Content/GlowBackground
@onready var particles: CPUParticles2D = $UI/Content/Particles
@onready var content: Node2D = $UI/Content
@onready var energy_gauge: ProgressBar = $UI/EnergyGauge
@onready var lightning: Line2D = $Lightning
@onready var skill_icon: TextureRect = $UI/Content/SkillIcon

var current_skill: Resource = null

var current_tween: Tween = null
var wiggle_tween: Tween = null
var shake_tween: Tween = null
var is_disappearing: bool = false
var is_lingering: bool = false
var is_casting: bool = false
var base_rotation: float = 0.0
var content_original_pos: Vector2 = Vector2.ZERO
var skill_audio_player: AudioStreamPlayer = null
var strike_audio_player: AudioStreamPlayer = null
var skill_audio_queue: Array = []

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
	
	# Audio setup
	skill_audio_player = AudioStreamPlayer.new()
	strike_audio_player = AudioStreamPlayer.new()
	add_child(skill_audio_player)
	add_child(strike_audio_player)
	
	skill_audio_player.stream = load("res://assets/skill-lightning-4s.mp3")
	strike_audio_player.stream = load("res://assets/skill-lightning-1s.mp3")
	
	# Connect finished signal for queue management
	skill_audio_player.finished.connect(_on_skill_audio_finished)
	
	skill_label.visible = false
	if skill_icon: skill_icon.visible = false
	
	# Load default skill
	var skill_script = load("res://scripts/skills/skill_thundergod.gd")
	if skill_script:
		current_skill = skill_script.new()

func _process(delta):
	if reset_timer > 0 and not is_disappearing:
		reset_timer -= delta
		if reset_timer <= 0:
			disappear_animation()

func add_explosion():
	if current_tween and current_tween.is_valid(): current_tween.kill()
	if shake_tween and shake_tween.is_valid(): shake_tween.kill()
	
	if not is_casting:
		if is_disappearing:
			is_lingering = false
		is_disappearing = false
	
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
	
	if current_skill and energy >= current_skill.energy_cost and not is_casting:
		cast_skill()

func update_display():
	var display_text = ""
	var is_skill_ready = (current_skill and energy >= current_skill.energy_cost) or is_lingering or is_casting
	
	if is_skill_ready:
		if skill_icon and current_skill and current_skill.icon:
			skill_icon.texture = current_skill.icon
			skill_icon.visible = true
			if label: label.visible = false
		else:
			# Fallback if no icon
			display_text = "⚡"
			if label: 
				label.text = display_text
				label.visible = true
				
		skill_label.visible = true
		if current_skill:
			skill_label.text = "[" + current_skill.name + "]"
	elif count > 0:
		display_text = str(count)
		skill_label.visible = false
		if skill_icon: skill_icon.visible = false
		if label:
			label.text = display_text
			label.visible = true
	else:
		display_text = ""
		skill_label.visible = false
		if skill_icon: skill_icon.visible = false
		if label:
			label.text = ""
			label.visible = false

func update_gauge():
	if energy_gauge:
		energy_gauge.max_value = max_volume
		var gf_tween = create_tween()
		gf_tween.tween_property(energy_gauge, "value", energy, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func cast_skill():
	if is_casting or not current_skill: return
	is_casting = true
	
	update_display()
	content.visible = true 
	
	# Stop the combo reset timer while casting
	reset_timer = 0
	
	var context = {
		"grid": grid,
		"runner": self,
		"lightning_node": lightning,
		"origin_pos": content.global_position
	}
	
	await current_skill.execute(context)
	
	# Transition into lingering state for fade out
	energy = 0
	max_volume += 2
	count = 0
	is_lingering = true
	is_casting = false
	update_display()
	
	# Short delay before fading out
	await get_tree().create_timer(0.5).timeout
	
	if count > 0:
		# A new match started during the lingering phase!
		# Switch back to normal display without disappearing
		is_lingering = false
		update_display()
	else:
		update_gauge()
		disappear_animation()

# animate_lightning removed as it is now in the skill script

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

# Audio Management
func play_strike_sound():
	if strike_audio_player:
		# Use a separate player if we want overlapping strikes, 
		# but for now we just restart it for each strike.
		strike_audio_player.stop()
		strike_audio_player.play()

func play_skill_sound():
	if not skill_audio_player: return
	
	if skill_audio_player.playing:
		# Already playing, add to queue
		skill_audio_queue.append(skill_audio_player.stream)
		print("Skill audio playing, adding to queue. Queue size: ", skill_audio_queue.size())
	else:
		skill_audio_player.play()
		print("Playing skill audio.")

func _on_skill_audio_finished():
	if not skill_audio_queue.is_empty():
		var next_stream = skill_audio_queue.pop_front()
		skill_audio_player.stream = next_stream
		skill_audio_player.play()
		print("Playing next skill audio from queue.")
