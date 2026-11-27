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
var match_audio_player: AudioStreamPlayer = null
var clink_audio_player: AudioStreamPlayer = null
var kick_audio_player: AudioStreamPlayer = null
var milestone_chime_player: AudioStreamPlayer = null
var default_match_sfx: AudioStream = preload("res://assets/lightning_match.wav")
var clink_sfx: AudioStream = preload("res://assets/explosion-clinking.mp3")
var kick_sfx: AudioStream = preload("res://assets/skill-lightning-1s.mp3")
var milestone_sfx: AudioStream = preload("res://assets/skill-lightning-4s.mp3")
var cascade_count: int = 0
var is_busy: bool = false
var last_swapped_a: Vector2i = Vector2i(-1, -1)
var last_swapped_b: Vector2i = Vector2i(-1, -1)
var pending_thunder_gem_spawns: Dictionary = {}
var arc_lightning_line: Line2D = null
var cross_h_line: Line2D = null
var cross_v_line: Line2D = null

# Preload

var tile_scene = preload("res://scenes/tile.tscn")
var explosion_scene = preload("res://scenes/explosion_particles.tscn")
var explosion_counter_scene = preload("res://scenes/explosion_counter.tscn")

# Single explosion counter for the whole grid
var explosion_counter: Node2D = null


# Assets
var piece_types = ["red", "blue", "green", "yellow"]
var piece_assets = {
	"red": "res://assets/red_candy.svg",
	"blue": "res://assets/blue_candy.svg",
	"green": "res://assets/green_candy.svg",
	"yellow": "res://assets/yellow_candy.svg"
}

# Layout Constants for Section Identification
const RPG_AREA_HEIGHT: int = 240
const BRICK_BOARD_Y_START: int = 300

func _ready():
	print("!!! GRID SCRIPT STARTED !!!")
	# Initialize Layout Sections
	setup_layout_sections()
	
	all_pieces = make_2d_array()
	spawn_pieces()
	# Ensure RPG Area elements (gauge/counter) are active
	initialize_explosion_counter()
	
	match_audio_player = AudioStreamPlayer.new()
	match_audio_player.max_polyphony = 6
	add_child(match_audio_player)
	match_audio_player.stream = default_match_sfx

	clink_audio_player = AudioStreamPlayer.new()
	clink_audio_player.max_polyphony = 6
	add_child(clink_audio_player)
	clink_audio_player.stream = clink_sfx

	kick_audio_player = AudioStreamPlayer.new()
	kick_audio_player.max_polyphony = 4
	add_child(kick_audio_player)
	kick_audio_player.stream = kick_sfx

	milestone_chime_player = AudioStreamPlayer.new()
	milestone_chime_player.max_polyphony = 2
	add_child(milestone_chime_player)
	milestone_chime_player.stream = milestone_sfx
	
	# Dedicated Line2D for Zeus Arc Lightning effects
	arc_lightning_line = Line2D.new()
	arc_lightning_line.top_level = true
	arc_lightning_line.z_index = 650
	arc_lightning_line.width = 9.0
	arc_lightning_line.default_color = Color(0.4, 0.85, 1.0, 1.0)
	arc_lightning_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	arc_lightning_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	arc_lightning_line.hide()
	add_child(arc_lightning_line)

	# Dedicated Line2D nodes for Cross Lightning overcharge (row and column)
	cross_h_line = Line2D.new()
	cross_h_line.top_level = true
	cross_h_line.z_index = 660
	cross_h_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	cross_h_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	cross_h_line.hide()
	add_child(cross_h_line)

	cross_v_line = Line2D.new()
	cross_v_line.top_level = true
	cross_v_line.z_index = 660
	cross_v_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	cross_v_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	cross_v_line.hide()
	add_child(cross_v_line)
	
	call_deferred("_fix_background_texture")

func setup_layout_sections():
	# Identifying the two main zones:
	# 1. RPG Area (Top): Contains portraits, gauges, and combo notifications
	# 2. Brick Board (Bottom): The match-3 interactive grid
	y_start = BRICK_BOARD_Y_START
	print("Layout Ready: RPG Area Height=", RPG_AREA_HEIGHT, " Brick Board Start=", y_start)

