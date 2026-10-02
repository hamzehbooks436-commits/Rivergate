"""Original Rivergate decoration kit. Execute in the live Blender MCP session."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
ROOT=Path(r'C:\Users\hamze\Home\Desktop\Folder_1\City Game Project')
scene=bpy.data.scenes.new('Rivergate - Seasonal decorations')
bpy.context.window.scene=scene
palette={'wood':'92623F','metal':'354D53','stone':'C5C1AA','soil':'63503D','leaf':'548D47','evergreen':'36684F','red':'D45444','yellow':'E7BC58','blue':'64AFBF','pink':'DF90AF','snow':'EDF1F0','orange':'D98335','hay':'CDB66D','light':'FFE5A0','water':'69B8CE'}
materials={}
for name,h in palette.items():
    m=bpy.data.materials.new('decoration_'+name);m.use_nodes=True
    rgba=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,)
    m.diffuse_color=rgba
    node=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=rgba;node.inputs['Roughness'].default_value=.8
    if name=='light':
        node.inputs['Emission Color'].default_value=rgba;node.inputs['Emission Strength'].default_value=2
    if name=='water':node.inputs['Roughness'].default_value=.2
    materials[name]=m
objects=[]
def finish(o,name,mat):
    o.name=name;o.data.materials.append(materials[mat]);objects.append(o);return o
def box(name,x,y,z,w,d,h,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.scale=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=o.modifiers.new('Soft crafted edges','BEVEL');bevel.width=.045;bevel.segments=2
    return finish(o,name,mat)
def cyl(name,x,y,z,r,h,mat,verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=h,location=(x,y,z));return finish(bpy.context.object,name,mat)
def ball(name,x,y,z,r,mat,scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=r,location=(x,y,z));o=bpy.context.object;o.scale=scale;return finish(o,name,mat)
def cone(name,x,y,z,r1,r2,h,mat):
    bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r1,radius2=r2,depth=h,location=(x,y,z));return finish(bpy.context.object,name,mat)
def beam(name,a,b,r,mat):
    a,b=Vector(a),Vector(b);o=cyl(name,*((a+b)/2),r,(b-a).length,mat,8);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def bench():
    for y in [-.5,-.25,0,.25]:box('Timber seat slat',0,y,1.1,3.3,.2,.15,'wood')
    for z in [1.5,1.85,2.2]:box('Backrest slat',0,.55,z,3.3,.15,.26,'wood')
    for x in [-1.25,1.25]:
        for y in [-.4,.45]:beam('Cast iron leg',(x,y,0),(x,y,1.15),.095,'metal')
        beam('Backrest support',(x,.55,.4),(x,.55,2.35),.075,'metal')
        beam('Armrest',(x,-.6,1.65),(x,.6,1.65),.07,'metal')
def flowers():
    box('Raised planter',0,0,.4,4,2.5,.8,'stone');box('Rich planting soil',0,0,.82,3.65,2.15,.05,'soil')
    for j in range(12):
        x=(j%4-1.5)*.83;y=(j//4-1)*.7;z=1.35+(j%3)*.18
        beam('Flower stem',(x,y,.85),(x,y,z),.025,'evergreen')
        ball('Leaf',x+.12,y,1.1,.17,'leaf',(1,.45,.35))
        for k in range(5):
            a=k*math.tau/5;ball('Petal',x+math.cos(a)*.16,y+math.sin(a)*.16,z,.15,['pink','yellow','red'][j%3],(1,1,.4))
        ball('Flower centre',x,y,z+.03,.085,'yellow')
def lamp():
    cyl('Stone foot',0,0,.15,.65,.3,'stone');cyl('Fluted base',0,0,.55,.28,.8,'metal')
    cyl('Lantern post',0,0,2.4,.12,3.7,'metal');box('Lantern glow',0,0,4.55,.58,.58,.8,'light')
    for x in [-.35,.35]:
        for y in [-.35,.35]:beam('Lantern frame',(x,y,4.1),(x,y,5),.045,'metal')
    cone('Lantern roof',0,0,5.1,.65,.1,.4,'metal');cyl('Lantern rim',0,0,4.08,.49,.12,'metal')
def fountain():
    cyl('Octagonal plinth',0,0,.15,2.35,.3,'stone',12);cyl('Basin',0,0,.45,2.05,.6,'stone')
    cyl('Basin water',0,0,.78,1.82,.08,'water');cyl('Central pedestal',0,0,1.1,.35,1.5,'stone')
    cone('Upper bowl',0,0,1.85,.48,1.05,.4,'stone');cyl('Upper water',0,0,2.06,.91,.05,'water')
    ball('Finial',0,0,2.4,.25,'stone')
    for k in range(8):
        a=k*math.tau/8;beam('Falling water',(math.cos(a)*.88,math.sin(a)*.88,2.05),(math.cos(a)*1.1,math.sin(a)*1.1,.8),.035,'water')
def bunting():
    for x in [-3,3]:
        cyl('Post footing',x,0,.13,.4,.26,'stone');cyl('Festival pole',x,0,2,.1,4,'wood');ball('Gold cap',x,0,4.1,.18,'yellow')
    for k in range(12):
        x=-3+k*.5;z=3.8-.6*math.sin((x+3)/6*math.pi);end=3.8-.6*math.sin((x+3.5)/6*math.pi)
        beam('Bunting cord',(x,0,z),(x+.5,0,end),.022,'metal')
        mesh=bpy.data.meshes.new('Pennant mesh');mesh.from_pydata([(x,.015,z),(x+.46,.015,end),(x+.23,.015,z-.65)],[],[(0,1,2)])
        obj=bpy.data.objects.new('Colourful pennant',mesh);scene.collection.objects.link(obj);finish(obj,'Colourful pennant',['red','yellow','blue','pink'][k%4])
def harvest():
    for x,y,z in [(-1,0,.45),(.9,.4,.45),(-.6,.1,1.3)]:
        box('Hay bale',x,y,z,1.9,1.3,.8,'hay')
        for dx in [-.6,.6]:box('Bale binding',x+dx,y,z,.05,1.33,.84,'wood')
    for x,y,r in [(-1,-1.3,.55),(.25,-1.2,.7),(1.6,-.7,.45)]:
        ball('Pumpkin',x,y,r,r,'orange',(1,1,.85))
        for k in range(8):
            a=k*math.tau/8;ball('Pumpkin lobe',x+math.cos(a)*r*.55,y+math.sin(a)*r*.55,r,r*.48,'orange',(.85,.85,1.55))
        cyl('Pumpkin stem',x,y,r*1.85,.07,.27,'wood',8)
    for k in range(15):ball('Fallen golden leaf',(k%5-2)*.85,(k//5-1)*1.2,.055,.22,'yellow',(1,.55,.12))
def snowman():
    for z,r in [(.95,.95),(2.05,.72),(3,.52)]:ball('Snowball',0,0,z,r,'snow')
    cyl('Hat brim',0,0,3.48,.67,.12,'metal');cyl('Top hat',0,0,3.8,.42,.6,'metal');cyl('Hat ribbon',0,0,3.6,.43,.12,'red')
    cyl('Red scarf',0,0,2.61,.55,.19,'red');box('Scarf tail',.35,-.59,2.29,.24,.12,.65,'red')
    for x in [-.19,.19]:ball('Coal eye',x,-.47,3.13,.065,'metal')
    nose=cone('Carrot nose',0,-.68,2.97,.1,0,.5,'orange');nose.rotation_euler.x=math.pi/2
    for z in [1.75,2.05,2.3]:ball('Coal button',0,-.69,z,.075,'metal')
    for x in [-1,1]:beam('Twig arm',(x*.55,0,2.1),(x*1.5,0,2.75),.055,'wood')
def festive_tree():
    cyl('Tree pot',0,0,.35,.7,.7,'red');cyl('Trunk',0,0,1,.17,1.5,'wood')
    for z,r,h in [(1.6,1.8,2),(2.6,1.4,1.9),(3.5,1,1.7),(4.2,.65,1.5)]:cone('Evergreen branches',0,0,z,r,.03,h,'evergreen')
    for k in range(24):
        z=1+k*.14;r=max(.3,1.8-(z-1)*.42);a=k*2.4
        ball('Festive ornament',math.cos(a)*r,math.sin(a)*r,z,.13,'red' if k%3 else 'light')
    verts=[]
    for k in range(10):
        a=math.pi/2+k*math.pi/5;r=.5 if k%2==0 else .22;verts.append((math.cos(a)*r,0,5.2+math.sin(a)*r))
    mesh=bpy.data.meshes.new('Star mesh');mesh.from_pydata(verts,[],[tuple(range(10))])
    o=bpy.data.objects.new('Golden star',mesh);scene.collection.objects.link(o);finish(o,'Golden star','yellow')
builders={'bench':bench,'flowers':flowers,'lamp':lamp,'fountain':fountain,'bunting':bunting,'harvest':harvest,'snowman':snowman,'tree':festive_tree}
manifest=[]
for index,(key,build) in enumerate(builders.items()):
    objects=[];build();bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    asset='remaster_decor_'+key
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models'/f'{asset}.glb'),use_selection=True,use_active_scene=True)
    manifest.append({'id':asset,'source':'Original Blender MCP decoration kit','objects':len(objects)})
    for o in objects:o.location.x+=(index%4)*8;o.location.y+=(index//4)*9
(ROOT/'assets/models/decorations-manifest.json').write_text(json.dumps(manifest,indent=2))
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=34
        area.spaces.active.region_3d.view_location=Vector((12,4,1.5))
        area.spaces.active.region_3d.view_rotation=Quaternion((.86,.37,.15,.30)).normalized()
        area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/rivergate-decorations.blend'),copy=True)
print(json.dumps(manifest))
