import { ShaderChunk } from 'three'

/**
 * @shadergradient/react ships a copy of an older MeshPhysicalMaterial shader that includes
 * chunks removed from recent three.js releases. With lightType "3d" (no env map, no transmission)
 * those chunks contribute nothing, so empty stand-ins let the shader compile on three 0.18x.
 */
const removed = ['cube_uv_reflection_fragment', 'encodings_fragment', 'transmissionmap_fragment', 'transmissionmap_pars_fragment']
const chunks = ShaderChunk as unknown as Record<string, string>
for (const name of removed) if (!(name in chunks)) chunks[name] = ''