func initialize_explosion_counter():
	# This widget resides in the RPG Area and uses a CanvasLayer for fixed UI
	if explosion_counter == null or not is_instance_valid(explosion_counter):
		explosion_counter = explosion_counter_scene.instantiate()
		explosion_counter.grid = self
		# Position (0,0) is fine as the internal CanvasLayer positions itself
		add_child(explosion_counter)

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
	if is_busy:
		return
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
	if is_busy:
		return
		
	var piece_a = all_pieces[pos_a.x][pos_a.y]
	var piece_b = all_pieces[pos_b.x][pos_b.y]
	
	if piece_a == null or piece_b == null:
		return

	last_swapped_a = pos_a
	last_swapped_b = pos_b

	# Check for Thunder Gem activation
	if piece_a.is_thunder_gem or piece_b.is_thunder_gem:
		is_busy = true
		# Swap in data
		all_pieces[pos_a.x][pos_a.y] = piece_b
		all_pieces[pos_b.x][pos_b.y] = piece_a
		piece_a.grid_position = pos_b
		piece_b.grid_position = pos_a
		piece_a.move(grid_to_pixel(pos_b.x, pos_b.y))
		piece_b.move(grid_to_pixel(pos_a.x, pos_a.y))
		await get_tree().create_timer(0.35).timeout
		
		if piece_a.is_thunder_gem and piece_b.is_thunder_gem:
			await cast_wrath_of_thundergod(pos_a, pos_b)
		else:
			var thunder_gem_pos = pos_b if piece_a.is_thunder_gem else pos_a
			var thunder_piece = all_pieces[thunder_gem_pos.x][thunder_gem_pos.y]
			var regular_pos = pos_a if piece_a.is_thunder_gem else pos_b
			var regular_piece = all_pieces[regular_pos.x][regular_pos.y]
			# Target elemental color matching the thunder gem (or swapped color if generic)
			var target_type = thunder_piece.type if (thunder_piece != null and piece_types.has(thunder_piece.type)) else (regular_piece.type if regular_piece != null else get_most_abundant_color())
			await cast_arc_lightning(thunder_gem_pos, target_type)
		is_busy = false
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
	
	# Check if this swap creates any matches
	if check_for_matches():
		# Reset cascade step for new move
		cascade_count = 0
		# Valid swap - destroy matches and continue game loop
		find_matches()
	else:
		# Invalid swap - no matches found, swap pieces back
		print("No match found, swapping back...")
		swap_back(pos_a, pos_b)

func check_for_matches() -> bool:
	# Check if there are any matches on the board without marking/destroying them
	for i in width:
		for j in height:
			if all_pieces[i][j] != null:
				var type = all_pieces[i][j].type
				# Horizontal check (center piece)
				if i > 0 and i < width - 1:
					if all_pieces[i-1][j] != null and all_pieces[i+1][j] != null:
						if all_pieces[i-1][j].type == type and all_pieces[i+1][j].type == type:
							return true
				# Vertical check (center piece)
				if j > 0 and j < height - 1:
					if all_pieces[i][j-1] != null and all_pieces[i][j+1] != null:
						if all_pieces[i][j-1].type == type and all_pieces[i][j+1].type == type:
							return true
	return false

func swap_back(pos_a, pos_b):
	# Swap the pieces back to their original positions
	var piece_a = all_pieces[pos_a.x][pos_a.y]
	var piece_b = all_pieces[pos_b.x][pos_b.y]
	
	if piece_a == null or piece_b == null:
		return
	
	# Swap in data (reverse)
	all_pieces[pos_a.x][pos_a.y] = piece_b
	all_pieces[pos_b.x][pos_b.y] = piece_a
	
	piece_a.grid_position = pos_b
	piece_b.grid_position = pos_a
	
	# Animate back to original positions
	piece_a.move(grid_to_pixel(pos_b.x, pos_b.y))
	piece_b.move(grid_to_pixel(pos_a.x, pos_a.y))

