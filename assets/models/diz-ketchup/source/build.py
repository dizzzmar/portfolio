"""Build the DIZ sachet in Blender 4.3+. Units: metres, Z up.

Run from any directory:
  blender -b --python assets/models/diz-ketchup/source/build.py
Requires Inkscape to rasterise the editable label artwork.
"""
from pathlib import Path
import math
import random
import subprocess

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'source'
random.seed(41)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for side in ('front', 'back'):
    subprocess.run(['inkscape', str(SOURCE / f'{side}.svg'),
                    f'--export-filename={ROOT / (side + ".png")}',
                    '--export-width=1024'], check=True)

def texture(name, array, colorspace='Non-Color'):
    height, width = array.shape[:2]
    im = bpy.data.images.new(name, width=width, height=height)
    im.colorspace_settings.name = colorspace
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = array
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = str(ROOT / (name + '.png'))
    im.file_format = 'PNG'
    im.save()
    return im

# Fine laminate texture. Large folds are mesh geometry, not painted shadows.
rng = np.random.default_rng(41)
yy, xx = np.mgrid[0:2048, 0:1024].astype(np.float32)
height = np.zeros_like(xx)
for frequency, amplitude in [(0.11, 0.65), (0.29, 0.27), (0.71, 0.12)]:
    height += amplitude * np.sin(xx * frequency + 1.8 * np.sin(yy * .023)) * np.sin(yy * frequency * .61)
height += rng.normal(0, .055, height.shape)
dy, dx = np.gradient(height)
normal = np.dstack((-dx * .45, -dy * .45, np.ones_like(xx)))
normal /= np.linalg.norm(normal, axis=2, keepdims=True)
normal_image = texture('laminate-normal', normal * .5 + .5)

materials = []
for side in ('front', 'back'):
    albedo = bpy.data.images.load(str(ROOT / f'{side}.png'))
    rgba = np.array(albedo.pixels[:], dtype=np.float32).reshape(2048, 1024, 4)
    ink = np.clip((rgba[:, :, 1] - .23) * 2.3, 0, 1)
    roughness = .26 + .1 * ink + .025 * np.sin(xx * .019 + yy * .027)
    packed = texture(side + '-orm', np.dstack((np.ones_like(xx), roughness, .26 * (1 - ink) + .03)))
    mat = bpy.data.materials.new('DIZ / ' + side + ' printed laminate')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Coat Weight'].default_value = .32
    shader.inputs['Coat Roughness'].default_value = .23
    color = nodes.new('ShaderNodeTexImage'); color.image = albedo
    links.new(color.outputs['Color'], shader.inputs['Base Color'])
    orm = nodes.new('ShaderNodeTexImage'); orm.image = packed
    split = nodes.new('ShaderNodeSeparateColor')
    links.new(orm.outputs['Color'], split.inputs['Color'])
    links.new(split.outputs['Green'], shader.inputs['Roughness'])
    links.new(split.outputs['Blue'], shader.inputs['Metallic'])
    tex = nodes.new('ShaderNodeTexImage'); tex.image = normal_image
    norm = nodes.new('ShaderNodeNormalMap'); norm.inputs['Strength'].default_value = .18
    links.new(tex.outputs['Color'], norm.inputs['Color'])
    links.new(norm.outputs['Normal'], shader.inputs['Normal'])
    materials.append(mat)

# Each crease grows in from a side seam, bending and tapering into the filled body.
creases = []
for side in (-1, 1):
    for k in range(12):
        creases.append((side, .11 + k * .07 + random.uniform(-.033, .033),
                        random.uniform(-.6, .6), random.uniform(.18, .61),
                        random.uniform(.0007, .0024), random.uniform(.007, .027)))

NX, NZ = 120, 192
vertices, faces, face_materials, uvs = [], [], [], []
for back in (False, True):
    for j in range(NZ + 1):
        v = j / NZ
        t = min(1, max(0, (v - .085) / .83))
        for i in range(NX + 1):
            u = i / NX
            sx = 2 * u - 1
            filled = math.sin(math.pi * t)
            width = .033 * (1 - .028 * math.sin(v * math.pi) ** 2)
            edge_flutter = (.00035 * math.sin(v * 49) + .00020 * math.sin(v * 117)) * math.sin(v * math.pi)
            x = sx * (width + edge_flutter * abs(sx) ** 7)
            # 30 shallow teeth on both cut edges; continuous closed silhouette.
            tooth = 1 - abs((u * 30 % 1) * 2 - 1)
            z = (v - .5) * .13 + .0007 * tooth * (v ** 35 - (1 - v) ** 35)
            bulge = .0056 * math.sin(math.pi * u) ** .63 * filled ** .51
            bulge *= 1 + .12 * math.sin(u * 8 + v * 11 + (2 if back else 0))
            crease = 0
            for edge, start, slope, length, strength, spread in creases:
                distance = (1 - sx * edge) / 2
                line = start + slope * distance + .06 * math.sin(distance * 9 + start * 17) * distance
                cross = (v - line) / spread
                profile = math.exp(-cross * cross) - .36 * math.exp(-cross * cross / 5)
                crease += strength * profile * math.exp(-(distance / length) ** 2) * math.sin(math.pi * min(1, distance / .07))
            crease *= filled ** .45
            # Crumpled broad foil plus a softer wrinkle over the printed panel.
            ripple = .00043 * math.sin(v * 66 + u * 23) * math.sin(u * 27 - v * 17)
            ripple += .00021 * math.sin(v * 139 + 4 * math.sin(u * 15))
            ripple *= filled * (.2 + .8 * abs(sx) ** 2)
            seal = .00012
            if v < .085 or v > .915:
                seal += .00014 * (.5 + .5 * math.cos(v * math.pi * 110))
                seal += .00002 * math.sin(u * 102) ** 6
            depth = max(.00013, seal + bulge + crease + ripple)
            if back:
                depth *= .86
            y = depth if back else -depth
            # The sealed perimeter twists slightly rather than sitting in a plane.
            y += .00060 * math.sin(u * 8 + v * 13) * (abs(sx) ** 5 + abs(v * 2 - 1) ** 14)
            vertices.append((x, y, z))
            uvs.append((1 - u if back else u, v))

