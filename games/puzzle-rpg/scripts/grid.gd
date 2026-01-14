extends Node2D

# Config
@export var width: int = 6
@export var height: int = 8
@export var x_start: int = 70
@export var y_start: int = 200 
@export var offset: int = 110 
@export var empty_spaces: Array[Vector2i] = [] 

# State
var all_pieces = [] # 2D array
var current_matches = []
var touch_start = Vector2.ZERO
var touch_end = Vector2.ZERO
var controlling: bool = false
var first_touch = Vector2i.ZERO
var final_touch = Vector2i.ZERO
var is_dragging = false

# Preload

var tile_scene = preload("res://scenes/tile.tscn")
var explosion_scene = preload("res://scenes/explosion_particles.tscn")


# Assets
var piece_types = ["red", "blue", "green", "yellow"]
var piece_assets = {
	"red": "res://assets/red_candy.svg",
	"blue": "res://assets/blue_candy.svg",
	"green": "res://assets/green_candy.svg",
	"yellow": "res://assets/yellow_candy.svg"
}

func _ready():
	print("!!! GRID SCRIPT STARTED !!!")
	print("Viewport Rect: ", get_viewport_rect())
	print("Grid Settings: Width=", width, " Height=", height, " X=", x_start)
	print("Grid initialized")
	all_pieces = make_2d_array()
	spawn_pieces()
	# Fix background last so it doesn't block gameplay
	call_deferred("_fix_background_texture")

func _fix_background_texture():
	print("Attempting to fix background...")
	# Try to find the new structure or the old one
	var bg_layer = get_parent().get_node_or_null("BackgroundLayer")
	var bg_rect = null
	
	if bg_layer:
		bg_rect = bg_layer.get_node_or_null("ColorRect")
	else:
		bg_rect = get_parent().get_node_or_null("Background")
		
	if bg_rect == null:
		print("Background node not found, skipping texture load.")
		return

	# Try to load the texture safely
	var path = "res://assets/background.svg"
	var tex = load(path)
	
	if tex == null:
		print("Background load failed. Keeping fallback color.")
	
	# If we successfully loaded the texture, replace the ColorRect with a TextureRect
	# If we successfully loaded the texture, replace the ColorRect with a TextureRect
	if tex:
		print("Background loaded. Applying texture.")
		var new_bg = TextureRect.new()
		new_bg.name = "BackgroundTexture"
		new_bg.texture = tex
		new_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		new_bg.custom_minimum_size = Vector2(720, 1280)
		new_bg.size = Vector2(720, 1280)
		new_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		
		# Add new BG
		bg_rect.get_parent().add_child(new_bg)
		bg_rect.get_parent().move_child(new_bg, 0)
		
		# Hide the fallback ColorRect
		bg_rect.visible = false
	else:
		print("Background load failed. Keeping fallback color.")


func make_2d_array():
	var array = []
	for i in width:
		array.append([])
		for j in height:
			array[i].append(null)
	return array

func spawn_pieces():
	for i in width:
		for j in height:
			# Random loop to avoid immediate matches
			var loops = 0
			var rand_type = piece_types[randi() % piece_types.size()]
			
			while (match_at(i, j, rand_type) and loops < 100):
				rand_type = piece_types[randi() % piece_types.size()]
				loops += 1
			
			var piece = tile_scene.instantiate()
			add_child(piece)
			piece.position = grid_to_pixel(i, j)
			piece.grid_position = Vector2i(i, j)
			piece.set_piece(rand_type, piece_assets[rand_type])
			all_pieces[i][j] = piece
	print("Grid generated with ", width * height, " pieces.")


func grid_to_pixel(column, row):
	var new_x = x_start + offset * column
	var new_y = y_start + offset * row
	return Vector2(new_x, new_y)

func pixel_to_grid(pixel_pos: Vector2):
	var t = pixel_pos
	t.x -= x_start
	t.y -= y_start
	t /= offset
	return Vector2i(round(t.x), round(t.y))

func match_at(i, j, type):
	if i > 1:
		if all_pieces[i-1][j] != null and all_pieces[i-2][j] != null:
			if all_pieces[i-1][j].type == type and all_pieces[i-2][j].type == type:
				return true
	if j > 1:
		if all_pieces[i][j-1] != null and all_pieces[i][j-2] != null:
			if all_pieces[i][j-1].type == type and all_pieces[i][j-2].type == type:
				return true
	return false

# Input Handling
func _unhandled_input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				touch_start = event.position
				var grid_pos = pixel_to_grid(touch_start)
				print("Click at: ", touch_start, " Grid: ", grid_pos)
				
				if is_in_grid(grid_pos):
					controlling = true
					first_touch = grid_pos
					if all_pieces[grid_pos.x][grid_pos.y] != null:
						all_pieces[grid_pos.x][grid_pos.y].select()
			else:
				# Released
				if controlling:
					touch_end = event.position
					var grid_pos = pixel_to_grid(touch_end)
					print("Release at: ", touch_end, " Grid: ", grid_pos)
					
					# Deselect first piece
					if is_in_grid(first_touch) and all_pieces[first_touch.x][first_touch.y] != null:
						all_pieces[first_touch.x][first_touch.y].deselect()

					if is_in_grid(grid_pos) and first_touch != grid_pos:
						final_touch = grid_pos
						touch_difference(first_touch, final_touch)
					
					# Always reset control state on release
					controlling = false


func is_in_grid(grid_pos):
	if grid_pos.x >= 0 and grid_pos.x < width:
		if grid_pos.y >= 0 and grid_pos.y < height:
			return true
	return false