func find_matches():
	pending_thunder_gem_spawns.clear()
	
	# Horizontal check
	for j in height:
		var run_start = 0
		while run_start < width:
			if all_pieces[run_start][j] == null:
				run_start += 1
				continue
			var p_type = all_pieces[run_start][j].type
			var run_end = run_start + 1
			while run_end < width and all_pieces[run_end][j] != null and all_pieces[run_end][j].type == p_type:
				run_end += 1
			var run_len = run_end - run_start
			if run_len >= 3:
				var coords: Array[Vector2i] = []
				for k in range(run_start, run_end):
					all_pieces[k][j].matched = true
					all_pieces[k][j].match_flags |= 1
					coords.append(Vector2i(k, j))
				if run_len >= 5:
					# 5-match detected!
					var spawn_pos = choose_thunder_gem_spawn(coords)
					pending_thunder_gem_spawns[spawn_pos] = p_type
			run_start = run_end

	# Vertical check
	for i in width:
		var run_start = 0
		while run_start < height:
			if all_pieces[i][run_start] == null:
				run_start += 1
				continue
			var p_type = all_pieces[i][run_start].type
			var run_end = run_start + 1
			while run_end < height and all_pieces[i][run_end] != null and all_pieces[i][run_end].type == p_type:
				run_end += 1
			var run_len = run_end - run_start
			if run_len >= 3:
				var coords: Array[Vector2i] = []
				for k in range(run_start, run_end):
					all_pieces[i][k].matched = true
					all_pieces[i][k].match_flags |= 2
					coords.append(Vector2i(i, k))
				if run_len >= 5:
					# 5-match detected!
					var spawn_pos = choose_thunder_gem_spawn(coords)
					pending_thunder_gem_spawns[spawn_pos] = p_type
			run_start = run_end

	destroy_matches()

func choose_thunder_gem_spawn(coords: Array[Vector2i]) -> Vector2i:
	if coords.has(last_swapped_a):
		return last_swapped_a
	if coords.has(last_swapped_b):
		return last_swapped_b
	return coords[coords.size() / 2]

func destroy_matches():
	var was_matched = false
	var new_thunder_gems_created: Array[Vector2i] = []
	var detonating_thunder_gems: Array[Vector2i] = []

	for i in width:
		for j in height:
			var piece = all_pieces[i][j]
			if piece != null and piece.matched:
				was_matched = true
				var pos = Vector2i(i, j)
				
				# Check if this piece transforms into a Thunder Gem from a 5-match!
				if pending_thunder_gem_spawns.has(pos) and not new_thunder_gems_created.has(pos):
					new_thunder_gems_created.append(pos)
					var gem_color = pending_thunder_gem_spawns[pos]
					piece.make_thunder_gem(gem_color)
					spawn_thunder_creation_effect(grid_to_pixel(i, j), gem_color)
					continue
					
				# If an existing thunder gem was matched in a cascade
				if piece.is_thunder_gem:
					detonating_thunder_gems.append(pos)
					continue

				# Create explosion
				var explosion = explosion_scene.instantiate()
				explosion.position = grid_to_pixel(i, j)
				explosion.z_index = 100 # Ensure on top
				add_child(explosion)
				
				# Shape based on match direction
				var flags = piece.match_flags
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
				match piece.type:
					"red": explosion.color = Color(0.9, 0.2, 0.2)
					"blue": explosion.color = Color(0.2, 0.2, 0.9)
					"green": explosion.color = Color(0.2, 0.9, 0.2)
					"yellow": explosion.color = Color(0.9, 0.9, 0.2)
					_: explosion.color = Color(0.4, 0.8, 1.0)
				
				explosion.emitting = true
				
				piece.queue_free()
				all_pieces[i][j] = null

	pending_thunder_gem_spawns.clear()

	# Trigger Arc Lightning for any thunder gems caught in matches
	for tg_pos in detonating_thunder_gems:
		var tg_piece = all_pieces[tg_pos.x][tg_pos.y]
		var target_type = tg_piece.type if (tg_piece != null and piece_types.has(tg_piece.type)) else get_most_abundant_color()
		await cast_arc_lightning(tg_pos, target_type, false)

	# Trigger single counter for this match batch
	if was_matched:
		cascade_count += 1
		trigger_explosion_counter()
		play_match_sfx()
		print("Matches found and destroyed (cascade: ", cascade_count, ", combo: ", explosion_counter.count if explosion_counter else 0, ")")
		await get_tree().create_timer(0.4).timeout
		collapse_columns()
	else:
		cascade_count = 0

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

# Explosion Counter Functions
func trigger_explosion_counter():
	initialize_explosion_counter()
	explosion_counter.add_explosion()

func select_random_targets(count_to_select: int):
	var regular_positions = []
	var special_positions = []
	
	for i in width:
		for j in height:
			if all_pieces[i][j] != null:
				if all_pieces[i][j].is_thunder_gem:
					special_positions.append(Vector2i(i, j))
				else:
					regular_positions.append(Vector2i(i, j))
	
	regular_positions.shuffle()
	special_positions.shuffle()
	
	var chosen = []
	# Prioritize regular positions so Zeus's random strikes clear candies instead of sniping Thunder Gems
	for pos in regular_positions:
		if chosen.size() < count_to_select:
			chosen.append(pos)
			
	# If not enough regular pieces, include special pieces
	for pos in special_positions:
		if chosen.size() < count_to_select:
			chosen.append(pos)
			
	var targets = []
	for pos in chosen:
		targets.append(grid_to_pixel(pos.x, pos.y))
	return targets

