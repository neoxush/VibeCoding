"""Scene management system for organizing generated content in Blender."""

import bpy
from datetime import datetime
from typing import List, Optional, Tuple
from .parameters import GenerationParams


def create_collection(name: str) -> bpy.types.Collection:
    """
    Create a new collection in the Blender scene.
    
    Args:
        name: Name for the new collection
    
    Returns:
        The created collection
    """
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def organize_objects(objects: List[bpy.types.Object], collection_name: str) -> bpy.types.Collection:
    """
    Move objects to a specified collection.
    
    Args:
        objects: List of objects to organize
        collection_name: Name of the target collection
    
    Returns:
        The collection containing the objects
    """
    # Get or create the collection
    collection = bpy.data.collections.get(collection_name)
    if collection is None:
        collection = create_collection(collection_name)
    
    # Move objects to the collection
    for obj in objects:
        # Remove from all other collections
        for coll in obj.users_collection:
            coll.objects.unlink(obj)
        
        # Add to target collection
        collection.objects.link(obj)
    
    return collection


def cleanup_previous_generation():
    """
    Remove old PCG generation collections from the scene.
    """
    collections_to_remove = []
    
    # Find all PCG generation collections
    for collection in bpy.data.collections:
        if collection.name.startswith("PCG_Generation_"):
            collections_to_remove.append(collection)
    
    # Remove collections and their objects
    for collection in collections_to_remove:
        # Remove all objects in the collection
        for obj in collection.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        
        # Remove the collection
        bpy.data.collections.remove(collection)


def store_metadata(collection: bpy.types.Collection, params: GenerationParams):
    """
    Save generation parameters to collection custom properties.
    
    Args:
        collection: The collection to store metadata in
        params: The generation parameters to store
    """
    # Store basic parameters
    collection["pcg_seed"] = params.seed if params.seed is not None else 0
    collection["pcg_spacing"] = params.spacing
    collection["pcg_path_width"] = params.path_width
    collection["pcg_lateral_density"] = params.lateral_density
    collection["pcg_space_size_variation"] = params.space_size_variation
    collection["pcg_grid_size"] = params.grid_size
    collection["pcg_wall_height"] = params.wall_height
    collection["pcg_terrain_enabled"] = params.terrain_enabled
    collection["pcg_height_variation"] = params.height_variation
    collection["pcg_smoothness"] = params.smoothness
    collection["pcg_terrain_width"] = params.terrain_width
    
    # Store spline reference if available
    if params.spline_object is not None:
        collection["pcg_spline_name"] = params.spline_object.name
    
    # Store block types as a string
    collection["pcg_block_types"] = ",".join(params.block_types)
    
    # Store generation timestamp
    collection["pcg_timestamp"] = datetime.now().isoformat()


def get_metadata(collection: bpy.types.Collection) -> dict:
    """
    Retrieve generation metadata from a collection.
    
    Args:
        collection: The collection to retrieve metadata from
    
    Returns:
        Dictionary of metadata values
    """
    metadata = {}
    
    # Retrieve all PCG-related custom properties
    for key in collection.keys():
        if key.startswith("pcg_"):
            metadata[key] = collection[key]
    
    return metadata


def create_generation_structure() -> Tuple[bpy.types.Collection, bpy.types.Collection, bpy.types.Collection, bpy.types.Collection]:
    """
    Create the standard PCG generation collection structure.
    
    Returns:
        Tuple of (root_collection, structures_collection, terrain_collection, connections_collection)
    """
    # Create root collection with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    root_name = f"PCG_Generation_{timestamp}"
    root_collection = create_collection(root_name)
    
    # Create subcollections
    structures_collection = bpy.data.collections.new("Structures")
    terrain_collection = bpy.data.collections.new("Terrain")
    connections_collection = bpy.data.collections.new("Connections")
    
    # Link subcollections to root
    root_collection.children.link(structures_collection)
    root_collection.children.link(terrain_collection)
    root_collection.children.link(connections_collection)
    
    return root_collection, structures_collection, terrain_collection, connections_collection
