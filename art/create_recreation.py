"""Run inside Blender through MCP; preserve the existing asset workshop."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path(r'C:\Users\hamze\Home\Desktop\Folder_1\City Game Project')
scene = bpy.data.scenes.new('Rivergate - Parks and recreation')
bpy.context.window.scene = scene
materials = {}
palette = {'grass':'75A864','leaf':'42845B','lightleaf':'8CBC66','wood':'986A47',
           'sand':'E8CF98','stone':'D7D9CA','white':'FFF4DA','metal':'465D65',
           'blue':'42BFD1','pool':'C4E2DC','red':'DD7956','yellow':'E9BC52',
           'purple':'9E82BD','court':'4C9987','rubber':'D2A076','flower':'E4A2A1'}
for name,h in palette.items():
    m=bpy.data.materials.new('recreation_'+name);m.use_nodes=True
    color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,)
    m.diffuse_color=color
    node=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=color
    node.inputs['Roughness'].default_value=.28 if name=='blue' else .82
    materials[name]=m

objects=[]
def finish(o,name,material):
    o.name=name;o.data.materials.append(materials[material]);objects.append(o);return o
def box(name,x,y,z,w,d,h,material):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z))
    o=bpy.context.object;o.scale=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,material)
def cyl(name,x,y,z,r,h,material,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=(x,y,z))
    return finish(bpy.context.object,name,material)
def beam(name,a,b,r,material):
    a,b=Vector(a),Vector(b);o=cyl(name,*((a+b)/2),r,(b-a).length,material,8)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def tree(x,y,scale=1):
    cyl('tree trunk',x,y,1.1*scale,.18*scale,1.9*scale,'wood')
    for dx,dy,z,r in [(0,0,2.6,1.1),(.5,0,2.2,.8),(-.35,.3,2.15,.85)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r*scale,location=(x+dx*scale,y+dy*scale,z*scale))
        finish(bpy.context.object,'tree canopy','leaf' if dx==0 else 'lightleaf')
def bench(x,y):
    for yy in [-.25,0,.25]:box('bench slat',x,y+yy,.65,1.8,.18,.13,'wood')
    box('bench back',x,y+.42,1.1,1.8,.12,.55,'wood')
    for xx in [-.65,.65]:box('bench leg',x+xx,y,.38,.12,.65,.55,'metal')
def table(x,y):
    box('picnic table',x,y,.95,2,1.15,.15,'wood')
    for yy in [-.85,.85]:
        box('picnic seat',x,y+yy,.58,2,.35,.13,'wood')
        for xx in [-.7,.7]:beam('picnic support',(x+xx,y+yy,.2),(x+xx,y,.95),.09,'metal')
def umbrella(x,y):
    cyl('umbrella pole',x,y,1.5,.07,2.8,'white')
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=1.6,radius2=.12,depth=.65,location=(x,y,3))
    finish(bpy.context.object,'sun umbrella','yellow')
def path(x,y,w,d):box('walking path',x,y,.25,w,d,.08,'stone')
def line(x,y,w,d):box('painted line',x,y,.3,w,d,.025,'white')
def arc(cx,cy,r,start,end):
    pts=[(cx+r*math.cos(start+(end-start)*k/32),cy+r*math.sin(start+(end-start)*k/32),.32) for k in range(33)]
    for a,b in zip(pts,pts[1:]):beam('court circle',a,b,.035,'white')
def fence(w,d):
    for y in [-d/2+.3,d/2-.3]:
        for x in range(-int(w/2)+1,int(w/2),2):cyl('fence post',x,y,1.2,.055,2,'metal',8)
        for z in [.65,1.35,2.1]:beam('fence rail',(-w/2+.4,y,z),(w/2-.4,y,z),.025,'metal')
        for x in [(-w/2+.5)+k*.5 for k in range(int((w-1)*2))]:beam('fence wire',(x,y,.3),(x,y,2.1),.012,'metal')
def fountain(x=0,y=0):
    cyl('fountain basin',x,y,.4,1.6,.5,'stone',24)
    cyl('fountain water',x,y,.68,1.35,.05,'blue',24)
    cyl('fountain pedestal',x,y,1,.35,.7,'white')
    cyl('fountain upper bowl',x,y,1.4,.8,.16,'stone',16)
    cyl('fountain jet',x,y,1.8,.06,.7,'blue',8)
def flowers(x,y):
    box('flower bed',x,y,.34,1.25,.8,.22,'wood')
    for dx in [-.4,0,.4]:cyl('flowers',x+dx,y,.55,.2,.16,'flower',8)

specs=[('park',1,1),('largePark',2,2),('pool',2,1),('beach',2,3),('playground',1,1),('tennis',2,1),('basketball',2,1),('picnic',1,1)]
manifest=[];roots=[]
for k,(key,w,d) in enumerate(specs):
    objects=[];W,D=w*10-.5,d*10-.5
    bpy.ops.object.empty_add();root=bpy.context.object;root.name='remaster_'+key
    box('lot foundation',0,0,.08,W,D,.16,'sand' if key=='beach' else 'stone')
    box('lot surface',0,0,.19,W-.25,D-.25,.08,'sand' if key=='beach' else 'grass')
    if key in ['park','largePark','picnic']:
        path(0,0,1.2,D-.4);path(0,0,W-.4,1.2)
        for x,y in [(-W*.33,-D*.33),(W*.33,D*.33),(-W*.33,D*.33)]:tree(x,y)
        bench(W*.28,-D*.3);flowers(W*.3,D*.28)
        if key=='largePark':
            fountain();table(-5,4);table(5,4);bench(-5,-4);tree(6,-6);tree(-6,-6)
            flowers(5,-2);flowers(-5,-2)
        elif key=='picnic':table(-1.8,-1.7);table(2,2);umbrella(-1.8,-1.7)
        else:flowers(-2.5,-2);bench(-2.5,.9)
    if key=='pool':
        box('pool deck',0,0,.28,W-.5,D-.5,.15,'white')
        box('blue tiled basin',-1,0,.39,12.8,6.4,.17,'pool')
        box('water surface',-1,0,.49,12,5.8,.04,'blue')
        for y in [-1.9,0,1.9]:box('swim lane stripe',-1,y,.52,11.7,.08,.015,'white')
        for x in [-6.5,4.5]:box('lane end',x,0,.53,.08,5.5,.02,'white')
        for y in [-2.8,0,2.8]:
            box('sun lounger',7.2,y,.55,1.1,2,.2,'yellow')
            o=box('lounger back',7.2,y+.65,.85,1.1,.75,.12,'white');o.rotation_euler.x=.5
        umbrella(-8,-2);umbrella(-8,2)
        for x in [-5.5,3.5]:
            for dx in [-.25,.25]:beam('pool ladder',(x+dx,2.5,.55),(x+dx,3.7,1.2),.055,'metal')
    if key=='beach':
        path(0,10.8,W-.5,2);path(6.5,0,1.1,D-3)
        for x,y in [(-4,-8),(2,-6),(-4,0),(2,2),(-4,7)]:
            umbrella(x,y);box('beach towel',x+1,y-1.7,.26,1.1,2,.025,'red' if y<0 else 'blue')
        box('lifeguard hut',4,9,1.65,3,2.6,2.8,'white')
        box('hut roof',4,9,3.18,3.5,3,.2,'red')
        box('hut door',4,7.67,1.3,.85,.08,1.8,'blue')
        for x in [2.4,5.6]:beam('deck rail',(x,6,.55),(x,6,1.6),.08,'wood')
        box('lifeguard deck',4,6.8,.5,3.8,2,.2,'wood');bench(-4,11)
        tree(-7,12);tree(7,12)
    if key=='playground':
        box('rubber play surface',0,0,.28,W-1,D-1,.12,'rubber')
        for x in [-2.7,-1.1]:
            for y in [-1.1,.5]:beam('tower support',(x,y,.35),(x,y,2.4),.1,'yellow')
        box('climbing platform',-1.9,-.3,2,2,2,.2,'purple')
        bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=1.6,radius2=0,depth=1,location=(-1.9,-.3,3.4),rotation=(0,0,math.pi/4))
        finish(bpy.context.object,'play tower roof','red')
        o=box('slide',-.1,-.3,1.1,3,1,.16,'blue');o.rotation_euler.y=.58
        for x in [-2.8,-1.1]:beam('ladder upright',(x,1.1,.3),(x,1.1,2.2),.07,'metal')
        for z in [.5,.9,1.3,1.7]:beam('ladder rung',(-2.8,1.1,z),(-1.1,1.1,z),.07,'white')
        for x in [1.8,3.7]:
            for y in [1.4,3.6]:beam('swing frame',(x,y,.3),(x,2.5,2.9),.09,'red')
        beam('swing crossbar',(1.8,2.5,2.9),(3.7,2.5,2.9),.12,'yellow')
        for x in [2.35,3.15]:
            for dx in [-.23,.23]:beam('swing chain',(x+dx,2.5,2.8),(x+dx,2.5,.85),.025,'metal')
            box('swing seat',x,2.5,.8,.6,.4,.12,'blue')
        bench(2,-3.6);tree(-3.6,3.5,.7)
    if key in ['tennis','basketball']:
        box('court surface',0,0,.26,W-1,D-1,.1,'court' if key=='tennis' else 'rubber')
        for y in [-3.25,3.25]:line(0,y,16,.07)
        for x in [-8,8]:line(x,0,.07,6.5)
        if key=='tennis':
            for y in [-2.3,2.3]:line(0,y,16,.07)
            for x in [-4,4]:line(x,0,.07,4.6)
            line(0,0,8,.07)
            for y in [-3.6,3.6]:cyl('tennis net post',0,y,.95,.08,1.4,'metal')
            for z in [.45,.65,.85,1.05,1.25,1.5]:beam('net mesh',(0,-3.5,z),(0,3.5,z),.02,'white')
            for y in [k*.25-3.5 for k in range(29)]:beam('net vertical',(0,y,.4),(0,y,1.5),.012,'metal')
            fence(W,D)
        else:
            line(0,0,.07,6.5);arc(0,0,1,0,math.tau)
            for side in [-1,1]:
                x=side*7.7;cyl('hoop support',x,0,1.9,.12,3.3,'metal')
                box('backboard',x-side*.3,0,3.25,.14,1.5,.85,'white')
                arc(side*6,0,3.1,-math.pi/2 if side==-1 else math.pi/2,math.pi/2 if side==-1 else 3*math.pi/2)
                for y in [-1,1]:line(side*6.25,y,3.3,.07)
                line(side*4.6,0,.07,2)
                bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=(x-side*.8,0,2.95),major_radius=.35,minor_radius=.04)
                finish(bpy.context.object,'basketball hoop','red')
        bench(0,-4.25)
    for o in objects:o.parent=root
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    path_out=ROOT/'assets'/'models'/('remaster_'+key+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path_out),export_format='GLB',use_selection=True,use_active_scene=True)
    manifest.append({'id':'remaster_'+key,'footprint':w,'depth':d,'source':'Blender MCP recreation workshop'})
    root.location=(k%4*35,k//4*42,0);roots.append(root)

manifest_path=ROOT/'assets'/'models'/'remaster-manifest.json'
old=json.loads(manifest_path.read_text(encoding='utf-8'))
ids={m['id'] for m in manifest}
manifest_path.write_text(json.dumps([m for m in old if m['id'] not in ids]+manifest,indent=2),encoding='utf-8')
bpy.data.libraries.write(str(ROOT/'art'/'rivergate-recreation.blend'),{scene})
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=125
        area.spaces.active.region_3d.view_location=(51,20,0)
        area.spaces.active.region_3d.view_rotation=Quaternion((.88,.32,.18,.29)).normalized()
        area.spaces.active.shading.type='MATERIAL'
print('Exported eight recreation GLBs; original workshop preserved. Library: art/rivergate-recreation.blend')
