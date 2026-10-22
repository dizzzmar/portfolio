"""Build the DIZ sachet in Blender 4.3+. Units: metres, Z up.

Run from any directory:
  blender -b --python assets/models/diz-ketchup/source/build.py
Requires Inkscape to rasterise the editable label artwork.
"""
from pathlib import Path
import math
import subprocess

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'source'
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
height += rng.normal(0, .08, height.shape)
for shift in (1, 2, 3):
    height = (height + np.roll(height, shift, axis=0) + np.roll(height, shift, axis=1)) / 3
dy, dx = np.gradient(height)
normal = np.dstack((-dx * .45, -dy * .45, np.ones_like(xx)))
normal /= np.linalg.norm(normal, axis=2, keepdims=True)
normal_image = texture('laminate-normal', normal * .5 + .5)

materials = []
for side in ('front', 'back'):
    albedo = bpy.data.images.load(str(ROOT / f'{side}.png'))
    rgba = np.array(albedo.pixels[:], dtype=np.float32).reshape(2048, 1024, 4)
    ink = np.clip((rgba[:, :, 1] - .23) * 2.3, 0, 1)
    roughness = .30 + .04 * ink + .018 * np.sin(xx * .019 + yy * .027)
    packed = texture(side + '-orm', np.dstack((np.ones_like(xx), roughness, .025 * np.ones_like(xx))))
    mat = bpy.data.materials.new('DIZ / ' + side + ' printed laminate')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Coat Weight'].default_value = .55
    shader.inputs['Coat Roughness'].default_value = .17
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

# Sparse pressure folds: irregular lengths and directions, with long corner
# creases and a few smaller dents. Coordinates describe the flat foil pattern.
creases = [
    (.07, .91, .22, .76, .019, -.0014),
    (.15, .94, .30, .88, .023, .0010),
    (.31, .94, .36, .82, .015, -.0007),
    (.82, .93, .74, .81, .018, -.0010),
    (.95, .86, .81, .70, .020, .0013),
    (.06, .76, .17, .53, .018, -.0012),
    (.08, .60, .23, .47, .024, .0008),
    (.04, .44, .16, .39, .016, -.0007),
    (.06, .34, .20, .19, .023, -.0013),
    (.17, .27, .12, .08, .019, .0014),
    (.33, .06, .39, .19, .017, -.0010),
    (.77, .06, .69, .21, .025, -.0016),
    (.93, .07, .83, .29, .018, .0017),
    (.96, .35, .84, .42, .022, -.0010),
    (.92, .47, .78, .57, .017, .0008),
    (.96, .66, .84, .59, .018, -.0013),
    (.43, .77, .59, .71, .035, -.00035),
    (.49, .32, .61, .25, .032, .0004),
    (.08, .91, .16, .87, .012, .00065),
    (.09, .83, .13, .71, .010, .00050),
    (.08, .56, .15, .60, .012, -.00055),
    (.10, .41, .14, .36, .010, .00060),
    (.09, .16, .21, .11, .015, -.00085),
    (.16, .07, .22, .12, .013, .00065),
    (.72, .09, .88, .14, .015, .00080),
    (.87, .18, .94, .24, .011, -.00060),
    (.91, .53, .86, .62, .012, .00050),
    (.89, .79, .95, .83, .012, -.00050),
]

NX, NZ = 120, 192
vertices, faces, face_materials, uvs = [], [], [], []
for back in (False, True):
    for j in range(NZ + 1):
        v = j / NZ
        t = min(1, max(0, (v - .055) / .89))
        for i in range(NX + 1):
            u = i / NX
            sx = 2 * u - 1
            filled = math.sin(math.pi * t)
            width = .033 * (1 - .017 * math.sin(v * math.pi) ** 2)
            edge_flutter = (.00013 * math.sin(v * 49) + .00008 * math.sin(v * 117)) * math.sin(v * math.pi)
            x = sx * (width + edge_flutter * abs(sx) ** 7)
            # 30 shallow teeth on both cut edges; continuous closed silhouette.
            tooth = 1 - abs((u * 30 % 1) * 2 - 1)
            z = (v - .5) * .13 + .0007 * tooth * (v ** 35 - (1 - v) ** 35)
            body_u = min(1, max(0, (u - .045) / .91))
            across = math.sin(math.pi * body_u)
            bulge = .0048 * across ** .40 * filled ** .42
            bulge *= 1 + .075 * math.sin(u * 8 + v * 11 + (2 if back else 0))
            crease = 0
            for ax, ay, bx, by, spread, strength in creases:
                # Work in aspect-correct coordinates so folds are equally sharp
                # whether they run vertically or diagonally.
                du, dv = bx - ax, 2 * (by - ay)
                pu, pv = u - ax, 2 * (v - ay + (.013 if back else 0))
                length2 = du * du + dv * dv
                along = (pu * du + pv * dv) / length2
                if 0 < along < 1:
                    cross = (pu * dv - pv * du) / math.sqrt(length2)
                    cross += .008 * math.sin(along * math.pi * 1.7)
                    q = cross / spread
                    profile = math.exp(-q * q) - .38 * math.exp(-q * q / 4)
                    crease += strength * profile * math.sin(math.pi * along) ** .55
            crease *= filled ** .25 * across ** .25
            # Subtle uneven tension, without a repeating wave/crosshatch pattern.
            ripple = .00016 * math.sin(v * 21 + u * 11) * math.sin(u * 19 - v * 7)
            ripple *= filled * across
            seal = .00010
            if v < .055 or v > .945:
                seal += .00008 * (.5 + .5 * math.cos(v * math.pi * 130))
            # Continuous bonded side seam and a small adjacent compression ridge.
            seal += .00015 * math.exp(-((abs(sx) - .91) / .025) ** 2)
            depth = max(.00013, seal + bulge + crease + ripple)
            if back:
                depth *= .86
            y = depth if back else -depth
            # The sealed perimeter twists slightly rather than sitting in a plane.
            y += .00032 * math.sin(u * 8 + v * 13) * (abs(sx) ** 5 + abs(v * 2 - 1) ** 14)
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
model['dimensions_mm'] = '66 × 131 × 10 (approx.)'
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
