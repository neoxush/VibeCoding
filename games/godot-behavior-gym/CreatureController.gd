extends CharacterBody3D
class_name CreatureController

# --- Configuration ---
const SPEED = 2.0
const RUN_SPEED = 6.0
const JUMP_VELOCITY = 4.5
const WANDER_RADIUS = 8.0
const RUN_RADIUS = 15.0

# --- State Enums ---
enum State { IDLE, WANDER, RUN, PERFORM_ACTION, PLAYER_CONTROL }
var cur_state = State.IDLE

# --- Dependencies ---
# Exported so we can assign different visuals for different animals
@export var visual_path: NodePath
var visual: Node3D

@onready var state_label = $StateLabel

var anim_player: AnimationPlayer
var gravity = ProjectSettings.get_setting("physics/3d/default_gravity")

# --- Animation Data ---
var anim_idle = "Idle"
var anim_walk = "Walk"
var anim_run = "Run"
var a_actions = [] # List of other animations
var current_anim = ""

# --- AI Variables ---
var target_pos: Vector3 = Vector3.ZERO
var state_timer: float = 0.0
var ai_enabled = true
var time_since_input = 0.0

@export var player_controllable: bool = false
@export var start_delay: float = 0.0

func _ready():
    # Delay start to avoid all animals processing on same frame exact same decision logic? 
    # Not strictly necessary but nice.
    
    if visual_path:
        visual = get_node(visual_path)
    else:
        # Fallback attempts
        var candidates = []
        for child in get_children():
            # Usually the mesh is a Node3D with the name of the asset
            if child is Node3D and not child is CollisionShape3D and not child is Label3D and not child is Camera3D and not child.name.begins_with("Camera"):
                candidates.append(child)
        
        if candidates.size() > 0:
            visual = candidates[0]
            print(name + ": Auto-detected visual node: " + visual.name)

    if not visual:
        if state_label: state_label.text = "Error: No Visual"
        return

    # 1. Find AnimationPlayer
    anim_player = visual.get_node_or_null("AnimationPlayer")
    if not anim_player:
        # Search children of visual
        for child in visual.get_children():
            if child is AnimationPlayer:
                anim_player = child
                break
    
    if anim_player:
        _analyze_animations()
    else:
        if state_label: state_label.text = "Error: No AnimPlayer"
        return

    # Start AI
    await get_tree().create_timer(start_delay).timeout
    _pick_new_state()

func _analyze_animations():
    var all_anims = anim_player.get_animation_list()
    # print(name, " Found ", all_anims.size(), " animations")
    
    a_actions.clear()
    
    # Try to map standard ones
    var found_idle = false
    var found_walk = false
    var found_run = false
    
    for anim in all_anims:
        var lower = anim.to_lower()
        if "idle" in lower:
            anim_idle = anim
            found_idle = true
        elif "walk" in lower:
            anim_walk = anim
            found_walk = true
        elif "run" in lower or "sprint" in lower:
            anim_run = anim
            found_run = true
        elif "t-pose" in lower or "reset" in lower:
            pass # Ignore reset
        elif "attack" in lower or "jump" in lower or "eat" in lower or "sit" in lower or "hit" in lower or "die" in lower or "dead" in lower or "sleep" in lower:
             # Prioritize interesting actions
            a_actions.append(anim)
        else:
            # Add unknown animations (slice_X) as actions too, so we see them
            a_actions.append(anim)

    # Fallbacks if criticals missing (common in some packs where Walk is just an unnamed slice)
    if not found_idle:
        if all_anims.size() > 0: anim_idle = all_anims[0]
    if not found_walk:
        if all_anims.size() > 1: anim_walk = all_anims[1]
    if not found_run:
         anim_run = anim_walk # Fallback

    # print(name, " Mapped Anims -> Idle:", anim_idle, " Walk:", anim_walk, " Run:", anim_run)

