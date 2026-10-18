extends Node2D

class_name Tile

# Properties
var grid_position: Vector2i
var type: String # e.g., "red", "blue", "green", "yellow"
var matched: bool = false
var match_flags: int = 0 # 1=Horizontal, 2=Vertical, 3=Both
var sprite: Sprite2D
var selected: bool = false
var is_thunder_gem: bool = false
var pulse_tween: Tween = null

func _ready():
	sprite = $Sprite2D
	
	# Apply the vivid shader
	var shader = load("res://assets/gem.gdshader")
	if shader:
		var mat = ShaderMaterial.new()
		mat.shader = shader
		sprite.material = mat

func set_piece(new_type: String, asset_path: String):
	type = new_type
	
	# Attempt robust loading of the texture
	var texture = load(asset_path)
	
	if texture == null:
		push_error("Failed to load texture: " + asset_path)
	
	if texture:
		sprite.texture = texture
		
		# Dynamic scaling to fit grid (roughly 100x100)
		var tex_size = texture.get_size()
		if tex_size.x > 0 and tex_size.y > 0:
			var target_size = Vector2(100, 100)
			var scale_factor = target_size / tex_size
			sprite.scale = scale_factor 
		
		# Apply vivid shader
		if sprite.material == null:
			var shader = load("res://assets/gem.gdshader")
			if shader:
				var mat = ShaderMaterial.new()
				mat.shader = shader
				sprite.material = mat
	else:
		push_error("Failed to load texture: " + asset_path)
		sprite.texture = null
		queue_redraw() 

func make_thunder_gem():
	is_thunder_gem = true
	type = "thunder"
	matched = false
	match_flags = 0
	set_piece("thunder", "res://assets/thunder_gem.svg")
	start_thunder_pulse()

func start_thunder_pulse():
	if pulse_tween and pulse_tween.is_valid():
		pulse_tween.kill()
	pulse_tween = create_tween().set_loops()
	pulse_tween.tween_property(self, "scale", Vector2(1.15, 1.15), 0.45).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	pulse_tween.tween_property(self, "scale", Vector2(1.0, 1.0), 0.45).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _draw():
	if is_thunder_gem:
		# Electric aura rings
		draw_arc(Vector2.ZERO, 46.0, 0, TAU, 32, Color(0.2, 0.8, 1.0, 0.8), 3.0)
		draw_arc(Vector2.ZERO, 50.0, 0, TAU, 32, Color(1.0, 0.9, 0.3, 0.5), 1.5)
	
	# Only draw fallback if texture is missing
	if sprite.texture == null:
		var color = Color.WHITE
		match type:
			"red": color = Color(0.9, 0.2, 0.2)
			"blue": color = Color(0.2, 0.2, 0.9)
			"green": color = Color(0.2, 0.9, 0.2)
			"yellow": color = Color(0.9, 0.9, 0.2)
			"thunder": color = Color(0.3, 0.7, 1.0)
		
		# Draw a more styled fallback
		draw_circle(Vector2.ZERO, 35, color)
		draw_circle(Vector2.ZERO, 30, color.lightened(0.2))
		draw_fallback_highlight(Rect2(-10, -10, 20, 20), color.darkened(0.2)) 
	
	if selected:
		var border_color = Color(1.0, 0.9, 0.2, 0.9) if is_thunder_gem else Color(1, 1, 1, 0.6)
		draw_rect(Rect2(-40, -40, 80, 80), border_color, false, 5.0)

func draw_fallback_highlight(rect, color):
	draw_rect(rect, color, true)
	
func select():
	selected = true
	queue_redraw()
	if pulse_tween and pulse_tween.is_valid():
		pulse_tween.kill()
	var tween = create_tween()
	tween.tween_property(self, "scale", Vector2(1.25, 1.25), 0.1)

func deselect():
	selected = false
	queue_redraw()
	var tween = create_tween()
	tween.tween_property(self, "scale", Vector2(1.0, 1.0), 0.1)
	if is_thunder_gem:
		tween.chain().tween_callback(start_thunder_pulse)

func move(target_pos: Vector2):
	# Simple tween for movement
	var tween = create_tween()
	tween.tween_property(self, "position", target_pos, 0.3).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

func dim():
	sprite.modulate = Color(1, 1, 1, 0.5)

func undim():
	sprite.modulate = Color(1, 1, 1, 1)