func create_explosion_fx(pixel_pos: Vector2, color: Color = Color(1.0, 1.0, 1.4, 1.0)):
	var explosion = explosion_scene.instantiate()
	explosion.position = pixel_pos
	explosion.z_index = 110
	explosion.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	explosion.emission_sphere_radius = 40.0
	explosion.color = color
	explosion.scale_amount_min = 15.0
	explosion.scale_amount_max = 25.0
	add_child(explosion)
	explosion.emitting = true

func explode_at_position(pixel_pos: Vector2):
	var grid_pos = pixel_to_grid(pixel_pos)
	if not is_in_grid(grid_pos): return
	
	var piece = all_pieces[grid_pos.x][grid_pos.y]
	if piece == null: return
	
	create_explosion_fx(pixel_pos)
	
	# If a Thunder Gem is striked (by Zeus's skill or lightning),
	# activate the Cross Lightning overcharge bonus (row and column)!
	if piece.is_thunder_gem:
		print("Thunder Gem was STRIKED by chain lightning at ", grid_pos, "! Activating Cross Lightning overcharge!")
		await cast_cross_lightning(grid_pos, piece.type, false)
		return
	
	piece.queue_free()
	all_pieces[grid_pos.x][grid_pos.y] = null

func refill_after_lightning():
	cascade_count = 0
	collapse_columns()

# 20 distinct musical pentatonic scale steps across 4 octaves
# Octave 1 (Combos 1-5):   C4(0),  D4(2),  E4(4),  G4(7),  A4(9)
# Octave 2 (Combos 6-10):  C5(12), D5(14), E5(16), G5(19), A5(21)
# Octave 3 (Combos 11-15): C6(24), D6(26), E6(28), G6(31), A6(33)
# Octave 4 (Combos 16-20): C7(36), D7(38), E7(40), G7(43), C8(48 - Climax Summit)
const COMBO_SEMITONES: Array[int] = [
	0,  2,  4,  7,  9,
	12, 14, 16, 19, 21,
	24, 26, 28, 31, 33,
	36, 38, 40, 43, 48
]

func play_match_sfx(custom_combo: int = -1):
	if not match_audio_player:
		return
		
	var combo = custom_combo
	if combo <= 0:
		if explosion_counter and explosion_counter.count > 0:
			combo = explosion_counter.count
		elif cascade_count > 0:
			combo = cascade_count
		else:
			return
			
	# Fetch character/skill themed SFX if available
	var sfx: AudioStream = null
	if explosion_counter and explosion_counter.current_skill and explosion_counter.current_skill.match_sfx:
		sfx = explosion_counter.current_skill.match_sfx
	else:
		sfx = default_match_sfx
	
	if sfx:
		match_audio_player.stream = sfx
		
	var idx = clamp(combo - 1, 0, COMBO_SEMITONES.size() - 1)
	var semitone = COMBO_SEMITONES[idx]
	
	# Primary melodic strike note (musical pitch with wrapped base for acoustic clarity)
	var wrapped_semitone = semitone if semitone < 24 else (12 + (semitone % 12))
	match_audio_player.pitch_scale = pow(2.0, float(wrapped_semitone) / 12.0)
	match_audio_player.volume_db = lerp(-1.0, 3.5, clamp(float(combo) / 20.0, 0.0, 1.0))
	match_audio_player.play()
	
	# Harmonic crystalline chime overtone layer (joins at combo 5 and grows toward combo 20)
	if clink_audio_player and combo >= 5:
		var chime_pitch = pow(2.0, float(semitone) / 24.0)
		clink_audio_player.pitch_scale = chime_pitch
		clink_audio_player.volume_db = lerp(-5.0, 2.5, clamp(float(combo) / 20.0, 0.0, 1.0))
		clink_audio_player.play()
		
	# Acoustic "KICK" punch on milestones:
	if kick_audio_player:
		if combo == 5:
			# Tier 1 Milestone (5 combo): Low kick thump
			kick_audio_player.pitch_scale = 1.3
			kick_audio_player.volume_db = -5.0
			kick_audio_player.play()
		elif combo == 10:
			# Tier 2 Milestone (10 combo - Halfway to 20!): Resonant double-digit punch kick
			kick_audio_player.pitch_scale = 1.0
			kick_audio_player.volume_db = -1.0
			kick_audio_player.play()
		elif combo == 15:
			# Tier 3 Milestone (15 combo - High voltage surge): Deep electro kick
			kick_audio_player.pitch_scale = 0.85
			kick_audio_player.volume_db = +1.5
			kick_audio_player.play()
		elif combo >= 20:
			# Tier 4 Grand 20 Milestone: THE 20 COMBO KICK!
			# Deep thunder sub-bass punch
			kick_audio_player.pitch_scale = 0.65
			kick_audio_player.volume_db = +4.5
			kick_audio_player.play()

	# Grand celebration on reaching Combo 20:
	if combo >= 20:
		if milestone_chime_player:
			milestone_chime_player.pitch_scale = 1.5
			milestone_chime_player.volume_db = 2.0
			milestone_chime_player.play()

