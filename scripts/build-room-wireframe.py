"""Extract a small, texture-free loading preview with Blender.

blender -b --python scripts/build-room-wireframe.py
The binary contains six float32 bounds values followed by line endpoints (XYZ).
"""
from pathlib import Path
import bpy
import bmesh
import numpy as np

root = Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root / 'assets/room/shelf.glb'))
rng = np.random.default_rng(27)
segments = []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH' or obj.name.lower().startswith('footwear'):
        continue
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.dissolve_limit(mesh, angle_limit=.22, verts=list(mesh.verts), edges=list(mesh.edges))
    lines = []
    for edge in mesh.edges:
        a, b = (obj.matrix_world @ v.co for v in edge.verts)
        if (a - b).length < .004:
            continue
        lines.append(((a.x, a.z, -a.y), (b.x, b.z, -b.y)))
    mesh.free()
    if len(lines) > 420:
        data = np.array(lines, dtype=np.float32)
        lengths = np.linalg.norm(data[:, 1] - data[:, 0], axis=1)
        indices = rng.choice(len(data), 420, replace=False, p=lengths / lengths.sum())
        lines = data[indices].tolist()
    segments.extend(lines)
data = np.array(segments, dtype='<f4')
if len(data) > 16000:
    data = data[rng.choice(len(data), 16000, replace=False)]
low, high = data.min(axis=(0, 1)), data.max(axis=(0, 1))
order = np.argsort(data[:, :, 1].mean(axis=1) + rng.uniform(-.16, .16, len(data)))
path = root / 'assets/room/room-wireframe.bin'
with path.open('wb') as stream:
    stream.write(np.concatenate((low, high)).astype('<f4').tobytes())
    stream.write(data[order].tobytes())
print(f'{len(data)} segments; {path.stat().st_size} bytes')
