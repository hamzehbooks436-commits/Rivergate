"""Run inside Blender through Blender MCP. Keeps the existing scenes intact."""
import bpy, math, os, json
from mathutils import Vector, Quaternion
ROOT = r'C:\Users\hamze\Home\Desktop\Folder_1\City Game Project'
OUT = os.path.join(ROOT, 'assets', 'models')
scene = bpy.data.scenes.new('Rivergate - Civic architecture')
bpy.context.window.scene = scene
materials = {}
def material(name, rgb, metallic=0):
    m = bpy.data.materials.new('Rivergate '+name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    shader = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = .62
    shader.inputs['Metallic'].default_value = metallic
    materials[name] = m
    return m
for name, rgb in {'stone':(.72,.67,.54),'cream':(.88,.84,.70),'roof':(.17,.25,.26),'glass':(.18,.39,.43),'terracotta':(.55,.24,.15),'blue':(.15,.38,.51),'green':(.20,.43,.25),'gold':(.87,.63,.25),'red':(.64,.18,.12),'white':(.91,.89,.78),'asphalt':(.22,.25,.24),'water':(.15,.53,.66)}.items():
    material(name, rgb, .25 if name=='glass' else 0)
groups=[]
current=None
def box(name, xyz, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(materials[mat]);o.parent=current
    return o
def cylinder(name, xyz, radius, depth, mat, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=xyz)
    o=bpy.context.object;o.name=name;o.data.materials.append(materials[mat]);o.parent=current
    return o
def facade(width, depth, floors, mat='cream'):
    box('Masonry shell',(0,0,floors*.65+.12),(width,depth,floors*1.3),mat)
    for f in range(floors):
        z=.65+f*1.3
        for x in [-width*.32,0,width*.32]:
            for y in [-depth/2-.025,depth/2+.025]:
                box('Recessed glazing',(x,y,z),(.5,.06,.67),'glass')
                box('Window sill',(x,y,z-.39),(.65,.16,.1),'white')
        box('Limestone course',(0,0,(f+1)*1.3+.15),(width+.14,depth+.14,.12),'stone')
    box('Copper roof',(0,0,floors*1.3+.28),(width+.3,depth+.3,.22),'roof')
    box('Entrance canopy',(0,-depth/2-.3,.95),(1.2,.7,.15),'roof')
    box('Double doors',(0,-depth/2-.04,.43),(.75,.06,.8),'glass')
def start(name):
    global current
    current=bpy.data.objects.new(name,None);scene.collection.objects.link(current);groups.append(current)
    box('Paved civic lot',(0,0,.04),(8.7,8.7,.08),'stone')
    box('Front path',(0,-3.2,.1),(1.3,2.1,.1),'cream')
    return current
def tree(x,y):
    cylinder('Tree trunk',(x,y,.65),.12,1.2,'terracotta',8)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.85,location=(x,y,1.6))
    o=bpy.context.object;o.scale.z=1.25;o.data.materials.append(materials['green']);o.parent=current
def make(kind):
    start('civic_'+kind)
    if kind=='power':
        facade(4.4,3.8,2,'terracotta')
        for x in [-2.9,2.9]:
            cylinder('Exhaust stack',(x,1.5,3.5),.42,7,'cream')
            for z in [4.7,5.4,6.1]:cylinder('Safety bands',(x,1.5,z),.44,.26,'red')
        for x in [-2.7,0,2.7]:
            box('Transformer',(x,-2.9,.65),(1.3,1.1,1.1),'roof')
            for k in [-.35,0,.35]:cylinder('Ceramic insulator',(x+k,-2.9,1.45),.12,.55,'cream',8)
    elif kind=='water':
        facade(2.8,2.5,1,'cream')
        for x in [-2.4,2.4]:
            cylinder('Reservoir tank',(x,1.8,1.3),1.3,2.5,'blue')
            cylinder('Reservoir lid',(x,1.8,2.6),1.4,.15,'white')
        cylinder('Water tower pedestal',(0,-1.4,1.8),.55,3.4,'stone')
        cylinder('Raised water reservoir',(0,-1.4,3.9),1.2,1.5,'water')
        cylinder('Water tower cap',(0,-1.4,4.7),1.3,.2,'roof')
    elif kind=='waste':
        facade(5.6,4.2,1,'green')
        for x in [-2,0,2]:
            box('Loading bay',(x,-2.13,.75),(1.35,.08,1.2),'roof')
            box('Sorting container',(x,3,.7),(1.5,1.8,1.2),'gold' if x==0 else 'blue')
    elif kind=='education':
        facade(5.8,4.1,2,'terracotta')
        cylinder('Clock tower',(0,0,3.9),.85,2.2,'cream',4)
        box('Clock face',(0,-.63,4.1),(.6,.04,.6),'white')
        box('Clock hand',(0,-.67,4.18),(.05,.05,.28),'roof')
        box('School sign',(0,-2.2,1.8),(2.2,.12,.35),'gold')
        tree(-3.4,-3);tree(3.4,-3)
    elif kind=='healthcare':
        facade(5.7,4.5,3,'white')
        box('Medical cross vertical',(0,-2.36,3.2),(.34,.16,1.25),'red')
        box('Medical cross horizontal',(0,-2.37,3.2),(1.25,.16,.34),'red')
        box('Ambulance canopy',(2,-3,1.3),(2.6,1.5,.15),'blue')
    elif kind=='police':
        facade(5.2,4.3,2,'blue')
        box('Police sign',(0,-2.23,2),(3.1,.12,.45),'white')
        cylinder('Radio mast',(1.7,1.2,4.1),.07,2.8,'roof',8)
        box('Antenna crossbar',(1.7,1.2,5),(1.4,.08,.08),'roof')
    elif kind=='fire':
        facade(5.8,4.2,2,'terracotta')
        for x in [-1.8,0,1.8]:
            box('Engine door',(x,-2.17,.8),(1.45,.09,1.45),'red')
            for z in [.35,.65,.95,1.25]:box('Door panel',(x,-2.23,z),(1.4,.025,.035),'white')
        box('Hose tower',(3,1.2,2.8),(1.1,1.2,5.5),'cream')
    elif kind=='station':
        facade(5.5,3.1,2,'cream')
        box('Platform',(0,2.8,.22),(8,1.9,.4),'stone')
        box('Platform canopy',(0,2.8,2.3),(8,2.2,.16),'roof')
        for x in [-3,0,3]:box('Canopy column',(x,2.8,1.2),(.13,.13,2.2),'cream')
        box('Station clock',(0,-1.7,2),(.65,.12,.65),'white')
    elif kind=='park':
        box('Garden lawn',(0,0,.12),(8.2,8.2,.13),'green')
        for axis in [0,1]:box('Gravel walk',(0,0,.22),(8.2 if axis else 1,1 if axis else 8.2,.08),'cream')
        cylinder('Fountain basin',(0,0,.45),1.35,.35,'stone')
        cylinder('Fountain water',(0,0,.65),1.12,.1,'water')
        cylinder('Fountain stem',(0,0,1.1),.18,1,'cream')
        for x,y in [(-2.8,-2.8),(2.8,2.8),(-2.8,2.8),(2.8,-2.8)]:tree(x,y)
        for x in [-2.5,2.5]:box('Park bench',(x,0,.55),(.45,1.5,.2),'terracotta')
    elif kind=='landmark':
        facade(5.8,4.7,3,'cream')
        for x in [-2.1,-.7,.7,2.1]:cylinder('Civic column',(x,-2.8,1.5),.17,2.7,'white')
        box('Portico',(0,-2.8,2.9),(5.7,1.2,.3),'stone')
        cylinder('Central drum',(0,0,4.8),1.1,1.2,'cream')
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=1.3,location=(0,0,5.4))
        o=bpy.context.object;o.scale.z=.7;o.data.materials.append(materials['roof']);o.parent=current
        cylinder('Finial',(0,0,6.5),.08,.6,'gold',8)
    return current
def export_asset(root):
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for o in root.children_recursive:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    # The exporter defaults to GLB in this Blender version; avoid localized enum names.
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,root.name+'.glb'),use_selection=True,export_yup=True)
def build_all():
    for kind in ['power','water','waste','education','healthcare','police','fire','station','park','landmark']:
        root=make(kind);export_asset(root)
    for i,root in enumerate(groups):root.location=((i%5)*12,(i//5)*14,0)
    world=bpy.data.worlds.new('Rivergate daylight');world.color=(.65,.73,.8);scene.world=world
    bpy.ops.object.select_all(action='DESELECT')
    for root in groups:
        root.select_set(True)
        for o in root.children_recursive:o.select_set(True)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                space=area.spaces.active
                space.region_3d.view_location=(24,7,0)
                space.region_3d.view_distance=64
                space.region_3d.view_rotation=Quaternion((.820,.425,.175,.339))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','rivergate-civic-kit.blend'))
    print(json.dumps({'assets':[r.name for r in groups],'objects':len(scene.objects),'source':bpy.data.filepath}))