func on_combo_20_cap_reached():
	print("⚡ 20-COMBO CAP REACHED! OVERCHARGING BOARD & RESETTING COUNTER ⚡")
	play_match_sfx(20)
	cascade_count = 0
	
	var center_screen = grid_to_pixel(width / 2, height / 2)
	spawn_floating_text(center_screen, "⚡ 20x COMBO! ARC OVERCHARGE! ⚡", Color(1.0, 0.85, 0.2))
	
	convert_random_gem_to_thunder_gem()

func convert_random_gem_to_thunder_gem():
	var candidates: Array[Vector2i] = []
	for x in range(width):
		for y in range(height):
			var piece = all_pieces[x][y]
			if piece != null and is_instance_valid(piece) and not piece.is_thunder_gem and not piece.matched:
				candidates.append(Vector2i(x, y))
				
	if candidates.is_empty():
		print("20-Combo Overcharge: No regular candidate pieces found to convert.")
		return
		
	var chosen_pos = candidates.pick_random()
	var piece = all_pieces[chosen_pos.x][chosen_pos.y]
	if piece != null and is_instance_valid(piece):
		var gem_color = piece.type if piece_types.has(piece.type) else "blue"
		print("20-Combo Overcharge: Transformed gem at ", chosen_pos, " into a ", gem_color.to_upper(), " ARC Thunder Gem!")
		piece.make_thunder_gem(gem_color)
		var pixel_pos = grid_to_pixel(chosen_pos.x, chosen_pos.y)
		spawn_thunder_creation_effect(pixel_pos, gem_color)
		spawn_floating_text(pixel_pos, "⚡ ARC OVERCHARGE!", get_type_color(gem_color))
		
		# Animate an electric arc striking the transformed gem from the counter or sky
		var start_origin = explosion_counter.global_position if explosion_counter else grid_to_pixel(width / 2, 0)
		draw_electric_arc(start_origin, pixel_pos, get_type_color(gem_color))
		await get_tree().create_timer(0.12).timeout
		if arc_lightning_line:
			arc_lightning_line.hide()

# ==============================================================================
# ZEUS DOTA 2 BONUS: ELECTRIC THUNDER GEM & ARC LIGHTNING
# ==============================================================================

func get_type_color(type_name: String) -> Color:
	match type_name:
		"red": return Color(1.0, 0.25, 0.3)
		"green": return Color(0.25, 0.95, 0.35)
		"yellow": return Color(1.0, 0.9, 0.15)
		"blue": return Color(0.3, 0.8, 1.0)
		_: return Color(0.4, 0.85, 1.0)

func spawn_thunder_creation_effect(pixel_pos: Vector2, color_type: String = "blue"):
	# Zeus divine thunder strike on creation
	var explosion = explosion_scene.instantiate()
	explosion.position = pixel_pos
	explosion.z_index = 120
	explosion.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	explosion.emission_sphere_radius = 45.0
	var text_color = get_type_color(color_type)
	explosion.color = text_color.lightened(0.4)
	explosion.scale_amount_min = 20.0
	explosion.scale_amount_max = 35.0
	add_child(explosion)
	explosion.emitting = true
	
	if explosion_counter and explosion_counter.has_method("play_strike_sound"):
		explosion_counter.play_strike_sound()
	play_match_sfx()
		
	spawn_floating_text(pixel_pos, "⚡ " + color_type.to_upper() + " THUNDER GEM!", text_color)

