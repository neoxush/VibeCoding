extends SceneTree

func _init():
    print("Inspecting Animations...")
    # Load the Cat scene
    var cat_scene = load("res://creaturebundle/Meshes/SK_Cat.fbx")
    if cat_scene:
        var cat_instance = cat_scene.instantiate()
        # The AnimationPlayer is usually a child of the root node in the imported scene
        var anim_player = cat_instance.get_node_or_null("AnimationPlayer")
        
        if anim_player:
            print("AnimationPlayer found.")
            var anims = anim_player.get_animation_list()
            print("ANIMATIONS_START")
            for anim in anims:
                print(anim)
            print("ANIMATIONS_END")
        else:
            print("No AnimationPlayer found in root. Checking children...")
            for child in cat_instance.get_children():
                if child is AnimationPlayer:
                    print("Found AnimationPlayer on child: " + child.name)
                    var anims = child.get_animation_list()
                    print("ANIMATIONS_START")
                    for anim in anims:
                        print(anim)
                    print("ANIMATIONS_END")
    else:
        print("Failed to load SK_Cat.fbx")
    
    quit()
