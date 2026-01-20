shader_type canvas_item;

// Simplified high-compatibility gem/counter shader
uniform float shine_speed : hint_range(0.0, 10.0) = 0.5;
uniform float shine_width : hint_range(0.0, 1.0) = 0.2;
uniform float shine_opacity : hint_range(0.0, 1.0) = 0.3;
uniform float saturation_boost : hint_range(1.0, 2.0) = 1.2;

uniform bool counter_mode = false;
uniform float pulse_speed : hint_range(0.0, 10.0) = 3.0;
uniform float glow_intensity : hint_range(0.0, 5.0) = 2.0;
uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.2, 1.0);

void fragment() {
	if (counter_mode) {
		vec2 uv_moved = UV - vec2(0.5);
		float dist = length(uv_moved);
		
		// Procedural bloom circle
		float alpha = smoothstep(0.5, 0.0, dist);
		float pulse = sin(TIME * pulse_speed) * 0.5 + 0.5;
		
		// High-energy glow
		vec3 color = glow_color.rgb * glow_intensity * pulse;
		
		// Add some internal "sparkle" noise
		float sparkle = sin(dist * 20.0 - TIME * 5.0) * 0.5 + 0.5;
		color += glow_color.rgb * sparkle * 0.5;
		
		COLOR = vec4(color, alpha * 0.7);
	} else {
		vec4 col = texture(TEXTURE, UV);
		float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
		col.rgb = mix(vec3(gray), col.rgb, saturation_boost);
		
		float shine_pos = mod(TIME * shine_speed, 3.0) - 1.0;
		float dist = abs((UV.x + UV.y) * 0.5 - shine_pos);
		float shine = smoothstep(shine_width, 0.0, dist);
		col.rgb += shine * shine_opacity * col.a;
		
		COLOR = col;
	}
}