func spawn_floating_text(pos: Vector2, text: String, color: Color = Color.WHITE):
	var lbl = Label.new()
	lbl.text = text
	lbl.z_index = 700
	lbl.position = pos - Vector2(100, 30)
	lbl.size = Vector2(200, 40)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.modulate = color
	lbl.add_theme_font_size_override("font_size", 24)
	add_child(lbl)
	
	var tw = create_tween()
	tw.set_parallel(true)
	tw.tween_property(lbl, "position:y", pos.y - 70, 0.75).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(lbl, "scale", Vector2(1.2, 1.2), 0.2)
	tw.tween_property(lbl, "modulate:a", 0.0, 0.75).set_delay(0.2)
	tw.chain().tween_callback(lbl.queue_free)

func get_most_abundant_color() -> String:
	var counts = {}
	for t in piece_types:
		counts[t] = 0
	for i in width:
		for j in height:
			var p = all_pieces[i][j]
			if p != null and not p.is_thunder_gem and counts.has(p.type):
				counts[p.type] += 1
				
	var best_type = piece_types[0]
	var max_c = -1
	for t in counts:
		if counts[t] > max_c:
			max_c = counts[t]
			best_type = t
	return best_type

func detonate_thunder_gem_strike(grid_pos: Vector2i):
	var piece = all_pieces[grid_pos.x][grid_pos.y]
	if piece == null: return
	
	var target_color = piece.type if piece_types.has(piece.type) else get_most_abundant_color()
	var text_color = get_type_color(target_color)
	spawn_thunder_creation_effect(grid_to_pixel(grid_pos.x, grid_pos.y), target_color)
	spawn_floating_text(grid_to_pixel(grid_pos.x, grid_pos.y), "⚡ " + target_color.to_upper() + " OVERCHARGED!", text_color)
	
	# Struck by chain lightning: trigger row & column Cross Lightning bonus!
	await cast_cross_lightning(grid_pos, target_color, false)

func generate_lightning_path(p1: Vector2, p2: Vector2, segments: int = 14, max_displace: float = 22.0) -> PackedVector2Array:
	var pts: Array[Vector2] = []
	pts.append(p1)
	for s in range(1, segments):
		var t = float(s) / segments
		var mid = p1.lerp(p2, t)
		var displace = max_displace * (1.0 - abs(t * 2.0 - 1.0))
		mid += Vector2(randf_range(-displace, displace), randf_range(-displace, displace))
		pts.append(mid)
	pts.append(p2)
	return PackedVector2Array(pts)

