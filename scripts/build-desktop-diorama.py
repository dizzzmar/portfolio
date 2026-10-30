"""Reproducible desktop diorama. Run: blender -b --python scripts/build-desktop-diorama.py"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
random.seed(24)
OUT=Path(__file__).resolve().parents[1]/'assets/room/desktop';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene

def material(name,c,rough=.65,metal=0,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 if emit:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emit
 return m
wood=material('Walnut',(.20,.075,.031));plaster=material('Warm plaster',(.55,.50,.41));black=material('Charcoal enamel',(.016,.02,.02),.72,.12);rubber=material('Rubber',(.009,.012,.012));metal=material('Brushed aluminium',(.3,.32,.30),.3,.7);ivory=material('Ivory',(.78,.73,.61));terra=material('Terracotta',(.48,.10,.035));red=material('Vermilion',(.60,.025,.014));leather=material('Cognac leather',(.19,.07,.034),.78);bulb=material('Warm diffuser',(1,.60,.20),emit=4);screen=material('MONITOR_SCREEN_REPLACE_ME',(.035,.065,.065),.35,emit=.3)
green=[material('Foliage '+str(i),c) for i,c in enumerate([(.055,.14,.023),(.12,.23,.033),(.20,.28,.05)])]
books=[material('Binding '+str(i),c) for i,c in enumerate([(.58,.04,.024),(.73,.32,.06),(.59,.53,.35),(.10,.17,.14),(.03,.05,.06),(.30,.11,.06)])]
# Tiny packed wood texture; UV mapped, portable to glTF (no procedural shader dependency).
im=bpy.data.images.new('Walnut grain',width=256,height=256);pixels=[]
for y in range(256):
 for x in range(256):
  v=math.sin(y*.8+math.sin(x*.035))* .014+random.uniform(-.004,.004);pixels.extend((.30+v,.16+v*.7,.095+v*.4,1))
im.pixels=pixels;im.pack();n=wood.node_tree.nodes.new('ShaderNodeTexImage');n.image=im;wood.node_tree.links.new(n.outputs['Color'],wood.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def finish(o,name,m):o.name=name;o.data.materials.append(m);return o
def box(name,p,d,m,b=.006):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if b:q=o.modifiers.new('Soft edges','BEVEL');q.width=b;q.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return finish(o,name,m)
def ball(name,p,d,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=p);o=bpy.context.object;o.scale=d
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,m)
def cylinder(name,p,r,h,m,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=h,location=p);o=bpy.context.object
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,m)
def rod(name,a,b,r,m):
 a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def cable(name,pts,m=black,r=.004):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=1;q=c.splines.new('BEZIER');q.bezier_points.add(len(pts)-1)
 for p,v in zip(q.bezier_points,pts):p.co=v;p.handle_left_type=p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);s.collection.objects.link(o);c.materials.append(m)
def light(name,p,c,power,kind='POINT',target=None,size=.12):
 d=bpy.data.lights.new(name,kind);d.energy=power;d.color=c
 if kind=='POINT':d.shadow_soft_size=size
 if kind=='AREA':d.size=size
 if kind=='SPOT':d.spot_size=math.radians(100);d.spot_blend=.65;d.shadow_soft_size=.05
 o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=p
 if target:o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 return o
def plant(name,x,y,z,a=.17,trail=False,check=False):
 cylinder(name+' pot',(x,y,z+a*.32),a*.40,a*.64,ivory if check else terra,a*.5);cylinder('Soil',(x,y,z+a*.65),a*.45,.008,rubber)
 if check:
  for row in range(3):
   for j in range(12):
    if (row+j)%2==0:
     t=j*math.tau/12;o=box('Glazed checker',(x+math.cos(t)*a*.46,y+math.sin(t)*a*.46,z+a*(.13+row*.18)),(a*.24,.008,a*.18),black,.001);o.rotation_euler.z=t-math.pi/2
 for k in range(7):
  t=k*2.4;pts=[]
  for j in range(5):
   f=j/4;xx=x+math.cos(t)*a*f*1.65;yy=y+math.sin(t)*a*f*1.65;zz=z+a*.7+math.sin(f*math.pi)*a*.6+(-f*f*a*2 if trail and k%2==0 else f*a*.75);pts.append((xx,yy,zz))
   if j:o=ball(name+' leaf',(xx,yy,zz),(a*.25,a*.44,a*.065),green[(j+k)%3]);o.rotation_euler=(random.uniform(-.7,.7),random.uniform(-.7,.7),t+.4)
  cable(name+' stem',pts,green[0],.0025)
def bookrow(x,y,z,count):
 for i in range(count):
  w=random.uniform(.027,.043);h=random.uniform(.20,.28);box('Book',(x+w/2,y,z+h/2),(w,.14,h),books[i%6],.002)
  for dz in [.025,h-.028]:box('Spine foil',(x+w/2,y-.072,z+dz),(w*.7,.002,.003),ivory,0)
  x+=w+.004
def bunny(x,y,z,a=.10):
 ball('Rabbit body',(x,y,z+a*.5),(a*.4,a*.3,a*.5),ivory);ball('Rabbit head',(x,y-.01,z+a*1.1),(a*.42,a*.34,a*.38),ivory)
 for dx in [-.18,.18]:
  ball('Rabbit ear',(x+a*dx,y,z+a*1.65),(a*.12,a*.12,a*.42),ivory);ball('Rabbit eye',(x+a*dx,y-a*.35,z+a*1.15),(a*.025,a*.015,a*.025),black)
 for sign in [-1,1]:rod('Rabbit mouth',(x-.006,y-a*.35,z+a*.95+sign*.006),(x+.006,y-a*.35,z+a*.95-sign*.006),.001,black)
# Exactly two walls; left and camera-facing sides remain open.
box('Foundation',(0,0,-.012),(2.65,2.02,.025),wood)
for i in range(13):box('Floor plank',(-1.22+i*.2,0,.006),(.195,1.97,.018),wood,.002)
box('Front-facing wall',(0,1.0,1.65),(2.65,.10,3.30),plaster,.004);box('Right wall',(1.325,.02,1.65),(.10,2.06,3.30),plaster,.004)
box('Back skirting',(0,.93,.07),(2.6,.035,.14),ivory,.003);box('Right skirting',(1.26,0,.07),(.035,1.95,.14),ivory,.003)
box('Desktop',(0,.12,1.04),(2.38,1.22,.07),wood,.025)
for x in [-1.02,1.02]:
 for y in [-.35,.55]:box('Desk leg',(x,y,.50),(.045,.045,1.0),black)
 box('Desk foot',(x,.10,.04),(.07,1.04,.06),black)
box('Rear rail',(0,.57,.80),(2.1,.04,.07),black);box('Monitor riser',(0,.47,1.22),(1.96,.45,.045),wood)
for x in [-.87,.87]:box('Riser leg',(x,.47,1.13),(.035,.38,.16),black)
box('Desk mat',(-.10,-.15,1.082),(1.50,.66,.012),rubber,.025)
box('Monitor foot',(0,.48,1.255),(.40,.23,.018),black);box('Monitor stem',(0,.57,1.48),(.065,.06,.42),metal);box('Monitor bezel',(0,.53,1.66),(1.04,.065,.64),black,.017)
# One dedicated UV plane, never joined to static meshes.
mesh=bpy.data.meshes.new('Screen UV plane');mesh.from_pydata([(-.495,.494,1.386),(.495,.494,1.386),(.495,.494,1.954),(-.495,.494,1.954)],[],[(0,1,2,3)]);mesh.uv_layers.new()
for l,uv in zip(mesh.uv_layers.active.data,[(0,0),(1,0),(1,1),(0,1)]):l.uv=uv
ob=bpy.data.objects.new('Monitor_Screen',mesh);s.collection.objects.link(ob);mesh.materials.append(screen);ob['replaceable_screen']=True
rod('Monitor light bar',(-.48,.46,1.997),(.48,.46,1.997),.014,black);box('Light bar diffuser',(0,.455,1.987),(.88,.012,.008),bulb,.002)
for x in [-.77,.77]:
 box('Speaker enclosure',(x,.46,1.48),(.28,.27,.46),wood,.015);box('Speaker front',(x,.316,1.48),(.257,.018,.43),black,.01)
 for z,r in [(1.39,.091),(1.60,.042)]:
  for dy,rr,m in [(0,r,rubber),(-.009,r*.79,metal),(-.014,r*.66,rubber),(-.022,r*.32,black)]:o=cylinder('Speaker cone',(x,.302+dy,z),rr,.012,m);o.rotation_euler.x=math.pi/2
 for dx in [-.10,.10]:
  for z in [1.30,1.67]:ball('Baffle screw',(x+dx,.303,z),(.005,.003,.005),metal)
# Keychron K3 Max: low-profile 75% ANSI layout, six rows and separate navigation column.
k3gray=material('K3 graphite keycaps',(.095,.105,.115),.80)
k3dark=material('K3 dark modifiers',(.035,.042,.05),.82)
k3orange=material('K3 orange Escape',(.78,.13,.025),.72)
box('K3 Max aluminium chassis',(-.14,-.23,1.099),(.465,.162,.018),black,.004)
box('K3 Max top plate',(-.14,-.23,1.109),(.455,.152,.004),metal,.002)
unit=.029
# Widths in key units, ordered back to front; gaps delimit the arrow cluster.
rows=[
 [('Esc',1),('F1',1),('F2',1),('F3',1),('F4',1),('F5',1),('F6',1),('F7',1),('F8',1),('F9',1),('F10',1),('F11',1),('F12',1),('Del',1),('Light',1)],
 [(v,1) for v in ['`','1','2','3','4','5','6','7','8','9','0','-','=']]+[('Backspace',2),('PgUp',1)],
 [('Tab',1.5)]+[(v,1) for v in 'QWERTYUIOP']+[('[',1),(']',1),('Backslash',1.5),('PgDn',1)],
 [('Caps',1.75)]+[(v,1) for v in 'ASDFGHJKL']+[(';',1),("Quote",1),('Enter',2.25),('Home',1)],
 [('Shift',2.25)]+[(v,1) for v in 'ZXCVBNM']+[(',',1),('.',1),('/',1),('Shift',1.75),('Up',1),('End',1)],
 [('Ctrl',1.25),('Option',1.25),('Command',1.25),('Space',6.25),('Command',1),('Fn',1),('Ctrl',1),('Left',1),('Down',1),('Right',1)]
]
for row,keys in enumerate(rows):
 x=-.14-sum(w for _,w in keys)*unit/2
 for label,w in keys:
  m=k3orange if label=='Esc' else k3gray if len(label)==1 else k3dark
  box('K3 key '+label,(x+w*unit/2,-.164-row*.026,1.116),(w*unit-.003,.022,.009),m,.002)
  x+=w*unit
box('K3 USB-C port',(-.31,-.147,1.10),(.012,.003,.004),rubber,.001)
ball('Mouse',(.48,-.22,1.12),(.063,.095,.038),black);box('Mouse seam',(.48,-.245,1.156),(.002,.07,.002),rubber,0)
cylinder('Coaster',(-.85,-.20,1.085),.09,.009,green[0]);box('Notebook',(-.19,.13,1.099),(.37,.20,.025),terra)
for i in range(3):rod('Pens',(-.29,.10+i*.032,1.123),(-.04,.10+i*.032,1.123),.007,black)
cylinder('Pen cup',(.38,.16,1.18),.055,.19,black)
for i in range(8):
 x=.38+random.uniform(-.032,.032);y=.16+random.uniform(-.03,.03);rod('Pencil',(x,y,1.17),(x+.014,y,1.39+random.uniform(-.03,.03)),.005,books[i%6])
box('Note tray',(.69,-.02,1.106),(.15,.13,.045),wood);box('Notes',(.69,-.026,1.131),(.115,.09,.008),books[1]);box('Phone dock',(.97,.05,1.13),(.16,.18,.08),ivory,.025)
o=box('Phone',(.97,.08,1.28),(.14,.022,.25),terra,.018);o.rotation_euler.x=-.26
cylinder('Coffee cup',(-.93,.13,1.15),.046,.12,terra);cylinder('Coffee',(-.93,.13,1.212),.039,.002,rubber)
for z,x,w in [(2.13,-.36,1.78),(2.72,-.05,2.16)]:
 box('Floating shelf',(x,.79,z),(w,.39,.038),wood)
 for sx in [x-w*.38,x+w*.38]:box('Shelf bracket',(sx,.935,z-.09),(.025,.025,.18),black);rod('Shelf brace',(sx,.93,z-.17),(sx,.62,z-.025),.012,black)
bookrow(-1.17,.73,2.15,8);bookrow(.50,.77,2.74,6)
# Graphic artwork built as shallow ink lines: original cat silhouette, butterfly and calendar.
box('Cat print frame',(-.38,.94,2.98),(.72,.035,.58),wood);box('Cat print paper',(-.38,.918,2.98),(.68,.004,.54),books[2])
pts=[(-.60,2.76),(-.48,2.80),(-.45,2.90),(-.48,3.03),(-.43,3.00),(-.36,3.01),(-.32,3.09),(-.29,2.99),(-.23,2.96),(-.28,2.92),(-.30,2.84),(-.24,2.78),(-.36,2.78),(-.40,2.86),(-.43,2.78),(-.60,2.76)]
cable('Cat ink outline',[(x,.911,z) for x,z in pts],black,.006)
cable('Cat tail',[(-.50,.910,2.78),(-.65,.910,2.85),(-.62,.910,2.95)],black,.006)
for i in range(5):rod('Cat stripes',(-.45+i*.027,.910,2.92),(-.43+i*.027,.910,2.87),.004,black)
box('Butterfly frame',(.45,.94,2.99),(.33,.03,.43),wood);box('Butterfly paper',(.45,.921,2.99),(.30,.003,.40),ivory)
for dx in [-.07,.07]:
 o=ball('Butterfly wing',(.45+dx,.913,3.01),(.068,.005,.11),books[1]);o.rotation_euler.y=dx*5
rod('Butterfly body',(.45,.903,2.90),(.45,.903,3.08),.007,black)
box('Calendar',(.88,.929,2.18),(.35,.015,.48),ivory)
for z in [2.0,2.04,2.08,2.12]:rod('Calendar grid',(.73,.917,z),(1.03,.917,z),.0015,books[5])
for x in [.73,.78,.83,.88,.93,.98,1.03]:rod('Calendar grid',(x,.917,2.0),(x,.917,2.12),.0015,books[5])
plant('Upper trailing pothos',-.91,.75,2.74,.18,True);plant('Checkered pothos',.82,.76,2.74,.15,True,True);plant('Shelf foliage',.25,.75,2.15,.16);plant('Desk pothos',-.78,.46,1.73,.14,True);plant('Small pot',.77,.47,1.73,.10)
bunny(.35,.68,2.74);bunny(-.28,.69,2.15)
cylinder('Mushroom stem',(.05,.72,2.82),.042,.15,ivory);ball('Mushroom shade',(.05,.72,2.94),(.105,.105,.09),bulb);light('Practical mushroom',(.05,.69,2.94),(1,.53,.17),12)
box('Display case',(-.12,.72,2.27),(.30,.12,.23),black);box('Display lining',(-.12,.652,2.27),(.27,.008,.20),green[0])
for i in range(4):box('Miniature',(-.22+i*.067,.63,2.245),(.037,.04,.10),books[i])
for i in range(5):box('Game case',(.60,.74,2.76+i*.024),(.26,.15,.021),books[3])
# Nothing Headphone (1): rectangular aluminium shells and oval cushions on a stand.
box('Headphone stand foot',(-.56,.72,2.16),(.20,.16,.018),black)
rod('Headphone stand stem',(-.56,.75,2.17),(-.56,.75,2.48),.012,metal)
box('Headband saddle',(-.56,.70,2.48),(.12,.08,.022),rubber)
cable('Nothing padded headband',[(-.68,.69,2.30),(-.68,.69,2.45),(-.62,.69,2.50),(-.50,.69,2.50),(-.44,.69,2.45),(-.44,.69,2.30)],black,.017)
for x in [-.68,-.44]:
 box('Nothing aluminium earcup',(x,.68,2.265),(.085,.063,.15),metal,.016)
 box('Nothing transparent cover rim',(x,.644,2.265),(.071,.009,.135),black,.014)
 box('Nothing inset plate',(x,.637,2.265),(.057,.005,.116),metal,.011)
 ball('Nothing oval cushion',(x,.723,2.265),(.042,.023,.070),rubber)
 rod('Nothing exposed yoke',(x,.68,2.34),(x,.69,2.39),.006,metal)
 cylinder('Nothing roller',(x,.64,2.337),.008,.022,black).rotation_euler.y=math.pi/2
# SKADIS board with staggered vertical slots, hooks, a pocket and casual overlapping notes.
box('SKADIS fibreboard',(1.256,.40,2.13),(.022,.74,.88),ivory,.008)
for row in range(12):
 for col in range(9):
  yy=.065+col*.078+(row%2)*.018
  box('SKADIS recessed slot',(1.243,yy,1.75+row*.068),(.002,.014,.030),books[5],.006)
for yy,zz,w,h,tilt,col in [(.14,2.38,.18,.19,-.13,2),(.34,2.28,.16,.23,.12,0),(.53,2.36,.19,.15,-.05,3),(.38,2.02,.16,.22,-.09,2),(.65,2.14,.13,.18,.17,1)]:
 o=box('Pinned postcard',(1.232,yy,zz),(.006,w,h),books[col],.001);o.rotation_euler.x=tilt
 box('Paper tape',(1.225,yy,zz+h*.44),(.005,.06,.022),ivory,.001)
 for j in range(3):
  o=box('Postcard printed line',(1.227,yy,zz-.035+j*.025),(.002,w*.65,.003),books[4],0);o.rotation_euler.x=tilt
box('SKADIS storage pocket',(1.18,.18,1.89),(.13,.21,.16),ivory,.008)
for j in range(4):rod('Pocket pencil',(1.16,.11+j*.038,1.88),(1.14,.10+j*.04,2.08+j*.015),.005,books[j])
for yy in [.52,.65]:cable('SKADIS hook',[(1.24,yy,1.90),(1.18,yy,1.90),(1.15,yy,1.86),(1.16,yy,1.85)],metal,.004)
cable('Hanging USB cable',[(1.17,.52,1.88),(1.13,.43,1.73),(1.13,.53,1.64),(1.13,.60,1.75),(1.17,.52,1.88)],black,.005)
box('Red frame',(1.261,.45,2.89),(.035,.42,.26),red);box('Right picture',(1.239,.45,2.89),(.004,.37,.21),ivory)
# Everyday traces: uneven papers, annotated notebook, glasses, cables and cup handle.
for i in range(4):
 o=box('Loose desk paper',(-.64,.02,1.09+i*.003),(.19,.24,.002),ivory,.001);o.rotation_euler.z=-.18+i*.07
 for j in range(5):box('Handwritten note',(-.64,.00+j*.025,1.103),(.10-random.random()*.025,.002,.001),books[5],0)
for x in [-.24,-.12]:
 cable('Reading glasses rim',[(x-.04,.16,1.13),(x-.04,.22,1.13),(x+.04,.22,1.13),(x+.04,.16,1.13),(x-.04,.16,1.13)],black,.002)
rod('Glasses bridge',(-.20,.19,1.13),(-.16,.19,1.13),.002,metal)
rod('Glasses temple',(-.28,.22,1.13),(-.27,.30,1.15),.002,black)
cable('Cup handle',[(-.97,.13,1.18),(-1.02,.13,1.18),(-1.02,.13,1.12),(-.97,.13,1.12)],terra,.008)
cable('Keyboard USB cable',[(-.31,-.147,1.10),(-.44,.02,1.10),(-.37,.23,1.10),(-.49,.43,1.10)],black,.003)
# Thin magazines casually stacked underneath the riser.
for i in range(3):
 o=box('Magazine',(.58,.42,1.09+i*.014),(.34,.24,.012),books[(i+2)%6],.001);o.rotation_euler.z=.06-i*.045
# Actual practical light sources, exported via KHR_lights_punctual.
cylinder('Task lamp base',(.99,.56,1.27),.105,.026,black);rod('Lamp lower arm',(.99,.56,1.28),(1.01,.58,1.91),.015,black);rod('Lamp upper arm',(1.01,.58,1.91),(.65,.48,2.04),.015,black)
for p in [(1.01,.58,1.91),(.65,.48,2.04)]:ball('Lamp hinge',p,(.027,.027,.027),metal)
cylinder('Lamp shade',(.65,.48,1.95),.15,.14,black,.045);cylinder('Lamp diffuser',(.65,.48,1.878),.13,.004,bulb);light('Practical task spotlight',(.65,.48,1.865),(1,.43,.12),24,'SPOT',(.51,.15,1.06))
box('Shelf LED',(-.3,.87,2.105),(1.54,.016,.009),bulb,.002)
for x in [-.85,-.1,.65]:light('Practical amber wall wash',(x,.78,1.62),(1,.19,.035),9,size=.20)
light('Practical shelf strip',(-.34,.77,2.07),(1,.34,.075),10,size=.23)
cable('Monitor power',[(.1,.59,1.60),(.13,.65,1.23),(.17,.67,.86),(.51,.77,.23)]);cable('Lamp power',[(1,.57,1.26),(1.12,.65,1.1),(1.13,.79,.20)])
cylinder('Chair pedestal',(.23,-.65,.29),.035,.41,metal)
for k in range(5):
 t=k*math.tau/5;ex=.23+math.cos(t)*.32;ey=-.65+math.sin(t)*.32;rod('Chair star',(.23,-.65,.13),(ex,ey,.07),.018,black);ball('Caster',(ex,ey,.045),(.035,.027,.035),rubber)
box('Chair seat',(.23,-.65,.51),(.59,.50,.11),leather,.05);o=box('Chair back',(.23,-.90,.79),(.59,.095,.52),leather,.05);o.rotation_euler.x=-.17
box('Chair inset',(.23,-.96,.81),(.50,.025,.38),leather,.035)
for x in [-.11,.57]:rod('Chair arm support',(x,-.65,.52),(x,-.67,.74),.014,black);box('Armrest',(x,-.65,.75),(.07,.37,.055),leather,.025)
light('Studio soft window',(-3,-4,5),(1,.83,.66),180,'AREA',(0,.4,1.7),4);light('Studio top fill',(0,-1,5),(.75,.81,1),65,'AREA',(0,0,1),3)
s.world.color=(.11,.11,.11)
bpy.ops.object.camera_add(location=(-4.5,-7.5,4.35));cam=bpy.context.object;cam.name='Desktop preview camera';cam.rotation_euler=(Vector((0,.15,1.62))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=4.6;s.camera=cam
s.render.engine='CYCLES';s.cycles.samples=128;s.cycles.use_denoising=False;s.render.resolution_x=1000;s.render.resolution_y=1100;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.film_transparent=True;s.view_settings.view_transform='AgX'
s.render.filepath=str(OUT/'preview.png');bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'desktop.blend'));bpy.ops.render.render(write_still=True)
# Merge static geometry by material for the browser, preserving editable source objects in .blend.
for o in list(s.objects):
 if o.type=='CAMERA' or (o.type=='LIGHT' and o.data.type=='AREA'):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type in {'MESH','CURVE'}:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in s.objects if o.select_get());bpy.ops.object.convert(target='MESH')
groups={}
for o in list(s.objects):
 if o.type=='MESH' and o.name!='Monitor_Screen':groups.setdefault(o.data.materials[0].name,[]).append(o)
for name,objs in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name='Static '+name
bpy.ops.export_scene.gltf(filepath=str(OUT/'desktop.glb'),export_format='GLB',export_lights=True,export_cameras=False,export_extras=True)
print('DESKTOP_EXPORT_COMPLETE')
