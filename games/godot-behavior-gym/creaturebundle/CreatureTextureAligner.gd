@tool
extends Node3D
class_name CreatureTextureAligner

@export var species: String = "Cat":
	set(value):
		species = value
		if is_inside_tree():
			update_texture()

@export var variant: String = "":
	set(value):
		variant = value
		if is_inside_tree():
			update_texture()

func _ready():
	update_texture()

func update_texture():
	if species.is_empty():
		return
		
	var mesh_instance = find_mesh_instance(self)
	if not mesh_instance:
		# If running in editor, we might not have the child yet if it's being set up
		return

	var info = get_texture_prefix_and_variants(species)
	var prefix = info.prefix
	var variants = info.variants
	
	var current_variant = variant
	if current_variant.is_empty():
		if variants.size() > 0:
			current_variant = variants[0]
			print("No variant specified for " + species + ", using default: " + current_variant)
		else:
			push_warning("No variants found for " + species)
			# Try to proceed with empty variant if that's the case, or return?
			# If no variants found, maybe the naming convention is different.
			pass

	var material = StandardMaterial3D.new()
	
	# Construct base path: res://creaturebundle/Textures/Bat/T_ForestBat_
	var texture_path_base = "res://creaturebundle/Textures/" + species + "/" + prefix + "_"
	
	# Albedo
	var albedo_path = texture_path_base + current_variant + "_D.tga"
	if ResourceLoader.exists(albedo_path):
		material.albedo_texture = load(albedo_path)
	else:
		push_warning("Albedo texture not found: " + albedo_path)

	# Normal
	var normal_path = texture_path_base + "N.tga"
	if ResourceLoader.exists(normal_path):
		material.normal_enabled = true
		material.normal_texture = load(normal_path)
	
	# Roughness
	var roughness_path = texture_path_base + "R.tga"
	if ResourceLoader.exists(roughness_path):
		material.roughness_texture = load(roughness_path)
	
	# Ambient Occlusion
	var ao_path = texture_path_base + "AO.tga"
	if ResourceLoader.exists(ao_path):
		material.ao_enabled = true
		material.ao_texture = load(ao_path)
		
	# Emission
	var emission_path = texture_path_base + "E.tga"
	if ResourceLoader.exists(emission_path):
		material.emission_enabled = true
		material.emission_texture = load(emission_path)
	
	mesh_instance.material_override = material
	print("Applied texture for " + species + " variant " + current_variant)

func find_mesh_instance(node: Node) -> MeshInstance3D:
	if node is MeshInstance3D:
		return node
	for child in node.get_children():
		var result = find_mesh_instance(child)
		if result:
			return result
	return null

func get_texture_prefix_and_variants(species_name: String) -> Dictionary:
	var variants = []
	var prefix = ""
	var path = "res://creaturebundle/Textures/" + species_name
	var dir = DirAccess.open(path)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if not dir.current_is_dir() and file_name.ends_with("_D.tga"):
				# Found a diffuse texture, e.g., T_ForestBat_Bl_D.tga
				# Remove extension
				var base = file_name.left(file_name.length() - 6) # T_ForestBat_Bl
				
				# Find last underscore to separate prefix and variant
				var last_underscore = base.rfind("_")
				if last_underscore != -1:
					var v = base.substr(last_underscore + 1)
					var p = base.left(last_underscore) # T_ForestBat
					
					if prefix == "":
						prefix = p
					
					variants.append(v)
			file_name = dir.get_next()
		dir.list_dir_end()
	else:
		push_warning("Could not open directory: " + path)
	
	if prefix == "":
		prefix = "T_" + species_name
		
	return {"prefix": prefix, "variants": variants}