func cast_cross_lightning(thunder_pos: Vector2i, color_type: String = "blue", should_refill: bool = false):
	print("⚡ CROSS LIGHTNING OVERCHARGE at ", thunder_pos, "! Color: ", color_type)
	is_busy = true
	
	var center_pixel = grid_to_pixel(thunder_pos.x, thunder_pos.y)
	var elem_color = get_type_color(color_type)
	
	spawn_floating_text(center_pixel, "⚡ CROSS LIGHTNING! ⚡", elem_color.lightened(0.2))
	if explosion_counter and explosion_counter.has_method("play_strike_sound"):
		explosion_counter.play_strike_sound()
	play_match_sfx()

	# Remove the origin thunder piece first to avoid infinite recursion
	var thunder_piece = all_pieces[thunder_pos.x][thunder_pos.y]
	if thunder_piece != null:
		create_explosion_fx(center_pixel, elem_color.lightened(0.4))
		thunder_piece.queue_free()
		all_pieces[thunder_pos.x][thunder_pos.y] = null
		trigger_explosion_counter()

	# Full row (horizontal) and column (vertical) paths across the entire board
	var left_pixel = grid_to_pixel(0, thunder_pos.y) - Vector2(35, 0)
	var right_pixel = grid_to_pixel(width - 1, thunder_pos.y) + Vector2(35, 0)
	var top_pixel = grid_to_pixel(thunder_pos.x, 0) - Vector2(0, 35)
	var bottom_pixel = grid_to_pixel(thunder_pos.x, height - 1) + Vector2(0, 35)

	if cross_h_line and cross_v_line:
		cross_h_line.points = generate_lightning_path(left_pixel, right_pixel, 16, 20.0)
		cross_v_line.points = generate_lightning_path(top_pixel, bottom_pixel, 16, 20.0)
		
		# Bright white-hot initial flash
		cross_h_line.default_color = Color.WHITE.lerp(elem_color, 0.25)
		cross_v_line.default_color = Color.WHITE.lerp(elem_color, 0.25)
		cross_h_line.width = 16.0
		cross_v_line.width = 16.0
		cross_h_line.show()
		cross_v_line.show()

	# Collect all tiles along the entire row and column
	var tiles_to_destroy: Array[Vector2i] = []
	var chain_thunder_gems: Array[Vector2i] = []

	# Horizontal row
	for i in width:
		if i != thunder_pos.x:
			var p = Vector2i(i, thunder_pos.y)
			var pc = all_pieces[p.x][p.y]
			if pc != null:
				if pc.is_thunder_gem:
					chain_thunder_gems.append(p)
				else:
					tiles_to_destroy.append(p)

	# Vertical column
	for j in height:
		if j != thunder_pos.y:
			var p = Vector2i(thunder_pos.x, j)
			var pc = all_pieces[p.x][p.y]
			if pc != null:
				if pc.is_thunder_gem:
					if not chain_thunder_gems.has(p):
						chain_thunder_gems.append(p)
				else:
					if not tiles_to_destroy.has(p):
						tiles_to_destroy.append(p)

	await get_tree().create_timer(0.04).timeout

	# Saturated elemental color trail
	if cross_h_line and cross_v_line:
		cross_h_line.default_color = elem_color
		cross_v_line.default_color = elem_color
		cross_h_line.width = 8.0
		cross_v_line.width = 8.0

	# Explode all tiles along the cross
	for p in tiles_to_destroy:
		var target_pixel = grid_to_pixel(p.x, p.y)
		create_explosion_fx(target_pixel, elem_color)
		var piece = all_pieces[p.x][p.y]
		if piece != null:
			piece.queue_free()
			all_pieces[p.x][p.y] = null
			trigger_explosion_counter()

	if explosion_counter and explosion_counter.has_method("play_strike_sound"):
		explosion_counter.play_strike_sound()
	play_match_sfx()

	await get_tree().create_timer(0.18).timeout
	if cross_h_line: cross_h_line.hide()
	if cross_v_line: cross_v_line.hide()

	# Chain reaction: if any other Thunder Gems were caught in the crossfire!
	for sub_gem in chain_thunder_gems:
		var sub_piece = all_pieces[sub_gem.x][sub_gem.y]
		if sub_piece != null:
			var sub_color = sub_piece.type if piece_types.has(sub_piece.type) else "yellow"
			await cast_cross_lightning(sub_gem, sub_color, false)

	await get_tree().create_timer(0.15).timeout
	is_busy = false
	if should_refill:
		collapse_columns()

func cast_arc_lightning(thunder_pos: Vector2i, target_type: String, should_refill: bool = true):
	print("Zeus casting Arc Lightning! Target type: ", target_type)
	is_busy = true
	
	var arc_color = get_type_color(target_type)
	var start_pixel = grid_to_pixel(thunder_pos.x, thunder_pos.y)
	spawn_floating_text(start_pixel, "⚡ " + target_type.to_upper() + " ARC LIGHTNING!", arc_color)
	
	# Find all pieces matching target_type
	var targets: Array[Vector2i] = []
	for i in width:
		for j in height:
			var p = all_pieces[i][j]
			if p != null and p.type == target_type and Vector2i(i, j) != thunder_pos:
				targets.append(Vector2i(i, j))
				
	# If no pieces of that type exist, pick up to 5 random pieces
	if targets.is_empty():
		for i in width:
			for j in height:
				if all_pieces[i][j] != null and Vector2i(i, j) != thunder_pos:
					targets.append(Vector2i(i, j))
		targets.shuffle()
		targets = targets.slice(0, 5)

	# Sequential nearest-neighbor chain for Arc Lightning leap effect
	var ordered_targets: Array[Vector2i] = []
	var curr_pt = thunder_pos
	var pool = targets.duplicate()
	while not pool.is_empty():
		var closest_idx = 0
		var min_dist = 999999.0
		for idx in pool.size():
			var d = curr_pt.distance_squared_to(pool[idx])
			if d < min_dist:
				min_dist = d
				closest_idx = idx
		var next_pt = pool[closest_idx]
		ordered_targets.append(next_pt)
		curr_pt = next_pt
		pool.remove_at(closest_idx)

	# Explode the thunder gem itself
	var thunder_piece = all_pieces[thunder_pos.x][thunder_pos.y]
	if thunder_piece != null:
		create_explosion_fx(start_pixel, arc_color.lightened(0.4))
		thunder_piece.queue_free()
		all_pieces[thunder_pos.x][thunder_pos.y] = null
	
	trigger_explosion_counter()
	if explosion_counter and explosion_counter.has_method("play_strike_sound"):
		explosion_counter.play_strike_sound()
	play_match_sfx()

	# Arc leap through each target in sequence
	var current_source = start_pixel
	for target_coord in ordered_targets:
		var target_pixel = grid_to_pixel(target_coord.x, target_coord.y)
		await draw_electric_arc(current_source, target_pixel, arc_color)
		
		# Explode target piece
		var target_piece = all_pieces[target_coord.x][target_coord.y]
		if target_piece != null:
			if target_piece.is_thunder_gem:
				# Thunder Gem triggered by ongoing chain lightning: unleash Cross Lightning bonus!
				print("Ongoing Arc Lightning hit Thunder Gem at ", target_coord, "! Triggering Cross Lightning bonus!")
				await cast_cross_lightning(target_coord, target_piece.type, false)
			else:
				create_explosion_fx(target_pixel, arc_color)
				target_piece.queue_free()
				all_pieces[target_coord.x][target_coord.y] = null
			
		trigger_explosion_counter()
		play_match_sfx()
		if explosion_counter and explosion_counter.has_method("play_strike_sound"):
			explosion_counter.play_strike_sound()
			
		current_source = target_pixel
		await get_tree().create_timer(0.06).timeout
		
	if arc_lightning_line:
		arc_lightning_line.hide()
		
	await get_tree().create_timer(0.3).timeout
	is_busy = false
	if should_refill:
		collapse_columns()