func _physics_process(delta):
    if not visual: return

    # Gravity
    if not is_on_floor():
        velocity.y -= gravity * delta

    # Input Override Check (Only if controllable)
    if player_controllable:
        var input_dir = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
        var is_jumping = Input.is_action_just_pressed("ui_accept")
        
        if input_dir.length() > 0 or is_jumping:
            cur_state = State.PLAYER_CONTROL
            ai_enabled = false
            time_since_input = 0.0
        else:
            time_since_input += delta
            if not ai_enabled and time_since_input > 3.0:
                ai_enabled = true
                _pick_new_state()

        if cur_state == State.PLAYER_CONTROL:
            _handle_player_movement(input_dir, is_jumping, delta)
            move_and_slide()
            _update_debug()
            return

    # AI State Machine
    if ai_enabled:
        match cur_state:
            State.IDLE:
                _handle_ai_idle(delta)
            State.WANDER:
                _handle_ai_move(delta, SPEED, anim_walk)
            State.RUN:
                 _handle_ai_move(delta, RUN_SPEED, anim_run)
            State.PERFORM_ACTION:
                _handle_ai_action(delta)

    move_and_slide()
    _update_debug()

func _update_debug():
    if state_label:
        state_label.text = State.keys()[cur_state] + "\n" + current_anim

# --- AI Logic ---

func _pick_new_state():
    state_timer = 0.0
    
    var roll = randf()
    
    # Probabilities
    if roll < 0.25:
        cur_state = State.IDLE
        state_timer = randf_range(2.0, 4.0)
        _play_anim(anim_idle)
        
    elif roll < 0.60:
        cur_state = State.WANDER
        target_pos = _get_random_pos(WANDER_RADIUS)
        _play_anim(anim_walk)
        
    elif roll < 0.70:
        cur_state = State.RUN
        target_pos = _get_random_pos(RUN_RADIUS)
        _play_anim(anim_run)
        
    else:
        cur_state = State.PERFORM_ACTION
        # Pick random action
        if a_actions.size() > 0:
            var action = a_actions.pick_random()
            _play_anim(action)
            state_timer = 2.0 
        else:
            # fallback
            cur_state = State.IDLE
            state_timer = 2.0
            _play_anim(anim_idle)

func _get_random_pos(radius: float) -> Vector3:
    var angle = randf() * TAU
    var dist = randf_range(2.0, radius)
    # Relative to spawn point would be better but simple relative to current is okay for chaos
    # Let's try to keep them somewhat near 0,0,0 so they don't fall off
    var origin = Vector3.ZERO
    return origin + Vector3(cos(angle), 0, sin(angle)) * dist

func _handle_ai_idle(delta):
    velocity.x = move_toward(velocity.x, 0, SPEED * delta)
    velocity.z = move_toward(velocity.z, 0, SPEED * delta)
    
    state_timer -= delta
    if state_timer <= 0:
        _pick_new_state()

func _handle_ai_move(delta, speed, anim_name):
    var dir = (target_pos - global_position)
    dir.y = 0
    if dir.length() < 0.5:
        # Reached
        velocity.x = 0
        velocity.z = 0
        _pick_new_state()
        return
        
    dir = dir.normalized()
    velocity.x = dir.x * speed
    velocity.z = dir.z * speed
    
    # Rotation
    var target_angle = atan2(dir.x, dir.z)
    visual.rotation.y = lerp_angle(visual.rotation.y, target_angle, 5 * delta)
    
    _play_anim(anim_name)

func _handle_ai_action(delta):
    velocity.x = move_toward(velocity.x, 0, SPEED * delta)
    velocity.z = move_toward(velocity.z, 0, SPEED * delta)
    
    state_timer -= delta
    if state_timer <= 0:
        _pick_new_state()

# --- Player Logic ---
func _handle_player_movement(input_dir, is_jumping, delta):
    if is_jumping and is_on_floor():
        velocity.y = JUMP_VELOCITY
        _play_anim("Jump")
        
    var direction = (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
    var is_running = Input.is_key_pressed(KEY_SHIFT)
    var current_speed = RUN_SPEED if is_running else SPEED

    if direction:
        velocity.x = direction.x * current_speed
        velocity.z = direction.z * current_speed
        
        var target_angle = atan2(direction.x, direction.z)
        visual.rotation.y = lerp_angle(visual.rotation.y, target_angle, 10 * delta)
        
        if is_running:
            _play_anim(anim_run)
        else:
            _play_anim(anim_walk)
    else:
        velocity.x = move_toward(velocity.x, 0, current_speed)
        velocity.z = move_toward(velocity.z, 0, current_speed)
        _play_anim(anim_idle)

# --- Helper ---
func _play_anim(name: String):
    if current_anim == name:
        return
    if anim_player and anim_player.has_animation(name):
        anim_player.play(name, 0.25)
        current_anim = name