func touch_difference(start, end):
	var difference = end - start
	var abs_x = abs(difference.x)
	var abs_y = abs(difference.y)
	
	print("Swap requested: ", start, " -> ", end)
	
	if abs_x > abs_y:
		if difference.x > 0:
			swap_pieces(start, Vector2i(start.x + 1, start.y))
		elif difference.x < 0:
			swap_pieces(start, Vector2i(start.x - 1, start.y))
	elif abs_y > abs_x:
		if difference.y > 0:
			swap_pieces(start, Vector2i(start.x, start.y + 1))
		elif difference.y < 0:
			swap_pieces(start, Vector2i(start.x, start.y - 1))

func swap_pieces(pos_a, pos_b):
	if not is_in_grid(pos_a) or not is_in_grid(pos_b):
		return
		
	var piece_a = all_pieces[pos_a.x][pos_a.y]
	var piece_b = all_pieces[pos_b.x][pos_b.y]
	
	if piece_a == null or piece_b == null:
		return

	# Swap in data
	all_pieces[pos_a.x][pos_a.y] = piece_b
	all_pieces[pos_b.x][pos_b.y] = piece_a
	
	piece_a.grid_position = pos_b
	piece_b.grid_position = pos_a
	
	# Swap visually
	piece_a.move(grid_to_pixel(pos_b.x, pos_b.y))
	piece_b.move(grid_to_pixel(pos_a.x, pos_a.y))
	
	await get_tree().create_timer(0.4).timeout
	
	find_matches()

func find_matches():
	# Reset flags first? No, we just need to set them for new matches.
	# But technically we should clear them if we are re-scanning? 
	# Actually pieces are created fresh or moved. Existing matches are destroyed.
	
	for i in width:
		for j in height:
			if all_pieces[i][j] != null:
				var type = all_pieces[i][j].type
				# Horizontal
				if i > 0 and i < width - 1:
					if all_pieces[i-1][j] != null and all_pieces[i+1][j] != null:
						if all_pieces[i-1][j].type == type and all_pieces[i+1][j].type == type:
							all_pieces[i-1][j].matched = true
							all_pieces[i][j].matched = true
							all_pieces[i+1][j].matched = true
							
							all_pieces[i-1][j].match_flags |= 1 # Horizontal
							all_pieces[i][j].match_flags |= 1
							all_pieces[i+1][j].match_flags |= 1
							
				# Vertical
				if j > 0 and j < height - 1:
					if all_pieces[i][j-1] != null and all_pieces[i][j+1] != null:
						if all_pieces[i][j-1].type == type and all_pieces[i][j+1].type == type:
							all_pieces[i][j-1].matched = true
							all_pieces[i][j].matched = true
							all_pieces[i][j+1].matched = true
							
							all_pieces[i][j-1].match_flags |= 2 # Vertical
							all_pieces[i][j].match_flags |= 2
							all_pieces[i][j+1].match_flags |= 2
	
	destroy_matches()

func destroy_matches():
	var was_matched = false
	for i in width:
		for j in height:
			if all_pieces[i][j] != null and all_pieces[i][j].matched:
				was_matched = true
				
				# Create explosion
				var explosion = explosion_scene.instantiate()
				explosion.position = grid_to_pixel(i, j)
				explosion.z_index = 100 # Ensure on top
				add_child(explosion)
				
				# Shape based on match direction
				var flags = all_pieces[i][j].match_flags
				if (flags & 1) and not (flags & 2):
					# Horizontal Match
					explosion.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
					explosion.emission_rect_extents = Vector2(40, 10)
				elif (flags & 2) and not (flags & 1):
					# Vertical Match
					explosion.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
					explosion.emission_rect_extents = Vector2(10, 40)
				else:
					# Both or undefined
					explosion.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
					explosion.emission_sphere_radius = 25.0

				
				# Set color based on type
				match all_pieces[i][j].type:
					"red": explosion.color = Color(0.9, 0.2, 0.2)
					"blue": explosion.color = Color(0.2, 0.2, 0.9)
					"green": explosion.color = Color(0.2, 0.9, 0.2)
					"yellow": explosion.color = Color(0.9, 0.9, 0.2)
				
				explosion.emitting = true
				
				all_pieces[i][j].queue_free()
				all_pieces[i][j] = null
	
	if was_matched:
		print("Matches found and destroyed")
		await get_tree().create_timer(0.4).timeout
		collapse_columns()
	else:
		pass

func collapse_columns():
	for i in width:
		for j in range(height - 1, -1, -1):
			if all_pieces[i][j] == null:
				# Find match above
				for k in range(j - 1, -1, -1):
					if all_pieces[i][k] != null:
						all_pieces[i][k].move(grid_to_pixel(i, j))
						all_pieces[i][j] = all_pieces[i][k]
						all_pieces[i][k] = null
						all_pieces[i][j].grid_position = Vector2i(i, j)
						break
	
	await get_tree().create_timer(0.4).timeout
	refill_columns()

func refill_columns():
	for i in width:
		for j in height:
			if all_pieces[i][j] == null:
				# Spawn new piece
				var rand_type = piece_types[randi() % piece_types.size()]
				var piece = tile_scene.instantiate()
				add_child(piece)
				
				# Start position (above screen)
				piece.position = grid_to_pixel(i, j - height - 2) 
				var target_pos = grid_to_pixel(i, j)
				
				piece.grid_position = Vector2i(i, j)
				piece.set_piece(rand_type, piece_assets[rand_type])
				piece.move(target_pos)
				all_pieces[i][j] = piece
				
	await get_tree().create_timer(0.4).timeout
	find_matches()