func draw_electric_arc(p1: Vector2, p2: Vector2, arc_color: Color = Color(0.3, 0.8, 1.0)):
	if not arc_lightning_line:
		return
	arc_lightning_line.show()
	arc_lightning_line.modulate.a = 1.0
	
	var points: Array[Vector2] = []
	points.append(p1)
	var segments = 8
	for s in range(1, segments):
		var t = float(s) / segments
		var mid = p1.lerp(p2, t)
		var displace = 25.0 * (1.0 - abs(t * 2.0 - 1.0))
		mid += Vector2(randf_range(-displace, displace), randf_range(-displace, displace))
		points.append(mid)
	points.append(p2)
	
	arc_lightning_line.points = PackedVector2Array(points)
	arc_lightning_line.default_color = Color.WHITE.lerp(arc_color, 0.3)
	arc_lightning_line.width = 12.0
	await get_tree().create_timer(0.04).timeout
	arc_lightning_line.default_color = arc_color
	arc_lightning_line.width = 6.0
	await get_tree().create_timer(0.04).timeout

func cast_wrath_of_thundergod(pos_a: Vector2i, pos_b: Vector2i):
	print("Zeus Double Thunder Gem: Wrath of the Gods!")
	is_busy = true
	var p_a = grid_to_pixel(pos_a.x, pos_a.y)
	var p_b = grid_to_pixel(pos_b.x, pos_b.y)
	
	spawn_floating_text((p_a + p_b) * 0.5, "⚡ THUNDERGOD'S WRATH! ⚡", Color(1.0, 0.8, 0.1))
	
	if explosion_counter and explosion_counter.has_method("play_skill_sound"):
		explosion_counter.play_skill_sound()
		
	# Clear the two thunder gems
	if all_pieces[pos_a.x][pos_a.y]:
		all_pieces[pos_a.x][pos_a.y].queue_free()
		all_pieces[pos_a.x][pos_a.y] = null
	if all_pieces[pos_b.x][pos_b.y]:
		all_pieces[pos_b.x][pos_b.y].queue_free()
		all_pieces[pos_b.x][pos_b.y] = null
		
	# Staggered lightning strike across every tile on the board
	for j in height:
		for i in width:
			var piece = all_pieces[i][j]
			if piece != null:
				create_explosion_fx(grid_to_pixel(i, j))
				piece.queue_free()
				all_pieces[i][j] = null
				trigger_explosion_counter()
		await get_tree().create_timer(0.05).timeout
		
	await get_tree().create_timer(0.4).timeout
	is_busy = false
	collapse_columns()

func detonate_unswapped_thunder_gem(pos: Vector2i):
	var piece = all_pieces[pos.x][pos.y]
	var target_color = piece.type if (piece != null and piece_types.has(piece.type)) else get_most_abundant_color()
	await cast_arc_lightning(pos, target_color, true)
