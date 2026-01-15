shader_type canvas_item;

uniform float shine_speed : hint_range(0.0, 10.0) = 0.5;
uniform float shine_width : hint_range(0.0, 1.0) = 0.2;
uniform float shine_opacity : hint_range(0.0, 1.0) = 0.3;
uniform float saturation_boost : hint_range(1.0, 2.0) = 1.2;

void fragment() {
	vec4 col = texture(TEXTURE, UV);
	
	// Boost saturation to make it "vivid"
	float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
	col.rgb = mix(vec3(gray), col.rgb, saturation_boost);
	
	// Add a diagonal shine moving across
	// shine_pos moves from -1.0 to 2.0 over time
	float shine_pos = mod(TIME * shine_speed, 3.0) - 1.0;
	
	// Calculate distance from the shine line (diagonal x + y)
	float dist = abs((UV.x + UV.y) * 0.5 - shine_pos);
	
	// Create the shine band
	float shine = smoothstep(shine_width, 0.0, dist);
	
	// Add the shine, masked by alpha
	col.rgb += shine * shine_opacity * col.a;
	
	COLOR = col;
}