stride = NX + 1
count = stride * (NZ + 1)
for back in (False, True):
    offset = count if back else 0
    for j in range(NZ):
        for i in range(NX):
            a = offset + j * stride + i
            quad = (a, a + 1, a + 1 + stride, a + stride)
            faces.append(tuple(reversed(quad)) if back else quad)
            face_materials.append(int(back))
# Close the foil edge: there are no open sides or paper-thin cutouts.
boundary = list(range(stride))
boundary += [j * stride + NX for j in range(1, NZ + 1)]
boundary += [NZ * stride + i for i in range(NX - 1, -1, -1)]
boundary += [j * stride for j in range(NZ - 1, 0, -1)]
for index, a in enumerate(boundary):
    b = boundary[(index + 1) % len(boundary)]
    faces.append((b, a, a + count, b + count)); face_materials.append(1)

mesh = bpy.data.meshes.new('Sealed foil with sculpted creases')
mesh.from_pydata(vertices, [], faces); mesh.update()
model = bpy.data.objects.new('DIZ — tomato ketchup sachet', mesh)
bpy.context.collection.objects.link(model)
for mat in materials:
    mesh.materials.append(mat)
uv_layer = mesh.uv_layers.new(name='Label UV')
for polygon, material in zip(mesh.polygons, face_materials):
    polygon.material_index = material
    polygon.use_smooth = True
    for loop in polygon.loop_indices:
        uv_layer.data[loop].uv = uvs[mesh.loops[loop].vertex_index]
model['dimensions_mm'] = '66 × 130 × 14 (approx.)'
model['brand'] = 'DIZ'
model['description'] = 'Closed, filled sachet; sculpted foil folds and crimped serrated seals.'
bpy.context.view_layer.objects.active = model
model.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'diz-ketchup.glb'),
    export_format='GLB', use_selection=True, export_yup=True,
    export_extras=True, export_tangents=True, export_cameras=False, export_lights=False)

# Presentation scene is excluded from the GLB.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.067))
ground = bpy.context.object; ground.name = 'Studio floor (preview only)'
mat = bpy.data.materials.new('Warm white studio'); mat.diffuse_color = (.83, .82, .79, 1)
ground.data.materials.append(mat)

def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

def area(name, location, power, size, target=(0, 0, 0), size_y=None):
    data = bpy.data.lights.new(name, 'AREA'); data.energy = power; data.shape = 'RECTANGLE'
    data.size = size; data.size_y = size_y or size
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj.location = location; point_at(obj, target)

area('Large left softbox', (-.13, -.16, .13), .7, .12, size_y=.22)
area('Narrow right reflection', (.13, -.08, .04), .4, .035, size_y=.18)
area('Top rim', (.04, .07, .18), .9, .12)
camera_data = bpy.data.cameras.new('Product camera')
camera = bpy.data.objects.new('Product camera', camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (.105, -.33, .085); point_at(camera, (0, 0, -.001))
camera_data.type = 'ORTHO'; camera_data.ortho_scale = .187
scene = bpy.context.scene; scene.camera = camera
scene.render.engine = 'CYCLES'; scene.cycles.samples = 96
scene.cycles.use_denoising = False
scene.world.color = (.3, .3, .3)
scene.render.resolution_x = 1100; scene.render.resolution_y = 1300
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'PNG'
for im in bpy.data.images:
    if im.source == 'FILE': im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source' / 'diz-ketchup.blend'), compress=True)
scene.render.filepath = str(ROOT / 'preview.png')
bpy.ops.render.render(write_still=True)
camera.location = (-.13, .32, .07); point_at(camera, (0, 0, -.001))
scene.render.filepath = str(ROOT / 'preview-back.png')
bpy.ops.render.render(write_still=True)
